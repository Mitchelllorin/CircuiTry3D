// The payoff BANNER is deleted. Two things must be true:
//   1. it never appears - not on boot, not after the tour's X
//   2. the showcase CIRCUIT still loads (load-payoff shared that code path)
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(14000);

const look = async (label) => {
  const banner = await page.evaluate(() => !!document.querySelector('.current-flow-payoff-strip'));
  const fr = page.frames().find(f => /legacy\.html/.test(f.url()));
  const parts = fr ? await fr.evaluate(() => (typeof components !== 'undefined' ? components.length : -1)).catch(()=>-1) : -1;
  const wires = fr ? await fr.evaluate(() => (typeof wires !== 'undefined' ? wires.length : -1)).catch(()=>-1) : -1;
  const locked = await page.evaluate(() => {
    const s = document.querySelector('.builder-shell');
    return s ? s.getAttribute('data-circuit-locked') : null;
  });
  console.log(`${label.padEnd(26)} banner=${banner ? 'PRESENT ***' : 'gone'}  components=${parts}  wires=${wires}  locked=${locked}`);
  return banner;
};

await look('on boot');
await page.waitForSelector('.builder-tutorial-close', { timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(1500);
await look('tour open');
const w = await page.evaluate(() => { const x = document.querySelector('.builder-tutorial-close');
  if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left+r.width/2, y: r.top+r.height/2 }; });
if (w) { await page.touchscreen.tap(w.x, w.y); }
for (const t of [1500, 5000, 12000]) { await page.waitForTimeout(t === 1500 ? 1500 : 3500); await look(`after X +${t}ms`); }
await browser.close();
