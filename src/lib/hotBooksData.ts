/**
 * Hot Books Data Layer with ISR (Incremental Static Regeneration)
 *
 * This module provides server-side data fetching for hot books
 * with automatic revalidation. Used by both the API route and
 * the hot books page for SSR/ISR support.
 */

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface HotBook {
  id?: string;
  rank: number;
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  keyFacts: string[];
  whyHot: string;
  priceRange: {
    low: number;
    mid: number;
    high: number;
  };
  coverImageUrl?: string;
  priceSource?: string;
  rankChange?: number | null;
  dataSource?: string;
}

interface DbHotBook {
  id: string;
  title: string;
  issue_number: string;
  publisher: string | null;
  release_year: string | null;
  key_info: string[];
  why_hot: string | null;
  cover_image_url: string | null;
  price_low: number | null;
  price_mid: number | null;
  price_high: number | null;
  price_source: string;
  current_rank: number | null;
  rank_change: number | null;
  data_source: string;
  prices_updated_at: string | null;
}

/**
 * Convert database record to API response format
 */
function dbToApiFormat(db: DbHotBook): HotBook {
  return {
    id: db.id,
    rank: db.current_rank || 0,
    title: db.title,
    issueNumber: db.issue_number,
    publisher: db.publisher || "Unknown",
    year: db.release_year || "Unknown",
    keyFacts: db.key_info || [],
    whyHot: db.why_hot || "",
    priceRange: {
      low: db.price_low || 0,
      mid: db.price_mid || 0,
      high: db.price_high || 0,
    },
    coverImageUrl: db.cover_image_url || undefined,
    priceSource: db.price_source,
    rankChange: db.rank_change,
    dataSource: db.data_source,
  };
}

/**
 * Fetch hot books from database
 * This is the core data fetching function
 */
async function fetchHotBooksFromDb(): Promise<HotBook[]> {
  const { data: dbBooks, error } = await supabase
    .from("hot_books")
    .select("*")
    .not("current_rank", "is", null)
    .order("current_rank", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[hotBooksData] Database error:", error);
    return [];
  }

  if (!dbBooks || dbBooks.length === 0) {
    return [];
  }

  return (dbBooks as DbHotBook[]).map(dbToApiFormat);
}

/**
 * Get hot books with ISR caching
 * Revalidates every hour to balance freshness with performance
 */
export const getHotBooks = unstable_cache(
  fetchHotBooksFromDb,
  ["hot-books"],
  {
    revalidate: 3600, // Revalidate every hour
    tags: ["hot-books"],
  }
);

/**
 * Get hot books without caching (for API routes that need fresh data)
 */
export async function getHotBooksFresh(): Promise<HotBook[]> {
  return fetchHotBooksFromDb();
}
