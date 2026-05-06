-- Adds `original_end_time` to auctions so the UI can display the originally
-- scheduled end alongside the (possibly extended) current end_time when
-- sniping protection auto-extends. NULL = auction was never extended.
--
-- Safe to apply: column is NULL-able with no default. Existing rows stay NULL
-- until placeBid first triggers an extension on them.
--
-- BACKLOG "Auction Sniping Protection (Auto-Extend on Late Bids)" — Apr 22, 2026.

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS original_end_time TIMESTAMPTZ;
