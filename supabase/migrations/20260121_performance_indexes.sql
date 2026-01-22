-- Performance Indexes Migration
-- Phase 4: Add indexes for faster queries
-- Date: 2026-01-21

-- Index for username lookups (profile search, validation)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Index for key hunt list lookups (used in wishlist checks)
CREATE INDEX IF NOT EXISTS idx_key_hunt_lists_lookup ON key_hunt_lists(title_normalized, issue_number, user_id);

-- Index for hot books price update queries
CREATE INDEX IF NOT EXISTS idx_hot_books_updated ON hot_books(prices_updated_at);

-- Index for user comic listings (collection page, pagination)
CREATE INDEX IF NOT EXISTS idx_comics_user_created ON comics(user_id, created_at DESC);

-- Index for auction queries by seller
CREATE INDEX IF NOT EXISTS idx_auctions_seller_status ON auctions(seller_id, status);

-- Index for active auction lookups
CREATE INDEX IF NOT EXISTS idx_auctions_status_end ON auctions(status, end_time) WHERE status = 'active';

-- Index for watchlist queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON auction_watchlist(user_id);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Analyze tables to update statistics after index creation
ANALYZE profiles;
ANALYZE key_hunt_lists;
ANALYZE hot_books;
ANALYZE comics;
ANALYZE auctions;
ANALYZE auction_watchlist;
ANALYZE notifications;
