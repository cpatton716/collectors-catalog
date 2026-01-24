-- Migration: Add admin features (user management, suspension, audit logging)
-- Date: January 24, 2026
-- Purpose: Enable admin user management with accountability

-- ============================================
-- 1. Add admin and suspension fields to profiles
-- ============================================

-- Admin flag (database-level, more secure than env var)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Suspension fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Create index for suspended user checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended) WHERE is_suspended = TRUE;

-- ============================================
-- 2. Create admin audit log table
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,  -- 'search_users', 'view_profile', 'reset_trial', 'grant_premium', 'suspend', 'unsuspend'
  target_user_id UUID REFERENCES profiles(id),
  details JSONB,  -- Additional context (e.g., reason, duration, search query)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);

-- ============================================
-- 3. RLS Policies for admin_audit_log
-- ============================================

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (via service role in API)
CREATE POLICY "Service role full access to audit_log"
  ON admin_audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON COLUMN profiles.is_admin IS 'Whether this user has admin privileges';
COMMENT ON COLUMN profiles.is_suspended IS 'Whether this user account is suspended';
COMMENT ON COLUMN profiles.suspended_at IS 'When the account was suspended';
COMMENT ON COLUMN profiles.suspended_reason IS 'Reason for suspension (admin notes)';

COMMENT ON TABLE admin_audit_log IS 'Log of all admin actions for accountability';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'The admin who performed the action';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action: search_users, view_profile, reset_trial, grant_premium, suspend, unsuspend';
COMMENT ON COLUMN admin_audit_log.target_user_id IS 'The user the action was performed on (if applicable)';
COMMENT ON COLUMN admin_audit_log.details IS 'Additional context in JSON format';

-- ============================================
-- 5. Initial admin setup instructions
-- ============================================

-- After running this migration, set your admin account:
-- UPDATE profiles SET is_admin = true WHERE clerk_user_id = 'user_XXXXX';
-- (Replace user_XXXXX with your actual Clerk user ID)
