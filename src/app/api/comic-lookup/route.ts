import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY;
const COMIC_VINE_BASE_URL = "https://comicvine.gamespot.com/api";

// Cache for comic lookups to reduce API calls
const lookupCache = new Map<string, { data: ComicLookupResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface ComicLookupResult {
  publisher: string | null;
  releaseYear: string | null;
  writer: string | null;
  coverArtist: string | null;
  interiorArtist: string | null;
  keyInfo: string[];
}

interface ComicVineCharacter {
  id: number;
  name: string;
  first_appeared_in_issue?: {
    id: number;
    name: string;
    issue_number: string;
  };
}

// Search Comic Vine for an issue and get first appearances
async function getComicVineFirstAppearances(title: string, issueNumber: string): Promise<string[]> {
  if (!COMIC_VINE_API_KEY) {
    console.log("Comic Vine API key not configured, skipping first appearance lookup");
    return [];
  }

  const firstAppearances: string[] = [];

  try {
    // Step 1: Search for the volume (series) by name
    const volumeSearchUrl = `${COMIC_VINE_BASE_URL}/volumes/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=name:${encodeURIComponent(title)}&field_list=id,name&limit=5`;

    const volumeResponse = await fetch(volumeSearchUrl, {
      headers: { "User-Agent": "ComicTracker/1.0" },
    });

    if (!volumeResponse.ok) {
      console.error("Comic Vine volume search failed:", volumeResponse.status);
      return [];
    }

    const volumeData = await volumeResponse.json();
    if (volumeData.error !== "OK" || !volumeData.results?.length) {
      console.log("No volumes found on Comic Vine for:", title);
      return [];
    }

    // Find the best matching volume
    const volume = volumeData.results.find(
      (v: { name: string }) => v.name.toLowerCase() === title.toLowerCase()
    ) || volumeData.results[0];

    console.log("Found Comic Vine volume:", volume.name, "ID:", volume.id);

    // Step 2: Search for the specific issue in this volume
    const issueSearchUrl = `${COMIC_VINE_BASE_URL}/issues/?api_key=${COMIC_VINE_API_KEY}&format=json&filter=volume:${volume.id},issue_number:${issueNumber}&field_list=id,name,issue_number,character_credits`;

    const issueResponse = await fetch(issueSearchUrl, {
      headers: { "User-Agent": "ComicTracker/1.0" },
    });

    if (!issueResponse.ok) {
      console.error("Comic Vine issue search failed:", issueResponse.status);
      return [];
    }

    const issueData = await issueResponse.json();
    if (issueData.error !== "OK" || !issueData.results?.length) {
      console.log("No issue found on Comic Vine for:", title, "#" + issueNumber);
      return [];
    }

    const issue = issueData.results[0];
    console.log("Found Comic Vine issue:", issue.id);

    // Step 3: Get full issue details with character credits
    const issueDetailUrl = `${COMIC_VINE_BASE_URL}/issue/4000-${issue.id}/?api_key=${COMIC_VINE_API_KEY}&format=json&field_list=id,character_credits`;

    const issueDetailResponse = await fetch(issueDetailUrl, {
      headers: { "User-Agent": "ComicTracker/1.0" },
    });

    if (!issueDetailResponse.ok) {
      console.error("Comic Vine issue detail fetch failed:", issueDetailResponse.status);
      return [];
    }

    const issueDetailData = await issueDetailResponse.json();
    const characterCredits = issueDetailData.results?.character_credits || [];

    if (characterCredits.length === 0) {
      console.log("No character credits found for this issue");
      return [];
    }

    console.log(`Found ${characterCredits.length} characters in issue, checking first appearances...`);

    // Step 4: Check each character to see if this is their first appearance
    // Limit to first 20 characters to avoid too many API calls
    const charactersToCheck = characterCredits.slice(0, 20);

    for (const charCredit of charactersToCheck) {
      try {
        const charUrl = `${COMIC_VINE_BASE_URL}/character/4005-${charCredit.id}/?api_key=${COMIC_VINE_API_KEY}&format=json&field_list=id,name,first_appeared_in_issue`;

        const charResponse = await fetch(charUrl, {
          headers: { "User-Agent": "ComicTracker/1.0" },
        });

        if (charResponse.ok) {
          const charData = await charResponse.json();
          const character: ComicVineCharacter = charData.results;

          if (character.first_appeared_in_issue?.id === issue.id) {
            console.log(`First appearance found: ${character.name}`);
            firstAppearances.push(`First appearance of ${character.name}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (charError) {
        console.error("Error checking character:", charCredit.name, charError);
      }
    }

    console.log(`Comic Vine found ${firstAppearances.length} first appearances`);
    return firstAppearances;
  } catch (error) {
    console.error("Error in Comic Vine first appearance lookup:", error);
    return [];
  }
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
6. Key Info (significant facts about this issue)

Return ONLY a JSON object with this format, no other text:
{
  "publisher": "Publisher Name",
  "releaseYear": "YYYY",
  "writer": "Writer Name",
  "coverArtist": "Artist Name",
  "interiorArtist": "Artist Name",
  "keyInfo": ["array of key facts about this issue"]
}

For keyInfo, be THOROUGH and include ANY significant facts such as:
- First appearances of ANY character (heroes, villains, supporting cast, alternate universe versions like Lady Deadpool, Spider-Gwen, Miles Morales, etc.)
- First cameo appearances (note if cameo vs full appearance)
- First full appearances (if different from cameo)
- Character deaths (even temporary ones)
- Character resurrections
- Team formations, departures, or arrivals
- Origin stories or origin retellings
- Costume changes or new costume debuts
- Codename changes or new identity reveals
- Major battles or significant fight scenes
- Crossover events or tie-ins
- Wedding/relationship milestones
- First meetings between characters
- Significant storyline beginnings or endings
- Introduction of significant objects (weapons, vehicles, tech)
- Alternate universe character introductions
- Legacy character introductions (new person taking up a mantle)

IMPORTANT: Research this specific issue thoroughly. Even minor character first appearances are valuable to collectors. When in doubt, INCLUDE the fact rather than omit it.

Use null for any field you're not confident about. Only return an empty array [] for keyInfo if you are certain this issue has NO notable events. Be thorough - collectors want complete information.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null, keyInfo: [] });
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
      // Ensure keyInfo is always an array
      if (!result.keyInfo || !Array.isArray(result.keyInfo)) {
        result.keyInfo = [];
      }
    } catch {
      console.error("Failed to parse comic lookup response");
      return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null, keyInfo: [] });
    }

    // If we have an issue number, also check Comic Vine for first appearances
    if (lookupType !== "publisher" && issueNumber) {
      try {
        console.log("Checking Comic Vine for first appearances...");
        const comicVineFirstAppearances = await getComicVineFirstAppearances(title, issueNumber);

        if (comicVineFirstAppearances.length > 0) {
          console.log(`Found ${comicVineFirstAppearances.length} first appearances from Comic Vine`);

          // Merge Comic Vine results with AI results, avoiding duplicates
          const existingKeyInfoLower = result.keyInfo.map(k => k.toLowerCase());
          for (const appearance of comicVineFirstAppearances) {
            // Check if this first appearance isn't already in the AI results
            const isNew = !existingKeyInfoLower.some(existing =>
              existing.includes(appearance.toLowerCase().replace("first appearance of ", ""))
            );
            if (isNew) {
              result.keyInfo.push(appearance);
            }
          }
        }
      } catch (comicVineError) {
        console.error("Comic Vine lookup failed, continuing with AI results only:", comicVineError);
      }
    }

    // Cache the result
    lookupCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in comic lookup:", error);
    return NextResponse.json({ publisher: null, releaseYear: null, writer: null, coverArtist: null, interiorArtist: null, keyInfo: [] });
  }
}
