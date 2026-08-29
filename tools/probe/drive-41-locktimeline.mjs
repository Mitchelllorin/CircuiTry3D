import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });

const frame = () => page.frames().find(f => /legacy\.html/.test(f.url())) || page.mainFrame();
const lock = () => frame().evaluate('typeof isCircuitEditLocked === "undefined" ? "n/a" : isCircuitEditLocked');
const banner = () => page.evaluate(() => !!document.querySelector('.current-flow-payoff-strip'));
const tour = () => page.evaluate(() => !!document.querySelector('.builder-tour-skip'));

for (let i = 0; i < 12; i++) { await page.waitForTimeout(2000); if (await tour()) break; }
console.log(`t=0    tour=${await tour()} lock=${await lock()} banner=${await banner()}  <- before skip`);
await page.evaluate(() => document.querySelector('.builder-tour-skip')?.click());
for (let s = 1; s <= 20; s++) {
  await page.waitForTimeout(1000);
  console.log(`t=${s}s   tour=${await tour()} lock=${await lock()} banner=${await banner()}`);
}
await browser.close();
