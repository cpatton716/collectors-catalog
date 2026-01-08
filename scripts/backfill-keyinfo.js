// Backfill Key Info Script
// Run this in your browser console at http://localhost:3000
// It will fetch key info for all comics in your collection that don't have it

(async function backfillKeyInfo() {
  const COLLECTION_KEY = "comic_collection";

  // Get current collection
  const data = localStorage.getItem(COLLECTION_KEY);
  if (!data) {
    console.log("No collection found in localStorage");
    return;
  }

  const collection = JSON.parse(data);
  console.log(`Found ${collection.length} comics in collection`);

  // Filter comics that need key info
  const needsKeyInfo = collection.filter(
    item => !item.comic.keyInfo || item.comic.keyInfo.length === 0
  );

  console.log(`${needsKeyInfo.length} comics need key info backfill`);

  if (needsKeyInfo.length === 0) {
    console.log("All comics already have key info!");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < needsKeyInfo.length; i++) {
    const item = needsKeyInfo[i];
    const { title, issueNumber, publisher } = item.comic;

    if (!title || !issueNumber) {
      console.log(`Skipping: Missing title or issue number`);
      failed++;
      continue;
    }

    console.log(`[${i + 1}/${needsKeyInfo.length}] Looking up: ${title} #${issueNumber}`);

    try {
      const response = await fetch("/api/comic-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          issueNumber,
          lookupType: "full"
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.keyInfo && data.keyInfo.length > 0) {
          // Find and update this item in the full collection
          const collectionIndex = collection.findIndex(c => c.id === item.id);
          if (collectionIndex !== -1) {
            collection[collectionIndex].comic.keyInfo = data.keyInfo;
            updated++;
            console.log(`  Found ${data.keyInfo.length} key facts:`, data.keyInfo);
          }
        } else {
          console.log(`  No key info found (not a key issue)`);
          // Set empty array so we don't re-process
          const collectionIndex = collection.findIndex(c => c.id === item.id);
          if (collectionIndex !== -1) {
            collection[collectionIndex].comic.keyInfo = [];
          }
        }
      } else {
        console.log(`  API error: ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save updated collection
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));

  console.log("\n=== Backfill Complete ===");
  console.log(`Updated: ${updated} comics with key info`);
  console.log(`Failed/Skipped: ${failed}`);
  console.log(`No key info (not key issues): ${needsKeyInfo.length - updated - failed}`);
  console.log("\nRefresh the page to see the changes!");
})();
