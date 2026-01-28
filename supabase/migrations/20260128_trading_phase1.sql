-- Add for_trade flag to comics table
ALTER TABLE comics ADD COLUMN IF NOT EXISTS for_trade BOOLEAN DEFAULT false;

-- Add acquired_via to track how comic was obtained
ALTER TABLE comics ADD COLUMN IF NOT EXISTS acquired_via TEXT DEFAULT 'scan';

-- Add index for efficient querying of tradeable comics
CREATE INDEX IF NOT EXISTS idx_comics_for_trade ON comics(for_trade) WHERE for_trade = true;

-- Comment for documentation
COMMENT ON COLUMN comics.for_trade IS 'Whether this comic is available for trade';
COMMENT ON COLUMN comics.acquired_via IS 'How the comic was acquired: scan, import, purchase, trade';

-- ============================================================================
-- TRADES TABLES
-- ============================================================================

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'shipped', 'completed', 'cancelled', 'declined')),
  proposer_tracking_carrier TEXT,
  proposer_tracking_number TEXT,
  recipient_tracking_carrier TEXT,
  recipient_tracking_number TEXT,
  proposer_shipped_at TIMESTAMPTZ,
  recipient_shipped_at TIMESTAMPTZ,
  proposer_received_at TIMESTAMPTZ,
  recipient_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_users CHECK (proposer_id != recipient_id)
);

-- Create trade_items table
CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, comic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_proposer ON trades(proposer_id);
CREATE INDEX IF NOT EXISTS idx_trades_recipient ON trades(recipient_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trade_items_trade ON trade_items(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_items_comic ON trade_items(comic_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trades_updated_at ON trades;
CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trades_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;

-- Trades: Users can see trades they're involved in
CREATE POLICY "Users can view their trades"
  ON trades FOR SELECT
  USING (auth.uid()::text IN (
    SELECT clerk_user_id FROM profiles WHERE id = proposer_id
    UNION
    SELECT clerk_user_id FROM profiles WHERE id = recipient_id
  ));

-- Trades: Users can create trades as proposer
CREATE POLICY "Users can create trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE id = proposer_id));

-- Trades: Participants can update their trades
CREATE POLICY "Participants can update trades"
  ON trades FOR UPDATE
  USING (auth.uid()::text IN (
    SELECT clerk_user_id FROM profiles WHERE id = proposer_id
    UNION
    SELECT clerk_user_id FROM profiles WHERE id = recipient_id
  ));

-- Trade items: Users can see items in their trades
CREATE POLICY "Users can view trade items"
  ON trade_items FOR SELECT
  USING (trade_id IN (
    SELECT id FROM trades WHERE auth.uid()::text IN (
      SELECT clerk_user_id FROM profiles WHERE id = proposer_id
      UNION
      SELECT clerk_user_id FROM profiles WHERE id = recipient_id
    )
  ));

-- Trade items: Proposer can add items when creating
CREATE POLICY "Proposer can add trade items"
  ON trade_items FOR INSERT
  WITH CHECK (trade_id IN (
    SELECT id FROM trades WHERE auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE id = proposer_id)
  ));