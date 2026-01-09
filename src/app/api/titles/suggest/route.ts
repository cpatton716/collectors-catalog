import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for title suggestions to reduce API calls
const titleCache = new Map<string, { suggestions: string[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    const cached = titleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ suggestions: cached.suggestions });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a comic book expert. Given the search term "${query}", suggest up to 10 official comic book series titles that CONTAIN this text anywhere in the title.

IMPORTANT: Match titles where the search term appears ANYWHERE in the title, not just at the beginning. For example:
- "Spider" should match "The Amazing Spider-Man", "Spider-Woman", "Ultimate Spider-Man", "Superior Spider-Man", etc.
- "man" should match "Batman", "Superman", "Iron Man", "Spider-Man", etc.
- "x-men" should match "X-Men", "Uncanny X-Men", "New X-Men", "Astonishing X-Men", etc.

Also handle common typos and variations:
- "Spiderman" or "spider man" → match "Spider-Man" titles
- "Xmen" → match "X-Men" titles
- "Batmam" → match "Batman" titles

Focus on:
- Major publisher titles (Marvel, DC, Image, Dark Horse, etc.)
- Use the official/canonical series name
- Prioritize more popular/well-known series first
- Include both current and classic series

Return ONLY a JSON array of strings, no other text:
["Title 1", "Title 2", ...]

If no matches, return an empty array: []`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ suggestions: [] });
    }

    let suggestions: string[] = [];
    try {
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      suggestions = JSON.parse(jsonText.trim());
    } catch {
      console.error("Failed to parse title suggestions");
      return NextResponse.json({ suggestions: [] });
    }

    // Cache the result
    titleCache.set(cacheKey, { suggestions, timestamp: Date.now() });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error getting title suggestions:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
