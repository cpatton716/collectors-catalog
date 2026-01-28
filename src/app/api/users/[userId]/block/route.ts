import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(clerkId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { userId: blockedId } = await params;

    if (profile.id === blockedId) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("user_blocks").insert({
      blocker_id: profile.id,
      blocked_id: blockedId,
    });

    if (error && error.code !== "23505") {
      // Ignore duplicate key error
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(clerkId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { userId: blockedId } = await params;

    await supabaseAdmin
      .from("user_blocks")
      .delete()
      .eq("blocker_id", profile.id)
      .eq("blocked_id", blockedId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unblock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
