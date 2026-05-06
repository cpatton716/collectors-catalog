// Generates PWA splash + icon assets from the Figma source image.
//
// Source: ./Splash Screen (figma).png — full splash design (585x781 portrait,
// blue background with centered logo)
//
// Outputs into public/icons/:
//   - icon-any-192.png         (192x192, logo on transparent bg, app icon)
//   - icon-any-512.png         (512x512, same)
//   - icon-splash-512.png      (512x512, logo on transparent bg, splash icon)
//   - icon-maskable-192.png    (192x192, logo on blue bg with safe-zone padding)
//   - icon-maskable-512.png    (512x512, same)
//   - icon-192x192.png         (192x192, legacy filename in layout.tsx)
//   - icon-512x512.png         (512x512, legacy filename in layout.tsx)
//   - apple-touch-icon.png     (180x180, iOS home-screen icon)
//   - apple-splash-1284-2778.png  (iPhone 12 Pro Max, full splash bitmap)
//   - apple-splash-1170-2532.png  (iPhone 12/13/14 standard, full splash bitmap)
//   - apple-splash-828-1792.png   (iPhone XR/11)
//   - apple-splash-1125-2436.png  (iPhone X/XS/11 Pro)
//   - apple-splash-750-1334.png   (iPhone 6/7/8)
//
// Run: npx tsx scripts/generate-splash-assets.ts

import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("Splash Screen (figma).png");
const OUT_DIR = path.resolve("public/icons");

// Brand splash background — pop-blue from tailwind.config.ts
const BG = { r: 0, g: 102, b: 255, alpha: 1 };

async function trimToLogo(): Promise<Buffer> {
  // Sharp's .trim() removes solid borders. Threshold lets us tolerate the blue
  // background even though it's not perfectly uniform (anti-aliasing edges).
  return await sharp(SOURCE)
    .trim({ background: { r: BG.r, g: BG.g, b: BG.b }, threshold: 30 })
    .png()
    .toBuffer();
}

async function makeIcon(
  logoBuffer: Buffer,
  size: number,
  filename: string,
  options: { background?: typeof BG; padding?: number } = {},
) {
  const { background, padding = 0.15 } = options;
  const innerSize = Math.round(size * (1 - padding * 2));

  // Resize the logo to fit within the inner safe zone, preserving aspect.
  const logo = await sharp(logoBuffer)
    .resize(innerSize, innerSize, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  await canvas
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`  ✓ ${filename} (${size}x${size}${background ? ", maskable bg" : ", transparent"})`);
}

async function makeAppleSplash(width: number, height: number, filename: string) {
  // iOS apple-touch-startup-image needs an exact-size bitmap matching the
  // device viewport. We render a solid-blue canvas with the logo centered
  // at ~40% of the shorter dimension (visually balanced on portrait phones).
  const logoSize = Math.round(Math.min(width, height) * 0.4);
  const logo = await sharp(await trimToLogo())
    .resize(logoSize, logoSize, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`  ✓ ${filename} (${width}x${height})`);
}

async function main() {
  console.log("Generating splash + icon assets...\n");

  console.log("Step 1: trim logo from Figma source");
  const logoBuffer = await trimToLogo();
  const trimmedMeta = await sharp(logoBuffer).metadata();
  console.log(`  trimmed logo: ${trimmedMeta.width}x${trimmedMeta.height}\n`);

  console.log("Step 2: app icons (transparent bg, logo only)");
  await makeIcon(logoBuffer, 192, "icon-any-192.png");
  await makeIcon(logoBuffer, 512, "icon-any-512.png");
  await makeIcon(logoBuffer, 512, "icon-splash-512.png");
  await makeIcon(logoBuffer, 192, "icon-192x192.png");
  await makeIcon(logoBuffer, 512, "icon-512x512.png");
  await makeIcon(logoBuffer, 180, "apple-touch-icon.png");

  console.log("\nStep 3: maskable icons (blue bg + 15% safe-zone padding)");
  await makeIcon(logoBuffer, 192, "icon-maskable-192.png", { background: BG, padding: 0.2 });
  await makeIcon(logoBuffer, 512, "icon-maskable-512.png", { background: BG, padding: 0.2 });

  console.log("\nStep 4: iOS apple-touch-startup-image variants");
  // Major iPhone form factors (portrait). Source is small (585x781) so
  // we're upscaling the logo — accept some softness; the alternative is
  // no iOS splash at all (white screen on tap-to-open).
  await makeAppleSplash(1284, 2778, "apple-splash-1284-2778.png"); // iPhone 12/13/14 Pro Max
  await makeAppleSplash(1170, 2532, "apple-splash-1170-2532.png"); // iPhone 12/13/14
  await makeAppleSplash(828, 1792, "apple-splash-828-1792.png");   // iPhone XR/11
  await makeAppleSplash(1125, 2436, "apple-splash-1125-2436.png"); // iPhone X/XS/11 Pro
  await makeAppleSplash(750, 1334, "apple-splash-750-1334.png");   // iPhone 6/7/8

  console.log("\n✓ Done. Background color: rgb(0,102,255) = #0066FF (pop-blue)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
