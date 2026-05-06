// Generates iPhone PWA splash images from the canonical brand source.
//
// Source: ./Collectors Chest Splash.png — 2732 × 2732 square (Capacitor
// `capacitor-assets` standard). Logo + branding centered inside a generous
// safe zone so center-cropping to portrait device dimensions doesn't clip
// the logo.
//
// Approach: center-crop (Sharp's `fit: "cover"`) the square source into each
// portrait device's exact viewport dimensions. iOS expects apple-touch-startup-
// image bitmaps at exact device dimensions; the safe-zone padding in the
// source means the cropped strips are blue-only and the logo stays intact.
//
// Outputs:
//   - apple-splash-1284-2778.png  (iPhone 12/13/14 Pro Max)
//   - apple-splash-1170-2532.png  (iPhone 12/13/14 standard)
//   - apple-splash-828-1792.png   (iPhone XR/11)
//   - apple-splash-1125-2436.png  (iPhone X/XS/11 Pro)
//   - apple-splash-750-1334.png   (iPhone 6/7/8)
//   - icon-maskable-512.png       (Android splash + adaptive launcher icon)
//   - icon-maskable-192.png       (Android adaptive launcher icon, smaller)
//
// Why maskable icons are also regenerated: Android Chrome PWA uses the
// maskable icon for BOTH the home-screen adaptive launcher AND the splash
// (centered on manifest.background_color). Using the brand splash source
// means the splash appears as a full-bleed brand image (the icon's blue
// blends with the splash bg), and the home-screen launcher applies its
// rounded-square mask to show the central treasure-chest logo. The source
// PNG is designed with safe-zone padding so the launcher mask doesn't clip
// meaningful content.
//
// NOT touched (per user instruction): apple-touch-icon.png (iOS launcher
// stays original), icon-any-*, icon-192x192.png, icon-512x512.png,
// icon-splash-512.png.
//
// Native iOS / Android handoff: when Capacitor ships, point
// `capacitor-assets` at the same 2732 × 2732 source — that tooling generates
// all native-shell variants (multi-density Android buckets, iOS @2x/@3x).
//
// Run: npx tsx scripts/generate-splash-assets.ts

import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("Collectors Chest Splash.png");
const OUT_DIR = path.resolve("public/icons");

async function makeAppleSplash(width: number, height: number, filename: string) {
  // `fit: "cover"` scales the source so it fills both target dimensions, then
  // crops the overflow. With a square source + portrait target, the height
  // becomes the binding constraint and equal margins are cropped from the
  // left/right of the source. Logo (centered with safe-zone padding) stays
  // intact.
  await sharp(SOURCE)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`  ✓ ${filename} (${width}x${height}, center-cropped from 2732×2732)`);
}

async function makeMaskableIcon(size: number, filename: string) {
  // Square source → square output. Just resize. No crop, no fit-inside,
  // no canvas composite. The full source (logo + safe-zone padding) ends
  // up at the target size; Android's adaptive-icon mask shows the central
  // ~80% on the home-screen launcher, the unmasked full image renders on
  // the splash centered atop manifest.background_color (also brand blue).
  await sharp(SOURCE)
    .resize(size, size, { fit: "fill" })
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`  ✓ ${filename} (${size}x${size}, resized from 2732×2732 source)`);
}

async function main() {
  console.log("Generating iPhone splash assets from Collectors Chest Splash.png...\n");

  // iPhone PWA splash — apple-touch-startup-image variants
  await makeAppleSplash(1284, 2778, "apple-splash-1284-2778.png"); // iPhone 12/13/14 Pro Max
  await makeAppleSplash(1170, 2532, "apple-splash-1170-2532.png"); // iPhone 12/13/14 standard
  await makeAppleSplash(828, 1792, "apple-splash-828-1792.png");   // iPhone XR/11
  await makeAppleSplash(1125, 2436, "apple-splash-1125-2436.png"); // iPhone X/XS/11 Pro
  await makeAppleSplash(750, 1334, "apple-splash-750-1334.png");   // iPhone 6/7/8

  // Android maskable (adaptive launcher icon + auto-generated splash icon)
  await makeMaskableIcon(512, "icon-maskable-512.png");
  await makeMaskableIcon(192, "icon-maskable-192.png");

  console.log("\n✓ Done.");
  console.log("  iOS apple-touch-icon NOT touched.");
  console.log("  icon-any-*, icon-splash-*, icon-{192x192,512x512}.png NOT touched.");
  console.log("  Native iOS/Android: same source feeds capacitor-assets when shipping.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
