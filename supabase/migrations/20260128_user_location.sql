-- Add location fields to profiles table
-- Migration: 20260128_user_location.sql
-- Description: Add optional location fields for trade/sale coordination

-- Add location columns (all nullable/optional)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_city TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_state TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Add privacy control for location visibility
-- Options: 'full' (city, state, country), 'state_country', 'country_only', 'hidden'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_privacy TEXT DEFAULT 'state_country'
CHECK (location_privacy IN ('full', 'state_country', 'country_only', 'hidden'));

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_country ON profiles (location_country)
WHERE location_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_location_state ON profiles (location_state)
WHERE location_state IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN profiles.location_city IS 'User city for trading/shipping coordination (optional)';
COMMENT ON COLUMN profiles.location_state IS 'User state/province/region for trading/shipping coordination (optional)';
COMMENT ON COLUMN profiles.location_country IS 'User country for trading/shipping coordination (optional)';
COMMENT ON COLUMN profiles.location_privacy IS 'How much location detail to show publicly: full, state_country, country_only, or hidden';
