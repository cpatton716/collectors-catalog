import { NextRequest, NextResponse } from "next/server";
import { resetAllMonthlyScans } from "@/lib/subscription";

/**
 * Cron job to reset monthly scan counts for Free tier users
 * Should be configured to run on the 1st of each month
 *
 * Netlify scheduled function configuration (netlify.toml):
 * [functions."api/cron/reset-scans"]
 * schedule = "0 0 1 * *"
 *
 * Or configure in Netlify dashboard: Site > Scheduled Functions
 */

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");

  // Allow if:
  // 1. CRON_SECRET is set and matches, OR
  // 2. Running in development (no secret required)
  const isDev = process.env.NODE_ENV === "development";
  const isAuthorized = !CRON_SECRET || authHeader === `Bearer ${CRON_SECRET}`;

  if (!isDev && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetAllMonthlyScans();

    console.log(`[cron/reset-scans] Reset scans for ${result.updated} users`);

    return NextResponse.json({
      success: true,
      message: `Reset monthly scan counts for ${result.updated} users`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/reset-scans] Error:", error);
    return NextResponse.json(
      { error: "Failed to reset scan counts" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
