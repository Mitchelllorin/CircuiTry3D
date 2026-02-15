#!/usr/bin/env node
/**
 * Generates favicon + PWA + Android launcher icons from the landing-page logo.
 *
 * Uses Playwright (already in devDependencies) to render the SVG into square
 * icon canvases and exports all required PNG/ICO/SVG assets.
 */
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, '..');
const LOGO_SVG_PATH = join(ROOT, 'public', 'circuit-logo.svg');
const PUBLIC_DIR = join(ROOT, 'public');
const PUBLIC_ICONS_DIR = join(PUBLIC_DIR, 'icons');
const ANDROID_RES_DIR = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const ANDROID_MIPMAPS = [
  { folder: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
  { folder: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
  { folder: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
  { folder: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
  { folder: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
];

const BG = '#0f172a';

function normalizeSvg(svg) {
  // Normalize common JSX-style SVG attributes for safe inline HTML rendering.
  return svg
    .replaceAll('strokeWidth=', 'stroke-width=')
    .replaceAll('strokeLinecap=', 'stroke-linecap=')
    .replaceAll('strokeLinejoin=', 'stroke-linejoin=')
    .replaceAll('stopColor=', 'stop-color=')
    .replaceAll('stopOpacity=', 'stop-opacity=')
    .replaceAll('fontSize=', 'font-size=')
    .replaceAll('fontFamily=', 'font-family=')
    .replaceAll('fontWeight=', 'font-weight=')
    .replaceAll('textAnchor=', 'text-anchor=')
    .replaceAll('letterSpacing=', 'letter-spacing=')
    .replaceAll('xlinkHref=', 'xlink:href=');
}

function extractSvgInner(svg) {
  const match = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/i);
  if (!match) {
    throw new Error('Unable to extract inner SVG markup from logo.');
  }
  return match[1].trim();
}

function parseSvgViewBox(svg) {
  const openingTag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const viewBoxMatch = openingTag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBoxMatch) {
    return { minX: 0, minY: 0, width: 512, height: 512 };
  }

  const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return { minX: 0, minY: 0, width: 512, height: 512 };
  }

  const [minX, minY, width, height] = parts;
  return { minX, minY, width, height };
}

function makeIconHtml({
  svg,
  size,
  paddingRatio,
  backgroundColor = BG,
  frameColor = backgroundColor,
  roundMask = false,
}) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const bodyBackground = backgroundColor ?? 'transparent';
  const frameBackground = frameColor ? `background: ${frameColor};` : '';
  const frameMask = roundMask ? 'border-radius: 999px; overflow: hidden;' : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      body { background: ${bodyBackground}; display: grid; place-items: center; }
      .frame {
        width: ${inner}px;
        height: ${inner}px;
        display: grid;
        place-items: center;
        ${frameBackground}
        ${frameMask}
      }
      .frame svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      ${svg}
    </div>
  </body>
</html>`;
}

function buildFaviconSvg({ innerSvg, viewBox, paddingRatio = 0.08, size = 512 }) {
  const drawable = size * (1 - paddingRatio * 2);
  const scale = Math.min(drawable / viewBox.width, drawable / viewBox.height);
  const drawWidth = viewBox.width * scale;
  const drawHeight = viewBox.height * scale;
  const tx = (size - drawWidth) / 2;
  const ty = (size - drawHeight) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(6)}) translate(${-viewBox.minX} ${-viewBox.minY})">
    ${innerSvg}
  </g>
</svg>
`;
}

function pngsToIco(pngEntries) {
  // ICO structure: ICONDIR + ICONDIRENTRY[] + image data blobs.
  // We embed PNG images directly (supported by modern browsers/OSes).
  const count = pngEntries.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;

  const parts = [];
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);
  parts.push(header);

  const entryBuf = Buffer.alloc(count * entrySize);
  for (let i = 0; i < count; i++) {
    const { size, png } = pngEntries[i];
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    const base = i * entrySize;
    entryBuf.writeUInt8(w, base + 0);
    entryBuf.writeUInt8(h, base + 1);
    entryBuf.writeUInt8(0, base + 2); // palette
    entryBuf.writeUInt8(0, base + 3); // reserved
    entryBuf.writeUInt16LE(1, base + 4); // planes
    entryBuf.writeUInt16LE(32, base + 6); // bit count
    entryBuf.writeUInt32LE(png.length, base + 8); // bytes in resource
    entryBuf.writeUInt32LE(offset, base + 12); // image offset
    offset += png.length;
  }
  parts.push(entryBuf);

  for (const { png } of pngEntries) {
    parts.push(png);
  }
  return Buffer.concat(parts);
}

async function main() {
  console.log('🎨 Generating web + Android icons from landing logo…');

  const rawLogoSvg = await readFile(LOGO_SVG_PATH, 'utf8');
  const logoSvg = normalizeSvg(rawLogoSvg);
  const logoInner = extractSvgInner(logoSvg);
  const logoViewBox = parseSvgViewBox(logoSvg);

  await mkdir(PUBLIC_DIR, { recursive: true });
  await mkdir(PUBLIC_ICONS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const renderPng = async (
    size,
    { paddingRatio, backgroundColor = BG, frameColor = backgroundColor, roundMask = false }
  ) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      makeIconHtml({ svg: logoSvg, size, paddingRatio, backgroundColor, frameColor, roundMask })
    );
    // Small wait to ensure SVG filters/gradients are painted.
    await page.waitForTimeout(80);
    return await page.screenshot({
      type: 'png',
      omitBackground: backgroundColor === null,
    });
  };

  // Favicons
  const favicon16 = await renderPng(16, { paddingRatio: 0.02 });
  const favicon32 = await renderPng(32, { paddingRatio: 0.03 });
  const favicon48 = await renderPng(48, { paddingRatio: 0.04 });

  await writeFile(join(PUBLIC_DIR, 'favicon-16x16.png'), favicon16);
  await writeFile(join(PUBLIC_DIR, 'favicon-32x32.png'), favicon32);
  await writeFile(join(PUBLIC_DIR, 'favicon-48x48.png'), favicon48);

  const ico = pngsToIco([
    { size: 16, png: favicon16 },
    { size: 32, png: favicon32 },
    { size: 48, png: favicon48 },
  ]);
  await writeFile(join(PUBLIC_DIR, 'favicon.ico'), ico);

  // SVG favicon (scales crisply in modern browsers)
  const faviconSvg = buildFaviconSvg({
    innerSvg: logoInner,
    viewBox: logoViewBox,
    paddingRatio: 0.08,
  });
  await writeFile(join(PUBLIC_DIR, 'favicon.svg'), faviconSvg);

  // Apple touch icon
  const apple180 = await renderPng(180, { paddingRatio: 0.08 });
  await writeFile(join(PUBLIC_DIR, 'apple-touch-icon.png'), apple180);

  // PWA icons (filenames referenced by manifest.json)
  const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    const paddingRatio = size >= 192 ? 0.08 : 0.07;
    const png = await renderPng(size, { paddingRatio });
    await writeFile(join(PUBLIC_ICONS_DIR, `icon-${size}.png`), png);
  }

  // Android launcher icons
  for (const { folder, launcherSize, foregroundSize } of ANDROID_MIPMAPS) {
    const targetDir = join(ANDROID_RES_DIR, folder);
    await mkdir(targetDir, { recursive: true });

    const launcher = await renderPng(launcherSize, {
      paddingRatio: 0.06,
      backgroundColor: BG,
    });
    const launcherRound = await renderPng(launcherSize, {
      paddingRatio: 0.06,
      backgroundColor: null,
      frameColor: BG,
      roundMask: true,
    });
    const launcherForeground = await renderPng(foregroundSize, {
      paddingRatio: 0.12,
      backgroundColor: null,
    });

    await writeFile(join(targetDir, 'ic_launcher.png'), launcher);
    await writeFile(join(targetDir, 'ic_launcher_round.png'), launcherRound);
    await writeFile(join(targetDir, 'ic_launcher_foreground.png'), launcherForeground);
  }

  await browser.close();

  console.log('✅ Icons generated:');
  console.log('  - public/favicon.ico');
  console.log('  - public/favicon.svg');
  console.log('  - public/favicon-16x16.png / favicon-32x32.png / favicon-48x48.png');
  console.log('  - public/apple-touch-icon.png');
  console.log('  - public/icons/icon-{72,96,128,144,152,192,384,512}.png');
  console.log('  - android/app/src/main/res/mipmap-*/ic_launcher*.png');
}

main().catch((err) => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
