#!/usr/bin/env node
/**
 * generate-play-store-screenshots.js
 *
 * Generates Play Store screenshots for CircuiTry3D using Playwright.
 * Inlines the SVG circuit and CT3D branding directly into each screenshot
 * so there are no orientation-media-query issues in headless mode.
 *
 * Usage:  node generate-play-store-screenshots.js
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Shared SVG circuit (the exact series circuit from the landing-page logo) ──
const CIRCUIT_SVG = `
<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="CT3D Series Circuit" style="width:100%;height:auto;display:block;">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="photonFill" cx="35%" cy="35%" r="80%">
      <stop offset="0%"   style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="46%"  style="stop-color:#e8fffb;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#00ff88;stop-opacity:1"/>
    </radialGradient>
    <filter id="photonGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3.0" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -3.5" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <path id="photonPath"
      d="M55 110 L55 20 L100 20
         L110 20 L118 20 L123 10 L133 30 L143 10 L153 30 L158 20
         L170 20 L210 20 L210 45 L210 53
         L220 58 L200 68 L220 78 L200 88
         L210 93 L210 95 L210 110
         L180 110 L175 110
         L118 110 L123 100 L133 120 L143 100 L153 120 L158 110
         L100 110 L55 110"/>
  </defs>
  <!-- Green wires -->
  <g stroke="#00ff88" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="55" y1="20"  x2="55" y2="56"  stroke="#00ff88" stroke-width="1.75"/>
    <line x1="55" y1="74"  x2="55" y2="110" stroke="#00ff88" stroke-width="1.75"/>
    <line x1="55" y1="20"  x2="110" y2="20" stroke="#00ff88" stroke-width="1.75"/>
    <!-- R1 orange zigzag resistor (top) -->
    <g transform="translate(140,20)" stroke="#ff8844" stroke-width="2.5" filter="url(#glow)">
      <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0"/>
    </g>
    <line x1="170" y1="20"  x2="210" y2="20"  stroke="#00ff88" stroke-width="1.75"/>
    <line x1="210" y1="20"  x2="210" y2="45"  stroke="#00ff88" stroke-width="1.75"/>
    <!-- R2 orange zigzag resistor (right, vertical) -->
    <g transform="translate(210,75) rotate(90)" stroke="#ff8844" stroke-width="2.5" filter="url(#glow)">
      <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0"/>
    </g>
    <line x1="210" y1="105" x2="210" y2="110" stroke="#00ff88" stroke-width="1.75"/>
    <line x1="210" y1="110" x2="170" y2="110" stroke="#00ff88" stroke-width="1.75"/>
    <!-- R3 orange zigzag resistor (bottom) -->
    <g transform="translate(140,110)" stroke="#ff8844" stroke-width="2.5" filter="url(#glow)">
      <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0"/>
    </g>
    <line x1="110" y1="110" x2="55"  y2="110" stroke="#00ff88" stroke-width="1.75"/>
    <!-- Corner nodes -->
    <circle cx="55"  cy="20"  r="3" fill="#00ff88" stroke="#0f172a" stroke-width="1.2"/>
    <circle cx="210" cy="20"  r="3" fill="#00ff88" stroke="#0f172a" stroke-width="1.2"/>
    <circle cx="210" cy="110" r="3" fill="#00ff88" stroke="#0f172a" stroke-width="1.2"/>
    <circle cx="55"  cy="110" r="3" fill="#00ff88" stroke="#0f172a" stroke-width="1.2"/>
    <!-- Component junction nodes -->
    <circle cx="110" cy="20"  r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <circle cx="170" cy="20"  r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <circle cx="210" cy="45"  r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <circle cx="210" cy="105" r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <circle cx="170" cy="110" r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <circle cx="110" cy="110" r="2.5" fill="#00ff88" stroke="#0f172a" stroke-width="1"/>
    <!-- Node labels -->
    <text x="42"  y="14"  font-size="8" fill="#94a3b8" font-weight="bold">1</text>
    <text x="218" y="14"  font-size="8" fill="#94a3b8" font-weight="bold">2</text>
    <text x="218" y="122" font-size="8" fill="#94a3b8" font-weight="bold">3</text>
    <text x="42"  y="122" font-size="8" fill="#94a3b8" font-weight="bold">4</text>
  </g>
  <!-- Red battery symbol -->
  <line x1="44" y1="56" x2="66" y2="56" stroke="#ff2b2b" stroke-width="4"   stroke-linecap="square"/>
  <line x1="50" y1="74" x2="60" y2="74" stroke="#ff2b2b" stroke-width="2.2" stroke-linecap="square"/>
  <text x="40" y="54" font-size="10" fill="#ff6b6b" font-weight="bold" text-anchor="middle">+</text>
  <text x="34" y="67" font-size="10" fill="#88ccff" font-weight="bold" text-anchor="middle">9V</text>
  <text x="40" y="80" font-size="10" fill="#ff6b6b" font-weight="bold" text-anchor="middle">-</text>
  <!-- Component value labels -->
  <g font-family="system-ui,-apple-system,sans-serif" font-size="9" fill="#88ccff"
     text-anchor="middle" font-weight="600" stroke="#050b1f" stroke-width="2" paint-order="stroke fill">
    <text x="140" y="9">R&#8321; = 3 k&#937;</text>
    <text x="229" y="77" text-anchor="end">R&#8322; =</text>
    <text x="140" y="129">R&#8323; = 5 k&#937;</text>
  </g>
  <text x="235" y="77" font-family="system-ui,-apple-system,sans-serif"
        font-size="12" fill="#ff2b2b" font-weight="800" text-anchor="middle"
        stroke="#050b1f" stroke-width="1.5" paint-order="stroke fill">?</text>
  <!-- Animated photon A -->
  <g aria-hidden="true" filter="url(#photonGlow)">
    <circle r="4.5" fill="url(#photonFill)" opacity="1">
      <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto">
        <mpath href="#photonPath"/>
      </animateMotion>
    </circle>
    <circle r="3.6" fill="url(#photonFill)" opacity="0.55">
      <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.14s">
        <mpath href="#photonPath"/>
      </animateMotion>
    </circle>
    <circle r="2.9" fill="url(#photonFill)" opacity="0.32">
      <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.28s">
        <mpath href="#photonPath"/>
      </animateMotion>
    </circle>
  </g>
  <!-- Animated photon B (offset) -->
  <g aria-hidden="true" filter="url(#photonGlow)">
    <circle r="4.5" fill="url(#photonFill)" opacity="1">
      <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.7s">
        <mpath href="#photonPath"/>
      </animateMotion>
    </circle>
    <circle r="3.6" fill="url(#photonFill)" opacity="0.55">
      <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.84s">
        <mpath href="#photonPath"/>
      </animateMotion>
    </circle>
  </g>
</svg>`;

// ── Shared CSS ──────────────────────────────────────────────────────────────
const BASE_CSS = `
  :root { --blue:#88ccff; --orange:#ff8844; --green:#00ff88; --bg:#050b1f; }
  *  { box-sizing:border-box; margin:0; padding:0; }
  html,body { width:100%; height:100%; overflow:hidden; }
  body {
    background: radial-gradient(125% 125% at 50% 10%,
      rgba(47,84,235,.28) 0%, rgba(9,17,43,.88) 45%, #050b1f 100%);
    font-family: "Inter","Poppins","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#f9fafc;
  }
  body::before {
    content:"";
    position:fixed; inset:0;
    background-image:
      linear-gradient(rgba(136,204,255,.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(136,204,255,.04) 1px,transparent 1px);
    background-size:40px 40px;
    pointer-events:none;
  }
  .wordmark {
    font-weight:900; letter-spacing:-.02em; line-height:1;
    display:inline-flex; gap:.04em;
    filter:drop-shadow(0 0 28px rgba(40,255,190,.4));
  }
  .wordmark .c  { color:#88ccff; text-shadow:0 0 22px rgba(136,204,255,.75),0 0 48px rgba(136,204,255,.5); }
  .wordmark .t  { color:#ff8844; text-shadow:0 0 20px rgba(255,136,68,.7),0 0 42px rgba(255,136,68,.5); }
  .wordmark .td { color:#00ff88; text-shadow:0 0 22px rgba(0,255,136,.75),0 0 48px rgba(0,255,136,.5); }
  .tagline {
    font-weight:700; letter-spacing:.28em; text-transform:uppercase;
    color:rgba(147,197,253,.88); padding-inline-start:.28em;
  }
  .caption {
    font-weight:500; color:rgba(200,225,255,.65); letter-spacing:.06em;
    line-height:1.6; text-align:center;
  }
  .badge {
    display:inline-flex; align-items:center; gap:12px;
    border-radius:999px; border:2px solid rgba(136,204,255,.38);
    background:rgba(136,204,255,.1); backdrop-filter:blur(8px);
    font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#f0f8ff;
  }
  .dot {
    border-radius:50%; background:#00ff88; box-shadow:0 0 10px #00ff88;
    flex-shrink:0;
  }
  .circuit-wrap { filter:drop-shadow(0 0 22px rgba(0,255,136,.35)); }
`;

// ── Build HTML for a PORTRAIT screen ───────────────────────────────────────
function portraitHTML(w, h) {
  const wm   = Math.round(Math.min(w, h) * 0.28);   // wordmark font-size
  const tl   = Math.round(wm * 0.17);                // tagline
  const cap  = Math.round(wm * 0.135);               // caption
  const bdg  = Math.round(wm * 0.125);               // badge text
  const dot  = Math.round(wm * 0.06);
  const bpad = `${Math.round(wm * 0.08)}px ${Math.round(wm * 0.22)}px`;
  const gap  = Math.round(h * 0.04);
  const circ = Math.round(w * 0.74);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
${BASE_CSS}
  .screen {
    width:100vw; height:100vh;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:${gap}px;
    padding:${Math.round(h * 0.05)}px ${Math.round(w * 0.06)}px;
  }
  .wordmark { font-size:${wm}px; }
  .tagline  { font-size:${tl}px; }
  .caption  { font-size:${cap}px; max-width:80%; }
  .badge    { font-size:${bdg}px; padding:${bpad}; }
  .dot      { width:${dot}px; height:${dot}px; }
  .circuit-wrap { width:${circ}px; }
</style></head><body>
<div class="screen">
  <div class="wordmark"><span class="c">C</span><span class="t">T</span><span class="td">3D</span></div>
  <div class="tagline">3D Interactive Circuit Builder</div>
  <div class="circuit-wrap">${CIRCUIT_SVG}</div>
  <div class="caption">Build circuits, solve Ohm's Law, see current flow in 3D</div>
  <div class="badge"><span class="dot"></span>Available on Google Play</div>
</div>
</body></html>`;
}

// ── Build HTML for a LANDSCAPE screen ──────────────────────────────────────
function landscapeHTML(w, h) {
  const wm   = Math.round(h * 0.30);                 // wordmark font-size
  const tl   = Math.round(wm * 0.16);                // tagline
  const cap  = Math.round(wm * 0.13);                // caption
  const bdg  = Math.round(wm * 0.12);                // badge
  const dot  = Math.round(wm * 0.06);
  const bpad = `${Math.round(wm * 0.08)}px ${Math.round(wm * 0.20)}px`;
  const gap  = Math.round(h * 0.04);
  const circ = Math.round(w * 0.48);
  const lw   = Math.round(w * 0.40);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
${BASE_CSS}
  .screen {
    width:100vw; height:100vh;
    display:flex; flex-direction:row;
    align-items:center; justify-content:center;
    gap:${Math.round(w * 0.05)}px;
    padding:${Math.round(h * 0.06)}px ${Math.round(w * 0.05)}px;
  }
  .left-col {
    display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
    gap:${gap}px; flex:0 0 auto; width:${lw}px;
  }
  .right-col {
    flex:1 1 auto; display:flex; align-items:center; justify-content:center;
  }
  .wordmark { font-size:${wm}px; }
  .tagline  { font-size:${tl}px; text-align:left; padding-inline-start:0; letter-spacing:.16em; }
  .caption  { font-size:${cap}px; text-align:left; max-width:100%; }
  .badge    { font-size:${bdg}px; padding:${bpad}; white-space:nowrap; }
  .dot      { width:${dot}px; height:${dot}px; }
  .circuit-wrap { width:${circ}px; }
</style></head><body>
<div class="screen">
  <div class="left-col">
    <div class="wordmark"><span class="c">C</span><span class="t">T</span><span class="td">3D</span></div>
    <div class="tagline">3D Interactive Circuit Builder</div>
    <div class="caption">Build circuits, solve Ohm's Law,<br>see current flow in 3D</div>
    <div class="badge"><span class="dot"></span>Available on Google Play</div>
  </div>
  <div class="right-col">
    <div class="circuit-wrap">${CIRCUIT_SVG}</div>
  </div>
</div>
</body></html>`;
}

// ── Screenshot configurations ───────────────────────────────────────────────
const CONFIGS = [
  // Phone portrait
  { file: 'phone-screenshot-1.png', w: 1080, h: 1920, label: 'Phone 1080×1920 FHD portrait'           },
  { file: 'phone-screenshot-2.png', w: 1440, h: 2560, label: 'Phone 1440×2560 QHD portrait'           },
  { file: 'phone-screenshot-3.png', w: 1080, h: 2340, label: 'Phone 1080×2340 tall-notch portrait'    },
  { file: 'phone-screenshot-4.png', w:  720, h: 1280, label: 'Phone 720×1280 HD portrait'             },
  // Tablet landscape
  { file: 'tablet-screenshot-1.png', w: 1920, h: 1080, label: 'Tablet 1920×1080 FHD landscape'       },
  { file: 'tablet-screenshot-2.png', w: 2560, h: 1600, label: 'Tablet 2560×1600 WQXGA landscape'     },
  // Tablet portrait
  { file: 'tablet-screenshot-3.png', w: 1200, h: 1920, label: 'Tablet 1200×1920 7-inch portrait'     },
  { file: 'tablet-screenshot-4.png', w: 1600, h: 2560, label: 'Tablet 1600×2560 10-inch portrait'    },
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎨  CircuiTry3D — Play Store Screenshot Generator');
  console.log('==================================================\n');

  const outDir = join(__dirname, 'play-store-assets', 'screenshots');
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const cfg of CONFIGS) {
    const isLandscape = cfg.w > cfg.h;
    const html = isLandscape ? landscapeHTML(cfg.w, cfg.h) : portraitHTML(cfg.w, cfg.h);

    const ctx  = await browser.newContext({
      viewport:          { width: cfg.w, height: cfg.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const bytes = await page.screenshot({ type: 'png', fullPage: false });
    await writeFile(join(outDir, cfg.file), bytes);
    console.log(`  ✓  ${cfg.label}  →  ${cfg.file}`);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n✅  ${CONFIGS.length} screenshots saved to play-store-assets/screenshots/\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
