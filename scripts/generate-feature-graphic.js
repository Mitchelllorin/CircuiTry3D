#!/usr/bin/env node
/**
 * Generates the Play Store feature graphic (1024×500 px) for CircuiTry3D.
 *
 * The graphic displays the app icon (public/app-icon.svg) centred on the
 * canvas, without the "CT3D" text overlay, so the feature graphic matches
 * the icon and landing-page logo exactly.
 *
 * Uses Playwright (already in devDependencies) to render the HTML+SVG to PNG.
 *
 * Usage:
 *   node scripts/generate-feature-graphic.js
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const ROOT          = join(__dirname, '..');
const ICON_SVG_PATH = join(ROOT, 'public', 'app-icon.svg');
const OUT           = join(ROOT, 'play-store-assets', 'graphics', 'feature-graphic.png');
// Also written to public/assets/ so Vite / Vercel serves it and the landing
// page "Download feature graphic" link always reflects the latest render.
const OUT_PUBLIC    = join(ROOT, 'public', 'assets', 'feature-graphic.png');

const W = 1024, H = 500;

/**
 * Strip the outer <svg …> wrapper and return only the inner content so it can
 * be embedded inside a nested <svg> element.
 */
function extractSvgInner(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

/**
 * Remove the CT3D letter text elements from the SVG inner content so the
 * feature graphic shows the circuit design only, without the text overlay.
 *
 * Depends on: the three <text> elements in app-icon.svg carrying
 * class="ct3d-letter". If that class name ever changes this function must be
 * updated to match.
 */
function removeCt3dText(svgInner) {
  const result = svgInner.replace(/<text[^>]*class="ct3d-letter"[^>]*>[\s\S]*?<\/text>/g, '');
  if (result === svgInner) {
    console.warn('⚠️  removeCt3dText: no ct3d-letter elements found — check app-icon.svg class names');
  }
  return result;
}

/**
 * Build the full HTML page that Playwright will render.
 * The icon (app-icon.svg, 512×512 viewBox) is centred on the 1024×500 canvas.
 */
function makeHtml(svgInner) {
  // Scale the icon to fill the canvas height with a small margin.
  const iconSize = H - 20; // 480 px
  const iconX = Math.round((W - iconSize) / 2); // 272
  const iconY = Math.round((H - iconSize) / 2); // 10

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
    body { background: #0f172a; }
  </style>
</head>
<body>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg">

  <!-- ── Background ── -->
  <rect width="${W}" height="${H}" fill="#0f172a"/>

  <!-- ── App icon centred on canvas (CT3D text removed) ── -->
  <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}"
       viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    ${svgInner}
  </svg>

</svg>
</body>
</html>`;
}

async function main() {
  console.log('🎨 Generating Play Store feature graphic (1024×500)…');

  const svgRaw   = await readFile(ICON_SVG_PATH, 'utf8');
  const svgInner = removeCt3dText(extractSvgInner(svgRaw));

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    console.error('❌ Could not launch Chromium. Run: npx playwright install chromium');
    throw err;
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(makeHtml(svgInner));

  // Wait for network (font loading) and then pause SVG animations at a
  // mid-flow moment so the photon particles appear along the circuit path.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    document.querySelectorAll('svg').forEach((svg) => {
      try {
        svg.pauseAnimations();
        svg.setCurrentTime(0.9); // ~26% through the 3.4s cycle → photons in motion
      } catch { /* non-animatable SVG roots are silently skipped */ }
    });
  });
  await page.waitForTimeout(150); // allow filters / gradients to paint

  await mkdir(join(ROOT, 'play-store-assets', 'graphics'), { recursive: true });
  await mkdir(join(ROOT, 'public', 'assets'), { recursive: true });
  const png = await page.screenshot({ type: 'png', fullPage: false });
  await writeFile(OUT, png);
  await writeFile(OUT_PUBLIC, png);

  await browser.close();

  console.log('✅ Feature graphic saved:\n   play-store-assets/graphics/feature-graphic.png\n   public/assets/feature-graphic.png  (served at /assets/feature-graphic.png)');
}

main().catch((err) => {
  console.error('❌ Feature graphic generation failed:', err);
  process.exit(1);
});
