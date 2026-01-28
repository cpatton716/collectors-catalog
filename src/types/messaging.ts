// ============================================================================
// MESSAGING TYPES
// ============================================================================
import { SellerProfile } from "./auction";

/**
 * A conversation between two users
 */
export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;

  // Joined data (populated when needed)
  otherParticipant?: SellerProfile;
  lastMessage?: Message;
  unreadCount?: number;
}

/**
 * An individual message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  listingId: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;

  // Rich content
  imageUrls: string[];
  embeddedListingId: string | null;
  embeddedListing?: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    currentPrice: number;
    status: string;
  };

  // Joined data (populated when needed)
  sender?: SellerProfile;
  listing?: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
}

/**
 * Input for sending a message
 */
export interface SendMessageInput {
  recipientId: string;
  content: string;
  listingId?: string;
  imageUrls?: string[];
  embeddedListingId?: string;
}

/**
 * Conversation list item for inbox display
 */
export interface ConversationPreview {
  id: string;
  otherParticipant: SellerProfile;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
}

/**
 * Result from get conversations API
 */
export interface ConversationsResponse {
  conversations: ConversationPreview[];
  totalUnread: number;
}

/**
 * Result from get messages API
 */
export interface MessagesResponse {
  messages: Message[];
  conversation: Conversation;
  otherParticipant: SellerProfile;
}

// ============================================================================
// BLOCKING & REPORTING TYPES
// ============================================================================

/**
 * A user block record
 */
export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blockedUser?: SellerProfile;
}

/**
 * Reason for reporting a message
 */
export type ReportReason = "spam" | "scam" | "harassment" | "inappropriate" | "other";

/**
 * A message report for admin review
 */
export interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: ReportReason;
  details: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  priority: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  actionTaken: string | null;
  createdAt: string;

  // Joined data
  message?: Message;
  reporter?: SellerProfile;
}

/**
 * Input for creating a message report
 */
export interface CreateReportInput {
  messageId: string;
  reason: ReportReason;
  details?: string;
}
