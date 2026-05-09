import {
  deriveVariantFromAddon,
  isVariantAddon,
  resolveVariant,
  type CatalogLookup,
  type VariantEnricher,
} from "../variantResolver";

import type { BarcodeData } from "@/types/comic";

function makeParsedBarcode(overrides: Partial<NonNullable<BarcodeData["parsed"]>> = {}) {
  return {
    upcPrefix: "75960",
    itemNumber: "609876",
    checkDigit: "5",
    addonIssue: "001",
    addonVariant: "21",
    ...overrides,
  };
}

describe("variantResolver helpers", () => {
  describe("isVariantAddon", () => {
    it("flags non-base addons as variants", () => {
      expect(isVariantAddon("21")).toBe(true);
      expect(isVariantAddon("31")).toBe(true);
      expect(isVariantAddon("12")).toBe(true);
      expect(isVariantAddon("71")).toBe(true);
    });

    it("treats 00/01/11 as base Cover A 1st-print non-variants", () => {
      expect(isVariantAddon("00")).toBe(false);
      expect(isVariantAddon("01")).toBe(false);
      expect(isVariantAddon("11")).toBe(false);
    });

    it("returns false for missing addons", () => {
      expect(isVariantAddon(undefined)).toBe(false);
      expect(isVariantAddon("")).toBe(false);
    });
  });

  describe("deriveVariantFromAddon", () => {
    it("maps first digit 2-9 to Cover B-I", () => {
      expect(deriveVariantFromAddon("21")).toBe("Cover B");
      expect(deriveVariantFromAddon("31")).toBe("Cover C");
      expect(deriveVariantFromAddon("71")).toBe("Cover G");
      expect(deriveVariantFromAddon("91")).toBe("Cover I");
    });

    it("returns null for first digit 0/1 or out-of-range", () => {
      expect(deriveVariantFromAddon("01")).toBeNull();
      expect(deriveVariantFromAddon("11")).toBeNull();
      expect(deriveVariantFromAddon("00")).toBeNull();
    });

    it("returns null for empty/missing addon", () => {
      expect(deriveVariantFromAddon(undefined)).toBeNull();
      expect(deriveVariantFromAddon("")).toBeNull();
    });
  });
});

describe("resolveVariant", () => {
  const baseInput = {
    title: "Dark Knights Metal",
    issueNumber: "1",
    releaseYear: "2017",
    publisher: "DC Comics",
    parsedBarcode: makeParsedBarcode(),
    aiVariantHint: null,
  };

  function mockDeps(overrides: { catalogLookup?: CatalogLookup; enricher?: VariantEnricher } = {}) {
    return {
      catalogLookup: overrides.catalogLookup ?? jest.fn().mockResolvedValue(null),
      enricher: overrides.enricher ?? jest.fn().mockResolvedValue(null),
    };
  }

  it("returns AI hint untouched when no parsed barcode is present", async () => {
    const deps = mockDeps();
    const result = await resolveVariant(
      { ...baseInput, parsedBarcode: undefined, aiVariantHint: "Cover B" },
      deps
    );
    expect(result).toEqual({ variantName: "Cover B", source: "ai" });
    expect(deps.catalogLookup).not.toHaveBeenCalled();
    expect(deps.enricher).not.toHaveBeenCalled();
  });

  it("returns null source when AI hint is null and no barcode", async () => {
    const deps = mockDeps();
    const result = await resolveVariant(
      { ...baseInput, parsedBarcode: undefined, aiVariantHint: null },
      deps
    );
    expect(result).toEqual({ variantName: null, source: null });
  });

  it("Tier 1: returns catalog hit and skips AI", async () => {
    const catalogLookup = jest.fn().mockResolvedValue("Greg Capullo Variant Cover");
    const enricher = jest.fn();
    const deps = mockDeps({ catalogLookup, enricher });

    const result = await resolveVariant(baseInput, deps);

    expect(result).toEqual({
      variantName: "Greg Capullo Variant Cover",
      source: "catalog",
    });
    expect(catalogLookup).toHaveBeenCalledWith({
      upcPrefix: "75960",
      addonIssue: "001",
      addonVariant: "21",
    });
    expect(enricher).not.toHaveBeenCalled();
  });

  it("BARCODE TRUMPS RICH AI HINT: enriches even when AI returned a rich-looking name", async () => {
    // The resolver must not short-circuit on AI's cover-derived hint --
    // two physically different books can share identical cover art (e.g.,
    // a 1st-print Capullo cover vs a 7th-printing reprint of the same art).
    // The barcode disambiguates; trust it.
    const enricher = jest.fn().mockResolvedValue("7th Printing");
    const deps = mockDeps({ enricher });

    const result = await resolveVariant(
      {
        ...baseInput,
        parsedBarcode: makeParsedBarcode({ addonVariant: "71" }),
        aiVariantHint: "Greg Capullo Cover", // would have short-circuited under old logic
      },
      deps
    );

    expect(result).toEqual({ variantName: "7th Printing", source: "ai" });
    expect(enricher).toHaveBeenCalledTimes(1);
  });

  it("Tier 2: enricher receives the derivedLabel computed from the addon", async () => {
    const enricher = jest.fn().mockResolvedValue("Midnight Release Variant");
    const deps = mockDeps({ enricher });

    await resolveVariant(
      { ...baseInput, parsedBarcode: makeParsedBarcode({ addonVariant: "71" }) },
      deps
    );

    expect(enricher).toHaveBeenCalledWith({
      title: "Dark Knights Metal",
      issueNumber: "1",
      releaseYear: "2017",
      publisher: "DC Comics",
      addonVariant: "71",
      derivedLabel: "Cover G",
    });
  });

  it("Tier 2: returns enriched name when AI provides one", async () => {
    const enricher = jest.fn().mockResolvedValue("Andy Kubert Variant");
    const deps = mockDeps({ enricher });

    const result = await resolveVariant(baseInput, deps);

    expect(result).toEqual({ variantName: "Andy Kubert Variant", source: "ai" });
  });

  it("Tier 2 skipped when addon is base (e.g. '01') -- not a variant", async () => {
    const enricher = jest.fn();
    const deps = mockDeps({ enricher });

    const result = await resolveVariant(
      {
        ...baseInput,
        parsedBarcode: makeParsedBarcode({ addonVariant: "01" }),
        aiVariantHint: null,
      },
      deps
    );

    expect(result).toEqual({ variantName: null, source: null });
    expect(enricher).not.toHaveBeenCalled();
  });

  it("Tier 3: derives Cover G when catalog and AI both miss", async () => {
    const enricher = jest.fn().mockResolvedValue(null);
    const deps = mockDeps({ enricher });

    const result = await resolveVariant(
      { ...baseInput, parsedBarcode: makeParsedBarcode({ addonVariant: "71" }) },
      deps
    );

    expect(result).toEqual({ variantName: "Cover G", source: "derived" });
    expect(enricher).toHaveBeenCalled();
  });

  it("falls back to AI hint when no derived letter and addon is base", async () => {
    // Addon "01" -> no derived letter, isVariantAddon=false, no enrichment.
    // AI's hint is the only signal we have.
    const deps = mockDeps();
    const result = await resolveVariant(
      {
        ...baseInput,
        parsedBarcode: makeParsedBarcode({ addonVariant: "01" }),
        aiVariantHint: "Cover A",
      },
      deps
    );
    expect(result).toEqual({ variantName: "Cover A", source: "ai" });
  });

  it("survives catalog throw and continues to derive + AI tier", async () => {
    const catalogLookup = jest.fn().mockRejectedValue(new Error("db down"));
    const enricher = jest.fn().mockResolvedValue("Mattina Variant");
    const deps = mockDeps({ catalogLookup, enricher });

    const result = await resolveVariant(baseInput, deps);

    expect(result).toEqual({ variantName: "Mattina Variant", source: "ai" });
    expect(enricher).toHaveBeenCalled();
  });

  it("survives AI enricher throw and falls through to derived", async () => {
    const enricher = jest.fn().mockRejectedValue(new Error("rate limited"));
    const deps = mockDeps({ enricher });

    const result = await resolveVariant(
      { ...baseInput, parsedBarcode: makeParsedBarcode({ addonVariant: "71" }) },
      deps
    );

    expect(result).toEqual({ variantName: "Cover G", source: "derived" });
  });

  it("does not call catalog lookup if upcPrefix is missing", async () => {
    const catalogLookup = jest.fn();
    const enricher = jest.fn().mockResolvedValue(null);
    const deps = mockDeps({ catalogLookup, enricher });

    await resolveVariant(
      {
        ...baseInput,
        parsedBarcode: makeParsedBarcode({ upcPrefix: "" }),
      },
      deps
    );

    expect(catalogLookup).not.toHaveBeenCalled();
  });
});
