#!/usr/bin/env node
/**
 * CircuiTry3D — Component Showcase Capture
 * ==========================================
 * A Playwright bot that opens the 3D builder, adds every component to the
 * workspace one at a time, injects a cinematic name/description overlay into
 * the page, and saves a 1920×1080 screenshot for each component.
 *
 * The resulting images are committed to public/component-shots/ and used by
 * public/promo10.html as the component-showcase promo reel.
 *
 * Usage:
 *   npm run component-showcase            # production site (circuitry3d.app)
 *   npm run component-showcase:local      # http://localhost:4173 (vite preview)
 *   npm run component-showcase -- --url <URL>
 *   npm run component-showcase -- --id <componentId>   # single component only
 *
 * Prerequisites:
 *   npx playwright install chromium --with-deps
 *
 * Output:
 *   public/component-shots/<id>.png
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

// ── CLI flags ────────────────────────────────────────────────────────────────
const ARGS      = process.argv.slice(2);
const PROD_URL  = 'https://circuitry3d.app';
const DEV_URL   = 'http://localhost:4173';

let BASE_URL    = PROD_URL;
let ID_FILTER   = null;

for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--local')            BASE_URL = DEV_URL;
  if (ARGS[i] === '--url'  && ARGS[i+1]) { BASE_URL = ARGS[i+1]; i++; }
  if (ARGS[i] === '--id'   && ARGS[i+1]) { ID_FILTER = ARGS[i+1]; i++; }
}

const OUTPUT_DIR = join(ROOT, 'public', 'component-shots');
const VIEWPORT   = { width: 1920, height: 1080 };

// ── Component definitions ─────────────────────────────────────────────────────
// Mirrors COMPONENT_ACTIONS in src/components/builder/constants.ts.
// Each entry contains the info we overlay on the screenshot.
const COMPONENTS = [
  { id: 'battery',          label: 'Battery',           desc: 'Power source — drives current through the circuit',                    icon: '─|├─',    cat: 'Power',             color: '#ffd060' },
  { id: 'ac_source',        label: 'AC Source',          desc: 'AC power source — alternating current supply',                         icon: '─(~)─',   cat: 'Power',             color: '#ffd060' },
  { id: 'resistor',         label: 'Resistor',           desc: 'Controls current flow and voltage drop',                               icon: '─/\\/\\/─', cat: 'Passive',           color: '#88ccff' },
  { id: 'capacitor',        label: 'Capacitor',          desc: 'Stores electrical energy temporarily',                                 icon: '─||─',    cat: 'Passive',           color: '#88ccff' },
  { id: 'capacitor-ceramic',label: 'Ceramic Capacitor',  desc: 'Non-polarized, small-value coupling & decoupling',                    icon: '─| |─',   cat: 'Passive',           color: '#88ccff' },
  { id: 'inductor',         label: 'Inductor',           desc: 'Stores energy in a magnetic field',                                   icon: '─⌇⌇⌇─',  cat: 'Passive',           color: '#88ccff' },
  { id: 'diode',            label: 'Diode',              desc: 'One-way current flow control',                                        icon: '─▷|─',    cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'zener-diode',      label: 'Zener Diode',        desc: 'Reverse-breakdown voltage reference & regulation',                    icon: '─▷|⟂─',   cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'photodiode',       label: 'Photodiode',         desc: 'Light sensor diode — reverse biased in most circuits',                icon: '⇢─▷|─',   cat: 'Sensor',            color: '#00ff88' },
  { id: 'led',              label: 'LED',                desc: 'Light-emitting diode indicator',                                      icon: '─▷|→',    cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'thermistor',       label: 'Thermistor',         desc: 'Temperature-dependent resistor (NTC / PTC)',                          icon: '─/\\/\\─°', cat: 'Sensor',           color: '#00ff88' },
  { id: 'crystal',          label: 'Crystal',            desc: 'Quartz resonator — stable timing reference for oscillators',          icon: '─▯─',     cat: 'Passive',           color: '#88ccff' },
  { id: 'bjt',              label: 'BJT',                desc: 'Bipolar junction transistor — amplification & switching',             icon: '─⧫─',     cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'bjt-npn',          label: 'NPN Transistor',     desc: 'Current flows collector → emitter when base is positive',             icon: '─⧫→',     cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'bjt-pnp',          label: 'PNP Transistor',     desc: 'Current flows emitter → collector when base is negative',             icon: '─⧫←',     cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'darlington',       label: 'Darlington Pair',    desc: 'High-gain transistor configuration (β²)',                             icon: '─⧫⧫─',    cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'mosfet',           label: 'MOSFET',             desc: 'Power switching transistor — voltage-controlled gate',                icon: '─⫞|─',    cat: 'Semiconductor',     color: '#c084fc' },
  { id: 'switch',           label: 'Switch',             desc: 'Open / close the circuit path on demand',                            icon: '─o/o─',   cat: 'Electromechanical', color: '#ff8844' },
  { id: 'fuse',             label: 'Fuse',               desc: 'Overcurrent protection — breaks circuit on overload',                icon: '─◇─',     cat: 'Electromechanical', color: '#ff8844' },
  { id: 'potentiometer',    label: 'Potentiometer',      desc: 'Variable resistance — adjustable voltage divider',                   icon: '─/↕/─',   cat: 'Passive',           color: '#88ccff' },
  { id: 'lamp',             label: 'Lamp',               desc: 'Visual load indicator with incandescent glow effect',                icon: '─⊗─',     cat: 'Electromechanical', color: '#ff8844' },
  { id: 'motor',            label: 'Motor',              desc: 'DC motor with rotating armature',                                    icon: '─(M)─',   cat: 'Electromechanical', color: '#ff8844' },
  { id: 'speaker',          label: 'Speaker',            desc: 'Audio output device or buzzer',                                      icon: '─◁)))',   cat: 'Electromechanical', color: '#ff8844' },
  { id: 'opamp',            label: 'Op-Amp',             desc: 'Operational amplifier for analog signal processing',                 icon: '─▷─',     cat: 'Integrated',        color: '#ff4455' },
  { id: 'transformer',      label: 'Transformer',        desc: 'Voltage step-up / step-down & galvanic isolation',                  icon: '⌇||⌇',    cat: 'Passive',           color: '#88ccff' },
  { id: 'ground',           label: 'Ground',             desc: 'Circuit reference node — return path to zero volts',                 icon: '─┴─',     cat: 'Connector',         color: '#9db8ff' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendAction(page, action, data = {}) {
  await page.evaluate(({ action, data }) => {
    window.postMessage({ type: 'builder:invoke-action', payload: { action, data } }, '*');
  }, { action, data });
}

async function addComponent(page, componentType) {
  await page.evaluate((componentType) => {
    window.postMessage({ type: 'builder:add-component', payload: { componentType } }, '*');
  }, componentType);
}

/**
 * Open legacy.html and wait for the 3-D canvas to be ready.
 */
async function openBuilder(page) {
  const url = `${BASE_URL}/legacy.html`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('canvas', { timeout: 20_000 });
  // Extra settle time for THREE.js / WebGL initialisation
  await page.waitForTimeout(3000);
  // Dismiss any tutorial/splash overlay
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Inject a full-screen cinematic overlay into the page showing the component
 * name, icon, description, and category badge. Returns a handle to the overlay
 * element so it can be removed after the screenshot.
 */
async function injectOverlay(page, comp) {
  await page.evaluate(({ id, label, desc, icon, cat, color }) => {
    // Remove any existing overlay first
    document.getElementById('__ct3d-comp-overlay')?.remove();

    const hexToRgba = (hex, a) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const catColors = {
      'Power':             '#ffd060',
      'Passive':           '#88ccff',
      'Semiconductor':     '#c084fc',
      'Sensor':            '#00ff88',
      'Electromechanical': '#ff8844',
      'Integrated':        '#ff4455',
      'Connector':         '#9db8ff',
    };
    const c = catColors[cat] || color;

    const el = document.createElement('div');
    el.id = '__ct3d-comp-overlay';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      font-family: "Inter","Segoe UI",Roboto,sans-serif;
      /* Bottom-left cinematic info block */
    `;

    el.innerHTML = `
      <style>
        #__ct3d-comp-overlay .ov-vignette {
          position: absolute; inset: 0;
          background:
            linear-gradient(to top,    rgba(5,11,31,0.88) 0%, rgba(5,11,31,0.30) 40%, transparent 70%),
            linear-gradient(to bottom, rgba(5,11,31,0.60) 0%, transparent 25%),
            linear-gradient(to right,  rgba(5,11,31,0.45) 0%, transparent 45%);
        }
        #__ct3d-comp-overlay .ov-brand {
          position: absolute; top: 32px; left: 40px;
          font-size: 13px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(157,184,255,0.65);
        }
        #__ct3d-comp-overlay .ov-body {
          position: absolute; bottom: 64px; left: 52px;
          display: flex; flex-direction: column; gap: 10px;
          max-width: 680px;
        }
        #__ct3d-comp-overlay .ov-cat {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px; border-radius: 100px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase;
          border: 1.5px solid ${hexToRgba(c, 0.5)};
          background: ${hexToRgba(c, 0.12)};
          color: ${c};
          width: fit-content;
        }
        #__ct3d-comp-overlay .ov-icon {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 16px; border-radius: 8px;
          font-family: "SF Mono","Fira Code",monospace;
          font-size: 13px; font-weight: 600; letter-spacing: 0.08em;
          color: rgba(249,250,252,0.6);
          background: rgba(249,250,252,0.07);
          border: 1px solid rgba(249,250,252,0.12);
          width: fit-content; margin-bottom: 4px;
        }
        #__ct3d-comp-overlay .ov-name {
          font-size: clamp(3rem,5vw,4.8rem); font-weight: 900;
          letter-spacing: -0.025em; line-height: 1.02;
          color: #f9fafc;
          text-shadow: 0 0 48px ${hexToRgba(c, 0.6)}, 0 2px 24px rgba(5,11,31,0.9);
        }
        #__ct3d-comp-overlay .ov-desc {
          font-size: clamp(0.9rem,1.5vw,1.15rem); font-weight: 400;
          color: rgba(249,250,252,0.72); line-height: 1.55;
          text-shadow: 0 1px 12px rgba(5,11,31,0.85);
        }
        #__ct3d-comp-overlay .ov-counter {
          position: absolute; bottom: 64px; right: 52px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(157,184,255,0.5);
          font-family: "SF Mono","Fira Code",monospace;
        }
      </style>
      <div class="ov-vignette"></div>
      <div class="ov-brand">CircuiTry3D · Component Library</div>
      <div class="ov-body">
        <div class="ov-cat">${cat}</div>
        <div class="ov-icon">${icon}</div>
        <div class="ov-name">${label}</div>
        <div class="ov-desc">${desc}</div>
      </div>
      <div class="ov-counter">3D · INTERACTIVE · REAL PHYSICS</div>
    `;

    document.body.appendChild(el);
  }, comp);
}

async function removeOverlay(page) {
  await page.evaluate(() => {
    document.getElementById('__ct3d-comp-overlay')?.remove();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const components = ID_FILTER
    ? COMPONENTS.filter((c) => c.id === ID_FILTER || c.label.toLowerCase().includes(ID_FILTER.toLowerCase()))
    : COMPONENTS;

  if (components.length === 0) {
    console.error(`❌  No component matched filter "${ID_FILTER}".`);
    console.error(`   Available: ${COMPONENTS.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }

  console.log('\n📸  CircuiTry3D — Component Showcase Capture');
  console.log('─'.repeat(54));
  console.log(`  Source     : ${BASE_URL}`);
  console.log(`  Output     : public/component-shots/`);
  console.log(`  Components : ${components.length} (of ${COMPONENTS.length} total)\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--enable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu-sandbox',
    ],
  }).catch((err) => {
    console.error('❌  Could not launch Chromium.\n   Run: npx playwright install chromium --with-deps');
    throw err;
  });

  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  // Open builder once — we'll reuse the same page for all components,
  // clearing the workspace between each shot.
  await openBuilder(page);

  const saved = [];

  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    console.log(`  [${String(i + 1).padStart(2, '0')}/${components.length}]  ${comp.label}`);

    // Clear previous components
    await sendAction(page, 'clear-workspace');
    await page.waitForTimeout(400);

    // Add this component to the workspace
    await addComponent(page, comp.id);
    await page.waitForTimeout(1800);

    // Fit it neatly to screen
    await sendAction(page, 'fit-screen');
    await page.waitForTimeout(800);

    // Small zoom-out so the component sits centred with breathing room
    await sendAction(page, 'zoom-out');
    await sendAction(page, 'zoom-out');
    await page.waitForTimeout(400);

    // Inject the cinematic overlay
    await injectOverlay(page, comp);
    await page.waitForTimeout(200);

    // Capture the screenshot
    const png  = await page.screenshot({ type: 'png', fullPage: false });
    const file = join(OUTPUT_DIR, `${comp.id}.png`);
    await writeFile(file, png);
    saved.push(comp.id);

    // Clean up overlay before moving to next component
    await removeOverlay(page);

    console.log(`         ✓  public/component-shots/${comp.id}.png`);
  }

  await browser.close();

  console.log(`\n✅  ${saved.length} component shots saved to public/component-shots/\n`);
  console.log('  Open public/promo10.html to preview the showcase reel.');
  console.log('  The screenshots are referenced by the promo page automatically.\n');
}

main().catch((err) => {
  console.error('❌  Capture failed:', err);
  process.exit(1);
});
