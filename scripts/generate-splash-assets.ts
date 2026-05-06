// Generates iPhone PWA splash images from the Figma source.
//
// Source: ./Splash Screen (figma).png — full splash design with the logo
// already positioned + sized as designed. We use it AS-IS (no trim, no crop)
// and fit it onto each device-specific canvas with brand-blue letterboxing
// where aspect ratios don't match.
//
// Outputs (only iPhone apple-touch-startup-image variants — no app icons):
//   - apple-splash-1284-2778.png  (iPhone 12/13/14 Pro Max)
//   - apple-splash-1170-2532.png  (iPhone 12/13/14 standard)
//   - apple-splash-828-1792.png   (iPhone XR/11)
//   - apple-splash-1125-2436.png  (iPhone X/XS/11 Pro)
//   - apple-splash-750-1334.png   (iPhone 6/7/8)
//
// Run: npx tsx scripts/generate-splash-assets.ts
//
// IMPORTANT: This script does NOT touch app icons. The Figma source is for
// the SPLASH SCREEN only. Icons under public/icons/ remain untouched.

import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("Splash Screen (figma).png");
const OUT_DIR = path.resolve("public/icons");

// Brand splash background — pop-blue from tailwind.config.ts. Used to letterbox
// where the source aspect ratio doesn't match the target device.
const BG = { r: 0, g: 102, b: 255, alpha: 1 };

async function makeAppleSplash(width: number, height: number, filename: string) {
  // Use the source image AS-IS — preserve the Figma-designed logo size and
  // position. Sharp's `fit: "inside"` scales the source to fit within the
  // target dimensions while preserving aspect ratio; the canvas's blue
  // background fills the letterbox.
  const fitted = await sharp(SOURCE)
    .resize(width, height, {
      fit: "inside",
      background: BG,
    })
    .toBuffer();
  const meta = await sharp(fitted).metadata();

  // After fit:inside the buffer dimensions are <= target. Composite onto a
  // brand-blue canvas at the target size, centered, so the final file is
  // exactly width × height (which iOS expects for an apple-touch-startup-image).
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: fitted,
        gravity: "center",
      },
    ])
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`  ✓ ${filename} (${width}x${height}, fitted source ${meta.width}x${meta.height})`);
}

async function main() {
  console.log("Generating iPhone splash assets from source AS-IS...\n");

  // Major iPhone form factors (portrait orientation). The source's logo
  // size + position are preserved at the Figma proportions; brand-blue
  // letterboxing fills any aspect-ratio gap.
  await makeAppleSplash(1284, 2778, "apple-splash-1284-2778.png"); // iPhone 12/13/14 Pro Max
  await makeAppleSplash(1170, 2532, "apple-splash-1170-2532.png"); // iPhone 12/13/14 standard
  await makeAppleSplash(828, 1792, "apple-splash-828-1792.png");   // iPhone XR/11
  await makeAppleSplash(1125, 2436, "apple-splash-1125-2436.png"); // iPhone X/XS/11 Pro
  await makeAppleSplash(750, 1334, "apple-splash-750-1334.png");   // iPhone 6/7/8

  console.log("\n✓ Done. Source preserved as-is; brand-blue letterbox where needed.");
  console.log("  App icons NOT touched (those live under public/icons/icon-*).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
