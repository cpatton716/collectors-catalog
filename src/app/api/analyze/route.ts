import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, mediaType } = await request.json();

    console.log("Received image request, mediaType:", mediaType);
    console.log("Image data length:", image?.length || 0);

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Check if image is too large (base64 adds ~33% overhead, so 20MB base64 ≈ 15MB image)
    if (image.length > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 10MB." },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
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
      throw new Error("No text response from Claude");
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
      throw new Error("Failed to parse comic details from response");
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
  "keyInfo": ["array of key facts about this issue - first appearances, deaths, team changes, cameos, significant events, etc."]
}

Important:
- Return ONLY the JSON object, no other text
- Use your knowledge of comic book history to provide accurate information
- If you're not confident about a specific field, use null
- For publisher, use the full official name
- For keyInfo, be THOROUGH and include ANY of these:
  * First appearances of ANY character (heroes, villains, supporting cast, alternate universe versions like Lady Deadpool, Spider-Gwen, Miles Morales, etc.)
  * First cameo vs first full appearances
  * Character deaths or resurrections
  * Team formations, departures, or arrivals
  * Origin stories, costume changes, codename changes
  * Major battles, crossover events, storyline beginnings/endings
  * Wedding/relationship milestones, first meetings between characters
  * Introduction of significant objects, weapons, or tech
  * Alternate universe or legacy character introductions
- IMPORTANT: Even minor character first appearances are valuable to collectors. When in doubt, INCLUDE the fact.
- Only return an empty array if you are CERTAIN this issue has NO notable events`,
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

      try {
        const keyInfoResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are a comic book expert and collector with encyclopedic knowledge of comic book history, first appearances, and significant issues. Your goal is to help collectors identify ALL notable facts about their comics.

I need the key information for this comic:
- Title: ${comicDetails.title}
- Issue Number: ${comicDetails.issueNumber}
- Publisher: ${comicDetails.publisher || "Unknown"}
- Year: ${comicDetails.releaseYear || "Unknown"}

Please provide any significant facts about this specific issue as a JSON object:
{
  "keyInfo": ["array of key facts about this issue"]
}

Be THOROUGH and include ANY of these facts:
- First appearances of ANY character (heroes, villains, supporting cast, love interests)
- Alternate universe character debuts (Lady Deadpool, Spider-Gwen, Miles Morales, Old Man Logan, etc.)
- First cameo appearances (specify "cameo" if not a full appearance)
- First full appearances (if different from cameo issue)
- Character deaths (even temporary/later-reversed ones)
- Character resurrections or returns
- Team formations, member departures, or new member arrivals
- Origin stories or origin retellings
- New costume debuts or significant costume changes
- Codename changes or new identity reveals
- Major battles or significant confrontations
- Crossover event tie-ins or beginnings
- Wedding/engagement/relationship milestones
- First meetings between significant characters
- Significant storyline beginnings or endings (name the storyline)
- Introduction of significant objects (Infinity Gauntlet, Mjolnir variants, etc.)
- Legacy character introductions (new person taking up a hero/villain mantle)
- Significant retcons or reveals

IMPORTANT:
- Collectors value even minor character first appearances - include them!
- When in doubt, INCLUDE the fact rather than omit it
- Be specific: "First appearance of Lady Deadpool" not just "character introduction"

Return ONLY the JSON object, no other text.
Only return {"keyInfo": []} if you are CERTAIN this issue has absolutely no notable events.`,
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

    // Price/Value lookup
    if (comicDetails.title && comicDetails.issueNumber) {
      console.log("Performing price lookup...");

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
          console.log("Price lookup response:", priceJson);

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
          console.log("Parsed price info:", priceInfo);

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
            disclaimer = "Value is the average of the 3 most recent sales within the last 6 months.";
          } else if (recentSales.length > 0) {
            // Average of available recent sales
            estimatedValue = recentSales.reduce((sum: number, s: { price: number }) => sum + s.price, 0) / recentSales.length;
            isAveraged = recentSales.length > 1;
            disclaimer = recentSales.length > 1
              ? `Value is the average of ${recentSales.length} sales within the last 6 months.`
              : "Value based on the most recent sale within the last 6 months.";
          } else if (processedSales.length > 0) {
            // Only older sales available - use most recent only
            estimatedValue = sortedSales[0].price;
            isAveraged = false;
            disclaimer = "Value based on most recent sale (older than 6 months - recent data unavailable).";
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
          };

          console.log("Final price data:", comicDetails.priceData);
        }
      } catch (priceError) {
        console.error("Price lookup failed:", priceError);
        comicDetails.priceData = null;
      }
    } else {
      comicDetails.priceData = null;
    }

    return NextResponse.json(comicDetails);
  } catch (error) {
    console.error("Error analyzing comic:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze comic cover" },
      { status: 500 }
    );
  }
}
