import { SellerProfile } from "./auction";

// Match status
export type MatchStatus = "pending" | "viewed" | "dismissed" | "traded";

// Trade match
export interface TradeMatch {
  id: string;
  userAId: string;
  userBId: string;
  userAComicId: string;
  userBComicId: string;
  qualityScore: number;
  status: MatchStatus;
  notifiedAt?: string;
  viewedAt?: string;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  otherUser?: SellerProfile;
  myComic?: TradeItem["comic"];
  theirComic?: TradeItem["comic"];
}

// Grouped matches (by your comic)
export interface GroupedMatch {
  myComic: TradeItem["comic"];
  matches: {
    otherUser: SellerProfile;
    theirComic: TradeItem["comic"];
    qualityScore: number;
    matchId: string;
  }[];
}

// Trade status enum
export type TradeStatus =
  | "proposed"
  | "accepted"
  | "shipped"
  | "completed"
  | "cancelled"
  | "declined";

// Shipping carriers
export type ShippingCarrier = "usps" | "ups" | "fedex" | "dhl" | "other";

// Trade item (comic being traded)
export interface TradeItem {
  id: string;
  tradeId: string;
  comicId: string;
  ownerId: string;
  comic?: {
    id: string;
    title: string;
    issueNumber: string;
    publisher: string;
    coverImageUrl?: string;
    grade?: string;
    estimatedValue?: number;
  };
  createdAt: string;
}

// Full trade object
export interface Trade {
  id: string;
  proposerId: string;
  recipientId: string;
  status: TradeStatus;
  proposerTrackingCarrier?: string;
  proposerTrackingNumber?: string;
  recipientTrackingCarrier?: string;
  recipientTrackingNumber?: string;
  proposerShippedAt?: string;
  recipientShippedAt?: string;
  proposerReceivedAt?: string;
  recipientReceivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  proposer?: SellerProfile;
  recipient?: SellerProfile;
  proposerItems?: TradeItem[];
  recipientItems?: TradeItem[];
}

// Trade preview for list views
export interface TradePreview {
  id: string;
  status: TradeStatus;
  otherUser: SellerProfile;
  myItems: TradeItem[];
  theirItems: TradeItem[];
  createdAt: string;
  updatedAt: string;
  isProposer: boolean;
}

// Input for creating a trade
export interface CreateTradeInput {
  recipientId: string;
  myComicIds: string[];
  theirComicIds: string[];
}

// Input for updating trade status
export interface UpdateTradeInput {
  status?: TradeStatus;
  trackingCarrier?: string;
  trackingNumber?: string;
  cancelReason?: string;
}

// Response types
export interface TradesResponse {
  trades: TradePreview[];
  total: number;
}

export interface TradeResponse {
  trade: Trade;
}

// Helper functions
export function getTradeStatusLabel(status: TradeStatus): string {
  switch (status) {
    case "proposed":
      return "Proposed";
    case "accepted":
      return "Accepted";
    case "shipped":
      return "Shipping";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

export function getTradeStatusColor(status: TradeStatus): string {
  switch (status) {
    case "proposed":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-blue-100 text-blue-800";
    case "shipped":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    case "declined":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function canCancelTrade(trade: Trade, userId: string): boolean {
  if (trade.status === "proposed" && trade.proposerId === userId) return true;
  if (trade.status === "accepted") return true;
  return false;
}

export function canAcceptTrade(trade: Trade, userId: string): boolean {
  return trade.status === "proposed" && trade.recipientId === userId;
}

export function canDeclineTrade(trade: Trade, userId: string): boolean {
  return trade.status === "proposed" && trade.recipientId === userId;
}

export function canShipTrade(trade: Trade, userId: string): boolean {
  if (trade.status !== "accepted") return false;
  if (trade.proposerId === userId && !trade.proposerShippedAt) return true;
  if (trade.recipientId === userId && !trade.recipientShippedAt) return true;
  return false;
}

export function canConfirmReceipt(trade: Trade, userId: string): boolean {
  if (trade.status !== "shipped") return false;
  if (trade.proposerId === userId && !trade.proposerReceivedAt && trade.recipientShippedAt)
    return true;
  if (trade.recipientId === userId && !trade.recipientReceivedAt && trade.proposerShippedAt)
    return true;
  return false;
}
