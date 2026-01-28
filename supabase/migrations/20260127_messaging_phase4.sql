-- Messaging Phase 4: Add notification preferences to profiles
-- This migration adds columns to control push and email notifications for messages

-- Add notification preference columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS msg_push_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS msg_email_enabled BOOLEAN DEFAULT true;

-- Add comments explaining each column
COMMENT ON COLUMN profiles.msg_push_enabled IS 'Enable push notifications for new messages';
COMMENT ON COLUMN profiles.msg_email_enabled IS 'Enable email notifications for new messages';
