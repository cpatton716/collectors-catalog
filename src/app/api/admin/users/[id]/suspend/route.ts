import { NextRequest, NextResponse } from "next/server";

import {
  getAdminProfile,
  getProfileById,
  logAdminAction,
  setUserSuspension,
} from "@/lib/adminAuth";
import { invalidateProfileCache } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check admin access
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Parse request body
    let suspend = true;
    let reason: string | undefined;
    try {
      const body = await request.json();
      if (typeof body.suspend === "boolean") {
        suspend = body.suspend;
      }
      if (body.reason && typeof body.reason === "string") {
        reason = body.reason.slice(0, 500); // Limit reason length
      }
    } catch {
      // No body or invalid JSON, default to suspend
    }

    // Verify user exists
    const profile = await getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-suspension
    if (id === adminProfile.id) {
      return NextResponse.json({ error: "Cannot suspend your own account" }, { status: 400 });
    }

    // Update suspension status
    await setUserSuspension(id, suspend, reason);

    // Invalidate profile cache so suspension takes effect immediately
    await invalidateProfileCache(profile.clerk_user_id);

    // Log the action
    await logAdminAction(
      adminProfile.id,
      suspend ? "suspend" : "unsuspend",
      id,
      suspend ? { reason } : { previous_reason: profile.suspended_reason }
    );

    return NextResponse.json({
      success: true,
      message: suspend ? "User suspended" : "User unsuspended",
      is_suspended: suspend,
    });
  } catch (error) {
    console.error("Error updating suspension:", error);
    return NextResponse.json({ error: "Failed to update suspension status" }, { status: 500 });
  }
}
