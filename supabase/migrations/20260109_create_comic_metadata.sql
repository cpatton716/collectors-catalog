-- Comic Metadata Cache Table
-- Stores comic details from AI lookups for faster subsequent queries
-- This serves as a shared repository that grows as users add comics

CREATE TABLE IF NOT EXISTS comic_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lookup keys (indexed for fast searches)
  title TEXT NOT NULL,
  issue_number TEXT NOT NULL,

  -- Metadata
  publisher TEXT,
  release_year TEXT,
  writer TEXT,
  cover_artist TEXT,
  interior_artist TEXT,
  key_info JSONB DEFAULT '[]'::jsonb,

  -- Price data (stored as JSON for flexibility)
  price_data JSONB,

  -- Tracking
  lookup_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on title + issue for deduplication
  UNIQUE(title, issue_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_comic_metadata_title ON comic_metadata(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_comic_metadata_title_issue ON comic_metadata(LOWER(title), LOWER(issue_number));
CREATE INDEX IF NOT EXISTS idx_comic_metadata_publisher ON comic_metadata(LOWER(publisher));
CREATE INDEX IF NOT EXISTS idx_comic_metadata_lookup_count ON comic_metadata(lookup_count DESC);

-- Enable RLS
ALTER TABLE comic_metadata ENABLE ROW LEVEL SECURITY;

-- Allow public read access (shared repository)
CREATE POLICY "Comic metadata is publicly readable" ON comic_metadata
  FOR SELECT USING (true);

-- Allow public insert/update (any user can contribute)
CREATE POLICY "Comic metadata can be inserted" ON comic_metadata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Comic metadata can be updated" ON comic_metadata
  FOR UPDATE USING (true) WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_comic_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.lookup_count = OLD.lookup_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp on updates
DROP TRIGGER IF EXISTS comic_metadata_updated_at ON comic_metadata;
CREATE TRIGGER comic_metadata_updated_at
  BEFORE UPDATE ON comic_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_comic_metadata_timestamp();

-- Comment on table
COMMENT ON TABLE comic_metadata IS 'Shared comic metadata cache - grows as users add comics, enabling faster lookups';
