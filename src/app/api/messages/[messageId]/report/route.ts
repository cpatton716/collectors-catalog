import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import { ReportReason } from "@/types/messaging";

const VALID_REASONS: ReportReason[] = [
  "spam",
  "scam",
  "harassment",
  "inappropriate",
  "other",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params;
    const body = await request.json();
    const { reason, details } = body;

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid report reason" },
        { status: 400 }
      );
    }

    // Verify the message exists
    const { data: message, error: msgError } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id")
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Get the conversation and verify reporter is a participant
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("participant_1_id, participant_2_id")
      .eq("id", message.conversation_id)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if user is a participant in the conversation
    if (
      conv.participant_1_id !== profile.id &&
      conv.participant_2_id !== profile.id
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create the report
    const { error } = await supabaseAdmin.from("message_reports").insert({
      message_id: messageId,
      reporter_id: profile.id,
      reason,
      details: details || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already reported this message" },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
