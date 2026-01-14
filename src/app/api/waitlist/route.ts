import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend Audience ID - create one in Resend dashboard and add here
const WAITLIST_AUDIENCE_ID = process.env.RESEND_WAITLIST_AUDIENCE_ID;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // If no API key or audience ID, log and return success (for testing)
    if (!process.env.RESEND_API_KEY || !WAITLIST_AUDIENCE_ID) {
      console.log(`[Waitlist] Would add email: ${email} (Resend not configured)`);
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
        console.log(`[Waitlist] Email already on list: ${email}`);
        return NextResponse.json({ success: true, message: "Already on waitlist" });
      }

      console.error(`[Waitlist] Failed to add ${email}:`, error);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[Waitlist] Added to waitlist: ${email}`, data);
    return NextResponse.json({ success: true, message: "Added to waitlist" });

  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
