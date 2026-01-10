/**
 * Seed Key Comics Script
 *
 * This script populates the comic_metadata table with the top 500 key comics.
 * It calls the comic-lookup API for each comic to get price estimates and key info.
 *
 * ESTIMATED COST: ~$20-30 (500 comics × ~$0.04-0.06 per lookup)
 *
 * Usage:
 *   npx ts-node scripts/seed-key-comics.ts
 *
 * Options:
 *   --dry-run     Show what would be done without making API calls
 *   --start=N     Start from comic index N (for resuming)
 *   --limit=N     Only process N comics (for testing)
 *   --delay=N     Delay between API calls in ms (default: 500)
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  delayMs: 500, // Delay between API calls to avoid rate limiting
  batchSize: 10, // Save progress every N comics
  progressFile: path.join(__dirname, 'seed-progress.json'),
};

interface Comic {
  title: string;
  issue: string;
  note?: string;
}

interface Progress {
  lastIndex: number;
  completed: string[];
  failed: string[];
  startTime: string;
  lastUpdate: string;
}

interface LookupResult {
  publisher: string | null;
  releaseYear: string | null;
  writer: string | null;
  coverArtist: string | null;
  interiorArtist: string | null;
  keyInfo: string[];
  priceData?: {
    estimatedValue: number;
    gradeEstimates: Array<{
      grade: number;
      label: string;
      rawValue: number;
      slabbedValue: number;
    }>;
  };
  source?: string;
}

// Parse command line arguments
function parseArgs(): { dryRun: boolean; start: number; limit: number; delay: number } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    start: parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0'),
    delay: parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || String(CONFIG.delayMs)),
  };
}

// Load comics list
function loadComicsList(): Comic[] {
  const filePath = path.join(__dirname, 'key-comics-list.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data.comics;
}

// Load or create progress file
function loadProgress(): Progress {
  if (fs.existsSync(CONFIG.progressFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf-8'));
  }
  return {
    lastIndex: -1,
    completed: [],
    failed: [],
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  };
}

// Save progress
function saveProgress(progress: Progress): void {
  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Call the comic-lookup API
async function lookupComic(title: string, issueNumber: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/comic-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        issueNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`  Error looking up ${title} #${issueNumber}:`, error);
    return null;
  }
}

// Format currency
function formatCurrency(value: number | undefined): string {
  if (!value) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Main seeding function
async function seedKeyComics(): Promise<void> {
  const args = parseArgs();
  const comics = loadComicsList();
  const progress = loadProgress();

  console.log('\n========================================');
  console.log('  COLLECTORS CHEST - KEY COMICS SEEDER');
  console.log('========================================\n');

  console.log(`Total comics in list: ${comics.length}`);
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Delay between calls: ${args.delay}ms`);
  console.log(`Dry run: ${args.dryRun}`);

  if (args.start > 0) {
    console.log(`Starting from index: ${args.start}`);
  }
  if (args.limit > 0) {
    console.log(`Limiting to: ${args.limit} comics`);
  }

  // Determine range
  const startIndex = args.start || Math.max(0, progress.lastIndex + 1);
  const endIndex = args.limit > 0
    ? Math.min(startIndex + args.limit, comics.length)
    : comics.length;

  console.log(`\nProcessing comics ${startIndex + 1} to ${endIndex} of ${comics.length}`);
  console.log('----------------------------------------\n');

  if (args.dryRun) {
    console.log('DRY RUN - No API calls will be made\n');
    for (let i = startIndex; i < endIndex; i++) {
      const comic = comics[i];
      console.log(`[${i + 1}/${endIndex}] Would lookup: ${comic.title} #${comic.issue}`);
      if (comic.note) console.log(`         Note: ${comic.note}`);
    }
    console.log('\nDry run complete. Remove --dry-run to execute.');
    return;
  }

  // Track stats
  let successCount = 0;
  let failCount = 0;
  let cacheHitCount = 0;
  let aiCallCount = 0;
  const startTime = Date.now();

  // Process comics
  for (let i = startIndex; i < endIndex; i++) {
    const comic = comics[i];
    const comicKey = `${comic.title}#${comic.issue}`;

    // Skip if already completed
    if (progress.completed.includes(comicKey)) {
      console.log(`[${i + 1}/${endIndex}] SKIP (already done): ${comic.title} #${comic.issue}`);
      continue;
    }

    console.log(`[${i + 1}/${endIndex}] Looking up: ${comic.title} #${comic.issue}`);
    if (comic.note) console.log(`         Note: ${comic.note}`);

    const result = await lookupComic(comic.title, comic.issue);

    if (result) {
      successCount++;
      progress.completed.push(comicKey);

      // Track source
      if (result.source === 'database') {
        cacheHitCount++;
        console.log(`         Source: DATABASE (cached)`);
      } else {
        aiCallCount++;
        console.log(`         Source: AI (new lookup)`);
      }

      // Show result summary
      if (result.publisher) console.log(`         Publisher: ${result.publisher}`);
      if (result.releaseYear) console.log(`         Year: ${result.releaseYear}`);
      if (result.priceData?.estimatedValue) {
        console.log(`         Est. Value (9.4): ${formatCurrency(result.priceData.estimatedValue)}`);
      }
      if (result.keyInfo?.length > 0) {
        console.log(`         Key Info: ${result.keyInfo[0]}`);
      }
    } else {
      failCount++;
      progress.failed.push(comicKey);
      console.log(`         FAILED`);
    }

    // Update progress
    progress.lastIndex = i;

    // Save progress periodically
    if ((i + 1) % CONFIG.batchSize === 0) {
      saveProgress(progress);
      console.log(`\n--- Progress saved at ${i + 1}/${endIndex} ---\n`);
    }

    // Delay before next call (skip delay for cache hits)
    if (i < endIndex - 1 && result?.source !== 'database') {
      await sleep(args.delay);
    }
  }

  // Final save
  saveProgress(progress);

  // Summary
  const elapsedMs = Date.now() - startTime;
  const elapsedMin = Math.round(elapsedMs / 60000);

  console.log('\n========================================');
  console.log('  SEEDING COMPLETE');
  console.log('========================================\n');
  console.log(`Total processed: ${successCount + failCount}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\nLookup sources:`);
  console.log(`  Database (cached): ${cacheHitCount}`);
  console.log(`  AI (new): ${aiCallCount}`);
  console.log(`\nTime elapsed: ${elapsedMin} minutes`);
  console.log(`\nEstimated cost: ~$${(aiCallCount * 0.04).toFixed(2)} - $${(aiCallCount * 0.06).toFixed(2)}`);

  if (failCount > 0) {
    console.log(`\nFailed comics:`);
    progress.failed.forEach(f => console.log(`  - ${f}`));
  }

  console.log(`\nProgress saved to: ${CONFIG.progressFile}`);
  console.log('You can resume by running the script again.\n');
}

// Run the script
seedKeyComics().catch(console.error);
