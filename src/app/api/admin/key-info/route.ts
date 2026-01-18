import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPendingSubmissions, getSubmissionCounts, getKeyComicsCountFromDb } from "@/lib/keyComicsDb";

// Admin user IDs (your Clerk user ID)
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

// GET - Get pending submissions and stats
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch data in parallel
    const [pendingResult, counts, keyComicsCount] = await Promise.all([
      getPendingSubmissions(50),
      getSubmissionCounts(),
      getKeyComicsCountFromDb(),
    ]);

    if (pendingResult.error) {
      return NextResponse.json({ error: pendingResult.error }, { status: 500 });
    }

    return NextResponse.json({
      submissions: pendingResult.submissions,
      counts,
      keyComicsCount,
    });
  } catch (error) {
    console.error("Error fetching admin key info:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
