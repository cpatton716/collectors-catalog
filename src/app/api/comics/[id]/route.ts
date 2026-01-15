import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// DELETE - Remove comic from user's collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;

    // Delete the comic, ensuring it belongs to the user
    const { error } = await supabase
      .from("comics")
      .delete()
      .eq("id", id)
      .eq("profile_id", profile.id);

    if (error) {
      console.error("Error deleting comic:", error);
      return NextResponse.json(
        { error: "Failed to delete comic" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comic:", error);
    return NextResponse.json(
      { error: "Failed to delete comic" },
      { status: 500 }
    );
  }
}
