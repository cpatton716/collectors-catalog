-- Add cover_image_url column to comic_metadata table
-- This allows caching of cover images for faster subsequent lookups

ALTER TABLE comic_metadata
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add index for faster lookups when filtering by comics that have covers
CREATE INDEX IF NOT EXISTS idx_comic_metadata_has_cover
ON comic_metadata((cover_image_url IS NOT NULL));

COMMENT ON COLUMN comic_metadata.cover_image_url IS 'Cached cover image URL for this comic';
