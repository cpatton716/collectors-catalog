-- Creates the `comic-covers` Supabase Storage bucket for user-uploaded scan
-- photos and manual cover edits.
--
-- Background: the scan-to-collection path stored a base64 `data:` URI in
-- `comics.cover_image_url`. The defensive sanitizer in
-- `src/lib/coverImageUrlSanitizer.ts` (called from `db.ts:720` on every
-- cover_image_url write) rejects all `data:` URIs as a hard rule -- base64 in
-- the column breaks CSV exports and exceeds Stripe's 2048-char image cap.
-- Without an upload step, every cover taken via the FAB scan flow was
-- silently dropped to NULL and the placeholder rendered in the collection.
--
-- This bucket gives the scan path (and future manual cover edits) a place to
-- upload the user's photo and persist a real public URL the sanitizer accepts.
-- Public read so the URL works in <img src=> across collection, public
-- profiles, marketplace listings, and CSV exports. Service-role-only writes
-- via /api/comics/upload-cover (RLS not needed -- supabaseAdmin bypasses it).
--
-- Idempotent: ON CONFLICT DO NOTHING so re-running this migration is safe.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comic-covers',
  'comic-covers',
  true,
  10485760, -- 10MB; matches MAX_IMAGE_UPLOAD_BYTES in src/lib/uploadLimits.ts
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
