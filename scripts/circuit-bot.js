#!/usr/bin/env node
/**
 * CircuiTry3D Circuit Bot
 * =======================
 * A Playwright-powered automation bot that builds and simulates circuits,
 * recording cinematic footage suitable for a promo video.
 *
 * Scenes recorded:
 *   scene-01-series.webm          — Series circuit: current flows successfully
 *   scene-02-parallel.webm        — Parallel circuit: multiple electron paths
 *   scene-03-overload.webm        — Overloaded resistor: thermal failure (FUSE engine)
 *   scene-04-mixed.webm           — Mixed series-parallel: advanced mastery
 *   scene-05-3d-build.webm        — 3D cinematic builder tour: atomic zoom + fly-through
 *   scene-06-arena.webm           — Arena: 3D component battle & FUSE failure analysis
 *   scene-07-new-components.webm  — Relay, Voltage Regulator & Circuit Breaker showcase
 *
 * Usage:
 *   npm run circuit-bot                    # production site (circuitry3d.app)
 *   npm run circuit-bot -- --local         # http://localhost:4173 (vite preview)
 *   npm run circuit-bot -- --url <URL>     # custom base URL
 *   npm run circuit-bot -- --scene <id>   # record a single scene by id
 *   npm run circuit-bot -- --portrait      # record at 412×915 (social / Reels)
 *   npm run circuit-bot -- --no-concat     # skip FFmpeg concatenation step
 *
 * Prerequisites:
 *   npx playwright install chromium
 *
 * Output:
 *   promo-footage/<scene-id>.webm
 *   promo-footage/promo-reel.mp4          (or promo-reel-portrait.mp4)
 */

import { chromium } from 'playwright';
import { mkdir, rename, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

// ── CLI flags ────────────────────────────────────────────────────────────────
const ARGS     = process.argv.slice(2);
const PROD_URL = 'https://circuitry3d.app';
const DEV_URL  = 'http://localhost:4173';

let BASE_URL     = PROD_URL;
let SCENE_FILTER = null;
let PORTRAIT     = false;
let NO_CONCAT    = false;

for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--local')             BASE_URL = DEV_URL;
  if (ARGS[i] === '--url'   && ARGS[i+1]) { BASE_URL = ARGS[i+1]; i++; }
  if (ARGS[i] === '--scene' && ARGS[i+1]) { SCENE_FILTER = ARGS[i+1]; i++; }
  if (ARGS[i] === '--portrait')           PORTRAIT = true;
  if (ARGS[i] === '--no-concat')          NO_CONCAT = true;
}

const OUTPUT_DIR = join(ROOT, 'promo-footage');
const VIEWPORT   = PORTRAIT ? { width: 412, height: 915 } : { width: 1920, height: 1080 };

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
  // Mark the tutorial as already seen so maybeAutoShowTutorial() never shows
  // the Quick Start Guide modal.  A fresh Playwright context has no localStorage,
  // which normally triggers the modal — blocking every scene from being recorded.
  await page.addInitScript(() => {
    try { localStorage.setItem('circuitry3d_tutorial_seen', '1'); } catch (_) {}
  });

  const url = `${BASE_URL}/legacy.html`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('canvas', { timeout: 20_000 });
  // Extra settle time for THREE.js / WebGL initialisation
  await page.waitForTimeout(2500);
  // Belt-and-suspenders: dismiss the tutorial modal if it appeared anyway
  await page.evaluate(() => {
    try { if (typeof dismissTutorial === 'function') dismissTutorial(); } catch (_) {}
    const backdrop = document.getElementById('tutorial-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  }).catch(() => {});
  await page.waitForTimeout(400);
}

/**
 * Verify the WebGL canvas is alive (context not lost).
 * Non-fatal: resolves even if the check times out so a missing indicator
 * never blocks the recording.
 */
async function verifyCanvas(page, timeoutMs = 8000) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return ctx !== null && !ctx.isContextLost();
    },
    { timeout: timeoutMs },
  ).catch(() => {});
}

/**
 * Click a component card in the Arena by zero-based index.
 * Tries progressively broader selectors so a DOM rename doesn't break the scene.
 */
async function clickArenaComponentCard(page, index = 0) {
  const selectors = [
    '[data-component-id]',
    '[data-component-card]',
    '[data-testid="component-card"]',
    '.component-card',
    '.card[data-type]',
    '.card',
  ];
  for (const sel of selectors) {
    const cards = await page.$$(sel);
    if (cards.length > index) {
      await cards[index].click();
      return true;
    }
  }
  return false;
}

/**
 * Click the "run test / analyse" button in the Arena.
 * Tries multiple selector strategies so a rename doesn't silently skip the action.
 */
async function clickArenaRunTest(page) {
  const selectors = [
    '[data-action="run-test"]',
    '[data-testid="run-test"]',
    '#run-test',
    '.run-test-btn',
    'button[data-action]',
  ];
  for (const sel of selectors) {
    try {
      const btn = await page.$(sel);
      if (btn) { await btn.click(); return true; }
    } catch (_) {}
  }
  // Last resort: text-content match
  try {
    const btn = await page.locator('button').filter({ hasText: /run|test|analys[ei]/i }).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Concatenate all recorded WebM clips into a single MP4 using FFmpeg.
 * Silently skips if ffmpeg is not installed.
 *
 * @param {string[]} clipPaths - Absolute paths to the recorded WebM files.
 * @param {string}   outputDir - Directory where the reel will be written.
 * @param {boolean}  portrait  - When true, output filename gets a -portrait suffix.
 * @returns {Promise<string|null>} Absolute path to the reel, or null if skipped.
 */
async function concatWithFfmpeg(clipPaths, outputDir, portrait) {
  if (clipPaths.length < 2) {
    console.log('  ℹ  Fewer than 2 clips — skipping concatenation.');
    return null;
  }

  // Check whether ffmpeg is available on PATH
  const ffmpegAvailable = await execFileAsync('ffmpeg', ['-version'])
    .then(() => true)
    .catch(() => false);

  if (!ffmpegAvailable) {
    console.log('  ℹ  ffmpeg not found — skipping automatic concatenation.');
    console.log('     Install ffmpeg or run the manual command shown above.\n');
    return null;
  }

  const tmpDir     = join(outputDir, '.tmp');
  await mkdir(tmpDir, { recursive: true });

  // Write the concat manifest — double-quote paths to safely handle spaces.
  // Paths are generated internally via path.join so they will not contain
  // double-quotes; the manifest is only read by ffmpeg (not a shell).
  const concatFile = join(tmpDir, 'concat.txt');
  const manifest   = clipPaths.map((p) => `file "${p}"`).join('\n');
  await writeFile(concatFile, manifest, 'utf8');

  const suffix   = portrait ? '-portrait' : '';
  const reelPath = join(outputDir, `promo-reel${suffix}.mp4`);

  const ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    reelPath,
  ];

  console.log('\n🎞   Concatenating clips with FFmpeg…');
  await execFileAsync('ffmpeg', ffmpegArgs);
  await unlink(concatFile).catch(() => {});

  return reelPath;
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
      await verifyCanvas(page);
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
      await verifyCanvas(page);
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
      await verifyCanvas(page);
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
      await verifyCanvas(page);
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
    id: 'scene-05-3d-build',
    title: 'Scene 05 — 3D Builder: Cinematic Fly-Through',
    async record(page) {
      await openBuilder(page);

      // Start with the advanced combination circuit to maximise visual density
      await sendAction(page, 'load-preset', { preset: 'combination_advanced' });
      await page.waitForTimeout(1500);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1200);

      // Labels on — show all component values in 3D space
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(800);

      // Wide cinematic pull-back to reveal the full 3D layout
      await smoothZoomOut(page, 4, 220);
      await page.waitForTimeout(1000);

      // Run simulation — all electron streams light up simultaneously
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(2500);

      // Slow push-in: macro → component view
      await smoothZoomIn(page, 8, 200);
      await page.waitForTimeout(1500);

      // Continue into atomic tier to show 3D electron clouds
      await smoothZoomIn(page, 10, 150);
      await page.waitForTimeout(3000);

      // Deep-atomic zoom — electrons spiral through the conductor lattice
      await smoothZoomIn(page, 6, 180);
      await page.waitForTimeout(3500);

      // Toggle conventional/electron current for a second visual burst
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(2000);

      // Pull all the way back to full overview — labels still on
      await smoothZoomOut(page, 20, 130);
      await page.waitForTimeout(2000);

      // Labels off for a clean close
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(1000);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-06-arena',
    title: 'Scene 06 — Arena: 3D Component Battle',
    async record(page) {
      // Navigate directly to the Arena page (standalone 3D scene)
      const arenaUrl = `${BASE_URL}/arena.html`;
      await page.goto(arenaUrl, { waitUntil: 'networkidle', timeout: 45_000 });

      // Wait for THREE.js scene and component meshes to initialise
      await page.waitForSelector('canvas#arena', { timeout: 20_000 });
      await verifyCanvas(page);
      await page.waitForTimeout(3500);

      // Let the idle arena animation play — camera orbits around the platform
      await page.waitForTimeout(4000);

      // Load component into slot A — try progressively broader selectors
      const loadedA = await clickArenaComponentCard(page, 0);
      if (loadedA) await page.waitForTimeout(1500);

      // Load a second component into slot B for the battle comparison
      const loadedB = await clickArenaComponentCard(page, 1);
      if (loadedB) await page.waitForTimeout(1500);

      // Trigger the analysis — try attribute-first selectors, then text-match
      const didRun = await clickArenaRunTest(page);
      if (didRun) await page.waitForTimeout(2000);

      // Let the 3D failure animation finish
      await page.waitForTimeout(5000);

      // Scroll the metrics panel to show delta results
      const metricsPanel = await page.$(
        '[data-testid="metrics-panel"], #metrics-panel, .metrics-panel, .results-panel',
      );
      if (metricsPanel) {
        await metricsPanel.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
        await page.waitForTimeout(2000);
        await metricsPanel.evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(1500);
      }

      // Final orbit shot — camera slowly circles the 3D components
      await page.waitForTimeout(4000);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-07-new-components',
    title: 'Scene 07 — New Components: Relay, Voltage Regulator & Circuit Breaker',
    async record(page) {
      await openBuilder(page);

      // Try the dedicated showcase preset; falls back gracefully if it doesn't exist
      await sendAction(page, 'load-preset', { preset: 'relay_showcase' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1000);

      // Labels on — show Relay (K), VR, and CB designators in 3D space
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(800);

      // Slow wide-angle reveal
      await smoothZoomOut(page, 3, 230);
      await page.waitForTimeout(800);

      // Zoom in to show the relay coil and VR body geometry
      await smoothZoomIn(page, 7, 210);
      await page.waitForTimeout(1000);

      // Start simulation — relay switches, VR regulates, CB trips
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(2500);

      // Dive into the relay coil / CB bimetallic strip region
      await smoothZoomIn(page, 10, 160);
      await page.waitForTimeout(3000);

      // Toggle current flow to highlight the regulated output rail
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(2000);

      // Deep atomic zoom — electrons through relay conductor
      await smoothZoomIn(page, 6, 180);
      await page.waitForTimeout(3000);

      // Pull back to full overview
      await smoothZoomOut(page, 18, 140);
      await page.waitForTimeout(1500);

      // Labels off for a clean outro
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(800);
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

/**
 * Record a scene with automatic retry on failure using exponential back-off.
 *
 * @param {*}      browser    - Playwright browser instance.
 * @param {object} scene      - Scene definition object.
 * @param {string} outputDir  - Directory to write the recording into.
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2).
 */
async function recordSceneWithRetry(browser, scene, outputDir, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const filePath = await recordScene(browser, scene, outputDir).catch((err) => {
      console.warn(`  ⚠  Attempt ${attempt} error: ${err.message}`);
      return null;
    });

    if (filePath) return filePath;

    if (attempt <= maxRetries) {
      const backoffMs = 1000 * (2 ** (attempt - 1));
      console.log(`  ↩  Retrying "${scene.id}" in ${backoffMs / 1000}s (retry ${attempt} of ${maxRetries})…`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  console.warn(`  ✗  Scene "${scene.id}" failed after ${maxRetries + 1} attempts — skipping.\n`);
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
  console.log(`  Viewport : ${VIEWPORT.width}×${VIEWPORT.height}${PORTRAIT ? ' (portrait)' : ''}`);
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
    const filePath = await recordSceneWithRetry(browser, scene, OUTPUT_DIR);
    if (filePath) {
      recorded.push({ scene, filePath });
      console.log(`  ✓  promo-footage/${scene.id}.webm`);
    }
  }

  await browser.close();

  // ── FFmpeg concatenation ─────────────────────────────────────────────────
  let reelPath = null;
  if (!NO_CONCAT && recorded.length > 0) {
    reelPath = await concatWithFfmpeg(
      recorded.map((r) => r.filePath),
      OUTPUT_DIR,
      PORTRAIT,
    ).catch((err) => {
      console.warn(`  ⚠  FFmpeg concatenation failed: ${err.message}`);
      return null;
    });
    if (reelPath) {
      const reelName = PORTRAIT ? 'promo-reel-portrait.mp4' : 'promo-reel.mp4';
      console.log(`  ✓  promo-footage/${reelName}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n✅  Recording complete!\n');

  if (recorded.length > 0) {
    console.log('  Footage files:');
    for (const { scene } of recorded) {
      console.log(`    promo-footage/${scene.id}.webm  —  ${scene.title}`);
    }
    if (reelPath) {
      const reelName = PORTRAIT ? 'promo-reel-portrait.mp4' : 'promo-reel.mp4';
      console.log(`    promo-footage/${reelName}  —  Full promo reel`);
    } else {
      console.log('\n  Combine clips manually with ffmpeg:');
      console.log('    printf "file \'%s\'\\n" promo-footage/scene-*.webm > /tmp/clips.txt');
      console.log('    ffmpeg -f concat -safe 0 -i /tmp/clips.txt -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p promo-footage/promo-reel.mp4\n');
      console.log('  Or import the individual .webm files into your video editor (Premiere, DaVinci, CapCut, etc.)');
      console.log('  and add title cards, music, and colour grading for the final promo reel.\n');
    }
  } else {
    console.warn('  ⚠  No clips were saved — check the warnings above.\n');
  }
}

main().catch((err) => {
  console.error('❌  Bot failed:', err);
  process.exit(1);
});
