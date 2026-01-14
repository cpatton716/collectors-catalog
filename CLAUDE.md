# Claude Code Instructions

## On Session Start

1. Check recent git commits and summarize where we left off last session (1-2 lines)
2. Show **Priority Action Items from `EVALUATION.md`** - this is the primary guide for what to work on next
3. Show a brief summary of work completed in the previous session

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

## New Feature Inteview
1. Always interview me using the AskUserQuestionTool when a new feature is added
2. always provide the full "Implementation Plan" before adding a new feature

## Design Standards
1. Always keep mobile responsiveness part of all design decisions
2. Ensure all design decisions are focused on a streamlined UX for the user

## Clipboard Usage
**ALWAYS** copy content to the user's clipboard when they need to paste something somewhere (Supabase SQL, API keys, URLs, etc.):
```bash
echo "content here" | pbcopy
# or for file contents:
cat /path/to/file.sql | pbcopy
```
Never make the user manually copy text - use `pbcopy` to do it for them.

## Environment Variables
When any environment variable needs to be added or updated, automatically open the .env.local file in TextEdit for the user:
```bash
open -a TextEdit "/Users/chrispatton/Coding for Dummies/Comic Tracker/.env.local"
```

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
3. **Run tests** - Execute `npm run lint` and `npm run build` to ensure nothing is broken before committing
4. **Commit all changes** - Stage and commit with a descriptive message summarizing the session's work
5. **Update DEV_LOG.md** - Add an entry with:
   - Date
   - Session summary (what was accomplished)
   - Files added/modified (key ones only)
   - Any issues encountered and resolved
6. **Update "Changes Since Last Deploy"** - Add session's changes to the tracking section in DEV_LOG.md
7. **Highlight last item worked on** - Brief high-level summary of the main feature/fix
8. **Evaluation status review** - Read EVALUATION.md and provide:
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

## Deploy Command

**Hosting Platform:** Netlify (NOT Vercel)

When the user says **"Deploy"**, perform the following steps:

1. **Run full quality check:**
   - `npm run lint` - Check for linting errors
   - `npm test` - Run all tests
   - `npm run build` - Ensure build succeeds

2. **Review Deploy Checklist** - Confirm with user:
   - [ ] All tests passing
   - [ ] Manual smoke test completed
   - [ ] No console errors
   - [ ] Mobile responsiveness tested
   - [ ] Priority features working as expected

3. **Show "Changes Since Last Deploy"** - Display accumulated changes from DEV_LOG.md so user can confirm it's worth a deploy

4. **Get explicit confirmation** - Ask user to confirm they want to use a deploy

5. **After successful deploy:**
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

