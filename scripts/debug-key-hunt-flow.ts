// Simulates the exact con-mode-lookup keyInfo flow for Ultimate Fallout #4
// to confirm whether the alias is hitting in production code path (vs. just
// the unit test path). The unit test calls lookupKeyInfo directly; production
// applies normalizeTitle from src/lib/normalizeTitle.ts FIRST, then passes
// the normalized string to lookupKeyInfoWithMeta which applies its OWN
// internal normalize.
//
// Run: npx tsx scripts/debug-key-hunt-flow.ts

import { normalizeTitle, normalizeIssueNumber } from "../src/lib/normalizeTitle";
import { lookupKeyInfoWithMeta } from "../src/lib/keyComicsDatabase";

const testTitles = [
  "Ultimate Fallout",
  "Ultimate Fallout: Spider-Man",
  "Ultimate Fallout - Spider-Man",
  "Ultimate Fallout Spider-Man",
  "ULTIMATE FALLOUT SPIDER-MAN",
  "ultimate fallout spider-man",
  "Ultimate Fallout, Spider-Man",
  "Ultimate Fallout (Spider-Man)",
  "Ultimate Fallout #4 Spider-Man", // issue inline
  "Ultimate Fallout: Spider-Man No More",
  "Ultimate Fallout #4",
  "Ultimate Fallout Spider Man", // no hyphen
  "Ultimate Fallout: Spider Man",
];

console.log("Simulating con-mode-lookup keyInfo flow for Ultimate Fallout #4 across AI title variants:\n");

for (const rawTitle of testTitles) {
  const normalizedTitle = normalizeTitle(rawTitle);
  const normalizedIssue = normalizeIssueNumber("4");

  // No year passed (cover-scan path doesn't pass years)
  const result = lookupKeyInfoWithMeta(normalizedTitle, normalizedIssue, null);

  const status = result && result.keyInfo.length > 0 ? "✅ HIT" : "❌ MISS";
  const keyInfo = result?.keyInfo.join(", ") ?? "—";
  console.log(`  ${status}  raw="${rawTitle}"`);
  console.log(`         normalized="${normalizedTitle}"  issue="${normalizedIssue}"`);
  console.log(`         keyInfo: ${keyInfo}`);
  console.log();
}
