import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST - Reset trial status for testing purposes
 *
 * This allows the same user to test the trial flow multiple times.
 * Clears trial_started_at and trial_ends_at, resetting trial availability.
 *
 * NOTE: This is for development/testing only. Consider removing or
 * protecting this endpoint before public launch.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Reset trial fields
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        trial_started_at: null,
        trial_ends_at: null,
        subscription_status: "active",
        // Keep subscription_tier as-is (stays "free" unless they paid)
      })
      .eq("id", profile.id);

    if (error) {
      console.error("Error resetting trial:", error);
      return NextResponse.json(
        { error: "Failed to reset trial" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trial has been reset. You can now start a new trial.",
    });
  } catch (error) {
    console.error("Error resetting trial:", error);
    return NextResponse.json(
      { error: "Failed to reset trial" },
      { status: 500 }
    );
  }
}
