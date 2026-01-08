import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { title, issueNumber, variant, publisher, releaseYear } = await request.json();

    if (!title || !issueNumber) {
      return NextResponse.json(
        { error: "Title and issue number are required" },
        { status: 400 }
      );
    }

    // Build the comic identifier string
    const comicIdentifier = `${title} #${issueNumber}${variant ? ` (${variant})` : ""}${publisher ? ` - ${publisher}` : ""}${releaseYear ? ` (${releaseYear})` : ""}`;

    // Use Claude to get price data and key info
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a comic book pricing expert. For the following comic, provide:
1. An estimated market value in USD (be realistic based on typical eBay sold prices for raw copies in VF/NM condition)
2. Any key information about this issue (first appearances, deaths, major events, etc.)

Comic: ${comicIdentifier}

Respond in JSON format only:
{
  "estimatedValue": number or null,
  "keyInfo": ["array of key facts about this issue"] or [],
  "disclaimer": "Brief note about price accuracy"
}

For keyInfo, be THOROUGH and include ANY significant facts such as:
- First appearances of ANY character (heroes, villains, supporting cast)
- First cameo vs full appearances
- Character deaths or resurrections
- Origin stories
- Major storyline events

If you don't have reliable information about this specific comic, return null for estimatedValue and an empty array for keyInfo. Do not make up values.`,
        },
      ],
    });

    let priceData = null;
    let keyInfo: string[] = [];

    // Parse Claude's response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.estimatedValue !== null && typeof parsed.estimatedValue === "number") {
          priceData = {
            estimatedValue: parsed.estimatedValue,
            recentSales: [],
            mostRecentSaleDate: null,
            isAveraged: false,
            disclaimer: parsed.disclaimer || "AI-estimated value based on market data",
          };
        }

        if (Array.isArray(parsed.keyInfo)) {
          keyInfo = parsed.keyInfo;
        }
      }
    } catch {
      // If parsing fails, continue without price data
      console.log("Failed to parse Claude response for:", comicIdentifier);
    }

    return NextResponse.json({
      priceData,
      keyInfo,
    });
  } catch (error) {
    console.error("Import lookup error:", error);
    return NextResponse.json(
      { error: "Failed to look up comic data" },
      { status: 500 }
    );
  }
}
