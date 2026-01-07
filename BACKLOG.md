# Comic Tracker Backlog

## Pending Enhancements

### Sales Flow - Use Actual Transaction Price
**Priority:** High
**Status:** Pending

Currently, when marking a comic as sold, users manually enter the sale price. Once the app goes live with Stripe Connect integration, the system should automatically record the actual transaction amount from completed purchases. This will:
- Ensure accurate profit/loss tracking
- Integrate with the user-to-user marketplace flow
- Remove potential for user entry errors

---

### eBay API Integration for Price History
**Priority:** Medium
**Status:** Pending

Replace AI-generated price estimates with real market data from eBay's API. This will provide:
- Actual recent sales data for specific comics (title, issue, grade)
- More accurate estimated values based on real transactions
- Historical price trends over time
- Better confidence in valuations for buying/selling decisions

**Requirements:**
- eBay Developer Account and API credentials
- API integration for completed listings search
- Caching layer to minimize API calls
- Fallback to AI estimates when no eBay data available

---

### User Registration & Authentication
**Priority:** High
**Status:** Pending

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

### Enhance Mobile Camera Integration
**Priority:** Medium
**Status:** Pending

Enhance the mobile camera experience with a live preview interface. Basic camera capture is already implemented via the `capture="environment"` attribute.

**Features:**
- Access device camera via browser APIs (MediaDevices API)
- Live camera preview within the scan interface
- Capture button to take photo
- Option to retake before submitting for analysis
- Fallback to file upload for unsupported browsers/devices

**Technical Considerations:**
- Use `navigator.mediaDevices.getUserMedia()` for camera access
- Handle camera permissions gracefully
- Support both front and rear cameras (prefer rear)
- Works on iOS Safari, Android Chrome, and desktop browsers with webcams
- Consider using a library like `react-webcam` for easier implementation

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
- Other collectibles

**Implementation Considerations:**
- Update AI vision prompts to identify collectible type and extract relevant metadata
- Category-specific fields (e.g., card grade, Pop number, set name)
- Category-specific price sources (eBay, TCGPlayer, Pop Price Guide)
- Update UI to accommodate different collectible types
- Allow users to filter collection by category
- Consider renaming app to something more generic (e.g., "Collector's Vault")

**Data Model Changes:**
- Add `collectibleType` field to items
- Dynamic metadata schema based on collectible type
- Category-specific grading scales (PSA for cards, etc.)
