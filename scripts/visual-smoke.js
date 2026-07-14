#!/usr/bin/env node

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const USE_LOCAL = process.argv.includes('--local');
const BASE_URL = USE_LOCAL ? 'http://localhost:4173' : 'https://circuitry3d.app';
const OUTPUT_DIR = process.env.SMOKE_OUTPUT_DIR || '/tmp/ct3d-visual-smoke';

const ROUTES = [
  { id: 'home', path: '/', expectCanvas: false },
  { id: 'builder-route', path: '/#/app', expectCanvas: false },
  { id: 'practice-route', path: '/#/practice', expectCanvas: false },
  { id: 'pricing-route', path: '/#/pricing', expectCanvas: false },
  { id: 'legacy-builder', path: '/legacy.html', expectCanvas: true },
  { id: 'arena', path: '/arena.html', expectCanvas: true }
];

async function detectBasePrefix() {
  const candidates = ['', '/CircuiTry3D'];
  for (const candidate of candidates) {
    const probeUrl = `${BASE_URL}${candidate}/`;
    try {
      const response = await fetch(probeUrl, { method: 'GET', redirect: 'manual' });
      if (response.ok || [301, 302, 307, 308].includes(response.status)) {
        return candidate;
      }
    } catch {
      // keep probing
    }
  }
  return '';
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const preferredBasePrefix = await detectBasePrefix();
  const fallbackBasePrefix = preferredBasePrefix === '/CircuiTry3D' ? '' : '/CircuiTry3D';
  console.log(`Using preferred base prefix: ${preferredBasePrefix || '/'}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu-sandbox'
    ]
  });

  const failures = [];

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const prefixesToTry = [preferredBasePrefix, fallbackBasePrefix]
      .filter((value, index, array) => array.indexOf(value) === index);
    let targetUrl = `${BASE_URL}${prefixesToTry[0]}${route.path}`;
    try {
      let response = null;
      let loaded = false;
      let lastStatus = null;
      for (const prefix of prefixesToTry) {
        targetUrl = `${BASE_URL}${prefix}${route.path}`;
        response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        if (response && response.status() >= 400) {
          lastStatus = response.status();
          continue;
        }
        loaded = true;
        break;
      }
      if (!loaded && lastStatus) {
        throw new Error(`HTTP ${lastStatus}`);
      }
      if (route.expectCanvas) {
        await page.waitForSelector('canvas', { timeout: 20_000 });
      }
      await page.waitForTimeout(route.expectCanvas ? 2500 : 800);
      await page.screenshot({ path: join(OUTPUT_DIR, `${route.id}.png`), fullPage: false });
      console.log(`✓ ${targetUrl}`);
    } catch (error) {
      failures.push(`${targetUrl} — ${error.message}`);
      console.error(`✗ ${targetUrl} — ${error.message}`);
      try {
        await page.screenshot({ path: join(OUTPUT_DIR, `${route.id}-error.png`), fullPage: false });
      } catch {
        // no-op
      }
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (failures.length > 0) {
    throw new Error(`Visual smoke failures:\n${failures.join('\n')}`);
  }

  console.log('\nAll visual smoke checks passed.');
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
