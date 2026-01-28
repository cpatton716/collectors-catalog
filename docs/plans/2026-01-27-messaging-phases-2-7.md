# Messaging Phases 2-7 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the full messaging system with images, real-time updates, block/report, notifications, and admin moderation.

**Architecture:** Build incrementally on Phase 1's foundation. Add columns to existing tables where possible, create new tables for blocks/reports. Use Supabase Realtime for instant messaging, Resend for email notifications. Admin moderation via existing admin route pattern.

**Tech Stack:** Supabase (Postgres, Realtime, Storage), Resend (email), Next.js API routes, React components

---

## Phase 2: Rich Content & Entry Points

### Task 2.1: Add Image Support to Database

**Files:**
- Create: `supabase/migrations/20260127_messaging_phase2.sql`

**Step 1: Create migration file**

```sql
-- ============================================================================
-- MESSAGING PHASE 2 - Rich Content & Entry Points
-- ============================================================================

-- Add image_urls column to messages (max 2 images)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add embedded_listing_id for listing cards in message body
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS embedded_listing_id UUID REFERENCES auctions(id) ON DELETE SET NULL;

-- Constraint for max 2 images
ALTER TABLE messages
ADD CONSTRAINT max_two_images CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 2);

-- Index for embedded listings
CREATE INDEX IF NOT EXISTS idx_messages_embedded_listing ON messages(embedded_listing_id) WHERE embedded_listing_id IS NOT NULL;
```

**Step 2: Run migration in Supabase**
- Copy SQL to Supabase SQL Editor
- Execute

**Step 3: Commit**
```bash
git add supabase/migrations/20260127_messaging_phase2.sql
git commit -m "feat(messaging): add image_urls and embedded_listing columns"
```

---

### Task 2.2: Update Message Types

**Files:**
- Modify: `src/types/messaging.ts`

**Step 1: Update Message interface**

Add to the `Message` interface:
```typescript
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
```

**Step 2: Update SendMessageInput interface**

Add optional fields:
```typescript
  imageUrls?: string[];
  embeddedListingId?: string;
```

**Step 3: Commit**
```bash
git add src/types/messaging.ts
git commit -m "feat(messaging): add image and embedded listing types"
```

---

### Task 2.3: Update Message Sending API

**Files:**
- Modify: `src/lib/messagingDb.ts`
- Modify: `src/app/api/messages/route.ts`

**Step 1: Update sendMessage in messagingDb.ts**

Update the insert to include new fields:
```typescript
const { data, error } = await supabaseAdmin
  .from("messages")
  .insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    listing_id: listingId || null,
    image_urls: imageUrls || [],
    embedded_listing_id: embeddedListingId || null,
  })
```

**Step 2: Update the return transformation**

Add to the returned Message object:
```typescript
imageUrls: data.image_urls || [],
embeddedListingId: data.embedded_listing_id,
```

**Step 3: Update getConversationMessages**

Update the select query to include embedded listing data and transform:
```typescript
embedded_auctions:embedded_listing_id (
  id,
  current_price,
  status,
  comics (
    title,
    cover_image_url
  )
)
```

**Step 4: Update API route to accept new fields**

In POST handler, extract from body:
```typescript
const { recipientId, content, listingId, imageUrls, embeddedListingId } = body;
```

Pass to sendMessage:
```typescript
const message = await sendMessage(profileId, {
  recipientId,
  content,
  listingId,
  imageUrls,
  embeddedListingId,
});
```

**Step 5: Commit**
```bash
git add src/lib/messagingDb.ts src/app/api/messages/route.ts
git commit -m "feat(messaging): support images and embedded listings in API"
```

---

### Task 2.4: Update MessageComposer for Images

**Files:**
- Modify: `src/components/messaging/MessageComposer.tsx`

**Step 1: Add image upload state and UI**

Add imports:
```typescript
import { ImagePlus, X } from "lucide-react";
```

Add state:
```typescript
const [images, setImages] = useState<File[]>([]);
const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
const fileInputRef = useRef<HTMLInputElement>(null);
```

**Step 2: Add image handling functions**

```typescript
const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length + images.length > 2) {
    alert("Maximum 2 images allowed");
    return;
  }

  const newImages = [...images, ...files].slice(0, 2);
  setImages(newImages);

  // Create preview URLs
  const newPreviews = newImages.map(file => URL.createObjectURL(file));
  setImagePreviewUrls(newPreviews);
};

const removeImage = (index: number) => {
  const newImages = images.filter((_, i) => i !== index);
  setImages(newImages);
  URL.revokeObjectURL(imagePreviewUrls[index]);
  setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
};
```

**Step 3: Update onSend prop type and handleSubmit**

Change prop type:
```typescript
onSend: (content: string, imageUrls?: string[]) => Promise<void>;
```

Update handleSubmit to upload images first:
```typescript
// Upload images if any
let uploadedUrls: string[] = [];
if (images.length > 0) {
  // Upload each image to Supabase storage
  for (const image of images) {
    const formData = new FormData();
    formData.append("file", image);
    const res = await fetch("/api/messages/upload-image", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const { url } = await res.json();
      uploadedUrls.push(url);
    }
  }
}

await onSend(trimmedContent, uploadedUrls.length > 0 ? uploadedUrls : undefined);
setImages([]);
setImagePreviewUrls([]);
```

**Step 4: Add UI for image button and previews**

Add before the textarea:
```tsx
{/* Image previews */}
{imagePreviewUrls.length > 0 && (
  <div className="flex gap-2 mb-2">
    {imagePreviewUrls.map((url, i) => (
      <div key={i} className="relative">
        <img src={url} alt="" className="h-16 w-16 object-cover rounded border-2 border-pop-black" />
        <button
          type="button"
          onClick={() => removeImage(i)}
          className="absolute -top-2 -right-2 bg-pop-red text-white rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ))}
  </div>
)}
```

Add image button next to send:
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
  onChange={handleImageSelect}
  className="hidden"
/>
<button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  disabled={images.length >= 2 || isSending || disabled}
  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-pop-black bg-pop-white transition-all hover:bg-gray-100 disabled:opacity-50"
>
  <ImagePlus className="h-5 w-5" />
</button>
```

**Step 5: Commit**
```bash
git add src/components/messaging/MessageComposer.tsx
git commit -m "feat(messaging): add image upload UI to composer"
```

---

### Task 2.5: Create Image Upload API

**Files:**
- Create: `src/app/api/messages/upload-image/route.ts`

**Step 1: Create the upload endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfileByClerkId } from "@/lib/db";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from("message-images")
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("message-images")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Create storage bucket in Supabase**
- Go to Supabase Dashboard → Storage
- Create bucket named "message-images"
- Set to public
- Add policy: authenticated users can upload to their folder

**Step 3: Commit**
```bash
git add src/app/api/messages/upload-image/route.ts
git commit -m "feat(messaging): add image upload API endpoint"
```

---

### Task 2.6: Update MessageBubble for Images

**Files:**
- Modify: `src/components/messaging/MessageBubble.tsx`

**Step 1: Add image display**

After content text, add:
```tsx
{/* Images */}
{message.imageUrls && message.imageUrls.length > 0 && (
  <div className={`flex gap-2 mt-2 ${message.imageUrls.length === 1 ? '' : 'flex-wrap'}`}>
    {message.imageUrls.map((url, i) => (
      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt=""
          className="max-w-[200px] max-h-[200px] rounded border-2 border-pop-black object-cover hover:opacity-90"
        />
      </a>
    ))}
  </div>
)}

{/* Embedded Listing */}
{message.embeddedListing && (
  <div className="mt-2 p-2 bg-gray-50 rounded border-2 border-pop-black">
    <div className="flex gap-2">
      {message.embeddedListing.coverImageUrl && (
        <img
          src={message.embeddedListing.coverImageUrl}
          alt=""
          className="w-12 h-16 object-cover rounded"
        />
      )}
      <div>
        <p className="font-bold text-sm">{message.embeddedListing.title}</p>
        <p className="text-sm text-pop-blue">${message.embeddedListing.currentPrice}</p>
        <p className="text-xs text-gray-500 capitalize">{message.embeddedListing.status}</p>
      </div>
    </div>
  </div>
)}
```

**Step 2: Commit**
```bash
git add src/components/messaging/MessageBubble.tsx
git commit -m "feat(messaging): display images and embedded listings in bubbles"
```

---

### Task 2.7: Add Unread Badge to Navigation

**Files:**
- Modify: `src/components/Navigation.tsx`
- Modify: `src/components/MobileNav.tsx`

**Step 1: Add Messages link with badge to Navigation.tsx**

Add to imports:
```typescript
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
```

Add state and effect inside component:
```typescript
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  const fetchUnread = async () => {
    try {
      const res = await fetch("/api/messages/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (e) {
      // Ignore errors
    }
  };

  fetchUnread();
  const interval = setInterval(fetchUnread, 60000); // Poll every minute
  return () => clearInterval(interval);
}, []);
```

Add Messages link after Shop:
```tsx
<Link
  href="/messages"
  className={`relative flex items-center gap-1 px-3 py-2 rounded-lg font-bold transition-all ${
    pathname === "/messages"
      ? "bg-pop-black text-pop-yellow"
      : "hover:bg-pop-black/10"
  }`}
>
  <MessageSquare className="h-5 w-5" />
  <span>Messages</span>
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-pop-red text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</Link>
```

**Step 2: Do the same for MobileNav.tsx**

**Step 3: Commit**
```bash
git add src/components/Navigation.tsx src/components/MobileNav.tsx
git commit -m "feat(messaging): add Messages link with unread badge to nav"
```

---

### Task 2.8: Add MessageButton to More Locations

**Files:**
- Modify: `src/components/auction/AuctionCard.tsx`
- Modify: `src/components/auction/SellerBadge.tsx`

**Step 1: Add MessageButton import and usage to AuctionCard**

Add small message icon button next to seller name.

**Step 2: Add MessageButton to SellerBadge**

Add icon next to seller name that opens message modal.

**Step 3: Commit**
```bash
git add src/components/auction/AuctionCard.tsx src/components/auction/SellerBadge.tsx
git commit -m "feat(messaging): add MessageButton to auction cards and seller badges"
```

---

## Phase 3: Block & Report

### Task 3.1: Create Block/Report Database Tables

**Files:**
- Create: `supabase/migrations/20260127_messaging_phase3.sql`

**Step 1: Create migration**

```sql
-- ============================================================================
-- MESSAGING PHASE 3 - Block & Report
-- ============================================================================

-- User blocks (personal, immediate)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "user_blocks_select" ON user_blocks
  FOR SELECT USING (blocker_id = public.current_profile_id());

CREATE POLICY "user_blocks_insert" ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = public.current_profile_id());

CREATE POLICY "user_blocks_delete" ON user_blocks
  FOR DELETE USING (blocker_id = public.current_profile_id());

-- Message reports (admin review queue)
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN ('spam', 'scam', 'harassment', 'inappropriate', 'other')),
  details TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  priority INTEGER DEFAULT 5,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_report UNIQUE (message_id, reporter_id)
);

CREATE INDEX idx_message_reports_status ON message_reports(status, priority DESC);
CREATE INDEX idx_message_reports_created ON message_reports(created_at DESC);

-- Enable RLS
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "message_reports_insert" ON message_reports
  FOR INSERT WITH CHECK (reporter_id = public.current_profile_id());

-- Users can see their own reports
CREATE POLICY "message_reports_select" ON message_reports
  FOR SELECT USING (reporter_id = public.current_profile_id());

-- Add is_flagged column to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = TRUE;
```

**Step 2: Run in Supabase**

**Step 3: Commit**
```bash
git add supabase/migrations/20260127_messaging_phase3.sql
git commit -m "feat(messaging): add user_blocks and message_reports tables"
```

---

### Task 3.2: Create Block/Report Types

**Files:**
- Modify: `src/types/messaging.ts`

**Step 1: Add types**

```typescript
export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blockedUser?: SellerProfile;
}

export type ReportReason = 'spam' | 'scam' | 'harassment' | 'inappropriate' | 'other';

export interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: ReportReason;
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  priority: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  actionTaken: string | null;
  createdAt: string;
}
```

**Step 2: Commit**
```bash
git add src/types/messaging.ts
git commit -m "feat(messaging): add block and report types"
```

---

### Task 3.3: Create Block API Routes

**Files:**
- Create: `src/app/api/users/[userId]/block/route.ts`
- Create: `src/app/api/users/blocked/route.ts`

**Step 1: Create block/unblock endpoint**

```typescript
// POST - block user, DELETE - unblock user
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfileByClerkId } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(clerkId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { userId: blockedId } = await params;

    if (profile.id === blockedId) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_blocks")
      .insert({
        blocker_id: profile.id,
        blocked_id: blockedId,
      });

    if (error && error.code !== "23505") { // Ignore duplicate
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Similar but delete from user_blocks
}
```

**Step 2: Create blocked users list endpoint**

```typescript
// GET /api/users/blocked - list all blocked users
```

**Step 3: Commit**
```bash
git add src/app/api/users/
git commit -m "feat(messaging): add block/unblock API routes"
```

---

### Task 3.4: Create Report API Route

**Files:**
- Create: `src/app/api/messages/[messageId]/report/route.ts`

**Step 1: Create report endpoint**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  // Validate user is participant in conversation
  // Insert into message_reports
  // Return success
}
```

**Step 2: Commit**
```bash
git add src/app/api/messages/[messageId]/report/route.ts
git commit -m "feat(messaging): add message report API"
```

---

### Task 3.5: Create BlockUserModal and ReportMessageModal

**Files:**
- Create: `src/components/messaging/BlockUserModal.tsx`
- Create: `src/components/messaging/ReportMessageModal.tsx`

**Step 1: Create BlockUserModal**

Simple confirmation modal with block button.

**Step 2: Create ReportMessageModal**

Form with reason dropdown (spam, scam, harassment, inappropriate, other) and optional details textarea.

**Step 3: Commit**
```bash
git add src/components/messaging/BlockUserModal.tsx src/components/messaging/ReportMessageModal.tsx
git commit -m "feat(messaging): add block and report modals"
```

---

### Task 3.6: Add Block/Report to MessageThread

**Files:**
- Modify: `src/components/messaging/MessageThread.tsx`

**Step 1: Add dropdown menu to header with Block and Report options**

**Step 2: Integrate modals**

**Step 3: Commit**
```bash
git add src/components/messaging/MessageThread.tsx
git commit -m "feat(messaging): integrate block/report into message thread"
```

---

### Task 3.7: Add Content Filters

**Files:**
- Create: `src/lib/contentFilter.ts`
- Modify: `src/lib/messagingDb.ts`

**Step 1: Create content filter**

```typescript
const BLOCKED_PATTERNS = [
  /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/, // Phone numbers
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Emails
];

const FLAG_PATTERNS = [
  /venmo|zelle|paypal|cashapp|cash app/i,
  /text me|call me|whatsapp|telegram/i,
];

export function checkContent(content: string): { blocked: boolean; flagged: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, flagged: false, reason: "Contact info not allowed" };
    }
  }

  for (const pattern of FLAG_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: false, flagged: true, reason: "Suspicious content" };
    }
  }

  return { blocked: false, flagged: false };
}
```

**Step 2: Integrate into sendMessage**

Check content before sending, block or flag accordingly.

**Step 3: Commit**
```bash
git add src/lib/contentFilter.ts src/lib/messagingDb.ts
git commit -m "feat(messaging): add content filtering for messages"
```

---

### Task 3.8: Check Blocks in sendMessage

**Files:**
- Modify: `src/lib/messagingDb.ts`

**Step 1: Add block check before sending**

```typescript
// Check if either user has blocked the other
const { data: block } = await supabaseAdmin
  .from("user_blocks")
  .select("id")
  .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${senderId})`)
  .single();

if (block) {
  throw new Error("Cannot message this user");
}
```

**Step 2: Commit**
```bash
git add src/lib/messagingDb.ts
git commit -m "feat(messaging): prevent messaging blocked users"
```

---

## Phase 4: Notification Preferences

### Task 4.1: Add Profile Columns

**Files:**
- Create: `supabase/migrations/20260127_messaging_phase4.sql`

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS msg_push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS msg_email_enabled BOOLEAN DEFAULT FALSE;
```

---

### Task 4.2: Create Notification Settings API

**Files:**
- Create: `src/app/api/settings/notifications/route.ts`

GET to fetch current settings, PATCH to update.

---

### Task 4.3: Create Settings Page

**Files:**
- Create: `src/app/settings/notifications/page.tsx`

Simple toggle switches for push and email notifications.

---

### Task 4.4: Send Email on New Message

**Files:**
- Modify: `src/lib/messagingDb.ts`

After sending message, if recipient has email enabled:
```typescript
import { sendEmail } from "@/lib/email";

// Check recipient's preferences
const { data: recipient } = await supabaseAdmin
  .from("profiles")
  .select("msg_email_enabled, email")
  .eq("id", recipientId)
  .single();

if (recipient?.msg_email_enabled && recipient?.email) {
  await sendEmail({
    to: recipient.email,
    subject: "New message on Collectors Chest",
    template: "new-message",
    data: { senderName, preview: content.slice(0, 100) }
  });
}
```

---

## Phase 5: Real-time

### Task 5.1: Enable Supabase Realtime

**Files:**
- Supabase Dashboard

Enable realtime on `messages` table.

---

### Task 5.2: Add Realtime Subscription to MessageThread

**Files:**
- Modify: `src/components/messaging/MessageThread.tsx`

```typescript
import { supabase } from "@/lib/supabase";

useEffect(() => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, transformMessage(payload.new)]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
```

---

### Task 5.3: Add Realtime Badge Updates

**Files:**
- Modify: `src/components/Navigation.tsx`

Subscribe to new messages for current user to update badge instantly.

---

## Phase 6: Admin Moderation Dashboard

### Task 6.1: Create Admin Reports API

**Files:**
- Create: `src/app/api/admin/message-reports/route.ts`
- Create: `src/app/api/admin/message-reports/[reportId]/route.ts`

GET list with pagination, PATCH to update status.

---

### Task 6.2: Create Admin Moderation Page

**Files:**
- Create: `src/app/admin/moderation/page.tsx`

Dashboard with:
- Stats cards (pending, resolved today, avg resolution time)
- Report queue sorted by priority
- Each report shows message content, reporter, reported user
- Actions: Dismiss, Warn, Suspend

---

### Task 6.3: Create ReportCard Component

**Files:**
- Create: `src/components/admin/ReportCard.tsx`

Shows report details with action buttons.

---

## Phase 7: AI-Assisted Moderation

### Task 7.1: Create Moderation Cron Job

**Files:**
- Create: `src/app/api/cron/moderate-messages/route.ts`

Nightly job that:
1. Fetches flagged messages
2. Sends to Claude for analysis
3. Updates priority scores

---

### Task 7.2: Add Priority Scoring

```typescript
const prompt = `Analyze this message for potential issues:
- Scam indicators (urgency + money requests)
- Manipulation patterns
- Impersonation attempts

Message: "${content}"

Respond with JSON: { "priority": 1-10, "concerns": ["..."], "recommended_action": "none|warn|review|suspend" }`;
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|------------------|
| 2 | 8 | Image uploads, embedded listings, unread badge, MessageButton everywhere |
| 3 | 8 | user_blocks table, message_reports table, modals, content filters |
| 4 | 4 | Notification preferences, email on new message |
| 5 | 3 | Supabase Realtime subscriptions |
| 6 | 3 | Admin moderation dashboard |
| 7 | 2 | AI-assisted priority scoring |

**Total: 28 tasks**
