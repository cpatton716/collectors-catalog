-- Simple key-value cache table for API responses
-- This stores non-sensitive cached data like hottest books list
CREATE TABLE IF NOT EXISTS app_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_app_cache_expires_at ON app_cache(expires_at);

-- Enable RLS
ALTER TABLE app_cache ENABLE ROW LEVEL SECURITY;

-- Allow public access to cache (non-sensitive shared data)
CREATE POLICY "Cache is publicly accessible" ON app_cache
  FOR ALL USING (true) WITH CHECK (true);
