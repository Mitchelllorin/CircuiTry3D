#!/usr/bin/env node
/**
 * Generates Play Store and Android launcher icons from the app-icon SVG.
 *
 * C = blue (#3b82f6)
 * T = orange (#f97316)
 * 3D = green (#22c55e)
 *
 * Uses Playwright (already in devDependencies) to render the SVG into square
 * icon canvases and exports all required PNG assets.
 *
 * Usage:
 *   node scripts/generate-play-store-icons.js
 */
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, '..');
const ICON_SVG_PATH = join(ROOT, 'public', 'app-icon.svg');
const PLAY_STORE_ICONS_DIR = join(ROOT, 'play-store-assets', 'icons');
const ANDROID_RES_DIR = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const BG = '#0f172a';

/** Android adaptive-icon mipmap specs */
const ANDROID_MIPMAPS = [
  { folder: 'mipmap-mdpi',    launcherSize: 48,  foregroundSize: 108 },
  { folder: 'mipmap-hdpi',    launcherSize: 72,  foregroundSize: 162 },
  { folder: 'mipmap-xhdpi',   launcherSize: 96,  foregroundSize: 216 },
  { folder: 'mipmap-xxhdpi',  launcherSize: 144, foregroundSize: 324 },
  { folder: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
];

/**
 * Load Lato Black from the system font directory and return a CSS
 * @font-face block embedding the font as a base64 data URI.  Falls back to an
 * empty string if the font file is not found (non-Linux environments).
 *
 * Lato Black (weight 900) matches the logo wordmark's squared geometric style,
 * providing clean, heavy letterforms consistent with the brand identity.
 */
async function buildFontFaceCSS() {
  const LATO_BLACK_PATH = '/usr/share/fonts/truetype/lato/Lato-Black.ttf';
  try {
    const fontData = await readFile(LATO_BLACK_PATH);
    const b64 = fontData.toString('base64');
    return `@font-face {
  font-family: 'LatoBlack';
  src: url('data:font/truetype;base64,${b64}') format('truetype');
  font-weight: 900;
  font-style: normal;
}`;
  } catch {
    console.warn('  ⚠  Lato-Black.ttf not found – falling back to system fonts');
    return '';
  }
}

function makeIconHtml({ svgContent, size, fitRatio, fontFaceCSS, backgroundColor = BG, roundMask = false }) {
  const clampedFitRatio = Math.max(0.1, Math.min(1, fitRatio));
  const contentSize = Math.max(1, Math.round(size * clampedFitRatio));
  const bodyBackground = backgroundColor ?? 'transparent';
  const frameMask = roundMask ? 'border-radius: 999px; overflow: hidden;' : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      ${fontFaceCSS}
      html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; }
      body { background: ${bodyBackground}; display: grid; place-items: center; }
      .frame {
        width: ${contentSize}px;
        height: ${contentSize}px;
        display: grid;
        place-items: center;
        ${frameMask}
      }
      .frame svg { width: 100%; height: 100%; display: block; }
    </style>
  </head>
  <body>
    <div class="frame">
      ${svgContent}
    </div>
  </body>
</html>`;
}

async function main() {
  console.log('🎨 Generating Play Store and Android icons from app-icon.svg…');

  const svgContent = await readFile(ICON_SVG_PATH, 'utf8');
  const fontFaceCSS = await buildFontFaceCSS();

  await mkdir(PLAY_STORE_ICONS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    console.error('❌ Could not launch Chromium. Run: npx playwright install chromium');
    throw err;
  });
  const page = await browser.newPage();

  /**
   * Render the SVG into a square PNG of the given size.
   * @param {number} size
   * @param {{ fitRatio: number, backgroundColor?: string|null, roundMask?: boolean }} opts
   */
  const renderPng = async (size, { fitRatio, backgroundColor = BG, roundMask = false }) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      makeIconHtml({ svgContent, size, fitRatio, fontFaceCSS, backgroundColor, roundMask })
    );
    await page.waitForLoadState('networkidle');
    return page.screenshot({
      type: 'png',
      omitBackground: backgroundColor === null,
    });
  };

  // ── Play Store high-res icon (512×512) ─────────────────────────────────
  const playStore512 = await renderPng(512, { fitRatio: 1 });
  await writeFile(join(PLAY_STORE_ICONS_DIR, 'app-icon-512.png'), playStore512);
  console.log('  ✓ play-store-assets/icons/app-icon-512.png');

  // ── Android adaptive launcher icons ────────────────────────────────────
  for (const { folder, launcherSize, foregroundSize } of ANDROID_MIPMAPS) {
    const targetDir = join(ANDROID_RES_DIR, folder);
    await mkdir(targetDir, { recursive: true });

    const launcher = await renderPng(launcherSize, {
      fitRatio: 0.88,
      backgroundColor: BG,
    });
    const launcherRound = await renderPng(launcherSize, {
      fitRatio: 0.88,
      backgroundColor: null,
      roundMask: true,
    });
    const launcherForeground = await renderPng(foregroundSize, {
      fitRatio: 0.72,
      backgroundColor: null,
    });

    await writeFile(join(targetDir, 'ic_launcher.png'), launcher);
    await writeFile(join(targetDir, 'ic_launcher_round.png'), launcherRound);
    await writeFile(join(targetDir, 'ic_launcher_foreground.png'), launcherForeground);
    console.log(`  ✓ android/…/${folder}/ic_launcher*.png`);
  }

  await browser.close();

  console.log('');
  console.log('✅ Done! Icons generated:');
  console.log('  play-store-assets/icons/app-icon-512.png');
  console.log('  android/app/src/main/res/mipmap-*/ic_launcher*.png');
}

main().catch((err) => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
