import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import Stripe from "stripe";

import { getProfileByClerkId } from "@/lib/db";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

/**
 * POST - Create Stripe billing portal session
 * Allows users to manage their subscription, update payment method, cancel, etc.
 */
export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Payment system not configured" }, { status: 503 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has a Stripe customer ID
    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to Premium first." },
        { status: 400 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
