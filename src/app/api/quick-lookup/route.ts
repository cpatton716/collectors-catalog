import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY;
const COMIC_VINE_BASE_URL = "https://comicvine.gamespot.com/api";

interface ComicVineIssue {
  id: number;
  name: string | null;
  issue_number: string;
  cover_date: string | null;
  image: {
    original_url: string;
    medium_url: string;
    thumb_url: string;
  } | null;
  volume: {
    id: number;
    name: string;
    publisher?: {
      name: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json();

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }

    // Step 1: Look up comic details from Comic Vine
    let comicDetails: {
      title: string | null;
      issueNumber: string | null;
      publisher: string | null;
      releaseYear: string | null;
      variant: string | null;
      coverImageUrl: string | null;
    } | null = null;

    if (COMIC_VINE_API_KEY) {
      const upcWithoutCheckDigit = barcode.slice(0, -1);
      const searchUrl = `${COMIC_VINE_BASE_URL}/issues/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=upc:${upcWithoutCheckDigit}&field_list=id,name,issue_number,cover_date,image,volume`;

      const response = await fetch(searchUrl, {
        headers: { "User-Agent": "ComicTracker/1.0" },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.error === "OK" && data.results && data.results.length > 0) {
          const issue: ComicVineIssue = data.results[0];
          comicDetails = {
            title: issue.volume?.name || null,
            issueNumber: issue.issue_number || null,
            publisher: issue.volume?.publisher?.name || null,
            releaseYear: issue.cover_date ? issue.cover_date.split("-")[0] : null,
            variant: null,
            coverImageUrl: issue.image?.medium_url || issue.image?.original_url || null,
          };
        }
      }
    }

    if (!comicDetails || !comicDetails.title) {
      return NextResponse.json(
        { error: "Comic not found. Try scanning the cover instead." },
        { status: 404 }
      );
    }

    // Step 2: Get key info and price data from Claude
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return what we have without price data
      return NextResponse.json({
        comic: {
          id: `quick-${Date.now()}`,
          ...comicDetails,
          confidence: "high" as const,
          isSlabbed: false,
          gradingCompany: null,
          grade: null,
          isSignatureSeries: false,
          signedBy: null,
          keyInfo: [],
          priceData: null,
          writer: null,
          coverArtist: null,
          interiorArtist: null,
        },
        coverImageUrl: comicDetails.coverImageUrl,
      });
    }

    // Combined lookup for key info + prices (faster than separate calls)
    const lookupResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a comic book expert. For "${comicDetails.title}" issue #${comicDetails.issueNumber} (${comicDetails.publisher || "Unknown"}, ${comicDetails.releaseYear || "Unknown"}):

Provide key facts and estimated market values as JSON:
{
  "keyInfo": ["array of significant facts - first appearances, deaths, key events"],
  "gradeEstimates": [
    { "grade": 9.8, "label": "Near Mint/Mint", "rawValue": price, "slabbedValue": price },
    { "grade": 9.4, "label": "Near Mint", "rawValue": price, "slabbedValue": price },
    { "grade": 8.0, "label": "Very Fine", "rawValue": price, "slabbedValue": price },
    { "grade": 6.0, "label": "Fine", "rawValue": price, "slabbedValue": price },
    { "grade": 4.0, "label": "Very Good", "rawValue": price, "slabbedValue": price },
    { "grade": 2.0, "label": "Good", "rawValue": price, "slabbedValue": price }
  ],
  "estimatedValue": number (9.4 raw value as default)
}

Rules:
- keyInfo: Include first appearances, deaths, team changes, significant events. Empty array only if truly nothing notable.
- Prices: Realistic market values. Key issues have larger grade spreads. Slabbed > raw by 10-30%.
- Return ONLY the JSON object, no other text.`,
        },
      ],
    });

    let keyInfo: string[] = [];
    let priceData = null;

    const textContent = lookupResponse.content.find((block) => block.type === "text");
    if (textContent && textContent.type === "text") {
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
      if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
      if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);

      try {
        const parsed = JSON.parse(jsonText.trim());
        keyInfo = parsed.keyInfo || [];

        if (parsed.gradeEstimates) {
          priceData = {
            estimatedValue: parsed.estimatedValue || parsed.gradeEstimates.find((g: { grade: number }) => g.grade === 9.4)?.rawValue || null,
            recentSales: [],
            mostRecentSaleDate: null,
            isAveraged: false,
            disclaimer: "AI-estimated values based on market knowledge. Actual prices may vary.",
            gradeEstimates: parsed.gradeEstimates,
            baseGrade: 9.4,
          };
        }
      } catch {
        console.error("Failed to parse quick lookup response");
      }
    }

    return NextResponse.json({
      comic: {
        id: `quick-${Date.now()}`,
        title: comicDetails.title,
        issueNumber: comicDetails.issueNumber,
        variant: comicDetails.variant,
        publisher: comicDetails.publisher,
        releaseYear: comicDetails.releaseYear,
        confidence: "high" as const,
        isSlabbed: false,
        gradingCompany: null,
        grade: null,
        isSignatureSeries: false,
        signedBy: null,
        keyInfo,
        priceData,
        writer: null,
        coverArtist: null,
        interiorArtist: null,
      },
      coverImageUrl: comicDetails.coverImageUrl,
    });
  } catch (error) {
    console.error("Error in quick lookup:", error);
    return NextResponse.json(
      { error: "Failed to look up comic" },
      { status: 500 }
    );
  }
}
