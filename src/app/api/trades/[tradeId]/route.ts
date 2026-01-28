import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { confirmReceipt, getTradeById, markAsShipped, updateTradeStatus } from "@/lib/tradingDb";

// GET - Get trade details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tradeId } = await params;
    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const trade = await getTradeById(tradeId, profile.id);
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    console.error("Error fetching trade:", error);
    return NextResponse.json({ error: "Failed to fetch trade" }, { status: 500 });
  }
}

// PATCH - Update trade (status, shipping info)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tradeId } = await params;
    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, status, trackingCarrier, trackingNumber, cancelReason } = body;

    let trade;

    // Handle specific actions
    if (action === "ship") {
      trade = await markAsShipped(tradeId, profile.id, trackingCarrier, trackingNumber);
    } else if (action === "confirm_receipt") {
      trade = await confirmReceipt(tradeId, profile.id);
    } else if (status) {
      // Generic status update
      trade = await updateTradeStatus(tradeId, profile.id, {
        status,
        cancelReason,
      });
    } else {
      return NextResponse.json({ error: "No action or status provided" }, { status: 400 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update trade";
    console.error("Error updating trade:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
