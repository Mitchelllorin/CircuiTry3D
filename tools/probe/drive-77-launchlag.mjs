// Is the Launch button slow to RESPOND, rather than slow to navigate? The
// landing page runs a 220-particle 2D canvas AND a three.js wordmark, both on
// rAF. If the main thread is saturated, touch events queue and the button
// feels dead — which is exactly the reported symptom.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';

const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(6000);
const frame = page.frames().find((f) => /landing\.html/.test(f.url()));
if (!frame) { console.log('NO LANDING IFRAME'); await browser.close(); process.exit(1); }

const SAMPLE = function () {
  return new Promise(function (res) {
    var long = [];
    try {
      new PerformanceObserver(function (l) {
        l.getEntries().forEach(function (e) { long.push(Math.round(e.duration)); });
      }).observe({ entryTypes: ['longtask'] });
    } catch (e) { /* not supported */ }
    var frames = 0, worst = 0;
    var t0 = performance.now();
    var last = t0;
    function tick() {
      var now = performance.now();
      var dt = now - last;
      last = now;
      if (frames) worst = Math.max(worst, dt);
      frames++;
      if (now - t0 < 2000) {
        requestAnimationFrame(tick);
        return;
      }
      res({
        fps: Math.round(frames / 2),
        worstFrameMs: Math.round(worst),
        longTasks: long.length,
        longTaskMs: long.slice(0, 10),
        canvases: [].slice.call(document.querySelectorAll('canvas')).map(function (c) {
          return {
            id: c.id || '(none)',
            px: c.width + 'x' + c.height,
            megapixels: +((c.width * c.height) / 1e6).toFixed(2),
          };
        }),
        dpr: devicePixelRatio,
      });
    }
    requestAnimationFrame(tick);
  });
};

console.log('=== MAIN THREAD (landing iframe, 2s sample) ===');
console.log(JSON.stringify(await frame.evaluate(SAMPLE), null, 2));

console.log('\n=== TAP -> HANDLER LATENCY ===');
await frame.evaluate(function () {
  window.__taps = [];
  document.getElementById('launch-btn').addEventListener('click', function () {
    window.__taps.push(Math.round(performance.now() - (window.__sent || performance.now())));
  }, true);
});
const box = await frame.evaluate(function () {
  const r = document.getElementById('launch-btn').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const off = await page.evaluate(function () {
  const r = document.querySelector('.home-page iframe').getBoundingClientRect();
  return { x: r.left, y: r.top };
});
for (let i = 0; i < 5; i++) {
  await frame.evaluate(function () { window.__sent = performance.now(); });
  await page.touchscreen.tap(off.x + box.x, off.y + box.y);
  await page.waitForTimeout(400);
}
console.log('ms from tap to handler:', JSON.stringify(await frame.evaluate(function () { return window.__taps; })));
console.log('taps that registered  :', (await frame.evaluate(function () { return window.__taps.length; })) + ' of 5');
console.log('top hash now          :', await page.evaluate(function () { return location.hash; }));

await browser.close();
