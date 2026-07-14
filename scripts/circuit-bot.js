#!/usr/bin/env node
/**
 * CircuiTry3D Circuit Bot
 * =======================
 * A Playwright-powered automation bot that builds and simulates circuits,
 * recording cinematic footage suitable for a promo video and continuously
 * stocking an educational scenario-driven footage library.
 *
 * Cinematic scenes (type: cinematic):
 *   scene-01-series.webm          — Series circuit: current flows successfully
 *   scene-02-parallel.webm        — Parallel circuit: multiple electron paths
 *   scene-03-overload.webm        — Overloaded resistor: thermal failure (FUSE engine)
 *   scene-04-mixed.webm           — Mixed series-parallel: advanced mastery
 *   scene-05-3d-build.webm        — 3D cinematic builder tour: atomic zoom + fly-through
 *   scene-06-arena.webm           — Arena: 3D component battle & FUSE failure analysis
 *   scene-07-new-components.webm  — Relay, Voltage Regulator & Circuit Breaker showcase
 * Scenes recorded:
 *   scene-01-series.webm       — Series circuit: current flows successfully
 *   scene-02-parallel.webm     — Parallel circuit: multiple electron paths
 *   scene-03-overload.webm     — Overloaded resistor: thermal failure (FUSE engine)
 *   scene-04-mixed.webm        — Mixed series-parallel: advanced mastery
 *   scene-05-promo.webm        — Cinematic promo page sweep (public/promo8.html)
 *   scene-06-fuse-showcase.webm — FUSE™ at work: fuse component blown by overcurrent
 *   scene-07-arena.webm        — Component Arena: live FUSE™ analysis showcase
 *   scene-08-practice.webm     — Practice mode: W.I.R.E. methodology walkthrough
 *
 * Usage:
 *   npm run circuit-bot                        # production site (circuitry3d.app)
 *   npm run circuit-bot -- --local             # http://localhost:4173 (vite preview)
 *   npm run circuit-bot -- --url <URL>         # custom base URL
 *   npm run circuit-bot -- --scene <id>        # record a single scene by id
 *   npm run circuit-bot -- --type <type>       # cinematic | educational | all (default: all)
 *   npm run circuit-bot -- --portrait          # record at 412×915 (social / Reels)
 *   npm run circuit-bot -- --no-concat         # skip FFmpeg concatenation step
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
import { basename, dirname, join } from 'path';
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
let FOOTAGE_TYPE = 'all'; // 'all' | 'cinematic' | 'educational'
let PORTRAIT     = false;
let NO_CONCAT    = false;

for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--local')             BASE_URL = DEV_URL;
  if (ARGS[i] === '--url'   && ARGS[i+1]) { BASE_URL = ARGS[i+1]; i++; }
  if (ARGS[i] === '--scene' && ARGS[i+1]) { SCENE_FILTER = ARGS[i+1]; i++; }
  if (ARGS[i] === '--type'  && ARGS[i+1]) { FOOTAGE_TYPE = ARGS[i+1]; i++; }
  if (ARGS[i] === '--portrait')           PORTRAIT = true;
  if (ARGS[i] === '--no-concat')          NO_CONCAT = true;
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
 * Play a built-in CinematicController preset (or custom keyframe array) and
 * wait for it to finish before returning.
 *
 * Built-in presets:
 *   'orbit'   — full 360° orbit at current distance (~8 s)
 *   'atom'    — macro zoom-in to atomic tier then pull back (~8 s)
 *   'lattice' — lateral conductor-lattice traverse then pull back (~9 s)
 *   'focus'   — push-in and orbit around the first component then pull back (~7 s)
 *
 * @param {object} page             - Playwright page object (legacy.html).
 * @param {string|object[]} preset  - Preset name or custom keyframe array.
 * @param {number} extraWaitMs      - Additional settling time after animation ends.
 * @returns {Promise<void>}
 */
async function playCinematic(page, preset, extraWaitMs = 600) {
  // Install a one-shot listener that sets a flag once the controller signals
  // it has finished playing.  We track the "playing → stopped" transition so
  // a pre-existing stopped state doesn't falsely resolve the wait.
  await page.evaluate(() => {
    window._circuitBot = window._circuitBot || {};
    window._circuitBot.cinematicPlaying = false;
    window._circuitBot.cinematicDone   = false;
    const handler = (ev) => {
      if (!ev.data || ev.data.type !== 'legacy:cinematic-state') return;
      const p = ev.data.payload || {};
      if (p.playing === true)  { window._circuitBot.cinematicPlaying = true; }
      if (p.playing === false && window._circuitBot.cinematicPlaying) { window._circuitBot.cinematicDone = true; }
    };
    window._circuitBot.msgHandler = handler;
    window.addEventListener('message', handler);
  });

  const data = typeof preset === 'string' ? { preset } : { keyframes: preset };
  await sendAction(page, 'cinematic-play', data);

  // Poll until the done flag is set (max 40 s covers the longest preset chain).
  await page.waitForFunction(() => window._circuitBot && window._circuitBot.cinematicDone === true, {
    timeout: 40_000,
    polling: 250,
  }).catch(() => {});

  // Clean up listener and flags regardless of outcome.
  await page.evaluate(() => {
    if (window._circuitBot && window._circuitBot.msgHandler) {
      window.removeEventListener('message', window._circuitBot.msgHandler);
    }
    delete window._circuitBot;
  });

  if (extraWaitMs > 0) await page.waitForTimeout(extraWaitMs);
}

/**
 * Navigate to legacy.html and wait for the 3-D canvas to be ready.
 * Dismisses any initial overlay via Escape.
 */
async function openBuilder(page) {
  // Mark the tutorial as already seen so maybeAutoShowTutorial() never shows
  // the Quick Start Guide modal.  A fresh Playwright context has no localStorage,
  // which normally triggers the modal — blocking every scene from being recorded.
  //
  // Also install a MutationObserver that forcibly removes the 'visible' class
  // from the tutorial backdrop the instant it is added.  This handles the race
  // where builder init finishes *after* the bot's earlier dismiss call — which
  // caused the tutorial to reappear mid-scene in CI where WebGL initialisation
  // can take far longer than the previous hardcoded 2 500 ms wait.
  await page.addInitScript(() => {
    try { localStorage.setItem('circuitry3d_tutorial_seen', '1'); } catch (_) {}

    // Auto-dismiss the tutorial backdrop whenever it becomes visible.
    document.addEventListener('DOMContentLoaded', () => {
      const backdrop = document.getElementById('tutorial-backdrop');
      if (!backdrop) return;
      const mo = new MutationObserver(() => {
        if (backdrop.classList.contains('visible')) {
          backdrop.classList.remove('visible');
        }
      });
      mo.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    });
  });

  const url = `${BASE_URL}/legacy.html`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('canvas', { timeout: 20_000 });
  // Wait for the builder's init() to complete (_builderReady flag) rather than
  // using a fixed timeout.  On CI, WebGL initialisation can exceed 2 500 ms.
  await page.waitForFunction(() => window._builderReady === true, { timeout: 30_000 }).catch(() => {});
  // The tutorial setTimeout fires 800 ms after _builderReady — wait past it so
  // the MutationObserver has a chance to suppress it before recording starts.
  await page.waitForTimeout(1200);
  // Belt-and-suspenders: explicitly dismiss in case the observer missed it.
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

  // Write the concat manifest using paths relative to tmpDir.
  // Relative paths avoid the FFmpeg 6.x issue where double-quoted absolute
  // paths with -safe 0 are treated as relative (prepending the manifest dir).
  // Since tmpDir is outputDir/.tmp, each clip is one level up: ../clip.webm.
  const concatFile = join(tmpDir, 'concat.txt');
  const manifest   = clipPaths.map((p) => `file '../${basename(p)}'`).join('\n');
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
    type: 'cinematic',
    title: 'Scene 01 — Series Circuit: Current Flows',
    async record(page) {
      await openBuilder(page);

      // Load the preset and let the components settle
      await sendAction(page, 'load-preset', { preset: 'series_basic' });
      await page.waitForTimeout(1200);

      // Fit the circuit neatly to the viewport
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Opening cinematic: smooth 360° orbit reveals the full series topology
      await playCinematic(page, 'orbit');

      // Trigger simulation — current starts flowing
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Cinematic atom dive: interpolated push to atomic tier, back to overview
      await playCinematic(page, 'atom');

      // Flip to electron-flow convention mid-scene for visual contrast
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(800);

      // Closing orbit — conventional current streams visible across the loop
      await playCinematic(page, 'orbit');
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-02-parallel',
    type: 'cinematic',
    title: 'Scene 02 — Parallel Circuit: Multiple Paths',
    async record(page) {
      await openBuilder(page);

      await sendAction(page, 'load-preset', { preset: 'parallel_basic' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Opening orbit — cinematic reveal of the branched topology
      await playCinematic(page, 'orbit');

      // Simulate — parallel branch currents light up
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Lattice traverse — camera sweeps laterally through the conductor lattice
      // showing the three separate electron streams side by side
      await playCinematic(page, 'lattice');

      // Atom dive — close-up of electron density inside a branch
      await playCinematic(page, 'atom');

      // Flip flow direction for visual contrast
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(800);

      // Pull back to overview with a final orbit
      await playCinematic(page, 'orbit');
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-03-overload',
    type: 'cinematic',
    title: 'Scene 03 — Overloaded Resistor: Thermal Failure',
    async record(page) {
      await openBuilder(page);

      // Deliberately dangerous circuit — FUSE engine will trigger failure
      await sendAction(page, 'load-preset', { preset: 'overload_demo' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Open wide orbit so the viewer sees the full circuit before it fails
      await playCinematic(page, 'orbit');

      // Start simulation — current surges, thermal accumulation begins
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Focus push: camera glides into the doomed resistor just as heat builds —
      // the failure event fires during this move for dramatic effect
      await playCinematic(page, 'focus');

      // Atom dive — watch electrons slam through the overloaded lattice / aftermath
      await playCinematic(page, 'atom');

      // Pull back to show the full scorched circuit
      await playCinematic(page, 'orbit');
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-04-mixed',
    type: 'cinematic',
    title: 'Scene 04 — Mixed Circuit: Series-Parallel Mastery',
    async record(page) {
      await openBuilder(page);

      await sendAction(page, 'load-preset', { preset: 'combination_advanced' });
      await page.waitForTimeout(1200);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Labels on — show component values in 3D space during the orbit reveal
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);

      // Orbit reveal with labels floating in 3D
      await playCinematic(page, 'orbit');

      // Simulate the advanced network
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Lattice sweep — show current threading through the complex series-parallel topology
      await playCinematic(page, 'lattice');

      // Atom dive — electrons in the mixed network
      await playCinematic(page, 'atom');

      // Toggle conventional/electron current for a second visual burst
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(800);

      // Closing orbit with labels still on, then clean outro
      await playCinematic(page, 'orbit');
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-05-promo',
    title: 'Scene 05 — Cinematic Promo Page (promo8)',
    async record(page) {
      // Navigate to the FUSE-focused promo page for the brand reveal
      const promoUrl = `${BASE_URL}/${PROMO_PAGE}`;
      await page.goto(promoUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(1500);

      // Let the intro scene (scene 0) animate in
      await page.waitForTimeout(3000);

      // Step through each of the 6 scenes by clicking the next-scene button,
      // pausing long enough for each scene's content to fully fade in and read.
      const PROMO_SCENE_DWELL_MS = 4500; // ms to linger on each promo page scene
      for (let i = 0; i < 5; i++) {
        await page.click('#btn-next');
        await page.waitForTimeout(PROMO_SCENE_DWELL_MS);
      }

      // Pause on the final CTA scene
      await page.waitForTimeout(2000);

      // Return to scene 0 for a clean loop
      await page.click('#btn-prev');
      await page.waitForTimeout(1500);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-06-fuse-showcase',
    title: 'Scene 06 — FUSE™ at Work: Fuse Blown by Overcurrent',
    async record(page) {
      await openBuilder(page);

      // Load the overload circuit — 24 V source through a 1 Ω resistor,
      // deliberately designed to trigger the FUSE™ thermal failure engine.
      await sendAction(page, 'load-preset', { preset: 'overload_demo' });
      await page.waitForTimeout(1400);

      // Fit to viewport and pause so the viewer can read the circuit layout.
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1200);

      // Toggle labels on so component values are visible during the zoom-in.
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);

      // Slow cinematic push toward the resistor before things go wrong.
      await smoothZoomIn(page, 9, 200);
      await page.waitForTimeout(800);

      // Start simulation — surge current begins, FUSE thermal model activates.
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(1800);

      // Continue zooming in as the resistor heats up.
      await smoothZoomIn(page, 7, 210);
      await page.waitForTimeout(3000);

      // Dive to the atomic level — watch electrons slam through the overloaded element.
      await smoothZoomIn(page, 9, 155);
      await page.waitForTimeout(4000);

      // Pull back to reveal the failure state on the full circuit.
      await smoothZoomOut(page, 18, 160);
      await page.waitForTimeout(2200);

      // Turn labels back off for a clean outro.
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(800);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-07-arena',
    title: 'Scene 07 — Component Arena: Live FUSE™ Analysis',
    async record(page) {
      // Navigate directly to the arena page — standalone layout, no React shell.
      // The arena uses WebGL and loads additional assets, so allow extra time.
      const arenaUrl = `${BASE_URL}/arena.html`;
      await page.goto(arenaUrl, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.waitForTimeout(2500);

      // Let the arena load and settle — give the WebGL scene time to initialise.
      await page.waitForTimeout(2000);

      // Pan the arena viewport slightly to show the 3-D canvas is live.
      await page.mouse.move(960, 540);
      await page.waitForTimeout(400);
      await page.mouse.move(1100, 480);
      await page.waitForTimeout(500);
      await page.mouse.move(820, 580);
      await page.waitForTimeout(500);
      await page.mouse.move(960, 540);
      await page.waitForTimeout(800);

      // Linger so the viewer can read the FUSE status badges and component cards.
      await page.waitForTimeout(5000);

      // Scroll down gently if the arena has a scrollable component list.
      await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
      await page.waitForTimeout(2000);

      // Scroll back up.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await page.waitForTimeout(1500);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-08-practice',
    title: 'Scene 08 — Practice Mode: W.I.R.E. Methodology',
    async record(page) {
      await openBuilder(page);

      // Fit the empty workspace and orient the camera before generating a problem.
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(800);

      // Load a clean series circuit as the base for the practice demonstration.
      await sendAction(page, 'load-preset', { preset: 'series_basic' });
      await page.waitForTimeout(1400);

      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(900);

      // Enable component labels so the viewer can read values during the walkthrough.
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(700);

      // Gentle zoom in to the workspace so the circuit fills the screen nicely.
      await smoothZoomIn(page, 6, 190);
      await page.waitForTimeout(1000);

      // Generate a fresh practice problem — triggers the W.I.R.E. practice overlay.
      await sendAction(page, 'generate-practice');
      await page.waitForTimeout(2500);

      // Simulate the circuit to show FUSE™ validating the student's wiring.
      await sendAction(page, 'run-simulation');
      await page.waitForTimeout(2500);

      // Zoom further in to show the current flowing through the practice circuit.
      await smoothZoomIn(page, 8, 160);
      await page.waitForTimeout(3000);

      // Pull back to the full overview so all components and labels are visible.
      await smoothZoomOut(page, 10, 170);
      await page.waitForTimeout(2000);

      // Turn labels off for the outro frame.
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
  // Validate --type flag
  const VALID_TYPES = ['all', 'cinematic', 'educational'];
  if (!VALID_TYPES.includes(FOOTAGE_TYPE)) {
    console.error(`❌  Unknown footage type "${FOOTAGE_TYPE}". Valid options: ${VALID_TYPES.join(', ')}`);
    process.exit(1);
  }

  let scenes = FOOTAGE_TYPE === 'all'
    ? SCENES
    : SCENES.filter((s) => s.type === FOOTAGE_TYPE);

  if (SCENE_FILTER) {
    scenes = scenes.filter((s) => s.id === SCENE_FILTER || s.id.includes(SCENE_FILTER));
  }

  if (scenes.length === 0) {
    const filterDesc = [
      FOOTAGE_TYPE !== 'all' && `type="${FOOTAGE_TYPE}"`,
      SCENE_FILTER            && `scene="${SCENE_FILTER}"`,
    ].filter(Boolean).join(', ') || `type="${FOOTAGE_TYPE}"`;
    console.error(`❌  No scene matched filter: ${filterDesc}`);
    console.error(`   Available: ${SCENES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  console.log('\n🎬  CircuiTry3D Circuit Bot — Promo Footage Recorder');
  console.log('─'.repeat(56));
  console.log(`  Source   : ${BASE_URL}`);
  console.log(`  Output   : promo-footage/`);
  console.log(`  Viewport : ${VIEWPORT.width}×${VIEWPORT.height}${PORTRAIT ? ' (portrait)' : ''}`);
  console.log(`  Type     : ${FOOTAGE_TYPE}`);
  console.log(`  Scenes   : ${scenes.map((s) => s.id).join(', ')}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      // Use ANGLE/SwiftShader for software-rendered WebGL so the 3D canvas
      // renders correctly on CI runners that have no hardware GPU.
      // '--use-gl=egl' silently produces black frames on GPU-less hosts.
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Prevent crashes caused by the limited /dev/shm size on CI runners.
      '--disable-dev-shm-usage',
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

    console.log('\n  Combine clips with ffmpeg:');
    console.log('    # 1. Create a concat list (FUSE-focused reel = scenes 05–08):');
    console.log('    ls promo-footage/scene-0{5,6,7,8}-*.webm | sed "s/^/file \'/" | sed "s/$/' \\\\"/" > /tmp/fuse-clips.txt');
    console.log('    # 2. Merge into the FUSE promo reel:');
    console.log("    ffmpeg -f concat -safe 0 -i /tmp/fuse-clips.txt -c copy promo-footage/fuse-promo-reel.webm");
    console.log('    # 3. Or merge ALL scenes into a full reel:');
    console.log('    ls promo-footage/scene-*.webm | sed "s/^/file \'/" | sed "s/$/' \\\\"/" > /tmp/clips.txt');
    console.log("    ffmpeg -f concat -safe 0 -i /tmp/clips.txt -c copy promo-footage/promo-reel.webm\n");
    console.log('  Import the individual .webm files into your video editor (Premiere, DaVinci, CapCut, etc.)');
    console.log('  and add title cards, music, and colour grading for the final promo reel.\n');
  } else {
    console.warn('  ⚠  No clips were saved — check the warnings above.\n');
  }
}

main().catch((err) => {
  console.error('❌  Bot failed:', err);
  process.exit(1);
});
