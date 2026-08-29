import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(14000);
console.log(JSON.stringify(await page.evaluate(() => {
  const bar = document.querySelector('.unified-action-bar');
  if (!bar) return 'no bar';
  return [...bar.children].map(el => {
    const c = getComputedStyle(el);
    const boxed = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(c.borderTopWidth) > 0;
    return { tag: el.tagName, cls: el.className, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0,14),
             boxed, bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor, radius: c.borderTopLeftRadius };
  }).filter(r => r.boxed);
}), null, 1));
await browser.close();
