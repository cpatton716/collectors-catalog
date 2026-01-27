import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getSellerProfile, getSellerRatings, submitSellerRating } from "@/lib/auctionDb";
import { getProfileByClerkId } from "@/lib/db";

import { RatingType } from "@/types/auction";

// GET - Get seller ratings
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sellerId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit")) || 20;

    const [profile, ratings] = await Promise.all([
      getSellerProfile(sellerId),
      getSellerRatings(sellerId, limit),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({
      seller: profile,
      ratings,
    });
  } catch (error) {
    console.error("Error fetching seller ratings:", error);
    return NextResponse.json({ error: "Failed to fetch seller ratings" }, { status: 500 });
  }
}

// POST - Submit seller rating
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

    const { id: sellerId } = await params;
    const body = await request.json();
    const { auctionId, ratingType, comment } = body;

    // Validation
    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID is required" }, { status: 400 });
    }

    if (!ratingType || !["positive", "negative"].includes(ratingType)) {
      return NextResponse.json(
        { error: "Rating type must be 'positive' or 'negative'" },
        { status: 400 }
      );
    }

    if (comment && comment.length > 500) {
      return NextResponse.json(
        { error: "Comment must be 500 characters or less" },
        { status: 400 }
      );
    }

    const result = await submitSellerRating(profile.id, {
      sellerId,
      auctionId,
      ratingType: ratingType as RatingType,
      comment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
