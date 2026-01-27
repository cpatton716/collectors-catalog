# Peer-to-Peer Messaging Design

**Date:** January 27, 2026
**Status:** Approved
**Priority:** Medium

## Overview

Add direct messaging between users to facilitate communication around purchases and trades in the Collectors Chest marketplace.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Scope | Listing-tied initially, designed for future general messaging |
| Threading | Unified per seller (one conversation per user pair) |
| Entry points | Everywhere seller appears (cards, profiles, listings, bid history) |
| Inbox UI | Dedicated `/messages` page |
| Message content | Rich (text, images, listing embeds) |
| Delivery | Hybrid (real-time when open, push/polling in background) |
| Notifications | Per-channel (push/email) with smart platform defaults |
| Block/Report | Separate actions (block is personal, report goes to admin) |
| Moderation | Full (content filters, behavioral flags, AI-assisted analysis) |
| Admin tooling | Dashboard with triage, priority sorting, metrics |

---

## Data Model

### Core Tables

```sql
-- Conversations between two users
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique conversation per user pair
  CONSTRAINT unique_conversation UNIQUE (participant_1_id, participant_2_id),
  -- Ensure participant_1_id < participant_2_id for consistency
  CONSTRAINT ordered_participants CHECK (participant_1_id < participant_2_id)
);

-- Individual messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  -- Listing context ("Regarding: Amazing Spider-Man #300")
  listing_id UUID REFERENCES auctions(id) ON DELETE SET NULL,

  -- Embedded listing card in message body
  embedded_listing_id UUID REFERENCES auctions(id) ON DELETE SET NULL,

  -- Image attachments (max 2)
  image_urls TEXT[] DEFAULT '{}',

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,

  -- Moderation flags
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT max_two_images CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 2)
);

-- User blocks (personal, immediate)
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Message reports (admin review queue)
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'scam', 'harassment', 'inappropriate', 'other')),
  details TEXT,

  -- Admin review
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  priority INTEGER DEFAULT 5, -- 1-10, AI-assigned
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_report UNIQUE (message_id, reporter_id)
);
```

### Profile Table Additions

```sql
-- Notification preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS msg_push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS msg_email_enabled BOOLEAN DEFAULT FALSE;
```

### Indexes

```sql
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = TRUE;

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

CREATE INDEX idx_message_reports_status ON message_reports(status, priority DESC);
CREATE INDEX idx_message_reports_created ON message_reports(created_at DESC);
```

---

## API Routes

### Conversation & Message APIs

```
GET    /api/messages
       → List all conversations for current user
       → Returns: conversation list with last message preview, unread count per conversation
       → Sorted by last_message_at DESC

GET    /api/messages/[conversationId]
       → Get full message thread
       → Marks messages as read
       → Returns: messages array, other participant info

POST   /api/messages
       → Send a message (creates conversation if needed)
       → Body: { recipientId, content, listingId?, embeddedListingId?, imageUrls? }
       → Validates: not blocked, content filters pass
       → Returns: created message

GET    /api/messages/unread-count
       → Quick count for badge display
       → Returns: { count: number }
```

### Block & Report APIs

```
POST   /api/users/[userId]/block
       → Block a user
       → Prevents messaging in both directions

DELETE /api/users/[userId]/block
       → Unblock a user

GET    /api/users/blocked
       → List blocked users
       → Returns: array of blocked user profiles

POST   /api/messages/[messageId]/report
       → Report a message to admin queue
       → Body: { reason, details? }
       → Returns: { success: true }
```

### Admin Moderation APIs

```
GET    /api/admin/message-reports
       → List reports with priority sorting
       → Query: status?, limit?, offset?
       → Returns: paginated reports with message context

PATCH  /api/admin/message-reports/[reportId]
       → Update report status
       → Body: { status, actionTaken? }

GET    /api/admin/message-reports/stats
       → Dashboard metrics
       → Returns: { totalPending, resolvedToday, avgResolutionTime, reportsByReason }

GET    /api/admin/users/[userId]/message-history
       → User's messaging history for context
       → Returns: report count, account age, transaction history
```

### Notification Preferences

```
GET    /api/settings/notifications
       → Get current preferences

PATCH  /api/settings/notifications
       → Update preferences
       → Body: { msgPushEnabled?, msgEmailEnabled? }
```

---

## UI Components

### New Pages

| Route | Purpose |
|-------|---------|
| `/messages` | Inbox (conversation list + active thread) |
| `/messages/[conversationId]` | Deep link to specific conversation |
| `/settings/notifications` | Notification preferences |
| `/admin/moderation` | Admin message moderation dashboard |

### New Components

**Messaging:**
- `MessageButton.tsx` - "Message Seller" button (various sizes)
- `ConversationList.tsx` - Left panel conversation list with previews
- `MessageThread.tsx` - Right panel message history
- `MessageBubble.tsx` - Individual message (text, images, embedded listing)
- `MessageComposer.tsx` - Input with text, image upload, listing embed
- `EmbedListingPicker.tsx` - Modal to select listing to embed

**Moderation:**
- `BlockUserModal.tsx` - Confirmation for blocking
- `ReportMessageModal.tsx` - Report form (reason, details)

**Admin:**
- `ModerationDashboard.tsx` - Stats + report queue
- `ReportCard.tsx` - Single report with actions
- `ConversationContext.tsx` - Full thread for reported message
- `UserHistoryPanel.tsx` - Reporter/reported user history

### Entry Points for MessageButton

- `AuctionCard.tsx` - Small icon button
- Auction detail page - Full "Message Seller" button
- `SellerProfileBadge.tsx` - Icon next to seller name
- `BidHistory.tsx` - Icon for sellers to message bidders

---

## Real-time & Notifications

### Real-time (Supabase Realtime)

When `/messages` page is open:

```typescript
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .subscribe()
```

- Subscribe on mount, unsubscribe on unmount
- Messages appear instantly without refresh

### Background Notifications

When user is NOT on messages page:

1. **Push notifications** (if `msg_push_enabled`)
   - Service worker for web
   - Native push for mobile apps (future)

2. **Email notifications** (if `msg_email_enabled`)
   - Sent via Resend
   - 2-minute delay to avoid duplicate with push
   - Template: Subject, message preview, "View Conversation" button

### Unread Badge

- Poll `/api/messages/unread-count` every 60 seconds
- Display badge on "Messages" nav link
- Clear when conversation is opened

### Default Preferences

- New accounts: Push ON, Email OFF
- Web-only users (no push): Email ON

---

## Moderation System

### Layer 1: Immediate Content Filters

Block message from being sent:

```typescript
const BLOCKED_PATTERNS = [
  /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/, // Phone numbers
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Emails
  // Profanity (use existing usernameValidation.ts patterns)
];

// Also block: same message sent 3+ times in 24hrs
```

Response: "Message not sent. Please keep transactions on-platform."

### Layer 2: Auto-Flag for Review

Message sent but flagged for admin review:

```typescript
const FLAG_PATTERNS = [
  /venmo|zelle|paypal|cashapp|cash app/i, // External payments
  /text me|call me|whatsapp|telegram/i, // Off-platform contact
  /(urgent|asap|quick).*(payment|pay|send)/i, // Urgency + money
];

const BEHAVIORAL_FLAGS = [
  'New account (<7 days) messaging 5+ unique users in 24hrs',
  'User has 2+ reports in past 30 days',
];
```

### Layer 3: AI Analysis (Batch)

Nightly cron job analyzes flagged messages:

```typescript
// Claude prompt for each flagged message:
// - Scam intent detection
// - Manipulation patterns
// - Impersonation attempts
// Output: priority score (1-10), recommended action
```

### Admin Actions

| Action | Effect |
|--------|--------|
| Dismiss | False positive, no action |
| Warn | Send automated warning to user |
| Suspend | Suspend user account |
| Delete conversation | Remove entire thread (severe) |

---

## Implementation Phases

### Phase 1: Core Messaging
- Database migration
- Basic API routes (send, list, get thread)
- `/messages` page (ConversationList + MessageThread)
- MessageButton on listing detail page only
- Text-only messages

### Phase 2: Rich Content & Entry Points
- Image attachments (Supabase storage)
- Listing embeds
- MessageButton everywhere
- Unread badge in navigation

### Phase 3: Block & Report
- user_blocks table + API
- message_reports table + API
- BlockUserModal + ReportMessageModal
- Content filters (Layer 1)

### Phase 4: Notification Preferences
- Profile columns for preferences
- Settings UI
- Email notifications via Resend
- Push notification infrastructure

### Phase 5: Real-time
- Supabase Realtime subscription
- Instant message delivery

### Phase 6: Admin Moderation Dashboard
- Auto-flagging rules (Layer 2)
- `/admin/moderation` dashboard
- Report queue with priority
- User history panel

### Phase 7: AI-Assisted Moderation
- Nightly batch job
- Claude analysis
- Priority scoring

---

## Future Considerations

- **General user-to-user messaging** - Remove listing requirement, allow messaging any user
- **Read receipts** - Show when message was read
- **Typing indicators** - Show when other user is typing
- **Message reactions** - Quick emoji reactions
- **Message search** - Search within conversations
- **Archive conversations** - Hide without deleting
