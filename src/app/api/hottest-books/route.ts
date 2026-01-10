import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { STATIC_HOT_BOOKS } from "@/lib/staticHotBooks";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY;
const COMIC_VINE_BASE_URL = "https://comicvine.gamespot.com/api";

const CACHE_KEY = "hottest_books";
const CACHE_TTL_HOURS = 24;

// TESTING MODE: Use static list to conserve API credits
// TODO: Set to false before production launch (see BACKLOG.md)
const USE_STATIC_LIST = true;

// Fetch cover image from Comic Vine
async function getComicVineCoverImage(title: string, issueNumber: string): Promise<string | null> {
  if (!COMIC_VINE_API_KEY) {
    return null;
  }

  try {
    // Search for the volume first
    const volumeSearchUrl = `${COMIC_VINE_BASE_URL}/volumes/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=name:${encodeURIComponent(title)}&field_list=id,name&limit=5`;
    const volumeResponse = await fetch(volumeSearchUrl, {
      headers: { "User-Agent": "ComicTracker/1.0" },
    });

    if (!volumeResponse.ok) return null;

    const volumeData = await volumeResponse.json();
    if (volumeData.error !== "OK" || !volumeData.results?.length) return null;

    // Find best matching volume
    const volume = volumeData.results.find(
      (v: { name: string }) => v.name.toLowerCase() === title.toLowerCase()
    ) || volumeData.results[0];

    // Search for the issue
    const issueSearchUrl = `${COMIC_VINE_BASE_URL}/issues/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=volume:${volume.id},issue_number:${issueNumber}&field_list=id,image`;
    const issueResponse = await fetch(issueSearchUrl, {
      headers: { "User-Agent": "ComicTracker/1.0" },
    });

    if (!issueResponse.ok) return null;

    const issueData = await issueResponse.json();
    if (issueData.error !== "OK" || !issueData.results?.length) return null;

    const issue = issueData.results[0];
    return issue.image?.medium_url || issue.image?.small_url || null;
  } catch (error) {
    console.error("Error fetching cover from Comic Vine:", error);
    return null;
  }
}

export interface HotBook {
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
}

export async function GET() {
  try {
    // TESTING MODE: Return static list to conserve API credits
    if (USE_STATIC_LIST) {
      console.log("Returning static hottest books list (testing mode)");
      return NextResponse.json({ books: STATIC_HOT_BOOKS, cached: true, static: true });
    }

    // Check Supabase cache first (shared across all users/instances)
    const { data: cachedData } = await supabase
      .from("app_cache")
      .select("data, expires_at")
      .eq("key", CACHE_KEY)
      .single();

    if (cachedData && new Date(cachedData.expires_at) > new Date()) {
      console.log("Returning cached hottest books from Supabase");
      return NextResponse.json({ books: cachedData.data, cached: true });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "The Hottest Books feature is temporarily unavailable. Please check back soon!" },
        { status: 500 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a comic book market expert. Generate a list of the 10 hottest comic books in the current market based on your knowledge of recent trends, movie/TV announcements, key issues, and collector demand.

For each book, provide:
1. Title and issue number
2. Publisher and year
3. Key facts (first appearances, significant events)
4. Why it's hot right now (movie announcement, speculation, anniversary, etc.)
5. Estimated price range for raw copies in VF-NM condition (low/mid/high)

Return ONLY a valid JSON array with this exact format, no other text:
[
  {
    "rank": 1,
    "title": "Comic Title",
    "issueNumber": "1",
    "publisher": "Publisher Name",
    "year": "1980",
    "keyFacts": ["First appearance of Character", "Origin story"],
    "whyHot": "Brief explanation of current market interest",
    "priceRange": {"low": 50, "mid": 100, "high": 200}
  }
]

Focus on a mix of:
- Recent movie/TV speculation
- Classic key issues seeing renewed interest
- Modern keys with strong demand
- Books with upcoming media adaptations

Be accurate with your key facts and realistic with price estimates.`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ books: [], error: "We couldn't load the hottest books right now. Please try again." });
    }

    let books: HotBook[] = [];
    try {
      let jsonText = textContent.text.trim();
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      books = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("Failed to parse hot books response:", parseError);
      return NextResponse.json({ books: [], error: "We had trouble loading the hottest books. Please refresh to try again." });
    }

    // Fetch cover images from Comic Vine for each book
    if (COMIC_VINE_API_KEY) {
      console.log("Fetching cover images from Comic Vine...");
      const booksWithCovers = await Promise.all(
        books.map(async (book, index) => {
          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, index * 200));
          const coverImageUrl = await getComicVineCoverImage(book.title, book.issueNumber);
          return { ...book, coverImageUrl: coverImageUrl || undefined };
        })
      );
      books = booksWithCovers;
      console.log(`Fetched ${books.filter(b => b.coverImageUrl).length} cover images`);
    }

    // Cache the result in Supabase (shared across all users/instances)
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase
      .from("app_cache")
      .upsert({
        key: CACHE_KEY,
        data: books,
        expires_at: expiresAt,
      });
    console.log("Cached hottest books to Supabase, expires:", expiresAt);

    return NextResponse.json({ books, cached: false });
  } catch (error) {
    console.error("Error fetching hottest books:", error);
    return NextResponse.json(
      { books: [], error: "Something went wrong while loading the hottest books. Please try again later." },
      { status: 500 }
    );
  }
}
