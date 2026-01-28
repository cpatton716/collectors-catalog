import { NextRequest, NextResponse } from "next/server";

import { getAdminProfile, logAdminAction } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_STATUSES = ["pending", "reviewed", "actioned", "dismissed"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("message_reports")
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminProfile.id,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(adminProfile.id, "update_report", reportId, {
      status,
      adminNotes,
    });

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
