# Book Trading Feature - Design Document

> **Created:** January 28, 2026
> **Status:** Approved

## Overview

Allow users to swap comics directly without money. Users mark comics as "available for trade," discover potential trades via Shop or automatic matching, negotiate via messaging, then complete trades with shipment confirmation and ownership transfer.

## Core Decisions

| Feature | Decision |
|---------|----------|
| Primary Use Case | Online discovery + some in-person/convention |
| Discovery | "For Trade" flag + Hunt List matching |
| Proposals | Multi-comic trades, no cash |
| Matching | Real-time, ranked by rating/trade count, grouped notifications |
| Workflow | Chat → Propose → Accept → Ship → Confirm Receipt → Complete |
| Shipping | Status tracking + optional carrier/tracking numbers |
| Completion | Ownership swap when both users confirm receipt |
| Disputes | Deferred to Terms of Service (platform not responsible) |
| UI | New `/trades` page + "For Trade" tab in Shop |
| Ratings | Reuse existing seller rating system |

---

## Data Model

### New Tables

**trades**
```sql
trades
├── id (UUID, PK)
├── proposer_id (UUID, FK profiles)
├── recipient_id (UUID, FK profiles)
├── status (proposed | accepted | shipped | completed | cancelled)
├── proposer_tracking_carrier (TEXT, nullable)
├── proposer_tracking_number (TEXT, nullable)
├── recipient_tracking_carrier (TEXT, nullable)
├── recipient_tracking_number (TEXT, nullable)
├── proposer_shipped_at (TIMESTAMPTZ, nullable)
├── recipient_shipped_at (TIMESTAMPTZ, nullable)
├── proposer_received_at (TIMESTAMPTZ, nullable)
├── recipient_received_at (TIMESTAMPTZ, nullable)
├── completed_at (TIMESTAMPTZ, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
```

**trade_items**
```sql
trade_items
├── id (UUID, PK)
├── trade_id (UUID, FK trades)
├── comic_id (UUID, FK comics)
├── owner_id (UUID, FK profiles) -- who is giving this comic
├── created_at (TIMESTAMPTZ)
```

**trade_matches**
```sql
trade_matches
├── id (UUID, PK)
├── user_a_id (UUID, FK profiles)
├── user_b_id (UUID, FK profiles)
├── user_a_comic_id (UUID, FK comics) -- comic A has that B wants
├── user_b_comic_id (UUID, FK comics) -- comic B has that A wants
├── quality_score (INTEGER) -- for ranking
├── status (pending | viewed | dismissed | traded)
├── notified_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
```

### Changes to Existing Tables

**comics**
```sql
ALTER TABLE comics ADD COLUMN for_trade BOOLEAN DEFAULT false;
ALTER TABLE comics ADD COLUMN acquired_via TEXT DEFAULT 'scan'; -- scan | import | purchase | trade
```

---

## Matching System

### Match Criteria

A match occurs when:
- User A has Comic X marked `for_trade = true`
- User A has Comic Y on their Hunt List
- User B has Comic Y marked `for_trade = true`
- User B has Comic X on their Hunt List

### Real-time Triggers

Matching runs immediately when:
1. A user marks a comic as "for trade"
2. A user adds a comic to their Hunt List

### Match Quality Scoring

Matches ranked by:
1. Seller rating percentage (higher = better)
2. Completed trade count (more = better)
3. Account age (older = more established)

### Multiple Matches

When multiple users match for the same comic:
- All matches created and stored
- Grouped into single notification: "You have 3 trade matches for [Comic]"
- Trades page shows matches grouped by comic, sorted by quality score

---

## Trade Workflow

### Step-by-Step Flow

1. **Discovery**
   - User finds comic via Shop "For Trade" tab
   - OR user receives match notification

2. **Conversation**
   - User messages comic owner
   - Discuss condition (share photos), shipping, etc.

3. **Propose Trade**
   - From conversation, click "Propose Trade"
   - Select comics to offer (from own for-trade comics)
   - Confirm comics requesting
   - Submit proposal

4. **Review & Accept**
   - Recipient sees proposal in conversation + Trades page
   - Options: Accept / Decline / Counter
   - Counter = modify comic selection, send back
   - Accept → Status: "Accepted - Ship Your Comics"

5. **Ship**
   - Both users mark as shipped
   - Enter optional carrier + tracking number
   - Status: "You shipped" / "They shipped" / "Both shipped"

6. **Confirm Receipt**
   - Both users confirm they received comics
   - First: "Awaiting other party"
   - Both confirmed: Trade Complete

7. **Completion**
   - Comics swap ownership in database
   - Both users prompted to rate each other
   - Comics removed from Hunt Lists if applicable

---

## UI Components & Pages

### New Pages

**Trades Page (`/trades`)**

Three tabs:
- **Matches** - Grouped match cards sorted by quality score
- **Active** - Trades in progress (proposed, accepted, shipping)
- **History** - Completed and cancelled trades

**Shop "For Trade" Tab (`/shop?tab=trade`)**
- Grid of comics marked for trade
- Filter by publisher, title, grade
- Card shows: cover, title, issue, owner's rating
- Click → Detail modal with "Message to Trade" button

### New Components

**TradeProposalModal**
- Left side: "You're offering" (your for-trade comics)
- Right side: "You're requesting" (their comics)
- Summary + "Propose Trade" button

**TradeCard**
- Both users' comics displayed
- Status badge
- Tracking info when available
- Action buttons based on status

**TradeMatchCard**
- Your comic thumbnail + match count
- Expandable list of matched users with ratings
- "Message" button per user

### Collection Changes

- "For Trade" toggle on comic detail modal
- "For Trade" filter in collection view
- Trade icon badge on for-trade comics

---

## Notifications

| Type | Trigger | Message |
|------|---------|---------|
| `trade_matches` | Match found | "You have X trade matches for [Comic]" |
| `trade_proposed` | Proposal received | "@user proposed a trade for your [Comic]" |
| `trade_accepted` | Proposal accepted | "@user accepted your trade proposal" |
| `trade_declined` | Proposal declined | "@user declined your trade proposal" |
| `trade_countered` | Counter-proposal | "@user countered your trade proposal" |
| `trade_shipped` | Other party ships | "@user shipped their comics" |
| `trade_received` | Other confirms receipt | "@user received your comics" |
| `trade_completed` | Both confirmed | "Trade complete! [Comic] added to collection" |

---

## Integration Points

### Messaging
- Trade proposals appear as special messages in conversation
- "Propose Trade" button in MessageThread header
- Status updates posted to conversation automatically

### Ratings
- After completion, both users prompted to rate
- Reuses existing `seller_ratings` table
- Ratings count toward overall seller score

### Hunt List
- Comic received via trade auto-removed from Hunt List
- "For Trade" comics can show "X users want this" count

### Collection
- Completed trade = comic moves to new owner
- Original data preserved (purchase_price, notes, grade)
- `acquired_via` field tracks how comic was obtained

---

## Implementation Phases

### Phase 1: Foundation (~1 session)
- Add `for_trade` column to comics table
- Create `trades` and `trade_items` tables
- "For Trade" toggle in comic detail modal
- "For Trade" tab in Shop with basic grid
- TradeCard and TradeProposalModal components

### Phase 2: Trade Workflow (~1-2 sessions)
- Propose/Accept/Decline/Counter flow
- Trade status tracking
- Shipping confirmation with tracking fields
- Comic ownership swap on completion
- Rating prompts after completion

### Phase 3: Matching System (~1 session)
- Create `trade_matches` table
- Real-time matching triggers
- Match quality scoring
- Grouped match notifications
- Matches tab on Trades page

### Phase 4: Polish & Integration (~1 session)
- Trade proposals embedded in messages
- Auto-status updates in conversation
- "X users want this" badges
- Hunt List auto-removal
- `acquired_via` tracking

---

## Out of Scope (Future)

- Dispute resolution system (defer to ToS)
- Cash + comics hybrid trades
- Trade value estimator/fairness calculator
- Geographic proximity matching
- Trade insurance/protection program

---

## Terms of Service Considerations

The following should be added to ToS:
- Trades are agreements between users
- Collectors Chest does not guarantee trade completion
- Platform is not responsible for non-shipment
- Users trade at their own risk
- Fraudulent trading may result in account suspension
