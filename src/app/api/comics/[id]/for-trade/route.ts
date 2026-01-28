import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// PATCH - Toggle for_trade status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { forTrade } = await request.json();

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify comic belongs to user
    const { data: comic, error: fetchError } = await supabase
      .from("comics")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !comic) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    if (comic.user_id !== profile.id) {
      return NextResponse.json({ error: "Not your comic" }, { status: 403 });
    }

    // Update for_trade status
    const { error: updateError } = await supabase
      .from("comics")
      .update({ for_trade: forTrade })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, forTrade });
  } catch (error) {
    console.error("Error updating for_trade:", error);
    return NextResponse.json(
      { error: "Failed to update trade status" },
      { status: 500 }
    );
  }
}
