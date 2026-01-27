import { NextRequest, NextResponse } from "next/server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend Audience ID - create one in Resend dashboard and add here
const WAITLIST_AUDIENCE_ID = process.env.RESEND_WAITLIST_AUDIENCE_ID;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // If no API key or audience ID, return success silently (for testing)
    if (!process.env.RESEND_API_KEY || !WAITLIST_AUDIENCE_ID) {
      return NextResponse.json({ success: true, message: "Added to waitlist" });
    }

    // Add contact to Resend audience
    const { data, error } = await resend.contacts.create({
      email,
      audienceId: WAITLIST_AUDIENCE_ID,
      unsubscribed: false,
    });

    if (error) {
      // If contact already exists, that's okay
      if (error.message?.includes("already exists")) {
        return NextResponse.json({ success: true, message: "Already on waitlist" });
      }

      // Log detailed error info for debugging
      console.error(`[Waitlist] Failed to add ${email}:`, {
        errorName: error.name,
        errorMessage: error.message,
        audienceId: WAITLIST_AUDIENCE_ID,
        hasApiKey: !!process.env.RESEND_API_KEY,
      });

      // Return more specific error messages based on error type
      if (error.message?.includes("Invalid API key") || error.message?.includes("Unauthorized")) {
        return NextResponse.json(
          { error: "Waitlist service is temporarily unavailable. Please try again later." },
          { status: 500 }
        );
      }

      if (error.message?.includes("not found") || error.message?.includes("audience")) {
        return NextResponse.json(
          { error: "Waitlist configuration error. Please contact support." },
          { status: 500 }
        );
      }

      // Generic error for client (details already logged server-side)
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Added to waitlist" });
  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
