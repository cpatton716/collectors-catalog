# Collectors Chest - Test Cases

A guide for testing the main and secondary features of the application.

---

## Getting Started

**Test URL:** [Your Netlify URL]

**Test Accounts:**
- Guest (no account required)
- Registered user (create via Sign Up or use Google/Apple login)

---

## Primary Features

### 1. AI-Powered Comic Scanning

**Location:** Home → "Scan Your First Book" / "Scan a Book"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Upload comic cover photo | Click upload area → Select comic cover image | AI analyzes and identifies title, issue #, publisher, creators, key info |
| Mobile camera capture | On mobile, tap upload → Use camera | Camera opens, photo captured and analyzed |
| Review detected details | After scan completes | Form shows detected details with confidence indicator |
| Edit detected details | Modify any field in the form | Changes save correctly |
| Fun facts during scan | Upload image and wait | Rotating comic facts display while analyzing |

### 2. Collection Management

**Location:** Navigation → "Collection"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View collection | Navigate to Collection page | All saved comics display in grid or list view |
| Toggle grid/list view | Click view toggle buttons | View switches between grid cards and list rows |
| Search collection | Type in search box | Results filter by title, issue, publisher |
| Filter by publisher | Select publisher from dropdown | Only comics from that publisher show |
| Filter by title | Select title from dropdown | Only comics with that title show |
| Filter by list | Select list from dropdown | Only comics in that list show |
| Sort collection | Change sort dropdown | Comics reorder by date/title/value/issue |
| Star a comic | Click star icon on comic card | Comic marked as starred, filter works |

### 3. Comic Details & Editing

**Location:** Collection → Click any comic

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View comic details | Click comic in collection | Detail modal opens with all info |
| View cover lightbox | Click cover image in modal | Full-screen lightbox opens |
| Close lightbox | Click X or outside image | Lightbox closes |
| Edit comic details | Click "Edit Details" → Modify → Save | Changes persist |
| View variants | If "View Variants (X)" link shows, click it | Variants modal opens showing all variants of same title/issue |
| Search variants | In variants modal, type in search | Filters variants by name |

### 4. User Authentication

**Location:** Navigation → "Sign In" / "Sign Up"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Sign up with email | Click Sign Up → Enter email/password | Account created, redirected to app |
| Sign up with Google | Click Sign Up → Google button | Google OAuth flow → Account created |
| Sign up with Apple | Click Sign Up → Apple button | Apple OAuth flow → Account created |
| Sign in | Click Sign In → Enter credentials | Logged in, see user avatar in nav |
| Sign out | Click avatar → Sign Out | Logged out, returned to guest state |
| View profile | Click avatar → "Manage Account" | Profile page opens |

### 5. Guest vs Registered Experience

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Guest home page | Visit home while logged out | See "Scan Your First Book", "How It Works" section, no "View Collection" button |
| Guest scan limit | As guest, scan comics | After limit reached, see upgrade prompt |
| Registered home page | Log in → Visit home | See "Scan a Book", "View Collection" button, no "How It Works" |
| Guest collection | Visit /collection while logged out | Empty collection, prompt to sign up |

---

## Secondary Features

### 6. Custom Lists

**Location:** Collection → Comic Detail → "Add to List"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Add to existing list | Click "Add to List" → Select list | Comic added, success toast shows |
| Create new list | Click "Add to List" → "Create New" → Enter name | New list created, comic added |
| Remove from list | Click "Add to List" → Click checkmark on list | Comic removed from that list |
| Slabbed auto-list | Add comic marked as "Professionally Graded" | Automatically added to "Slabbed" list |

### 7. Mark as Sold

**Location:** Collection → Comic Detail → "Mark as Sold"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Mark comic sold | Click "Mark as Sold" → Enter price → Confirm | Comic moved to sales history, removed from collection |
| View sales stats | Check home page stats | Sales count, revenue, profit updated |

### 8. Professor's Hottest Books

**Location:** Home → Orange "Professor's Hottest Books" banner

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View hottest books | Click banner | Page shows top 10 trending comics |
| View book details | Review each entry | Shows title, key facts, price ranges, cover image |
| Back navigation | Click back button | Returns to home page |

### 9. Ask the Professor (FAQ)

**Location:** Floating brain icon (bottom-right corner)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Open FAQ | Click brain icon | FAQ modal opens |
| Expand question | Click any question | Answer expands below |
| Collapse question | Click expanded question | Answer collapses |
| Close FAQ | Click X or outside modal | Modal closes |

### 10. CSV Import (Desktop Only, Registered Users)

**Location:** Scan page → "Import CSV" button

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Download template | Click "Download sample CSV template" | CSV file downloads |
| Upload CSV | Click upload area → Select CSV file | File parsed, preview shows |
| Preview import | Review preview table | Shows title, issue (publisher/year on desktop) |
| Import comics | Click "Import X Comics" | Progress bar shows, comics import with price lookups |
| Import complete | Wait for completion | Success message, redirected to collection |
| Not visible on mobile | View scan page on mobile | Import CSV button hidden |
| Not visible for guests | View scan page while logged out | Import CSV button hidden |

### 11. Alternative Add Methods

**Location:** Scan page → "Other ways to add your books"

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Scan barcode | Click "Scan Barcode" → Scan comic barcode | Comic looked up by UPC, details populated |
| Manual entry | Click "Enter Manually" | Empty form opens for manual data entry |

### 12. Price Estimates & Key Info

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View estimated value | Check comic detail modal | Shows estimated value |
| View key info | Check comic detail modal | Shows key facts (first appearances, etc.) |
| Profit/loss tracking | Add purchase price to comic | Home page shows profit/loss calculation |
| View grade breakdown | Click "Value By Grade" in comic details | Expandable table shows prices for 6 grades (9.8 to 2.0) |
| Raw vs slabbed prices | View grade breakdown | Shows both raw and slabbed values per grade |

### 12a. eBay Price Integration

**Price data now comes from eBay sold listings when available, with AI fallback.**

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| eBay price lookup | Scan a popular comic (e.g., Amazing Spider-Man #300) | Console shows "[ebay-finding] Searching for..." and returns price data |
| eBay source indicator | View price on comic with eBay data | Should show "eBay Data" badge or similar indicator |
| AI fallback | Scan an obscure comic with no eBay sales | Console shows "Falling back to AI price estimates", price shows with AI warning |
| AI price warning | View price from AI fallback | Yellow/orange alert: "Price estimate based on AI - may not reflect current market" |
| For Sale Now link | View Key Hunt result | "For Sale Now on eBay" button opens eBay search |
| Key Hunt eBay first | Use Key Hunt to look up a comic | eBay data attempted first, AI fallback if no results |
| Add Book eBay first | Use Add Book to scan a comic | eBay data attempted first, AI fallback if no results |

**Debugging eBay Issues:**
- Check browser console for `[ebay-finding]` log messages
- Verify `EBAY_APP_ID` is set in `.env.local`
- Ensure `EBAY_SANDBOX` is NOT set (or set to "false") for production
- Check that comic has title AND issue number (required for price lookup)

### 13. Key Hunt (Mobile Quick Lookup)

**Location:** Mobile → Key Hunt icon in bottom nav, or direct via `/key-hunt`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Open Key Hunt | Tap Key Hunt in mobile nav | Bottom sheet opens with 3 entry options |
| Scan cover | Select "Scan Cover" → Take photo | AI identifies comic, grade selector appears for raw |
| Scan barcode | Select "Scan Barcode" → Scan UPC | Comic looked up by barcode, grade selector appears |
| Manual entry | Select "Manual Entry" | Title autocomplete + issue number + grade fields |
| Grade selection (raw) | Complete lookup for raw comic | Grade picker shows 6 options (9.8 to 2.0) |
| Slabbed detection | Scan cover of slabbed comic | Auto-detects grade from CGC/CBCS label |
| Price result | Complete any lookup | Shows average price and most recent sale |
| Recent sale highlighting | View result with recent sale | Red = market cooling (20%+ above avg), Green = deal (20%+ below) |
| Add to collection | Tap "Add to Collection" on result | Comic added, confirmation shown |
| New lookup | Tap "New Lookup" | Returns to entry selection |

### 14. Title Autocomplete & Auto-Refresh

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Title autocomplete | Type partial title (e.g., "Spider") | Suggestions appear containing search term |
| Contains-search | Type "Spider" | Shows "Amazing Spider-Man", "Spider-Woman", etc. (not just prefix matches) |
| Clear stale suggestions | Type "Batman" → clear → type "Spider" | Only Spider results show, no Batman |
| Auto-refresh on change | Enter "Hulk 181" → change to "180" | Details automatically refresh for issue 180 |
| Preserve user data on refresh | Enter notes/price → change issue | Notes and purchase price preserved, comic details updated |

### 15. Database Caching (Performance)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| First lookup (cache miss) | Look up a comic never searched before | Takes 1-2 seconds (AI lookup), console shows "Database miss" |
| Repeat lookup (cache hit) | Look up same comic again | Near-instant response (~50ms), console shows "Database hit" |
| CSV import seeds database | Import CSV with new comics → search one | Second search is fast (database hit) |

---

## Mobile Responsiveness

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Home page mobile | View on mobile device | Layout adjusts, features stack vertically |
| Collection mobile | View collection on mobile | Filter labels hidden, dropdowns work |
| Comic detail mobile | Open comic detail on mobile | Modal scrollable, all info accessible |
| Navigation mobile | View nav on mobile | Bottom navigation bar appears |
| CSV import hidden | View scan page on mobile | Import CSV button not visible |

---

## Edge Cases

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Poor image quality | Upload blurry/dark comic photo | AI attempts recognition, may show lower confidence |
| Unknown comic | Upload obscure/indie comic | AI provides best guess or prompts manual entry |
| Duplicate comic | Add same comic twice | Both copies saved (variants feature helps manage) |
| Empty collection | New user views collection | Empty state with prompt to add comics |
| Large CSV import | Import 50+ comics via CSV | Progress bar tracks, all comics import |

---

## Known Limitations

1. **eBay prices require title + issue** - Price lookup needs both fields; AI fallback used otherwise
2. **CSV import desktop only** - Better UX on larger screens for file management
3. **Guest scan limit** - Guests limited to 10 scans to encourage registration
4. **First lookups are slower** - Comics not in database require AI lookup (~1-2s); subsequent lookups are fast (~50ms)
5. **Database caching is shared** - All users benefit from lookups made by other users
6. **eBay may have no results** - Obscure comics may not have recent sales; AI fallback provides estimate

---

## Reporting Issues

If you encounter bugs or unexpected behavior:
1. Note the steps to reproduce
2. Screenshot any error messages
3. Note your device/browser
4. Report at: [GitHub Issues URL]

---

*Last Updated: January 10, 2026*
