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
          content: `You are a comic book expert. Given the partial title "${query}", suggest up to 8 official comic book series titles that match or start with this text.

Focus on:
- Major publisher titles (Marvel, DC, Image, Dark Horse, etc.)
- Use the official/canonical series name
- Include popular and classic series
- Normalize variations (e.g., "Spider-Man" not "Spiderman" or "Spider man")

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
