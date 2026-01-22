import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend Audience ID for bonus scan recipients
// Create a separate audience in Resend dashboard for this
const BONUS_SCANS_AUDIENCE_ID = process.env.RESEND_BONUS_SCANS_AUDIENCE_ID;

/**
 * POST - Capture email in exchange for bonus scans
 *
 * Adds email to Resend audience and returns success if new.
 * Returns 409 if email already used (prevents abuse).
 */
export async function POST(request: NextRequest) {
  try {
    const { email, source, scansUsed } = await request.json();

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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // If no API key or audience ID, return success silently (for testing)
    if (!process.env.RESEND_API_KEY || !BONUS_SCANS_AUDIENCE_ID) {
      return NextResponse.json({
        success: true,
        message: "Bonus scans unlocked",
        bonusScans: 5,
      });
    }


    // Try to add contact to Resend audience
    // If contact already exists, they've already redeemed bonus scans
    const { data, error } = await resend.contacts.create({
      email: normalizedEmail,
      audienceId: BONUS_SCANS_AUDIENCE_ID,
      unsubscribed: false,
      firstName: "", // Will be empty for now
      lastName: "",
    });

    if (error) {
      // If contact already exists, they've already used bonus scans
      if (error.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "This email has already been used for bonus scans" },
          { status: 409 }
        );
      }

      console.error(`[EmailCapture] Failed to add ${normalizedEmail}:`, {
        errorName: error.name,
        errorMessage: error.message,
      });

      return NextResponse.json(
        { error: "Failed to process request. Please try again." },
        { status: 500 }
      );
    }


    // Optionally send a welcome email
    try {
      await resend.emails.send({
        from: "Collectors Chest <noreply@collectors-chest.com>",
        to: normalizedEmail,
        subject: "You unlocked 5 bonus scans!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d97706;">You got 5 bonus scans!</h1>
            <p>Thanks for trying Collectors Chest! You now have 5 more scans to explore your comic collection.</p>
            <p>Here's what you can do:</p>
            <ul>
              <li>Scan comic covers for instant AI recognition</li>
              <li>Get real-time eBay price estimates</li>
              <li>See key issue information and first appearances</li>
            </ul>
            <p>Want unlimited scans? <a href="https://collectors-chest.com/sign-up" style="color: #4f46e5;">Create a free account</a> to get 10 scans per month, plus cloud sync and more!</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">Happy collecting!<br>The Collectors Chest Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Don't fail the request if email sending fails
      console.error("[EmailCapture] Failed to send welcome email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Bonus scans unlocked",
      bonusScans: 5,
    });

  } catch (err) {
    console.error("[EmailCapture] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
