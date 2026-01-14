-- ============================================================================
-- OFFERS SYSTEM MIGRATION
-- ============================================================================
--
-- This migration adds:
-- - Offer/counter-offer system for fixed-price listings
-- - Listing expiration support
-- - Scheduled auction support (start_date)
-- - Cancel reason tracking for auctions
--
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD COLUMNS TO AUCTIONS TABLE
-- ============================================================================

-- Add listing_type if not exists (for fixed_price vs auction)
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'auction';

-- Add offer-related columns
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS accepts_offers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_offer_amount DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Add cancel reason for tracking
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

-- Add constraint for listing_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_listing_type'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT valid_listing_type
      CHECK (listing_type IN ('auction', 'fixed_price'));
  END IF;
END $$;

-- Add constraint for cancel_reason
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_cancel_reason'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT valid_cancel_reason
      CHECK (cancel_reason IS NULL OR cancel_reason IN ('changed_mind', 'sold_elsewhere', 'price_too_low', 'other'));
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE OFFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Offer amounts
  amount DECIMAL(10,2) NOT NULL,
  counter_amount DECIMAL(10,2) DEFAULT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  round_number INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  responded_at TIMESTAMPTZ DEFAULT NULL,

  -- Constraints
  CONSTRAINT valid_offer_status CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'auto_rejected')),
  CONSTRAINT valid_round_number CHECK (round_number >= 1 AND round_number <= 3),
  CONSTRAINT valid_offer_amount CHECK (amount >= 0.99)
);

-- Indexes for offers
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status, expires_at);

-- ============================================================================
-- STEP 3: UPDATE NOTIFICATIONS TABLE FOR OFFER EVENTS
-- ============================================================================

-- Drop and recreate the constraint to add new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;

ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN (
    -- Existing auction types
    'outbid', 'won', 'ended', 'payment_reminder', 'rating_request', 'auction_sold', 'payment_received',
    -- New offer types
    'offer_received', 'offer_accepted', 'offer_rejected', 'offer_countered', 'offer_expired',
    -- Listing expiration types
    'listing_expiring', 'listing_expired'
  ));

-- Add offer_id column to notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: ENABLE RLS ON OFFERS TABLE
-- ============================================================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own offers
CREATE POLICY "offers_buyer_select_policy" ON offers
  FOR SELECT USING (
    buyer_id = public.current_profile_id()
  );

-- Sellers can see offers on their listings
CREATE POLICY "offers_seller_select_policy" ON offers
  FOR SELECT USING (
    seller_id = public.current_profile_id()
  );

-- Buyers can create offers
CREATE POLICY "offers_insert_policy" ON offers
  FOR INSERT WITH CHECK (
    buyer_id = public.current_profile_id()
  );

-- Sellers can update offers (to accept/reject/counter)
CREATE POLICY "offers_seller_update_policy" ON offers
  FOR UPDATE USING (
    seller_id = public.current_profile_id()
  );

-- Buyers can update their own offers (for counter-offer responses)
CREATE POLICY "offers_buyer_update_policy" ON offers
  FOR UPDATE USING (
    buyer_id = public.current_profile_id()
  );

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTIONS FOR OFFERS
-- ============================================================================

-- Function to auto-expire offers
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE offers
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire fixed-price listings (30 days)
CREATE OR REPLACE FUNCTION expire_old_listings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE auctions
  SET status = 'cancelled', updated_at = NOW()
  WHERE listing_type = 'fixed_price'
    AND status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps on offers
CREATE OR REPLACE FUNCTION update_offer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offer_timestamp ON offers;
CREATE TRIGGER trigger_offer_timestamp
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_timestamp();

-- ============================================================================
-- STEP 6: CREATE INDEX FOR LISTING EXPIRATION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_auctions_expires_at ON auctions(expires_at)
  WHERE listing_type = 'fixed_price' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_auctions_listing_type ON auctions(listing_type);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
