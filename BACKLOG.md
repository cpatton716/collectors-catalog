# Collectors Chest Backlog

## Design Review

### Unique Visual Identity
**Priority:** Medium
**Status:** Pending

Review and refresh the app's design to create a distinct visual identity that stands out from other projects. Currently, the design follows a generic pattern that looks similar to other apps.

**Areas to Explore:**
- Color palette - move beyond standard blue/gray
- Typography - consider comic-book inspired fonts for headers
- Illustrations/graphics - custom artwork, comic-style elements
- Micro-interactions and animations
- Unique card designs for comics
- Theme options (light/dark/comic themes)
- Brand personality through UI details

**Inspiration Sources:**
- Comic book aesthetics (halftone dots, speech bubbles, panel layouts)
- Vintage collector shop vibes
- Trading card interfaces
- Key Collector Comics app
- CLZ Comics app

**Goal:** Make Collectors Chest instantly recognizable and memorable.

---

## Pre-Launch Checklist

### Form LLC Business Entity
**Priority:** Critical
**Status:** Pending

Form an LLC to protect personal assets before opening the marketplace to the public. Required before finalizing Privacy Policy and Terms of Service.

**Why It's Important:**
- Marketplace handles money between users - higher liability risk
- Protects personal assets from potential lawsuits
- Required for professional ToS & Privacy Policy
- Enables business banking and cleaner Stripe setup

**Steps:**
1. Choose LLC formation service (ZenBusiness, LegalZoom, or state website)
2. File LLC in your state (~$50-500 depending on state)
3. Obtain EIN from IRS (free, online)
4. Open business bank account (optional but recommended)
5. Update Stripe account to business entity (optional)

**Estimated Cost:** $100-300 filing + potential annual fees (CA has $800/yr franchise tax)
**Time:** Can be done online in 30 minutes, processing takes 1-2 weeks

**Blocked Items:**
- Privacy Policy (needs official business name)
- Terms of Service (needs official business name)

---

### Create Stripe Account & Configure Billing
**Priority:** Critical
**Status:** Pending

Set up Stripe account for subscription billing and marketplace payments.

**Steps:**

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com) and sign up
   - Complete business verification (can use personal info initially, update to LLC later)
   - Get API keys from Dashboard → Developers → API keys

2. **Create Subscription Products**
   In Stripe Dashboard → Products, create:

   | Product | Price | Type | Notes |
   |---------|-------|------|-------|
   | Premium Monthly | $4.99/month | Recurring | 7-day free trial enabled |
   | Premium Annual | $49.99/year | Recurring | 7-day free trial enabled |
   | Scan Pack (10 scans) | $1.99 | One-time | For free users who hit limit |

3. **Add Environment Variables**
   Add these to `.env.local` AND Netlify Environment Variables:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for testing)
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx (or pk_test_xxx)
   STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
   STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx
   STRIPE_PRICE_SCAN_PACK=price_xxx
   ```

4. **Configure Stripe Webhook**
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://collectors-chest.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

5. **Test Mode First**
   - Use test API keys initially (`sk_test_`, `pk_test_`)
   - Test with Stripe test cards (4242 4242 4242 4242)
   - Verify webhook events are received
   - Switch to live keys when ready for production

**Related Code:**
- Billing API routes: `src/app/api/billing/`
- Webhook handler: `src/app/api/webhooks/stripe/route.ts`
- Subscription logic: `src/lib/subscription.ts`

**Blocked By:** None (can use test mode before LLC formation)
**Blocks:** Live subscription billing, marketplace payments

---

### Re-enable Live Hottest Books API
**Priority:** Critical
**Status:** Pending
**File:** `src/app/api/hottest-books/route.ts`

Currently using a static list (`USE_STATIC_LIST = true`) to conserve API credits during testing. Before launch:

1. Set `USE_STATIC_LIST = false` in `src/app/api/hottest-books/route.ts`
2. Ensure Anthropic API credits are topped up
3. Verify Supabase cache is working for 24-hour TTL
4. Test the live API generates fresh results

**Related file:** `src/lib/staticHotBooks.ts` (fallback list)

---

## Pending Enhancements

### Marvel Cover Images & Creator Data
**Priority:** Medium
**Status:** Pending

Pull Marvel comic cover images and creator information directly from Marvel.com to improve data quality and reduce reliance on user-uploaded images.

**Example Source:** https://www.marvel.com/comics/issue/12415/uncanny_x-men_1963_100

**Approach Options:**
1. **Marvel API Integration** - Use official Marvel Developer API (requires API key)
2. **Web Scraping** - Extract data from Marvel.com pages
3. **Bulk Data Import** - One-time massive pull to store locally in Supabase

**Data to Extract:**
- High-resolution cover images
- Creator credits (writer, artist, cover artist, inker, colorist)
- Publication dates
- Series information
- Issue descriptions/summaries

**Benefits:**
- Higher quality cover images than user photos
- Accurate creator credits
- Consistent data format
- Reduced storage for user-uploaded images

**Considerations:**
- Marvel API rate limits and terms of service
- Storage costs for bulk image hosting
- Need to handle non-Marvel publishers separately
- Could start with Marvel-only, expand to DC/others later

---

### Username System for Privacy
**Priority:** Medium
**Status:** Pending

Add a username system so sellers can display a custom name instead of their email or real name.

**Current Behavior:**
- Seller name falls back to anonymized email (e.g., "chr...") when no display name is set
- No way to set a unique username that's distinct from display name

**Proposed Features:**
1. **Username Field** - Allow users to set a unique username (e.g., "@comicfan42")
2. **Display Name Options** - Let users choose what name is shown publicly:
   - Username only
   - Display name only
   - Both (display name with @username)
3. **Privacy Controls** - Option to hide email entirely from public profile
4. **Username Validation** - Ensure uniqueness, block inappropriate names

**User Flow:**
1. Profile Settings → Set Username
2. Choose display preference for marketplace listings
3. Username shown on listings, seller pages, and transaction history

**Database Changes:**
- Add `username` column to profiles table (unique, lowercase)
- Add `display_preference` enum (username_only, display_name_only, both)

---

### Image Optimization & Resizing
**Priority:** Medium
**Status:** ✅ Complete (Jan 2026)

Client-side image compression implemented in ImageUpload component.

**Implementation:**
- `src/components/ImageUpload.tsx` - compressImage function
- Max size: 15MB input, ~1.5MB target after compression
- Max dimension: 2048px (resizes larger images)
- Canvas-based compression maintains quality

---

### Project Cost Tracking Dashboard
**Priority:** Low
**Status:** Pending

Create a unified view of all project costs. Currently tracked across multiple service dashboards.

**Fixed Monthly Costs:**
- Netlify Personal Plan: $9/mo (charged 13th of each month)

**Annual Costs:**
- Domain (collectors-chest.com): $13.99/yr (renews Jan 13, 2027 at $16.99)

**Variable/Pay-per-use:**
- Anthropic API: ~$0.015/scan (prepaid $10 credits)
- Stripe: 2.9% + $0.30 per transaction
- All others on free tiers (Supabase, Clerk, Upstash, Resend, PostHog)

**Implementation Options:**
1. Simple: Add cost summary to CLAUDE.md
2. Medium: Create spreadsheet for monthly tracking
3. Advanced: Build admin dashboard with cost aggregation

---

### Sales Flow - Use Actual Transaction Price
**Priority:** High
**Status:** Pending

Currently, when marking a comic as sold, users manually enter the sale price. Once the app goes live with Stripe Connect integration, the system should automatically record the actual transaction amount from completed purchases. This will:
- Ensure accurate profit/loss tracking
- Integrate with the user-to-user marketplace flow
- Remove potential for user entry errors

---

### Custom SVG Icons & Branding
**Priority:** High
**Status:** ✅ Complete (Jan 2026)

Custom treasure chest icon and full favicon set implemented.

**Implementation:**
- `src/components/icons/ChestIcon.tsx` - Custom SVG treasure chest
- Used in Navigation header and Sign-up page
- Full favicon set in `public/icons/` (192x192, 512x512, maskable variants)
- PWA shortcuts with custom icons

---

### Further Optimize Search Results
**Priority:** Medium
**Status:** Pending

Enhance the comic search and lookup experience with additional optimizations.

**Potential Improvements:**
- Fuzzy matching for title searches (handle typos, abbreviations)
- Search by creative team (writer, artist)
- Popularity-based suggestions (show most-looked-up comics first)
- Pre-populate common titles in database from external sources
- Batch lookups for CSV imports
- Search history and favorites

---

### GoCollect API Integration
**Priority:** Medium
**Status:** Pending

Investigate using GoCollect as a data provider for price data and hot books list.

**Current Data Sources:**
- Professor's Hottest Books: Claude AI (Anthropic) + Comic Vine for covers
- Price Estimates: AI-generated + eBay Browse API

**GoCollect Potential Benefits:**
- Real sales data from eBay/auctions (more accurate than AI estimates)
- Hot 50 list based on actual market activity
- Collectible Price Index (CPI) for market trends
- Historical price tracking

**GoCollect API Access:**
| Tier | Cost | API Calls/Day |
|------|------|---------------|
| Free | $0 | 50 |
| Pro | $9/mo or $89/yr | 100 |
| Enterprise | Custom | Custom |

**Integration Options:**
1. Replace AI price estimates with GoCollect real data
2. Use GoCollect Hot 50 for Professor's Hottest Books
3. Add price trend graphs using historical data
4. Consolidate from multiple providers to single source

**Research Needed:**
- [ ] Test GoCollect API with free tier
- [ ] Compare data quality vs current sources
- [ ] Evaluate if 100 calls/day is sufficient
- [ ] Determine which features to migrate first

**Links:**
- [GoCollect Pricing](https://gocollect.com/pricing)
- [GoCollect API Docs](https://gocollect.com/api-docs)

---

### eBay API Integration for Price History
**Priority:** Medium
**Status:** ✅ Complete (Jan 2026)

Real market data from eBay's Browse API is now integrated:
- Actual recent sales data for specific comics (title, issue, grade)
- More accurate estimated values based on real transactions
- AI fallback when no eBay data available
- Redis caching to minimize API calls

**Implementation:**
- `src/app/api/ebay-prices/route.ts` - eBay Browse API integration
- `src/lib/ebayPriceCache.ts` - Redis caching layer
- Console logs show `[ebay-finding]` for debugging

---

### Shop Page for Books For Sale
**Priority:** High
**Status:** ✅ Complete (Jan 2026)

Marketplace page where users can browse and purchase comics listed for sale.

**Features Implemented:**
- Grid view of all available listings (Auctions + Buy Now tabs)
- Search and filter by title, publisher, price range
- Comic detail view with seller info
- Secure checkout via Stripe
- Seller ratings/reviews system
- Watchlist functionality

**Files:** `/src/app/shop/page.tsx`, `/src/components/auction/*`

---

### Auction Feature (Shop)
**Priority:** High
**Status:** COMPLETE (January 10, 2026)

Add eBay-style auction functionality to the Shop, allowing users to list comics for competitive bidding.

**Implementation Summary:**
- Database migration: `/supabase/migrations/20260110_create_auctions.sql`
- Types: `/src/types/auction.ts`
- Database helpers: `/src/lib/auctionDb.ts`
- API routes: `/src/app/api/auctions/`, `/src/app/api/watchlist/`, `/src/app/api/notifications/`, `/src/app/api/sellers/[id]/ratings/`
- UI components: `/src/components/auction/` (AuctionCard, BidForm, BidHistory, etc.)
- Pages: `/src/app/shop/`, `/src/app/my-auctions/`, `/src/app/watchlist/`
- Stripe integration: `/src/app/api/checkout/`, `/src/app/api/webhooks/stripe/`
- Cron job: `/vercel.json` + `/src/app/api/cron/process-auctions/`

**Post-Implementation Notes:**
- Run migration in Supabase before using
- Configure Stripe API keys for payment processing
- Add CRON_SECRET env var for secure cron execution

#### Core Auction Settings
| Setting | Value |
|---------|-------|
| Duration | Flexible 1-14 days (seller chooses) |
| Starting Bid | Minimum $0.99, whole dollars only |
| Buy It Now | Optional - seller can set BIN price |
| Reserve Price | None - starting price is minimum acceptable |
| End Time | Hard end time (no auto-extend for v1) |
| Bid Increments | Whole dollars, minimum $1, bidder chooses amount |
| Proxy Bidding | Yes - system auto-bids up to user's max |

#### Participation & Access
- **Sellers:** Registered users only
- **Bidders:** Registered users only
- **Location:** Separate "Auctions" tab in Shop page

#### Listing Features
- Cover image (required)
- Up to 4 additional detail photos (condition, back cover, etc.)
- Flat-rate shipping set by seller
- Standard comic metadata (title, issue, grade, etc.)

#### Bidding & Bid History
- Bid history shown with anonymized bidders (Bidder 1, Bidder 2, etc.)
- Current high bid and bid count displayed
- Proxy bidding auto-increments to user's max bid

#### Auction Watchlist
- Users can add auctions to watchlist
- Ending-soon notifications for watched auctions

#### Notifications
- **Bidders:** Outbid notification, Won auction notification
- **Sellers:** Auction ended notification

#### Post-Auction Flow
- Winner has 48 hours to complete Stripe checkout
- If no payment: Seller decides (relist, offer to 2nd place, etc.)

#### Cancellation Policy
- Sellers cannot cancel once any bid is placed
- Sellers can cancel before first bid

#### Seller Reputation System
- Hero mask icon (blue/red) for positive feedback (thumbs up)
- Villain helmet icon (maroon/purple) for negative feedback (thumbs down)
- Optional comment with each rating
- Comments filtered for inappropriate language

#### Implementation Phases

**Phase 1: Core Auction Infrastructure**
- Database schema for auctions, bids, watchlist
- Auction creation flow (from collection item)
- Auction listing page with countdown timer
- Basic bidding functionality

**Phase 2: Proxy Bidding & Notifications**
- Proxy bid system (auto-increment to max)
- Email notifications (outbid, won, ended)
- Bid history display (anonymized)

**Phase 3: Watchlist & Search**
- Auction watchlist functionality
- Search/filter auctions in Shop
- Ending-soon sorting

**Phase 4: Payment & Completion**
- Stripe checkout integration for winners
- 48-hour payment window enforcement
- Seller dashboard for auction management

**Phase 5: Reputation System**
- Hero/villain rating icons
- Comment system with content filtering
- Seller reputation display on listings

#### Database Tables Needed
- `auctions` - Auction listings with settings
- `bids` - All bids including proxy max amounts
- `auction_watchlist` - User watchlist
- `seller_ratings` - Reputation feedback

#### Backlog Items (Low Priority)
- [ ] Revisit auto-extend feature for last-minute bids
- [ ] Determine auction monetization (listing fees, final value fees, etc.)

---

### Admin Role & Permissions
**Priority:** Medium
**Status:** Pending

Implement admin functionality for site management and moderation.

**Features:**
- Admin dashboard for site metrics
- User management (view, suspend, delete)
- Content moderation (flagged listings)
- Manual price adjustments
- Feature flags management
- Hottest Books list curation

---

### Enhanced Key Info Database
**Priority:** Medium
**Status:** Pending

Improve the accuracy and reliability of key info (first appearances, deaths, significant events) by building or integrating with a dedicated database rather than relying solely on AI knowledge.

**Options to Explore:**
- Host our own database of key info (curated from reliable sources)
- Partner with existing comic databases (Grand Comics Database, etc.)
- Community-contributed key info with moderation
- Hybrid approach: AI lookup with database verification/override

**Benefits:**
- More consistent and accurate key info
- Faster lookups (no AI call needed for known issues)
- Community can help identify missing/incorrect info
- Reduces API costs for common lookups

**Implementation Considerations:**
- Database schema for issues and their key facts
- Admin interface for data entry/curation
- API endpoint for key info lookup
- Fallback to AI when issue not in database
- Import existing key info datasets if available

---

### Test Password Reset Flows
**Priority:** Medium
**Status:** Pending

Test and verify the Clerk-powered password reset functionality works correctly end-to-end.

**Test Cases:**
- Request password reset from login page
- Verify reset email is received
- Confirm reset link works and redirects properly
- Verify new password can be set
- Confirm user can log in with new password

---

### Add "Professor" Persona Throughout Site
**Priority:** Medium
**Status:** Pending

Create a consistent "Professor" character/persona that provides tips, guidance, and commentary throughout the application. This persona adds personality and makes the app more engaging.

**Areas to Implement:**
- Tooltips and help text
- Empty state messages
- Loading messages / fun facts
- Welcome messages
- Feature explanations
- Error messages (friendly Professor-style guidance)

**Considerations:**
- Design a simple avatar/icon for the Professor
- Define the Professor's voice/tone (knowledgeable but approachable)
- Don't overuse - sprinkle in key moments for delight

---

### Expand to Support All Collectibles
**Priority:** Medium
**Status:** Pending

Extend the platform beyond comic books to support other collectible categories, transforming the app into a universal collectibles tracker.

**Supported Categories:**
- Funko Pop figures
- Sports cards (baseball, basketball, football, hockey)
- Trading cards (Pokémon, Magic: The Gathering, Yu-Gi-Oh!)
- Action figures
- Vinyl records
- Movies (DVD, Blu-ray, 4K, digital) *(check CLZ Movies for ideation)*
- Video Games (console, PC, retro) *(check CLZ Games for ideation)*
- Music (CDs, vinyl, cassettes) *(check CLZ Music for ideation)*
- Books (first editions, signed copies, rare prints) *(check CLZ Books for ideation)*
- Other collectibles

**Implementation Considerations:**
- Update AI vision prompts to identify collectible type and extract relevant metadata
- Category-specific fields (e.g., card grade, Pop number, set name, ISBN, UPC)
- Category-specific price sources (eBay, TCGPlayer, Pop Price Guide, Discogs, PriceCharting)
- Update UI to accommodate different collectible types
- Allow users to filter collection by category
- Consider renaming app to something more generic (e.g., "Collector's Vault")

**Data Model Changes:**
- Add `collectibleType` field to items
- Dynamic metadata schema based on collectible type
- Category-specific grading scales (PSA for cards, VGA for games, etc.)

---

### Update Email Formatting
**Priority:** Low
**Status:** Pending

Customize the email templates sent by Clerk for authentication flows (welcome, verification, password reset, etc.) to match the Collectors Chest branding.

**Steps (to be detailed when ready):**
- Access Clerk Dashboard email templates
- Customize branding (logo, colors, fonts)
- Update copy/messaging to match app voice
- Test email delivery and rendering across clients

---

### Update "Ask the Professor" FAQ Content
**Priority:** Low
**Status:** Pending

Review and update the FAQ questions and answers in the "Ask the Professor" help feature to match the live production environment and actual user needs.

**Areas to Review:**
- Update questions based on real user feedback
- Ensure answers reflect current app functionality
- Add new FAQs for features added post-launch
- Refine Professor's voice/tone for consistency

---

### Clean Up Copy Throughout the Site
**Priority:** Low
**Status:** Pending

Review and improve all user-facing text throughout the application for consistency, clarity, and brand voice.

**Areas to Review:**
- Page titles and descriptions
- Button labels and CTAs
- Error messages and confirmations
- Empty states and placeholder text
- Toast notifications
- Form labels and helper text
- Sign-up prompt modals (milestone prompts for guest users)

---

### Key Hunt Scan History
**Priority:** Low
**Status:** Pending

Add a history feature to Key Hunt that saves recent lookups for quick reference.

**Features:**
- Store last 20-30 lookups in localStorage
- Show history as a scrollable list when opening Key Hunt
- Quick tap to re-lookup with different grade
- Clear history option
- Persist across sessions

**Implementation Notes:**
- Similar to the original Key Hunt offline cache concept
- Consider 7-day TTL for automatic cleanup
- Store: title, issue, grade, price result, timestamp

---

### Native App: Cover Image Search via Default Browser
**Priority:** Low
**Status:** Pending

When converting to native mobile apps (iOS/Android), the cover image search feature needs to open the device's default browser for Google Image searches instead of an in-app webview.

**Current Behavior (PWA/Web):**
- User taps "Search Google Images" button
- Opens Google in a new tab
- User must use native back arrow/gesture to return to app
- User pastes copied image URL

**Native App Requirements:**
- Open device's default browser (Safari on iOS, Chrome/default on Android)
- Maintain app state while user is in browser
- Handle return to app gracefully (deep link or app switcher)
- Consider clipboard monitoring to auto-detect copied image URLs (with permission)
- Alternative: In-app browser with "Copy URL" detection

**Platform-Specific Notes:**
- iOS: Use `SFSafariViewController` or `UIApplication.open()` for external browser
- Android: Use `Intent.ACTION_VIEW` or Chrome Custom Tabs
- React Native: `Linking.openURL()` or `react-native-inappbrowser`

**UX Considerations:**
- Clear instructions that user will leave the app temporarily
- "Paste URL" button should be prominent on return
- Consider toast/notification when URL is detected in clipboard

---

### Custom Chest SVG Icon
**Priority:** Low
**Status:** ✅ Complete (Jan 2026)

Custom treasure chest SVG implemented.

**Implementation:**
- `src/components/icons/ChestIcon.tsx` - Full SVG with gradients
- Used in Navigation and Sign-up pages
- Works at all sizes (16px to 64px)

---

## Completed

### Key Hunt (Mobile Quick Lookup)
**Priority:** Medium
**Status:** ✅ Complete (Jan 8-9, 2026)

A streamlined mobile interface for quick price lookups at conventions and comic shops.

**Features Implemented:**
- Bottom sheet UI with 3 entry methods: Scan Cover, Scan Barcode, Manual Entry
- Cover scan with auto-detection of slabbed comics and graded labels
- Grade selector for raw comics (6 grades: 9.8, 9.4, 8.0, 6.0, 4.0, 2.0)
- Manual entry with title autocomplete + issue number + grade
- Price result showing average of last 5 sales AND most recent sale
- Recent sale highlighting: 20%+ above avg = red (market cooling), 20%+ below = green (deal)
- Add to Collection and New Lookup buttons
- Mobile utilities FAB combining Key Hunt + Ask the Professor
- Raw and slabbed price differentiation

**Files Created/Updated:**
- `/src/app/key-hunt/page.tsx` - Main Key Hunt page with flow state machine
- `/src/components/ConModeBottomSheet.tsx` - Entry method selection
- `/src/components/GradeSelector.tsx` - Grade selection modal
- `/src/components/ConModeManualEntry.tsx` - Manual title/issue/grade entry
- `/src/components/ConModePriceResult.tsx` - Price result with recent sale highlighting
- `/src/components/MobileUtilitiesFAB.tsx` - Combined FAB for Key Hunt + Ask Professor
- `/src/app/api/key-hunt-lookup/route.ts` - Price lookup API with recent sale data
- `/src/app/api/quick-lookup/route.ts` - Barcode lookup with price data

---

### Fix Barcode Scanner Camera Issues
**Priority:** High
**Status:** ✅ Complete (Jan 8, 2026)

Debug and fix issues with the barcode scanner camera not loading on some devices.

**Fixes Implemented:**
- Explicit camera permission checking via Permissions API
- Pre-emptive permission request before scanner initialization
- Clear state machine (checking → requesting → starting → active → error)
- Detailed error messages for each error type (permission denied, not found, in use, etc.)
- Retry mechanism with "Try Again" button
- "How to Enable Camera" instructions for permission issues
- Fixed DOM timing issues with initialization delays
- Support for multiple barcode formats (UPC-A, UPC-E, EAN-13, EAN-8, CODE-128)
- Visual scanning overlay with animated corners and scan line
- Safe scanner cleanup on unmount

---

### Grade-Aware Pricing
**Priority:** Medium
**Status:** ✅ Complete (Jan 8, 2026)

Provide more accurate valuations based on comic grade.

**Features Implemented:**
- AI-estimated prices for 6 grade levels (9.8, 9.4, 8.0, 6.0, 4.0, 2.0)
- Raw vs slabbed price differentiation
- Live price updates as user selects grade
- Expandable grade breakdown in comic detail views
- Grade interpolation for values between standard grades

**Note:** Currently uses AI estimates. Can be enhanced with real eBay data when API integration is added.

---

### Sign-Up Prompts at Scan Milestones
**Priority:** Medium
**Status:** ✅ Complete (Jan 8, 2026)

Add strategic prompts encouraging guest users to create an account at key moments.

**Features Implemented:**
- After 5th scan: Soft prompt highlighting cloud sync benefits
- Before final (10th) scan: Stronger prompt about limit approaching
- After limit reached: Clear CTA to unlock unlimited scanning
- Milestone tracking persisted in localStorage (shows each prompt only once)
- Attractive modal with benefits list and sign-up CTA

---

### Enhance Mobile Camera Integration
**Priority:** Low
**Status:** ✅ Complete (Jan 8, 2026)

Enhance the mobile camera experience with a live preview interface.

**Features Implemented:**
- Live camera preview via MediaDevices API
- Capture button with photo review before submission
- Retake option before confirming
- Front/rear camera switching on devices with multiple cameras
- Gallery access option for selecting existing photos
- Graceful permission handling with clear error messages
- Fallback to file upload for unsupported browsers

---

### Mobile Gallery Access for Scanning
**Priority:** Medium
**Status:** ✅ Complete (Jan 8, 2026)

Allow mobile users to select images from their photo gallery in addition to using the camera.

**Features Implemented:**
- "Choose from Gallery" button alongside camera option on mobile
- Separate file input without capture attribute for gallery access
- Useful for pre-photographed collections and dim lighting conditions

---

### Enhanced Title Autocomplete
**Priority:** Low
**Status:** ✅ Complete (Jan 8, 2026)

Improve the title search/autocomplete functionality to use contains-search instead of prefix-only matching.

**Features Implemented:**
- Contains-search: Typing "Spider" matches "The Amazing Spider-Man", "Spider-Woman", "Ultimate Spider-Man", etc.
- Fuzzy matching for common typos (Spiderman → Spider-Man, Xmen → X-Men)
- Recent searches shown first with localStorage persistence

---

### Re-evaluate Details When Title/Issue Changes
**Priority:** Low
**Status:** ✅ Complete (Jan 8, 2026)

Automatically trigger a new AI lookup when user manually edits the title or issue number, since the existing metadata may no longer be accurate.

**Features:**
- Detect when title or issue # is changed
- Prompt user: "Would you like to look up details for the updated title/issue?"
- Option to keep existing data or fetch new
- Only clear fields that would change (preserve user-entered notes, purchase price, etc.)

---

### Hottest Books Mobile Improvements
**Priority:** Low
**Status:** ✅ Complete (Jan 8, 2026)

Improve the Professor's Hottest Books experience on mobile devices.

**Features:**
- Auto-scroll to detail panel when book is selected
- Better cover image positioning on smaller screens
- Swipeable cards for navigation between books
- Collapsible detail sections

---

### User Registration & Authentication
**Priority:** High
**Status:** ✅ Complete (Jan 7, 2026)

Implement user registration and authentication to enable multi-user support, data persistence across devices, and marketplace features.

**Recommended Stack:**
- **Authentication:** Clerk (easiest) or NextAuth.js (most flexible)
- **Database:** Supabase (PostgreSQL) or Firebase Firestore

**Core Features:**
- Email/password registration
- Social login (Google, Apple - optional)
- Email verification
- Password reset flow
- Session management
- User profile page

**Database Migration:**
- Migrate from localStorage to cloud database
- Add `userId` to all collections, lists, and sales records
- User profile schema (name, email, avatar, preferences)

**Features Requiring Account Creation:**
> Certain features should be restricted to registered users to encourage sign-up and enable marketplace functionality.

| Feature | Guest Access | Registered User |
|---------|--------------|-----------------|
| Scan comics (AI recognition) | Limited (5-10 scans) | Unlimited |
| View collection | Local only | Cloud-synced across devices |
| Price estimates | Yes | Yes |
| Create custom lists | No | Yes |
| List comics for sale | No | Yes |
| Buy from marketplace | No | Yes |
| Sales history & profit tracking | No | Yes |
| Export collection data | No | Yes |

**Implementation Notes:**
- Show "Create Account" prompts when guests attempt restricted features
- Allow guests to scan a few comics to demonstrate value before requiring signup
- Migrate guest localStorage data to cloud on account creation
- Protected route middleware for authenticated pages

---

### Support File Import
**Priority:** Medium
**Status:** ✅ Complete (Jan 8, 2026)

Allow users to import their existing comic collections from files or other tracking services, making it easy to migrate to Comic Tracker.

**Supported File Formats:**
- CSV (most universal)
- JSON (structured data)
- Excel (.xlsx)
- XML (some apps export this)

**Import Sources to Consider:**
- Generic spreadsheets (user-created)
- CLZ Comics export
- League of Comic Geeks export
- ComicBase export
- GoCollect export

**User Experience:**
- File upload interface with drag-and-drop support
- Preview imported data before committing
- Field mapping UI (map CSV columns to Comic Tracker fields)
- Progress indicator for large imports
- Summary report after import (success count, errors, duplicates)

**Data Handling:**
- Validate required fields (title, issue number at minimum)
- Handle missing/optional fields gracefully
- Normalize data formats (dates, grades, prices)
- Currency handling for purchase prices

**Duplicate Detection:**
- Check for existing comics by title + issue + variant
- Options: skip duplicates, overwrite existing, or import as new
- Show duplicates in preview for user decision

**Grade Mapping:**
- Map different grading scales to internal format
- Support CGC, CBCS, raw grades, and custom scales
- Handle grade notes/labels

**Error Handling:**
- Partial import support (don't fail entire import for one bad row)
- Clear error messages per row
- Export failed rows for user to fix and retry
- Ability to undo/rollback recent import

**Technical Considerations:**
- Client-side file parsing (Papa Parse for CSV, SheetJS for Excel)
- Chunked processing for large files (1000+ comics)
- Memory management for browser-based parsing
- Consider server-side processing for very large imports (requires auth)

**Post-Import Options:**
- Assign all imported comics to a specific list
- Trigger bulk price estimates for imported comics
- Option to fetch cover images for imports without images

---

### Professor's Hottest Books Feature
**Priority:** Medium
**Status:** ✅ Complete (Jan 8, 2026)

Weekly market analysis showing the hottest comics based on recent sales activity. Similar to Key Collector's "Hot 10" feature.

**Features:**
- Display top 10 trending comics
- Show key facts (first appearances, significance)
- Price ranges (low/mid/high)
- Recent sale comparisons vs 12-month average
- Link to eBay/marketplace listings

**Data Sources:**
- eBay API for recent sales data
- Claude AI for key facts and significance
- Weekly refresh of hot list

**UI Elements:**
- Cover image thumbnail
- Title, publisher, year
- Key facts section
- Price trend indicators (+/- percentage)
- "Buy it on eBay" affiliate link (future monetization)
