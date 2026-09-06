// Hypothesis: the tour is launched from the LEARN tab, whose panel holds BOTH
// "Take the Tour" and "Build it with me". If any of that launcher survives
// under the tour overlay, dismissing the tour drops the tap onto
// "Build it with me" and the build-along starts — the reported bug.
//
// Earlier probes only tested the AUTO-OPENED tour, where the bare workspace is
// underneath. That is not how someone replays it.
import { chromium } from 'playwright';
import { CHROME, TOUR } from './_harness.mjs';

const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
});
await ctx.addInitScript((k) => { try { localStorage.setItem(k, '1'); } catch (e) {} }, TOUR);
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(12000);

// Which walkthrough is on screen? They share class names, so the kicker decides.
const WHICH = function () {
  const vis = function (e) { return e && (!e.checkVisibility || e.checkVisibility({ opacityProperty: true, visibilityProperty: true })); };
  const layer = document.querySelector('.builder-tutorial-layer');
  const kicker = document.querySelector('.builder-tutorial-kicker');
  const kickerText = kicker ? kicker.innerText.replace(/\s+/g, ' ').trim() : null;
  return {
    layerShowing: !!(layer && vis(layer)),
    kicker: kickerText,
    walkthrough: !layer || !vis(layer) ? 'none'
      : (kickerText && /build it with me/i.test(kickerText) ? 'BUILD-ALONG' : 'GUIDED TOUR'),
    learnLauncherMounted: !!document.querySelector('.learn-launcher'),
    learnButtons: [].slice.call(document.querySelectorAll('.learn-launch-btn'))
      .map(function (b) { return b.innerText.replace(/\s+/g, ' ').trim().slice(0, 22); }),
  };
};

console.log('=== 1. open the LEARN tab ===');
await page.evaluate(function () {
  const t = [].slice.call(document.querySelectorAll('.mode-tab')).find(function (b) { return /Learn/.test(b.innerText); });
  if (t) t.click();
});
await page.waitForTimeout(1800);
console.log(JSON.stringify(await page.evaluate(WHICH)));

console.log('\n=== 2. press "Take the Tour" ===');
await page.evaluate(function () {
  const b = [].slice.call(document.querySelectorAll('.learn-launch-btn')).find(function (x) { return /Take the Tour/i.test(x.innerText); });
  if (b) b.click();
});
await page.waitForSelector('.builder-tutorial-close', { timeout: 60000 }).catch(function () {});
await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate(WHICH)));

console.log('\n=== 3. what is stacked under the X? ===');
const xInfo = await page.evaluate(function () {
  const x = document.querySelector('.builder-tutorial-close');
  if (!x) return null;
  const r = x.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  return {
    cx: Math.round(cx), cy: Math.round(cy),
    stack: (document.elementsFromPoint(cx, cy) || []).map(function (e) {
      return (e.className || e.tagName).toString().replace(/\s+/g, '.').slice(0, 44);
    }),
  };
});
console.log(JSON.stringify(xInfo, null, 2));

console.log('\n=== 4. TAP the X ===');
await page.touchscreen.tap(xInfo.cx, xInfo.cy);
for (const w of [500, 1500, 3500]) {
  await page.waitForTimeout(w === 500 ? 500 : 1000);
  console.log('  +' + w + 'ms  ' + JSON.stringify(await page.evaluate(WHICH)));
}

await browser.close();
