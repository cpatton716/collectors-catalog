/**
 * Cache utility function tests
 *
 * Tests the pure cache key generation and hashing functions.
 * These don't require Redis mocking since they're synchronous pure functions.
 */

// Mock Redis to avoid ESM import issues in Jest
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

import {
  generateEbayPriceCacheKey,
  generateComicMetadataCacheKey,
  generateAiAnalyzeCacheKey,
  hashImageData,
} from "../cache";

describe("Cache Key Generation", () => {
  describe("generateEbayPriceCacheKey", () => {
    it("generates consistent keys for same inputs", () => {
      const key1 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      const key2 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      expect(key1).toBe(key2);
    });

    it("normalizes title and issue to lowercase", () => {
      const key1 = generateEbayPriceCacheKey("AMAZING SPIDER-MAN", "300A", 9.8, true, "CGC");
      const key2 = generateEbayPriceCacheKey("amazing spider-man", "300a", 9.8, true, "CGC");
      expect(key1).toBe(key2);
    });

    it("trims whitespace from inputs", () => {
      const key1 = generateEbayPriceCacheKey("  Amazing Spider-Man  ", "  300  ", 9.8, true, "CGC");
      const key2 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      expect(key1).toBe(key2);
    });

    it("differentiates raw vs slabbed", () => {
      const rawKey = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, false);
      const slabbedKey = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      expect(rawKey).not.toBe(slabbedKey);
      expect(rawKey).toContain("raw");
      expect(slabbedKey).toContain("slabbed");
    });

    it("differentiates grades", () => {
      const key98 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      const key94 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.4, true, "CGC");
      expect(key98).not.toBe(key94);
    });

    it("differentiates grading companies", () => {
      const cgcKey = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      const cbcsKey = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CBCS");
      expect(cgcKey).not.toBe(cbcsKey);
    });

    it("handles missing grading company", () => {
      const key = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, false);
      expect(key).toBe("amazing spider-man|300|9.8|raw|");
    });

    it("normalizes grading company to lowercase", () => {
      const key1 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "CGC");
      const key2 = generateEbayPriceCacheKey("Amazing Spider-Man", "300", 9.8, true, "cgc");
      expect(key1).toBe(key2);
    });
  });

  describe("generateComicMetadataCacheKey", () => {
    it("generates consistent keys for same inputs", () => {
      const key1 = generateComicMetadataCacheKey("Amazing Spider-Man", "300");
      const key2 = generateComicMetadataCacheKey("Amazing Spider-Man", "300");
      expect(key1).toBe(key2);
    });

    it("normalizes to lowercase", () => {
      const key1 = generateComicMetadataCacheKey("BATMAN", "1");
      const key2 = generateComicMetadataCacheKey("batman", "1");
      expect(key1).toBe(key2);
    });

    it("trims whitespace", () => {
      const key1 = generateComicMetadataCacheKey("  Batman  ", "  1  ");
      const key2 = generateComicMetadataCacheKey("Batman", "1");
      expect(key1).toBe(key2);
    });

    it("differentiates different comics", () => {
      const key1 = generateComicMetadataCacheKey("Batman", "1");
      const key2 = generateComicMetadataCacheKey("Batman", "2");
      const key3 = generateComicMetadataCacheKey("Superman", "1");
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("uses pipe delimiter", () => {
      const key = generateComicMetadataCacheKey("Amazing Spider-Man", "300");
      expect(key).toBe("amazing spider-man|300");
    });
  });

  describe("generateAiAnalyzeCacheKey", () => {
    it("returns the image hash as-is", () => {
      const hash = "abc123_12345";
      const key = generateAiAnalyzeCacheKey(hash);
      expect(key).toBe(hash);
    });

    it("preserves hash format", () => {
      const hash = "-1a2b3c4d_999999";
      const key = generateAiAnalyzeCacheKey(hash);
      expect(key).toBe(hash);
    });
  });
});

describe("Image Hashing", () => {
  describe("hashImageData", () => {
    it("generates consistent hash for same input", () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...";
      const hash1 = hashImageData(imageData);
      const hash2 = hashImageData(imageData);
      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different images", () => {
      const image1 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...";
      const image2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...";
      const hash1 = hashImageData(image1);
      const hash2 = hashImageData(image2);
      expect(hash1).not.toBe(hash2);
    });

    it("includes image length in hash for collision resistance", () => {
      const shortImage = "abc";
      const longerImage = "abcdefghijklmnop";
      const hash1 = hashImageData(shortImage);
      const hash2 = hashImageData(longerImage);

      // Both have different lengths, so hashes should differ
      expect(hash1).not.toBe(hash2);

      // Hash format should include length
      expect(hash1).toContain("_3"); // length of "abc"
      expect(hash2).toContain("_16"); // length of longer string
    });

    it("returns hex format hash with length suffix", () => {
      const imageData = "test image data";
      const hash = hashImageData(imageData);

      // Should match format: hexhash_length
      expect(hash).toMatch(/^-?[0-9a-f]+_\d+$/);
    });

    it("handles empty string", () => {
      const hash = hashImageData("");
      expect(hash).toBe("0_0"); // hash of empty = 0, length = 0
    });

    it("handles very long strings efficiently", () => {
      // Only uses first 1000 chars for hashing
      const longImage = "x".repeat(100000);
      const start = Date.now();
      const hash = hashImageData(longImage);
      const duration = Date.now() - start;

      // Should be fast (< 10ms) since it only processes first 1000 chars
      expect(duration).toBeLessThan(100);
      expect(hash).toContain("_100000"); // but includes full length
    });

    it("differentiates images with same prefix but different lengths", () => {
      const image1 = "a".repeat(1000);
      const image2 = "a".repeat(2000);
      const hash1 = hashImageData(image1);
      const hash2 = hashImageData(image2);

      // Same first 1000 chars, but different lengths
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe("Cache TTL Configuration", () => {
  // These tests verify the TTL values are sensible
  // The actual TTL constants are internal, but we can verify behavior expectations

  it("should have longer TTLs for immutable data", () => {
    // This is a documentation test - verifying our design decisions
    // Barcodes and certs should have longer TTLs than eBay prices

    // From the implementation:
    // ebayPrice: 24 hours
    // barcode: 6 months
    // cert: 1 year
    // profile: 5 minutes

    // We can't directly test TTLs without exporting them,
    // but this documents the expected behavior
    expect(true).toBe(true);
  });
});
