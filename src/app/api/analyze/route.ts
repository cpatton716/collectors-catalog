import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { lookupEbaySoldPrices, isFindingApiConfigured } from "@/lib/ebayFinding";
import { lookupCertification } from "@/lib/certLookup";
import { supabase } from "@/lib/supabase";
import { getProfileByClerkId } from "@/lib/db";
import { PriceData } from "@/types/comic";
import { rateLimiters, checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { cacheGet, cacheSet, generateEbayPriceCacheKey } from "@/lib/cache";
import {
  canUserScan,
  incrementScanCount,
  getSubscriptionStatus,
  GUEST_SCAN_LIMIT,
} from "@/lib/subscription";
import { lookupKeyInfo } from "@/lib/keyComicsDatabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// eBay price cache TTL: 24 hours
const EBAY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Get cached eBay price from database
 * Returns: { found: true, data: PriceData | null } if cache hit
 *          { found: false } if cache miss
 */
async function getCachedEbayPrice(cacheKey: string): Promise<{ found: boolean; data: PriceData | null }> {
  try {
    const { data, error } = await supabase
      .from("ebay_price_cache")
      .select("price_data, created_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) return { found: false, data: null };

    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    if (cacheAge > EBAY_CACHE_TTL_MS) {
      // Cache expired
      await supabase.from("ebay_price_cache").delete().eq("cache_key", cacheKey);
      return { found: false, data: null };
    }

    // Cache hit - data may be null if eBay had no results
    return { found: true, data: data.price_data as PriceData | null };
  } catch {
    return { found: false, data: null };
  }
}

/**
 * Save eBay price to cache
 */
async function setCachedEbayPrice(
  cacheKey: string,
  priceData: PriceData | null,
  title: string,
  issueNumber: string,
  grade: number,
  isSlabbed: boolean,
  gradingCompany?: string
): Promise<void> {
  try {
    await supabase.from("ebay_price_cache").upsert(
      {
        cache_key: cacheKey,
        title,
        issue_number: issueNumber,
        grade,
        is_graded: isSlabbed,
        grading_company: gradingCompany || null,
        price_data: priceData,
        created_at: new Date().toISOString(),
      },
      { onConflict: "cache_key", ignoreDuplicates: false }
    );
  } catch (error) {
    console.error("[analyze] Cache save error:", error);
  }
}

export async function POST(request: NextRequest) {
  // Track profile for scan counting at the end
  let profileId: string | null = null;

  try {
    // Rate limit check - protect expensive AI endpoint
    const identifier = getRateLimitIdentifier(null, request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
    const { success: rateLimitSuccess, response: rateLimitResponse } = await checkRateLimit(
      rateLimiters.analyze,
      identifier
    );
    if (!rateLimitSuccess) return rateLimitResponse;

    // ============================================
    // Scan Limit Enforcement
    // ============================================
    const { userId } = await auth();

    if (userId) {
      // Registered user - check subscription limits
      const profile = await getProfileByClerkId(userId);
      if (profile) {
        profileId = profile.id;
        const canScan = await canUserScan(profile.id);

        if (!canScan) {
          const status = await getSubscriptionStatus(profile.id);
          return NextResponse.json(
            {
              error: "scan_limit_reached",
              message: "You've used all your scans for this month.",
              scansUsed: status?.scansUsed || 0,
              monthResetDate: status?.monthResetDate.toISOString(),
              tier: status?.tier || "free",
              canStartTrial: status?.tier === "free" && !status?.isTrialing,
            },
            { status: 403 }
          );
        }
      }
    } else {
      // Guest user - check client-provided guest scan count
      // Note: This is validated client-side, but we add server awareness for analytics
      const guestScans = parseInt(request.headers.get("x-guest-scan-count") || "0");
      if (guestScans >= GUEST_SCAN_LIMIT) {
        return NextResponse.json(
          {
            error: "guest_limit_reached",
            message: "You've used all your free scans. Create an account to continue.",
            scansUsed: guestScans,
            limit: GUEST_SCAN_LIMIT,
          },
          { status: 403 }
        );
      }
    }

    const { image, mediaType } = await request.json();

    console.log("Received image request, mediaType:", mediaType);
    console.log("Image data length:", image?.length || 0);

    if (!image) {
      return NextResponse.json({ error: "No image was received. Please try uploading your photo again." }, { status: 400 });
    }

    // Check if image is too large (base64 adds ~33% overhead, so 20MB base64 ≈ 15MB image)
    if (image.length > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "This image is too large. Please use a smaller image (under 10MB) or try taking a new photo." },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Our comic recognition service is temporarily unavailable. Please try again in a few minutes." },
        { status: 500 }
      );
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `You are an expert comic book identifier and grading specialist. Analyze this comic book cover image and extract as much information as possible.

Look carefully at:
1. The title of the comic series (usually prominently displayed)
2. The issue number (often with # symbol)
3. The publisher logo (Marvel, DC, Image, Dark Horse, etc.)
4. Any variant cover indicators (Cover A, B, 1:25, etc.)
5. Creator credits if visible (writer, artist names)
6. The publication year or month/year
7. Any UPC/barcode area that might have date info
8. WHETHER THIS IS A GRADED/SLABBED COMIC - Look for:
   - A hard plastic case (slab) around the comic
   - A label at the top with grading company logo (CGC, CBCS, PGX)
   - A numeric grade (e.g., 9.8, 9.6, 9.4, 9.0, etc.)
   - "Signature Series" or "SS" indicating it's signed
   - The name of who signed it (often on the label)
   - THE CERTIFICATION NUMBER - This is a long number (usually 7-10 digits) on the label, often near a barcode

Return your findings as a JSON object with this exact structure:
{
  "title": "series title or null if not identifiable",
  "issueNumber": "issue number as string or null",
  "variant": "variant name if this is a variant cover, otherwise null",
  "publisher": "publisher name or null",
  "coverArtist": "cover artist name if visible, otherwise null",
  "writer": "writer name if visible, otherwise null",
  "interiorArtist": "interior artist if visible (usually same as cover unless specified), otherwise null",
  "releaseYear": "4-digit year as string or null",
  "confidence": "high if most fields identified, medium if some fields identified, low if few fields identified",
  "isSlabbed": true or false - whether the comic is in a graded slab/case,
  "gradingCompany": "CGC" or "CBCS" or "PGX" or "Other" or null if not slabbed,
  "grade": "the numeric grade as a string (e.g., '9.8', '9.0') or null if not slabbed",
  "certificationNumber": "the certification/serial number from the label (7-10 digit number) or null if not visible/not slabbed",
  "isSignatureSeries": true or false - whether it's a Signature Series (signed and authenticated),
  "signedBy": "name of person who signed it or null if not signed/not visible"
}

Important:
- Return ONLY the JSON object, no other text
- Use null for any field you cannot determine
- Be accurate - don't guess if you're not confident
- For publisher, use the full name (e.g., "Marvel Comics" not just "Marvel")
- Pay special attention to the grading label if present - it contains valuable info
- The CGC/CBCS label typically shows: grade, title, issue, date, and signature info`,
            },
          ],
        },
      ],
    });

    // Extract the text content from the response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("We couldn't analyze this image. Please try a clearer photo of the comic cover.");
    }

    // Parse the JSON response
    let comicDetails;
    try {
      // Clean the response - remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      console.log("Raw Claude response:", jsonText.substring(0, 500));

      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      comicDetails = JSON.parse(jsonText.trim());
      // Initialize keyInfo as empty array
      comicDetails.keyInfo = [];
      console.log("Parsed comic details:", comicDetails);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", textContent.text);
      console.error("Parse error:", parseError);
      throw new Error("We had trouble reading the comic details. Please try a different photo with the cover clearly visible.");
    }

    // If this is a slabbed comic with a certification number, look up from grading company
    if (comicDetails.isSlabbed && comicDetails.certificationNumber && comicDetails.gradingCompany) {
      console.log(`[analyze] Slabbed comic detected, looking up cert ${comicDetails.certificationNumber} from ${comicDetails.gradingCompany}...`);

      try {
        const certResult = await lookupCertification(
          comicDetails.gradingCompany,
          comicDetails.certificationNumber
        );

        if (certResult.success && certResult.data) {
          console.log("[analyze] Cert lookup successful:", certResult.data);

          // Merge cert data with AI data (cert takes priority for overlapping fields)
          if (certResult.data.title) {
            comicDetails.title = certResult.data.title;
          }
          if (certResult.data.issueNumber) {
            comicDetails.issueNumber = certResult.data.issueNumber;
          }
          if (certResult.data.publisher) {
            comicDetails.publisher = certResult.data.publisher;
          }
          if (certResult.data.releaseYear) {
            comicDetails.releaseYear = certResult.data.releaseYear;
          }
          if (certResult.data.grade) {
            comicDetails.grade = certResult.data.grade;
          }
          if (certResult.data.variant) {
            comicDetails.variant = certResult.data.variant;
          }
          // Store label type and page quality
          if (certResult.data.labelType) {
            comicDetails.labelType = certResult.data.labelType;
          }
          if (certResult.data.pageQuality) {
            comicDetails.pageQuality = certResult.data.pageQuality;
          }
          // Store new grading-specific fields
          if (certResult.data.gradeDate) {
            comicDetails.gradeDate = certResult.data.gradeDate;
          }
          if (certResult.data.graderNotes) {
            comicDetails.graderNotes = certResult.data.graderNotes;
          }
          // Map signatures to signedBy
          if (certResult.data.signatures) {
            comicDetails.signedBy = certResult.data.signatures;
            comicDetails.isSignatureSeries = true;
          }
          // Map keyComments to keyInfo (authoritative source, skip AI lookup)
          if (certResult.data.keyComments) {
            // Split by periods or newlines to create array of key facts
            comicDetails.keyInfo = certResult.data.keyComments
              .split(/[.\n]+/)
              .map(s => s.trim())
              .filter(s => s.length > 0);
          }

          console.log("[analyze] Merged comic details after cert lookup:", comicDetails);
        } else {
          console.log("[analyze] Cert lookup failed or returned no data:", certResult.error);
          // Continue with AI-detected data
        }
      } catch (certError) {
        console.error("[analyze] Cert lookup error:", certError);
        // Continue with AI-detected data
      }
    }

    // If we have title and issue but missing creator info, look it up
    const missingCreatorInfo = !comicDetails.writer || !comicDetails.coverArtist || !comicDetails.interiorArtist;

    if (comicDetails.title && comicDetails.issueNumber && missingCreatorInfo) {
      console.log("Missing creator info, performing lookup...");

      try {
        const lookupResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `You are a comic book expert with extensive knowledge of comic book history and creators.

I need the creator information for this comic:
- Title: ${comicDetails.title}
- Issue Number: ${comicDetails.issueNumber}
- Publisher: ${comicDetails.publisher || "Unknown"}
- Year: ${comicDetails.releaseYear || "Unknown"}

Please provide the creator information as a JSON object:
{
  "writer": "the writer(s) of this issue",
  "coverArtist": "the cover artist for this issue",
  "interiorArtist": "the interior/pencil artist for this issue"
}

Important:
- Return ONLY the JSON object, no other text
- Use your knowledge of comic book history to provide accurate information
- If you're not confident about a specific creator, use null
- For well-known issues, this information should be in your training data
- Be specific - provide actual names, not generic responses`,
            },
          ],
        });

        const lookupTextContent = lookupResponse.content.find((block) => block.type === "text");
        if (lookupTextContent && lookupTextContent.type === "text") {
          let lookupJson = lookupTextContent.text.trim();
          console.log("Creator lookup response:", lookupJson);

          // Clean markdown if present
          if (lookupJson.startsWith("```json")) {
            lookupJson = lookupJson.slice(7);
          }
          if (lookupJson.startsWith("```")) {
            lookupJson = lookupJson.slice(3);
          }
          if (lookupJson.endsWith("```")) {
            lookupJson = lookupJson.slice(0, -3);
          }

          const creatorInfo = JSON.parse(lookupJson.trim());
          console.log("Parsed creator info:", creatorInfo);

          // Only fill in missing fields
          if (!comicDetails.writer && creatorInfo.writer) {
            comicDetails.writer = creatorInfo.writer;
          }
          if (!comicDetails.coverArtist && creatorInfo.coverArtist) {
            comicDetails.coverArtist = creatorInfo.coverArtist;
          }
          if (!comicDetails.interiorArtist && creatorInfo.interiorArtist) {
            comicDetails.interiorArtist = creatorInfo.interiorArtist;
          }

          console.log("Final comic details with creator info:", comicDetails);
        }
      } catch (lookupError) {
        // Don't fail the whole request if lookup fails, just log it
        console.error("Creator lookup failed:", lookupError);
      }
    }

    // Verify and fill in any other missing details
    const missingBasicInfo = !comicDetails.publisher || !comicDetails.releaseYear || !comicDetails.variant;

    if (comicDetails.title && comicDetails.issueNumber && missingBasicInfo) {
      console.log("Missing basic info, performing verification lookup...");

      try {
        const verifyResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `You are a comic book expert with extensive knowledge of comic book history.

I need to verify and complete the following comic book information:
- Title: ${comicDetails.title}
- Issue Number: ${comicDetails.issueNumber}
- Publisher: ${comicDetails.publisher || "Unknown"}
- Year: ${comicDetails.releaseYear || "Unknown"}
- Variant: ${comicDetails.variant || "Unknown"}

Please provide the correct/complete information as a JSON object:
{
  "publisher": "the correct publisher name (e.g., 'Marvel Comics', 'DC Comics')",
  "releaseYear": "the 4-digit year this issue was published",
  "variant": "the variant name if this is a variant cover, or null if it's a standard cover",
  "keyInfo": ["array of MAJOR key facts about this issue"]
}

Important:
- Return ONLY the JSON object, no other text
- Use your knowledge of comic book history to provide accurate information
- If you're not confident about a specific field, use null
- For publisher, use the full official name
- For keyInfo, ONLY include truly significant collector-relevant facts:
  * First appearances of MAJOR characters (heroes, villains, or significant supporting cast that collectors care about)
  * Major storyline events (e.g., "Death of Gwen Stacy", "Dark Phoenix Saga begins")
  * Origin stories of major characters
  * First appearance of iconic costumes or items (e.g., "First appearance of symbiote suit", "First Infinity Gauntlet")
  * Iconic/historically significant cover art
  * Creator milestones (e.g., "First Neal Adams art on Green Lantern", "First Todd McFarlane Spider-Man")
- Do NOT include: minor character appearances, team roster changes, crossover tie-ins, relationship milestones, or anything that wouldn't significantly affect the comic's collector value
- Quality over quantity - only 1-3 facts for truly key issues, empty array for regular issues
- Return an empty array for issues with no major significance`,
            },
          ],
        });

        const verifyTextContent = verifyResponse.content.find((block) => block.type === "text");
        if (verifyTextContent && verifyTextContent.type === "text") {
          let verifyJson = verifyTextContent.text.trim();
          console.log("Verification lookup response:", verifyJson);

          // Clean markdown if present
          if (verifyJson.startsWith("```json")) {
            verifyJson = verifyJson.slice(7);
          }
          if (verifyJson.startsWith("```")) {
            verifyJson = verifyJson.slice(3);
          }
          if (verifyJson.endsWith("```")) {
            verifyJson = verifyJson.slice(0, -3);
          }

          const verifyInfo = JSON.parse(verifyJson.trim());
          console.log("Parsed verification info:", verifyInfo);

          // Only fill in missing fields
          if (!comicDetails.publisher && verifyInfo.publisher) {
            comicDetails.publisher = verifyInfo.publisher;
          }
          if (!comicDetails.releaseYear && verifyInfo.releaseYear) {
            comicDetails.releaseYear = verifyInfo.releaseYear;
          }
          if (!comicDetails.variant && verifyInfo.variant) {
            comicDetails.variant = verifyInfo.variant;
          }
          // Set key info from verification
          if (verifyInfo.keyInfo && Array.isArray(verifyInfo.keyInfo)) {
            comicDetails.keyInfo = verifyInfo.keyInfo;
          } else {
            comicDetails.keyInfo = [];
          }

          console.log("Final comic details after verification:", comicDetails);
        }
      } catch (verifyError) {
        // Don't fail the whole request if verification fails, just log it
        console.error("Verification lookup failed:", verifyError);
      }
    }

    // Key Info lookup - if we have title+issue but keyInfo is empty (verification didn't run or failed)
    if (comicDetails.title && comicDetails.issueNumber && (!comicDetails.keyInfo || comicDetails.keyInfo.length === 0)) {
      console.log("Performing key info lookup...");

      // FIRST: Check our curated key comics database (fast, guaranteed accurate)
      const databaseKeyInfo = lookupKeyInfo(comicDetails.title, comicDetails.issueNumber);
      if (databaseKeyInfo && databaseKeyInfo.length > 0) {
        console.log("Key info found in database:", databaseKeyInfo);
        comicDetails.keyInfo = databaseKeyInfo;
      } else {
        // FALLBACK: Use AI lookup for comics not in our database
        console.log("Key info not in database, falling back to AI lookup...");
      }
    }

    // AI Key Info lookup - only if database didn't have it
    if (comicDetails.title && comicDetails.issueNumber && (!comicDetails.keyInfo || comicDetails.keyInfo.length === 0)) {
      try {
        const keyInfoResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are a comic book expert. I need to know if this issue has any MAJOR collector significance.

Comic: ${comicDetails.title} #${comicDetails.issueNumber}
Publisher: ${comicDetails.publisher || "Unknown"}
Year: ${comicDetails.releaseYear || "Unknown"}

Return a JSON object:
{
  "keyInfo": ["array of MAJOR key facts - leave empty if none"]
}

ONLY include facts that significantly impact collector value:
- First appearances of MAJOR characters (not minor/supporting characters)
- Major storyline events (e.g., "Death of Superman", "Kraven's Last Hunt begins")
- Origin stories of major characters
- First appearance of iconic costumes/items (e.g., "First symbiote suit", "First Infinity Gauntlet")
- Iconic/historically significant cover art
- Creator milestones (e.g., "First Jim Lee X-Men art", "First Frank Miller Daredevil")

Do NOT include:
- Minor character first appearances
- Team roster changes
- Crossover tie-ins
- Deaths that were quickly reversed
- Relationship milestones
- Cameo appearances

Most issues should return an empty array. Only 1-3 facts maximum for truly key issues.
Return ONLY the JSON object.`,
            },
          ],
        });

        const keyInfoTextContent = keyInfoResponse.content.find((block) => block.type === "text");
        if (keyInfoTextContent && keyInfoTextContent.type === "text") {
          let keyInfoJson = keyInfoTextContent.text.trim();
          console.log("Key info lookup response:", keyInfoJson);

          // Clean markdown if present
          if (keyInfoJson.startsWith("```json")) {
            keyInfoJson = keyInfoJson.slice(7);
          }
          if (keyInfoJson.startsWith("```")) {
            keyInfoJson = keyInfoJson.slice(3);
          }
          if (keyInfoJson.endsWith("```")) {
            keyInfoJson = keyInfoJson.slice(0, -3);
          }

          const keyInfoData = JSON.parse(keyInfoJson.trim());
          console.log("Parsed key info:", keyInfoData);

          if (keyInfoData.keyInfo && Array.isArray(keyInfoData.keyInfo)) {
            comicDetails.keyInfo = keyInfoData.keyInfo;
          }
        }
      } catch (keyInfoError) {
        console.error("Key info lookup failed:", keyInfoError);
      }
    }

    // Price/Value lookup - Try eBay first, fall back to AI
    if (comicDetails.title && comicDetails.issueNumber) {
      console.log("Performing price lookup...");

      const isSlabbed = comicDetails.isSlabbed || false;
      const grade = comicDetails.grade ? parseFloat(comicDetails.grade) : 9.4;
      let priceDataFound = false;

      // 1. Try eBay Finding API first (real sold listings) - with Redis + Supabase caching
      if (isFindingApiConfigured()) {
        console.log("[analyze] Trying eBay Finding API...");
        try {
          const cacheKey = generateEbayPriceCacheKey(
            comicDetails.title,
            comicDetails.issueNumber,
            grade,
            isSlabbed,
            comicDetails.gradingCompany || undefined
          );

          // 1a. Check Redis cache first (fastest)
          const redisResult = await cacheGet<PriceData | { noData: true }>(cacheKey, "ebayPrice");
          if (redisResult !== null) {
            if ("noData" in redisResult) {
              console.log("[analyze] Redis cache indicates no eBay data available");
              // priceDataFound stays false, will fall back to AI
            } else {
              console.log("[analyze] eBay price found in Redis cache");
              comicDetails.priceData = {
                ...redisResult,
                priceSource: "ebay",
              };
              priceDataFound = true;
            }
          }

          if (!priceDataFound && redisResult === null) {
            // 1b. Check Supabase cache (fallback, still faster than API)
            const supabaseResult = await getCachedEbayPrice(cacheKey);
            if (supabaseResult.found) {
              if (supabaseResult.data) {
                console.log("[analyze] eBay price found in Supabase cache");
                comicDetails.priceData = {
                  ...supabaseResult.data,
                  priceSource: "ebay",
                };
                priceDataFound = true;
                // Backfill Redis cache for next time
                cacheSet(cacheKey, supabaseResult.data, "ebayPrice");
              } else {
                console.log("[analyze] Cache hit but no eBay data available (previously checked)");
                // Cache the "no data" marker in Redis too
                cacheSet(cacheKey, { noData: true }, "ebayPrice");
              }
            } else {
              // 1c. Fetch from eBay API (slowest)
              const ebayPriceData = await lookupEbaySoldPrices(
                comicDetails.title,
                comicDetails.issueNumber,
                grade,
                isSlabbed,
                comicDetails.gradingCompany || undefined
              );

              if (ebayPriceData && ebayPriceData.estimatedValue) {
                console.log("[analyze] eBay price data found");
                comicDetails.priceData = {
                  ...ebayPriceData,
                  priceSource: "ebay",
                };
                priceDataFound = true;

                // Cache in both Redis and Supabase
                cacheSet(cacheKey, ebayPriceData, "ebayPrice");
                await setCachedEbayPrice(
                  cacheKey,
                  ebayPriceData,
                  comicDetails.title,
                  comicDetails.issueNumber,
                  grade,
                  isSlabbed,
                  comicDetails.gradingCompany || undefined
                );
              } else {
                // Cache the "no results" to avoid repeated API calls
                cacheSet(cacheKey, { noData: true }, "ebayPrice");
                await setCachedEbayPrice(
                  cacheKey,
                  null,
                  comicDetails.title,
                  comicDetails.issueNumber,
                  grade,
                  isSlabbed,
                  comicDetails.gradingCompany || undefined
                );
              }
            }
          }
        } catch (ebayError) {
          console.error("[analyze] eBay lookup failed:", ebayError);
        }
      }

      // 2. Fall back to AI estimates if eBay didn't return results
      if (!priceDataFound) {
        console.log("[analyze] Falling back to AI price estimates...");
        try {
          const gradeInfo = comicDetails.grade
            ? `Grade: ${comicDetails.grade}`
            : "Raw/Ungraded";
          const signatureInfo = comicDetails.isSignatureSeries
            ? `Signature Series signed by ${comicDetails.signedBy || "unknown"}`
            : "";
          const gradingCompanyInfo = comicDetails.gradingCompany
            ? `Graded by ${comicDetails.gradingCompany}`
            : "";

          const priceResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `You are a comic book market expert with knowledge of recent comic book sales and values.

I need estimated recent sale prices for this comic:
- Title: ${comicDetails.title}
- Issue Number: ${comicDetails.issueNumber}
- Publisher: ${comicDetails.publisher || "Unknown"}
- Year: ${comicDetails.releaseYear || "Unknown"}
- Condition: ${gradeInfo} ${gradingCompanyInfo} ${signatureInfo}

Based on your knowledge of the comic book market, provide realistic estimated recent sale prices. Consider:
- The significance/key status of this issue
- The grade/condition
- Whether it's a signature series (adds value)
- Recent market trends for this title

Return a JSON object with estimated recent sales data AND grade-specific price estimates:
{
  "recentSales": [
    { "price": estimated_price_1, "date": "YYYY-MM-DD", "source": "eBay", "daysAgo": number },
    { "price": estimated_price_2, "date": "YYYY-MM-DD", "source": "eBay", "daysAgo": number },
    { "price": estimated_price_3, "date": "YYYY-MM-DD", "source": "eBay", "daysAgo": number }
  ],
  "gradeEstimates": [
    { "grade": 9.8, "label": "Near Mint/Mint", "rawValue": price, "slabbedValue": price },
    { "grade": 9.4, "label": "Near Mint", "rawValue": price, "slabbedValue": price },
    { "grade": 8.0, "label": "Very Fine", "rawValue": price, "slabbedValue": price },
    { "grade": 6.0, "label": "Fine", "rawValue": price, "slabbedValue": price },
    { "grade": 4.0, "label": "Very Good", "rawValue": price, "slabbedValue": price },
    { "grade": 2.0, "label": "Good", "rawValue": price, "slabbedValue": price }
  ],
  "marketNotes": "brief note about this comic's market value"
}

Important:
- Return ONLY the JSON object, no other text
- For recentSales: provide 3 realistic sale prices at the scanned grade (or 9.4 NM for raw)
- Use dates within the last 6 months (late 2025/early 2026)
- For gradeEstimates: provide realistic price differences between grades
  - Raw comics are ungraded copies (typically 10-30% less than slabbed)
  - Slabbed values are for CGC/CBCS graded copies (command a premium)
  - Higher grades exponentially more valuable for key issues
  - Lower grades have smaller price gaps between them
- Price scaling rules:
  - For KEY issues (first appearances, deaths): 9.8 can be 2-10x the 9.4 price
  - For regular issues: grade premiums are more modest (9.8 ~1.5-2x of 9.4)
  - Raw copies typically 70-90% of equivalent slabbed value
  - Lower grades (2.0-4.0) may be affordable entry points for expensive keys
- Be realistic with actual market pricing behavior`,
              },
            ],
          });

          const priceTextContent = priceResponse.content.find((block) => block.type === "text");
          if (priceTextContent && priceTextContent.type === "text") {
            let priceJson = priceTextContent.text.trim();
            console.log("AI Price lookup response:", priceJson);

            // Clean markdown if present
            if (priceJson.startsWith("```json")) {
              priceJson = priceJson.slice(7);
            }
            if (priceJson.startsWith("```")) {
              priceJson = priceJson.slice(3);
            }
            if (priceJson.endsWith("```")) {
              priceJson = priceJson.slice(0, -3);
            }

            const priceInfo = JSON.parse(priceJson.trim());
            console.log("Parsed AI price info:", priceInfo);

            // Process the sales data according to business rules
            const now = new Date();
            const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));

            const processedSales = priceInfo.recentSales.map((sale: { price: number; date: string; source: string; daysAgo?: number }) => {
              const saleDate = new Date(sale.date);
              return {
                price: sale.price,
                date: sale.date,
                source: sale.source || "eBay",
                isOlderThan6Months: saleDate < sixMonthsAgo
              };
            });

            // Filter to recent sales (within 6 months)
            const recentSales = processedSales.filter((s: { isOlderThan6Months: boolean }) => !s.isOlderThan6Months);

            let estimatedValue: number | null = null;
            let isAveraged = false;
            let disclaimer: string | null = null;
            let mostRecentSaleDate: string | null = null;

            // Sort by date to find most recent
            const sortedSales = [...processedSales].sort((a: { date: string }, b: { date: string }) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            if (sortedSales.length > 0) {
              mostRecentSaleDate = sortedSales[0].date;
            }

            if (recentSales.length >= 3) {
              // Average of last 3 recent sales
              const last3 = recentSales.slice(0, 3);
              estimatedValue = last3.reduce((sum: number, s: { price: number }) => sum + s.price, 0) / 3;
              isAveraged = true;
              disclaimer = "Technopathic estimate - actual prices may vary.";
            } else if (recentSales.length > 0) {
              // Average of available recent sales
              estimatedValue = recentSales.reduce((sum: number, s: { price: number }) => sum + s.price, 0) / recentSales.length;
              isAveraged = recentSales.length > 1;
              disclaimer = "Technopathic estimate - actual prices may vary.";
            } else if (processedSales.length > 0) {
              // Only older sales available - use most recent only
              estimatedValue = sortedSales[0].price;
              isAveraged = false;
              disclaimer = "Technopathic estimate - actual prices may vary.";
            }

            // Process grade estimates if available
            let gradeEstimates = undefined;
            if (priceInfo.gradeEstimates && Array.isArray(priceInfo.gradeEstimates)) {
              gradeEstimates = priceInfo.gradeEstimates.map((ge: { grade: number; label: string; rawValue: number; slabbedValue: number }) => ({
                grade: ge.grade,
                label: ge.label,
                rawValue: Math.round(ge.rawValue * 100) / 100,
                slabbedValue: Math.round(ge.slabbedValue * 100) / 100,
              }));
            }

            // Determine base grade for the estimate
            const baseGrade = comicDetails.grade ? parseFloat(comicDetails.grade) : 9.4;

            comicDetails.priceData = {
              estimatedValue: estimatedValue ? Math.round(estimatedValue * 100) / 100 : null,
              recentSales: processedSales,
              mostRecentSaleDate,
              isAveraged,
              disclaimer,
              gradeEstimates,
              baseGrade,
              priceSource: "ai",
            };

            console.log("Final AI price data:", comicDetails.priceData);
          }
        } catch (priceError) {
          console.error("AI Price lookup failed:", priceError);
          comicDetails.priceData = null;
        }
      }
    } else {
      comicDetails.priceData = null;
    }

    // ============================================
    // Increment Scan Count (after successful analysis)
    // ============================================
    if (profileId) {
      // Fire and forget - don't block the response
      incrementScanCount(profileId, "scan").catch((err) => {
        console.error("Failed to increment scan count:", err);
      });
    }

    return NextResponse.json(comicDetails);
  } catch (error) {
    console.error("Error analyzing comic:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "Our comic recognition service is temporarily busy. Please wait a moment and try again." },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong while analyzing your comic. Please try again or use a different photo." },
      { status: 500 }
    );
  }
}
