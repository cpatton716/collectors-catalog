import { sanitizeCoverImageUrl } from "../coverImageUrlSanitizer";

describe("sanitizeCoverImageUrl", () => {
  describe("passes valid URLs", () => {
    it("returns http URLs unchanged", () => {
      expect(sanitizeCoverImageUrl("http://example.com/cover.jpg")).toBe(
        "http://example.com/cover.jpg",
      );
    });

    it("returns https URLs unchanged", () => {
      expect(sanitizeCoverImageUrl("https://i.ebayimg.com/images/g/abc/s-l500.jpg")).toBe(
        "https://i.ebayimg.com/images/g/abc/s-l500.jpg",
      );
    });

    it("trims whitespace before validation", () => {
      expect(sanitizeCoverImageUrl("  https://example.com/c.jpg  ")).toBe(
        "https://example.com/c.jpg",
      );
    });

    it("accepts URLs at exactly the 2048 char limit", () => {
      const url = "https://example.com/" + "a".repeat(2048 - 20);
      expect(url.length).toBe(2048);
      expect(sanitizeCoverImageUrl(url)).toBe(url);
    });
  });

  describe("rejects dirty values", () => {
    it("returns null for data: URIs", () => {
      expect(sanitizeCoverImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
    });

    it("returns null for relative URLs", () => {
      expect(sanitizeCoverImageUrl("/covers/abc.jpg")).toBeNull();
    });

    it("returns null for ftp:// URLs", () => {
      expect(sanitizeCoverImageUrl("ftp://example.com/cover.jpg")).toBeNull();
    });

    it("returns null for URLs over 2048 chars", () => {
      const url = "https://example.com/" + "a".repeat(2050);
      expect(url.length).toBeGreaterThan(2048);
      expect(sanitizeCoverImageUrl(url)).toBeNull();
    });

    it("returns null for URLs with a suspiciously long query string (signed URL JWT)", () => {
      // Simulated Supabase signed URL with a JWT-stuffed query string
      const longJwt = "a".repeat(1000);
      const url = `https://abc.supabase.co/storage/v1/object/sign/covers/x.jpg?token=${longJwt}`;
      expect(sanitizeCoverImageUrl(url)).toBeNull();
    });

    it("returns null for empty / whitespace-only string", () => {
      expect(sanitizeCoverImageUrl("")).toBeNull();
      expect(sanitizeCoverImageUrl("   ")).toBeNull();
    });
  });

  describe("passes through null/undefined", () => {
    it("returns null for null", () => {
      expect(sanitizeCoverImageUrl(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(sanitizeCoverImageUrl(undefined)).toBeNull();
    });
  });
});
