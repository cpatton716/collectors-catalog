-- =============================================
-- Usage Monitoring Function
-- =============================================
-- Creates a function to get database size for monitoring

-- Function to get database size in bytes
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

-- Grant execute permission to authenticated users (admin check happens in API)
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size() TO service_role;

-- =============================================
-- Usage Alerts Table (for tracking sent alerts)
-- =============================================
CREATE TABLE IF NOT EXISTS usage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('warning', 'critical')),
  metric_value numeric NOT NULL,
  metric_limit numeric NOT NULL,
  percentage numeric NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Prevent duplicate alerts on the same day
  UNIQUE (metric_name, alert_type, sent_date)
);

-- Index for querying recent alerts
CREATE INDEX IF NOT EXISTS idx_usage_alerts_sent_at ON usage_alerts(sent_at DESC);

-- RLS for usage_alerts
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access to usage_alerts" ON usage_alerts
  FOR ALL USING (auth.role() = 'service_role');
