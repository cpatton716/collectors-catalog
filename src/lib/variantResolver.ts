/**
 * 3-tier variant name resolver. Runs after AI cover analysis in /api/analyze
 * when the comic has a parsed UPC supplement. Decides what to write into
 * `comicDetails.variant` and tags the source so the review form can surface
 * a "Detected from barcode" hint.
 *
 * Tier 1 (catalog): instant + free. Looks up
 *   (upc_prefix, addon_issue, addon_variant) in barcode_catalog and returns
 *   the admin-approved variant name. As the catalog grows, most scans get
 *   here and never spend AI credits.
 *
 * Tier 2 (AI enrichment): focused text-only call (~$0.0008 with Haiku).
 *   Fires only on Tier-1 miss when (a) the addon clearly indicates a variant
 *   and (b) AI's first-pass cover-derived hint is generic ("Cover B") or null.
 *   Asks the model for the canonical variant name given title + issue + year.
 *
 * Tier 3 (derived): the legacy "addon[0] > 1 -> Cover A/B/C/..." mapping.
 *   Last-resort fallback when both catalog and AI come up empty.
 *
 * The resolver also respects "rich" cover-derived AI hints -- if AI saw an
 * artist credit or "Variant Cover" text on the front and returned something
 * like "Greg Capullo Variant", we keep that and skip enrichment.
 */

import Anthropic from "@anthropic-ai/sdk";

import { MODEL_LIGHTWEIGHT } from "@/lib/models";
import { supabaseAdmin } from "@/lib/supabase";

import type { BarcodeData } from "@/types/comic";

// ── Types ──

export type VariantSource = "catalog" | "ai" | "derived";

export interface VariantResolution {
  variantName: string | null;
  source: VariantSource | null;
}

export interface ResolveVariantInput {
  title: string;
  issueNumber: string;
  releaseYear: string | null;
  publisher: string | null;
  parsedBarcode: BarcodeData["parsed"] | undefined;
  /** What AI returned for `variant` from cover analysis (may be null or generic). */
  aiVariantHint: string | null;
}

export interface ResolverDeps {
  catalogLookup: CatalogLookup;
  enricher: VariantEnricher;
}

export type CatalogLookup = (parts: {
  upcPrefix: string;
  addonIssue: string | undefined;
  addonVariant: string;
}) => Promise<string | null>;

export type VariantEnricher = (input: {
  title: string;
  issueNumber: string;
  releaseYear: string | null;
  publisher: string | null;
  addonVariant: string;
}) => Promise<string | null>;

// ── Heuristics ──

const COVER_LETTERS = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I"];
const NON_VARIANT_ADDONS = new Set(["00", "01", "11"]);
const RICH_NAME_PATTERN = /\b(variant|incentive|edition|foil|sketch|virgin|holofoil|newsstand|direct)\b/i;
const RATIO_PATTERN = /\d+:\d+/;

/** True when the AI hint reads like a canonical variant name (artist + variant, ratio, etc.) */
export function isRichVariantName(name: string | null | undefined): boolean {
  if (!name) return false;
  if (RICH_NAME_PATTERN.test(name)) return true;
  if (RATIO_PATTERN.test(name)) return true;
  // Multi-word name with capitalized tokens looks artist-driven
  const words = name.trim().split(/\s+/);
  if (words.length >= 3) return true;
  return false;
}

/** True when the addon-variant code suggests this isn't a base Cover A 1st print. */
export function isVariantAddon(addonVariant: string | undefined): boolean {
  if (!addonVariant) return false;
  return !NON_VARIANT_ADDONS.has(addonVariant);
}

/** Fallback: map the first addon digit to a generic cover letter ("Cover B"). */
export function deriveVariantFromAddon(addonVariant: string | undefined): string | null {
  if (!addonVariant || addonVariant.length === 0) return null;
  const firstDigit = parseInt(addonVariant[0], 10);
  if (Number.isNaN(firstDigit) || firstDigit <= 1 || firstDigit > 9) return null;
  return `Cover ${COVER_LETTERS[firstDigit]}`;
}

// ── Resolver ──

export async function resolveVariant(
  input: ResolveVariantInput,
  deps: ResolverDeps
): Promise<VariantResolution> {
  const parsed = input.parsedBarcode;

  // No parsed barcode -- nothing to resolve. Trust whatever AI returned.
  if (!parsed?.addonVariant || !parsed?.upcPrefix) {
    return {
      variantName: input.aiVariantHint,
      source: input.aiVariantHint ? "ai" : null,
    };
  }

  const addonVariant = parsed.addonVariant;

  // Tier 1: catalog lookup (fast + free)
  try {
    const fromCatalog = await deps.catalogLookup({
      upcPrefix: parsed.upcPrefix,
      addonIssue: parsed.addonIssue,
      addonVariant,
    });
    if (fromCatalog) {
      return { variantName: fromCatalog, source: "catalog" };
    }
  } catch (err) {
    console.warn("[variantResolver] Catalog lookup failed", err);
    // fall through
  }

  // If AI already returned a rich, canonical-looking name, keep it.
  if (isRichVariantName(input.aiVariantHint)) {
    return { variantName: input.aiVariantHint, source: "ai" };
  }

  // Tier 2: AI enrichment (only when the addon implies a real variant)
  if (isVariantAddon(addonVariant)) {
    try {
      const enriched = await deps.enricher({
        title: input.title,
        issueNumber: input.issueNumber,
        releaseYear: input.releaseYear,
        publisher: input.publisher,
        addonVariant,
      });
      if (enriched) {
        return { variantName: enriched, source: "ai" };
      }
    } catch (err) {
      console.warn("[variantResolver] AI enrichment failed", err);
      // fall through
    }
  }

  // Tier 3: addon-derived generic name ("Cover B")
  const derived = deriveVariantFromAddon(addonVariant);
  if (derived) {
    return { variantName: derived, source: "derived" };
  }

  // Final: keep AI hint if any (generic better than nothing); else null.
  return {
    variantName: input.aiVariantHint,
    source: input.aiVariantHint ? "ai" : null,
  };
}

// ── Default dep implementations (production wiring) ──

/**
 * Tier-1 catalog lookup. Returns the most-frequently-approved variant name
 * for the given barcode signature, or null if the catalog has no approved
 * entry yet. Falls back to addon-issue-loose match if the strict lookup
 * misses (lets us tolerate scanner-side off-by-one issue digits).
 */
export const lookupApprovedVariantName: CatalogLookup = async ({
  upcPrefix,
  addonIssue,
  addonVariant,
}) => {
  if (!supabaseAdmin) return null;

  let query = supabaseAdmin
    .from("barcode_catalog")
    .select("variant_name")
    .eq("upc_prefix", upcPrefix)
    .eq("addon_variant", addonVariant)
    .eq("variant_name_status", "approved")
    .not("variant_name", "is", null);

  if (addonIssue) {
    query = query.eq("addon_issue", addonIssue);
  }

  const { data, error } = await query.limit(50);
  if (error || !data || data.length === 0) return null;

  // Pick the most common name across approved submissions; ties go to the
  // first one (Postgres returns rows in insertion order absent an order-by).
  const counts = new Map<string, number>();
  for (const row of data) {
    const name = (row as { variant_name: string | null }).variant_name;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let bestName: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestName = name;
    }
  }
  return bestName;
};

/**
 * Tier-2 AI enrichment. Single text-only Haiku call. Cost: ~$0.0008 each.
 * Conservative prompt -- model is told to return null rather than fabricate.
 */
export const enrichVariantNameFromAI: VariantEnricher = async ({
  title,
  issueNumber,
  releaseYear,
  publisher,
  addonVariant,
}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const yearPart = releaseYear ? ` (${releaseYear})` : "";
  const publisherPart = publisher ? `, published by ${publisher}` : "";

  const prompt = `You are a comic book variant catalog. Identify the canonical variant name for the following book.

Book: ${title} #${issueNumber}${yearPart}${publisherPart}
UPC supplement variant code: ${addonVariant}

The 5-digit UPC supplement on Marvel/DC/Image books encodes issue + variant + printing. The variant code's last 2 digits typically indicate cover variant and printing (e.g., "21" = Cover B 1st print, "12" = Cover A 2nd print). For this book and code, what is the canonical variant name commonly used in collector databases?

Common formats:
- "[Artist Name] Variant Cover" (most common, e.g., "Greg Capullo Variant Cover")
- "Cover B" / "Cover C" / etc. (when artist is unknown)
- "1:25 Ratio Variant", "1:50 Incentive" (incentive variants)
- "Foil Cover", "Holofoil Edition", "Sketch Variant" (special editions)
- "Newsstand Edition", "Direct Edition" (distribution variants)

Return ONLY a JSON object: {"variantName": "string"} or {"variantName": null}.

Be conservative: if you cannot identify a specific variant for this exact issue, return null. Do not fabricate names. Do not include reasoning, just the JSON.`;

  try {
    const response = await client.messages.create({
      model: MODEL_LIGHTWEIGHT,
      max_tokens: 96,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    let text = textBlock.text.trim();
    if (text.startsWith("```json")) text = text.slice(7);
    if (text.startsWith("```")) text = text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);

    const parsed = JSON.parse(text.trim()) as { variantName: string | null };
    const name = parsed.variantName;
    if (!name || typeof name !== "string") return null;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === "null") return null;
    return trimmed;
  } catch (err) {
    console.warn("[variantResolver] enrichVariantNameFromAI threw", err);
    return null;
  }
};
