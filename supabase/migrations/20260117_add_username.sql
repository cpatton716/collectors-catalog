-- Add username column to profiles table
-- Migration: 20260117_add_username.sql
-- Description: Add unique username field for public display in marketplace

-- Add username column (nullable, unique, lowercase)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add display_preference column for how name appears publicly
-- Options: 'username_only', 'display_name_only', 'both'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_preference TEXT DEFAULT 'username_only'
CHECK (display_preference IN ('username_only', 'display_name_only', 'both'));

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username)
WHERE username IS NOT NULL;

-- Add constraint to ensure username format (lowercase, letters, numbers, underscores)
-- Note: This is a backup check; primary validation happens in the API
ALTER TABLE profiles
ADD CONSTRAINT username_format_check
CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Comment on columns
COMMENT ON COLUMN profiles.username IS 'Unique public username for marketplace display (e.g., comicfan42 displays as @comicfan42)';
COMMENT ON COLUMN profiles.display_preference IS 'How the user name appears publicly: username_only, display_name_only, or both';
