#!/usr/bin/env node
/**
 * Captures a portrait screenshot of the CircuiTry3D app for PR review comments.
 *
 * Designed to run inside the PR preview workflow after `npm run build` and
 * `npm run preview` are up.  Saves a single 412 × 915 (portrait Android phone)
 * PNG to OUTPUT_FILE.
 *
 * Environment variables:
 *   BASE_URL    – Base URL of the preview server (default: http://localhost:4173)
 *   BASE_PATH   – App base path as built  (default: /)
 *   OUTPUT_FILE – Where to write the PNG   (default: dist/pr-portrait.png)
 *
 * Usage:
 *   BASE_PATH=/CircuiTry3D/pr-preview/pr-42/ \
 *   OUTPUT_FILE=dist/pr-portrait.png \
 *   node scripts/capture-pr-portrait.js
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const BASE_URL    = process.env.BASE_URL    || 'http://localhost:4173';
const BASE_PATH   = process.env.BASE_PATH   || '/';
const OUTPUT_FILE = process.env.OUTPUT_FILE || join(ROOT, 'dist', 'pr-portrait.png');

// Primary design viewport — portrait Android phone.
// 412×915 is the reference viewport used throughout the project (see .github/copilot-instructions.md).
const VIEWPORT = { width: 412, height: 915 };

async function main() {
  // Navigate directly to legacy.html (the 3-D circuit builder) so the WebGL
  // canvas renders fully in the headless Chromium process without the extra
  // React → Builder.tsx → iframe indirection that produces a blank canvas.
  // BASE_PATH ends with '/', so strip a leading '/' from 'legacy.html' to
  // avoid a double-slash.
  const builderUrl = `${BASE_URL}${BASE_PATH}legacy.html`;
  console.log(`📸  Capturing PR portrait screenshot from ${builderUrl}`);

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Enable software-rendered WebGL so the 3-D canvas can render in CI
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--enable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Wait for web fonts to finish loading so text renders correctly in the screenshot
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    // Allow time for iframe content and any CSS animations to settle
    await page.waitForTimeout(3000);
  } catch (err) {
    console.warn(`⚠  Navigation timed out or failed: ${err.message}`);
    console.warn('   Proceeding with whatever has rendered so far.');
  }

  const png = await page.screenshot({ type: 'png', fullPage: false });
  await writeFile(OUTPUT_FILE, png);
  console.log(`✓  Screenshot saved → ${OUTPUT_FILE}`);

  await browser.close();
}

main().catch((err) => {
  console.error('❌  Screenshot capture failed:', err);
  process.exit(1);
});
