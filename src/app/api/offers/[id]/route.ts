import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import { respondToOffer, respondToCounterOffer } from "@/lib/auctionDb";
import { MIN_FIXED_PRICE } from "@/types/auction";

// PATCH - Seller responds to an offer (accept, reject, or counter)
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

    const { id: offerId } = await params;
    const body = await request.json();
    const { action, counterAmount } = body;

    // Validate action
    if (!["accept", "reject", "counter"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be accept, reject, or counter" },
        { status: 400 }
      );
    }

    // Validate counter amount if countering
    if (action === "counter") {
      if (typeof counterAmount !== "number" || counterAmount < MIN_FIXED_PRICE) {
        return NextResponse.json(
          { error: `Counter amount must be at least $${MIN_FIXED_PRICE}` },
          { status: 400 }
        );
      }
    }

    // Seller responds to offer
    const result = await respondToOffer(profile.id, {
      offerId,
      action,
      counterAmount: action === "counter" ? counterAmount : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ offer: result.offer });
  } catch (error) {
    console.error("Error responding to offer:", error);
    return NextResponse.json(
      { error: "Failed to respond to offer" },
      { status: 500 }
    );
  }
}

// POST - Buyer responds to a counter-offer (accept or reject only)
export async function POST(
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

    const { id: offerId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action - buyer can only accept or reject counter-offers
    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be accept or reject" },
        { status: 400 }
      );
    }

    const result = await respondToCounterOffer(profile.id, offerId, action);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error responding to counter-offer:", error);
    return NextResponse.json(
      { error: "Failed to respond to counter-offer" },
      { status: 500 }
    );
  }
}
