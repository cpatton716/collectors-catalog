-- Adds infrastructure for the "Auction Ending Soon Reminder" feature.
--
-- 1. `reminder_sent_at` on auctions: idempotency guard so the cron doesn't
--    re-fire the reminder if it runs twice within the same window.
-- 2. Extend the notifications.valid_notification_type CHECK constraint to
--    include `auction_ending_soon_bidder`.
--
-- BACKLOG "Auction Ending Soon Reminder for Active Bidders" — Apr 23, 2026.

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;

ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN (
    -- Auction types
    'outbid', 'won', 'ended', 'payment_reminder', 'rating_request', 'auction_sold', 'payment_received',
    'auction_payment_expired', 'auction_payment_expired_seller', 'bid_auction_lost', 'new_bid_received',
    'auction_ending_soon_bidder',
    -- Shipment
    'shipped',
    -- Offer types
    'offer_received', 'offer_accepted', 'offer_rejected', 'offer_countered', 'offer_expired',
    -- Listing types
    'listing_expiring', 'listing_expired', 'listing_cancelled', 'new_listing_from_followed',
    -- Key info types
    'key_info_approved', 'key_info_rejected',
    -- Second Chance Offer types
    'second_chance_available', 'second_chance_offered', 'second_chance_accepted',
    'second_chance_declined', 'second_chance_expired',
    -- Payment-miss strike system types
    'payment_missed_warning', 'payment_missed_flagged'
  ));
