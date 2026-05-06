-- Adds a `last_head_checked_at` timestamp column to cover_images for the
-- 30-day periodic HEAD-check cron (BACKLOG "Periodic HEAD Check for Cached
-- eBay URLs", Mar 20, 2026). The cron picks rows where this is NULL or
-- older than 30 days, HEAD-checks the URL, and either updates the timestamp
-- (alive) or flips status='rejected' (dead 4xx/5xx).
--
-- Safe to apply: column is NULL-able, no default. Existing rows get NULL
-- and will be picked up by the cron's "never-checked" branch.

ALTER TABLE cover_images
  ADD COLUMN IF NOT EXISTS last_head_checked_at TIMESTAMPTZ;

-- Index supports the cron query that orders by last_head_checked_at NULLS FIRST
-- to prioritize never-checked rows first, then oldest-checked.
CREATE INDEX IF NOT EXISTS idx_cover_images_head_check_due
  ON cover_images (last_head_checked_at NULLS FIRST)
  WHERE status = 'approved';
