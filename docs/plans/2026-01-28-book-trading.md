# Book Trading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to swap comics directly without money through a complete trading system with matching, proposals, and ownership transfer.

**Architecture:** Database tables for trades/items/matches, real-time matching via triggers, chat-first workflow with embedded proposals, confirmation-based completion with ownership swap.

**Tech Stack:** Supabase (Postgres + RLS + Realtime), Next.js API routes, TypeScript, Tailwind CSS

**Design Document:** `docs/plans/2026-01-28-book-trading-design.md`

---

## Phase 1: Foundation

### Task 1.1: Add for_trade column to comics table

**Files:**
- Create: `supabase/migrations/20260128_trading_phase1.sql`

**Step 1: Write the migration**

```sql
-- Add for_trade flag to comics table
ALTER TABLE comics ADD COLUMN IF NOT EXISTS for_trade BOOLEAN DEFAULT false;

-- Add acquired_via to track how comic was obtained
ALTER TABLE comics ADD COLUMN IF NOT EXISTS acquired_via TEXT DEFAULT 'scan';

-- Add index for efficient querying of tradeable comics
CREATE INDEX IF NOT EXISTS idx_comics_for_trade ON comics(for_trade) WHERE for_trade = true;

-- Comment for documentation
COMMENT ON COLUMN comics.for_trade IS 'Whether this comic is available for trade';
COMMENT ON COLUMN comics.acquired_via IS 'How the comic was acquired: scan, import, purchase, trade';
```

**Step 2: Apply migration to Supabase**

Run in Supabase SQL editor or via CLI.

**Step 3: Commit**

```bash
git add supabase/migrations/20260128_trading_phase1.sql
git commit -m "feat(trading): add for_trade and acquired_via columns to comics"
```

---

### Task 1.2: Create trades and trade_items tables

**Files:**
- Modify: `supabase/migrations/20260128_trading_phase1.sql`

**Step 1: Add trades table to migration**

```sql
-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'shipped', 'completed', 'cancelled', 'declined')),
  proposer_tracking_carrier TEXT,
  proposer_tracking_number TEXT,
  recipient_tracking_carrier TEXT,
  recipient_tracking_number TEXT,
  proposer_shipped_at TIMESTAMPTZ,
  recipient_shipped_at TIMESTAMPTZ,
  proposer_received_at TIMESTAMPTZ,
  recipient_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_users CHECK (proposer_id != recipient_id)
);

-- Create trade_items table
CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, comic_id)
);

-- Indexes
CREATE INDEX idx_trades_proposer ON trades(proposer_id);
CREATE INDEX idx_trades_recipient ON trades(recipient_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);
CREATE INDEX idx_trade_items_comic ON trade_items(comic_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trades_updated_at();
```

**Step 2: Add RLS policies**

```sql
-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;

-- Trades: Users can see trades they're involved in
CREATE POLICY "Users can view their trades"
  ON trades FOR SELECT
  USING (auth.uid()::text IN (
    SELECT clerk_user_id FROM profiles WHERE id = proposer_id
    UNION
    SELECT clerk_user_id FROM profiles WHERE id = recipient_id
  ));

-- Trades: Users can create trades as proposer
CREATE POLICY "Users can create trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE id = proposer_id));

-- Trades: Participants can update their trades
CREATE POLICY "Participants can update trades"
  ON trades FOR UPDATE
  USING (auth.uid()::text IN (
    SELECT clerk_user_id FROM profiles WHERE id = proposer_id
    UNION
    SELECT clerk_user_id FROM profiles WHERE id = recipient_id
  ));

-- Trade items: Users can see items in their trades
CREATE POLICY "Users can view trade items"
  ON trade_items FOR SELECT
  USING (trade_id IN (
    SELECT id FROM trades WHERE auth.uid()::text IN (
      SELECT clerk_user_id FROM profiles WHERE id = proposer_id
      UNION
      SELECT clerk_user_id FROM profiles WHERE id = recipient_id
    )
  ));

-- Trade items: Proposer can add items when creating
CREATE POLICY "Proposer can add trade items"
  ON trade_items FOR INSERT
  WITH CHECK (trade_id IN (
    SELECT id FROM trades WHERE auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE id = proposer_id)
  ));
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260128_trading_phase1.sql
git commit -m "feat(trading): add trades and trade_items tables with RLS"
```

---

### Task 1.3: Create trade types

**Files:**
- Create: `src/types/trade.ts`

**Step 1: Write the types file**

```typescript
import { SellerProfile } from "./auction";

// Trade status enum
export type TradeStatus =
  | "proposed"
  | "accepted"
  | "shipped"
  | "completed"
  | "cancelled"
  | "declined";

// Shipping carriers
export type ShippingCarrier =
  | "usps"
  | "ups"
  | "fedex"
  | "dhl"
  | "other";

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
    case "proposed": return "Proposed";
    case "accepted": return "Accepted";
    case "shipped": return "Shipping";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "declined": return "Declined";
    default: return status;
  }
}

export function getTradeStatusColor(status: TradeStatus): string {
  switch (status) {
    case "proposed": return "bg-yellow-100 text-yellow-800";
    case "accepted": return "bg-blue-100 text-blue-800";
    case "shipped": return "bg-purple-100 text-purple-800";
    case "completed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-gray-100 text-gray-800";
    case "declined": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function canCancelTrade(trade: Trade, userId: string): boolean {
  // Can cancel if proposed (proposer only) or accepted (either party)
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
  if (trade.proposerId === userId && !trade.proposerReceivedAt && trade.recipientShippedAt) return true;
  if (trade.recipientId === userId && !trade.recipientReceivedAt && trade.proposerShippedAt) return true;
  return false;
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/types/trade.ts
git commit -m "feat(trading): add trade types and helper functions"
```

---

### Task 1.4: Add "For Trade" toggle to ComicDetailModal

**Files:**
- Modify: `src/components/ComicDetailModal.tsx`

**Step 1: Add forTrade state and toggle handler**

Find the state declarations near line 92-113 and add:

```typescript
const [isForTrade, setIsForTrade] = useState(item.forTrade || false);
const [isUpdatingTrade, setIsUpdatingTrade] = useState(false);
```

Add toggle handler after the existing handlers:

```typescript
const handleToggleForTrade = async () => {
  setIsUpdatingTrade(true);
  try {
    const response = await fetch(`/api/comics/${item.id}/for-trade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forTrade: !isForTrade }),
    });
    if (response.ok) {
      setIsForTrade(!isForTrade);
    }
  } catch (error) {
    console.error("Error toggling for trade:", error);
  } finally {
    setIsUpdatingTrade(false);
  }
};
```

**Step 2: Add UI toggle in the modal actions section**

Find the action buttons section (around line 450+) and add the toggle:

```tsx
{/* For Trade Toggle */}
<button
  onClick={handleToggleForTrade}
  disabled={isUpdatingTrade}
  className={`flex items-center gap-2 px-4 py-2 border-2 border-pop-black font-bold transition-all ${
    isForTrade
      ? "bg-pop-orange text-white shadow-[2px_2px_0px_#000]"
      : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
  }`}
>
  <ArrowLeftRight className="w-4 h-4" />
  {isUpdatingTrade ? "Updating..." : isForTrade ? "For Trade" : "Mark for Trade"}
</button>
```

**Step 3: Add ArrowLeftRight import**

Add to lucide-react imports at top of file:

```typescript
import { ArrowLeftRight } from "lucide-react";
```

**Step 4: Run typecheck**

```bash
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/components/ComicDetailModal.tsx
git commit -m "feat(trading): add For Trade toggle to comic detail modal"
```

---

### Task 1.5: Create for-trade API endpoint

**Files:**
- Create: `src/app/api/comics/[comicId]/for-trade/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// PATCH - Toggle for_trade status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ comicId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { comicId } = await params;
    const { forTrade } = await request.json();

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify comic belongs to user
    const { data: comic, error: fetchError } = await supabase
      .from("comics")
      .select("id, user_id")
      .eq("id", comicId)
      .single();

    if (fetchError || !comic) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    if (comic.user_id !== profile.id) {
      return NextResponse.json({ error: "Not your comic" }, { status: 403 });
    }

    // Update for_trade status
    const { error: updateError } = await supabase
      .from("comics")
      .update({ for_trade: forTrade })
      .eq("id", comicId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, forTrade });
  } catch (error) {
    console.error("Error updating for_trade:", error);
    return NextResponse.json(
      { error: "Failed to update trade status" },
      { status: 500 }
    );
  }
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/app/api/comics/\[comicId\]/for-trade/route.ts
git commit -m "feat(trading): add API endpoint for toggling for_trade status"
```

---

### Task 1.6: Update CollectionItem type to include forTrade

**Files:**
- Modify: `src/types/comic.ts`

**Step 1: Find CollectionItem interface and add forTrade**

Add to the CollectionItem interface:

```typescript
forTrade?: boolean;
acquiredVia?: "scan" | "import" | "purchase" | "trade";
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/types/comic.ts
git commit -m "feat(trading): add forTrade and acquiredVia to CollectionItem type"
```

---

### Task 1.7: Update db.ts to include forTrade in comic queries

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Find transformDbComicToCollectionItem function**

Add forTrade and acquiredVia to the transformation:

```typescript
forTrade: dbComic.for_trade || false,
acquiredVia: dbComic.acquired_via || "scan",
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(trading): include forTrade in comic transformations"
```

---

### Task 1.8: Add "For Trade" tab to Shop page

**Files:**
- Modify: `src/app/shop/page.tsx`

**Step 1: Update ShopTab type**

```typescript
type ShopTab = "buy-now" | "auctions" | "for-trade";
```

**Step 2: Add state for tradeable comics**

```typescript
// Tradeable comics state
const [tradeableComics, setTradeableComics] = useState<TradeableComic[]>([]);
const [isLoadingTradeable, setIsLoadingTradeable] = useState(false);
const [tradeSearchQuery, setTradeSearchQuery] = useState("");
```

**Step 3: Add TradeableComic interface at top of file**

```typescript
interface TradeableComic {
  id: string;
  title: string;
  issueNumber: string;
  publisher: string;
  coverImageUrl?: string;
  grade?: string;
  estimatedValue?: number;
  owner: {
    id: string;
    displayName: string;
    username?: string;
    rating?: number;
    tradeCount?: number;
  };
}
```

**Step 4: Add loadTradeableComics function**

```typescript
const loadTradeableComics = async () => {
  setIsLoadingTradeable(true);
  try {
    const response = await fetch("/api/trades/available");
    if (response.ok) {
      const data = await response.json();
      setTradeableComics(data.comics || []);
    }
  } catch (error) {
    console.error("Error loading tradeable comics:", error);
  } finally {
    setIsLoadingTradeable(false);
  }
};
```

**Step 5: Add useEffect to load on tab change**

```typescript
useEffect(() => {
  if (activeTab === "for-trade") {
    loadTradeableComics();
  }
}, [activeTab]);
```

**Step 6: Add tab button in UI**

After the Auctions button, add:

```tsx
<button
  onClick={() => setActiveTab("for-trade")}
  className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-pop-black transition-all ${
    activeTab === "for-trade"
      ? "bg-pop-orange text-white shadow-[3px_3px_0px_#000]"
      : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
  }`}
>
  <ArrowLeftRight className="w-4 h-4" />
  For Trade
</button>
```

**Step 7: Add ArrowLeftRight import**

```typescript
import { ArrowLeftRight } from "lucide-react";
```

**Step 8: Add For Trade content section**

After the auctions content block, add the for-trade section (similar structure to buy-now but with trade-specific cards).

**Step 9: Run typecheck**

```bash
npm run typecheck
```

**Step 10: Commit**

```bash
git add src/app/shop/page.tsx
git commit -m "feat(trading): add For Trade tab to Shop page"
```

---

### Task 1.9: Create available trades API endpoint

**Files:**
- Create: `src/app/api/trades/available/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// GET - Get all comics marked for trade (excluding user's own)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Get current user's profile ID to exclude their comics
    let excludeUserId: string | null = null;
    if (userId) {
      const profile = await getProfileByClerkId(userId);
      if (profile) {
        excludeUserId = profile.id;
      }
    }

    // Query comics marked for trade
    let query = supabase
      .from("comics")
      .select(`
        id,
        title,
        issue_number,
        publisher,
        cover_image_url,
        grade,
        estimated_value,
        user_id,
        profiles!comics_user_id_fkey (
          id,
          display_name,
          username,
          seller_rating,
          seller_rating_count
        )
      `)
      .eq("for_trade", true)
      .order("updated_at", { ascending: false })
      .limit(100);

    // Exclude current user's comics
    if (excludeUserId) {
      query = query.neq("user_id", excludeUserId);
    }

    const { data: comics, error } = await query;

    if (error) throw error;

    // Transform to response format
    const transformed = (comics || []).map((comic: any) => ({
      id: comic.id,
      title: comic.title,
      issueNumber: comic.issue_number,
      publisher: comic.publisher,
      coverImageUrl: comic.cover_image_url,
      grade: comic.grade,
      estimatedValue: comic.estimated_value,
      owner: {
        id: comic.profiles?.id,
        displayName: comic.profiles?.display_name || "Collector",
        username: comic.profiles?.username,
        rating: comic.profiles?.seller_rating,
        ratingCount: comic.profiles?.seller_rating_count,
      },
    }));

    return NextResponse.json({ comics: transformed });
  } catch (error) {
    console.error("Error fetching tradeable comics:", error);
    return NextResponse.json(
      { error: "Failed to fetch tradeable comics" },
      { status: 500 }
    );
  }
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/app/api/trades/available/route.ts
git commit -m "feat(trading): add API endpoint for available tradeable comics"
```

---

### Task 1.10: Create TradeableComicCard component

**Files:**
- Create: `src/components/trading/TradeableComicCard.tsx`

**Step 1: Write the component**

```typescript
"use client";

import Image from "next/image";

import { ArrowLeftRight, Star } from "lucide-react";

interface TradeableComicCardProps {
  comic: {
    id: string;
    title: string;
    issueNumber: string;
    publisher: string;
    coverImageUrl?: string;
    grade?: string;
    estimatedValue?: number;
    owner: {
      id: string;
      displayName: string;
      username?: string;
      rating?: number;
      ratingCount?: number;
    };
  };
  onClick: () => void;
}

export function TradeableComicCard({ comic, onClick }: TradeableComicCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-pop-white border-3 border-pop-black cursor-pointer transition-all hover:shadow-[4px_4px_0px_#000] hover:-translate-y-1"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-gray-100">
        {comic.coverImageUrl ? (
          <Image
            src={comic.coverImageUrl}
            alt={`${comic.title} #${comic.issueNumber}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {/* For Trade Badge */}
        <div className="absolute top-2 right-2 bg-pop-orange text-white px-2 py-1 text-xs font-bold border-2 border-pop-black">
          <ArrowLeftRight className="w-3 h-3 inline mr-1" />
          FOR TRADE
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <h3 className="font-bold text-sm line-clamp-1">{comic.title}</h3>
        <p className="text-xs text-gray-600">#{comic.issueNumber}</p>

        {comic.grade && (
          <p className="text-xs text-gray-500 mt-1">Grade: {comic.grade}</p>
        )}

        {comic.estimatedValue && (
          <p className="text-sm font-bold text-pop-green mt-1">
            ~${comic.estimatedValue.toFixed(0)}
          </p>
        )}

        {/* Owner Info */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 truncate">
            {comic.owner.displayName}
          </p>
          {comic.owner.rating !== undefined && comic.owner.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs">
                {comic.owner.rating.toFixed(1)}
                {comic.owner.ratingCount && (
                  <span className="text-gray-400"> ({comic.owner.ratingCount})</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create index export**

Create `src/components/trading/index.ts`:

```typescript
export { TradeableComicCard } from "./TradeableComicCard";
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/components/trading/
git commit -m "feat(trading): add TradeableComicCard component"
```

---

## Phase 1 Complete Checkpoint

After completing all Phase 1 tasks:

1. **Verify migration applied** - Check Supabase for new columns/tables
2. **Test for_trade toggle** - Toggle a comic and verify DB updates
3. **Test Shop tab** - Visit /shop?tab=for-trade and see tradeable comics
4. **Run full typecheck** - `npm run typecheck`
5. **Run tests** - `npm test`
6. **Commit checkpoint** - `git commit -m "feat(trading): complete Phase 1 foundation"`

---

## Phase 2: Trade Workflow

### Task 2.1: Create trades database helper functions

**Files:**
- Create: `src/lib/tradingDb.ts`

**Step 1: Write the database helper**

```typescript
import { supabase, supabaseAdmin } from "./supabase";
import { getSellerProfile } from "./auctionDb";
import {
  Trade,
  TradeItem,
  TradePreview,
  CreateTradeInput,
  UpdateTradeInput,
  TradeStatus,
} from "@/types/trade";

// ============================================================================
// TRADE HELPERS
// ============================================================================

/**
 * Create a new trade proposal
 */
export async function createTrade(
  proposerId: string,
  input: CreateTradeInput
): Promise<Trade> {
  // Start a transaction-like operation
  // 1. Create the trade
  const { data: trade, error: tradeError } = await supabaseAdmin
    .from("trades")
    .insert({
      proposer_id: proposerId,
      recipient_id: input.recipientId,
      status: "proposed",
    })
    .select()
    .single();

  if (tradeError) throw tradeError;

  // 2. Add proposer's items
  const proposerItems = input.myComicIds.map((comicId) => ({
    trade_id: trade.id,
    comic_id: comicId,
    owner_id: proposerId,
  }));

  // 3. Add recipient's items
  const recipientItems = input.theirComicIds.map((comicId) => ({
    trade_id: trade.id,
    comic_id: comicId,
    owner_id: input.recipientId,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("trade_items")
    .insert([...proposerItems, ...recipientItems]);

  if (itemsError) {
    // Rollback: delete the trade
    await supabaseAdmin.from("trades").delete().eq("id", trade.id);
    throw itemsError;
  }

  return transformDbTrade(trade);
}

/**
 * Get a trade by ID with all details
 */
export async function getTradeById(
  tradeId: string,
  userId: string
): Promise<Trade | null> {
  const { data: trade, error } = await supabase
    .from("trades")
    .select(`
      *,
      trade_items (
        id,
        comic_id,
        owner_id,
        comics (
          id,
          title,
          issue_number,
          publisher,
          cover_image_url,
          grade,
          estimated_value
        )
      )
    `)
    .eq("id", tradeId)
    .single();

  if (error || !trade) return null;

  // Get participant profiles
  const [proposer, recipient] = await Promise.all([
    getSellerProfile(trade.proposer_id),
    getSellerProfile(trade.recipient_id),
  ]);

  return transformDbTradeWithDetails(trade, proposer, recipient);
}

/**
 * Get all trades for a user
 */
export async function getUserTrades(
  userId: string,
  status?: TradeStatus[]
): Promise<TradePreview[]> {
  let query = supabase
    .from("trades")
    .select(`
      *,
      trade_items (
        id,
        comic_id,
        owner_id,
        comics (
          id,
          title,
          issue_number,
          publisher,
          cover_image_url,
          grade,
          estimated_value
        )
      )
    `)
    .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (status && status.length > 0) {
    query = query.in("status", status);
  }

  const { data: trades, error } = await query;

  if (error) throw error;
  if (!trades) return [];

  // Build previews
  const previews: TradePreview[] = [];
  for (const trade of trades) {
    const isProposer = trade.proposer_id === userId;
    const otherUserId = isProposer ? trade.recipient_id : trade.proposer_id;

    const otherUser = await getSellerProfile(otherUserId);
    if (!otherUser) continue;

    const items = trade.trade_items || [];
    const myItems = items
      .filter((i: any) => i.owner_id === userId)
      .map(transformDbTradeItem);
    const theirItems = items
      .filter((i: any) => i.owner_id !== userId)
      .map(transformDbTradeItem);

    previews.push({
      id: trade.id,
      status: trade.status,
      otherUser,
      myItems,
      theirItems,
      createdAt: trade.created_at,
      updatedAt: trade.updated_at,
      isProposer,
    });
  }

  return previews;
}

/**
 * Update trade status
 */
export async function updateTradeStatus(
  tradeId: string,
  userId: string,
  updates: UpdateTradeInput
): Promise<Trade> {
  // First verify user is participant
  const { data: trade } = await supabase
    .from("trades")
    .select("proposer_id, recipient_id, status")
    .eq("id", tradeId)
    .single();

  if (!trade) throw new Error("Trade not found");
  if (trade.proposer_id !== userId && trade.recipient_id !== userId) {
    throw new Error("Not a participant");
  }

  // Build update object
  const updateData: Record<string, any> = {};

  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancel_reason = updates.cancelReason;
    }
    if (updates.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
  }

  // Handle shipping updates based on which user
  if (updates.trackingNumber) {
    if (trade.proposer_id === userId) {
      updateData.proposer_tracking_carrier = updates.trackingCarrier;
      updateData.proposer_tracking_number = updates.trackingNumber;
      updateData.proposer_shipped_at = new Date().toISOString();
    } else {
      updateData.recipient_tracking_carrier = updates.trackingCarrier;
      updateData.recipient_tracking_number = updates.trackingNumber;
      updateData.recipient_shipped_at = new Date().toISOString();
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("trades")
    .update(updateData)
    .eq("id", tradeId)
    .select()
    .single();

  if (error) throw error;

  return transformDbTrade(updated);
}

/**
 * Complete a trade - swap comic ownership
 */
export async function completeTrade(tradeId: string): Promise<void> {
  // Get trade items
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("trade_items")
    .select("comic_id, owner_id, trade_id")
    .eq("trade_id", tradeId);

  if (itemsError) throw itemsError;

  // Get the trade to know proposer/recipient
  const { data: trade } = await supabaseAdmin
    .from("trades")
    .select("proposer_id, recipient_id")
    .eq("id", tradeId)
    .single();

  if (!trade) throw new Error("Trade not found");

  // Swap ownership for each comic
  for (const item of items || []) {
    const newOwnerId = item.owner_id === trade.proposer_id
      ? trade.recipient_id
      : trade.proposer_id;

    await supabaseAdmin
      .from("comics")
      .update({
        user_id: newOwnerId,
        for_trade: false,
        acquired_via: "trade",
      })
      .eq("id", item.comic_id);
  }

  // Mark trade as completed
  await supabaseAdmin
    .from("trades")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", tradeId);
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformDbTrade(db: any): Trade {
  return {
    id: db.id,
    proposerId: db.proposer_id,
    recipientId: db.recipient_id,
    status: db.status,
    proposerTrackingCarrier: db.proposer_tracking_carrier,
    proposerTrackingNumber: db.proposer_tracking_number,
    recipientTrackingCarrier: db.recipient_tracking_carrier,
    recipientTrackingNumber: db.recipient_tracking_number,
    proposerShippedAt: db.proposer_shipped_at,
    recipientShippedAt: db.recipient_shipped_at,
    proposerReceivedAt: db.proposer_received_at,
    recipientReceivedAt: db.recipient_received_at,
    completedAt: db.completed_at,
    cancelledAt: db.cancelled_at,
    cancelReason: db.cancel_reason,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function transformDbTradeWithDetails(db: any, proposer: any, recipient: any): Trade {
  const trade = transformDbTrade(db);
  const items = db.trade_items || [];

  return {
    ...trade,
    proposer,
    recipient,
    proposerItems: items
      .filter((i: any) => i.owner_id === db.proposer_id)
      .map(transformDbTradeItem),
    recipientItems: items
      .filter((i: any) => i.owner_id === db.recipient_id)
      .map(transformDbTradeItem),
  };
}

function transformDbTradeItem(db: any): TradeItem {
  return {
    id: db.id,
    tradeId: db.trade_id,
    comicId: db.comic_id,
    ownerId: db.owner_id,
    comic: db.comics ? {
      id: db.comics.id,
      title: db.comics.title,
      issueNumber: db.comics.issue_number,
      publisher: db.comics.publisher,
      coverImageUrl: db.comics.cover_image_url,
      grade: db.comics.grade,
      estimatedValue: db.comics.estimated_value,
    } : undefined,
    createdAt: db.created_at,
  };
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/lib/tradingDb.ts
git commit -m "feat(trading): add trading database helper functions"
```

---

### Task 2.2: Create trades API routes

**Files:**
- Create: `src/app/api/trades/route.ts`
- Create: `src/app/api/trades/[tradeId]/route.ts`

**Step 1: Write main trades route**

```typescript
// src/app/api/trades/route.ts
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { createTrade, getUserTrades } from "@/lib/tradingDb";
import { CreateTradeInput, TradeStatus } from "@/types/trade";

// GET - Get user's trades
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam
      ? (statusParam.split(",") as TradeStatus[])
      : undefined;

    const trades = await getUserTrades(profile.id, status);

    return NextResponse.json({ trades, total: trades.length });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

// POST - Create a new trade proposal
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

    const body: CreateTradeInput = await request.json();

    // Validation
    if (!body.recipientId) {
      return NextResponse.json(
        { error: "Recipient required" },
        { status: 400 }
      );
    }
    if (!body.myComicIds?.length || !body.theirComicIds?.length) {
      return NextResponse.json(
        { error: "Must include comics from both parties" },
        { status: 400 }
      );
    }

    const trade = await createTrade(profile.id, body);

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    console.error("Error creating trade:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}
```

**Step 2: Write individual trade route**

```typescript
// src/app/api/trades/[tradeId]/route.ts
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { getTradeById, updateTradeStatus, completeTrade } from "@/lib/tradingDb";
import { UpdateTradeInput } from "@/types/trade";

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
    return NextResponse.json(
      { error: "Failed to fetch trade" },
      { status: 500 }
    );
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

    const body: UpdateTradeInput = await request.json();

    const trade = await updateTradeStatus(tradeId, profile.id, body);

    // Check if trade should be completed (both confirmed receipt)
    if (body.status === "shipped") {
      const fullTrade = await getTradeById(tradeId, profile.id);
      if (fullTrade?.proposerReceivedAt && fullTrade?.recipientReceivedAt) {
        await completeTrade(tradeId);
      }
    }

    return NextResponse.json({ trade });
  } catch (error) {
    console.error("Error updating trade:", error);
    return NextResponse.json(
      { error: "Failed to update trade" },
      { status: 500 }
    );
  }
}
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/app/api/trades/route.ts src/app/api/trades/\[tradeId\]/route.ts
git commit -m "feat(trading): add trades API routes"
```

---

### Task 2.3: Create /trades page

**Files:**
- Create: `src/app/trades/page.tsx`

**Step 1: Write the trades page**

```typescript
"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";

import { useAuth } from "@clerk/nextjs";

import { ArrowLeftRight, CheckCircle, Clock, History, Package } from "lucide-react";

import { TradePreview, TradeStatus, getTradeStatusLabel, getTradeStatusColor } from "@/types/trade";
import { TradeCard } from "@/components/trading/TradeCard";

type TradesTab = "active" | "history";

export default function TradesPage() {
  return (
    <Suspense fallback={<TradesPageSkeleton />}>
      <TradesPageContent />
    </Suspense>
  );
}

function TradesPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

function TradesPageContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<TradesTab>("active");
  const [trades, setTrades] = useState<TradePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadTrades();
    }
  }, [isLoaded, isSignedIn, activeTab]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const statuses = activeTab === "active"
        ? "proposed,accepted,shipped"
        : "completed,cancelled,declined";

      const response = await fetch(`/api/trades?status=${statuses}`);
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return <TradesPageSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to view trades</h1>
          <Link href="/sign-in" className="text-pop-blue underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-black text-pop-black font-comic">TRADES</h1>
        <p className="text-gray-600 mt-1">Manage your comic trades</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-pop-black transition-all ${
              activeTab === "active"
                ? "bg-pop-orange text-white shadow-[3px_3px_0px_#000]"
                : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
            }`}
          >
            <Package className="w-4 h-4" />
            Active
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-pop-black transition-all ${
              activeTab === "history"
                ? "bg-pop-blue text-white shadow-[3px_3px_0px_#000]"
                : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-32 animate-pulse" />
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div
              className="bg-pop-white border-3 border-pop-black p-12 text-center"
              style={{ boxShadow: "4px 4px 0px #000" }}
            >
              <div className="w-16 h-16 bg-pop-yellow border-3 border-pop-black flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-8 h-8 text-pop-black" />
              </div>
              <p className="text-xl font-black text-pop-black font-comic uppercase">
                {activeTab === "active" ? "No active trades" : "No trade history"}
              </p>
              <p className="mt-2 text-gray-600">
                {activeTab === "active"
                  ? "Start trading by browsing the Shop's For Trade tab"
                  : "Your completed trades will appear here"}
              </p>
              {activeTab === "active" && (
                <Link
                  href="/shop?tab=for-trade"
                  className="inline-block mt-4 px-6 py-2 bg-pop-orange text-white font-bold border-2 border-pop-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Browse Trades
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onStatusChange={loadTrades}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/app/trades/page.tsx
git commit -m "feat(trading): add /trades page"
```

---

### Task 2.4: Create TradeCard component

**Files:**
- Create: `src/components/trading/TradeCard.tsx`

**Step 1: Write the component**

```typescript
"use client";

import { useState } from "react";

import Image from "next/image";

import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  Star,
  Truck,
  X,
} from "lucide-react";

import { TradePreview, getTradeStatusLabel, getTradeStatusColor } from "@/types/trade";

interface TradeCardProps {
  trade: TradePreview;
  onStatusChange: () => void;
}

export function TradeCard({ trade, onStatusChange }: TradeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (action: string, data?: Record<string, any>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, ...data }),
      });
      if (response.ok) {
        onStatusChange();
      }
    } catch (error) {
      console.error("Error updating trade:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="bg-pop-white border-3 border-pop-black"
      style={{ boxShadow: "4px 4px 0px #000" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Other user info */}
          <div>
            <p className="font-bold">{trade.otherUser.displayName}</p>
            {trade.otherUser.rating !== undefined && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                {trade.otherUser.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span className={`px-3 py-1 text-sm font-bold rounded ${getTradeStatusColor(trade.status)}`}>
            {getTradeStatusLabel(trade.status)}
          </span>

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>

      {/* Comic previews (always shown) */}
      <div className="px-4 pb-4 flex items-center gap-4">
        {/* My items */}
        <div className="flex -space-x-2">
          {trade.myItems.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="w-12 h-16 border-2 border-pop-black bg-gray-100 overflow-hidden"
            >
              {item.comic?.coverImageUrl && (
                <Image
                  src={item.comic.coverImageUrl}
                  alt={item.comic.title}
                  width={48}
                  height={64}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
          ))}
          {trade.myItems.length > 3 && (
            <div className="w-12 h-16 border-2 border-pop-black bg-gray-200 flex items-center justify-center text-xs font-bold">
              +{trade.myItems.length - 3}
            </div>
          )}
        </div>

        <ArrowLeftRight className="w-6 h-6 text-gray-400" />

        {/* Their items */}
        <div className="flex -space-x-2">
          {trade.theirItems.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="w-12 h-16 border-2 border-pop-black bg-gray-100 overflow-hidden"
            >
              {item.comic?.coverImageUrl && (
                <Image
                  src={item.comic.coverImageUrl}
                  alt={item.comic.title}
                  width={48}
                  height={64}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
          ))}
          {trade.theirItems.length > 3 && (
            <div className="w-12 h-16 border-2 border-pop-black bg-gray-200 flex items-center justify-center text-xs font-bold">
              +{trade.theirItems.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t-3 border-pop-black p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* You're giving */}
            <div>
              <h4 className="font-bold text-sm text-gray-600 mb-2">You&apos;re Giving</h4>
              <div className="space-y-2">
                {trade.myItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-10 h-14 border border-gray-200 bg-gray-50 overflow-hidden">
                      {item.comic?.coverImageUrl && (
                        <Image
                          src={item.comic.coverImageUrl}
                          alt={item.comic.title}
                          width={40}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{item.comic?.title}</p>
                      <p className="text-gray-500">#{item.comic?.issueNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* You're getting */}
            <div>
              <h4 className="font-bold text-sm text-gray-600 mb-2">You&apos;re Getting</h4>
              <div className="space-y-2">
                {trade.theirItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-10 h-14 border border-gray-200 bg-gray-50 overflow-hidden">
                      {item.comic?.coverImageUrl && (
                        <Image
                          src={item.comic.coverImageUrl}
                          alt={item.comic.title}
                          width={40}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{item.comic?.title}</p>
                      <p className="text-gray-500">#{item.comic?.issueNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
            {trade.status === "proposed" && !trade.isProposer && (
              <>
                <button
                  onClick={() => handleAction("accepted")}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-pop-green text-white font-bold border-2 border-pop-black shadow-[2px_2px_0px_#000]"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleAction("declined")}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-pop-red text-white font-bold border-2 border-pop-black shadow-[2px_2px_0px_#000]"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </>
            )}

            {trade.status === "accepted" && (
              <button
                onClick={() => handleAction("shipped")}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-pop-blue text-white font-bold border-2 border-pop-black shadow-[2px_2px_0px_#000]"
              >
                <Truck className="w-4 h-4" />
                Mark as Shipped
              </button>
            )}

            {(trade.status === "proposed" || trade.status === "accepted") && (
              <button
                onClick={() => handleAction("cancelled", { cancelReason: "Changed mind" })}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 font-bold border-2 border-pop-black"
              >
                Cancel Trade
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update trading index export**

```typescript
// src/components/trading/index.ts
export { TradeableComicCard } from "./TradeableComicCard";
export { TradeCard } from "./TradeCard";
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/components/trading/
git commit -m "feat(trading): add TradeCard component"
```

---

This plan continues with Tasks 2.5-2.10 for the rest of Phase 2, then Phases 3-4. The full implementation follows the same pattern of bite-sized tasks.

**Plan saved to:** `docs/plans/2026-01-28-book-trading.md`

Ready to begin execution using subagent-driven development?
