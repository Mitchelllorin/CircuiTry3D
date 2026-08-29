import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(14000);
// dismiss the tour so the action bar is revealed
await page.evaluate(() => document.querySelector('.builder-tutorial-card--tour .builder-tutorial-close')?.click());
await page.waitForTimeout(3500);
const bar = await page.$('.unified-action-bar');
if (bar) { await bar.screenshot({ path: 'tools/probe/bar.png' }); console.log('saved bar.png'); }
else console.log('no .unified-action-bar');
console.log(JSON.stringify(await page.evaluate(() => {
  const out = [];
  for (const sel of ['.unified-action-bar', '.quick-add-bar', '.quick-add-btn', '.quick-add-btn-symbol', '.edge-action-btn']) {
    const el = document.querySelector(sel);
    if (!el) { out.push([sel, 'ABSENT']); continue; }
    const c = getComputedStyle(el);
    out.push([sel, { bg: c.backgroundColor, bgImg: c.backgroundImage.slice(0,40), border: c.borderTopWidth + ' ' + c.borderTopColor,
                     radius: c.borderTopLeftRadius, shadow: c.boxShadow.slice(0,50), overflow: c.overflow, filter: c.filter.slice(0,40) }]);
  }
  return out;
}), null, 1));
await browser.close();
