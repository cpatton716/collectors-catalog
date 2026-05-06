// Inspects cached comic_metadata rows for Ultimate Fallout #4 variants
// to see what the AI has been returning as the title across scans, and
// whether any of those normalize-equivalents are missing aliases.
//
// Run: npx tsx scripts/inspect-ultimate-fallout-cache.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("comic_metadata")
    .select("title, issue_number, release_year, key_info, updated_at")
    .ilike("title", "%ultimate fallout%")
    .eq("issue_number", "4");

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No comic_metadata rows match 'ultimate fallout' #4");
    return;
  }

  console.log(`Found ${data.length} cached row(s) for Ultimate Fallout #4:\n`);
  for (const row of data) {
    console.log(`  Title (as cached):  "${row.title}"`);
    console.log(`  Issue:              "${row.issue_number}"`);
    console.log(`  Release year:       ${row.release_year ?? "null"}`);
    console.log(`  key_info (cached):  ${JSON.stringify(row.key_info)}`);
    console.log(`  Last updated:       ${row.updated_at}`);
    console.log();
  }

  // Also inspect the [keyinfo-drift] telemetry by checking if any AI titles
  // have been recently logged. This lives in Netlify function logs, not
  // Supabase, so we can't query it here — but if there are weird title
  // variants stored in comic_metadata, those tell us what the AI is returning.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
