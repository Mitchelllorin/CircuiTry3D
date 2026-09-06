// The tour card's own comment calls the X "a small glyph a thumb has to find".
// If it is under the 44px tap minimum and sits near "Build it with me", a
// near-miss starts the build-along walkthrough — which would look exactly like
// "I hit X and the old one started doing its thing".
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(14000);
await page.waitForSelector('.builder-tutorial-close', { timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(1200);
console.log(JSON.stringify(await page.evaluate(() => {
  const r = el => { const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const out = { controlsOnTheCard: [] };
  const card = document.querySelector('.builder-tutorial-card');
  if (!card) return { error: 'no card' };
  card.querySelectorAll('button, a').forEach(el => {
    const box = r(el);
    out.controlsOnTheCard.push({
      text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim().slice(0,28),
      cls: el.className.toString().slice(0, 38),
      ...box,
      meets44: box.w >= 44 && box.h >= 44,
    });
  });
  const x = document.querySelector('.builder-tutorial-close');
  const xb = r(x);
  out.xButton = { ...xb, meets44: xb.w >= 44 && xb.h >= 44 };
  // nearest edge-to-edge distance from the X to every other control
  out.gapsFromX = out.controlsOnTheCard
    .filter(c => !c.cls.includes('tutorial-close'))
    .map(c => ({ text: c.text,
      dx: Math.max(0, Math.max(xb.x - (c.x + c.w), c.x - (xb.x + xb.w))),
      dy: Math.max(0, Math.max(xb.y - (c.y + c.h), c.y - (xb.y + xb.h))) }));
  return out;
}, null), null, 2));
await browser.close();
