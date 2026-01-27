import { SupabaseClient, createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client for browser-side operations (subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
// Only use in API routes, never expose to client
// Falls back to anon client during build time when service key isn't available
if (!supabaseServiceKey && typeof window === "undefined") {
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Admin operations will use anon client and may fail due to RLS policies."
  );
}
export const supabaseAdmin: SupabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
