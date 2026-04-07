#!/usr/bin/env node

/**
 * Splash screen generator for CircuiTry3D.
 *
 * Renders the app icon (public/app-icon-no-text.svg) centred on the app
 * background colour (#0f172a) at every required Android drawable density.
 * This keeps the window-background flash on cold-start visually consistent
 * with the home screen launcher icon.
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = __dirname;
const ICON_SVG_PATH = join(ROOT, 'public', 'app-icon-no-text.svg');
const ANDROID_RES_DIR = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const BG = '#0f172a';

// Icon occupies this fraction of the shorter screen dimension.
const ICON_FIT_RATIO = 0.38;

// Splash screen configurations
const configs = [
  // Portrait orientations
  { width: 480,  height: 800,  dir: 'drawable-port-mdpi' },
  { width: 720,  height: 1280, dir: 'drawable-port-hdpi' },
  { width: 1080, height: 1920, dir: 'drawable-port-xhdpi' },
  { width: 1440, height: 2560, dir: 'drawable-port-xxhdpi' },
  { width: 1800, height: 3200, dir: 'drawable-port-xxxhdpi' },
  // Landscape orientations
  { width: 800,  height: 480,  dir: 'drawable-land-mdpi' },
  { width: 1280, height: 720,  dir: 'drawable-land-hdpi' },
  { width: 1920, height: 1080, dir: 'drawable-land-xhdpi' },
  { width: 2560, height: 1440, dir: 'drawable-land-xxhdpi' },
  { width: 3200, height: 1800, dir: 'drawable-land-xxxhdpi' },
  // Default (square — used by Capacitor SplashScreen as fallback)
  { width: 2732, height: 2732, dir: 'drawable' },
];

function parseSvgViewBox(svg) {
  const match = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!match) return { width: 512, height: 512 };
  const [minX, minY, width, height] = match[1].trim().split(/[\s,]+/).map(Number);
  if ([minX, minY, width, height].some(Number.isNaN) || width <= 0 || height <= 0) {
    return { width: 512, height: 512 };
  }
  return { minX, minY, width, height };
}

function normalizeSvg(svg) {
  return svg
    .replaceAll('strokeWidth=', 'stroke-width=')
    .replaceAll('strokeLinecap=', 'stroke-linecap=')
    .replaceAll('strokeLinejoin=', 'stroke-linejoin=')
    .replaceAll('stopColor=', 'stop-color=')
    .replaceAll('stopOpacity=', 'stop-opacity=');
}

function makeSplashHtml({ svg, screenW, screenH, iconW, iconH, bg }) {
  const left = Math.round((screenW - iconW) / 2);
  const top  = Math.round((screenH - iconH) / 2);
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      html, body { margin:0; padding:0; width:${screenW}px; height:${screenH}px; background:${bg}; overflow:hidden; }
      .icon { position:absolute; left:${left}px; top:${top}px; width:${iconW}px; height:${iconH}px; }
      .icon svg { width:100%; height:100%; display:block; }
    </style>
  </head>
  <body>
    <div class="icon">${svg}</div>
  </body>
</html>`;
}

async function generateSplashScreens() {
  console.log('🎨 CircuiTry3D Splash Screen Generator');
  console.log('  Source: public/app-icon-no-text.svg\n');

  const rawSvg = await readFile(ICON_SVG_PATH, 'utf8');
  const svg = normalizeSvg(rawSvg);
  const vb = parseSvgViewBox(svg);
  const iconAspect = vb.width / vb.height;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const { width, height, dir } of configs) {
    const shorter = Math.min(width, height);
    const iconSize = Math.round(shorter * ICON_FIT_RATIO);
    let iconW = iconSize;
    let iconH = Math.round(iconSize / iconAspect);
    if (iconH > iconSize) {
      iconH = iconSize;
      iconW = Math.round(iconSize * iconAspect);
    }

    console.log(`  ${dir} (${width}×${height}) — icon ${iconW}×${iconH}…`);

    await page.setViewportSize({ width, height });
    await page.setContent(makeSplashHtml({ svg, screenW: width, screenH: height, iconW, iconH, bg: BG }));
    await page.waitForTimeout(80);

    const screenshot = await page.screenshot({ type: 'png' });

    const outputDir = join(ANDROID_RES_DIR, dir);
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, 'splash.png'), screenshot);
  }

  await browser.close();

  console.log('\n✅ Splash screens updated in android/app/src/main/res/drawable-*/splash.png');
}

generateSplashScreens().catch((err) => {
  console.error('❌ Splash generation failed:', err);
  process.exit(1);
});
