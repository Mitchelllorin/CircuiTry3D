import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('console', m => { const t = m.text(); if (/CT3D|icon/i.test(t)) console.log('[c] ' + t.slice(0,200)); });
page.on('pageerror', e => console.log('PAGEERROR ' + e.message.slice(0,250)));
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2000);
  const got = await page.evaluate(() => document.querySelector('.mode-icon--3d')?.src || '');
  if (got.startsWith('data:')) {
    fs.writeFileSync('tools/probe/icon3d-live.png', Buffer.from(got.split(',')[1], 'base64'));
    console.log('SAVED icon3d-live.png after ' + ((i+1)*2) + 's');
    await browser.close(); process.exit(0);
  }
}
console.log('no .mode-icon--3d after 24s. tabs: ' +
  await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].map(t => t.getAttribute('aria-label')).join(', ')));
await browser.close();
