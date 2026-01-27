import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { isUserSuspended } from "@/lib/adminAuth";
import { getProfileByClerkId } from "@/lib/db";
import { getSubscriptionStatus, hasUsedTrial, startTrial } from "@/lib/subscription";

/**
 * POST - Start a free 7-day trial directly (without Stripe)
 *
 * This allows users to test premium features before Stripe is configured.
 * The trial is tracked in the database and grants premium access for 7 days.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is suspended
    const suspensionStatus = await isUserSuspended(userId);
    if (suspensionStatus.suspended) {
      return NextResponse.json(
        {
          error: "account_suspended",
          message: "Your account has been suspended.",
          suspended: true,
        },
        { status: 403 }
      );
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user already has premium
    const status = await getSubscriptionStatus(profile.id);
    if (status?.tier === "premium") {
      return NextResponse.json(
        { error: "You already have a Premium subscription" },
        { status: 400 }
      );
    }

    // Check if already trialing
    if (status?.isTrialing) {
      return NextResponse.json(
        {
          error: "You already have an active trial",
          trialEndsAt: status.trialEndsAt,
          trialDaysRemaining: status.trialDaysRemaining,
        },
        { status: 400 }
      );
    }

    // Check if trial already used
    const trialUsed = await hasUsedTrial(profile.id);
    if (trialUsed) {
      return NextResponse.json({ error: "You have already used your free trial" }, { status: 400 });
    }

    // Start the trial
    const result = await startTrial(profile.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to start trial" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Your 7-day free trial has started!",
      trialEndsAt: result.trialEndsAt,
    });
  } catch (error) {
    console.error("Error starting trial:", error);
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
  }
}
