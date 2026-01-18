-- =============================================
-- Community Key Info System
-- Allows users to submit key info suggestions
-- that are reviewed by admins before approval
-- =============================================

-- Master table of approved key comics
-- This replaces the static keyComicsDatabase.ts file
CREATE TABLE IF NOT EXISTS key_comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,  -- Lowercase, no special chars for matching
  issue_number TEXT NOT NULL,
  publisher TEXT,
  key_info TEXT[] NOT NULL,        -- Array of key info strings
  source TEXT,                     -- Where this info came from (e.g., "curated", "community", "CGC")
  contributed_by TEXT,             -- User ID if community contributed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate title+issue combinations
  UNIQUE(title_normalized, issue_number)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_key_comics_lookup
  ON key_comics(title_normalized, issue_number);

-- User submissions awaiting moderation
CREATE TABLE IF NOT EXISTS key_info_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,              -- Clerk user ID

  -- Comic identification
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,     -- For matching against existing
  issue_number TEXT NOT NULL,
  publisher TEXT,
  release_year INTEGER,

  -- The submission
  suggested_key_info TEXT[] NOT NULL, -- Array of key info strings
  source_url TEXT,                    -- Optional: link to verify (CGC, Wikipedia, etc.)
  notes TEXT,                         -- User's explanation/reasoning

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by TEXT,                   -- Admin user ID who reviewed
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,              -- If rejected, explain why
  merged_into UUID REFERENCES key_comics(id), -- If approved, which key_comic record

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding pending submissions
CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON key_info_submissions(status, created_at DESC);

-- Index for user's submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user
  ON key_info_submissions(user_id, created_at DESC);

-- Index for checking if submission exists for a comic
CREATE INDEX IF NOT EXISTS idx_submissions_comic
  ON key_info_submissions(title_normalized, issue_number, status);

-- Function to normalize titles for matching
CREATE OR REPLACE FUNCTION normalize_comic_title(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'),  -- Remove special chars
      '\s+', ' ', 'g'  -- Normalize whitespace
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set normalized title on key_comics
CREATE OR REPLACE FUNCTION set_normalized_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title_normalized := normalize_comic_title(NEW.title);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER key_comics_normalize_title
  BEFORE INSERT OR UPDATE ON key_comics
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_title();

CREATE TRIGGER submissions_normalize_title
  BEFORE INSERT OR UPDATE ON key_info_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_title();

-- RLS Policies
ALTER TABLE key_comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_info_submissions ENABLE ROW LEVEL SECURITY;

-- key_comics: Anyone can read, only service role can write
CREATE POLICY "key_comics_read_all" ON key_comics
  FOR SELECT USING (true);

-- key_info_submissions: Users can read their own, admins can read all
CREATE POLICY "submissions_read_own" ON key_info_submissions
  FOR SELECT USING (true);  -- We'll filter in API based on user role

-- key_info_submissions: Authenticated users can insert
CREATE POLICY "submissions_insert" ON key_info_submissions
  FOR INSERT WITH CHECK (true);  -- Validated in API

-- key_info_submissions: Only service role can update (for moderation)
-- This is handled by using service role key in admin API
