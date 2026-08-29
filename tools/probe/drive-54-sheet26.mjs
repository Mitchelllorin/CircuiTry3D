// The whole icon set at the size it is actually worn, magnified so you can see
// what the downscale did to it.
//
// drive-48 shows 150px and 26px side by side, but 26px in a strip is too small to
// judge - which is how a wrench that "looked fine" shipped as a bar twice. This
// draws every live icon at exactly 26px, then blows THAT up with smoothing off,
// so what you are looking at is the real bitmap the nav bar shows.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';

const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
let n = 0;
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(1500);
  n = await page.evaluate(() => document.querySelectorAll('.mode-icon--3d').length);
  if (n >= 13) break;
}
console.log('3D icons rendered: ' + n);

const sheet = await page.evaluate(async () => {
  const imgs = [...document.querySelectorAll('.mode-icon--3d')];
  const labels = imgs.map(i => (i.closest('button,a')?.getAttribute('aria-label') || '?').replace(' mode', ''));
  const SMALL = 26, ZOOM = 6, CELL = SMALL * ZOOM, PAD = 10, COLS = 7;
  const rows = Math.ceil(imgs.length / COLS);
  const c = document.createElement('canvas');
  c.width = COLS * (CELL + PAD) + PAD;
  c.height = rows * (CELL + PAD + 22) + PAD;
  const x = c.getContext('2d');
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, c.width, c.height);
  const t = document.createElement('canvas'); t.width = t.height = SMALL;
  const tx = t.getContext('2d');
  for (let k = 0; k < imgs.length; k++) {
    const im = new Image(); im.src = imgs[k].src; await im.decode();
    tx.clearRect(0, 0, SMALL, SMALL);
    tx.drawImage(im, 0, 0, SMALL, SMALL);
    const col = k % COLS, row = (k / COLS) | 0;
    const ox = PAD + col * (CELL + PAD);
    const oy = PAD + row * (CELL + PAD + 22);
    x.imageSmoothingEnabled = false;
    x.drawImage(t, ox, oy, CELL, CELL);
    x.fillStyle = '#88ccff'; x.font = '14px sans-serif'; x.textAlign = 'center';
    x.fillText(labels[k], ox + CELL / 2, oy + CELL + 16);
  }
  return c.toDataURL('image/png');
});
fs.writeFileSync('tools/probe/sheet26.png', Buffer.from(sheet.split(',')[1], 'base64'));
console.log('saved sheet26.png');
await browser.close();
