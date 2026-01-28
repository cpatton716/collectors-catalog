-- ============================================================================
-- MESSAGING SYSTEM MIGRATION - Phase 2: Rich Content & Entry Points
-- ============================================================================
-- Adds support for:
-- - Image attachments in messages (up to 2 images)
-- - Embedded listing previews in messages
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD IMAGE SUPPORT TO MESSAGES
-- ============================================================================
-- Allows attaching up to 2 images per message (e.g., photos of comic condition)

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Constraint to limit images to max 2 per message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'max_two_images'
    AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT max_two_images
    CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 2);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD EMBEDDED LISTING SUPPORT
-- ============================================================================
-- Allows embedding a listing preview card within a message
-- Different from listing_id which is the "regarding" context
-- This is for when a user shares a listing link in their message

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS embedded_listing_id UUID REFERENCES auctions(id) ON DELETE SET NULL;

-- Index for efficient lookup of messages with embedded listings
CREATE INDEX IF NOT EXISTS idx_messages_embedded_listing
ON messages(embedded_listing_id)
WHERE embedded_listing_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update message API routes to handle image_urls and embedded_listing_id
-- 3. Add frontend components for image upload and listing embeds
-- ============================================================================
