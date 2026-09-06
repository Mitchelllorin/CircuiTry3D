// A programmatic .click() on the tour's X closes it cleanly. A real TAP might
// not: touchend closes the overlay, the overlay unmounts, and the browser then
// delivers the follow-up click to whatever is now at those coordinates. If a
// tour launcher sits under the X, that relaunches a tutorial — which is exactly
// the reported "hit X and the old one starts doing its thing".
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
await page.waitForTimeout(1500);

// Where is the X, and what is directly beneath the card at that point?
const info = await page.evaluate(function () {
  const x = document.querySelector('.builder-tutorial-close');
  if (!x) return null;
  const r = x.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  // Everything stacked at that coordinate, top to bottom.
  const stack = (document.elementsFromPoint ? document.elementsFromPoint(cx, cy) : [])
    .map(function (e) { return (e.className || e.tagName).toString().replace(/\s+/g, '.').slice(0, 46); });
  return { cx: Math.round(cx), cy: Math.round(cy), stack: stack };
});
console.log('=== X BUTTON ===');
console.log('at', info.cx + ',' + info.cy);
console.log('stacked under the tap point, top first:');
info.stack.forEach(function (s, i) { console.log('  ' + i + '. ' + s); });

const STATE = function () {
  const vis = function (e) { return e && (!e.checkVisibility || e.checkVisibility({ opacityProperty: true, visibilityProperty: true })); };
  const q = function (s) { const e = document.querySelector(s); return vis(e) ? e : null; };
  return {
    guidedTour: !!q('.builder-tutorial-layer'),
    tourCard: !!q('.builder-tutorial-card'),
    buildAlong: !!q('.builder-buildalong, [class*="buildalong" i]'),
    learnPanel: !!q('.learn-launcher'),
    helpPanel: !!q('.guides-action-btn'),
    helpModal: !!document.querySelector('.builder-help-modal.open'),
    activeMode: (function () {
      const t = document.querySelector('.mode-tab[data-active="true"]');
      return t ? t.innerText.replace(/\s+/g, ' ').trim() : null;
    })(),
  };
};

console.log('\n=== BEFORE TAP ===');
console.log(JSON.stringify(await page.evaluate(STATE)));

await page.touchscreen.tap(info.cx, info.cy);

for (const w of [400, 1200, 3000]) {
  await page.waitForTimeout(w === 400 ? 400 : 800);
  console.log('\n=== AFTER TAP (+' + w + 'ms) ===');
  console.log(JSON.stringify(await page.evaluate(STATE)));
}

await browser.close();
