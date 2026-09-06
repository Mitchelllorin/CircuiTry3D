// The X is safe on card 1. But "Build it with me" only exists on the LAST
// card — and that button starts a second walkthrough. Advance to the end, look
// at the layout there, then tap the X and see what we are left with.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';

const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(14000);
await page.waitForSelector('.builder-tutorial-close', { timeout: 60000 }).catch(function () {});
await page.waitForTimeout(1200);

// Walk to the last card.
for (let i = 0; i < 14; i++) {
  const more = await page.evaluate(function () {
    const n = document.querySelector('.builder-tour-next');
    if (!n) return false;
    n.click();
    return true;
  });
  if (!more) break;
  await page.waitForTimeout(900);
}
await page.waitForTimeout(1200);

const layout = await page.evaluate(function () {
  const card = document.querySelector('.builder-tutorial-card');
  if (!card) return { error: 'no card' };
  const box = function (el) {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const controls = [];
  card.querySelectorAll('button, a').forEach(function (el) {
    controls.push({
      text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      cls: el.className.toString().slice(0, 40),
      box: box(el),
    });
  });
  const x = document.querySelector('.builder-tutorial-close');
  const xb = box(x);
  return {
    text: (card.querySelector('.builder-tutorial-text') || {}).innerText || '',
    controls: controls,
    xBox: xb,
    gapsFromX: controls.filter(function (c) { return !c.cls.includes('tutorial-close'); })
      .map(function (c) {
        return {
          text: c.text,
          dx: Math.max(0, Math.max(xb.x - (c.box.x + c.box.w), c.box.x - (xb.x + xb.w))),
          dy: Math.max(0, Math.max(xb.y - (c.box.y + c.box.h), c.box.y - (xb.y + xb.h))),
        };
      }),
  };
});
console.log('=== LAST CARD ===');
console.log('text:', (layout.text || '').replace(/\s+/g, ' ').slice(0, 90));
console.log(JSON.stringify({ xBox: layout.xBox, controls: layout.controls, gapsFromX: layout.gapsFromX }, null, 2));

const STATE = function () {
  const vis = function (e) { return e && (!e.checkVisibility || e.checkVisibility({ opacityProperty: true, visibilityProperty: true })); };
  const q = function (s) { const e = document.querySelector(s); return vis(e) ? e : null; };
  return {
    guidedTour: !!q('.builder-tutorial-layer'),
    buildAlong: !!q('.builder-buildalong, [class*="buildalong" i]'),
    anyTutorial: [].slice.call(document.querySelectorAll('[class*="tutorial" i], [class*="buildalong" i]'))
      .filter(vis).map(function (e) { return e.className.toString().slice(0, 40); }).slice(0, 8),
  };
};
console.log('\n=== BEFORE TAPPING X ON LAST CARD ===');
console.log(JSON.stringify(await page.evaluate(STATE)));

await page.touchscreen.tap(layout.xBox.x + layout.xBox.w / 2, layout.xBox.y + layout.xBox.h / 2);
for (const w of [500, 1500, 3500]) {
  await page.waitForTimeout(w === 500 ? 500 : 1000);
  console.log('\n=== AFTER +' + w + 'ms ===');
  console.log(JSON.stringify(await page.evaluate(STATE)));
}

await browser.close();
