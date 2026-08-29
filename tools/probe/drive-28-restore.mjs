import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
// Simulate the user's phone: they dismissed the tour under the OLD key.
await ctx.addInitScript(() => {
  try { localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v1', '1'); } catch {}
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(2500);
  const s = await page.evaluate(() => ({
    tour: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
    text: document.querySelector('.builder-tutorial-text')?.innerText?.replace(/\s+/g,' ').slice(0,50) || null,
    coloured: document.querySelectorAll('.builder-tutorial-text .ct-term').length,
    oldTutorialGone: document.querySelectorAll('[class*="interactive-tutorial"]').length === 0,
  }));
  console.log(`t+${((i+1)*2.5).toFixed(0)}s`, JSON.stringify(s));
  if (s.text) break;
}
await browser.close();
