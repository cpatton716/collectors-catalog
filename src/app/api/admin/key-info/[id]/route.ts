import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { approveSubmission, rejectSubmission } from "@/lib/keyComicsDb";

// Admin user IDs (your Clerk user ID)
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

// POST - Approve or reject a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    let result;
    if (action === "approve") {
      result = await approveSubmission(id, userId);
    } else {
      result = await rejectSubmission(id, userId, reason);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? "Submission approved and added to key comics database"
        : "Submission rejected",
    });
  } catch (error) {
    console.error("Error processing submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
