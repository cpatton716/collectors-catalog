# Comic Pricing Data Partners — Landscape & Strategy

> **Audience:** Internal engineering + partner-prep reference. The "Executive Summary" + "Comparison Matrix" sections are shareable with co-founder partners (Aponte, etc.). The per-vendor deep dives include implementation notes that stay internal.
>
> **Last updated:** May 6, 2026 (Session 45). Pricing-vendor list pending Patton's expansion.
>
> **Why this doc exists:** Pricing is our most-requested data feature (per CovrPrice partner reply May 6, 2026). The provider landscape is shifting — GoCollect closed their API program Feb 2026, Marvel deprecated their developer API the same window, CovrPrice is pre-public-API. We need a single map of who's available, what they cover, and what we've tried, so partner conversations and engineering choices stay grounded in the same facts.

---

## Executive Summary (shareable)

The comic-data industry is in transition. Three of the historical free/cheap data sources for comic pricing + metadata — GoCollect API, Marvel Developer API, and ad-hoc Diamond catalog access — have either closed or deprecated within the last 90 days. CovrPrice (currently CLZ's exclusive pricing partner) is targeting a 2027 public API.

**What we use today (production):**
- **eBay Browse API** — real-time active-listing prices, our primary pricing source. Free tier, rate-limited. Median of active listings adjusted by a quartile multiplier approximates sold-listing prices.
- **AI cover scan pipeline** (Gemini primary, Anthropic fallback) — recognition + key-info enrichment for books not in our curated DB.

**What's queued for post-launch:**
- **CovrPrice** — partner pipeline beta-tester; API targets 2027.
- **ZenRows scraping proxy** — for CGC cert lookup and Marvel/DC catalog seed scrape; subscription deferred pending ROI.

**What's gone:**
- GoCollect (API program closed Feb 2026)
- Marvel Developer API (deprecated Feb 2026)

**The competitive read:** Collectors Chest is less exposed than CLZ to the data shake-up because we built our own AI scanning pipeline + curated 1,130-entry key-issue DB rather than depending on third-party feeds. CLZ depends entirely on the CovrPrice partnership for in-app valuations. As the data layer consolidates, our independence is a moat.

**The opportunity (May 6, 2026):** PriceCharting's $499/yr Legendary Sub turns out to be the missing piece for sold-listing pricing — same data class as CovrPrice/GoCollect, available now, no partner gating. Integrating this BEFORE Beta Launch would put us at parity (or ahead) on pricing accuracy with CLZ + CovrPrice add-on at ~70% lower data cost than what CLZ users currently pay.

---

## Decision Criteria

When evaluating a new pricing-data partner, weight these four factors:

| Criterion | What "good" looks like |
|---|---|
| **API availability** | Public REST/GraphQL with stable auth, documented rate limits, ideally <500ms p50 latency |
| **Coverage breadth** | Modern + vintage, raw + slabbed, multi-publisher (not just Marvel/DC), grade-aware (CGC/CBCS) |
| **Partnership willingness** | Beta access, technical contact, willing to share roadmap. Bonus: revenue-share or co-marketing |
| **Cost structure** | Predictable subscription beats per-call; per-call workable if the lookup hit-rate is high enough to amortize cost |

All four criteria weighted equally per current product direction. The comparison matrix below scores each vendor across both pricing-specific dimensions AND every other data type we care about (covers, key-issue metadata, UPC catalog, sales-history time series, market trends). Pricing is the primary lens, but a vendor that brings cover-art + key-info + UPC for free is materially more valuable than one that only delivers pricing.

---

## Comparison Matrix

Status legend: ✅ live / available · ⚠️ partial or workaround · ❌ unavailable · ⏳ future / on roadmap · 🆕 pending research.

Coverage legend within data-type cells: ✅ comprehensive · ⚠️ limited or partial · ❌ none.

| Vendor | Status | Pricing (API) | Sold history | Active listings | Multi-publisher | Slabbed grade-aware | Cover images | Key-issue / 1st app | UPC / barcode | Time-series | Market trends | Cost (current) | Partnership signal |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **eBay Browse API** | ✅ Production | ✅ Public REST | ❌ Active only | ✅ | ✅ | ⚠️ Exact-grade only | ✅ Per-listing | ❌ | ❌ | ❌ | ❌ | Free tier, rate-limited | Public API, no contact needed |
| **CovrPrice** | ⏳ 2027 roadmap | ⏳ Targeting public API 2027 | ✅ Sold-listing FMV | ⚠️ Inside CLZ only | ✅ | ✅ | ⚠️ Through CLZ | ✅ 15+ yrs curated | ⚠️ Inside CLZ only | ✅ | ✅ | TBD; CLZ users pay $8.95/mo for their data | ✅ Queued as beta tester (Matt Day reply, May 6 2026) |
| **GoCollect** | ❌ Closed Feb 2026 | ❌ Program shut | ✅ Was: sold | ❌ | ✅ | ✅ | ⚠️ Limited | ✅ | ❌ | ✅ Hot 50 + trends | ✅ | Was ~$89/yr | Closed to new partners |
| **Marvel Developer API** | ❌ Deprecated Feb 2026 | ❌ Never had pricing | ❌ | ❌ | ❌ Marvel only | ❌ | ✅ Catalog cover art | ❌ | ❌ | ❌ | ❌ | Was free, 3K calls/day | n/a |
| **ZenRows (scraping proxy)** | ⏳ Deferred post-launch | n/a (proxy) | n/a | n/a | n/a | n/a | ✅ Via Marvel/DC scrape (planned) | ❌ | ❌ | ❌ | ❌ | $69/mo for 250K credits | Generic SaaS, no comic relationship |
| **Ximilar** | 🆕 Researched May 6 | ✅ Public REST, token auth | ⚠️ Aggregates eBay+Rakuten listings (active/sold unclear) | ✅ | ✅ | ⚠️ PSA/Beckett/SGC explicit — CGC/CBCS unconfirmed | ✅ Recognition + OCR | ⚠️ Identifies issue but no first-app metadata | ❌ | ❌ | ❌ | €59/$64/mo entry (Business 100K); $0.0064/op | ✅ Public docs + B2B contact path |
| **PriceCharting** | 🆕 Researched May 6 | ✅ Public REST + CSV, token auth | ✅ Sold-derived (yearly sales-volume field exposed) | ❌ Sold-only (no active) | ✅ Marvel/DC/Image/Indie | ✅ CGC grades 4.0–10.0 explicit | ⚠️ On per-issue pages, unclear if URLs in CSV | ❌ | ✅ UPC in API + CSV | ✅ Historic sales (daily refresh) | ⚠️ Sales-volume only | **$49/mo Legendary Sub** (or $499/yr — saves 24%) | ✅ Public API + tiered subscription |
| **Apify GoCollect Scraper** | 🆕 Researched May 6 (NOT recommended) | ⚠️ Third-party scraper of GoCollect | ✅ FMV, grade-based | ❌ | ✅ | ✅ | ⚠️ Trending lists | ✅ Key-issue details | ❌ | ⚠️ Trending only | ✅ Hot comics | $5 per 1,000 results + $0.00005/event | ❌ Unofficial; ToS + legal risk |
| *(more pending)* | | | | | | | | | | | | | |

---

## Per-Vendor Deep Dives

### eBay Browse API
**Status:** ✅ In production. Primary pricing source today.

**What it gives us:**
- Real-time active-listing data per query (title + issue + grade + slabbed flag + year hint)
- Per-listing: price, title, condition, image URL, item URL
- Free Browse API tier; OAuth-based auth; rate-limited

**How we use it:**
- `src/lib/ebayBrowse.ts` — `searchActiveListings()` → median of active asking prices, adjusted via a Q1 (lower-quartile) multiplier to approximate sold prices (active prices systematically overshoot sold). `MIN_LISTINGS_THRESHOLD = 3` to avoid single-data-point noise.
- Filter pipeline (`filterIrrelevantListings`) strips obvious mismatches (wrong issue, wrong title, ads).

**Limitations:**
- Active-only — not historical sold-listing data. Apple-to-apples sold prices require eBay's Finding API (deprecated/rate-limited differently).
- Rare/key issues at exact grade frequently have <3 active listings, returning "no data." Tracked in BACKLOG: "FMV Lookup — Graceful Fallback for Rare / Key Issues at Exact Grade."
- No grade-multiplier normalization — current implementation is exact-grade only.

**Cost trajectory:** Free tier is sustainable through Beta. If usage ramps past tier limits, eBay offers paid Browse API access — pricing TBD per usage.

---

### CovrPrice
**Status:** ⏳ Public API on 2027 roadmap. We're queued as beta tester.

**Source confirming the 2027 target:** Email from Matt Day (Director of Operations, partners@covrprice.com), May 6, 2026: *"We do not currently offer a public API for our value data; it is, however, on our radar. Due to the existing project workload, we are targeting 2027 to start looking into a public API offering. While we aren't taking calls on this feature at this time, if there are any specific aspects of an API that you are seeking, we'd be happy to consider that information as we plan out the solution."*

**Patton's reply (May 6):** Beta-tester request + surfaced our users' #1 ask (accurate sales pricing data).

**What CovrPrice has that's interesting:**
- Sold-listing FMV pricing (the gold standard — what's actually selling, not what's listed)
- 15+ years of curated key-issue / first-appearance data (would meaningfully expand our 1,130-entry curated DB)
- Already integrated with CLZ Comics — they're CLZ's exclusive pricing-data partner

**Why this matters strategically:**
- Bringing CovrPrice's data inside Collectors Chest would put our $4.99/mo Premium at parity with CLZ's $1.99 + $8.95 = $10.94/mo combined cost — at half the price (see `docs/CLZ_COMPARISON_BRIEF.md`).
- The 2027 timeline aligns with our post-launch optimization window. By the time their API ships, we'll have Beta data to negotiate with.

**What's NOT safe to say in partner pitches:**
- Don't claim a "deal" or "partnership" — none signed.
- Don't say "active conversations" or "in discussions" — Matt explicitly said they're not taking calls on this feature yet.
- ✅ DO say: "CovrPrice told us their public API is on their 2027 roadmap, and we've been positioned as an early beta tester for when it launches."

**Internal action:** Revisit late 2026 / early 2027 to check on roadmap progress. Nothing actionable now.

---

### GoCollect
**Status:** ❌ API program closed Feb 2026. Not granting new-partner access.

**What it was:**
- Pro-tier API at ~$89/yr; 100 calls/day rate limit
- FMV pricing, Hot 50 lists, market trend data
- Used by many comic-tracker apps as the "default" pricing layer

**Why we lost it:**
- GoCollect closed the API program to new partners in Feb 2026 — coincident with broader industry consolidation
- They didn't publish a reason; we don't know if it's permanent

**What this means for our positioning:**
- Most competing comic apps that integrated GoCollect as their pricing source are now scrambling
- Adds weight to the "Collectors Chest built its own data spine" pitch (per `docs/CLZ_COMPARISON_BRIEF.md`)
- If GoCollect ever reopens, we'd evaluate but they're no longer a primary path

---

### Marvel Developer API
**Status:** ❌ Deprecated Feb 2026.

**What it was:**
- Free tier: 3,000 calls/day — generous
- Marvel-only catalog data (titles, issues, creators, cover art URLs)
- Never offered pricing data

**Why it doesn't matter much for us:**
- Pricing was never the use case — this was metadata + cover art
- Even when active, Marvel-only coverage was a fraction of what we need (we cover all publishers)
- Deprecation is more of a problem for apps that depended on Marvel API for cover art (we built our own AI cover pipeline + community covers)

---

### ZenRows (scraping proxy)
**Status:** ⏳ Subscription deferred post-launch pending ROI decision.

**Pricing:** $69/mo for 250K credits (~10K CGC cert lookups / mo at 25 credits each).

**What it's for (NOT primary pricing):**
- Bypass Cloudflare 403 on `cgccomics.com/certlookup/` for pre-validated cert lookups (current AI fallback works but slower + costs ~$0.015 per AI call)
- Future: scrape Marvel.com + DC.com cover catalogs (post-Marvel-API-deprecation alternative)

**Why we deferred:**
- Pure break-even on AI-scan savings requires ~4,600 CGC slab scans/mo. Unlikely in private Beta.
- Fallback to AI pipeline is confirmed working — users aren't blocked, just ~slower.
- Decision: revisit 2-4 weeks post-launch with real scan-volume data.

**Implementation status:**
- Spec is complete in `BACKLOG.md` "Fix CGC Cert Lookup Cloudflare 403 Errors"
- `ZENROWS_API_KEY` env var already configured in Netlify (anticipating turn-on)

---

### Ximilar — Visual AI for Collectibles
**Status:** 🆕 Researched May 6, 2026. Public API live. Worth pursuing as a NICHE recognition+pricing aggregator, NOT as a primary pricing source.

**What it is:** A visual-AI / OCR service that identifies comics, cards, slabs from images and pulls listings from eBay + Rakuten/Rakuma marketplaces. Two-step API: (a) recognition / OCR endpoint identifies the book, (b) optional pricing lookup returns marketplace listings.

**API endpoint:** `https://api.ximilar.com/tagging/collectibles/v2/comics_id` (auth: `Authorization: Token <api-token>`)

**Coverage claim:** "more than 1 million magazines, books and manga" with name, title, publisher, issue number, release date. Multi-publisher.

**Pricing data:**
- Pulls listings from eBay + Rakuten/Rakuma marketplaces with links
- ⚠️ **Sold vs active not disclosed** in public docs — needs partner-level verification before committing
- ⚠️ **CGC/CBCS slab grading is NOT explicitly supported** — only PSA/Beckett/SGC mentioned. This is a real gap for our buyer/seller use case where CGC is the dominant grading authority for comics. Worth asking their sales contact whether CGC integration is on the roadmap.

**Cost (verified May 6, 2026 from Patton's pricing-page captures):**

| Tier | Credits/mo | Cost | Effective $/op (10-credit pricing or comic-ID call) |
|---|---|---|---|
| Free | 1,000 | €0 | n/a — collectibles tier features locked OFF on Free except AI Card Grading |
| **Business 100K** | 100,000 | €59 / $64/mo | **$0.0064 per pricing call** OR **$0.0064 per comic-ID call** (10 credits each); $0.0128 if you do both back-to-back |
| Business 300K | 300,000 | €175 / $192/mo | ~$0.0064/op |
| Business 500K | 500,000 | €285 / $314/mo | ~$0.0063/op |
| Professional 1M | 1,000,000 | €499 / $549/mo | ~$0.0055/op |
| Professional 40M | 40,000,000 | €9,559 / $9,789/mo | ~$0.0024/op |

**Credit values (collectibles operations):**
- "Identify comics" = 10 credits
- **"Pricing" = 10 credits**
- "Slab Grade" = 5 credits
- "Read & Identify the graded slab" (OCR) = 15 credits
- "Identify card via OCR and AI" = 15 credits
- "Magic AI" (Magic-the-Gathering) = 20 credits

**Add-on credit packs:** From €10/$11 (10K credits) up to €1,040 (5M credits). Never expire, plan-independent.

**Cost vs our current AI pipeline:**
- Our current: **$0.015 per scan** (Anthropic/Gemini)
- Ximilar Business 100K: **$0.0128 for ID+price combined** (or $0.0064 if you only need pricing on books we already identified)

**Ximilar is materially cheaper than our current AI pipeline** — *if* we'd be doing 10K+ ops/mo (Business 100K break-even). At Beta scan volumes (~hundreds of scans/mo), Free tier covers most needs but excludes the collectibles features. Business 100K is the entry to anything useful for us.

**Where it fits in our stack — sharper read after pricing confirmation:**

The cost actually moves Ximilar from "niche" to "interesting alternative" worth real evaluation. Three possible plays:

1. **Replace our AI scan pipeline entirely** — Ximilar at Business 100K = $0.0128/scan (vs. our $0.015/scan via Anthropic/Gemini). Saves ~15% per scan AND offloads recognition complexity. Risk: lose control over our prompt engineering, lose curated key-info enrichment we've built (Ximilar identifies but doesn't surface "first appearance of X" key-issue intel like our DB does).
2. **Use Ximilar as recognition fallback** — when our Gemini pipeline returns ambiguous, fall through to Ximilar (cheaper than the Anthropic fallback at $0.0064/op). Adds resilience without dependency.
3. **Use Ximilar's pricing endpoint only** — at $0.0064/pricing call this is competitive, BUT their pricing layer is still marketplace-listing aggregation (eBay + Rakuten). We already get eBay listings free via Browse API. The unique add is Rakuten — minor for US users.

**Open verification questions for sales contact:**
1. Does the comic identification + pricing endpoint know about CGC and CBCS slabs (not just PSA/Beckett/SGC)? This is the #1 blocker — comics are CGC-dominant.
2. Is the pricing data sold-listings-derived or asking-listings-derived?
3. What's the recognition accuracy on vintage / Golden Age books? (The "1M magazines" claim implies broad coverage but doesn't speak to vintage-specific accuracy.)
4. Any volume discount path beyond Professional 40M?

**Partnership signal:** ✅ Public docs + email/phone/contact-form. Reaching out is straightforward.

**Source:** [Visual AI for Collectibles](https://www.ximilar.com/services/visual-ai-for-collectibles/), [Pricing page](https://www.ximilar.com/pricing/) (verified by Patton May 6, 2026), [Comics ID API docs](https://docs.ximilar.com/collectibles/recognition)

---

### PriceCharting
**Status:** 🆕 Researched May 6, 2026 (verified by Patton in-account). Public API + CSV download live behind a paid subscription. **Strongest "use this now" candidate for sold-listing comic prices** with explicit CGC grade-by-grade support.

**What it is:** Long-running price guide originally for video games, expanded to cards + comics. Comic guide has ungraded + CGC graded pricing across Marvel/DC/Image/Indie/etc, derived from historic sales (sold-listing data — *not* active aggregation). The `sales-volume` API field literally returns "yearly units sold" — confirming this is sold-derived.

**Subscription tiers (verified from account, May 6, 2026):**

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Collection tracker, wishlist, marketplace access — no API |
| Collector Sub | $6/mo or **$59/yr** (-19%) | Free + Deal Alerts, Lot Value Calculator, Grading Recommendations, eBay Deal Scanner, List Value Automator — still no API |
| **Legendary Sub** | **$49/mo or $499/yr** (-24% = $41.58/mo equivalent) | **Download Price Lists (CSV) + API Access to Price Data** + retailer tools (Buy/Sell Prices, eBay Lot Bot, Item Demand Reports) |

**$49/mo for the API tier is materially cheaper than every other "real partner" alternative we've evaluated:**
- CovrPrice (when their API ships in 2027): unknown pricing, but their consumer add-on through CLZ is $8.95/mo and the API tier is unlikely to undercut that for B2B
- GoCollect (closed): was ~$89/yr at the consumer Pro tier, B2B API pricing was unknown
- Ximilar Business 100K: $64/mo (recognition-focused, not sold pricing)

**Annual at $499 is ~70% cheaper than CovrPrice consumer add-on at $107.40/yr.**

**API + CSV:**
- ✅ Public REST: `https://www.pricecharting.com/api/product` + related endpoints
- ✅ Token auth: 40-char access token from Legendary Sub account dashboard, passed as `?t=<token>` query parameter
- ✅ CSV bulk download of full catalog with all price + UPC + metadata fields
- Available "from a browser, from a server, inside Google Sheets"

**Rate limits (verified):**
- API: **1 call per second** (3,600/hour, 86,400/day theoretical max). Account permissions revoked if persistently exceeded. At Beta scan volumes (~100s/day) we won't come close. At Full Launch (10K scans/day = ~7/min average) we're still well under cap.
- CSV: 1 call per 10 minutes. Designed for bulk daily downloads, not realtime. Practically: download once/day, refresh full catalog locally.

**Comic-specific API fields (verified from API docs):**

PriceCharting reuses video-game-named fields for grade-specific comic prices. The mapping:

| API field | Comic grade |
|---|---|
| `loose-price` | **Ungraded** comic |
| `new-price` | Graded 6.0 or 6.5 |
| `cib-price` | Graded 4.0 or 4.5 |
| `graded-price` | Graded 8.0 or 8.5 |
| `manual-only-price` | Graded 9.8 |
| `box-only-price` | Graded 9.2 |
| `condition-17-price` | **Graded 9.4** |
| `bgs-10-price` | Graded 10.0 |
| `sales-volume` | Yearly units sold (sold-data confirmation) |
| `upc` | Universal Product Code (most modern comics; missing for pre-UPC era) |
| `release-date` | Issue release date |
| `product-name` | Issue title |
| `id` | PriceCharting unique product ID |
| `epid` | eBay ePID (cross-reference for eBay listings) |

**Implication:** We get full grade coverage from Ungraded → 4.0/4.5 → 6.0/6.5 → 8.0/8.5 → 9.2 → 9.4 → 9.8 → 10.0. That's a tighter grade granularity than our current eBay Browse exact-grade workaround. The `condition-17-price` mapping for CGC 9.4 (the most-traded grade) being prominent is a strong sign their data is comic-aware, not just video-game-data-with-comics-bolted-on.

**Architecture implication — the play is daily CSV + per-scan API fallback:**

1. **Daily CSV cron** — download full catalog once per 24h, populate our `comic_metadata.price_data` cache. Prices are 24h fresh (vs. real-time eBay Browse aggregation today). Acceptable tradeoff: comic-book prices don't move minute-to-minute; daily refresh is well-aligned with collector market reality. UI can show "Updated today" timestamp for transparency.
2. **Per-scan API for cache misses** — when a user scans a book not yet in our cache (e.g., new release we haven't pulled), single API call (1/sec rate limit, plenty of headroom). Cache the result so future scans are CSV-served.

**This architecture solves multiple BACKLOG entries at once:**
- ✅ "FMV Lookup — Graceful Fallback for Rare / Key Issues at Exact Grade" — sold-derived data doesn't suffer from thin-listing-count problems
- ✅ "Durable eBay Price Cache in Supabase" — replaced by the PriceCharting cache (different data source, same cache concept, materially better data)
- ✅ "Sales Trend Graphs" prerequisite — `sales-volume` field plus daily snapshots give us time-series for free
- ⚠️ Partial: covers most modern UPC-era books; pre-UPC comics (Golden Age) still need our existing AI scan + manual entry flow (PriceCharting notes "UPCs may not be available for older consoles that came out before UPCs were created" — same applies to pre-1973 comics)

**Open questions still worth confirming (low-priority, post-integration):**
1. Cover image URLs in the CSV, or just price + metadata? (Their per-issue web pages show covers, so the data exists — just unclear if exposed via API/CSV)
2. Comic coverage depth — Golden Age / vintage included or skewed modern? (Quick test: search for "Action Comics 1" or "Amazing Fantasy 15" via API once subscribed)
3. Update cadence on the daily CSV — fixed time-of-day, or rolling? (Affects when we schedule our cron)

**Patton's note about freshness:** "Means our prices are only stable for less than 24 hours when you're seeing them." Confirmed — daily CSV gives 24h-fresh data. For comic-book pricing this is a feature, not a bug: collector prices change on the order of days/weeks, not minutes. The current eBay-Browse-active workaround pretends to be real-time but is actually a noisier signal (asking prices ≠ sold prices).

**Source:** [Comic Books category](https://www.pricecharting.com/category/comic-books), [Subscription Packages](https://www.pricecharting.com/pricecharting-pro), [API docs](https://www.pricecharting.com/api-documentation), [API blog post](https://blog.pricecharting.com/2014/03/pricecharting-api.html). API fields + rate limits verified by Patton's in-account view May 6, 2026.

---

### Apify GoCollect Scraper (community)
**Status:** 🆕 Researched May 6, 2026. **NOT recommended** — flagging here because it came up but the risk profile is poor.

**What it is:** Third-party Apify "actor" (scraper) that fetches comic data from GoCollect's website. Maintained by community user `lulzasaur`. Returns prices, FMV, grade-based pricing, key-issue details, trending hot comics.

**Cost:**
- $5.00 per 1,000 results
- $0.00005 per actor-start event
- No tiered discounts (Free / Starter / Scale / Business plans all priced the same per result)

**Why it's tempting:** GoCollect's official API closed Feb 2026. This scraper appears to be the only path back to GoCollect's data without an official relationship.

**Why it's NOT recommended:**
1. **ToS / legal risk** — GoCollect explicitly closed their API program. Scraping their public site to backdoor that data is an antagonistic move that could invite legal action OR a permanent IP block. They have every incentive to detect + block scraper traffic.
2. **Reliability** — Apify reports 3 total users, 1 monthly active user, last updated 10 days ago. No SLA. If GoCollect changes their HTML, the scraper breaks until the community maintainer fixes it. Single point of failure.
3. **No official endorsement** — building production pricing on a third-party scraper of a closed API is fragile by design.
4. **Cost** — $5/1,000 lookups is not free, and we'd be paying for data we have no contractual right to use.

**Strategic recommendation:** Skip. If we want GoCollect's data, the right move is to wait until they reopen the API program (or send a partnership outreach email) — not to scrape around them.

**Source:** [Apify GoCollect Scraper](https://apify.com/lulzasaur/gocollect-scraper/pricing)

---

### *(More pending — Patton may add additional vendors)*

---

## Open Items / Next Steps

**Highest-priority follow-up (after this session's research):**

1. **Subscribe to PriceCharting Legendary Sub ($49/mo or $499/yr) and integrate.** Verified May 6 — they have what we need: sold-derived pricing across the full CGC grade range, $499/yr is materially cheaper than every alternative we've evaluated, API rate limits are generous (1 call/sec), CSV bulk download is purpose-built for the architecture we want (daily refresh of full catalog cache + per-scan API for misses). This integration solves three open BACKLOG entries simultaneously: FMV Lookup graceful fallback, Durable eBay Price Cache, and Sales Trend Graphs prerequisite. **Recommend creating a BACKLOG entry to scope the integration, target Pre-Launch.**

2. **Email Ximilar sales** with three questions: (a) Does comic ID + pricing know about CGC and CBCS? (b) Is pricing data sold-derived or active-derived? (c) Vintage / Golden-Age recognition accuracy benchmarks? **Without CGC support, Ximilar is a non-starter** for our marketplace use case. Even with CGC support, PriceCharting now occupies the "sold pricing" slot in the stack — Ximilar would only be evaluated as a recognition fallback to Gemini. Lower priority than it was before PriceCharting verification.

3. **Skip the Apify GoCollect scraper.** Documented here for completeness but the ToS + reliability risk make it not worth pursuing.

**Lower-priority follow-ups:**

4. **CovrPrice 2027 roadmap check-in** — revisit late 2026; track via project memory.
5. **eBay Finding API** (sold-listing history) — investigate whether the deprecation status of Finding API blocks us from sold-history thicker-data improvements. Ties to BACKLOG "FMV Lookup — Graceful Fallback." May be moot if PriceCharting works out.
6. **Comic Vine API** — not currently in our stack but cited in `docs/BARCODE_RESEARCH.md`. Worth checking if their pricing fields exist (likely not — they're a metadata service).
7. **League of Comic Geeks** — community/social platform; unclear if they expose any data API. Worth asking.

---

## Internal-Only Footnotes

- See `docs/CLZ_COMPARISON_BRIEF.md` for the partner-meeting-prep version of the data-partnerships story (focuses on resilience pitch, not vendor evaluation).
- See `docs/BARCODE_RESEARCH.md` for the related discussion of barcode-catalog data sources (overlaps with metadata; doesn't address pricing).
- All claims about competitor / vendor pricing should be re-verified before any external publication — competitor pricing changes without notice.
