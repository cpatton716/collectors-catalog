import { NextRequest, NextResponse } from "next/server";
import { processEndedAuctions } from "@/lib/auctionDb";

// POST - Process ended auctions (called by Vercel cron)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processEndedAuctions();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error processing auctions:", error);
    return NextResponse.json(
      { error: "Failed to process auctions" },
      { status: 500 }
    );
  }
}

// GET - Allow manual triggering for testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const result = await processEndedAuctions();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error processing auctions:", error);
    return NextResponse.json(
      { error: "Failed to process auctions" },
      { status: 500 }
    );
  }
}
