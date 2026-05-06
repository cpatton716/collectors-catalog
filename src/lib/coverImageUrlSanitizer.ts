/**
 * Defensive sanitizer for the `cover_image_url` column.
 *
 * History: Apr 23, 2026 a Buy Now checkout 500'd in production because
 * `cover_image_url` carried a 2400+ char Supabase signed URL (with JWT query
 * params), which Stripe rejected on `line_items[].product_data.images[]`
 * (2048-char cap). Earlier still, base64 `data:` URIs leaked into the column
 * via paste-from-clipboard flows and broke CSV export.
 *
 * Rather than scatter defensive guards across every read site, sanitize at
 * the WRITE boundary so dirty values never reach storage. Any value that
 * fails sanitization is converted to `null` (the column is nullable; UI
 * fallback gracefully renders the placeholder).
 *
 * Rules:
 *   - Reject `data:` URIs (no base64 in the column — should be a real URL)
 *   - Reject anything that isn't `http://` or `https://`
 *   - Reject URLs longer than 2048 characters (Stripe + most CDNs cap here)
 *   - Reject URLs whose `?` query string is suspiciously long (almost always
 *     a Supabase signed URL with embedded JWT — caller should persist the
 *     storage object key and build the signed URL on read instead)
 *   - Pass through `null` and `undefined` unchanged (column already supports them)
 *
 * Returns the original URL if it passes, `null` if it fails. Never throws —
 * sanitization failures shouldn't block the broader write.
 */

const MAX_URL_LENGTH = 2048;
const MAX_QUERY_STRING_LENGTH = 800; // signed-URL JWT typically pushes this past 1KB

export function sanitizeCoverImageUrl(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  if (typeof url !== "string") return null;

  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  // 1. Reject base64 data URIs
  if (trimmed.startsWith("data:")) return null;

  // 2. Must be HTTP(S)
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  // 3. Reject overly long URLs (Stripe images cap, CDN limits)
  if (trimmed.length > MAX_URL_LENGTH) return null;

  // 4. Reject suspiciously long query strings (signed URLs with JWT)
  const queryStart = trimmed.indexOf("?");
  if (queryStart !== -1) {
    const queryString = trimmed.slice(queryStart + 1);
    if (queryString.length > MAX_QUERY_STRING_LENGTH) return null;
  }

  return trimmed;
}
