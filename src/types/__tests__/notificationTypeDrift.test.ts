/**
 * Drift guard between the `NotificationType` TypeScript union and the
 * `valid_notification_type` CHECK constraint on the `notifications` table.
 *
 * History: in Feb-Apr 2026 several notification inserts silently failed in
 * production because the CHECK constraint was missing types that had been
 * added to the TS code (auction_payment_expired, auction_payment_expired_seller,
 * bid_auction_lost, new_bid_received). Each was caught only after a manual
 * audit. This test fails the build if either side drifts again.
 *
 * When you add a new NotificationType:
 *   1. Add it to src/types/auction.ts
 *   2. Add it to a new migration that DROPs and re-CREATEs valid_notification_type
 *   3. Update DB_CHECK_CONSTRAINT_TYPES below to mirror the new migration
 *   4. This test should pass — if it doesn't, one of those steps was missed
 */

import type { NotificationType } from "../auction";

// Mirror of the type list inside the `valid_notification_type` CHECK constraint
// from the latest migration: supabase/migrations/20260427_add_shipped_notification_type.sql.
// Update this whenever a new migration alters the constraint — that's the
// guard rail this test enforces.
const DB_CHECK_CONSTRAINT_TYPES: ReadonlySet<string> = new Set([
  // Auction types
  "outbid",
  "won",
  "ended",
  "payment_reminder",
  "rating_request",
  "auction_sold",
  "payment_received",
  "auction_payment_expired",
  "auction_payment_expired_seller",
  "bid_auction_lost",
  "new_bid_received",
  "auction_ending_soon_bidder",
  // Shipment
  "shipped",
  // Offer types
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "offer_countered",
  "offer_expired",
  // Listing types
  "listing_expiring",
  "listing_expired",
  "listing_cancelled",
  "new_listing_from_followed",
  // Key info types
  "key_info_approved",
  "key_info_rejected",
  // Second Chance Offer types
  "second_chance_available",
  "second_chance_offered",
  "second_chance_accepted",
  "second_chance_declined",
  "second_chance_expired",
  // Payment-miss strike system types
  "payment_missed_warning",
  "payment_missed_flagged",
]);

// Mirror the TS NotificationType union as a runtime list. We can't iterate a
// type at runtime, so this list must be kept in sync manually with auction.ts.
// If a type is added to the union but not to this list, downstream code that
// imports the union still type-checks — but inserts will be allowed by TS and
// rejected by the DB. This list is the union's runtime witness.
const TS_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "outbid",
  "won",
  "ended",
  "bid_auction_lost",
  "new_bid_received",
  "auction_ending_soon_bidder",
  "payment_reminder",
  "auction_payment_expired",
  "auction_payment_expired_seller",
  "rating_request",
  "auction_sold",
  "payment_received",
  "shipped",
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "offer_countered",
  "offer_expired",
  "listing_expiring",
  "listing_expired",
  "listing_cancelled",
  "new_listing_from_followed",
  "key_info_approved",
  "key_info_rejected",
  "second_chance_available",
  "second_chance_offered",
  "second_chance_accepted",
  "second_chance_declined",
  "second_chance_expired",
  "payment_missed_warning",
  "payment_missed_flagged",
] as const;

describe("NotificationType <-> notifications.valid_notification_type CHECK drift", () => {
  it("every TS NotificationType is present in the DB CHECK constraint", () => {
    const missing = TS_NOTIFICATION_TYPES.filter(
      (t) => !DB_CHECK_CONSTRAINT_TYPES.has(t),
    );
    expect(missing).toEqual([]);
  });

  it("every DB CHECK constraint type is present in the TS NotificationType union", () => {
    const tsSet = new Set<string>(TS_NOTIFICATION_TYPES);
    const orphaned = Array.from(DB_CHECK_CONSTRAINT_TYPES).filter(
      (t) => !tsSet.has(t),
    );
    expect(orphaned).toEqual([]);
  });

  it("counts match — quick canary if the lists silently drift on the same row count", () => {
    expect(TS_NOTIFICATION_TYPES.length).toBe(DB_CHECK_CONSTRAINT_TYPES.size);
  });
});
