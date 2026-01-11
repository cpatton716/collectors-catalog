import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/auctionDb";
import Stripe from "stripe";

// Initialize Stripe (conditionally)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      console.log("Stripe not configured, skipping webhook");
      return NextResponse.json({ received: true });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSuccessfulPayment(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session expired:", session.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const { auctionId, sellerId, buyerId } = session.metadata || {};

  if (!auctionId || !sellerId || !buyerId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update auction payment status
  const { error: updateError } = await supabase
    .from("auctions")
    .update({
      payment_status: "paid",
      status: "sold",
    })
    .eq("id", auctionId);

  if (updateError) {
    console.error("Error updating auction:", updateError);
    return;
  }

  // Notify seller
  await createNotification(sellerId, "payment_received", auctionId);

  // Request rating from buyer (after a delay in production you'd use a scheduled job)
  await createNotification(buyerId, "rating_request", auctionId);

  console.log(`Payment completed for auction ${auctionId}`);
}
