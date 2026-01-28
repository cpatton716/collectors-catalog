import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfileByClerkId } from "@/lib/db";
import { getSellerProfile } from "@/lib/auctionDb";
import { UserBlock } from "@/types/messaging";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(clerkId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: blocks, error } = await supabaseAdmin
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch blocked user profiles
    const blocksWithProfiles: UserBlock[] = await Promise.all(
      (blocks || []).map(async (block) => {
        const blockedUser = await getSellerProfile(block.blocked_id);
        return {
          id: block.id,
          blockerId: block.blocker_id,
          blockedId: block.blocked_id,
          createdAt: block.created_at,
          blockedUser: blockedUser || undefined,
        };
      })
    );

    return NextResponse.json({ blocks: blocksWithProfiles });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
