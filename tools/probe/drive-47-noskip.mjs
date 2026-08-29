import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('pageerror', e => console.log('PAGEERROR ' + e.message.slice(0, 250)));
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
let card = false;
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1500);
  card = await page.evaluate(() => !!document.querySelector('.builder-tutorial-card--tour'));
  if (card) { console.log('tour card up at ' + ((i + 1) * 1.5) + 's'); break; }
}
if (!card) { console.log('TOUR CARD NEVER APPEARED'); await browser.close(); process.exit(1); }
console.log(JSON.stringify(await page.evaluate(() => {
  const skip = document.querySelector('.builder-tour-skip');
  const x = document.querySelector('.builder-tutorial-card--tour .builder-tutorial-close');
  const r = x?.getBoundingClientRect();
  const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  return {
    skipPillGone: !skip,
    cardCloseExists: !!x,
    cardCloseSize: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
    cardCloseClickable: !!x && (hit === x || x.contains(hit)),
  };
})));
// now click it and confirm the tour actually closes
await page.evaluate(() => document.querySelector('.builder-tutorial-card--tour .builder-tutorial-close')?.click());
await page.waitForTimeout(2500);
console.log('after close: tourGone=' + await page.evaluate(() => !document.querySelector('.builder-tutorial-layer')));
await browser.close();
