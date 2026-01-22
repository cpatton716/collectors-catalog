# Development Log

This log tracks session-by-session progress on Collectors Chest.

---

## Changes Since Last Deploy

**Sessions since last deploy:** 1
**Deploy Readiness:** Ready - All tests pass, build succeeds

### Accumulated Changes:
- **Performance Optimization Phases 1-4** - Complete codebase optimization
  - Anthropic API cost reduced ~47% ($0.015 → ~$0.008/scan)
  - Combined 4 AI calls into 1-2 per scan
  - Redis caching for profiles, titles, barcodes, certs
  - ISR for hot books page (1-hour revalidation)
  - Deleted ebay.ts, consolidated to single eBay implementation
  - Database performance indexes added

---

## January 21, 2026

### Session Summary
Comprehensive performance optimization across 4 phases. Re-evaluated the entire codebase to identify opportunities for reducing API costs, improving response times, and consolidating redundant services.

### Key Accomplishments

**Phase 1 - Quick Wins:**
- Reduced Anthropic max_tokens allocations (10-15% cost savings)
- Switched title suggestions from Sonnet to Haiku model (60% cost reduction on endpoint)
- Fixed duplicate database query in admin/usage route
- Removed broken in-memory cache from con-mode-lookup

**Phase 2 - AI Optimization:**
- Combined 4 sequential Anthropic API calls into 1-2 calls (30-35% savings)
- Added image hash caching for AI analysis (30-day TTL) - avoids re-analyzing same covers
- Added barcode lookup caching (6-month TTL) - Comic Vine lookups
- Added cert lookup caching (1-year TTL) - CGC/CBCS certificates are immutable

**Phase 3 - Architecture:**
- Removed Supabase eBay cache layer, consolidated to Redis-only
- Deleted `src/lib/ebay.ts` (568 lines), consolidated to `ebayFinding.ts`
- Added profile caching (5-min Redis TTL) for ~40+ API calls per session
- Implemented ISR for hot books page with server-side data fetching
- Fixed hottest-books internal HTTP call (now direct library call)

**Phase 4 - Final Polish:**
- Created database performance indexes migration (8 indexes)
- Replaced broken title autocomplete in-memory cache with Redis (24-hour TTL)

### Files Added
- `src/app/hottest-books/HotBooksClient.tsx` - Client component for ISR
- `src/lib/hotBooksData.ts` - Server-side hot books data layer
- `supabase/migrations/20260121_performance_indexes.sql` - DB indexes

### Files Deleted
- `src/lib/ebay.ts` - Redundant Browse API implementation

### Files Modified
- `src/lib/cache.ts` - Added profile, titleSuggest cache prefixes
- `src/lib/db.ts` - Added profile caching with invalidation
- `src/app/api/analyze/route.ts` - Combined AI calls, Redis-only caching
- `src/app/api/ebay-prices/route.ts` - Migrated to Finding API + Redis
- `src/app/api/hottest-books/route.ts` - Direct library calls
- `src/app/api/titles/suggest/route.ts` - Redis caching
- `src/app/api/barcode-lookup/route.ts` - Added caching
- `src/lib/certLookup.ts` - Added caching
- `EVALUATION.md` - Updated optimization plan status

### Database Migrations Required
- `20260121_performance_indexes.sql` ✅ (already applied)

### Expected Impact
| Metric | Before | After |
|--------|--------|-------|
| Anthropic cost/scan | $0.015 | ~$0.008 |
| API calls/scan | 4+ | 1-2 |
| Cache hit rate | ~30% | ~70% |
| DB queries/session | ~25 | ~5 |

---

## Deploy Log - January 17, 2026

**Deployed to Netlify**

### Changes Included:
- **Email Capture** - Guest bonus scans for email signup
- **Test Coverage** - 43 Jest tests (auction, subscription, guest scans)
- **Subscription Foundation** - Billing routes, feature gating, pricing page
- **Community Key Info** - 402 curated key comics, user submissions, admin moderation
- **Username System** - Custom display names with validation
- **Custom Profile Page** - Replaced Clerk's UserProfile
- **Key Hunt Wishlist** - Track comics you want to find
- **Hot Books Caching** - Database-first with 24-hour price refresh
- **Usage Monitoring** - Admin dashboard, email alerts for service limits
- **Image Optimization** - Client-side compression to 400KB
- **Design Branch Sync** - Merged main into all 3 design branches

### Database Migrations Required:
- `20260115_add_subscription_fields.sql`
- `20250117_key_info_community.sql`
- `20250117_key_info_seed.sql`
- `20260117_add_username.sql`
- `20250117_hot_books_and_key_hunt.sql`
- `20250117_usage_monitoring.sql`

### New Environment Variables:
- `ADMIN_EMAIL` - For usage alert notifications

---

## January 17, 2026 (Late Session)

### Session Summary
Added Key Hunt wishlist feature allowing users to track comics they want to acquire. Implemented Hot Books database caching to reduce API calls. Created usage monitoring system with email alerts. Added client-side image optimization. Merged all changes to design branches.

### Key Accomplishments
- **Key Hunt Wishlist** - Full CRUD system for tracking wanted comics
  - Database table `key_hunt_lists` with RLS policies
  - API routes at `/api/key-hunt` (GET, POST, DELETE, PATCH)
  - `useKeyHunt` React hook for state management
  - `AddToKeyHuntButton` component for Hot Books and scan results
  - `KeyHuntWishlist` component for viewing/managing hunt list
  - Integrated "My Hunt List" option into Key Hunt bottom sheet
- **Hot Books Caching** - Reduced API calls and improved load times
  - Database tables `hot_books`, `hot_books_history`, `hot_books_refresh_log`
  - 10 seeded hot comics with static data
  - 24-hour lazy price refresh from eBay API
  - Refactored `/api/hottest-books` to use database-first approach
- **Usage Monitoring** - Alert system for service limits
  - Database table `usage_alerts` for tracking alerts
  - `/api/admin/usage` endpoint for metrics
  - `/api/admin/usage/check-alerts` for limit checking
  - Admin dashboard at `/admin/usage`
  - Netlify scheduled function for daily checks
- **Image Optimization** - Reduced storage usage
  - Client-side compression targeting 400KB (down from 1.5MB)
  - Updated ImageUpload and LiveCameraCapture components
- **Branch Sync** - Merged main into all design branches
  - design/pop-art-lichtenstein
  - design/retro-futuristic
  - design/vintage-newsprint

### Files Added
- `src/app/api/key-hunt/route.ts`
- `src/hooks/useKeyHunt.ts`
- `src/components/AddToKeyHuntButton.tsx`
- `src/components/KeyHuntWishlist.tsx`
- `src/lib/imageOptimization.ts`
- `src/app/api/admin/usage/route.ts`
- `src/app/api/admin/usage/check-alerts/route.ts`
- `src/app/admin/usage/page.tsx`
- `netlify.toml`
- `netlify/functions/check-usage-alerts.ts`
- `supabase/migrations/20250117_hot_books_and_key_hunt.sql`
- `supabase/migrations/20250117_usage_monitoring.sql`

### Files Modified
- `src/app/api/hottest-books/route.ts` - Refactored for database caching
- `src/app/hottest-books/page.tsx` - Added AddToKeyHuntButton
- `src/app/key-hunt/page.tsx` - Added My Hunt List flow
- `src/components/ComicDetailsForm.tsx` - Added AddToKeyHuntButton to scan results
- `src/components/KeyHuntBottomSheet.tsx` - Added My Hunt List option
- `src/components/ImageUpload.tsx` - Added compression
- `src/components/LiveCameraCapture.tsx` - Added compression

### Database Changes
- Created `hot_books` table with 10 seeded comics
- Created `hot_books_history` table for ranking tracking
- Created `key_hunt_lists` table for user wishlists
- Created `hot_books_refresh_log` table for API tracking
- Created `usage_alerts` table for monitoring

### Environment Variables Added
- `ADMIN_EMAIL` - For usage alert notifications

---

## January 17, 2026 (Earlier Session)

### Session Summary
Built community key info system with 402 curated key comic entries. Added username system with validation and custom profile page. Implemented key info submission with admin moderation.

### Key Accomplishments
- **Key Comics Database** - 402 curated key comic entries
  - `keyComicsDatabase.ts` with comprehensive key info
  - `keyComicsDb.ts` for database operations
  - Database-backed key info lookup in analyze API
- **Community Key Info** - User submission system
  - `SuggestKeyInfoModal` component for submissions
  - `/api/key-info/submit` for user submissions
  - Admin moderation at `/admin/key-info`
  - `/api/admin/key-info` routes for approval/rejection
- **Username System** - Customizable display names
  - `UsernameSettings` component
  - `/api/username` with validation
  - `/api/username/current` for fetching
  - `usernameValidation.ts` utilities
- **Custom Profile Page** - Replaced Clerk's UserProfile
  - `CustomProfilePage` component
  - Account settings, display preferences
  - Integrated username management

### Files Added
- `src/lib/keyComicsDatabase.ts` - 402 key comic entries
- `src/lib/keyComicsDb.ts` - Database operations
- `src/components/SuggestKeyInfoModal.tsx`
- `src/components/UsernameSettings.tsx`
- `src/components/CustomProfilePage.tsx`
- `src/lib/usernameValidation.ts`
- `src/hooks/useDebounce.ts`
- `src/app/admin/key-info/page.tsx`
- `src/app/api/key-info/submit/route.ts`
- `src/app/api/admin/key-info/route.ts`
- `src/app/api/admin/key-info/[id]/route.ts`
- `src/app/api/username/route.ts`
- `src/app/api/username/current/route.ts`
- `supabase/migrations/20250117_key_info_community.sql`
- `supabase/migrations/20250117_key_info_seed.sql`
- `supabase/migrations/20260117_add_username.sql`

### Files Modified
- `src/app/profile/[[...profile]]/page.tsx` - Use CustomProfilePage
- `src/components/ComicDetailModal.tsx` - Add Suggest Key Info button
- `src/components/auction/AuctionDetailModal.tsx` - Show key info
- `src/components/auction/ListingDetailModal.tsx` - Show key info
- `src/components/auction/SellerBadge.tsx` - Display username
- `src/app/api/analyze/route.ts` - Database key info lookup

### Database Changes
- Created `key_comics` table with 402 seeded entries
- Created `key_info_submissions` table for community submissions
- Added `username` and `display_name_preference` to user_profiles

---

## January 15, 2026 (Session)

### Session Summary
Added email capture for guest bonus scans, implemented test coverage with Jest, built subscription billing foundation, and created feature gating system.

### Key Accomplishments
- **Email Capture** - Bonus scans for email signup
  - `EmailCaptureModal` component
  - `/api/email-capture` with Resend integration
  - 5 bonus scans for email submission
- **Test Coverage** - 43 tests across 3 test files
  - `auction.test.ts` - Auction calculations
  - `subscription.test.ts` - Subscription logic
  - `useGuestScans.test.ts` - Guest scan tracking
- **Subscription Billing** - Foundation for premium tiers
  - `subscription.ts` with tier logic
  - `useSubscription.ts` hook
  - `/api/billing/*` routes (checkout, portal, status)
  - Stripe webhook updates
- **Feature Gating** - Control access by tier
  - `FeatureGate` component
  - `UpgradeModal` for upgrade prompts
  - `TrialPrompt` for trial conversion
  - `ScanLimitBanner` for limit warnings
- **Pricing Page** - Tier comparison at `/pricing`
- **Scan Limits** - Guest 5, free 10/month

### Files Added
- `src/components/EmailCaptureModal.tsx`
- `src/components/FeatureGate.tsx`
- `src/components/UpgradeModal.tsx`
- `src/components/TrialPrompt.tsx`
- `src/components/ScanLimitBanner.tsx`
- `src/lib/subscription.ts`
- `src/hooks/useSubscription.ts`
- `src/app/pricing/page.tsx`
- `src/app/api/email-capture/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/status/route.ts`
- `src/app/api/cron/reset-scans/route.ts`
- `jest.config.js`, `jest.setup.js`
- `src/types/__tests__/auction.test.ts`
- `src/lib/__tests__/subscription.test.ts`
- `src/hooks/__tests__/useGuestScans.test.ts`
- `SUBSCRIPTION_TIERS.md`
- `supabase/migrations/20260115_add_subscription_fields.sql`

### Files Modified
- `src/hooks/useGuestScans.ts` - Bonus scan support
- `src/app/api/analyze/route.ts` - Scan limit checks
- `src/app/api/webhooks/stripe/route.ts` - Subscription handling
- Various pages - FeatureGate wrappers

---

## Deploy Log - January 14, 2026 (Late Evening)

**Deployed to Netlify**

### Changes Included:
- **Bug Fix: Pull off the Shelf** - Fixed RLS blocking issue using `supabaseAdmin`
- **Bug Fix: Hydration Mismatch** - Added `hasMounted` state to MobileNav
- **Legal Pages** - Added `/privacy` and `/terms` page structure with CCPA compliance
- **Homepage Footer** - Added Privacy Policy and Terms of Service links
- **Documentation** - Added ARCHITECTURE.md, updated EVALUATION.md with LLC requirement
- **CLAUDE.md Updates** - Added "Let's get started" command, env var deploy check

### Files Added:
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/hooks/useCollection.ts`
- `src/app/api/comics/[id]/route.ts`
- `ARCHITECTURE.md`

---

## January 14, 2026 (Late Evening Session)

### Session Summary
Fixed production bugs with listing cancellation and hydration errors. Created legal page structure for Privacy Policy and Terms of Service. Researched LLC requirements for marketplace operation.

### Key Accomplishments
- **Bug Fix: Pull off the Shelf** - Fixed RLS blocking issue by using `supabaseAdmin` instead of `supabase` in `cancelAuction` function
- **Bug Fix: Hydration Mismatch** - Added `hasMounted` state to MobileNav to prevent server/client render differences
- **Legal Page Structure** - Created `/privacy` and `/terms` pages with placeholder content tailored to Collectors Chest
- **Homepage Footer** - Added footer with Privacy Policy and Terms of Service links
- **LLC Research** - Determined LLC formation is recommended for marketplace liability protection
- **Documentation Updates** - Updated EVALUATION.md and BACKLOG.md to reflect LLC requirement and legal page dependencies

### Issues Encountered
- "Pull off the Shelf" returning 200 but not actually cancelling → Root cause: RLS policy blocking the update when using regular `supabase` client
- React hydration error in MobileNav → Root cause: `isSignedIn` value differing between server and client

### Files Added
- `src/app/privacy/page.tsx` - Privacy Policy page with CCPA section
- `src/app/terms/page.tsx` - Terms of Service page with marketplace terms

### Files Modified
- `src/components/MobileNav.tsx` - Added hasMounted state for hydration fix
- `src/lib/auctionDb.ts` - Changed cancelAuction to use supabaseAdmin
- `src/app/page.tsx` - Added footer with legal links
- `EVALUATION.md` - Added LLC requirement, updated priorities
- `BACKLOG.md` - Added LLC formation section

---

## January 14, 2026 (Evening Session - Continued)

### Session Summary
Debugging session to fix production listing creation errors. Discovered missing Supabase columns for graded comics and missing env var in Netlify.

### Key Accomplishments
- **Production Fix** - Added `SUPABASE_SERVICE_ROLE_KEY` to Netlify environment variables
- **Database Schema Fix** - Added missing columns for graded comics: `certification_number`, `label_type`, `page_quality`, `grade_date`, `grader_notes`, `is_signature_series`, `signed_by`
- **CLAUDE.md Updates** - Added critical env var check to deploy process, added "Let's get started" command
- **Test Cases** - Added test cases for listing features

### Issues Encountered
- Production "Unknown error" on listing creation → Root cause: missing database columns + missing env var in Netlify
- Debug logging helped identify the actual Supabase error (PGRST204)

### Files Modified
- `CLAUDE.md` - Added env var deploy check, "Let's get started" command
- `src/app/api/auctions/route.ts` - Removed debug logging
- `TEST_CASES.md` - Added listing feature test cases

### Database Changes (Supabase SQL)
```sql
ALTER TABLE comics ADD COLUMN IF NOT EXISTS certification_number TEXT;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS label_type TEXT;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS page_quality TEXT;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS grade_date TEXT;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS grader_notes TEXT;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS is_signature_series BOOLEAN DEFAULT FALSE;
ALTER TABLE comics ADD COLUMN IF NOT EXISTS signed_by TEXT;
```

---

## Deploy Log - January 14, 2026 (Evening)

**Deployed to Netlify**

### Changes Included:
- **Listing Creation Fixed** - RLS policy bypass using service role key
- **Foreign Key Fix** - localStorage comics now sync to Supabase before listing
- **View Listing Button** - "List in Shop" changes to "View Listing" when comic already listed
- **Seller Name Display** - Shows email username as fallback when no display name set
- **Image Sizing** - Auction/listing modal images constrained to prevent oversizing
- **BidForm White Font** - Input text now visible (text-gray-900)
- **Button Layout** - Standardized primary/secondary buttons in ComicDetailModal
- **Backlog Items** - Added Marvel covers, Username system, Image optimization

### Files Added:
- `src/app/api/auctions/by-comic/[comicId]/route.ts` - Check for active listings

### Files Modified:
- `src/lib/supabase.ts` - Added supabaseAdmin client
- `src/lib/db.ts` - Added ensureComicInSupabase function
- `src/lib/auctionDb.ts` - Use supabaseAdmin, add seller name fallback
- `src/app/api/auctions/route.ts` - Accept comicData, sync before listing
- `src/components/ComicDetailModal.tsx` - View Listing button, button layout
- `src/components/auction/BidForm.tsx` - White font fix
- `src/components/auction/AuctionDetailModal.tsx` - Image constraints
- `src/components/auction/ListingDetailModal.tsx` - Image constraints

---

## Deploy Log - January 14, 2026 (Afternoon)

**Deployed to Netlify**

### Changes Included:
- **Currency Formatting Fixed** - All prices now show commas for thousands ($3,000 vs $3000)
- **Smart Cents Display** - Only shows decimals when not whole dollar ($44 vs $44.00, but $44.22 stays)
- **White Font Fix** - Comic title now visible in ListInShopModal (was white on gray)

### Files Modified:
- `src/lib/statsCalculator.ts` - Updated formatCurrency() function
- `src/app/hottest-books/page.tsx` - Applied formatCurrency to price ranges
- `src/app/page.tsx` - Applied formatCurrency to hottest books display
- `src/components/auction/ListInShopModal.tsx` - Added text-gray-900 to title

---

## January 14, 2026 (Morning Session)

### Session Summary
Bug fix session addressing 5 user-reported issues from production testing. Fixed critical waitlist API error (restricted Resend API key), deployed missing PWA icon PNG files, added iOS Chrome detection for PWA install prompts, and added GoCollect integration to backlog for future research.

### Key Accomplishments
- **Waitlist API Fixed** - Root cause was restricted Resend API key (send-only). Created new full-access key for Collectors Chest.
- **PWA Icons Deployed** - All PNG files were gitignored (`*.png` rule), causing 404s. Removed rule and committed icons.
- **iOS Chrome Detection** - Added specific UI for Chrome on iOS directing users to Safari for PWA install.
- **iOS Safari Instructions** - PWA install prompt now shows Share menu instructions for iOS Safari users.
- **Waitlist Debug Logging** - Added detailed error logging to diagnose API issues.
- **GoCollect Backlog Item** - Added research item for GoCollect API integration as potential data provider.
- **Design Review Backlog Item** - Added item to create unique visual identity for app.

### Files Added
- `public/icons/*.png` - All PWA icon files (7 files)

### Files Modified
- `.gitignore` - Removed `*.png` rule
- `src/app/api/waitlist/route.ts` - Added debug error logging
- `src/components/PWAInstallPrompt.tsx` - Added iOS Chrome detection and Safari redirect
- `BACKLOG.md` - Added GoCollect integration and design review items
- `EVALUATION.md` - Added launch prep item to remove debug info
- `TEST_CASES.md` - Added PWA install prompt test cases

### Issues Resolved
- Waitlist "Failed to join" error → New Resend API key with full access
- Android app icon white background → PNG files now in git and deployed
- Android shortcut icons showing white squares → Same fix as above
- iOS PWA install prompt not showing → Added iOS Safari/Chrome-specific UIs

---

## Deploy Log - January 14, 2026

**Deployed to Netlify**

### Changes Included:
- **PWA Icons Fixed** - Added all PNG icon files (were gitignored, causing 404s on production)
- **iOS Chrome Detection** - PWA install prompt now detects Chrome on iOS and shows Safari redirect instructions
- **Waitlist Error Logging** - Added detailed error logging for Resend API debugging
- **GoCollect Backlog** - Added GoCollect API integration as future enhancement

### Fixes:
- Android app icon white background → proper blue background
- Android shortcut icons (Collection/Lookup) → blue circular icons
- iOS Chrome users now get proper "Open in Safari" instructions

---

## Deploy Log - January 13, 2026 (Night)

**Deployed to Netlify**

### Changes Included:
- **Private Beta Mode** - Registration disabled, waitlist email capture instead
- **Waitlist API** - Connected to Resend Contacts for email collection
- **Technopathy Rebrand** - All user-facing "AI" references changed to "technopathic/technopathy"
- **Revert Command** - Added "revert technopathy" command to CLAUDE.md for quick rollback
- **Project Costs** - Documented fixed/variable costs in CLAUDE.md

---

## January 13, 2026 (Night Session)

### Session Summary
Risk assessment of live site led to implementing private beta mode. Disabled public registration, converted sign-up to waitlist with Resend integration. Rebranded all user-facing "AI" text to "technopathy" for comic-book theming. Discovered critical issue: signed-in user collections are stored in localStorage only, not synced to cloud.

### Key Accomplishments
- **Private Beta Mode** - Sign-up page now captures waitlist emails instead of creating accounts
- **Waitlist API** (`/api/waitlist/route.ts`) - Sends emails to Resend Contacts audience
- **Technopathy Rebrand** - Changed 12+ files from "AI" to "technopathic/technopathy"
- **Revert Command** - Documented all technopathy changes in CLAUDE.md for quick rollback
- **Project Costs** - Added cost tracking to CLAUDE.md (Netlify $9/mo, Domain $13.99/yr, Anthropic ~$0.015/scan)
- **Cloud Sync Priority** - Identified that collections are localStorage-only, added as #1 Critical priority

### Files Added
- `src/app/api/waitlist/route.ts` - Waitlist email capture via Resend

### Files Modified
- `src/app/sign-up/[[...sign-up]]/page.tsx` - Converted to waitlist form
- `src/components/GuestLimitBanner.tsx` - "Join Waitlist" CTAs
- `src/components/SignUpPromptModal.tsx` - Private beta messaging
- `src/app/layout.tsx`, `src/app/page.tsx` - Technopathy text
- `src/components/Navigation.tsx`, `AskProfessor.tsx` - FAQ updates
- `src/components/ComicDetailModal.tsx`, `ComicDetailsForm.tsx`, `KeyHuntPriceResult.tsx` - Price warnings
- `src/app/key-hunt/page.tsx`, `src/hooks/useOffline.ts` - Disclaimer text
- `src/app/api/analyze/route.ts`, `src/app/api/quick-lookup/route.ts` - API disclaimer
- `CLAUDE.md` - Revert technopathy command, project costs, services docs
- `EVALUATION.md` - Cloud sync as #1 priority, updated checklist items

### Issues Discovered
- **CRITICAL**: Signed-in users' collections stored in localStorage only - NOT synced across devices
  - Database schema exists (`src/lib/db.ts` has `getUserComics`, etc.)
  - Collection page uses localStorage (`src/lib/storage.ts`)
  - Must implement cloud sync before opening registration

---

## Deploy Log - January 13, 2026 (Evening)

**Deployed to Netlify**

### Changes Included:
- PWA icons fixed (no more white border on Android, proper maskable icons)
- Custom chest icon in header (replaces Archive icon)
- Shortcut icons for Collection (BookOpen) and Lookup (Search) in Android long-press menu
- Offers system API routes for offer/counter-offer flow
- Listing expiration cron job (30-day listings, 48-hour offers)
- Email notifications via Resend for offers/listings
- ListInShopModal, MakeOfferModal, OfferResponseModal components
- Services documentation in CLAUDE.md

---

## Deploy Log - January 13, 2026

**Deployed to Netlify**

### Changes Included:
- Auction Feature with eBay-style bidding and Stripe integration
- Mobile UX improvements, auto-hide nav, and hottest books fallback
- Con Mode, grade-aware pricing, and mobile camera enhancements
- Sentry error tracking (client, server, edge)
- PostHog analytics integration
- Upstash rate limiting on AI & bid routes
- Redis caching for AI/eBay price lookups
- Buy Now fixed-price listings in Shop
- Enhanced CGC/CBCS/PGX cert lookup with grading details
- Fixed viewport metadata (Next.js 16 migration)
- Fixed deprecated Stripe webhook config
- Added "Let's get started" daily standup skill
- Updated docs to reflect Netlify hosting

---

## January 11, 2026 (Evening)

### Session Summary
Major infrastructure improvements and enhanced CGC/CBCS certification lookup. Added Sentry, PostHog, rate limiting, and Redis caching. Completed Buy Now feature and enhanced graded comic data capture.

### Key Accomplishments
- Added Sentry error tracking (client, server, edge configs)
- Added PostHog analytics with provider component
- Added Upstash rate limiting for AI and bidding endpoints
- Added Redis caching for price lookups (reduces AI costs)
- Completed Buy Now fixed-price listings in Shop
- Enhanced CGC/CBCS/PGX cert lookup:
  - Captures signatures → signedBy
  - Captures key comments → keyInfo
  - Added gradeDate, graderNotes, pageQuality fields
  - Clickable cert verification links
  - CBCS alphanumeric cert support
- Fixed viewport metadata migration (Next.js 16)
- Removed deprecated Stripe webhook config
- Updated EVALUATION.md score from 6.8 → 8.2 (92% launch ready)
- Added test cases for new features

### Files Added
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `src/components/PostHogProvider.tsx`
- `src/lib/cache.ts` (Redis caching)
- `src/lib/rateLimit.ts` (Upstash rate limiting)
- `src/app/api/listings/[id]/purchase/route.ts` (Buy Now)
- `src/components/auction/CreateListingModal.tsx`, `ListingCard.tsx`, `ListingDetailModal.tsx`
- `supabase/migrations/20260111_add_grading_details.sql`

### Files Modified
- `src/lib/certLookup.ts` (enhanced parsing for all grading companies)
- `src/types/comic.ts` (added gradeDate, graderNotes)
- `src/components/ComicDetailsForm.tsx` (grading details section with cert link)
- `src/components/ComicDetailModal.tsx` (grading details display)
- `src/app/api/analyze/route.ts` (cert data mapping)
- `EVALUATION.md`, `TEST_CASES.md`, `CLAUDE.md`

### Issues Encountered
- Multiple files needed gradeDate/graderNotes fields added for TypeScript compliance
- Resolved by updating all ComicDetails instantiation points

---

## January 10, 2026

### Session Summary
Implemented the complete Auction Feature for the Shop, including eBay-style bidding with proxy support, watchlists, seller reputation, and payment integration.

### Key Accomplishments
- Created database migration with 5 new tables (auctions, bids, auction_watchlist, seller_ratings, notifications)
- Built TypeScript types and database helper functions
- Implemented 10 API routes for auctions, bidding, watchlist, notifications, and seller ratings
- Created 9 UI components (AuctionCard, BidForm, BidHistory, CreateAuctionModal, etc.)
- Built 3 new pages: /shop, /my-auctions, /watchlist
- Added NotificationBell component to navigation
- Integrated Stripe for payment processing
- Set up Vercel cron job for processing ended auctions

### Files Added/Modified
- `supabase/migrations/20260110_create_auctions.sql`
- `src/types/auction.ts`
- `src/lib/auctionDb.ts`
- `src/app/api/auctions/**` (multiple routes)
- `src/components/auction/**` (9 components)
- `src/app/shop/page.tsx`
- `src/app/my-auctions/page.tsx`
- `src/app/watchlist/page.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/Navigation.tsx` (updated)
- `vercel.json` (cron config)
- `BACKLOG.md` (marked auction feature complete)

### Issues Encountered
- Supabase migration failed initially due to `auth.current_profile_id()` function not existing
- Resolved by creating helper functions in `public` schema instead of `auth` schema
- Stripe API version needed updating to match installed package

---

## January 9, 2026 (Evening)

### Session Focus
Mobile UX Improvements, Empty Image Fixes, Auto-Hide Navigation, and Hottest Books Static Fallback

### Completed

**Home Page Updates for Logged-In Users**
- Added collection insight cards: "Biggest Increase", "Best Buy" (ROI), "Biggest Decline"
- Duration filters for 30/60/90 day value changes
- Moved "Scan a Book" CTA to top position
- Changed title to "A Look in Your Chest" for logged-in users
- Removed Features section and "View Collection" button for logged-in users
- Inline Hottest Books grid on home page (no longer just a banner link)
- Removed "Powered by AI Vision" badge

**Empty Image Source Fixes**
- Fixed console error "empty string passed to src attribute" across 10+ components
- Added Riddler-style placeholder for missing covers (green glowing "?" on dark background)
- Components fixed: ComicCard, ComicListItem, ComicDetailModal, VariantsModal, PublicComicCard, PublicComicModal, collection/page.tsx, page.tsx

**Mobile Cover Image Improvements**
- ComicDetailModal: Cover now displays as small thumbnail (80px) alongside title on mobile
- Desktop unchanged - full cover panel on left side
- Edit modal: Hidden large cover preview on mobile, form-only view
- Added bottom padding to modals to clear floating nav bar

**Cover Image Editing in Edit Mode**
- ComicDetailsForm now shows cover options even when cover already exists
- Mobile: "Find New Cover" button + URL paste field
- Desktop: Inline URL input with search link
- Current cover thumbnail displayed with change options

**Auto-Hide Navigation on Scroll**
- Bottom nav slides down when scrolling down (past 100px)
- Nav reappears when scrolling up
- Always visible near top of page (< 50px)
- Small scroll threshold (10px) to prevent jitter
- Smooth 300ms transition animation

**Mobile Cover Image Search Enhancement**
- Large "Search Google Images" button at top of cover section on mobile
- Updated instructions for Android: "Tap & hold → Open in new tab → Copy URL"
- Added backlog item for native app implementation (open device default browser)

**Hottest Books Static Fallback**
- Created static list of 10 hot books with cover images from Comic Vine
- Added `USE_STATIC_LIST` flag to conserve API credits during testing
- Added Pre-Launch Checklist to BACKLOG.md with reminder to re-enable live API

### Files Created
- `src/lib/staticHotBooks.ts` - Static fallback list for Hottest Books feature

### Files Modified
- `src/components/MobileNav.tsx` - Auto-hide on scroll with transform animation
- `src/components/ComicDetailModal.tsx` - Compact mobile layout with thumbnail
- `src/components/ComicDetailsForm.tsx` - Cover editing for existing covers, mobile-first layout
- `src/components/ComicCard.tsx` - Riddler-style empty image placeholder
- `src/components/ComicListItem.tsx` - Riddler-style empty image placeholder
- `src/components/VariantsModal.tsx` - Riddler-style empty image placeholder
- `src/components/PublicComicCard.tsx` - Riddler-style empty image placeholder
- `src/components/PublicComicModal.tsx` - Riddler-style empty image placeholder
- `src/app/collection/page.tsx` - Empty image fixes, edit modal mobile improvements
- `src/app/page.tsx` - Home page updates for logged-in users, empty image fix
- `src/app/api/hottest-books/route.ts` - Static list fallback for testing
- `BACKLOG.md` - Added Pre-Launch Checklist, native app cover search item

### Blockers / Issues Encountered
1. **Anthropic API credits exhausted** - Hottest Books failed to load; solved with static fallback list
2. **Bottom nav overlapping CTAs** - Evaluated 6 options; implemented auto-hide on scroll
3. **Cover image taking full mobile screen** - Redesigned to compact thumbnail layout

### Notes for Future Reference
- Claude Max subscription ≠ Anthropic API credits (separate billing systems)
- Auto-hide nav pattern similar to Instagram/Twitter - users expect it
- Riddler-style "?" placeholder adds personality while indicating missing data
- `USE_STATIC_LIST = true` saves API costs during testing; flip to false before launch

---

## January 9, 2026

### Session Focus
Hybrid Database Caching, Bug Fixes, and Auto-Refresh Comic Details

### Completed

**Hybrid Database Caching System** (Performance Optimization)
- Created `comic_metadata` table in Supabase as shared repository
- Implemented 3-tier caching: Memory Cache (5min TTL) → Database (~50ms) → Claude API (~1-2s)
- Comic lookups now check database first, only calling AI for unknown comics
- Results from AI automatically saved to database for future users
- Tracks lookup count for popularity analytics
- Case-insensitive matching with indexed queries
- Updated import-lookup API to use same hybrid approach - CSV imports now seed the database

**Auto-Refresh Comic Details on Title/Issue Change**
- Detects when user changes title or issue number after initial lookup
- Automatically fetches fresh details for the new title/issue combination
- Smart data replacement: replaces AI-derived fields but preserves user-entered data (notes, purchase price, etc.)
- Works in both add and edit modes
- Tracks "last looked up" values to detect meaningful changes

**Bug Fixes**
- **Title Autocomplete Stale Results**: Fixed issue where typing new query showed results from previous search (cleared suggestions immediately on input change before debounce)
- **Value By Grade Button Form Submission**: Fixed button triggering form submit, incrementing scan count, and showing "book added" toast (added `type="button"` attribute)
- **Empty src Attribute Warning**: Fixed browser console warning from empty img src by adding conditional rendering
- **Disclaimer Text Update**: Changed pricing disclaimer from "AI-estimated values..." to "Values are estimates based on market knowledge. Actual prices may vary."

**Icons Directory Setup** (Preparation for Custom Branding)
- Created `/src/components/icons/index.tsx` with icon template and specifications
- Created `/public/icons/` directory for favicon variants
- Added TreasureChest placeholder component ready for custom SVG paths
- Documented all icon sizes used in app (12px to 64px)

**Backlog Updates**
- Added "Custom SVG Icons & Branding" as HIGH priority item
- Added "Further Optimize Search Results" as Medium priority item

### Files Created
- `supabase/migrations/20260109_create_comic_metadata.sql` - Shared comic metadata table with indexes and RLS policies
- `src/components/icons/index.tsx` - Custom icon template with TreasureChest placeholder

### Files Modified
- `src/lib/db.ts` - Added `getComicMetadata()`, `saveComicMetadata()`, `incrementComicLookupCount()` functions
- `src/app/api/comic-lookup/route.ts` - Complete rewrite with hybrid 3-tier caching
- `src/app/api/import-lookup/route.ts` - Added hybrid caching so CSV imports seed database
- `src/app/api/key-hunt-lookup/route.ts` - Updated disclaimer text
- `src/components/ComicDetailsForm.tsx` - Added auto-refresh when title/issue changes
- `src/components/TitleAutocomplete.tsx` - Fixed stale suggestions by clearing immediately on input change
- `src/components/GradePricingBreakdown.tsx` - Added `type="button"` to prevent form submission
- `src/app/scan/page.tsx` - Fixed empty src conditional rendering
- `BACKLOG.md` - Added two new items

### Blockers / Issues Encountered
1. **Supabase "destructive operation" warning** - The `DROP TRIGGER IF EXISTS` statement triggered a warning but is safe (idempotent pattern)
2. **Title/issue change detection** - Initially only showed re-lookup prompt in edit mode; refactored to detect changes from previous lookup values

### Notes for Future Reference
- Database lookups are ~50ms vs ~1-2s for Claude API calls - significant UX improvement
- Memory cache uses 5-minute TTL to balance freshness with speed
- CSV imports of common comics will now benefit all future users via shared repository
- The hybrid approach gracefully handles database failures (falls back to AI)
- Non-blocking saves with `.catch()` ensure failed caches don't break user experience

---

## January 8, 2026 (Evening)

### Session Focus
Key Hunt, Mobile Camera Enhancements, Grade-Aware Pricing, and Barcode Scanner Fixes

### Completed

**Key Hunt - Mobile Quick Lookup** (New Feature)
- Created dedicated `/key-hunt` page for quick price lookups at conventions
- Built QuickResultCard component with minimal UI for fast scanning
- Created `/api/quick-lookup` endpoint combining barcode lookup + AI pricing
- Added "Passed On" default list for tracking comics seen but not purchased
- All 25 standard CGC grades in horizontally scrollable picker for raw books
- Auto-detect grade for slabbed comics (no selector needed)
- Raw and slabbed price display based on selected grade
- Three quick-add buttons: Want List, Collection, Passed On
- Recent scans history with localStorage persistence
- Offline barcode cache (7-day TTL, 20 entries max)
- Added Key Hunt to mobile nav as 3rd item (Home → Scan → Key Hunt → Collection)

**Enhanced Mobile Camera Integration**
- Built LiveCameraCapture component with full-screen camera preview
- Capture button with photo review before submission
- Retake option before confirming
- Front/rear camera switching on supported devices
- Gallery access option alongside camera capture
- Graceful permission handling with clear error messages
- Fallback to file upload for unsupported browsers

**Sign-Up Prompts at Scan Milestones**
- Created SignUpPromptModal component for milestone-based prompts
- After 5th scan: Soft prompt highlighting cloud sync benefits
- Before 10th scan: Stronger prompt about limit approaching
- After limit reached: Clear CTA to unlock unlimited scanning
- Milestone tracking persisted in localStorage (shows each prompt only once)

**Grade-Aware Pricing**
- Updated PriceData type with GradeEstimate interface (6 grades: 9.8, 9.4, 8.0, 6.0, 4.0, 2.0)
- Modified analyze API to request grade-specific prices from Claude
- Created gradePrice.ts utility for interpolation between grades
- Built GradePricingBreakdown component (expandable grade/price table)
- Integrated into ComicDetailModal and ComicDetailsForm
- Raw vs slabbed price differentiation

**Barcode Scanner Camera Fixes**
- Rewrote BarcodeScanner with explicit Permissions API checking
- State machine approach (checking → requesting → starting → active → error)
- Detailed error messages for each error type (permission denied, not found, in use)
- Retry mechanism with "Try Again" button
- "How to Enable Camera" instructions for permission issues
- Support for multiple barcode formats (UPC-A, UPC-E, EAN-13, EAN-8, CODE-128)
- Visual scanning overlay with animated corners and scan line
- Fixed DOM timing issues with initialization delays

### Files Created
- `src/app/key-hunt/page.tsx` - Key Hunt page
- `src/components/QuickResultCard.tsx` - Minimal result card for Key Hunt
- `src/app/api/quick-lookup/route.ts` - Combined barcode + price lookup API
- `src/components/LiveCameraCapture.tsx` - Full-screen camera preview
- `src/components/SignUpPromptModal.tsx` - Milestone sign-up prompts
- `src/components/GradePricingBreakdown.tsx` - Expandable grade price table
- `src/lib/gradePrice.ts` - Grade interpolation utilities

### Files Modified
- `src/lib/storage.ts` - Added "Passed On" default list
- `src/lib/db.ts` - Added "Passed On" to Supabase mapping
- `src/components/MobileNav.tsx` - Added Key Hunt as 3rd nav item
- `src/components/BarcodeScanner.tsx` - Complete rewrite with better error handling
- `src/components/ImageUpload.tsx` - Integrated LiveCameraCapture, added gallery access
- `src/hooks/useGuestScans.ts` - Added milestone tracking
- `src/app/scan/page.tsx` - Integrated SignUpPromptModal
- `src/types/comic.ts` - Added GradeEstimate interface to PriceData
- `src/app/api/analyze/route.ts` - Added grade-specific price requests
- `src/components/ComicDetailModal.tsx` - Added GradePricingBreakdown
- `src/components/ComicDetailsForm.tsx` - Added GradePricingBreakdown
- `BACKLOG.md` - Moved 5 items to Completed section

### Blockers / Issues Encountered
1. **MilestoneType null handling** - Fixed TypeScript error with `Exclude<MilestoneType, null>` utility type
2. **Camera permission black screen** - Solved with explicit Permissions API checks before scanner init

### Notes for Future Reference
- Key Hunt barcode scans are always raw books (can't scan barcode through a slab)
- For slabbed comics, need image scan to detect grade from CGC/CBCS label
- Grade interpolation uses linear interpolation between known grade points
- Barcode cache uses 7-day TTL and max 20 entries to balance storage vs usefulness

---

## January 8, 2026

### Session Focus
UX Improvements, CSV Import Feature, and Home Page Refinements

### Completed

**Home Page Improvements**
- Moved Features section (Technopathic Recognition, Track Values, Buy & Sell) above "How It Works"
- Hide "View Collection" button for non-registered users
- Changed CTA text to "Scan Your First Book" for guests
- "How It Works" section only displays for non-logged-in users

**Collection Page Enhancements**
- Added List dropdown filter for filtering by user lists
- Updated Lists filter to use ListFilter icon
- Mobile-responsive filter bar (hidden labels on small screens)

**CSV Import Feature** (Registered Users Only)
- Built CSVImport component with multi-step flow (upload → preview → import → complete)
- Created `/api/import-lookup` endpoint for AI-powered price/key info lookups
- Added "Import CSV" button to scan page (only visible to signed-in users)
- Supports all collection fields: title, issueNumber, variant, publisher, etc.
- Progress tracking during import with success/failure reporting
- Added downloadable sample CSV template with example comics

**View Variants Feature**
- Created VariantsModal component to view all variants of same title/issue
- Added "View Variants (X)" link in comic detail modal when duplicates exist
- Search functionality within variants modal

**Cover Image Lightbox**
- Added click-to-enlarge cover images on book details page
- Zoom overlay on hover, full-screen lightbox on click

**Ask the Professor FAQ**
- Added FAQ about guest vs registered user features

**Copy Updates**
- "Other ways to add comics" → "Other ways to add your books"
- Various terminology refinements

### Files Created
- `src/components/CSVImport.tsx` - CSV import component with preview and progress
- `src/components/VariantsModal.tsx` - Modal for viewing comic variants
- `src/app/api/import-lookup/route.ts` - API for bulk import price/key lookups
- `public/sample-import.csv` - Sample CSV template for users

### Files Modified
- `src/app/page.tsx` - Features section moved, conditional CTAs, guest-only sections
- `src/app/collection/page.tsx` - List filter dropdown, ListFilter icon
- `src/app/scan/page.tsx` - CSV import integration, updated copy
- `src/components/ComicDetailModal.tsx` - Variants link, cover lightbox
- `src/components/AskProfessor.tsx` - New FAQ item

### Blockers / Issues Encountered
1. **Missing comicvine lib** - Import-lookup route referenced non-existent lib; simplified to use Claude AI only

### Notes for Future Reference
- CSV import uses Claude AI for price lookups during import (rate-limited with 200ms delay)
- Sample CSV template includes 4 example comics showing various scenarios (raw, slabbed, signed, for sale)
- Variant detection matches on title + issueNumber across collection

---

## January 7, 2026

### Session Focus
User Registration & Authentication + CCPA Compliance

### Completed

**User Registration & Authentication**
- Set up Clerk account and configured Google + Apple social login
- Set up Supabase project and database
- Created database schema with 5 tables: profiles, comics, lists, sales, comic_lists
- Added Row Level Security policies (relaxed for dev)
- Installed dependencies: `@clerk/nextjs`, `@supabase/supabase-js`, `svix`
- Created sign-in/sign-up pages with Clerk components
- Updated Navigation with UserButton and Sign In link
- Created profile page for account management
- Implemented guest scan limiting (10 free scans)
- Built data migration modal (prompts users to import localStorage on signup)
- Created database helper functions (`src/lib/db.ts`)

**CCPA Compliance**
- Created webhook endpoint for Clerk `user.deleted` event
- Webhook deletes all user data from Supabase (comics, lists, sales, profile)
- Added webhook signature verification with svix

**Deployment (Netlify)**
- Added environment variables to Netlify
- Fixed secrets scanning issues (removed `netlify.env` from repo)
- Successfully deployed all changes

**Backlog Updates**
- Changed "Enhance Mobile Camera" priority: Medium → Low
- Added new item: "Support File Import" (Medium priority)
- Marked "User Registration & Authentication" as complete

### Files Created
- `middleware.ts` - Clerk auth middleware
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/app/profile/[[...profile]]/page.tsx`
- `src/app/api/webhooks/clerk/route.ts`
- `src/lib/supabase.ts`
- `src/lib/db.ts`
- `src/hooks/useGuestScans.ts`
- `src/components/GuestLimitBanner.tsx`
- `src/components/DataMigrationModal.tsx`
- `src/components/AuthDataSync.tsx`
- `supabase/schema.sql`

### Files Modified
- `src/app/layout.tsx` - Added ClerkProvider
- `src/components/Navigation.tsx` - Added auth UI
- `src/components/Providers.tsx` - Added AuthDataSync
- `src/app/scan/page.tsx` - Added guest scan limiting
- `.env.local` - Added Clerk + Supabase credentials
- `.env.example` - Added placeholder variables
- `.gitignore` - Added netlify.env
- `BACKLOG.md` - Updated priorities and statuses

### Blockers / Issues Encountered
1. **Clerk peer dependency** - Required upgrading Next.js from 14.2.21 to 14.2.25+
2. **Supabase RLS policies** - Initial policies blocked inserts; relaxed for dev
3. **Netlify secrets scanning** - Failed builds due to "placeholder" string and `netlify.env` file in repo

### Notes for Future Reference
- Clerk + Supabase integration works but proper JWT integration needed for production RLS
- Netlify secrets scanner is aggressive - avoid common words like "placeholder" for secret values
- Consider using Clerk webhooks for more events (user.created, user.updated) in future

---

## January 6, 2026

### Session Focus
Initial App Build - Collector's Catalog

### Completed

**Core Application**
- Set up Next.js 14 project with TypeScript and Tailwind CSS
- Created AI-powered comic cover recognition using Claude Vision API
- Built collection management system with localStorage persistence
- Implemented custom lists (My Collection, Want List, For Sale)
- Added price tracking and profit/loss calculations
- Built sales tracking with history

**UI/UX**
- Mobile-responsive design with bottom navigation
- Comic card and list view components
- Detail modal for viewing/editing comics
- Image upload with drag-and-drop support
- Fun facts displayed during AI scanning
- Toast notifications
- Loading skeletons

**Mobile Camera Support**
- Added camera capture for mobile devices
- Mobile-specific copy and camera icon
- Basic capture via `capture="environment"` attribute

**Project Setup**
- Created BACKLOG.md with feature roadmap
- Added backlog reminder when starting dev server
- Initial Netlify deployment
- Fixed TypeScript build errors for Netlify

### Files Created
- `src/app/api/analyze/route.ts` - Claude Vision API integration
- `src/app/collection/page.tsx` - Collection management page
- `src/app/scan/page.tsx` - Comic scanning page
- `src/app/page.tsx` - Home/dashboard page
- `src/components/ComicCard.tsx`
- `src/components/ComicDetailModal.tsx`
- `src/components/ComicDetailsForm.tsx`
- `src/components/ComicListItem.tsx`
- `src/components/ImageUpload.tsx`
- `src/components/MobileNav.tsx`
- `src/components/Navigation.tsx`
- `src/components/Providers.tsx`
- `src/components/Skeleton.tsx`
- `src/components/Toast.tsx`
- `src/lib/storage.ts` - localStorage management
- `src/types/comic.ts` - TypeScript types
- `BACKLOG.md`
- `README.md`

### Blockers / Issues Encountered
1. **TypeScript Set iteration error** - Fixed for Netlify build compatibility
2. **TypeScript type error in ComicDetailsForm** - Resolved type mismatch

### Notes for Future Reference
- Claude Vision API works well for comic identification
- localStorage is fine for MVP but will need cloud sync for multi-device
- Mobile camera capture works but could be enhanced with live preview

---

<!--
Template for new entries:

## [Date]

### Session Focus
[Main goal for the session]

### Completed
- Item 1
- Item 2

### Files Created
- file1.ts
- file2.tsx

### Files Modified
- file1.ts - [what changed]

### Blockers / Issues Encountered
1. Issue and resolution

### Time Investment
- Estimated: X hours

### Notes for Future Reference
- Learnings, tips, things to remember

-->
