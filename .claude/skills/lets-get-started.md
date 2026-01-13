---
description: Daily standup to recap yesterday's work and outline today's priorities
triggers:
  - "let's get started"
  - "lets get started"
  - "Let's get started"
  - "Lets get started"
  - "daily standup"
  - "standup"
---

# Skill: Daily Standup

## Instructions

Run this quick standup to kick off the session. Be concise and actionable.

### Step 1: Recap from Last Session
Read the most recent entry in `DEV_LOG.md` and note the date. Summarize:
- **What was accomplished** (2-3 bullet points max)
- **Any blockers or issues encountered**

### Step 2: Priority Action Items
Read `EVALUATION.md` and extract the current **Priority Action Items** section (Section 12). Present:
- Items marked as completed (briefly acknowledge)
- **Launch Priority items** that are still pending (these are the focus)
- First item that should be tackled this session

### Step 3: Deploy Status
From the "Changes Since Last Deploy" section in `DEV_LOG.md`, report:
- Sessions since last deploy
- Deploy readiness status
- Any known issues blocking deploy

### Step 4: Today's Focus
Based on the above, recommend **1-2 specific tasks** for this session with a clear starting point.

### Output Format

Present the standup in this format:

```
## Recap from [Date of Last Session]
[2-3 bullet summary of last session]

## Priority Items (from EVALUATION.md)
[List pending launch priorities with current status]

## Deploy Status
[Sessions since deploy, readiness, blockers]

## Today's Focus
[1-2 recommended tasks with where to start]

Ready to dive in?
```

Keep the entire output under 30 lines. This is a standup, not a full report.
