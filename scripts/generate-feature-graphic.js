#!/usr/bin/env node
/**
 * Generates the Play Store feature graphic (1024×500 px) for CircuiTry3D.
 *
 * The graphic embeds public/circuit-logo.svg directly in the right panel.
 *
 * Left panel shows the CircuiTry3D brand name with its signature letter colors
 * (Circui = blue, T = orange, ry = blue, 3D = green) and the "Illuminate Electricity" tagline.
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
const LOGO_SVG_PATH = join(ROOT, 'public', 'circuit-logo.svg');
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
 * Build the full HTML page that Playwright will render.
 */
function makeHtml(svgInner) {
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
  <defs>

    <!-- Background: very slightly lighter on the circuit side -->
    <linearGradient id="fg-bgGrad" x1="0" y1="0" x2="${W}" y2="0"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0"    stop-color="#0f172a"/>
      <stop offset="0.34" stop-color="#0f172a"/>
      <stop offset="1"    stop-color="#0c1422"/>
    </linearGradient>

    <!-- Grid (matches app workspace style) -->
    <pattern id="fg-fineGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111927" stroke-width="0.5"/>
    </pattern>
    <pattern id="fg-coarseGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="url(#fg-fineGrid)"/>
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#15202e" stroke-width="1"/>
    </pattern>

    <!-- Title text glow -->
    <filter id="fg-titleGlow">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

  </defs>

  <!-- ── Background ── -->
  <rect width="${W}" height="${H}" fill="url(#fg-bgGrad)"/>
  <rect width="${W}" height="${H}" fill="url(#fg-coarseGrid)" opacity="0.55"/>

  <!-- ── Panel separator ── -->
  <line x1="350" y1="18" x2="350" y2="482"
        stroke="#1e3a5f" stroke-width="1.5" opacity="0.55"/>


  <!-- ═══════════════════════════════════════════════════════════
       LEFT PANEL  (x: 0 – 350)  –  CircuiTry3D brand
       ═══════════════════════════════════════════════════════════ -->

  <!-- Brand name "CircuiTry3D" centred at x=175 -->
  <text x="175" y="220"
        font-family="'Inter','Segoe UI',Arial,Helvetica,sans-serif"
        font-size="52" font-weight="900"
        text-anchor="middle"
        filter="url(#fg-titleGlow)">
    <tspan fill="#3b82f6">Circui</tspan><tspan fill="#f97316">T</tspan><tspan
           fill="#3b82f6">ry</tspan><tspan fill="#22c55e">3D</tspan>
  </text>

  <!-- Tagline -->
  <text x="175" y="258"
        font-family="'Inter','Segoe UI',Arial,Helvetica,sans-serif"
        font-size="17" font-weight="500" letter-spacing="2"
        text-anchor="middle" fill="#94a3b8">Illuminate Electricity</text>

  <!-- Sub-tagline -->
  <text x="175" y="282"
        font-family="'Inter','Segoe UI',Arial,Helvetica,sans-serif"
        font-size="12.5" font-weight="400" letter-spacing="0.4"
        text-anchor="middle" fill="#64748b"
        >Visualize current flow down to the atom</text>

  <!-- Thin rule -->
  <line x1="82" y1="300" x2="268" y2="300"
        stroke="#1e3a5f" stroke-width="1"/>

  <!-- Caps sub-brand -->
  <text x="175" y="318"
        font-family="'Inter','Segoe UI',Arial,Helvetica,sans-serif"
        font-size="10.5" font-weight="600" letter-spacing="3"
        text-anchor="middle" fill="#475569">3D · INTERACTIVE · PHYSICS</text>


  <!-- ═══════════════════════════════════════════════════════════
       RIGHT PANEL  (x: 350 – 1024)  –  Circuit logo

       circuit-logo.svg has viewBox="0 0 300 300".
       Rendered at width=400, height=400 positioned at x=480, y=50.
       Scale = 4/3.  Outer coord = (480 + x_i·4/3 ,  50 + y_i·4/3).
       ═══════════════════════════════════════════════════════════ -->

  <!-- Embedded circuit logo (uses its own internal defs / animations) -->
  <svg x="480" y="50" width="400" height="400" viewBox="0 0 300 300"
       xmlns="http://www.w3.org/2000/svg">
    ${svgInner}
  </svg>

</svg>
</body>
</html>`;
}

async function main() {
  console.log('🎨 Generating Play Store feature graphic (1024×500)…');

  const svgRaw   = await readFile(LOGO_SVG_PATH, 'utf8');
  const svgInner = extractSvgInner(svgRaw);

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
