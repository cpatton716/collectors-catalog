import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for comic lookups to reduce API calls
const lookupCache = new Map<string, { data: ComicLookupResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface ComicLookupResult {
  publisher: string | null;
  releaseYear: string | null;
  writer: string | null;
  coverArtist: string | null;
  interiorArtist: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { title, issueNumber, lookupType } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create cache key
    const cacheKey = `${title.toLowerCase().trim()}-${issueNumber || "none"}-${lookupType}`;
    const cached = lookupCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    let prompt = "";

    if (lookupType === "publisher") {
      // Just looking up publisher from title
      prompt = `You are a comic book expert. For the comic series "${title}", provide the publisher.

Return ONLY a JSON object with this format, no other text:
{"publisher": "Publisher Name"}

If you're not sure, return {"publisher": null}`;
    } else {
      // Looking up full details with title and issue number
      prompt = `You are a comic book expert. For the comic "${title}" issue #${issueNumber}, provide the following details:

1. Publisher (the company that published this comic)
2. Release Year (the year this specific issue was published)
3. Writer (primary writer)
4. Cover Artist (cover artist for this issue)
5. Interior Artist (interior/pencil artist for this issue)

Return ONLY a JSON object with this format, no other text:
{
  "publisher": "Publisher Name",
  "releaseYear": "YYYY",
  "writer": "Writer Name",
  "coverArtist": "Artist Name",
  "interiorArtist": "Artist Name"
}

Use null for any field you're not confident about. Be accurate - this is for a collector's database.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null });
    }

    let result: ComicLookupResult;
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
      result = JSON.parse(jsonText.trim());
    } catch {
      console.error("Failed to parse comic lookup response");
      return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null });
    }

    // Cache the result
    lookupCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in comic lookup:", error);
    return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null });
  }
}
