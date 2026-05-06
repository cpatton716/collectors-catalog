import { lookupKeyInfo, lookupKeyInfoWithMeta, isKeyComic } from "../keyComicsDatabase";

describe("lookupKeyInfo", () => {
  describe("Ultimate Fallout #4 — Miles Morales first appearance", () => {
    const expected = ["First appearance of Miles Morales as Spider-Man"];

    it("resolves the canonical title", () => {
      expect(lookupKeyInfo("Ultimate Fallout", "4")).toEqual(expected);
    });

    it("resolves AI-returned variant 'Ultimate Fallout: Spider-Man'", () => {
      // The cover prominently displays SPIDER-MAN above the series title,
      // so AI recognition commonly returns this variant. Both must resolve.
      expect(lookupKeyInfo("Ultimate Fallout: Spider-Man", "4")).toEqual(expected);
    });

    it("resolves AI-returned variant 'Ultimate Fallout - Spider-Man'", () => {
      expect(lookupKeyInfo("Ultimate Fallout - Spider-Man", "4")).toEqual(expected);
    });

    it("resolves AI-returned variant 'Ultimate Fallout Spider-Man'", () => {
      expect(lookupKeyInfo("Ultimate Fallout Spider-Man", "4")).toEqual(expected);
    });

    it("isKeyComic returns true for all variants", () => {
      expect(isKeyComic("Ultimate Fallout", "4")).toBe(true);
      expect(isKeyComic("Ultimate Fallout: Spider-Man", "4")).toBe(true);
      expect(isKeyComic("ultimate fallout spider-man", "4")).toBe(true);
    });
  });

  describe("normalization", () => {
    it("is case-insensitive", () => {
      expect(lookupKeyInfo("AMAZING FANTASY", "15")).not.toBeNull();
      expect(lookupKeyInfo("amazing fantasy", "15")).not.toBeNull();
    });

    it("strips leading 'The'", () => {
      // Walking Dead is stored as "The Walking Dead" — both forms should resolve
      const withThe = lookupKeyInfo("The Walking Dead", "1");
      const withoutThe = lookupKeyInfo("Walking Dead", "1");
      expect(withThe).toEqual(withoutThe);
    });

    it("ignores leading zeros on issue number", () => {
      const a = lookupKeyInfo("Amazing Fantasy", "15");
      const b = lookupKeyInfo("Amazing Fantasy", "015");
      expect(a).toEqual(b);
    });
  });

  describe("misses", () => {
    it("returns null for unknown title", () => {
      expect(lookupKeyInfo("Some Random Comic That Does Not Exist", "1")).toBeNull();
    });

    it("returns null for unknown issue of known title", () => {
      expect(lookupKeyInfo("Ultimate Fallout", "999")).toBeNull();
    });
  });

  describe("alias mechanism — anthology covers with prominent feature character", () => {
    // The aliases field on KeyComic registers additional normalized lookup keys
    // pointing to the same entry. Use this when the AI vision pipeline is known
    // to return a different title than the canonical series masthead because
    // the cover prominently displays a character logo alongside the title.

    it("Tales of Suspense #39 resolves via 'Tales of Suspense: Iron Man' alias", () => {
      const expected = ["First appearance of Iron Man"];
      expect(lookupKeyInfo("Tales of Suspense", "39")).toEqual(expected);
      expect(lookupKeyInfo("Tales of Suspense: Iron Man", "39")).toEqual(expected);
      // Punctuation variants normalize to the same key — also covered
      expect(lookupKeyInfo("Tales of Suspense - Iron Man", "39")).toEqual(expected);
    });

    it("Journey Into Mystery #83 resolves via Thor alias", () => {
      const expected = ["First appearance of Thor"];
      expect(lookupKeyInfo("Journey Into Mystery", "83")).toEqual(expected);
      expect(lookupKeyInfo("Journey Into Mystery: Thor", "83")).toEqual(expected);
    });

    it("Marvel Premiere #15 resolves via Iron Fist alias", () => {
      const expected = ["First appearance of Iron Fist"];
      expect(lookupKeyInfo("Marvel Premiere", "15")).toEqual(expected);
      expect(lookupKeyInfo("Marvel Premiere: Iron Fist", "15")).toEqual(expected);
    });

    it("Marvel Spotlight #5 resolves via Ghost Rider alias", () => {
      const expected = ["First appearance of Ghost Rider (Johnny Blaze)"];
      expect(lookupKeyInfo("Marvel Spotlight", "5")).toEqual(expected);
      expect(lookupKeyInfo("Marvel Spotlight: Ghost Rider", "5")).toEqual(expected);
    });

    it("Strange Tales #110 resolves via Doctor Strange alias", () => {
      const expected = ["First Doctor Strange"];
      expect(lookupKeyInfo("Strange Tales", "110")).toEqual(expected);
      expect(lookupKeyInfo("Strange Tales: Doctor Strange", "110")).toEqual(expected);
    });

    it("alias does NOT pollute lookup at the wrong issue number", () => {
      // The 'Marvel Premiere: Iron Fist' alias is registered at issue #15 only.
      // Looking it up at any other issue must miss — the alias mustn't bleed
      // across the issue map.
      expect(lookupKeyInfo("Marvel Premiere: Iron Fist", "1")).toBeNull();
      expect(lookupKeyInfo("Marvel Premiere: Iron Fist", "28")).toBeNull();
    });

    it("dedupes aliases that normalize to the same key as canonical or each other", () => {
      // Ultimate Fallout has 3 aliases that all normalize to the same string.
      // If they were registered without dedup, resolveEntry would see multiple
      // entries at the same key and return null without a year. With dedup,
      // a single entry is registered and the lookup resolves cleanly without
      // requiring releaseYear.
      const expected = ["First appearance of Miles Morales as Spider-Man"];
      expect(lookupKeyInfo("Ultimate Fallout: Spider-Man", "4")).toEqual(expected);
      expect(lookupKeyInfo("Ultimate Fallout - Spider-Man", "4")).toEqual(expected);
      expect(lookupKeyInfo("Ultimate Fallout Spider-Man", "4")).toEqual(expected);
    });
  });

  describe("confidence metadata — drives 'verify volume' UI advisory", () => {
    // The UI uses matchType to decide whether to render a volume-verification
    // warning. 'exact' = high confidence (no advisory); 'year-resolved' = the
    // resolver had to make a judgment call and the user should sanity-check.

    describe("matchType: 'exact'", () => {
      it("returns 'exact' for a single curated entry (no volume conflict possible)", () => {
        const result = lookupKeyInfoWithMeta("Ultimate Fallout", "4");
        expect(result).toMatchObject({
          matchType: "exact",
          matchedYear: 2011,
          totalCandidates: 1,
        });
      });

      it("returns 'exact' for multi-entry when releaseYear matches a candidate exactly", () => {
        // Star Wars #1 has two volumes: 1977 (Marvel original) and 2015 (re-launch).
        // Scanning with year 2015 should resolve to the 2015 entry as 'exact'.
        const result = lookupKeyInfoWithMeta("Star Wars", "1", 2015);
        expect(result?.matchType).toBe("exact");
        expect(result?.matchedYear).toBe(2015);
        expect(result?.totalCandidates).toBeGreaterThanOrEqual(2);
        expect(result?.keyInfo).toEqual(["Marvel re-launches Star Wars license"]);
      });

      it("returns 'exact' for multi-entry with the canonical 1977 Star Wars #1", () => {
        const result = lookupKeyInfoWithMeta("Star Wars", "1", 1977);
        expect(result?.matchType).toBe("exact");
        expect(result?.matchedYear).toBe(1977);
        expect(result?.keyInfo[0]).toContain("First Marvel Star Wars");
      });
    });

    describe("matchType: 'year-resolved' — judgment call", () => {
      it("flags when no exact-year match exists and resolver picked closest preceding volume", () => {
        // Star Wars #1 issued in 2010 — neither 1977 nor 2015 matches exactly.
        // Resolver picks the closest series-start year that's <= 2010 → 1977.
        // This is a judgment call; user should verify which volume they own.
        const result = lookupKeyInfoWithMeta("Star Wars", "1", 2010);
        expect(result?.matchType).toBe("year-resolved");
        expect(result?.matchedYear).toBe(1977);
        expect(result?.totalCandidates).toBeGreaterThanOrEqual(2);
      });
    });

    describe("nulls — high-confidence fallback to AI", () => {
      it("returns null when multi-entry exists and no releaseYear is provided (resolver refuses to guess)", () => {
        // Star Wars #1 has 2+ volumes. Without a year, picking is unsafe.
        // Returning null lets the route fall back to AI rather than risking
        // wrong attribution.
        const result = lookupKeyInfoWithMeta("Star Wars", "1");
        expect(result).toBeNull();
      });

      it("returns null when releaseYear predates every volume", () => {
        // Star Wars vol 1 started 1977. A claimed year of 1970 is invalid.
        const result = lookupKeyInfoWithMeta("Star Wars", "1", 1970);
        expect(result).toBeNull();
      });
    });

    describe("metadata is consistent with backwards-compat lookupKeyInfo()", () => {
      it("backwards-compat wrapper returns the same keyInfo as the meta variant", () => {
        const meta = lookupKeyInfoWithMeta("Tales of Suspense", "39");
        const plain = lookupKeyInfo("Tales of Suspense", "39");
        expect(plain).toEqual(meta?.keyInfo);
      });
    });
  });
});
