// The F.U.S.E. watermark is sitting on top of the footer's legal row.
// Measure both boxes and the actual overlap, at phone size.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(5000);
const f = page.frames().find(x => /landing\.html/.test(x.url()));
console.log(JSON.stringify(await f.evaluate(() => {
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left),
             right: Math.round(r.right), h: Math.round(r.height) }; };
  const fuse = box('#fuse-watermark'), nav = box('.landing-footer nav'),
        credit = box('.landing-credit'), footer = box('.landing-footer');
  const overlapV = fuse && nav ? Math.min(fuse.bottom, nav.bottom) - Math.max(fuse.top, nav.top) : null;
  const overlapH = fuse && nav ? Math.min(fuse.right, nav.right) - Math.max(fuse.left, nav.left) : null;
  return { viewportH: innerHeight, fuse, legalRow: nav, credit, footer,
    verticalOverlapPx: overlapV, horizontalOverlapPx: overlapH,
    COLLIDING: overlapV > 0 && overlapH > 0 };
}, null), null, 2));
await browser.close();
