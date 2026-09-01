// What is 404ing on boot? The rounds walk reports two per page but not which.
import { chromium } from 'playwright';
import { CHROME, TOUR } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, hash] of [['LANDING','#/'], ['BUILDER','#/app']]) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch {} }, TOUR);
  const page = await ctx.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => bad.push(`FAILED ${r.failure()?.errorText} ${r.url()}`));
  await page.goto(`http://localhost:3000/${hash}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(12000);
  console.log(`\n=== ${name} ===\n` + (bad.length ? [...new Set(bad)].join('\n') : '(none)'));
  await ctx.close();
}
await browser.close();
