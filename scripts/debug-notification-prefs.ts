// Debug helper for the /api/settings/notifications 500 error.
// Queries the same fields the route expects and prints them, so we can see
// if the row exists, if the columns exist, and if anything is NULL.
//
// Run: npx tsx scripts/debug-notification-prefs.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the testing user (CPatton716 / patton716)
  const { data: candidates, error: candErr } = await supabase
    .from("profiles")
    .select("id, clerk_user_id, username, email")
    .or("username.ilike.%patton716%,username.ilike.%cpatton%");

  if (candErr || !candidates || candidates.length === 0) {
    console.error("No tester profile found:", candErr);
    process.exit(1);
  }

  console.log("Candidate testing profiles:");
  candidates.forEach((c) => console.log(`  ${c.username} (clerk=${c.clerk_user_id}, email=${c.email})`));

  // Try the exact same query the API route does, for each candidate clerk_user_id
  for (const c of candidates) {
    console.log(`\n--- Querying as clerk_user_id=${c.clerk_user_id} ---`);
    // Check each column individually to identify which are missing
    const cols = [
      "msg_push_enabled",
      "msg_email_enabled",
      "email_pref_marketplace",
      "email_pref_social",
      "email_pref_marketing",
    ];
    for (const col of cols) {
      const { error: colErr } = await supabase
        .from("profiles")
        .select(col)
        .eq("clerk_user_id", c.clerk_user_id)
        .single();
      if (colErr) {
        console.log(`  ❌ ${col}: ${colErr.code} — ${colErr.message}`);
      } else {
        console.log(`  ✅ ${col}: column exists`);
      }
    }
    // Original combined query
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select(
        "msg_push_enabled, msg_email_enabled, email_pref_marketplace, email_pref_social, email_pref_marketing",
      )
      .eq("clerk_user_id", c.clerk_user_id)
      .single();

    if (error) {
      console.log(`  ❌ Error code: ${error.code}`);
      console.log(`  ❌ Error message: ${error.message}`);
      console.log(`  ❌ Error details: ${error.details}`);
      console.log(`  ❌ Error hint: ${error.hint}`);
      console.log(`  HTTP status: ${status} ${statusText}`);
    } else {
      console.log(`  ✅ Success:`);
      console.log(`    msg_push_enabled: ${data.msg_push_enabled}`);
      console.log(`    msg_email_enabled: ${data.msg_email_enabled}`);
      console.log(`    email_pref_marketplace: ${data.email_pref_marketplace}`);
      console.log(`    email_pref_social: ${data.email_pref_social}`);
      console.log(`    email_pref_marketing: ${data.email_pref_marketing}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
