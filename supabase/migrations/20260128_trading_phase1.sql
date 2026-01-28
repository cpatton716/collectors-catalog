-- Add for_trade flag to comics table
ALTER TABLE comics ADD COLUMN IF NOT EXISTS for_trade BOOLEAN DEFAULT false;

-- Add acquired_via to track how comic was obtained
ALTER TABLE comics ADD COLUMN IF NOT EXISTS acquired_via TEXT DEFAULT 'scan';

-- Add index for efficient querying of tradeable comics
CREATE INDEX IF NOT EXISTS idx_comics_for_trade ON comics(for_trade) WHERE for_trade = true;

-- Comment for documentation
COMMENT ON COLUMN comics.for_trade IS 'Whether this comic is available for trade';
COMMENT ON COLUMN comics.acquired_via IS 'How the comic was acquired: scan, import, purchase, trade';
