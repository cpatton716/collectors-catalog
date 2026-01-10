-- eBay Price Cache Table
-- Stores cached eBay price lookups to minimize API calls
-- Cache TTL is 24 hours, enforced by the API layer

CREATE TABLE IF NOT EXISTS ebay_price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issue_number TEXT,
  grade NUMERIC(3,1),
  is_graded BOOLEAN DEFAULT FALSE,
  grading_company TEXT,
  price_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cache key lookups
CREATE INDEX IF NOT EXISTS idx_ebay_price_cache_key ON ebay_price_cache(cache_key);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_ebay_price_cache_created_at ON ebay_price_cache(created_at);

-- Index for searching by title/issue
CREATE INDEX IF NOT EXISTS idx_ebay_price_cache_title_issue ON ebay_price_cache(title, issue_number);

-- Trigger to update updated_at on change
CREATE OR REPLACE FUNCTION update_ebay_price_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ebay_price_cache_updated_at
  BEFORE UPDATE ON ebay_price_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_ebay_price_cache_updated_at();

-- Enable RLS
ALTER TABLE ebay_price_cache ENABLE ROW LEVEL SECURITY;

-- Allow public access to price cache (non-sensitive shared pricing data)
CREATE POLICY "eBay price cache is publicly accessible" ON ebay_price_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Cleanup function to remove old cache entries (call periodically)
CREATE OR REPLACE FUNCTION cleanup_ebay_price_cache(max_age_hours INTEGER DEFAULT 48)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ebay_price_cache
  WHERE created_at < NOW() - (max_age_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ebay_price_cache IS 'Caches eBay price lookups to minimize API calls. TTL is 24 hours.';
COMMENT ON COLUMN ebay_price_cache.cache_key IS 'Unique key combining title, issue, grade, and condition';
COMMENT ON COLUMN ebay_price_cache.price_data IS 'Cached PriceData object from eBay lookup';
