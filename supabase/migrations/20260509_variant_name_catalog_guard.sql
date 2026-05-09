-- Adds community variant-name fields to barcode_catalog so the variant
-- resolver (src/lib/variantResolver.ts) has a place to (a) read approved
-- canonical variant names and (b) park new submissions for admin review.
--
-- Background: when a user scans a comic with a UPC supplement (e.g., the
-- 5-digit add-on on the front-bottom-left of Marvel/DC books), we can derive
-- "this is a variant" from the addon digits, but not the human-readable name
-- ("Greg Capullo Variant Cover"). The resolver fills that in via three tiers:
--   1. catalog lookup keyed by (upc_prefix, addon_issue, addon_variant)
--   2. AI enrichment (text-only, ~$0.0008/call)
--   3. addon-derived fallback ("Cover B")
--
-- Per product requirement: user-entered variant names must not surface in
-- community lookups until an admin approves them. We therefore store the
-- name on the catalog row with a separate `variant_name_status` column,
-- defaulting to 'pending'. Tier-1 lookups filter on `variant_name_status =
-- 'approved'`. Admin workflow promotes rows individually.
--
-- Idempotent: IF NOT EXISTS / DO NOTHING patterns let this re-run safely.

ALTER TABLE barcode_catalog
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_name_source TEXT,
  ADD COLUMN IF NOT EXISTS variant_name_status TEXT DEFAULT 'pending';

-- Constrain values without breaking pre-existing rows (which have NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barcode_catalog_variant_name_source_check'
  ) THEN
    ALTER TABLE barcode_catalog
      ADD CONSTRAINT barcode_catalog_variant_name_source_check
      CHECK (variant_name_source IS NULL OR variant_name_source IN ('user', 'ai', 'derived', 'catalog'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barcode_catalog_variant_name_status_check'
  ) THEN
    ALTER TABLE barcode_catalog
      ADD CONSTRAINT barcode_catalog_variant_name_status_check
      CHECK (variant_name_status IS NULL OR variant_name_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Lookup index for the resolver Tier-1 query.
-- Partial index keeps it small -- we only ever read approved rows with a name.
CREATE INDEX IF NOT EXISTS idx_barcode_catalog_variant_lookup
  ON barcode_catalog (upc_prefix, addon_issue, addon_variant)
  WHERE variant_name_status = 'approved' AND variant_name IS NOT NULL;

-- Admin queue index: pending rows with a name, ordered by recency.
CREATE INDEX IF NOT EXISTS idx_barcode_catalog_variant_pending
  ON barcode_catalog (created_at DESC)
  WHERE variant_name_status = 'pending' AND variant_name IS NOT NULL;
