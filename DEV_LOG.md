# Development Log

This log tracks session-by-session progress on Collectors Chest.

---

## Changes Since Last Deploy

**Sessions since last deploy:** 0
**Deploy Readiness:** Fresh Deploy

### Accumulated Changes:
(None yet)

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
