-- ============================================================================
-- MESSAGING PHASE 3 - Block & Report
-- ============================================================================

-- User blocks (personal, immediate effect)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "user_blocks_select" ON user_blocks
  FOR SELECT USING (blocker_id = public.current_profile_id());

CREATE POLICY "user_blocks_insert" ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = public.current_profile_id());

CREATE POLICY "user_blocks_delete" ON user_blocks
  FOR DELETE USING (blocker_id = public.current_profile_id());

-- ============================================================================
-- Message reports (admin review queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN ('spam', 'scam', 'harassment', 'inappropriate', 'other')),
  details TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  priority INTEGER DEFAULT 5,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_report UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_message_reports_created ON message_reports(created_at DESC);

-- Enable RLS
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "message_reports_insert" ON message_reports
  FOR INSERT WITH CHECK (reporter_id = public.current_profile_id());

-- Users can see their own reports
CREATE POLICY "message_reports_select_own" ON message_reports
  FOR SELECT USING (reporter_id = public.current_profile_id());

-- ============================================================================
-- Add moderation flags to messages
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = TRUE;
