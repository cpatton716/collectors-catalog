# Barcode Scanning — Competitive Research

> **Status:** Initial pass May 6, 2026 (Session 45). Synthesizes publicly-available information about CLZ Comics and CovrPrice barcode flows. Sections marked "verify" require live investigation Patton can do — most accurately by installing the apps on a fresh test phone with a network proxy (Charles / Proxyman) and capturing API calls during real scans.
>
> **Source for BACKLOG decisions:** "Research: How CLZ + CovrPrice Implement Barcode Scanning" (May 5, 2026) and "Re-introduce Dedicated Barcode Scanning" (currently blocked on this research).

---

## 1. CLZ Comics

### Decode pipeline
**On-device decode confirmed.** CLZ's marketing materials and App Store listings reference camera-based barcode scanning that works offline on iOS and Android. Their Mac/Windows/Linux desktop apps (clz.com) integrate with phone-camera scanners via the same database. This pattern strongly suggests:
- iOS: AVFoundation's `AVCaptureMetadataOutput` (native barcode formats)
- Android: ML Kit Barcode Scanning OR ZXing (legacy CLZ versions used ZXing per old release notes)

The decoded UPC/EAN code is then sent to their server for the lookup. **Verify:** Charles Proxy on a real scan should show a single GET/POST to a clz.com endpoint with the decoded barcode in the query string or body.

### Data source — internal DB
**Almost certainly an internal database built over 15+ years of user submissions.** Evidence:
- CLZ has been operating since ~2003 (manual entry era)
- Their core feature page on clz.com explicitly describes "our online database, the largest comic database in the world… maintained by us with the help of our user community"
- Subscription pricing ($1.99/mo Mobile alone, no per-lookup metering) implies amortized fixed cost, not per-call API
- "Submit Missing Cover" / "Submit Missing Comic" community features visible in their app screenshots

This is consistent with a publisher → barcode → cover/metadata mapping table they own outright. Bootstrapping equivalent from scratch is the hard part.

### Failure mode
**Best guess (verify on-device):** Manual fallback to a search-by-title flow. Likely:
1. Decode barcode → DB miss
2. Show empty state with "Submit this comic" or "Search by title instead" CTA
3. User can manually contribute UPC + cover, gets reviewed by CLZ moderators

This matches their broader community-contribution UX patterns (cover submissions, missing-issue flagging).

### Cost structure (CLZ's side)
- **Hosting + DB ops:** modest — barcode lookup is just an indexed PK query
- **Moderation:** ongoing human cost on user submissions (likely how their team is most loaded)
- **No per-lookup external fees** evidenced — entirely self-hosted

---

## 2. CovrPrice

### Decode + lookup
**Almost certainly piggybacks on CLZ's data.** Per `docs/CLZ_COMPARISON_BRIEF.md`, CovrPrice is offered as the "+$8.95/mo CovrPrice Premium" add-on that CLZ users buy ON TOP OF CLZ Mobile. The integration is bidirectional:
- CLZ users see CovrPrice values inside the CLZ app
- CovrPrice's standalone app can query CLZ's barcode DB (under their partnership)

This means CovrPrice does NOT independently maintain a barcode-to-comic catalog. Their differentiator is the **value/pricing layer** on top of CLZ's catalog primitive.

### Verify
On a CovrPrice-only install (no CLZ subscription), test whether barcode scanning works. If it does → they have their own DB. If it requires the CLZ partnership data → they're entirely dependent on CLZ for catalog and only own the pricing layer.

---

## 3. Public / open resources

### What does NOT exist (as of May 2026)
- No major open-source comic barcode → metadata dataset (checked GitHub, OpenFoodFacts-style community feeds, GS1 public records — comic-book UPCs aren't in the structured public catalogs that food/CPG products are in)
- No Comic Vine / League of Comic Geeks API exposes UPC fields directly (their search is title/issue-based)
- Diamond Comics' historical UPC distribution lists are not published — internal industry data

### What partially exists
- **Marvel UPC list** (community-maintained, fragmentary) on a few collector forums
- **Tachiyomi** + Mylar (open-source comic readers) have NO barcode lookup — they're title-driven
- **Comic-related GS1 prefixes** are documented (Marvel, DC, Image each have stable GS1 prefixes) — useful for *publisher* identification but not *issue* identification from a barcode alone

### What this means
There's no shortcut dataset to bootstrap from. We'd be starting at zero, the same as CLZ did 20+ years ago — but we have AI cover scan as a force multiplier they didn't have.

---

## 4. Decision matrix for our barcode strategy

| Approach | Time-to-MVP | Cost | Coverage at launch | Coverage at year 1 | Risk |
|---|---|---|---|---|---|
| **Bootstrap own DB from user scans** (CLZ approach) | Slow (months for meaningful coverage) | Low ongoing | Near-zero | Maybe 5-15% of in-print | Long-tail empty-state UX |
| **Diamond / publisher data partnership** | Slow (deal-dependent, may never close) | Unknown | Could be 80%+ instantly | 80%+ | Deal blocker |
| **Paid 3rd-party API** (assuming one exists) | Fast | $X/mo + per-lookup | Whatever they cover | Same | Cost scales with usage |
| **AI cover scan ONLY** (existing) | None | $0.015/scan | 99%+ | 99%+ | "We don't have barcode" gap on the floor |
| **Hybrid: AI scan primary + crowd-source UPC mapping on success** | Medium | Free (uses our scan output) | Grows organically with usage | Could reach 50%+ at scale | UX has to nudge users to confirm UPC |

**The hybrid (row 5) is the most aligned with our existing strengths.** Every successful AI cover scan that ALSO had a barcode in-frame gives us a UPC → comic mapping for free. Wire that into a `barcode_catalog` table and within a few thousand scans we have meaningful coverage of common modern books — without competing head-on with CLZ's 20-year catalog moat.

---

## 5. Recommendation

1. **Don't compete on barcode catalog completeness against CLZ.** They have 20 years of crowd-sourced data and we won't catch up by re-doing the same thing.
2. **Use the hybrid approach:** when an AI cover scan succeeds AND a barcode is detected in the same image, store the UPC → comic mapping in our own `barcode_catalog`. After the first ~5K scans we'll have meaningful coverage of in-print modern issues.
3. **Position barcode as "fast path for modern books, AI cover scan handles everything else"** in marketing — turn the gap into a differentiator (vintage / no-barcode books are the hard case where CLZ's catalog also fails).
4. **Defer the standalone barcode scanner re-introduction** until our crowd-sourced catalog has enough coverage to justify a dedicated scanner UX. Until then, the existing AI cover scan handles barcoded books too (it just doesn't read the barcode itself).
5. **For CovrPrice positioning:** verify on a CovrPrice-only install that they fall back when no CLZ partnership data — this gives us a ready talking point ("CovrPrice's barcode is *their partner CLZ's* barcode, so when CLZ misses, they miss").

## 6. Open questions for live investigation (Charles Proxy on real device)

- What endpoint does CLZ hit on barcode scan? (URL pattern + auth method)
- What's the response shape — comic object with cover URL, or just a comic_id?
- How fast is the round-trip? (CLZ's marketing claims 99%+ accuracy at scan-speed)
- Does CLZ surface a "no match" UX with submit-this-book CTA, or does it silently fall back to title search?
- Does CovrPrice work standalone for barcode lookup? (test without CLZ subscription)
- Is there any visible third-party SDK signature in CLZ's app bundle (ML Kit fingerprints, ZXing strings)?

---

## 7. Implementation guidance (if we move forward with hybrid)

Files this would touch:
- New `src/lib/barcodeCatalog.ts` (CRUD on `barcode_catalog` table)
- New migration `supabase/migrations/<date>_barcode_catalog.sql` (`upc TEXT PRIMARY KEY, comic_metadata_id UUID REFERENCES comic_metadata, contributed_by UUID, scan_count INTEGER, ...`)
- Hook into `analyze` route's success path: if AI scan succeeded AND request included a UPC field, upsert into barcode_catalog
- Hook into scan input UX: when barcode detected on-device, check `barcode_catalog` BEFORE running AI cover scan (saves $0.015/scan)
- Admin review queue for low-confidence catalog entries (multiple users submitting different comic IDs for the same UPC = needs review)

Effort estimate: 2-3 days for backend + scan-pipeline integration; admin review UI another day. Lower than the original "build standalone barcode scanner from scratch" estimate because we're piggybacking on existing scan flow.

---

## 8. Next steps for Patton

1. **Live capture** — install CLZ Comics on a test phone with Charles Proxy. Scan 5-10 modern comics, capture the API calls. Save the network log for review.
2. **Standalone CovrPrice test** — install CovrPrice without CLZ subscription, attempt barcode scan. Note the failure mode if it doesn't work alone.
3. **Decide on the recommendation** — if we accept the hybrid approach, the existing "Re-introduce Dedicated Barcode Scanning" BACKLOG entry should be re-scoped to the hybrid spec rather than the curated-DB-from-scratch spec.
