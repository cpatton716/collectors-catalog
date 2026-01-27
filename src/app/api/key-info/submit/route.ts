import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getUserSubmissions, submitKeyInfo } from "@/lib/keyComicsDb";

// POST - Submit a new key info suggestion
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, issueNumber, publisher, releaseYear, suggestedKeyInfo, sourceUrl, notes } = body;

    // Validate required fields
    if (!title || !issueNumber || !suggestedKeyInfo || !Array.isArray(suggestedKeyInfo)) {
      return NextResponse.json(
        { error: "Missing required fields: title, issueNumber, suggestedKeyInfo" },
        { status: 400 }
      );
    }

    if (suggestedKeyInfo.length === 0) {
      return NextResponse.json(
        { error: "At least one key info entry is required" },
        { status: 400 }
      );
    }

    // Validate key info entries
    for (const info of suggestedKeyInfo) {
      if (typeof info !== "string" || info.trim().length === 0) {
        return NextResponse.json(
          { error: "Key info entries must be non-empty strings" },
          { status: 400 }
        );
      }
      if (info.length > 200) {
        return NextResponse.json(
          { error: "Key info entries must be 200 characters or less" },
          { status: 400 }
        );
      }
    }

    // Submit the suggestion
    const result = await submitKeyInfo(userId, {
      title: title.trim(),
      issueNumber: issueNumber.trim(),
      publisher: publisher?.trim(),
      releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
      suggestedKeyInfo: suggestedKeyInfo.map((s: string) => s.trim()),
      sourceUrl: sourceUrl?.trim(),
      notes: notes?.trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      submissionId: result.id,
      message: "Your suggestion has been submitted for review. Thank you!",
    });
  } catch (error) {
    console.error("Error submitting key info:", error);
    return NextResponse.json({ error: "Failed to submit key info suggestion" }, { status: 500 });
  }
}

// GET - Get user's own submissions
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getUserSubmissions(userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ submissions: result.submissions });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
