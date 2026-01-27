import { NextRequest, NextResponse } from "next/server";

import {
  getAdminProfile,
  getProfileById,
  grantPremiumAccess,
  logAdminAction,
} from "@/lib/adminAuth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check admin access
    const adminProfile = await getAdminProfile();
    if (!adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Parse request body for optional days parameter
    let days = 30; // Default to 30 days
    try {
      const body = await request.json();
      if (body.days && typeof body.days === "number" && body.days > 0) {
        days = Math.min(body.days, 365); // Cap at 1 year
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Verify user exists
    const profile = await getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Grant premium access
    const { expiresAt } = await grantPremiumAccess(id, days);

    // Log the action
    await logAdminAction(adminProfile.id, "grant_premium", id, {
      days_granted: days,
      expires_at: expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: `Granted ${days} days of premium access`,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Error granting premium:", error);
    return NextResponse.json({ error: "Failed to grant premium access" }, { status: 500 });
  }
}
