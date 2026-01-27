import { NextRequest, NextResponse } from "next/server";

import { getBidHistory } from "@/lib/auctionDb";

// GET - Get bid history for an auction (anonymized)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await params;

    const bids = await getBidHistory(auctionId);

    return NextResponse.json({ bids });
  } catch (error) {
    console.error("Error fetching bid history:", error);
    return NextResponse.json({ error: "Failed to fetch bid history" }, { status: 500 });
  }
}
