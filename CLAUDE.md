# Claude Code Instructions

## On Session Start

These steps run automatically when starting a new conversation, OR can be triggered manually with **"Let's get started"**.

1. Check recent git commits and summarize where we left off last session (1-2 lines)
2. Show **Priority Action Items from `EVALUATION.md`** - this is the primary guide for what to work on next
3. Show a summary of the last session by reading the most recent entry in DEV_LOG.md. Include:
  - What was accomplished
  - Any issues that were encountered
  - Where we left off
4. Ask me if I will be testing on Mobile or Web during this session. This will help guide the changes that need to be made via my test results

## Let's Get Started Command

When the user says **"Let's get started"**, perform all the steps in "On Session Start" above. This is useful for:
- Starting a new work session
- Re-orienting after a context reset or long break
- Getting a fresh status update on the project

## Priority Documents

**EVALUATION.md** is the guiding light for development priorities. It takes precedence over BACKLOG.md.

- `EVALUATION.md` - Launch readiness evaluation with prioritized action items (work from this)
- `BACKLOG.md` - Feature ideas and enhancements to tackle after launch priorities are complete

When asked "what's next?" or similar, always reference EVALUATION.md's Priority Action Items first.

## Backlog Display Format

When displaying the backlog (only when specifically requested), group items by status and priority:
1. Pending - High Priority
2. Pending - Medium Priority
3. Pending - Low Priority
4. Completed (with dates)

Show each group as a numbered list with titles only, no details.

## New Feature Interview
1. Always interview me using the AskUserQuestionTool when a new feature is added
2. Always provide the full "Implementation Plan" before adding a new feature

## Test Requirements

**When adding new features, ALWAYS write unit tests for:**
- Pure helper functions (calculations, formatting, validation)
- Business logic (pricing, limits, permissions, state transitions)
- Constants that affect user experience (scan limits, pricing tiers, thresholds)

**Test file locations:**
- `src/types/__tests__/` - Type helper tests (e.g., auction calculations)
- `src/lib/__tests__/` - Library function tests (e.g., subscription logic)
- `src/hooks/__tests__/` - Hook helper tests (e.g., guest scan tracking)

**Test commands:**
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode during development
npm test -- [file]    # Run specific test file
```

**What to test:**
- Edge cases and boundary conditions
- Error states and validation failures
- Happy path scenarios
- Any function that handles money, limits, or permissions

**What NOT to test (for now):**
- React components (defer to manual testing)
- API routes with database calls (require complex mocking)
- Third-party integrations (Stripe, Clerk, Supabase)

**Example:** When adding a new pricing calculation, write tests like:
```typescript
describe('calculateNewPrice', () => {
  it('handles zero input', () => { ... });
  it('handles boundary at $100', () => { ... });
  it('returns correct value for typical input', () => { ... });
});
```

## Design Standards

**See `.claude/skills/design-system.md` for complete color palette and patterns.**

### Core Rules
1. Always keep mobile responsiveness part of all design decisions
2. Ensure all design decisions are focused on a streamlined UX for the user
3. **NEVER use `text-white` on light backgrounds** (`bg-white`, `bg-gray-50`, `bg-gray-100`)
4. **NEVER use dark text on dark backgrounds** (`bg-gray-800`, `bg-gray-900`)

### Quick Reference: Safe Text Colors
| Background | Use These Text Colors |
|------------|----------------------|
| `bg-white` / `bg-gray-50` | `text-gray-900` (headings), `text-gray-600` (body), `text-gray-500` (muted) |
| `bg-gray-800` / `bg-gray-900` | `text-white` (headings), `text-gray-300` (body), `text-gray-400` (muted) |
| `bg-primary-600` / `bg-amber-600` | `text-white` only |

### Before Completing Any UI Work
Run a mental checklist:
- [ ] No white text on white/light backgrounds
- [ ] No dark text on dark backgrounds
- [ ] Buttons have visible text contrast
- [ ] Form labels and inputs are readable

**Trigger "design check" to review the full design system.**

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Clipboard Usage
**ALWAYS** copy content to the user's clipboard when they need to paste something somewhere (Supabase SQL, API keys, URLs, etc.):
```bash
echo "content here" | pbcopy
# or for file contents:
cat /path/to/file.sql | pbcopy
```
Never make the user manually copy text - use `pbcopy` to do it for them.

## Environment Variables
When any environment variable needs to be added or updated:
1. Automatically open the .env.local file in TextEdit for the user:
```bash
open -a TextEdit "/Users/chrispatton/Coding for Dummies/Comic Tracker/.env.local"
```
2. **Track the new variable** - Remember that this variable was added during the session
3. **Remind about Netlify** - When deploying, this variable MUST be added to Netlify environment variables first

## Close Up Shop Command

When the user says **"Close up shop"**, perform the following steps:

1. **Review and optimize code** - Review the session's changes for:
   - Run `npm run lint` and fix any **errors** (warnings can be deferred)
   - Remove debugging code (console.logs, commented-out code)
   - Remove unused imports and variables
   - Consolidate any duplicate logic
   - Address any TODO comments created during the session
   - Ensure code follows project patterns and conventions
2. **Update TEST_CASES.md** - Add test cases for any new features added during the session
3. **Review ARCHITECTURE.md** - If the session added/modified pages, API routes, or service integrations:
   - Update relevant sections to reflect changes
   - Add new routes, features, or service dependencies
   - Keep the document accurate as a living reference
4. **Run tests** - Execute `npm test`, `npm run lint`, and `npm run build` to ensure nothing is broken before committing
5. **Commit all changes** - Stage and commit with a descriptive message summarizing the session's work
6. **Update DEV_LOG.md** - Add an entry with:
   - Date
   - Session summary (what was accomplished)
   - Files added/modified (key ones only)
   - Any issues encountered and resolved
7. **Update "Changes Since Last Deploy"** - Add session's changes to the tracking section in DEV_LOG.md
8. **Highlight last item worked on** - Brief high-level summary of the main feature/fix
9. **Evaluation status review** - Read EVALUATION.md and provide:
   - Current status of priority items
   - Recommended next steps for the next session

The Dev Log is stored at: `DEV_LOG.md` in the project root.

**Important:** Close up shop does NOT deploy. Deploys are limited and should be done strategically using the Deploy command.

## Services & Infrastructure

### Domain & Hosting
| Service | Purpose | Dashboard |
|---------|---------|-----------|
| **Netlify** | Hosting, domain, DNS | [app.netlify.com](https://app.netlify.com) |
| **Domain** | collectors-chest.com | Purchased via Netlify (Jan 2026) |
| **SSL** | HTTPS certificate | Let's Encrypt (auto-renewed) |

### Core Services
| Service | Purpose | Dashboard | Env Variable |
|---------|---------|-----------|--------------|
| **Supabase** | Database (Postgres) | [supabase.com/dashboard](https://supabase.com/dashboard) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Clerk** | Authentication | [dashboard.clerk.com](https://dashboard.clerk.com) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| **Stripe** | Payments | [dashboard.stripe.com](https://dashboard.stripe.com) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Anthropic** | AI (Claude) for cover recognition | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY` |

### Supporting Services
| Service | Purpose | Dashboard | Env Variable |
|---------|---------|-----------|--------------|
| **Resend** | Email notifications | [resend.com](https://resend.com) | `RESEND_API_KEY` |
| **Upstash** | Redis caching & rate limiting | [console.upstash.com](https://console.upstash.com) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Sentry** | Error tracking | [sentry.io](https://sentry.io) | `SENTRY_DSN` |
| **PostHog** | Analytics | [app.posthog.com](https://app.posthog.com) | `NEXT_PUBLIC_POSTHOG_KEY` |

### External APIs
| Service | Purpose | Notes |
|---------|---------|-------|
| **eBay Browse API** | Real-time pricing | Free tier, rate limited |
| **CGC/CBCS** | Cert verification | Web scraping for grade details |

### Project Costs

**Fixed Costs:**
| Item | Cost | Billing Cycle |
|------|------|---------------|
| Netlify Personal Plan | $9/mo | 13th of each month |
| Domain (collectors-chest.com) | $13.99/yr | Renews Jan 13, 2027 ($16.99) |

**Variable Costs:**
| Service | Cost | Notes |
|---------|------|-------|
| Anthropic API | ~$0.015/scan | Prepaid credits ($10 loaded) |
| Stripe | 2.9% + $0.30 | Per transaction |

**Free Tiers (current usage):**
- Supabase: 500MB DB, 1GB storage
- Clerk: 10K MAU
- Upstash: 10K commands/day
- Resend: 3K emails/mo
- PostHog: 1M events/mo
- Sentry: 5K errors/mo

## Deploy Command

**Hosting Platform:** Netlify (NOT Vercel)

When the user says **"Deploy"**, perform the following steps:

1. **Run full quality check:**
   - `npm run lint` - Check for linting errors
   - `npm test` - Run all tests
   - `npm run build` - Ensure build succeeds

2. **CHECK FOR NEW ENVIRONMENT VARIABLES** ⚠️ CRITICAL:
   - Compare current `.env.local` against known Netlify variables
   - If ANY new variables were added this session, **STOP** and:
     - List all new variables that need to be added to Netlify
     - Copy variable names and values to clipboard for easy pasting
     - Provide direct link: Netlify → Site settings → Environment variables
     - **DO NOT PROCEED** until user confirms they've added the variables to Netlify
   - This prevents production failures from missing env vars

3. **Review Deploy Checklist** - Confirm with user:
   - [ ] All tests passing
   - [ ] Manual smoke test completed
   - [ ] No console errors
   - [ ] Mobile responsiveness tested
   - [ ] Priority features working as expected
   - [ ] **New environment variables added to Netlify** (if any)

4. **Show "Changes Since Last Deploy"** - Display accumulated changes from DEV_LOG.md so user can confirm it's worth a deploy

5. **Get explicit confirmation** - Ask user to confirm they want to use a deploy

6. **After successful deploy:**
   - Clear the "Changes Since Last Deploy" section in DEV_LOG.md
   - Log the deploy date and summary in DEV_LOG.md
   - **IMPORTANT:** Batch the DEV_LOG update into the same commit OR commit it locally without pushing (to avoid triggering a second Netlify build)

**Deploy Budget:** User has limited Netlify build minutes. Always remind them of this and confirm the deploy is worth it.

## Changes Since Last Deploy Tracking

Maintain a "Changes Since Last Deploy" section at the top of DEV_LOG.md with:
- List of features/fixes added since last deploy
- Running count of sessions since last deploy
- Assessment of deploy readiness (Ready / Needs Testing / Has Issues)

This helps batch work strategically and avoid wasting deploys on small changes.

## Revert Technopathy Command

When the user says **"revert technopathy"**, revert ALL of the following changes back to "AI" terminology:

### Files and Exact Changes to Revert:

**1. `/src/app/layout.tsx` (line ~17 in metadata description)**
- CURRENT: `"Scan covers with technopathic recognition"`
- REVERT TO: `"Scan covers with AI recognition"`

**2. `/src/app/page.tsx` (line ~291 in hero section)**
- CURRENT: `"Scan covers with technopathic recognition"`
- REVERT TO: `"Scan covers with AI recognition"`

**3. `/src/app/sign-up/[[...sign-up]]/page.tsx` (line ~125 in benefits list)**
- CURRENT: `"Technopathic comic cover recognition"`
- REVERT TO: `"AI-powered comic cover recognition"`

**4. `/src/components/Navigation.tsx` - FAQ answers**
- Line ~16: CURRENT: `"technopathic recognition"` → REVERT TO: `"AI recognition"`
- Line ~31: CURRENT: `"using technopathy based on"` → REVERT TO: `"by AI based on"`

**5. `/src/components/AskProfessor.tsx` - FAQ answers**
- Line ~15: CURRENT: `"technopathic recognition"` → REVERT TO: `"AI recognition"`
- Line ~30: CURRENT: `"using technopathy based on"` → REVERT TO: `"by AI based on"`

**6. `/src/components/ComicDetailModal.tsx` (line ~474)**
- CURRENT: `"Technopathic Estimate:</span> No eBay sales data found. This price is a technopathic estimate"`
- REVERT TO: `"AI Estimate:</span> No eBay sales data found. This price is an AI estimate"`

**7. `/src/components/ComicDetailsForm.tsx` (line ~1136)**
- CURRENT: `"Technopathic Estimate:</span> No eBay sales data found for this comic. This price is a technopathic estimate"`
- REVERT TO: `"AI Estimate:</span> No eBay sales data found for this comic. This price is an AI estimate"`

**8. `/src/components/KeyHuntPriceResult.tsx` (line ~193)**
- CURRENT: `"Technopathic Estimate:</span> No eBay sales data found. This price is a technopathic estimate"`
- REVERT TO: `"AI Estimate:</span> No eBay sales data found. This price is an AI estimate"`

**9. `/src/app/key-hunt/page.tsx` - Multiple locations**
- All `"Technopathic Estimate"` → `"AI Estimate"`
- All `"Technopathic estimate"` → `"AI-estimated value"` (in disclaimers)

**10. `/src/hooks/useOffline.ts` - Multiple locations**
- All `"Technopathic Estimate"` → `"AI Estimate"`
- All `"Technopathic estimate"` → `"AI-estimated value"`

**11. `/src/app/api/analyze/route.ts` - 3 occurrences (lines ~755, 760, 765)**
- CURRENT: `disclaimer = "Technopathic estimate - actual prices may vary.";`
- REVERT TO: `disclaimer = "AI estimate - actual prices may vary.";`

**12. `/src/app/api/quick-lookup/route.ts` (line ~207)**
- CURRENT: `disclaimer: "Technopathic estimates based on market knowledge."`
- REVERT TO: `disclaimer: "AI-estimated values based on market knowledge."`

### Revert Process:
1. Read each file listed above
2. Use Edit tool with replace_all where multiple occurrences exist
3. Run `npm run build` to verify changes compile
4. Commit with message: "Revert technopathy branding back to AI terminology"

## Revert Retro-Futuristic Design Command

When the user says **"revert design"** or **"revert retro design"**, revert ALL of the following changes back to the original design:

### Files and Exact Changes to Revert:

**1. `/src/app/layout.tsx`**
- REVERT font imports from `Bebas_Neue, Source_Sans_3, JetBrains_Mono` back to just `Inter`
- REVERT body className from `${sourceSans.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} font-sans` to `inter.className`
- REVERT themeColor from `#0a0f1a` to `#1e40af`
- REVERT background class from `bg-cc-cream` to `bg-gray-50`

**2. `/tailwind.config.ts`**
- REVERT entire config back to original:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

**3. `/src/app/globals.css`**
- REMOVE all new CSS variables (--cc-ink, --cc-cream, etc.)
- REMOVE halftone pattern styles
- REMOVE scanner animation styles
- REMOVE new keyframe animations (scanner-sweep, value-shimmer, card-lift, etc.)
- REVERT :root variables to original
- REVERT .comic-card styles to original
- REVERT .skeleton styles to original

**4. `/src/components/ComicCard.tsx`**
- REVERT to original styling (remove retro-futuristic classes)
- REVERT card background from `bg-cc-cream` to `bg-white`
- REMOVE notch corner effects
- REMOVE new hover animations
- REVERT badge styling to original

**5. `/src/components/MobileNav.tsx`**
- REVERT glassmorphism container from `bg-cc-ink/90` styling back to `bg-white/80`
- REVERT active state colors from scanner-blue to primary colors
- REVERT text colors to original gray scale

**6. `/src/components/Navigation.tsx`**
- REVERT nav background and styling to original
- REVERT logo text from `font-display` to original
- REVERT button styling to original primary colors

### Revert Process:
1. Read each file listed above
2. Replace with original content or use Edit tool to revert specific changes
3. Run `npm run build` to verify changes compile
4. Commit with message: "Revert retro-futuristic design back to original"

## Disable Beta Mode Command

When the user says **"disable beta mode"** or **"enable paid tiers"**, perform the following change:

### File to Edit:
**`/src/hooks/useSubscription.ts`** (line ~70)

### Change:
```typescript
// CURRENT (Beta Mode ON):
const BETA_MODE_ALL_FEATURES = true;

// CHANGE TO (Beta Mode OFF - Paid tiers enabled):
const BETA_MODE_ALL_FEATURES = false;
```

### What This Does:
- **When `true` (current):** All logged-in users get premium features (unlimited scans, all feature access)
- **When `false` (for launch):** Users are gated by their actual subscription tier (free/premium) via Stripe

### Process:
1. Edit `src/hooks/useSubscription.ts` line ~70
2. Change `BETA_MODE_ALL_FEATURES = true` to `BETA_MODE_ALL_FEATURES = false`
3. Run `npm run build` to verify
4. Commit with message: "Disable beta mode - enable paid subscription tiers"

**Note:** Ensure Stripe is fully configured and tested before disabling beta mode.

