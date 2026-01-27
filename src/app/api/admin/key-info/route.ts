import { NextResponse } from "next/server";

import { getAdminProfile } from "@/lib/adminAuth";
import {
  getKeyComicsCountFromDb,
  getPendingSubmissions,
  getSubmissionCounts,
} from "@/lib/keyComicsDb";

// GET - Get pending submissions and stats
export async function GET() {
  try {
    // Check admin access using centralized helper
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
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
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
