import { NextRequest, NextResponse } from "next/server";
import {
  getAdminProfile,
  logAdminAction,
  searchUsersByEmail,
} from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email || email.length < 2) {
      return NextResponse.json(
        { error: "Email search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Search users
    const users = await searchUsersByEmail(email);

    // Log the search action
    await logAdminAction(adminProfile.id, "search_users", undefined, {
      query: email,
      results_count: users.length,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
