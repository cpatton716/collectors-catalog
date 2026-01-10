/**
 * eBay Prices API Endpoint
 *
 * POST /api/ebay-prices
 *
 * Fetches recent sold listings from eBay for comic book price estimation.
 * Includes 24-hour caching to minimize eBay API calls.
 *
 * Request body:
 * {
 *   title: string;        // Comic title (e.g., "Amazing Spider-Man")
 *   issueNumber?: string; // Issue number (e.g., "300")
 *   grade?: number;       // Numeric grade (e.g., 9.8)
 *   isGraded?: boolean;   // Whether professionally graded
 *   gradingCompany?: string; // CGC, CBCS, PGX
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data: PriceData | null;
 *   source: "ebay" | "cache";
 *   cached: boolean;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { lookupEbayPrices, isEbayConfigured } from "@/lib/ebay";
import { PriceData } from "@/types/comic";

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory cache for very fast repeated lookups (same session)
const memoryCache = new Map<string, { data: PriceData | null; timestamp: number }>();
const MEMORY_CACHE_TTL = 1000 * 60 * 30; // 30 minutes for memory cache

interface EbayPriceRequest {
  title: string;
  issueNumber?: string;
  grade?: number;
  isGraded?: boolean;
  gradingCompany?: string;
}

interface EbayPriceResponse {
  success: boolean;
  data: PriceData | null;
  source: "ebay" | "cache" | "none";
  cached: boolean;
  error?: string;
}

/**
 * Generate a cache key for the price lookup
 */
function generateCacheKey(params: EbayPriceRequest): string {
  const parts = [
    params.title.toLowerCase().trim(),
    params.issueNumber?.toLowerCase().trim() || "",
    params.grade?.toString() || "",
    params.isGraded ? "graded" : "raw",
    params.gradingCompany?.toLowerCase() || "",
  ];
  return parts.join("|");
}

/**
 * Get cached price data from the database
 */
async function getCachedPrice(cacheKey: string): Promise<PriceData | null> {
  try {
    const { data, error } = await supabase
      .from("ebay_price_cache")
      .select("price_data, created_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache is still valid
    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    if (cacheAge > CACHE_TTL_MS) {
      // Cache expired, delete it
      await supabase.from("ebay_price_cache").delete().eq("cache_key", cacheKey);
      return null;
    }

    return data.price_data as PriceData;
  } catch (error) {
    console.error("[ebay-prices] Cache lookup error:", error);
    return null;
  }
}

/**
 * Save price data to the database cache
 */
async function setCachedPrice(
  cacheKey: string,
  priceData: PriceData | null,
  params: EbayPriceRequest
): Promise<void> {
  try {
    await supabase.from("ebay_price_cache").upsert(
      {
        cache_key: cacheKey,
        title: params.title,
        issue_number: params.issueNumber || null,
        grade: params.grade || null,
        is_graded: params.isGraded || false,
        grading_company: params.gradingCompany || null,
        price_data: priceData,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "cache_key",
        ignoreDuplicates: false,
      }
    );
  } catch (error) {
    console.error("[ebay-prices] Cache save error:", error);
    // Don't throw - cache failures shouldn't break the lookup
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<EbayPriceResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    const { title, issueNumber, grade, isGraded, gradingCompany } = body as EbayPriceRequest;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          source: "none",
          cached: false,
          error: "Title is required",
        },
        { status: 400 }
      );
    }

    const params: EbayPriceRequest = {
      title: title.trim(),
      issueNumber: issueNumber?.toString().trim(),
      grade: grade ? parseFloat(grade.toString()) : undefined,
      isGraded: Boolean(isGraded),
      gradingCompany: gradingCompany?.trim(),
    };

    const cacheKey = generateCacheKey(params);

    // 1. Check in-memory cache first (fastest)
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      console.log(`[ebay-prices] Memory cache hit for: ${title} #${issueNumber}`);
      return NextResponse.json({
        success: true,
        data: memoryCached.data,
        source: "cache",
        cached: true,
      });
    }

    // 2. Check database cache (fast ~50ms)
    const dbCached = await getCachedPrice(cacheKey);
    if (dbCached) {
      console.log(`[ebay-prices] Database cache hit for: ${title} #${issueNumber}`);

      // Update memory cache
      memoryCache.set(cacheKey, { data: dbCached, timestamp: Date.now() });

      return NextResponse.json({
        success: true,
        data: dbCached,
        source: "cache",
        cached: true,
      });
    }

    // 3. Check if eBay API is configured
    if (!isEbayConfigured()) {
      console.log("[ebay-prices] eBay API not configured");
      return NextResponse.json({
        success: true,
        data: null,
        source: "none",
        cached: false,
        error: "eBay API not configured",
      });
    }

    // 4. Fetch from eBay API
    console.log(`[ebay-prices] Fetching from eBay for: ${title} #${issueNumber}`);

    const priceData = await lookupEbayPrices(
      params.title,
      params.issueNumber,
      params.grade,
      params.isGraded,
      params.gradingCompany
    );

    // 5. Cache the result (even if null to avoid repeated failed lookups)
    await setCachedPrice(cacheKey, priceData, params);
    memoryCache.set(cacheKey, { data: priceData, timestamp: Date.now() });

    if (priceData) {
      console.log(`[ebay-prices] Found ${priceData.recentSales.length} sales for: ${title} #${issueNumber}`);
      return NextResponse.json({
        success: true,
        data: priceData,
        source: "ebay",
        cached: false,
      });
    } else {
      console.log(`[ebay-prices] No results for: ${title} #${issueNumber}`);
      return NextResponse.json({
        success: true,
        data: null,
        source: "none",
        cached: false,
      });
    }
  } catch (error) {
    console.error("[ebay-prices] Error:", error);

    // Return graceful failure - let caller use AI estimates
    return NextResponse.json({
      success: false,
      data: null,
      source: "none",
      cached: false,
      error: "Failed to fetch eBay prices",
    });
  }
}

/**
 * GET endpoint for simple lookups (URL parameters)
 */
export async function GET(request: NextRequest): Promise<NextResponse<EbayPriceResponse>> {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title");
  const issueNumber = searchParams.get("issueNumber") || searchParams.get("issue");
  const grade = searchParams.get("grade");
  const isGraded = searchParams.get("isGraded") === "true";
  const gradingCompany = searchParams.get("gradingCompany");

  if (!title) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        source: "none",
        cached: false,
        error: "Title is required",
      },
      { status: 400 }
    );
  }

  // Create a mock request with the body
  const mockRequest = new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({
      title,
      issueNumber,
      grade: grade ? parseFloat(grade) : undefined,
      isGraded,
      gradingCompany,
    }),
  });

  return POST(mockRequest);
}
