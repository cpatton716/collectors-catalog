import { NextRequest, NextResponse } from "next/server";

import { getAdminProfile, getProfileById, logAdminAction, resetUserTrial } from "@/lib/adminAuth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check admin access
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify user exists
    const profile = await getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Reset the trial
    await resetUserTrial(id);

    // Log the action
    await logAdminAction(adminProfile.id, "reset_trial", id, {
      previous_trial_started: profile.trial_started_at,
      previous_trial_ends: profile.trial_ends_at,
    });

    return NextResponse.json({
      success: true,
      message: "Trial reset successfully",
    });
  } catch (error) {
    console.error("Error resetting trial:", error);
    return NextResponse.json({ error: "Failed to reset trial" }, { status: 500 });
  }
}
