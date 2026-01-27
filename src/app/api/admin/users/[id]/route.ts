import { NextRequest, NextResponse } from "next/server";

import { getAdminProfile, getProfileById, getUserScanCount, logAdminAction } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check admin access
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get user profile
    const profile = await getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get additional stats
    const scanCount = await getUserScanCount(id);

    // Get comic count
    const { count: comicCount } = await supabaseAdmin
      .from("comics")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id);

    // Log the view action
    await logAdminAction(adminProfile.id, "view_profile", id);

    // Determine trial status
    let trialStatus: "available" | "active" | "expired" = "available";
    if (profile.trial_started_at) {
      if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
        trialStatus = "active";
      } else {
        trialStatus = "expired";
      }
    }

    return NextResponse.json({
      user: {
        ...profile,
        scans_this_month: scanCount,
        comic_count: comicCount || 0,
        trial_status: trialStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
