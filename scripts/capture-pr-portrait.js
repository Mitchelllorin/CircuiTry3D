#!/usr/bin/env node
/**
 * Captures portrait-mode screenshots of the app for PR review.
 *
 * CircuiTry3D was designed and built in portrait orientation.
 * These screenshots are attached to every PR as workflow artifacts so the
 * owner can evaluate changes at a glance in the canonical portrait viewport.
 *
 * Viewport: 412 × 915 px  (Android phone portrait — primary design target)
 *
 * Usage (called by .github/workflows/pr-preview.yml):
 *   node scripts/capture-pr-portrait.js [--base-url <url>]
 *
 * Defaults to http://localhost:4173 (Vite preview server).
 * Pass --base-url https://... to target a live deployment.
 *
 * Outputs:
 *   pr-portrait-screenshots/landing.png    – home / landing page
 *   pr-portrait-screenshots/builder.png   – circuit builder (/app route)
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const OUTPUT_DIR = join(ROOT, 'pr-portrait-screenshots');

// Portrait phone — Android primary design target
const VIEWPORT = { width: 412, height: 915 };

const baseUrlArg = process.argv.indexOf('--base-url');
const BASE_URL   = baseUrlArg !== -1 ? process.argv[baseUrlArg + 1] : 'http://localhost:4173';

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'builder', path: '/#/app' },
];

async function main() {
  console.log(`\n📱  Capturing portrait screenshots (${VIEWPORT.width}×${VIEWPORT.height}) from ${BASE_URL}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    console.error('❌  Could not launch Chromium.\n   Run: npx playwright install chromium');
    throw err;
  });

  for (const { name, path } of PAGES) {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);

    let navigated = false;
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(1500); // allow 3D/WebGL content to settle
      navigated = true;
    } catch (err) {
      console.warn(`  ⚠  Could not load ${BASE_URL}${path}: ${err.message}`);
      console.warn(`     Writing fallback placeholder.`);
    }

    if (!navigated) {
      await page.close();
      const fallback = await browser.newPage();
      await fallback.setViewportSize(VIEWPORT);
      await fallback.setContent(makeFallbackHtml(name, path));
      await fallback.waitForTimeout(300);
      const png = await fallback.screenshot({ type: 'png', fullPage: false });
      await writeFile(join(OUTPUT_DIR, `${name}.png`), png);
      console.log(`  ✓  ${name}.png  (fallback placeholder)`);
      await fallback.close();
      continue;
    }

    const png = await page.screenshot({ type: 'png', fullPage: false });
    await writeFile(join(OUTPUT_DIR, `${name}.png`), png);
    console.log(`  ✓  ${name}.png  (${VIEWPORT.width}×${VIEWPORT.height})`);
    await page.close();
  }

  await browser.close();

  console.log(`\n✅  Portrait screenshots saved to pr-portrait-screenshots/\n`);
  console.log('   landing.png  – home / landing page');
  console.log('   builder.png  – circuit builder (/app)\n');
}

function makeFallbackHtml(name, path) {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: ${VIEWPORT.width}px; height: ${VIEWPORT.height}px;
      background: #0f172a; color: #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    }
    .card {
      background: #1e293b; border: 1px solid #334155;
      border-radius: 24px; padding: 2rem; text-align: center; max-width: 340px;
    }
    .logo { font-size: 3rem; margin-bottom: 0.75rem; }
    h1 { font-size: 1.8rem; font-weight: 800; color: #3b82f6; margin-bottom: 0.4rem; }
    .sub { font-size: 0.95rem; color: #94a3b8; margin-bottom: 1rem; }
    .spec { font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡</div>
    <h1>CircuiTry3D</h1>
    <p class="sub">3D Interactive Electric Circuit Builder</p>
    <p class="spec">${name} — ${path}<br/>${VIEWPORT.width} × ${VIEWPORT.height} px · Portrait</p>
  </div>
</body>
</html>`;
}

main().catch((err) => {
  console.error('❌  Portrait screenshot capture failed:', err);
  process.exit(1);
});
