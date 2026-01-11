import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import { placeBid } from "@/lib/auctionDb";
import { rateLimiters, checkRateLimit } from "@/lib/rateLimit";

// POST - Place a bid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check - prevent bid flooding/sniping bots
    const { success: rateLimitSuccess, response: rateLimitResponse } = await checkRateLimit(
      rateLimiters.bidding,
      userId
    );
    if (!rateLimitSuccess) return rateLimitResponse;

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id: auctionId } = await params;
    const body = await request.json();
    const { maxBid } = body;

    // Validation
    if (typeof maxBid !== "number" || maxBid < 0.99) {
      return NextResponse.json(
        { error: "Invalid bid amount" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxBid) && maxBid !== 0.99) {
      return NextResponse.json(
        { error: "Bids must be whole dollar amounts" },
        { status: 400 }
      );
    }

    const result = await placeBid(auctionId, profile.id, maxBid);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error placing bid:", error);
    return NextResponse.json(
      { error: "Failed to place bid" },
      { status: 500 }
    );
  }
}
