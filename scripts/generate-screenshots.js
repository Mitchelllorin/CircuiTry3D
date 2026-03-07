#!/usr/bin/env node
/**
 * Generates Play Store screenshots for every required device category:
 *   • Phone (portrait)        – existing spec, regenerated for consistency
 *   • 7-inch tablet (portrait)
 *   • 10-inch tablet (landscape)
 *   • Chromebook (landscape)
 *   • Android XR (landscape)
 *
 * Google Play Console minimum dimensions (2025):
 *   Phone         – 320 – 3840 px, 9:16 aspect ratio (min 1080×1920 recommended)
 *   7-inch tablet – min 1024×600 px  (portrait or landscape)
 *   10-inch tablet– min 1200×800 px  (landscape or portrait)
 *   Chromebook    – min 1920×1080 px landscape only
 *   Android XR    – min 1920×1080 px landscape only
 *
 * Screenshots are captured from the live production site at SITE_URL, or from
 * a local Vite preview server when the --local flag is passed.
 *
 * Usage:
 *   node scripts/generate-screenshots.js           # production site
 *   node scripts/generate-screenshots.js --local   # http://localhost:4173
 *
 * Outputs:
 *   play-store-assets/screenshots/<device>-screenshot-<n>.png
 *   public/screenshots/<device>-screenshot-<n>.png   ← served for download links
 */

import { chromium } from 'playwright';
import { writeFile, mkdir, copyFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const SITE_URL    = 'https://circuitry3d.app';
const LOCAL_URL   = 'http://localhost:4173';
const USE_LOCAL   = process.argv.includes('--local');
const BASE_URL    = USE_LOCAL ? LOCAL_URL : SITE_URL;

const SCREENSHOTS_ASSET_DIR  = join(ROOT, 'play-store-assets', 'screenshots');
const SCREENSHOTS_PUBLIC_DIR = join(ROOT, 'public', 'screenshots');

/**
 * Device specs for Google Play Console.
 *
 * Each entry captures `count` screenshots by navigating to the listed `paths`.
 * `label` is used in console output; `id` drives the output filename prefix.
 */
const DEVICE_SPECS = [
  {
    id: 'phone',
    label: 'Phone (Portrait 1080×1920)',
    width: 1080,
    height: 1920,
    paths: ['/', '/#/app', '/#/practice', '/#/pricing'],
    playConsoleField: 'Store listing → Phone screenshots',
    requirement: '1080×1920 px · Portrait · 9:16 aspect ratio',
  },
  {
    id: '7in-tablet',
    label: '7-inch Tablet (Portrait 1200×1920)',
    width: 1200,
    height: 1920,
    paths: ['/', '/#/app'],
    playConsoleField: 'Store listing → 7-inch tablet screenshots',
    requirement: 'min 1024×600 px · 7-inch tablet',
  },
  {
    id: '10in-tablet',
    label: '10-inch Tablet (Landscape 1920×1200)',
    width: 1920,
    height: 1200,
    paths: ['/', '/#/app'],
    playConsoleField: 'Store listing → 10-inch tablet screenshots',
    requirement: 'min 1200×800 px · 10-inch tablet · landscape',
  },
  {
    id: 'chromebook',
    label: 'Chromebook (Landscape 1920×1080)',
    width: 1920,
    height: 1080,
    paths: ['/', '/#/app'],
    playConsoleField: 'Store listing → Chromebook screenshots',
    requirement: 'min 1920×1080 px · landscape only',
  },
  {
    id: 'android-xr',
    label: 'Android XR (Landscape 1920×1080)',
    width: 1920,
    height: 1080,
    paths: ['/', '/#/app'],
    playConsoleField: 'Store listing → Android XR screenshots',
    requirement: 'min 1920×1080 px · landscape only',
  },
];

async function main() {
  console.log(`\n📸  Generating Play Store screenshots from ${BASE_URL}\n`);

  await mkdir(SCREENSHOTS_ASSET_DIR,  { recursive: true });
  await mkdir(SCREENSHOTS_PUBLIC_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    console.error('❌  Could not launch Chromium.\n   1. Ensure devDependencies are installed: npm install\n   2. Then install the browser:            npx playwright install chromium');
    throw err;
  });

  const generatedFiles = [];

  for (const spec of DEVICE_SPECS) {
    console.log(`  📱  ${spec.label}`);
    let page = await browser.newPage();
    await page.setViewportSize({ width: spec.width, height: spec.height });

    for (let i = 0; i < spec.paths.length; i++) {
      const appPath  = spec.paths[i];
      const index = i + 1;
      const filename = `${spec.id}-screenshot-${index}.png`;

      let navigated = false;
      try {
        await page.goto(`${BASE_URL}${appPath}`, {
          waitUntil: 'networkidle',
          timeout: 30_000,
        });
        // Extra settle time for 3D/WebGL canvas content
        await page.waitForTimeout(1200);
        navigated = true;
      } catch (err) {
        console.warn(`     ⚠  Could not load ${BASE_URL}${appPath}: ${err.message}`);
        console.warn(`        Falling back to a blank placeholder screenshot.`);
      }

      // If navigation failed, re-create the page to get a clean context
      // before calling setContent() — avoids "execution context destroyed"
      // errors that occur when setContent is called on a page that had a
      // failed navigation.
      if (!navigated) {
        await page.close();
        page = await browser.newPage();
        await page.setViewportSize({ width: spec.width, height: spec.height });
        await page.setContent(makeFallbackHtml(spec, appPath));
        await page.waitForTimeout(300);
      }

      const png = await page.screenshot({ type: 'png', fullPage: false });

      const assetPath  = join(SCREENSHOTS_ASSET_DIR,  filename);
      const publicPath = join(SCREENSHOTS_PUBLIC_DIR, filename);

      await writeFile(assetPath, png);
      await copyFile(assetPath, publicPath);

      generatedFiles.push({ spec, filename, appPath });
      console.log(`     ✓  ${filename}  (${spec.width}×${spec.height})`);
    }

    await page.close();
  }

  await browser.close();

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n✅  Screenshots generated:\n');
  const grouped = {};
  for (const { spec, filename } of generatedFiles) {
    (grouped[spec.label] ??= []).push(filename);
  }
  for (const [label, files] of Object.entries(grouped)) {
    const spec = DEVICE_SPECS.find((s) => s.label === label);
    console.log(`  ${label}`);
    console.log(`    Play Console: ${spec.playConsoleField}`);
    console.log(`    Requirement:  ${spec.requirement}`);
    for (const f of files) {
      console.log(`    play-store-assets/screenshots/${f}`);
      console.log(`    public/screenshots/${f}          (download URL: /screenshots/${f})`);
    }
    console.log('');
  }

  console.log('Upload instructions:');
  console.log('  1. Open https://play.google.com/console → your app → Store listing');
  console.log('  2. Scroll to "Phone screenshots" / "Tablet screenshots" etc.');
  console.log('  3. Drag and drop (or click Add) the corresponding PNG files.');
  console.log('  4. Save draft and submit for review.\n');
}

/**
 * Simple dark-themed fallback page used when the live site is unreachable.
 * Shows the device spec so the screenshot is still identifiable.
 */
function makeFallbackHtml(spec, path) {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: ${spec.width}px; height: ${spec.height}px;
      background: #0f172a; color: #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    }
    .card {
      background: #1e293b; border: 1px solid #334155;
      border-radius: 24px; padding: 2.5rem 3rem; text-align: center;
      max-width: 640px;
    }
    .logo { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { font-size: 2.2rem; font-weight: 800; color: #3b82f6; margin-bottom: 0.5rem; }
    .sub { font-size: 1.1rem; color: #94a3b8; margin-bottom: 1.5rem; }
    .spec { font-size: 0.95rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡</div>
    <h1>CircuiTry3D</h1>
    <p class="sub">3D Interactive Electric Circuit Builder</p>
    <p class="spec">${spec.label}<br/>${spec.width} × ${spec.height} px — ${path}</p>
  </div>
</body>
</html>`;
}

main().catch((err) => {
  console.error('❌  Screenshot generation failed:', err);
  process.exit(1);
});
