# Reset Trials

SQL queries to reset trial status for testing purposes. Run these in Supabase SQL Editor.

## Reset Single User

Replace `YOUR_CLERK_USER_ID` with your actual Clerk user ID:

```sql
UPDATE profiles
SET
  trial_started_at = NULL,
  trial_ends_at = NULL,
  subscription_status = 'free'
WHERE clerk_id = 'YOUR_CLERK_USER_ID';
```

## Reset ALL Users' Trials

Resets everyone who has used or is currently in a trial:

```sql
UPDATE profiles
SET
  trial_started_at = NULL,
  trial_ends_at = NULL,
  subscription_status = 'free'
WHERE subscription_status = 'trialing'
   OR trial_started_at IS NOT NULL;
```

## How to Find Your Clerk User ID

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to Users
3. Find your user and copy the User ID (starts with `user_`)
