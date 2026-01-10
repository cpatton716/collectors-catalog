-- ============================================================================
-- PRODUCTION RLS POLICIES FOR COLLECTORS CHEST
-- ============================================================================
--
-- This migration replaces the relaxed dev policies with production-ready
-- Row Level Security policies.
--
-- AUTHENTICATION PATTERN:
-- Since we use Clerk (not Supabase Auth), we have two options:
--   1. Pass Clerk JWT to Supabase and extract claims (recommended for full RLS)
--   2. Use service role key for server-side operations (current pattern)
--
-- This migration supports BOTH approaches:
--   - JWT-based RLS for when Clerk JWT is passed via request headers
--   - Service role bypass for server-side operations
--
-- IMPORTANT: Before running this migration, ensure your application is
-- configured to pass Clerk JWTs to Supabase, OR that all data access
-- goes through server-side routes using the service role key.
--
-- HOW TO APPLY:
--   1. Go to Supabase Dashboard > SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--   4. Verify no errors in the output
--
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================
-- We drop all existing policies to start fresh with a clean slate.
-- This prevents conflicts and ensures we have complete control.

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;

-- Drop lists policies
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;
DROP POLICY IF EXISTS "Anyone can view lists from public profiles" ON lists;

-- Drop comics policies
DROP POLICY IF EXISTS "Users can view own comics" ON comics;
DROP POLICY IF EXISTS "Users can insert own comics" ON comics;
DROP POLICY IF EXISTS "Users can update own comics" ON comics;
DROP POLICY IF EXISTS "Users can delete own comics" ON comics;
DROP POLICY IF EXISTS "Anyone can view comics from public profiles" ON comics;

-- Drop comic_lists policies
DROP POLICY IF EXISTS "Users can view own comic_lists" ON comic_lists;
DROP POLICY IF EXISTS "Users can insert own comic_lists" ON comic_lists;
DROP POLICY IF EXISTS "Users can delete own comic_lists" ON comic_lists;
DROP POLICY IF EXISTS "Anyone can view comic_lists from public profiles" ON comic_lists;

-- Drop sales policies
DROP POLICY IF EXISTS "Users can view own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON sales;

-- Drop comic_metadata policies
DROP POLICY IF EXISTS "Comic metadata is publicly readable" ON comic_metadata;
DROP POLICY IF EXISTS "Comic metadata can be inserted" ON comic_metadata;
DROP POLICY IF EXISTS "Comic metadata can be updated" ON comic_metadata;

-- Drop app_cache policies
DROP POLICY IF EXISTS "Cache is publicly accessible" ON app_cache;


-- ============================================================================
-- STEP 2: HELPER FUNCTIONS
-- ============================================================================
-- These functions extract user identity from various sources.

-- Function to get the Clerk user ID from JWT claims
-- This works when the Clerk JWT is passed to Supabase
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get the 'sub' claim from JWT (Clerk user ID)
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims', true)::json->>'user_id',
    NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get the profile ID for the current Clerk user
CREATE OR REPLACE FUNCTION auth.current_profile_id()
RETURNS UUID AS $$
DECLARE
  clerk_id TEXT;
  profile_uuid UUID;
BEGIN
  clerk_id := auth.clerk_user_id();

  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO profile_uuid
  FROM profiles
  WHERE clerk_user_id = clerk_id
  LIMIT 1;

  RETURN profile_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.clerk_user_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- STEP 3: PROFILES TABLE POLICIES
-- ============================================================================
-- Requirements:
--   - Users can read/update their own profile
--   - Public profiles (is_public = true) can be read by anyone
--   - Insert allowed for new signups

-- SELECT: Users can view their own profile OR any public profile
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    -- User can view their own profile
    clerk_user_id = auth.clerk_user_id()
    -- OR profile is marked as public
    OR is_public = TRUE
  );

-- INSERT: Users can only create a profile with their own Clerk ID
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (
    -- The clerk_user_id must match the authenticated user
    clerk_user_id = auth.clerk_user_id()
  );

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (
    clerk_user_id = auth.clerk_user_id()
  ) WITH CHECK (
    -- Prevent changing clerk_user_id to someone else's ID
    clerk_user_id = auth.clerk_user_id()
  );

-- DELETE: Users can delete their own profile (optional, for GDPR compliance)
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE USING (
    clerk_user_id = auth.clerk_user_id()
  );


-- ============================================================================
-- STEP 4: COMICS TABLE POLICIES
-- ============================================================================
-- Requirements:
--   - Users can only CRUD their own comics
--   - Public profiles: their comics are readable by anyone
--   - No cross-user access for private collections

-- SELECT: Users can view their own comics OR comics from public profiles
CREATE POLICY "comics_select_policy" ON comics
  FOR SELECT USING (
    -- User's own comics
    user_id = auth.current_profile_id()
    -- OR comics from public profiles
    OR user_id IN (
      SELECT id FROM profiles WHERE is_public = TRUE
    )
  );

-- INSERT: Users can only add comics to their own collection
CREATE POLICY "comics_insert_policy" ON comics
  FOR INSERT WITH CHECK (
    user_id = auth.current_profile_id()
  );

-- UPDATE: Users can only update their own comics
CREATE POLICY "comics_update_policy" ON comics
  FOR UPDATE USING (
    user_id = auth.current_profile_id()
  ) WITH CHECK (
    -- Prevent transferring comics to another user
    user_id = auth.current_profile_id()
  );

-- DELETE: Users can only delete their own comics
CREATE POLICY "comics_delete_policy" ON comics
  FOR DELETE USING (
    user_id = auth.current_profile_id()
  );


-- ============================================================================
-- STEP 5: LISTS TABLE POLICIES
-- ============================================================================
-- Requirements:
--   - Users can only CRUD their own lists
--   - Public profiles with is_shared lists: readable by anyone

-- SELECT: Users can view their own lists OR shared lists from public profiles
CREATE POLICY "lists_select_policy" ON lists
  FOR SELECT USING (
    -- User's own lists
    user_id = auth.current_profile_id()
    -- OR shared lists from public profiles
    OR (
      is_shared = TRUE
      AND user_id IN (
        SELECT id FROM profiles WHERE is_public = TRUE
      )
    )
  );

-- INSERT: Users can only create lists for themselves
CREATE POLICY "lists_insert_policy" ON lists
  FOR INSERT WITH CHECK (
    user_id = auth.current_profile_id()
  );

-- UPDATE: Users can only update their own lists
CREATE POLICY "lists_update_policy" ON lists
  FOR UPDATE USING (
    user_id = auth.current_profile_id()
  ) WITH CHECK (
    -- Prevent transferring lists to another user
    user_id = auth.current_profile_id()
  );

-- DELETE: Users can only delete their own lists
CREATE POLICY "lists_delete_policy" ON lists
  FOR DELETE USING (
    user_id = auth.current_profile_id()
  );


-- ============================================================================
-- STEP 6: COMIC_LISTS TABLE POLICIES (Junction Table)
-- ============================================================================
-- Requirements:
--   - Users can only manage their own comic-list relationships
--   - Must verify both comic and list belong to user

-- SELECT: Users can view comic-list associations for their own items or public profiles
CREATE POLICY "comic_lists_select_policy" ON comic_lists
  FOR SELECT USING (
    -- User's own comic-list relationships
    (
      comic_id IN (SELECT id FROM comics WHERE user_id = auth.current_profile_id())
      AND list_id IN (SELECT id FROM lists WHERE user_id = auth.current_profile_id())
    )
    -- OR associations from public profiles (for viewing shared collections)
    OR (
      comic_id IN (
        SELECT c.id FROM comics c
        JOIN profiles p ON c.user_id = p.id
        WHERE p.is_public = TRUE
      )
      AND list_id IN (
        SELECT l.id FROM lists l
        JOIN profiles p ON l.user_id = p.id
        WHERE p.is_public = TRUE AND l.is_shared = TRUE
      )
    )
  );

-- INSERT: Both the comic and list must belong to the current user
CREATE POLICY "comic_lists_insert_policy" ON comic_lists
  FOR INSERT WITH CHECK (
    -- Comic must belong to current user
    comic_id IN (SELECT id FROM comics WHERE user_id = auth.current_profile_id())
    -- List must also belong to current user
    AND list_id IN (SELECT id FROM lists WHERE user_id = auth.current_profile_id())
  );

-- DELETE: Both the comic and list must belong to the current user
CREATE POLICY "comic_lists_delete_policy" ON comic_lists
  FOR DELETE USING (
    comic_id IN (SELECT id FROM comics WHERE user_id = auth.current_profile_id())
    AND list_id IN (SELECT id FROM lists WHERE user_id = auth.current_profile_id())
  );

-- Note: There's no UPDATE policy because the junction table only has
-- composite primary key + timestamp, nothing to update


-- ============================================================================
-- STEP 7: SALES TABLE POLICIES
-- ============================================================================
-- Requirements:
--   - Users can only CRUD their own sales records
--   - No public access to sales data (sensitive financial info)

-- SELECT: Users can only view their own sales
CREATE POLICY "sales_select_policy" ON sales
  FOR SELECT USING (
    user_id = auth.current_profile_id()
  );

-- INSERT: Users can only record their own sales
CREATE POLICY "sales_insert_policy" ON sales
  FOR INSERT WITH CHECK (
    user_id = auth.current_profile_id()
  );

-- UPDATE: Users can only update their own sales
CREATE POLICY "sales_update_policy" ON sales
  FOR UPDATE USING (
    user_id = auth.current_profile_id()
  ) WITH CHECK (
    user_id = auth.current_profile_id()
  );

-- DELETE: Users can only delete their own sales
CREATE POLICY "sales_delete_policy" ON sales
  FOR DELETE USING (
    user_id = auth.current_profile_id()
  );


-- ============================================================================
-- STEP 8: COMIC_METADATA TABLE POLICIES
-- ============================================================================
-- Requirements:
--   - Public read (anyone can look up comic info)
--   - Authenticated users can insert/update (contribute to shared repo)
--   - No delete (preserve data integrity)

-- SELECT: Anyone can read comic metadata (public resource)
CREATE POLICY "comic_metadata_select_policy" ON comic_metadata
  FOR SELECT USING (TRUE);

-- INSERT: Only authenticated users can add new comic metadata
CREATE POLICY "comic_metadata_insert_policy" ON comic_metadata
  FOR INSERT WITH CHECK (
    auth.is_authenticated()
  );

-- UPDATE: Only authenticated users can update comic metadata
CREATE POLICY "comic_metadata_update_policy" ON comic_metadata
  FOR UPDATE USING (
    auth.is_authenticated()
  ) WITH CHECK (
    auth.is_authenticated()
  );

-- No DELETE policy - comic metadata should be preserved


-- ============================================================================
-- STEP 9: APP_CACHE TABLE POLICIES
-- ============================================================================
-- The app_cache table stores non-sensitive shared data like "hottest books"
-- It needs to be publicly accessible for the app to function

-- Allow public read access to cache
CREATE POLICY "app_cache_select_policy" ON app_cache
  FOR SELECT USING (TRUE);

-- Only authenticated users can write to cache
CREATE POLICY "app_cache_insert_policy" ON app_cache
  FOR INSERT WITH CHECK (
    auth.is_authenticated()
  );

CREATE POLICY "app_cache_update_policy" ON app_cache
  FOR UPDATE USING (
    auth.is_authenticated()
  );

CREATE POLICY "app_cache_delete_policy" ON app_cache
  FOR DELETE USING (
    auth.is_authenticated()
  );


-- ============================================================================
-- STEP 10: VERIFY RLS IS ENABLED
-- ============================================================================
-- Ensure RLS is enabled on all tables (idempotent)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_cache ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- IMPLEMENTATION NOTES
-- ============================================================================
--
-- OPTION A: JWT-Based RLS (Recommended for full security)
-- --------------------------------------------------------
-- To use JWT-based RLS with Clerk, you need to:
--
-- 1. Create a Clerk JWT template for Supabase:
--    - Go to Clerk Dashboard > JWT Templates
--    - Create new template with name "supabase"
--    - Set the claims to include: { "sub": "{{user.id}}" }
--
-- 2. Update your Supabase client to include the JWT:
--    ```typescript
--    import { useAuth } from '@clerk/nextjs';
--
--    const { getToken } = useAuth();
--    const token = await getToken({ template: 'supabase' });
--
--    const supabase = createClient(url, anonKey, {
--      global: {
--        headers: {
--          Authorization: `Bearer ${token}`
--        }
--      }
--    });
--    ```
--
-- 3. Configure Supabase to verify Clerk JWTs:
--    - Go to Supabase Dashboard > Settings > API
--    - Under "JWT Settings", add Clerk's JWKS endpoint
--
--
-- OPTION B: Service Role Key (Current Pattern)
-- --------------------------------------------------------
-- If you prefer to keep using the service role key for server-side
-- operations, the RLS policies above will be bypassed for those calls.
--
-- Create a server-side Supabase client:
--    ```typescript
--    // lib/supabase-admin.ts
--    import { createClient } from '@supabase/supabase-js';
--
--    export const supabaseAdmin = createClient(
--      process.env.NEXT_PUBLIC_SUPABASE_URL!,
--      process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role bypasses RLS
--    );
--    ```
--
-- Use this client in API routes/server actions where you've already
-- verified the user's identity via Clerk.
--
--
-- HYBRID APPROACH (Recommended)
-- --------------------------------------------------------
-- Use both approaches:
-- - Client-side: Pass Clerk JWT for read operations (RLS enforced)
-- - Server-side: Use service role for write operations (you verify auth)
--
-- This gives you:
-- - Defense in depth (RLS as second layer of security)
-- - Flexibility for complex operations
-- - Better performance for server-side operations
--
-- ============================================================================
