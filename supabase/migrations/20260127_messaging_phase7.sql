-- ============================================================================
-- MESSAGING PHASE 7 - AI Moderation Support
-- ============================================================================
-- Adds columns for AI-powered message moderation:
-- - auto_moderated: Whether message has been processed by AI moderation
-- - auto_moderation_result: JSON result from AI analysis
-- - Makes reporter_id nullable for system-generated reports
-- ============================================================================

-- Add auto_moderated flag to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS auto_moderated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS auto_moderation_result JSONB;

-- Index for efficient lookup of unmoderated flagged messages
CREATE INDEX IF NOT EXISTS idx_messages_flagged_unmoderated
  ON messages(is_flagged, auto_moderated)
  WHERE is_flagged = TRUE AND auto_moderated = FALSE;

-- Comments for documentation
COMMENT ON COLUMN messages.auto_moderated IS 'Whether this message has been processed by AI moderation';
COMMENT ON COLUMN messages.auto_moderation_result IS 'JSON result from AI moderation analysis including severity, explanation';

-- ============================================================================
-- Allow system-generated reports (reporter_id can be NULL)
-- ============================================================================

-- Drop the existing unique constraint and NOT NULL constraint
ALTER TABLE message_reports DROP CONSTRAINT IF EXISTS unique_report;
ALTER TABLE message_reports ALTER COLUMN reporter_id DROP NOT NULL;

-- Recreate unique constraint that handles NULLs properly
-- For system-generated reports (reporter_id IS NULL), each message can only have one
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_report
  ON message_reports(message_id, reporter_id)
  WHERE reporter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_system_report
  ON message_reports(message_id)
  WHERE reporter_id IS NULL;

COMMENT ON COLUMN message_reports.reporter_id IS 'User who reported the message (NULL for system-generated AI reports)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
