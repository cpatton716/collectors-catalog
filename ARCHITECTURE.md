# Collectors Chest - System Architecture

> **Comprehensive map of pages, features, and service dependencies**

*Last Updated: January 17, 2026*

---

## Service Legend

| Icon | Service | Purpose |
|------|---------|---------|
| 🔐 | **Clerk** | Authentication |
| 🗄️ | **Supabase** | Database (PostgreSQL) |
| 🤖 | **Anthropic/Claude** | AI analysis |
| 💰 | **Stripe** | Payments |
| 📧 | **Resend** | Email |
| 🔴 | **Upstash Redis** | Cache/Rate limiting |
| 📊 | **PostHog** | Analytics |
| 🐛 | **Sentry** | Error tracking |
| 🏷️ | **eBay API** | Pricing data |
| 📚 | **Comic Vine** | Comic metadata |
| 💾 | **localStorage** | Client storage |

---

## Pages & Features

### Home Page (`/`)

| Feature | Services | Notes |
|---------|----------|-------|
| Collection Overview | 💾 🗄️ | Value, count, profit/loss stats |
| Market Insights | 💾 | Biggest gains, best ROI, declines |
| Hottest Books Carousel | 🗄️ 🤖 📚 | Cached 24h, AI-generated trends |
| Guest CTA | 🔐 | "Scan Your First Book" for non-auth |

---

### Scan Page (`/scan`)

| Feature | Services | Notes |
|---------|----------|-------|
| AI Cover Recognition | 🤖 🔴 | Claude vision analyzes cover image |
| Barcode Scanning | 📚 🤖 | Comic Vine lookup, AI fallback |
| Price Estimation | 🏷️ 🗄️ 🔴 | eBay API → Supabase cache → Redis |
| CGC/CBCS Cert Lookup | Web scrape | Verifies graded comic certification |
| Key Info Lookup | 🗄️ | 402 curated key comics database |
| Suggest Key Info | 🗄️ 🔐 | Community submissions for key facts |
| Scan Limits | 💾 🗄️ | Guest 5, Free 10/mo, Pro unlimited |
| Email Capture | 📧 | 5 bonus scans for email signup |
| CSV Import | 🤖 🗄️ | Bulk import with AI enrichment |
| Image Optimization | — | Client-side compression to 400KB |

---

### Collection Page (`/collection`)

| Feature | Services | Notes |
|---------|----------|-------|
| Comic Storage | 💾 🗄️ | localStorage for guests, Supabase for auth |
| Custom Lists | 💾 🗄️ | Want List, For Sale, Slabbed, etc. |
| Search & Filter | 💾 | By publisher, title, starred |
| View Variants | 💾 | Groups same title/issue variants |
| Mark as Sold | 💾 🗄️ | Tracks profit/loss |
| CSV Export | 💾 | Client-side download |
| Share Collection | 🗄️ 🔐 | Public profile generation |

---

### Key Hunt (`/key-hunt`)

| Feature | Services | Notes |
|---------|----------|-------|
| Quick Price Lookup | 🏷️ 🤖 🗄️ | Optimized for convention use |
| Grade Selector | — | 25 CGC grades for raw books |
| Offline Mode | 💾 | Cached lookups, sync queue |
| Barcode Cache | 💾 | 7-day TTL, max 20 entries |
| Quick-Add Buttons | 💾 | Want List, Collection, Passed On |
| My Hunt List | 🗄️ 🔐 | Wishlist of comics user wants to find |
| Add to Hunt List | 🗄️ 🔐 | From Hot Books or scan results |

---

### Shop (`/shop`)

| Feature | Services | Notes |
|---------|----------|-------|
| Auction Listings | 🗄️ | eBay-style proxy bidding |
| Fixed-Price Listings | 🗄️ | Buy Now with offer support |
| Search & Sort | 🗄️ | By price, ending time, bids |
| Watchlist | 🗄️ 🔐 | Track interesting auctions |

---

### Auction System (`/shop`, `/my-auctions`, `/watchlist`)

| Feature | Services | Notes |
|---------|----------|-------|
| Create Auction | 🗄️ 🔐 | From collection comics |
| Place Bid | 🗄️ 🔐 🔴 | Rate limited, proxy bidding |
| Buy It Now | 🗄️ 💰 | Instant purchase option |
| Payment Processing | 💰 🗄️ | Stripe checkout flow |
| Seller Ratings | 🗄️ 🔐 | Positive/negative reviews |
| Notifications | 🗄️ | Outbid, won, sold alerts |
| Auction End Processing | 🗄️ | Cron job marks completed |

---

### Offers System (`/shop`)

| Feature | Services | Notes |
|---------|----------|-------|
| Make Offer | 🗄️ 🔐 | Below asking price |
| Counter Offer | 🗄️ 🔐 📧 | Seller negotiation |
| Accept/Reject | 🗄️ 💰 | Triggers payment flow |
| Offer Expiration | 🗄️ | 48-hour auto-expire (cron) |

---

### Hottest Books (`/hottest-books`)

| Feature | Services | Notes |
|---------|----------|-------|
| Trending Comics List | 🗄️ 🤖 | Database-cached, AI fallback |
| Cover Images | 📚 | Comic Vine API |
| Market Analysis | 🤖 | Why it's hot, price trends |
| Database Caching | 🗄️ | hot_books table with seeded data |
| Price Refresh | 🏷️ 🗄️ | eBay API, 24-hour lazy refresh |
| Add to Hunt List | 🗄️ 🔐 | Track comics you want to find |

---

### Stats (`/stats`)

| Feature | Services | Notes |
|---------|----------|-------|
| Collection Statistics | 💾 🗄️ | Total value, profit/loss |
| Value Trends | 💾 | Based on stored purchase prices |
| Refresh Stats | 💾 | Recalculates from collection |

---

### Public Profile (`/u/[slug]`)

| Feature | Services | Notes |
|---------|----------|-------|
| Shared Collection View | 🗄️ | Read-only public access |
| Profile Info | 🗄️ 🔐 | Display name, bio |
| Custom URL Slug | 🗄️ | e.g., collectors-chest.com/u/batman |

---

### Authentication (`/sign-in`, `/sign-up`, `/profile`)

| Feature | Services | Notes |
|---------|----------|-------|
| Sign In | 🔐 | Google + Apple social login |
| Sign Up (Waitlist) | 🔐 📧 | Currently captures email only |
| Custom Profile Page | 🗄️ 🔐 | Replaced Clerk's UserProfile |
| Username System | 🗄️ 🔐 | Customizable display name with validation |
| Display Preferences | 🗄️ | Username vs real name preference |
| Data Migration | 💾 🗄️ | Import localStorage on signup |

---

### Legal Pages (`/privacy`, `/terms`)

| Feature | Services | Notes |
|---------|----------|-------|
| Privacy Policy | — | CCPA compliance, data practices |
| Terms of Service | — | Marketplace terms, liability |
| Footer Links | — | Available from homepage footer |

**Status:** Page structure complete. Content pending LLC formation for official business name.

---

### Pricing Page (`/pricing`)

| Feature | Services | Notes |
|---------|----------|-------|
| Tier Comparison | — | Free vs Pro feature matrix |
| Upgrade Flow | 💰 🔐 | Stripe checkout integration |
| Current Plan Display | 🗄️ 🔐 | Shows user's subscription status |

---

### Admin Pages

#### Usage Dashboard (`/admin/usage`)

| Feature | Services | Notes |
|---------|----------|-------|
| Usage Dashboard | 🗄️ 🔴 🤖 | Monitor service consumption |
| Supabase Metrics | 🗄️ | Database size, row counts |
| Upstash Metrics | 🔴 | Commands used, storage |
| Anthropic Metrics | 🤖 | Token usage, costs |
| Alert History | 🗄️ | Past limit warnings |

#### Key Info Moderation (`/admin/key-info`)

| Feature | Services | Notes |
|---------|----------|-------|
| Submission Queue | 🗄️ | Pending community submissions |
| Approve/Reject | 🗄️ | Moderation actions |
| Edit Before Approve | 🗄️ | Modify submitted key info |

**Note:** Admin pages have no auth protection yet (security by obscurity).

---

## API Routes

### AI & Recognition

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/analyze` | POST | Cover image analysis | 🤖 🗄️ 🔴 🏷️ |
| `/api/barcode-lookup` | POST | UPC barcode lookup | 📚 |
| `/api/quick-lookup` | POST | Fast barcode + pricing | 📚 🗄️ 🤖 |
| `/api/comic-lookup` | POST | Title/issue lookup | 🤖 🗄️ 🔴 |
| `/api/con-mode-lookup` | POST | Key Hunt pricing | 🏷️ 🤖 🗄️ 📚 |
| `/api/import-lookup` | POST | CSV enrichment | 🤖 🗄️ |
| `/api/titles/suggest` | POST | Title autocomplete | 🤖 |
| `/api/cover-search` | POST | Cover image search | Open Library |
| `/api/cert-lookup` | POST | CGC/CBCS verification | Web scrape |

### Pricing & Market

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/ebay-prices` | POST/GET | eBay sold listings | 🏷️ 🗄️ 🔴 |
| `/api/hottest-books` | GET | Trending comics | 🤖 📚 🗄️ |

### Auctions & Listings

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/auctions` | GET/POST | List/create auctions | 🗄️ 🔐 |
| `/api/auctions/[id]` | GET/PATCH/DELETE | Auction management | 🗄️ 🔐 |
| `/api/auctions/[id]/bid` | POST | Place bid | 🗄️ 🔐 🔴 |
| `/api/auctions/[id]/bids` | GET | Bid history | 🗄️ |
| `/api/auctions/[id]/buy-now` | POST | Buy It Now | 🗄️ 🔐 |
| `/api/auctions/by-comic/[comicId]` | GET | Check active listing | 🗄️ |
| `/api/listings/[id]/purchase` | POST | Fixed-price purchase | 🗄️ 🔐 |

### Offers

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/offers` | GET/POST | List/create offers | 🗄️ 🔐 |
| `/api/offers/[id]` | GET/PATCH/POST | Offer management | 🗄️ 🔐 |

### Watchlist & Notifications

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/watchlist` | GET/POST/DELETE | Manage watchlist | 🗄️ 🔐 |
| `/api/notifications` | GET/PATCH | User notifications | 🗄️ 🔐 |

### Sellers & Sharing

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/sellers/[id]/ratings` | GET/POST | Seller reputation | 🗄️ 🔐 |
| `/api/sharing` | GET/POST/PATCH | Public profile settings | 🗄️ 🔐 |

### Payments & Billing

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/checkout` | POST | Stripe checkout session | 💰 🗄️ 🔐 |
| `/api/billing/checkout` | POST | Subscription checkout | 💰 🗄️ 🔐 |
| `/api/billing/portal` | POST | Stripe customer portal | 💰 🗄️ 🔐 |
| `/api/billing/status` | GET | Subscription status | 🗄️ 🔐 |

### Key Hunt

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/key-hunt` | GET | Get user's hunt list | 🗄️ 🔐 |
| `/api/key-hunt` | POST | Add comic to hunt list | 🗄️ 🔐 |
| `/api/key-hunt` | DELETE | Remove from hunt list | 🗄️ 🔐 |
| `/api/key-hunt` | PATCH | Update hunt list item | 🗄️ 🔐 |

### Admin

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/admin/usage` | GET | Service usage metrics | 🗄️ 🔴 🤖 |
| `/api/admin/usage/check-alerts` | POST | Check limits, send alerts | 🗄️ 📧 |
| `/api/admin/key-info` | GET | List pending submissions | 🗄️ |
| `/api/admin/key-info/[id]` | PATCH/DELETE | Approve/reject submission | 🗄️ |

### User & Profile

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/username` | GET/POST/PATCH | Username management | 🗄️ 🔐 |
| `/api/username/current` | GET | Get current user's username | 🗄️ 🔐 |
| `/api/key-info/submit` | POST | Submit key info suggestion | 🗄️ 🔐 |
| `/api/email-capture` | POST | Guest email for bonus scans | 📧 🗄️ |

### Utility

| Route | Method | Purpose | Services |
|-------|--------|---------|----------|
| `/api/waitlist` | POST | Email capture | 📧 |
| `/api/test-email` | GET | Dev email testing | 📧 |

---

## Webhooks

| Route | Trigger | Purpose | Services |
|-------|---------|---------|----------|
| `/api/webhooks/clerk` | User deleted | Cascade delete user data | 🔐 🗄️ |
| `/api/webhooks/stripe` | Payment events | Auction payments, subscriptions | 💰 🗄️ |

---

## Cron Jobs & Scheduled Functions

| Route/Function | Schedule | Purpose | Services |
|----------------|----------|---------|----------|
| `/api/cron/process-auctions` | Every 5 min | End auctions, expire offers/listings | 🗄️ |
| `/api/cron/reset-scans` | Monthly | Reset free tier scan counts | 🗄️ |
| `check-usage-alerts` (Netlify) | Daily | Monitor service limits, send alerts | 🗄️ 📧 |

**Automation Logic:**
- Auctions: Mark as `closed` or `sold` when end time passes
- Offers: Expire after 48 hours if no response
- Listings: Expire after 30 days
- Scans: Reset monthly counts on 1st of month
- Alerts: Email admin when approaching service limits

---

## Data Flow Diagrams

### Cover Scan Flow

```
┌──────────────────┐
│  User uploads    │
│  cover image     │
└────────┬─────────┘
         │
         v
┌──────────────────┐     ┌──────────────────┐
│  Rate Limit      │────>│  Blocked (429)   │
│  Check (Upstash) │     └──────────────────┘
└────────┬─────────┘
         │ Pass
         v
┌──────────────────┐
│  Claude Vision   │
│  Analysis        │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    v         v
┌────────┐ ┌────────────┐
│ Graded │ │ Raw Comic  │
│ Comic  │ │            │
└───┬────┘ └─────┬──────┘
    │            │
    v            v
┌────────────┐ ┌──────────────────┐
│ CGC/CBCS   │ │ eBay Price       │
│ Cert Lookup│ │ Lookup           │
└─────┬──────┘ └────────┬─────────┘
      │                 │
      └────────┬────────┘
               │
               v
       ┌───────────────┐
       │ Cache Result  │
       │ (Supabase)    │
       └───────┬───────┘
               │
               v
       ┌───────────────┐
       │ Return to     │
       │ User          │
       └───────────────┘
```

### Auction Purchase Flow

```
┌──────────────────┐
│  Buyer clicks    │
│  Buy Now         │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Clerk Auth      │
│  Verify User     │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Create Stripe   │
│  Checkout        │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  User Pays       │
│  on Stripe       │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Stripe Webhook  │
│  Fires           │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Update Auction  │
│  Status (Paid)   │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Create          │
│  Notifications   │
│  (Buyer/Seller)  │
└──────────────────┘
```

---

## Key Hooks

| Hook | Purpose | Services |
|------|---------|----------|
| `useCollection` | Cloud sync abstraction - routes to localStorage (guests) or Supabase (signed-in) | 💾 🗄️ 🔐 |
| `useGuestScans` | Tracks free scan usage, enforces limits | 💾 |
| `useOffline` | Offline queue for Key Hunt | 💾 |

**useCollection provides:**
- `collection`, `lists`, `sales` - state
- `addToCollection`, `updateCollectionItem`, `removeFromCollection` - CRUD with optimistic updates
- `createList`, `deleteList`, `addItemToList`, `removeItemFromList` - list management
- `recordSale` - sales tracking
- `isCloudEnabled` - true when signed in and syncing to Supabase

---

## Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts linked to Clerk |
| `comics` | Collection items |
| `lists` | Custom lists (Want List, For Sale, etc.) |
| `comic_lists` | Junction: comics ↔ lists |
| `sales` | Sold comic records |
| `comic_metadata` | Shared comic info cache |
| `ebay_price_cache` | eBay prices (24h TTL) |
| `auctions` | Auction and fixed-price listings |
| `bids` | Bid history |
| `auction_watchlist` | User watchlists |
| `seller_ratings` | Reputation system |
| `notifications` | In-app notifications |
| `offers` | Purchase offers on listings |

---

## Environment Variables

### Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

### Database
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### AI
- `ANTHROPIC_API_KEY`

### Payments
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Email
- `RESEND_API_KEY`
- `RESEND_WAITLIST_AUDIENCE_ID`

### Caching
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Monitoring
- `SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`

### External APIs
- `COMIC_VINE_API_KEY`
- `EBAY_APP_ID`

### Cron
- `CRON_SECRET`

---

## Service Cost Summary

| Service | Tier | Cost | Limit |
|---------|------|------|-------|
| Netlify | Personal | $9/mo | 1000 build min |
| Anthropic | Pay-per-use | ~$0.015/scan | Prepaid credits |
| Stripe | Standard | 2.9% + $0.30 | Per transaction |
| Supabase | Free (Pro planned) | $0 ($25/mo) | 500MB (8GB Pro) |
| Clerk | Free | $0 | 10K MAU |
| Upstash | Free | $0 | 10K cmd/day |
| Resend | Free | $0 | 3K emails/mo |
| PostHog | Free | $0 | 1M events/mo |
| Sentry | Free | $0 | 5K errors/mo |
| eBay API | Free | $0 | Rate limited |
| Comic Vine | Free | $0 | Rate limited |

---

## Mobile/PWA Features

| Feature | Implementation |
|---------|----------------|
| Installable | Web manifest + service worker |
| Offline Mode | Key Hunt cached lookups |
| Camera Access | Live preview + capture |
| Bottom Navigation | Auto-hide on scroll |
| Safe Areas | iOS notch handling |

---

*This document is auto-generated and should be updated when major features are added.*
