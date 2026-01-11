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

## Environment Variables
When any environment variable needs to be added or updated, automatically open the .env.local file in TextEdit for the user:
```bash
open -a TextEdit "/Users/chrispatton/Coding for Dummies/Comic Tracker/.env.local"
```

## Close Up Shop Command

When the user says **"Close up shop"**, perform the following steps:

1. **Commit all changes** - Stage and commit with a descriptive message summarizing the session's work
2. **Update DEV_LOG.md** - Add an entry with:
   - Date
   - Session summary (what was accomplished)
   - Files added/modified (key ones only)
   - Any issues encountered and resolved
3. **Highlight last item worked on** - Brief high-level summary of the main feature/fix
4. **Evaluation status review** - Read EVALUATION.md and provide:
   - Current status of priority items
   - Recommended next steps for the next session

The Dev Log is stored at: `DEV_LOG.md` in the project root.

