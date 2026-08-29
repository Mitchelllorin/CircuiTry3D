import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';
const which = process.argv[2] || 'Build';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
let src = '';
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1500);
  src = await page.evaluate((w) => {
    const el = [...document.querySelectorAll('.mode-icon--3d')]
      .find(i => (i.closest('button,a')?.getAttribute('aria-label') || '').startsWith(w));
    return el?.src || '';
  }, which);
  if (src.startsWith('data:')) break;
}
if (!src) { console.log('not found: ' + which); await browser.close(); process.exit(1); }
fs.writeFileSync('tools/probe/one.png', Buffer.from(src.split(',')[1], 'base64'));
console.log('saved one.png for ' + which);
await browser.close();
