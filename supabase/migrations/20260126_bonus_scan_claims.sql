-- Migration: Bonus Scan Claims
-- Purpose: Track email verification and prevent abuse of bonus scan system
-- Date: 2026-01-26

-- Create bonus_scan_claims table
CREATE TABLE IF NOT EXISTS bonus_scan_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email tracking
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL, -- lowercase, trimmed

  -- Abuse prevention
  ip_address TEXT NOT NULL,
  user_agent TEXT,

  -- Verification
  verification_token TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- Token expiration (24 hours from creation)

  -- Constraints
  CONSTRAINT unique_normalized_email UNIQUE (email_normalized)
);

-- Index for token lookups (verification endpoint)
CREATE INDEX IF NOT EXISTS idx_bonus_claims_token ON bonus_scan_claims(verification_token);

-- Index for IP lookups (abuse prevention)
CREATE INDEX IF NOT EXISTS idx_bonus_claims_ip ON bonus_scan_claims(ip_address);

-- Index for cleanup of expired unverified claims
CREATE INDEX IF NOT EXISTS idx_bonus_claims_expires ON bonus_scan_claims(expires_at) WHERE verified_at IS NULL;

-- RLS Policies
ALTER TABLE bonus_scan_claims ENABLE ROW LEVEL SECURITY;

-- No direct access from client - all operations go through API routes with service role
-- This table is only accessed server-side for security

-- Function to clean up expired unverified claims (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_bonus_claims()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bonus_scan_claims
  WHERE verified_at IS NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE bonus_scan_claims IS 'Tracks bonus scan claims with email verification to prevent abuse';
COMMENT ON COLUMN bonus_scan_claims.email_normalized IS 'Lowercase trimmed email for uniqueness checks';
COMMENT ON COLUMN bonus_scan_claims.verification_token IS 'Secure token sent in verification email';
COMMENT ON COLUMN bonus_scan_claims.verified_at IS 'NULL until user clicks verification link';
COMMENT ON COLUMN bonus_scan_claims.expires_at IS 'Token expires 24 hours after creation';
