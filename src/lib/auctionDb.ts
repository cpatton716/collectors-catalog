import { supabase } from "./supabase";
import { CollectionItem, PriceData, ConditionLabel } from "@/types/comic";
import {
  Auction,
  AuctionFilters,
  AuctionSortBy,
  Bid,
  BidHistoryItem,
  CreateAuctionInput,
  Notification,
  NotificationType,
  PlaceBidResult,
  SellerProfile,
  SellerRating,
  SubmitRatingInput,
  UpdateAuctionInput,
  WatchlistItem,
  calculateMinimumBid,
  calculateSellerReputation,
  getBidIncrement,
} from "@/types/auction";

// ============================================================================
// AUCTION CRUD
// ============================================================================

/**
 * Create a new auction
 */
export async function createAuction(
  sellerId: string,
  input: CreateAuctionInput
): Promise<Auction> {
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + input.durationDays);

  const { data, error } = await supabase
    .from("auctions")
    .insert({
      seller_id: sellerId,
      comic_id: input.comicId,
      starting_price: input.startingPrice,
      buy_it_now_price: input.buyItNowPrice || null,
      end_time: endTime.toISOString(),
      shipping_cost: input.shippingCost,
      detail_images: input.detailImages || [],
      description: input.description || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Set seller_since if first auction
  await supabase
    .from("profiles")
    .update({ seller_since: new Date().toISOString() })
    .eq("id", sellerId)
    .is("seller_since", null);

  return transformDbAuction(data);
}

/**
 * Get a single auction by ID
 */
export async function getAuction(
  auctionId: string,
  userId?: string
): Promise<Auction | null> {
  const { data, error } = await supabase
    .from("auctions")
    .select(
      `
      *,
      comics(*),
      profiles!auctions_seller_id_fkey(id, display_name, public_display_name, positive_ratings, negative_ratings, seller_since)
    `
    )
    .eq("id", auctionId)
    .single();

  if (error || !data) return null;

  const auction = transformDbAuction(data);

  // Check if user is watching
  if (userId) {
    const { data: watchData } = await supabase
      .from("auction_watchlist")
      .select("id")
      .eq("auction_id", auctionId)
      .eq("user_id", userId)
      .single();

    auction.isWatching = !!watchData;

    // Get user's current bid
    const { data: bidData } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId)
      .eq("bidder_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (bidData) {
      auction.userBid = transformDbBid(bidData);
    }
  }

  return auction;
}

/**
 * Get active auctions with filters and sorting
 */
export async function getActiveAuctions(
  filters: AuctionFilters = {},
  sortBy: AuctionSortBy = "ending_soonest",
  limit = 50,
  offset = 0
): Promise<{ auctions: Auction[]; total: number }> {
  let query = supabase
    .from("auctions")
    .select(
      `
      *,
      comics(*)
    `,
      { count: "exact" }
    )
    .eq("status", "active");

  // Apply filters
  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("current_bid", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("current_bid", filters.maxPrice);
  }
  if (filters.hasBuyItNow) {
    query = query.not("buy_it_now_price", "is", null);
  }
  if (filters.endingSoon) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    query = query.lte("end_time", tomorrow.toISOString());
  }

  // Apply sorting
  switch (sortBy) {
    case "ending_soonest":
      query = query.order("end_time", { ascending: true });
      break;
    case "ending_latest":
      query = query.order("end_time", { ascending: false });
      break;
    case "price_low":
      query = query.order("current_bid", { ascending: true, nullsFirst: true });
      break;
    case "price_high":
      query = query.order("current_bid", { ascending: false });
      break;
    case "most_bids":
      query = query.order("bid_count", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    auctions: (data || []).map(transformDbAuction),
    total: count || 0,
  };
}

/**
 * Get auctions by seller
 */
export async function getSellerAuctions(
  sellerId: string,
  status?: string
): Promise<Auction[]> {
  let query = supabase
    .from("auctions")
    .select(
      `
      *,
      comics(*)
    `
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(transformDbAuction);
}

/**
 * Get auctions won by user
 */
export async function getWonAuctions(userId: string): Promise<Auction[]> {
  const { data, error } = await supabase
    .from("auctions")
    .select(
      `
      *,
      comics(*)
    `
    )
    .eq("winner_id", userId)
    .in("status", ["ended", "sold"])
    .order("end_time", { ascending: false });

  if (error) throw error;

  return (data || []).map(transformDbAuction);
}

/**
 * Update auction
 */
export async function updateAuction(
  auctionId: string,
  sellerId: string,
  updates: UpdateAuctionInput
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.buyItNowPrice !== undefined) {
    dbUpdates.buy_it_now_price = updates.buyItNowPrice;
  }
  if (updates.description !== undefined) {
    dbUpdates.description = updates.description;
  }
  if (updates.detailImages !== undefined) {
    dbUpdates.detail_images = updates.detailImages;
  }

  const { error } = await supabase
    .from("auctions")
    .update(dbUpdates)
    .eq("id", auctionId)
    .eq("seller_id", sellerId);

  if (error) throw error;
}

/**
 * Cancel auction (only if no bids)
 */
export async function cancelAuction(
  auctionId: string,
  sellerId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for existing bids
  const { data: auction } = await supabase
    .from("auctions")
    .select("bid_count")
    .eq("id", auctionId)
    .eq("seller_id", sellerId)
    .single();

  if (!auction) {
    return { success: false, error: "Auction not found" };
  }

  if (auction.bid_count > 0) {
    return { success: false, error: "Cannot cancel auction with bids" };
  }

  const { error } = await supabase
    .from("auctions")
    .update({ status: "cancelled" })
    .eq("id", auctionId)
    .eq("seller_id", sellerId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// BIDDING
// ============================================================================

/**
 * Place a bid with proxy bidding logic
 */
export async function placeBid(
  auctionId: string,
  bidderId: string,
  maxBid: number
): Promise<PlaceBidResult> {
  // Get auction details
  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auctionId)
    .single();

  if (auctionError || !auction) {
    return { success: false, message: "Auction not found" };
  }

  if (auction.status !== "active") {
    return { success: false, message: "Auction has ended" };
  }

  if (new Date(auction.end_time) < new Date()) {
    return { success: false, message: "Auction has ended" };
  }

  if (auction.seller_id === bidderId) {
    return { success: false, message: "You cannot bid on your own auction" };
  }

  // Validate bid amount
  const currentBid = auction.current_bid;
  const minimumBid = calculateMinimumBid(currentBid, auction.starting_price);

  if (maxBid < minimumBid) {
    return {
      success: false,
      message: `Minimum bid is $${minimumBid.toFixed(2)}`,
    };
  }

  if (!Number.isInteger(maxBid)) {
    return { success: false, message: "Bids must be whole dollar amounts" };
  }

  // Get current winning bid
  const { data: currentWinningBid } = await supabase
    .from("bids")
    .select("*")
    .eq("auction_id", auctionId)
    .eq("is_winning", true)
    .single();

  // Get bidder's existing bids to determine bidder number
  const { data: existingBids } = await supabase
    .from("bids")
    .select("bidder_number")
    .eq("auction_id", auctionId)
    .eq("bidder_id", bidderId)
    .limit(1);

  let bidderNumber: number;
  if (existingBids && existingBids.length > 0) {
    bidderNumber = existingBids[0].bidder_number;
  } else {
    // Get max bidder number
    const { data: maxBidderData } = await supabase
      .from("bids")
      .select("bidder_number")
      .eq("auction_id", auctionId)
      .order("bidder_number", { ascending: false })
      .limit(1);

    bidderNumber = maxBidderData?.[0]?.bidder_number
      ? maxBidderData[0].bidder_number + 1
      : 1;
  }

  // Proxy bidding logic
  let newCurrentBid: number;
  let isHighBidder: boolean;
  let outbidUserId: string | null = null;

  if (!currentWinningBid) {
    // First bid
    newCurrentBid = auction.starting_price;
    isHighBidder = true;
  } else if (currentWinningBid.bidder_id === bidderId) {
    // Same bidder increasing max
    if (maxBid <= currentWinningBid.max_bid) {
      return {
        success: false,
        message: `Your max bid is already $${currentWinningBid.max_bid}`,
      };
    }

    // Update existing bid
    await supabase
      .from("bids")
      .update({ max_bid: maxBid, updated_at: new Date().toISOString() })
      .eq("id", currentWinningBid.id);

    return {
      success: true,
      message: "Max bid updated successfully",
      currentBid: auction.current_bid,
      isHighBidder: true,
    };
  } else {
    // New bidder competing with existing high bidder
    const increment = getBidIncrement(currentBid || auction.starting_price);

    if (maxBid > currentWinningBid.max_bid) {
      // New bidder wins
      newCurrentBid = Math.min(
        currentWinningBid.max_bid + increment,
        maxBid
      );
      isHighBidder = true;
      outbidUserId = currentWinningBid.bidder_id;

      // Mark old bid as not winning
      await supabase
        .from("bids")
        .update({ is_winning: false })
        .eq("id", currentWinningBid.id);
    } else if (maxBid === currentWinningBid.max_bid) {
      // Tie goes to first bidder
      newCurrentBid = maxBid;
      isHighBidder = false;
    } else {
      // Existing bidder still wins
      newCurrentBid = maxBid + increment;
      if (newCurrentBid > currentWinningBid.max_bid) {
        newCurrentBid = currentWinningBid.max_bid;
      }
      isHighBidder = false;

      // Update current bid amount
      await supabase
        .from("auctions")
        .update({ current_bid: newCurrentBid })
        .eq("id", auctionId);
    }
  }

  // Create new bid
  const { data: newBid, error: bidError } = await supabase
    .from("bids")
    .insert({
      auction_id: auctionId,
      bidder_id: bidderId,
      bid_amount: newCurrentBid,
      max_bid: maxBid,
      bidder_number: bidderNumber,
      is_winning: isHighBidder,
    })
    .select()
    .single();

  if (bidError) {
    return { success: false, message: bidError.message };
  }

  // Update auction
  await supabase
    .from("auctions")
    .update({
      current_bid: newCurrentBid,
      bid_count: auction.bid_count + 1,
    })
    .eq("id", auctionId);

  // Send outbid notification
  if (outbidUserId) {
    await createNotification(outbidUserId, "outbid", auctionId);
  }

  return {
    success: true,
    message: isHighBidder
      ? "You are the high bidder!"
      : "You have been outbid",
    bid: transformDbBid(newBid),
    currentBid: newCurrentBid,
    isHighBidder,
    outbidAmount: isHighBidder ? undefined : minimumBid,
  };
}

/**
 * Get bid history for an auction (anonymized)
 */
export async function getBidHistory(auctionId: string): Promise<BidHistoryItem[]> {
  const { data, error } = await supabase
    .from("bids")
    .select("bidder_number, bid_amount, created_at, is_winning")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((bid) => ({
    bidderNumber: bid.bidder_number,
    bidAmount: bid.bid_amount,
    createdAt: bid.created_at,
    isWinning: bid.is_winning,
  }));
}

/**
 * Get user's bids across all auctions
 */
export async function getUserBids(userId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("bidder_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(transformDbBid);
}

/**
 * Execute Buy It Now
 */
export async function executeBuyItNow(
  auctionId: string,
  buyerId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: auction } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auctionId)
    .eq("status", "active")
    .single();

  if (!auction) {
    return { success: false, error: "Auction not found or has ended" };
  }

  if (!auction.buy_it_now_price) {
    return { success: false, error: "Buy It Now not available" };
  }

  if (auction.seller_id === buyerId) {
    return { success: false, error: "You cannot buy your own item" };
  }

  // End auction with buyer as winner
  const paymentDeadline = new Date();
  paymentDeadline.setHours(paymentDeadline.getHours() + 48);

  const { error } = await supabase
    .from("auctions")
    .update({
      status: "sold",
      winner_id: buyerId,
      winning_bid: auction.buy_it_now_price,
      payment_status: "pending",
      payment_deadline: paymentDeadline.toISOString(),
    })
    .eq("id", auctionId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify seller
  await createNotification(auction.seller_id, "auction_sold", auctionId);

  // Notify buyer
  await createNotification(buyerId, "won", auctionId);

  return { success: true };
}

// ============================================================================
// WATCHLIST
// ============================================================================

/**
 * Add auction to watchlist
 */
export async function addToWatchlist(
  userId: string,
  auctionId: string
): Promise<void> {
  const { error } = await supabase.from("auction_watchlist").insert({
    user_id: userId,
    auction_id: auctionId,
  });

  // Ignore duplicate errors
  if (error && !error.message.includes("duplicate")) {
    throw error;
  }
}

/**
 * Remove auction from watchlist
 */
export async function removeFromWatchlist(
  userId: string,
  auctionId: string
): Promise<void> {
  const { error } = await supabase
    .from("auction_watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("auction_id", auctionId);

  if (error) throw error;
}

/**
 * Get user's watchlist
 */
export async function getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from("auction_watchlist")
    .select(
      `
      *,
      auctions(*, comics(*))
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    auctionId: item.auction_id,
    createdAt: item.created_at,
    auction: item.auctions ? transformDbAuction(item.auctions) : undefined,
  }));
}

/**
 * Check if user is watching an auction
 */
export async function isWatching(
  userId: string,
  auctionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("auction_watchlist")
    .select("id")
    .eq("user_id", userId)
    .eq("auction_id", auctionId)
    .single();

  return !!data;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  auctionId?: string
): Promise<void> {
  const titles: Record<NotificationType, string> = {
    outbid: "You've been outbid!",
    won: "Congratulations! You won!",
    ended: "Auction ended",
    payment_reminder: "Payment reminder",
    rating_request: "Leave feedback",
    auction_sold: "Your item sold!",
    payment_received: "Payment received",
  };

  const messages: Record<NotificationType, string> = {
    outbid: "Someone has placed a higher bid on an auction you're watching.",
    won: "You've won an auction! Complete payment within 48 hours.",
    ended: "An auction you were watching has ended.",
    payment_reminder: "Payment is due soon for your won auction.",
    rating_request: "Please leave feedback for your recent purchase.",
    auction_sold: "Your auction has ended with a winning bidder!",
    payment_received: "Payment has been received for your sold item.",
  };

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title: titles[type],
    message: messages[type],
    auction_id: auctionId || null,
  });
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly = false
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    auctionId: n.auction_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  }));
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;

  return count || 0;
}

// ============================================================================
// SELLER RATINGS
// ============================================================================

/**
 * Submit a seller rating
 */
export async function submitSellerRating(
  buyerId: string,
  input: SubmitRatingInput
): Promise<{ success: boolean; error?: string }> {
  // Verify buyer won this auction
  const { data: auction } = await supabase
    .from("auctions")
    .select("winner_id, seller_id")
    .eq("id", input.auctionId)
    .single();

  if (!auction || auction.winner_id !== buyerId) {
    return { success: false, error: "You can only rate auctions you won" };
  }

  // Check for existing rating
  const { data: existingRating } = await supabase
    .from("seller_ratings")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("auction_id", input.auctionId)
    .single();

  if (existingRating) {
    return { success: false, error: "You have already rated this seller" };
  }

  const { error } = await supabase.from("seller_ratings").insert({
    seller_id: input.sellerId,
    buyer_id: buyerId,
    auction_id: input.auctionId,
    rating_type: input.ratingType,
    comment: input.comment || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get ratings for a seller
 */
export async function getSellerRatings(
  sellerId: string,
  limit = 20
): Promise<SellerRating[]> {
  const { data, error } = await supabase
    .from("seller_ratings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    sellerId: r.seller_id,
    buyerId: r.buyer_id,
    auctionId: r.auction_id,
    ratingType: r.rating_type as "positive" | "negative",
    comment: r.comment,
    createdAt: r.created_at,
  }));
}

/**
 * Get seller profile with reputation
 */
export async function getSellerProfile(sellerId: string): Promise<SellerProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, public_display_name, positive_ratings, negative_ratings, seller_since"
    )
    .eq("id", sellerId)
    .single();

  if (error || !data) return null;

  const { percentage, reputation } = calculateSellerReputation(
    data.positive_ratings || 0,
    data.negative_ratings || 0
  );

  return {
    id: data.id,
    displayName: data.display_name,
    publicDisplayName: data.public_display_name,
    positiveRatings: data.positive_ratings || 0,
    negativeRatings: data.negative_ratings || 0,
    sellerSince: data.seller_since,
    totalRatings: (data.positive_ratings || 0) + (data.negative_ratings || 0),
    positivePercentage: percentage,
    reputation,
  };
}

// ============================================================================
// CRON / BACKGROUND PROCESSING
// ============================================================================

/**
 * Process ended auctions
 * Called by cron job every minute
 */
export async function processEndedAuctions(): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  // Get all active auctions that have ended
  const { data: endedAuctions, error } = await supabase
    .from("auctions")
    .select("*")
    .eq("status", "active")
    .lt("end_time", new Date().toISOString());

  if (error) {
    return { processed: 0, errors: [error.message] };
  }

  for (const auction of endedAuctions || []) {
    try {
      // Get winning bid
      const { data: winningBid } = await supabase
        .from("bids")
        .select("*")
        .eq("auction_id", auction.id)
        .eq("is_winning", true)
        .single();

      if (winningBid) {
        // Auction has a winner
        const paymentDeadline = new Date();
        paymentDeadline.setHours(paymentDeadline.getHours() + 48);

        await supabase
          .from("auctions")
          .update({
            status: "ended",
            winner_id: winningBid.bidder_id,
            winning_bid: winningBid.bid_amount,
            payment_status: "pending",
            payment_deadline: paymentDeadline.toISOString(),
          })
          .eq("id", auction.id);

        // Notify winner
        await createNotification(winningBid.bidder_id, "won", auction.id);

        // Notify seller
        await createNotification(auction.seller_id, "auction_sold", auction.id);

        // Notify watchers
        const { data: watchers } = await supabase
          .from("auction_watchlist")
          .select("user_id")
          .eq("auction_id", auction.id);

        for (const watcher of watchers || []) {
          if (
            watcher.user_id !== winningBid.bidder_id &&
            watcher.user_id !== auction.seller_id
          ) {
            await createNotification(watcher.user_id, "ended", auction.id);
          }
        }
      } else {
        // No bids, just end it
        await supabase
          .from("auctions")
          .update({ status: "ended" })
          .eq("id", auction.id);
      }

      processed++;
    } catch (e) {
      errors.push(`Auction ${auction.id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return { processed, errors };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformDbAuction(data: Record<string, unknown>): Auction {
  const comics = data.comics as Record<string, unknown> | undefined;
  const profile = data.profiles as Record<string, unknown> | undefined;

  const auction: Auction = {
    id: data.id as string,
    sellerId: data.seller_id as string,
    comicId: data.comic_id as string,
    startingPrice: Number(data.starting_price),
    currentBid: data.current_bid ? Number(data.current_bid) : null,
    buyItNowPrice: data.buy_it_now_price ? Number(data.buy_it_now_price) : null,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    status: data.status as Auction["status"],
    winnerId: (data.winner_id as string) || null,
    winningBid: data.winning_bid ? Number(data.winning_bid) : null,
    shippingCost: Number(data.shipping_cost || 0),
    detailImages: (data.detail_images as string[]) || [],
    description: (data.description as string) || null,
    bidCount: Number(data.bid_count || 0),
    paymentStatus: (data.payment_status as Auction["paymentStatus"]) || null,
    paymentDeadline: (data.payment_deadline as string) || null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };

  // Add joined comic data if present
  if (comics) {
    auction.comic = {
      id: comics.id as string,
      comic: {
        id: comics.id as string,
        title: comics.title as string | null,
        issueNumber: comics.issue_number as string | null,
        variant: comics.variant as string | null,
        publisher: comics.publisher as string | null,
        coverArtist: comics.cover_artist as string | null,
        writer: comics.writer as string | null,
        interiorArtist: comics.interior_artist as string | null,
        releaseYear: comics.release_year as string | null,
        confidence: (comics.confidence as "high" | "medium" | "low") || "medium",
        isSlabbed: comics.is_slabbed as boolean,
        gradingCompany: comics.grading_company as "CGC" | "CBCS" | "PGX" | "Other" | null,
        grade: comics.grade as string | null,
        certificationNumber: comics.certification_number as string | null,
        labelType: comics.label_type as string | null,
        pageQuality: comics.page_quality as string | null,
        isSignatureSeries: comics.is_signature_series as boolean,
        signedBy: comics.signed_by as string | null,
        priceData: comics.price_data as PriceData | null,
        keyInfo: (comics.key_info as string[]) || [],
      },
      coverImageUrl: comics.cover_image_url as string,
      conditionGrade: comics.condition_grade as number | null,
      conditionLabel: comics.condition_label as ConditionLabel | null,
      isGraded: comics.is_graded as boolean,
      gradingCompany: comics.grading_company as string | null,
      purchasePrice: comics.purchase_price as number | null,
      purchaseDate: comics.purchase_date as string | null,
      notes: comics.notes as string | null,
      forSale: comics.for_sale as boolean,
      askingPrice: comics.asking_price as number | null,
      averagePrice: comics.average_price as number | null,
      dateAdded: comics.date_added as string,
      listIds: [],
      isStarred: comics.is_starred as boolean,
    };
  }

  // Add seller profile if present
  if (profile) {
    const { percentage, reputation } = calculateSellerReputation(
      (profile.positive_ratings as number) || 0,
      (profile.negative_ratings as number) || 0
    );

    auction.seller = {
      id: profile.id as string,
      displayName: profile.display_name as string | null,
      publicDisplayName: profile.public_display_name as string | null,
      positiveRatings: (profile.positive_ratings as number) || 0,
      negativeRatings: (profile.negative_ratings as number) || 0,
      sellerSince: profile.seller_since as string | null,
      totalRatings:
        ((profile.positive_ratings as number) || 0) +
        ((profile.negative_ratings as number) || 0),
      positivePercentage: percentage,
      reputation,
    };
  }

  return auction;
}

function transformDbBid(data: Record<string, unknown>): Bid {
  return {
    id: data.id as string,
    auctionId: data.auction_id as string,
    bidderId: data.bidder_id as string,
    bidAmount: Number(data.bid_amount),
    maxBid: Number(data.max_bid),
    bidderNumber: Number(data.bidder_number),
    isWinning: data.is_winning as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
