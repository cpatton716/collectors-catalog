-- Migration: Add Public Collection Sharing
-- Allows users to share their collection publicly via a unique URL

-- Add public sharing columns to profiles table
ALTER TABLE profiles
ADD COLUMN is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN public_slug TEXT UNIQUE,
ADD COLUMN public_display_name TEXT,
ADD COLUMN public_bio TEXT;

-- Create index for public slug lookups
CREATE INDEX idx_profiles_public_slug ON profiles(public_slug) WHERE public_slug IS NOT NULL;

-- Create index for finding public profiles
CREATE INDEX idx_profiles_is_public ON profiles(is_public) WHERE is_public = TRUE;

-- Add sharing settings to lists (optional: user can choose which lists to share)
ALTER TABLE lists
ADD COLUMN is_shared BOOLEAN DEFAULT TRUE;

-- Update RLS policy to allow public access to public profiles
CREATE POLICY "Anyone can view public profiles" ON profiles
  FOR SELECT USING (is_public = TRUE);

-- Update RLS policy to allow public access to comics from public profiles
CREATE POLICY "Anyone can view comics from public profiles" ON comics
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE is_public = TRUE
    )
  );

-- Update RLS policy to allow public access to lists from public profiles
CREATE POLICY "Anyone can view lists from public profiles" ON lists
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE is_public = TRUE
    )
    AND is_shared = TRUE
  );

-- Update RLS policy for comic_lists from public profiles
CREATE POLICY "Anyone can view comic_lists from public profiles" ON comic_lists
  FOR SELECT USING (
    comic_id IN (
      SELECT c.id FROM comics c
      JOIN profiles p ON c.user_id = p.id
      WHERE p.is_public = TRUE
    )
  );

-- Function to generate a unique public slug from display name or email
CREATE OR REPLACE FUNCTION generate_public_slug(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get the base slug from display_name or email
  SELECT COALESCE(
    LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]', '-', 'g')),
    LOWER(SPLIT_PART(email, '@', 1))
  )
  INTO base_slug
  FROM profiles
  WHERE id = user_id;

  -- Remove consecutive dashes and trim
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- If empty, use a random string
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'collector';
  END IF;

  -- Try the base slug first
  new_slug := base_slug;

  -- If it exists, add a number suffix
  WHILE EXISTS (SELECT 1 FROM profiles WHERE public_slug = new_slug AND id != user_id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter::TEXT;
  END LOOP;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to enable public sharing for a profile
CREATE OR REPLACE FUNCTION enable_public_sharing(user_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
BEGIN
  -- Generate slug if not exists
  SELECT public_slug INTO new_slug FROM profiles WHERE id = user_profile_id;

  IF new_slug IS NULL THEN
    new_slug := generate_public_slug(user_profile_id);
  END IF;

  -- Update profile
  UPDATE profiles
  SET is_public = TRUE, public_slug = new_slug
  WHERE id = user_profile_id;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to disable public sharing
CREATE OR REPLACE FUNCTION disable_public_sharing(user_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET is_public = FALSE
  WHERE id = user_profile_id;
END;
$$ LANGUAGE plpgsql;
