#!/usr/bin/env node
/**
 * CircuiTry3D Circuit Bot
 * =======================
 * A Playwright-powered automation bot that builds and simulates circuits,
 * recording cinematic footage suitable for a promo video.
 *
 * Scenes recorded:
 *   scene-01-series.webm    — Series circuit: current flows successfully
 *   scene-02-parallel.webm  — Parallel circuit: multiple electron paths
 *   scene-03-overload.webm  — Overloaded resistor: thermal failure (FUSE engine)
 *   scene-04-mixed.webm     — Mixed series-parallel: advanced mastery
 *   scene-05-promo.webm     — Cinematic promo page sweep (public/promo6.html)
 *
 * Usage:
 *   npm run circuit-bot                   # production site (circuitry3d.app)
 *   npm run circuit-bot -- --local        # http://localhost:4173 (vite preview)
 *   npm run circuit-bot -- --url <URL>    # custom base URL
 *   npm run circuit-bot -- --scene <id>  # record a single scene by id
 *
 * Prerequisites:
 *   npx playwright install chromium
 *
 * Output:
 *   promo-footage/<scene-id>.webm
 */

import { chromium } from 'playwright';
import { mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

// ── CLI flags ────────────────────────────────────────────────────────────────
const ARGS     = process.argv.slice(2);
const PROD_URL = 'https://circuitry3d.app';
const DEV_URL  = 'http://localhost:4173';

let BASE_URL    = PROD_URL;
let SCENE_FILTER = null;

for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--local')            BASE_URL = DEV_URL;
  if (ARGS[i] === '--url'  && ARGS[i+1]) { BASE_URL = ARGS[i+1]; i++; }
  if (ARGS[i] === '--scene' && ARGS[i+1]) { SCENE_FILTER = ARGS[i+1]; i++; }
}

const OUTPUT_DIR = join(ROOT, 'promo-footage');
const VIEWPORT   = { width: 412, height: 915 };   // portrait phone (Android primary target)

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a builder:invoke-action postMessage to legacy.html.
 * Works when the page is opened standalone because window.parent === window,
 * so the bridge's source check resolves to null (accepts all sources).
 */
async function sendAction(page, action, data = {}) {
  await page.evaluate(({ action, data }) => {
    window.postMessage({ type: 'builder:invoke-action', payload: { action, data } }, '*');
  }, { action, data });
}

/** Smooth zoom-in: fire multiple zoom-in actions with a short delay each. */
async function smoothZoomIn(page, steps = 8, delayMs = 130) {
  for (let i = 0; i < steps; i++) {
    await sendAction(page, 'zoom-in');
    await page.waitForTimeout(delayMs);
  }
}

/** Smooth zoom-out: fire multiple zoom-out actions with a short delay each. */
async function smoothZoomOut(page, steps = 6, delayMs = 150) {
  for (let i = 0; i < steps; i++) {
    await sendAction(page, 'zoom-out');
    await page.waitForTimeout(delayMs);
  }
}

/**
 * Navigate to legacy.html and wait for the 3-D canvas to be ready.
 * Dismisses any initial overlay via Escape.
 */
async function openBuilder(page) {
  const url = `${BASE_URL}/legacy.html`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('canvas', { timeout: 20_000 });
  // Extra settle time for THREE.js / WebGL initialisation
  await page.waitForTimeout(2500);
  // Dismiss any tutorial/splash overlay
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
}

// ── Scene definitions ─────────────────────────────────────────────────────────

const SCENES = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-01-series',
    title: 'Scene 01 — Series Circuit: Current Flows',
    async record(page) {
      await openBuilder(page);

      // Load the preset and let the components settle
      await sendAction(page, 'load-preset', { preset: 'series_basic' });
      await page.waitForTimeout(1200);

      // Fit the circuit neatly to the viewport
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1000);

      // Slow cinematic zoom in
      await smoothZoomIn(page, 8, 200);
      await page.waitForTimeout(800);

      // Trigger simulation — current starts flowing
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(2500);

      // Zoom further in to show the electron cloud at a mid-range view
      await smoothZoomIn(page, 6, 170);
      await page.waitForTimeout(2000);

      // Zoom into the atomic / quantum zoom tier
      await smoothZoomIn(page, 10, 130);
      await page.waitForTimeout(3000);

      // Toggle between electron-flow and conventional-current views
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(2500);

      // Pull back out to the overview
      await smoothZoomOut(page, 16, 140);
      await page.waitForTimeout(1500);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-02-parallel',
    title: 'Scene 02 — Parallel Circuit: Multiple Paths',
    async record(page) {
      await openBuilder(page);

      await sendAction(page, 'load-preset', { preset: 'parallel_basic' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1000);

      // Wide cinematic pull-back, then slow push-in
      await smoothZoomOut(page, 3, 250);
      await page.waitForTimeout(600);
      await smoothZoomIn(page, 10, 180);
      await page.waitForTimeout(800);

      // Simulate — parallel branch currents light up
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(3000);

      // Dive into the atomic level to show three separate electron streams
      await smoothZoomIn(page, 14, 130);
      await page.waitForTimeout(3500);

      // Flip flow direction for visual contrast
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(2000);

      // Pull back to overview
      await smoothZoomOut(page, 14, 150);
      await page.waitForTimeout(1500);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-03-overload',
    title: 'Scene 03 — Overloaded Resistor: Thermal Failure',
    async record(page) {
      await openBuilder(page);

      // Deliberately dangerous circuit — FUSE engine will trigger failure
      await sendAction(page, 'load-preset', { preset: 'overload_demo' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Zoom in before starting so the viewer is close when things go wrong
      await smoothZoomIn(page, 7, 190);
      await page.waitForTimeout(600);

      // Start simulation — current surges, thermal accumulation begins
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(2000);

      // Continue zooming toward the resistor as heat builds
      await smoothZoomIn(page, 6, 220);
      await page.waitForTimeout(3000);

      // Go to atomic level — watch electrons slam through the overloaded resistor
      await smoothZoomIn(page, 8, 160);
      await page.waitForTimeout(4500);

      // Pull back to show the aftermath
      await smoothZoomOut(page, 12, 180);
      await page.waitForTimeout(2000);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-04-mixed',
    title: 'Scene 04 — Mixed Circuit: Series-Parallel Mastery',
    async record(page) {
      await openBuilder(page);

      await sendAction(page, 'load-preset', { preset: 'combination_advanced' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1000);

      // Reveal the complex topology with a slow zoom in
      await smoothZoomIn(page, 6, 200);
      await page.waitForTimeout(800);

      // Labels on to show component values while zooming
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(800);

      // Simulate the advanced network
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(3000);

      // Sweep from overview to atomic and back
      await smoothZoomIn(page, 14, 130);
      await page.waitForTimeout(3000);

      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(2000);

      await smoothZoomOut(page, 14, 150);
      await page.waitForTimeout(1000);

      // Turn labels back off for a clean outro
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(1000);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-05-promo',
    title: 'Scene 05 — Cinematic Promo Page',
    async record(page) {
      // Navigate to the dedicated promo page for the brand reveal
      const promoUrl = `${BASE_URL}/promo6.html`;
      await page.goto(promoUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(1500);

      // Let the CSS animations play through all sections
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(3000);

      // Scroll slowly through the page for a cinematic sweep
      const totalHeight = await page.evaluate(() => document.body.scrollHeight);
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), Math.round((totalHeight * i) / steps));
        await page.waitForTimeout(600);
      }

      // Pause at the bottom
      await page.waitForTimeout(2000);

      // Scroll back to the top
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
    },
  },
];

// ── Recording engine ──────────────────────────────────────────────────────────

async function recordScene(browser, scene, outputDir) {
  const tmpDir = join(outputDir, '.tmp');
  await mkdir(tmpDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir:  tmpDir,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  // Capture a reference to the Video object before close (required by Playwright API)
  const video = page.video();

  try {
    await scene.record(page);
    // Give the last frame a moment to render before we close
    await page.waitForTimeout(800);
  } catch (err) {
    console.warn(`  ⚠  Scene interrupted: ${err.message}`);
  }

  // context.close() finalises the video file
  await context.close();

  // Retrieve the temporary path and move to the final destination
  const tmpPath   = await video.path();
  const finalPath = join(outputDir, `${scene.id}.webm`);

  if (tmpPath && existsSync(tmpPath)) {
    await rename(tmpPath, finalPath);
    return finalPath;
  }

  console.warn(`  ⚠  Video file not found for scene "${scene.id}"`);
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scenes = SCENE_FILTER
    ? SCENES.filter((s) => s.id === SCENE_FILTER || s.id.includes(SCENE_FILTER))
    : SCENES;

  if (scenes.length === 0) {
    console.error(`❌  No scene matched filter "${SCENE_FILTER}".`);
    console.error(`   Available: ${SCENES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  console.log('\n🎬  CircuiTry3D Circuit Bot — Promo Footage Recorder');
  console.log('─'.repeat(56));
  console.log(`  Source   : ${BASE_URL}`);
  console.log(`  Output   : promo-footage/`);
  console.log(`  Scenes   : ${scenes.map((s) => s.id).join(', ')}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=egl',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  }).catch((err) => {
    console.error('❌  Could not launch Chromium.\n   Run: npx playwright install chromium');
    throw err;
  });

  const recorded = [];

  for (const scene of scenes) {
    console.log(`\n🎥  ${scene.title}`);
    const filePath = await recordScene(browser, scene, OUTPUT_DIR);
    if (filePath) {
      recorded.push({ scene, filePath });
      console.log(`  ✓  promo-footage/${scene.id}.webm`);
    }
  }

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n✅  Recording complete!\n');

  if (recorded.length > 0) {
    console.log('  Footage files:');
    for (const { scene } of recorded) {
      console.log(`    promo-footage/${scene.id}.webm  —  ${scene.title}`);
    }

    console.log('\n  Combine clips with ffmpeg:');
    console.log('    # 1. Create a concat list:');
    console.log('    ls promo-footage/scene-*.webm | sed "s/^/file \'/" | sed "s/$/' \\\\"/" > /tmp/clips.txt');
    console.log('    # 2. Merge into one file:');
    console.log("    ffmpeg -f concat -safe 0 -i /tmp/clips.txt -c copy promo-footage/promo-reel.webm\n");
    console.log('  Or import the individual .webm files into your video editor (Premiere, DaVinci, CapCut, etc.)');
    console.log('  and add title cards, music, and colour grading for the final promo reel.\n');
  } else {
    console.warn('  ⚠  No clips were saved — check the warnings above.\n');
  }
}

main().catch((err) => {
  console.error('❌  Bot failed:', err);
  process.exit(1);
});
