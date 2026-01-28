-- ============================================================================
-- TRADE MATCHING SYSTEM
-- ============================================================================

-- Create trade_matches table
CREATE TABLE IF NOT EXISTS trade_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Users involved (profile IDs, not Clerk IDs)
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Comics involved
  -- user_a_comic_id = comic that User A has (for trade) that User B wants
  -- user_b_comic_id = comic that User B has (for trade) that User A wants
  user_a_comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  user_b_comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,

  -- Match quality (higher = better match)
  quality_score INTEGER DEFAULT 50,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'dismissed', 'traded')),

  -- Notification tracking
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_users CHECK (user_a_id != user_b_id)
);

-- Unique index to prevent duplicate matches (order-independent)
-- Using expressions in index since UNIQUE constraint doesn't support functions
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_matches_unique_pair
ON trade_matches (
  LEAST(user_a_id, user_b_id),
  GREATEST(user_a_id, user_b_id),
  LEAST(user_a_comic_id, user_b_comic_id),
  GREATEST(user_a_comic_id, user_b_comic_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trade_matches_user_a ON trade_matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_trade_matches_user_b ON trade_matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_trade_matches_status ON trade_matches(status);
CREATE INDEX IF NOT EXISTS idx_trade_matches_quality ON trade_matches(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_trade_matches_pending ON trade_matches(user_a_id, status) WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_trade_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trade_matches_updated_at ON trade_matches;
CREATE TRIGGER trade_matches_updated_at
  BEFORE UPDATE ON trade_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_matches_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE trade_matches ENABLE ROW LEVEL SECURITY;

-- Users can see matches they're involved in
CREATE POLICY "Users can view their matches"
  ON trade_matches FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT clerk_user_id FROM profiles WHERE id = user_a_id
      UNION
      SELECT clerk_user_id FROM profiles WHERE id = user_b_id
    )
  );

-- Users can update matches they're involved in (to mark as viewed/dismissed)
CREATE POLICY "Users can update their matches"
  ON trade_matches FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT clerk_user_id FROM profiles WHERE id = user_a_id
      UNION
      SELECT clerk_user_id FROM profiles WHERE id = user_b_id
    )
  );

-- Service role can manage all matches (for the matching function)
CREATE POLICY "Service role can manage matches"
  ON trade_matches FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- MATCHING FUNCTION
-- Called when a comic is marked for_trade or added to key_hunt_lists
-- ============================================================================

CREATE OR REPLACE FUNCTION find_trade_matches(
  p_user_id UUID,  -- profile ID of user whose data changed
  p_comic_id UUID DEFAULT NULL  -- optional: specific comic to match
)
RETURNS INTEGER AS $$
DECLARE
  matches_found INTEGER := 0;
  v_clerk_user_id TEXT;
BEGIN
  -- Get the Clerk user ID for key_hunt_lists lookup
  SELECT clerk_user_id INTO v_clerk_user_id FROM profiles WHERE id = p_user_id;

  -- Find matches: User A has comic that User B wants, AND User B has comic that User A wants
  INSERT INTO trade_matches (user_a_id, user_b_id, user_a_comic_id, user_b_comic_id, quality_score)
  SELECT DISTINCT
    c_a.user_id as user_a_id,
    c_b.user_id as user_b_id,
    c_a.id as user_a_comic_id,
    c_b.id as user_b_comic_id,
    -- Quality score: seller_rating (0-100) + normalized trade/rating count
    COALESCE(p_b.seller_rating, 50) +
    LEAST(COALESCE(p_b.seller_rating_count, 0), 50) as quality_score
  FROM comics c_a
  -- Join to key_hunt_lists to find who wants User A's comic
  JOIN key_hunt_lists kh_b ON (
    LOWER(TRIM(c_a.title)) = LOWER(TRIM(kh_b.title_normalized))
    AND TRIM(c_a.issue_number) = TRIM(kh_b.issue_number)
  )
  -- Get User B's profile from their Clerk ID
  JOIN profiles p_b ON p_b.clerk_user_id = kh_b.user_id
  -- Find comics User B has for trade
  JOIN comics c_b ON (
    c_b.user_id = p_b.id
    AND c_b.for_trade = true
  )
  -- Check if User A wants User B's comic
  JOIN key_hunt_lists kh_a ON (
    kh_a.user_id = v_clerk_user_id
    AND LOWER(TRIM(c_b.title)) = LOWER(TRIM(kh_a.title_normalized))
    AND TRIM(c_b.issue_number) = TRIM(kh_a.issue_number)
  )
  WHERE
    c_a.user_id = p_user_id
    AND c_a.for_trade = true
    AND c_a.user_id != c_b.user_id
    AND (p_comic_id IS NULL OR c_a.id = p_comic_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS matches_found = ROW_COUNT;
  RETURN matches_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION find_trade_matches TO authenticated;
