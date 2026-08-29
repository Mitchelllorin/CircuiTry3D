import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(14000);
for (const theme of ['dark', 'light']) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(600);
  const boxed = await page.evaluate(() => {
    const bar = document.querySelector('.unified-action-bar');
    if (!bar) return 'no bar';
    return [...bar.querySelectorAll('button')].map(el => {
      const c = getComputedStyle(el);
      const hasBox = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0;
      return hasBox ? { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0,12),
                        bg: c.backgroundColor, bgImg: c.backgroundImage.slice(0,30), border: c.borderTopWidth } : null;
    }).filter(Boolean);
  });
  console.log(theme.toUpperCase() + ': ' + (boxed.length ? JSON.stringify(boxed) : 'no containers'));
  const bar = await page.$('.unified-action-bar');
  if (bar) await bar.screenshot({ path: `tools/probe/bar-${theme}.png` });
}
await browser.close();
