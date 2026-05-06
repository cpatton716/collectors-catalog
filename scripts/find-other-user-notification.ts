// One-off helper for Test 24 (IDOR fix verification).
// Finds a notification id that does NOT belong to the testing user (CPatton716)
// so we can verify markNotificationRead silently filters cross-user attempts.
//
// Run: npx tsx scripts/find-other-user-notification.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Search for profiles matching cpatton or patton variants
  const { data: candidates, error: searchErr } = await supabase
    .from("profiles")
    .select("id, username, email")
    .or("username.ilike.%patton%,email.ilike.%patton%");

  if (searchErr || !candidates || candidates.length === 0) {
    console.error("No patton candidates:", searchErr);
    process.exit(1);
  }
  console.log("Candidate tester profiles:");
  candidates.forEach((c) => console.log(`  username=${c.username}  email=${c.email}  id=${c.id}`));

  // Pick the first match for "cpatton" or fall back to first patton match
  const testerProfile =
    candidates.find((c) => c.username?.toLowerCase().includes("cpatton")) ?? candidates[0];
  console.log(`\nUsing tester: ${testerProfile.username} (${testerProfile.id})\n`);

  // Find an UNREAD notification NOT owned by the tester. Already-read rows
  // can't prove the gate works (no observable state change either way).
  const { data: otherNotifs, error: notifErr } = await supabase
    .from("notifications")
    .select("id, user_id, type, message, is_read, created_at")
    .neq("user_id", testerProfile.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (notifErr || !otherNotifs || otherNotifs.length === 0) {
    console.error("No other-user notifications found:", notifErr);
    process.exit(1);
  }

  console.log("\nCandidate notification ids (NOT owned by CPatton716):");
  for (const n of otherNotifs) {
    console.log(`  id=${n.id}  user_id=${n.user_id}  is_read=${n.is_read}  type=${n.type}`);
  }

  // Surface the username of the owner of the first candidate so user knows whose row they're poking
  const ownerId = otherNotifs[0].user_id;
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", ownerId)
    .single();

  console.log(`\nFirst candidate id: ${otherNotifs[0].id}`);
  console.log(`Owner: ${ownerProfile?.username ?? "(unknown)"}`);
  console.log(`is_read currently: ${otherNotifs[0].is_read}`);
  console.log(`\nUse this id in the curl PATCH. After the call, re-query is_read:`);
  console.log(`  SELECT id, is_read, read_at FROM notifications WHERE id='${otherNotifs[0].id}';`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
