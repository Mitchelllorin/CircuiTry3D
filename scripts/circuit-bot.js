#!/usr/bin/env node
/**
 * CircuiTry3D Circuit Bot
 * =======================
 * A Playwright-powered automation bot that builds and simulates circuits,
 * recording cinematic footage suitable for a promo video.
 *
 * Scenes recorded:
 *   scene-01-series.webm             — Series circuit: current flows successfully
 *   scene-02-parallel.webm           — Parallel circuit: multiple electron paths
 *   scene-03-overload.webm           — Overloaded resistor: thermal failure (FUSE engine)
 *   scene-04-mixed.webm              — Mixed series-parallel: advanced mastery
 *   scene-05-3d-build.webm           — 3D cinematic builder tour: atomic zoom + fly-through
 *   scene-06-arena.webm              — Arena: 3D component battle & FUSE failure analysis
 *   scene-07-new-components.webm     — Relay, Voltage Regulator & Circuit Breaker showcase
 *   scene-08-component-showcase.webm — Cinematic promo: each component appears one-by-one
 *                                       with its 3D label & metrics, then dissolves away
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
    id: 'scene-05-3d-build',
    title: 'Scene 05 — 3D Builder: Cinematic Fly-Through',
    async record(page) {
      await openBuilder(page);

      // Start with the advanced combination circuit to maximise visual density
      await sendAction(page, 'load-preset', { preset: 'combination_advanced' });
      await page.waitForTimeout(1500);
      await sendAction(page, 'fit-screen');
      await page.waitForTimeout(1000);

      // Labels on — all component values floating in 3D during the fly-through
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);

      // Opening orbit — camera circles the full lit-up network
      await playCinematic(page, 'orbit');

      // Run simulation — all electron streams light up simultaneously
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Focus push: glide into a single component for a hero close-up
      await playCinematic(page, 'focus');

      // Lattice sweep: dolly laterally across the conductor lattice
      await playCinematic(page, 'lattice');

      // Atom dive: deep zoom into the electron cloud, then pull back
      await playCinematic(page, 'atom');

      // Toggle conventional/electron current for a second visual burst
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(800);

      // Final orbit — labels still on for the closing wide shot
      await playCinematic(page, 'orbit');

      // Labels off for a clean fade-out
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);
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
      await page.waitForTimeout(800);

      // Labels on — show Relay (K), VR, and CB designators in 3D space
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);

      // Orbit reveal — camera circles the new component family
      await playCinematic(page, 'orbit');

      // Start simulation — relay switches, VR regulates, CB trips
      await sendAction(page, 'run-simulation');
      await verifyCanvas(page);
      await page.waitForTimeout(1500);

      // Focus push: glide into the relay coil / CB bimetallic strip
      await playCinematic(page, 'focus');

      // Atom dive — electrons through relay conductor geometry
      await playCinematic(page, 'atom');

      // Toggle current flow to highlight the regulated output rail
      await sendAction(page, 'toggle-current-flow');
      await page.waitForTimeout(800);

      // Closing orbit — labels still on, full component family in view
      await playCinematic(page, 'orbit');

      // Labels off for a clean outro
      await sendAction(page, 'toggle-labels');
      await page.waitForTimeout(600);
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'scene-08-component-showcase',
    title: 'Scene 08 — Component Showcase: Cinematic Promo',
    async record(page) {
      await openBuilder(page);

      /**
       * Components to feature, ordered for visual variety.
       * Component labels (identifier + value) are enabled by default in the
       * builder (the `showLabels` variable initialises to `true` in legacy.html)
       * and are not toggled off during this scene so every component's name
       * and metrics float in 3D space during the cinematic push-in.
       */
      const SHOWCASE = [
        { type: 'battery',           label: 'Battery'            },
        { type: 'resistor',          label: 'Resistor'           },
        { type: 'led',               label: 'LED'                },
        { type: 'capacitor',         label: 'Capacitor'          },
        { type: 'inductor',          label: 'Inductor'           },
        { type: 'switch',            label: 'Switch'             },
        { type: 'fuse',              label: 'Fuse'               },
        { type: 'relay',             label: 'Relay'              },
        { type: 'motor',             label: 'Motor'              },
        { type: 'mosfet',            label: 'MOSFET'             },
        { type: 'opamp',             label: 'Op-Amp'             },
        { type: 'voltage-regulator', label: 'Voltage Regulator'  },
      ];

      for (const comp of SHOWCASE) {
        // ── Disappear: clear the previous component ───────────────────────
        await sendAction(page, 'clear-workspace');
        await page.waitForTimeout(600);

        // ── Appear: add this component into the workspace ─────────────────
        // builder:add-component is handled as a top-level message type (not
        // via invoke-action), so we post directly rather than via sendAction.
        await page.evaluate((compType) => {
          window.postMessage(
            { type: 'builder:add-component', payload: { componentType: compType } },
            '*',
          );
        }, comp.type);
        await page.waitForTimeout(800);

        // The component is in drag-mode after addComponent().
        // A single click on the canvas fires handleMouseUp → handleRelease(),
        // which snaps the component to grid and exits drag mode.
        await page.mouse.click(
          Math.round(VIEWPORT.width  / 2),
          Math.round(VIEWPORT.height / 2),
        );
        await page.waitForTimeout(500);

        // ── Frame: center the camera on the lone component ────────────────
        await sendAction(page, 'fit-screen');
        await page.waitForTimeout(800);

        // ── Cinematic: push-in reveal with label + metrics, then pull back ─
        // The 'focus' preset pushes toward cameraTarget (set to the
        // component center by fit-screen) and pulls back — perfect for a
        // per-component spotlight shot.
        await playCinematic(page, 'focus');

        // Brief hold at the end of pull-back before the next component appears
        await page.waitForTimeout(400);
      }

      // ── Outro: final orbit on the last component before fade ──────────
      await playCinematic(page, 'orbit');
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
