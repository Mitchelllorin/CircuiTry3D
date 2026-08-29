import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(12000);
// find the 3D icon img inside the mode bar
const info = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('.workspace-mode-bar img')];
  return imgs.map(i => ({ cls: i.className, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight,
                          box: i.getBoundingClientRect().toJSON(), src: i.src.slice(0, 40) }));
});
console.log(JSON.stringify(info, null, 2));
const el = await page.$('.workspace-mode-bar img');
if (el) await el.screenshot({ path: 'tools/probe/wrench-now.png' });
// also dump the raw dataURL at full res
const url = await page.evaluate(() => document.querySelector('.workspace-mode-bar img')?.src || '');
if (url.startsWith('data:')) {
  const fs = await import('fs');
  fs.writeFileSync('tools/probe/wrench-raw.png', Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
