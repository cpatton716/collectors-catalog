import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db";
import {
  createAuction,
  getActiveAuctions,
} from "@/lib/auctionDb";
import { AuctionFilters, AuctionSortBy, MIN_STARTING_PRICE } from "@/types/auction";

// GET - List active auctions with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: AuctionFilters = {};
    if (searchParams.get("sellerId")) {
      filters.sellerId = searchParams.get("sellerId")!;
    }
    if (searchParams.get("minPrice")) {
      filters.minPrice = Number(searchParams.get("minPrice"));
    }
    if (searchParams.get("maxPrice")) {
      filters.maxPrice = Number(searchParams.get("maxPrice"));
    }
    if (searchParams.get("hasBuyItNow") === "true") {
      filters.hasBuyItNow = true;
    }
    if (searchParams.get("endingSoon") === "true") {
      filters.endingSoon = true;
    }

    // Parse sorting
    const sortBy = (searchParams.get("sortBy") || "ending_soonest") as AuctionSortBy;

    // Parse pagination
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    const { auctions, total } = await getActiveAuctions(filters, sortBy, limit, offset);

    return NextResponse.json({
      auctions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json(
      { error: "Failed to fetch auctions" },
      { status: 500 }
    );
  }
}

// POST - Create a new auction
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      comicId,
      startingPrice,
      buyItNowPrice,
      durationDays,
      shippingCost,
      detailImages,
      description,
    } = body;

    // Validation
    if (!comicId) {
      return NextResponse.json({ error: "Comic ID is required" }, { status: 400 });
    }

    if (typeof startingPrice !== "number" || startingPrice < MIN_STARTING_PRICE) {
      return NextResponse.json(
        { error: `Starting price must be at least $${MIN_STARTING_PRICE}` },
        { status: 400 }
      );
    }

    if (!Number.isInteger(startingPrice) && startingPrice !== 0.99) {
      return NextResponse.json(
        { error: "Starting price must be a whole dollar amount (except $0.99)" },
        { status: 400 }
      );
    }

    if (buyItNowPrice !== undefined && buyItNowPrice !== null) {
      if (typeof buyItNowPrice !== "number" || buyItNowPrice <= startingPrice) {
        return NextResponse.json(
          { error: "Buy It Now price must be higher than starting price" },
          { status: 400 }
        );
      }
    }

    if (typeof durationDays !== "number" || durationDays < 1 || durationDays > 14) {
      return NextResponse.json(
        { error: "Duration must be between 1 and 14 days" },
        { status: 400 }
      );
    }

    if (typeof shippingCost !== "number" || shippingCost < 0) {
      return NextResponse.json(
        { error: "Shipping cost must be a positive number" },
        { status: 400 }
      );
    }

    if (detailImages && (!Array.isArray(detailImages) || detailImages.length > 4)) {
      return NextResponse.json(
        { error: "Maximum 4 detail images allowed" },
        { status: 400 }
      );
    }

    const auction = await createAuction(profile.id, {
      comicId,
      startingPrice,
      buyItNowPrice: buyItNowPrice || null,
      durationDays,
      shippingCost,
      detailImages: detailImages || [],
      description: description || "",
    });

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) {
    console.error("Error creating auction:", error);
    return NextResponse.json(
      { error: "Failed to create auction" },
      { status: 500 }
    );
  }
}
