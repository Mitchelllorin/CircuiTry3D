import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('console', m => { const t = m.text(); if (/icon render failed/i.test(t)) console.log('[c] ' + t.slice(0,300)); });
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
let n = 0;
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1500);
  n = await page.evaluate(() => document.querySelectorAll('.mode-icon--3d').length);
  if (n >= 5) break;
}
console.log('3D icons rendered: ' + n);
const sheet = await page.evaluate(async () => {
  const imgs = [...document.querySelectorAll('.mode-icon--3d')];
  const labels = imgs.map(i => i.closest('button,a')?.getAttribute('aria-label') || '?');
  const BIG = 150, SMALL = 26, PAD = 12;
  const c = document.createElement('canvas');
  c.width = imgs.length * (BIG + PAD) + PAD;
  c.height = BIG + PAD * 2 + SMALL + 34;
  const x = c.getContext('2d');
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, c.width, c.height);
  for (let k = 0; k < imgs.length; k++) {
    const im = new Image(); im.src = imgs[k].src;
    await im.decode();
    const ox = PAD + k * (BIG + PAD);
    x.drawImage(im, ox, PAD, BIG, BIG);
    x.drawImage(im, ox + (BIG - SMALL) / 2, PAD + BIG + 8, SMALL, SMALL);
    x.fillStyle = '#88ccff'; x.font = '13px sans-serif'; x.textAlign = 'center';
    x.fillText(labels[k].replace(' mode', ''), ox + BIG / 2, PAD + BIG + SMALL + 26);
  }
  return c.toDataURL('image/png');
});
fs.writeFileSync('tools/probe/icon-sheet.png', Buffer.from(sheet.split(',')[1], 'base64'));
console.log('saved icon-sheet.png');
await browser.close();
