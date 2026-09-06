// "Hitting X on the new tutorial triggers the OLD one to pop and start."
// Open the tour, press the X, and watch what is on screen before and after.
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
// NOTE: tour NOT pre-dismissed — we want it to auto-open like a first run.
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(14000);
// The layer mounts before the card's content does; wait for the actual button.
await page.waitForSelector('.builder-tutorial-close', { timeout: 60000 }).catch(function () {});
await page.waitForTimeout(1500);

const STATE = function () {
  const vis = function (el) {
    return el && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  };
  const q = function (s) { const e = document.querySelector(s); return vis(e) ? e : null; };
  const txt = function (s) { const e = q(s); return e ? (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 70) : null; };
  return {
    guidedTour: !!q('.builder-tutorial-layer, .builder-tour-card'),
    tourText: txt('.builder-tutorial-text'),
    buildAlong: !!q('.builder-buildalong, [class*="buildalong" i]'),
    anyTutorialLayer: [].slice.call(document.querySelectorAll('[class*="tutorial" i]'))
      .filter(vis).map(function (e) { return e.className.toString().slice(0, 46); }),
    helpModalOpen: !!document.querySelector('.builder-help-modal.open'),
    spotlight: !!q('[class*="spotlight" i]'),
  };
};

console.log('=== BEFORE (tour should be open) ===');
console.log(JSON.stringify(await page.evaluate(STATE), null, 2));

const clicked = await page.evaluate(function () {
  const x = document.querySelector('.builder-tutorial-close');
  if (!x) return 'NO X BUTTON FOUND';
  const r = x.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const under = top ? top.className.toString().slice(0, 50) : 'null';
  x.click();
  return 'clicked; element at X centre was: ' + under;
});
console.log('\nX button:', clicked);

for (const ms of [300, 900, 2000, 4000]) {
  await page.waitForTimeout(ms === 300 ? 300 : 600);
  console.log(`\n=== AFTER +${ms}ms ===`);
  console.log(JSON.stringify(await page.evaluate(STATE), null, 2));
}

await browser.close();
