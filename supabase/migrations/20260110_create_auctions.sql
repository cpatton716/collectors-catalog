-- ============================================================================
-- AUCTION FEATURE MIGRATION
-- ============================================================================
--
-- This migration adds eBay-style auction functionality including:
-- - Auction listings with proxy bidding
-- - Bid history with anonymization
-- - User watchlists
-- - Seller reputation system
-- - In-app notifications
--
-- ============================================================================

-- ============================================================================
-- STEP 0: CREATE HELPER FUNCTIONS IN PUBLIC SCHEMA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims', true)::json->>'user_id',
    NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
DECLARE
  clerk_id TEXT;
  profile_uuid UUID;
BEGIN
  clerk_id := public.clerk_user_id();

  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO profile_uuid
  FROM profiles
  WHERE clerk_user_id = clerk_id
  LIMIT 1;

  RETURN profile_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.clerk_user_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 1: ADD SELLER PROFILE COLUMNS
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS positive_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_since TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- STEP 2: CREATE AUCTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  starting_price DECIMAL(10,2) NOT NULL DEFAULT 0.99,
  current_bid DECIMAL(10,2) DEFAULT NULL,
  buy_it_now_price DECIMAL(10,2) DEFAULT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winning_bid DECIMAL(10,2) DEFAULT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  detail_images TEXT[] DEFAULT '{}',
  description TEXT DEFAULT NULL,
  bid_count INTEGER DEFAULT 0,
  payment_status TEXT DEFAULT NULL,
  payment_deadline TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_end_time CHECK (end_time > start_time),
  CONSTRAINT valid_status CHECK (status IN ('active', 'ended', 'sold', 'cancelled')),
  CONSTRAINT valid_payment_status CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'shipped', 'completed')),
  CONSTRAINT valid_starting_price CHECK (starting_price >= 0.99)
);

CREATE INDEX IF NOT EXISTS idx_auctions_status_end_time ON auctions(status, end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_comic_id ON auctions(comic_id);

-- ============================================================================
-- STEP 3: CREATE BIDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bid_amount DECIMAL(10,2) NOT NULL,
  max_bid DECIMAL(10,2) NOT NULL,
  bidder_number INTEGER NOT NULL,
  is_winning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_bid CHECK (bid_amount >= 0.99),
  CONSTRAINT valid_max_bid CHECK (max_bid >= bid_amount)
);

CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_winning ON bids(auction_id, is_winning) WHERE is_winning = TRUE;

-- ============================================================================
-- STEP 4: CREATE AUCTION WATCHLIST TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS auction_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_auction_watch UNIQUE (user_id, auction_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON auction_watchlist(user_id);

-- ============================================================================
-- STEP 5: CREATE SELLER RATINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  rating_type TEXT NOT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_rating_type CHECK (rating_type IN ('positive', 'negative')),
  CONSTRAINT unique_buyer_auction_rating UNIQUE (buyer_id, auction_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_seller_id ON seller_ratings(seller_id);

-- ============================================================================
-- STEP 6: CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_notification_type CHECK (type IN ('outbid', 'won', 'ended', 'payment_reminder', 'rating_request', 'auction_sold', 'payment_received'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES (using public schema functions)
-- ============================================================================

CREATE POLICY "auctions_select_policy" ON auctions
  FOR SELECT USING (
    status = 'active'
    OR seller_id = public.current_profile_id()
    OR winner_id = public.current_profile_id()
  );

CREATE POLICY "auctions_insert_policy" ON auctions
  FOR INSERT WITH CHECK (
    seller_id = public.current_profile_id()
  );

CREATE POLICY "auctions_update_policy" ON auctions
  FOR UPDATE USING (
    seller_id = public.current_profile_id()
  );

CREATE POLICY "auctions_delete_policy" ON auctions
  FOR DELETE USING (
    seller_id = public.current_profile_id()
    AND status = 'active'
    AND bid_count = 0
  );

CREATE POLICY "bids_select_policy" ON bids
  FOR SELECT USING (TRUE);

CREATE POLICY "bids_insert_policy" ON bids
  FOR INSERT WITH CHECK (
    bidder_id = public.current_profile_id()
  );

CREATE POLICY "bids_update_policy" ON bids
  FOR UPDATE USING (
    bidder_id = public.current_profile_id()
  );

CREATE POLICY "watchlist_select_policy" ON auction_watchlist
  FOR SELECT USING (
    user_id = public.current_profile_id()
  );

CREATE POLICY "watchlist_insert_policy" ON auction_watchlist
  FOR INSERT WITH CHECK (
    user_id = public.current_profile_id()
  );

CREATE POLICY "watchlist_delete_policy" ON auction_watchlist
  FOR DELETE USING (
    user_id = public.current_profile_id()
  );

CREATE POLICY "ratings_select_policy" ON seller_ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "ratings_insert_policy" ON seller_ratings
  FOR INSERT WITH CHECK (
    buyer_id = public.current_profile_id()
  );

CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT USING (
    user_id = public.current_profile_id()
  );

CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT WITH CHECK (
    public.is_authenticated()
  );

CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE USING (
    user_id = public.current_profile_id()
  );

-- ============================================================================
-- STEP 9: CREATE AUCTION HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_bidder_number(p_auction_id UUID, p_bidder_id UUID)
RETURNS INTEGER AS $$
DECLARE
  existing_number INTEGER;
  max_number INTEGER;
BEGIN
  SELECT bidder_number INTO existing_number
  FROM bids
  WHERE auction_id = p_auction_id AND bidder_id = p_bidder_id
  LIMIT 1;

  IF existing_number IS NOT NULL THEN
    RETURN existing_number;
  END IF;

  SELECT COALESCE(MAX(bidder_number), 0) + 1 INTO max_number
  FROM bids
  WHERE auction_id = p_auction_id;

  RETURN max_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_minimum_bid(p_current_bid DECIMAL, p_starting_price DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  base_price DECIMAL;
  increment DECIMAL;
BEGIN
  base_price := COALESCE(p_current_bid, p_starting_price);

  IF base_price < 100 THEN
    increment := 1;
  ELSIF base_price < 1000 THEN
    increment := 5;
  ELSE
    increment := 25;
  END IF;

  IF p_current_bid IS NULL THEN
    RETURN p_starting_price;
  END IF;

  RETURN base_price + increment;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_seller_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.rating_type = 'positive' THEN
      UPDATE profiles SET positive_ratings = positive_ratings + 1 WHERE id = NEW.seller_id;
    ELSE
      UPDATE profiles SET negative_ratings = negative_ratings + 1 WHERE id = NEW.seller_id;
    END IF;

    UPDATE profiles SET seller_since = NOW()
    WHERE id = NEW.seller_id AND seller_since IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_seller_ratings ON seller_ratings;
CREATE TRIGGER trigger_update_seller_ratings
  AFTER INSERT ON seller_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_ratings();

CREATE OR REPLACE FUNCTION update_auction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auction_timestamp ON auctions;
CREATE TRIGGER trigger_auction_timestamp
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_timestamp();

DROP TRIGGER IF EXISTS trigger_bid_timestamp ON bids;
CREATE TRIGGER trigger_bid_timestamp
  BEFORE UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
