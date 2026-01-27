import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { purchaseFixedPriceListing } from "@/lib/auctionDb";
import { getProfileByClerkId } from "@/lib/db";

// POST - Purchase a fixed-price listing
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id: listingId } = await params;

    const result = await purchaseFixedPriceListing(listingId, profile.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error purchasing listing:", error);
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 });
  }
}
