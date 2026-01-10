import { NextRequest, NextResponse } from "next/server";

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
  person_credits?: Array<{
    name: string;
    role: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json();

    if (!barcode) {
      return NextResponse.json(
        { error: "No barcode was detected. Please try scanning again with the barcode clearly visible." },
        { status: 400 }
      );
    }

    if (!COMIC_VINE_API_KEY) {
      return NextResponse.json(
        { error: "Barcode lookup is temporarily unavailable. Try scanning the cover image instead." },
        { status: 500 }
      );
    }

    // Search Comic Vine by UPC barcode
    // Comic Vine stores UPC codes without the last digit (check digit)
    const upcWithoutCheckDigit = barcode.slice(0, -1);

    const searchUrl = `${COMIC_VINE_BASE_URL}/issues/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=upc:${upcWithoutCheckDigit}&field_list=id,name,issue_number,cover_date,image,volume,person_credits`;

    console.log("Searching Comic Vine for barcode:", barcode);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "ComicTracker/1.0",
      },
    });

    if (!response.ok) {
      console.error("Comic Vine API error:", response.status);
      return NextResponse.json(
        { error: "We couldn't look up this barcode right now. Please try again or scan the cover instead." },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.error !== "OK" || !data.results || data.results.length === 0) {
      // Try alternate search with full barcode
      const altSearchUrl = `${COMIC_VINE_BASE_URL}/issues/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=upc:${barcode}&field_list=id,name,issue_number,cover_date,image,volume,person_credits`;

      const altResponse = await fetch(altSearchUrl, {
        headers: {
          "User-Agent": "ComicTracker/1.0",
        },
      });

      const altData = await altResponse.json();

      if (altData.error !== "OK" || !altData.results || altData.results.length === 0) {
        return NextResponse.json(
          { error: "We couldn't find this comic by barcode. This sometimes happens with older or variant issues. Try scanning the cover instead!" },
          { status: 404 }
        );
      }

      data.results = altData.results;
    }

    const issue: ComicVineIssue = data.results[0];

    // Extract writer and artist from person credits
    let writer: string | null = null;
    let coverArtist: string | null = null;
    let interiorArtist: string | null = null;

    if (issue.person_credits) {
      for (const credit of issue.person_credits) {
        const role = credit.role.toLowerCase();
        if (role.includes("writer") && !writer) {
          writer = credit.name;
        }
        if (role.includes("cover") && !coverArtist) {
          coverArtist = credit.name;
        }
        if ((role.includes("artist") || role.includes("pencil")) && !interiorArtist) {
          interiorArtist = credit.name;
        }
      }
    }

    // Extract year from cover_date
    let releaseYear: string | null = null;
    if (issue.cover_date) {
      releaseYear = issue.cover_date.split("-")[0];
    }

    const comicDetails = {
      title: issue.volume?.name || null,
      issueNumber: issue.issue_number || null,
      publisher: issue.volume?.publisher?.name || null,
      releaseYear,
      writer,
      coverArtist,
      interiorArtist,
      variant: null,
      confidence: "high" as const,
      isSlabbed: false,
      gradingCompany: null,
      grade: null,
      isSignatureSeries: false,
      signedBy: null,
      priceData: null,
      coverImageUrl: issue.image?.medium_url || issue.image?.original_url || null,
    };

    return NextResponse.json(comicDetails);
  } catch (error) {
    console.error("Error in barcode lookup:", error);
    return NextResponse.json(
      { error: "Something went wrong while looking up this barcode. Please try again or scan the cover instead." },
      { status: 500 }
    );
  }
}
