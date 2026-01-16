-- Migration: Add subscription and billing fields to profiles table
-- Date: January 15, 2026
-- Purpose: Support three-tier subscription model (Guest → Free → Premium)

-- ============================================
-- 1. Add subscription fields to profiles table
-- ============================================

-- Subscription tier: 'free' (default) or 'premium'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Stripe integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status: 'active', 'past_due', 'canceled', 'trialing'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- When current billing period ends (for premium users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Trial tracking (one trial per account)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Scan usage tracking for Free tier (10 scans/month)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scans_used_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scan_month_start DATE DEFAULT CURRENT_DATE;

-- Purchased scan packs (don't reset monthly)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchased_scans INTEGER DEFAULT 0;

-- ============================================
-- 2. Create indexes for efficient queries
-- ============================================

-- Index for filtering by subscription tier
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Unique constraint on stripe_customer_id (one customer per profile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_stripe_customer_id_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END $$;

-- ============================================
-- 3. Create scan_usage table for detailed tracking
-- ============================================

CREATE TABLE IF NOT EXISTS scan_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'scan',  -- 'scan', 'import', 'key_hunt'
  comic_title TEXT,            -- Optional: track what was scanned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying user's scans within a time period
CREATE INDEX IF NOT EXISTS idx_scan_usage_user_month ON scan_usage(user_id, scanned_at);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_scan_usage_source ON scan_usage(source);

-- ============================================
-- 4. RLS Policies for scan_usage table
-- ============================================

-- Enable RLS
ALTER TABLE scan_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scan history
CREATE POLICY "Users can view own scan usage"
  ON scan_usage FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can insert their own scans (via API)
CREATE POLICY "Users can insert own scan usage"
  ON scan_usage FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Service role can do anything (for API routes)
CREATE POLICY "Service role full access to scan_usage"
  ON scan_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 5. Helper function to check if trial is available
-- ============================================

CREATE OR REPLACE FUNCTION has_used_trial(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = profile_id
    AND trial_started_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Helper function to get scans remaining
-- ============================================

CREATE OR REPLACE FUNCTION get_scans_remaining(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  profile_record RECORD;
  monthly_limit INTEGER := 10;
  scans_available INTEGER;
BEGIN
  SELECT
    subscription_tier,
    scans_used_this_month,
    purchased_scans,
    scan_month_start,
    trial_ends_at
  INTO profile_record
  FROM profiles
  WHERE id = profile_id;

  -- Premium users have unlimited scans
  IF profile_record.subscription_tier = 'premium' THEN
    RETURN 999999;
  END IF;

  -- Check if in active trial
  IF profile_record.trial_ends_at IS NOT NULL AND profile_record.trial_ends_at > NOW() THEN
    RETURN 999999;
  END IF;

  -- Free tier: calculate remaining
  scans_available := monthly_limit - COALESCE(profile_record.scans_used_this_month, 0);
  scans_available := scans_available + COALESCE(profile_record.purchased_scans, 0);

  RETURN GREATEST(0, scans_available);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Comments for documentation
-- ============================================

COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free or premium';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN profiles.subscription_status IS 'Subscription status: active, past_due, canceled, trialing';
COMMENT ON COLUMN profiles.trial_started_at IS 'When user started their 7-day trial (null if never used)';
COMMENT ON COLUMN profiles.trial_ends_at IS 'When trial expires (null if no trial or trial ended)';
COMMENT ON COLUMN profiles.scans_used_this_month IS 'Number of scans used in current calendar month (Free tier)';
COMMENT ON COLUMN profiles.scan_month_start IS 'First day of current scan counting period';
COMMENT ON COLUMN profiles.purchased_scans IS 'Bonus scans from scan pack purchases (do not reset monthly)';

COMMENT ON TABLE scan_usage IS 'Detailed log of all user scans for analytics and verification';

-- ============================================
-- 8. Add seller fee tracking to auctions table
-- ============================================

-- Store the seller's subscription tier and fee percentage at listing creation time
-- This ensures the fee doesn't change if user upgrades/downgrades after listing
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS seller_tier TEXT DEFAULT 'free';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS platform_fee_percent DECIMAL(5,2) DEFAULT 8.00;

-- Index for fee analysis
CREATE INDEX IF NOT EXISTS idx_auctions_seller_tier ON auctions(seller_tier);

COMMENT ON COLUMN auctions.seller_tier IS 'Seller subscription tier at time of listing creation';
COMMENT ON COLUMN auctions.platform_fee_percent IS 'Platform fee percentage locked at listing creation (8% free, 5% premium)';
