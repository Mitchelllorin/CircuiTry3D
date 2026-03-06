#!/usr/bin/env node
/**
 * Generates the Play Store feature graphic (1024×500 px) for CircuiTry3D.
 *
 * The graphic embeds public/circuit-logo.svg directly in the right panel and
 * overlays a "high-current" treatment on R2 (the right-side vertical resistor):
 *   • Extra-bright gold glow on the R2 zigzag
 *   • Hot photon particles placed along R2's zigzag path
 *   • A "HIGH I ⚡" callout annotation
 *
 * Left panel shows the CircuiTry3D brand name with its signature letter colors
 * (C = blue, T = orange, 3D = green) and the "Illuminate Electricity" tagline.
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
 *
 * Circuit-logo layout (300×300 viewBox, scaled to 400×400 at x=480, y=50):
 *   scale = 400/300 = 1.333…
 *   Inner coord (x_i, y_i) → outer coord (480 + x_i·4/3, 50 + y_i·4/3)
 *
 * R2 (right vertical resistor) in the circuit-logo 300×300 space:
 *   Centre: (235, 149).  Junctions: top (235, 107), bottom (235, 191).
 *   Zigzag (after transform="translate(235,149) rotate(90)"):
 *     inner global path ≈ (235,191)→(235,179)→(222,171)→(248,159)
 *                          →(222,147)→(248,135)→(235,127)→(235,107)
 *   Outer SVG path (×4/3 + offset):
 *     "793,305 793,289 776,278 811,262 776,246 811,230 793,219 793,193"
 */
function makeHtml(svgInner) {
  // Pre-computed R2 zigzag points in outer (1024×500) coordinate space.
  const r2Outer = '793,305 793,289 776,278 811,262 776,246 811,230 793,219 793,193';

  // Photon particles placed exactly at each vertex of R2's zigzag path.
  const r2Photons = [
    { cx: 793, cy: 302, r: 5.5 },   // near bottom junction
    { cx: 776, cy: 278, r: 5   },   // left peak 1
    { cx: 811, cy: 262, r: 5.5 },   // right peak 1
    { cx: 776, cy: 246, r: 5   },   // left peak 2
    { cx: 811, cy: 230, r: 5.5 },   // right peak 2
    { cx: 793, cy: 197, r: 5   },   // near top junction
  ];

  const photonCircles = r2Photons
    .map(({ cx, cy, r }) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#fg-hotPhoton)" filter="url(#fg-brightPhotonGlow)" opacity="0.95"/>`)
    .join('\n    ');

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

    <!-- Glow for the R2 high-current overlay polyline -->
    <filter id="fg-r2HighGlow" x="-200%" y="-80%" width="500%" height="260%">
      <feGaussianBlur stdDeviation="11" result="big"/>
      <feGaussianBlur stdDeviation="4"  result="med" in="SourceGraphic"/>
      <feMerge>
        <feMergeNode in="big"/>
        <feMergeNode in="med"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Glow for hot photon particles (high-current branch) -->
    <filter id="fg-brightPhotonGlow" x="-300%" y="-300%" width="700%" height="700%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Title text glow -->
    <filter id="fg-titleGlow">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Callout text glow -->
    <filter id="fg-calloutGlow" x="-40%" y="-100%" width="180%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Hot photon fill: white core → warm gold rim -->
    <radialGradient id="fg-hotPhoton" cx="35%" cy="35%" r="80%">
      <stop offset="0%"   stop-color="#ffffff"/>
      <stop offset="45%"  stop-color="#fff7d0"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </radialGradient>

    <!-- Current-direction arrowhead (gold) -->
    <marker id="fg-arrowGold"
            markerWidth="7" markerHeight="5" refX="6" refY="2.5"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L0,5 L7,2.5 Z" fill="#ffd700" opacity="0.9"/>
    </marker>

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
    <tspan fill="#3b82f6">C</tspan><tspan fill="#cbd5e1">ircu</tspan><tspan
           fill="#cbd5e1">i</tspan><tspan fill="#f97316">T</tspan><tspan
           fill="#cbd5e1">ry</tspan><tspan fill="#22c55e">3D</tspan>
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
       RIGHT PANEL  (x: 350 – 1024)  –  Circuit logo + high-current overlay

       circuit-logo.svg has viewBox="0 0 300 300".
       Rendered at width=400, height=400 positioned at x=480, y=50.
       Scale = 4/3.  Outer coord = (480 + x_i·4/3 ,  50 + y_i·4/3).
       ═══════════════════════════════════════════════════════════ -->

  <!-- Embedded circuit logo (uses its own internal defs / animations) -->
  <svg x="480" y="50" width="400" height="400" viewBox="0 0 300 300"
       xmlns="http://www.w3.org/2000/svg">
    ${svgInner}
  </svg>

  <!-- ── HIGH-CURRENT overlay on R2 (drawn in outer 1024×500 space) ──
       R2 zigzag outer points: ${r2Outer}                              -->

  <!-- Bright gold re-draw of R2 zigzag with intense glow -->
  <polyline
    points="${r2Outer}"
    fill="none"
    stroke="#ffd700"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#fg-r2HighGlow)"
    opacity="0.88"/>

  <!-- Hot photon particles along R2's zigzag -->
  ${photonCircles}

  <!-- ── HIGH I callout to the right of R2 ── -->
  <!-- lightning bolt -->
  <text x="818" y="239"
        font-family="system-ui,sans-serif"
        font-size="16" fill="#ffd700"
        text-anchor="start"
        filter="url(#fg-calloutGlow)"
        opacity="0.95">⚡</text>

  <!-- label text -->
  <text x="835" y="240"
        font-family="'Inter','Segoe UI',Arial,Helvetica,sans-serif"
        font-size="13" font-weight="700" letter-spacing="0.5"
        fill="#ffd700" text-anchor="start"
        stroke="#050b1f" stroke-width="1.2" paint-order="stroke fill"
        filter="url(#fg-calloutGlow)"
        opacity="0.95">HIGH I</text>

  <!-- downward current-direction arrow alongside R2 -->
  <line x1="831" y1="210" x2="831" y2="268"
        stroke="#ffd700" stroke-width="2"
        marker-end="url(#fg-arrowGold)"
        opacity="0.75"/>

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
