/**
 * Uploads a base64 `data:` URI to the `comic-covers` Supabase Storage bucket
 * via /api/comics/upload-cover and returns the resulting public URL.
 *
 * Pass-through for already-hosted URLs (http/https). Returns null for empty
 * input, malformed data URIs, or upload failures -- caller writes null to
 * cover_image_url, which renders the placeholder (same fallback as today).
 *
 * Why this exists: the cover_image_url sanitizer (db.ts:720 ->
 * coverImageUrlSanitizer.ts) hard-rejects data: URIs. Without uploading
 * first, the scan flow's user photo was silently dropped on every save.
 */

const DATA_URI_PREFIX = "data:";

function dataUriToBlob(dataUri: string): Blob | null {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) return null;
  const header = dataUri.slice(0, commaIndex);
  const b64 = dataUri.slice(commaIndex + 1);
  if (!b64) return null;
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export async function uploadCoverImage(
  source: string | null | undefined
): Promise<string | null> {
  if (!source) return null;
  if (!source.startsWith(DATA_URI_PREFIX)) return source;

  const blob = dataUriToBlob(source);
  if (!blob) return null;

  const ext = (blob.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  const file = new File([blob], `cover.${ext}`, { type: blob.type });
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/comics/upload-cover", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      console.warn("Cover upload failed", response.status);
      return null;
    }
    const { url } = (await response.json()) as { url?: string };
    return url || null;
  } catch (err) {
    console.warn("Cover upload threw", err);
    return null;
  }
}
