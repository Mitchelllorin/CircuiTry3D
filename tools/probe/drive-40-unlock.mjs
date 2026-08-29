import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();          // no dismissal flag = first-timer, tour runs
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });

const frame = () => page.frames().find(f => /legacy\.html/.test(f.url())) || page.mainFrame();
const lock = () => frame().evaluate('typeof isCircuitEditLocked === "undefined" ? "n/a" : isCircuitEditLocked');

for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2000);
  if (await page.evaluate(() => !!document.querySelector('.builder-tour-skip'))) break;
}
console.log('DURING TOUR   tourUp=' + await page.evaluate(() => !!document.querySelector('.builder-tour-skip')) +
            '  editLocked=' + await lock() +
            '  pill=' + await page.evaluate(() => !!document.querySelector('.builder-payoff-guard')));

await page.evaluate(() => document.querySelector('.builder-tour-skip')?.click());
await page.waitForTimeout(3000);
console.log('AFTER SKIP    tourUp=' + await page.evaluate(() => !!document.querySelector('.builder-tour-skip')) +
            '  editLocked=' + await lock() +
            '  pill=' + await page.evaluate(() => !!document.querySelector('.builder-payoff-guard')));
await browser.close();
