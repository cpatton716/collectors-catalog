import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import {
  getAuction,
  updateAuction,
  cancelAuction,
} from "@/lib/auctionDb";

// GET - Get single auction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Optional: get user ID for watchlist/bid status
    let userId: string | undefined;
    try {
      const authResult = await auth();
      if (authResult.userId) {
        const profile = await getProfileByClerkId(authResult.userId);
        userId = profile?.id;
      }
    } catch {
      // Not logged in, continue without user context
    }

    const auction = await getAuction(id, userId);

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    return NextResponse.json({ auction });
  } catch (error) {
    console.error("Error fetching auction:", error);
    return NextResponse.json(
      { error: "Failed to fetch auction" },
      { status: 500 }
    );
  }
}

// PATCH - Update auction (seller only)
export async function PATCH(
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
    const body = await request.json();
    const { buyItNowPrice, description, detailImages } = body;

    // Validate detail images if provided
    if (detailImages !== undefined) {
      if (!Array.isArray(detailImages) || detailImages.length > 4) {
        return NextResponse.json(
          { error: "Maximum 4 detail images allowed" },
          { status: 400 }
        );
      }
    }

    await updateAuction(id, profile.id, {
      buyItNowPrice,
      description,
      detailImages,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating auction:", error);
    return NextResponse.json(
      { error: "Failed to update auction" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel auction (seller only, no bids)
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

    // Get reason from query params (optional)
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") as "changed_mind" | "sold_elsewhere" | "price_too_low" | "other" | null;

    const result = await cancelAuction(id, profile.id, reason || undefined);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling auction:", error);
    return NextResponse.json(
      { error: "Failed to cancel auction" },
      { status: 500 }
    );
  }
}
