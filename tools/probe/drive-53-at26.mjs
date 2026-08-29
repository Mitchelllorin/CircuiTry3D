// Judge one live icon at the size it is actually worn.
//
// The contact sheet (drive-48) shows every icon at 150px AND 26px, but 26px is
// too small to LOOK at in a composite. This pulls one icon's cached dataURL out
// of the running app, draws it at exactly 26px, then blows that up with
// smoothing OFF - so what you inspect is the real downscale, magnified, rather
// than a fresh high-res render that hides everything the downscale destroys.
//
//   node tools/probe/drive-53-at26.mjs textbook
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';

const want = (process.argv[2] || 'textbook').toLowerCase();
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => document.querySelectorAll('.mode-icon--3d').length) >= 5) break;
}

const out = await page.evaluate(async (want) => {
  const img = [...document.querySelectorAll('.mode-icon--3d')].find(i =>
    (i.closest('button,a')?.getAttribute('aria-label') || '').toLowerCase().includes(want));
  if (!img) return null;
  const im = new Image(); im.src = img.src; await im.decode();
  const SMALL = 26, ZOOM = 9, BIG = SMALL * ZOOM;
  const c = document.createElement('canvas');
  c.width = BIG * 2 + 36; c.height = BIG + 24;
  const x = c.getContext('2d');
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, c.width, c.height);
  // Left: honest 26px, magnified with nearest neighbour.
  const t = document.createElement('canvas'); t.width = t.height = SMALL;
  t.getContext('2d').drawImage(im, 0, 0, SMALL, SMALL);
  x.imageSmoothingEnabled = false;
  x.drawImage(t, 12, 12, BIG, BIG);
  // Right: the full-resolution render, for comparison.
  x.imageSmoothingEnabled = true;
  x.drawImage(im, BIG + 24, 12, BIG, BIG);
  return c.toDataURL('image/png');
}, want);

if (!out) { console.log('no icon matching ' + want); }
else {
  fs.writeFileSync('tools/probe/at26.png', Buffer.from(out.split(',')[1], 'base64'));
  console.log('saved at26.png  (left = real 26px magnified, right = full res)');
}
await browser.close();
