import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import { getAuction } from "@/lib/auctionDb";
import Stripe from "stripe";

// Initialize Stripe (conditionally - only if key exists)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// POST - Create checkout session for auction payment
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { auctionId } = body;

    if (!auctionId) {
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    // Get auction details
    const auction = await getAuction(auctionId);
    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Verify user is the winner
    if (auction.winnerId !== profile.id) {
      return NextResponse.json(
        { error: "You are not the winner of this auction" },
        { status: 403 }
      );
    }

    // Check payment status
    if (auction.paymentStatus !== "pending") {
      return NextResponse.json(
        { error: "This auction is not awaiting payment" },
        { status: 400 }
      );
    }

    // Calculate total (winning bid + shipping)
    const total = (auction.winningBid || 0) + (auction.shippingCost || 0);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${auction.comic?.comic?.title || "Comic"} #${auction.comic?.comic?.issueNumber || "?"}`,
              description: `Auction winner - includes shipping`,
              images: auction.comic?.coverImageUrl
                ? [auction.comic.coverImageUrl]
                : undefined,
            },
            unit_amount: Math.round(total * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-auctions?payment=success&auction=${auctionId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-auctions?payment=cancelled&auction=${auctionId}`,
      metadata: {
        auctionId,
        buyerId: profile.id,
        sellerId: auction.sellerId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
