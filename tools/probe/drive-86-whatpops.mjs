// Every previous probe asked "is <specific class> present?" and got "no".
// This one asks nothing and assumes nothing: open the app like a first run,
// press the X, and dump EVERY overlay-ish thing that is on screen afterwards,
// in the main document AND inside the legacy.html iframe, with its text.
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

// Anything painted over the app: positioned, on screen, big enough to notice.
const OVERLAYS = function () {
  const out = [];
  document.querySelectorAll('*').forEach(function (el) {
    const cs = getComputedStyle(el);
    if (!/fixed|absolute/.test(cs.position)) return;
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 40) return;
    if (r.top > innerHeight || r.bottom < 0) return;
    // Only the outermost of a nested stack.
    if (out.some(function (o) { return o.el.contains(el); })) return;
    out.push({
      el: el,
      cls: (el.className || el.id || el.tagName).toString().slice(0, 50),
      z: cs.zIndex,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    });
  });
  return out.map(function (o) { return { cls: o.cls, z: o.z, rect: o.rect, text: o.text }; });
};

const dump = async function (label) {
  console.log('\n########## ' + label + ' ##########');
  console.log('--- MAIN DOCUMENT ---');
  const main = await page.evaluate(OVERLAYS);
  main.forEach(function (o) { console.log('  z=' + o.z + ' ' + JSON.stringify(o.rect) + ' ' + o.cls + '\n      "' + o.text + '"'); });
  if (!main.length) console.log('  (none)');
  const fr = page.frames().find(function (f) { return /legacy\.html/.test(f.url()); });
  if (fr) {
    console.log('--- INSIDE legacy.html IFRAME ---');
    const inner = await fr.evaluate(OVERLAYS).catch(function () { return []; });
    inner.forEach(function (o) { console.log('  z=' + o.z + ' ' + JSON.stringify(o.rect) + ' ' + o.cls + '\n      "' + o.text + '"'); });
    if (!inner.length) console.log('  (none)');
  } else {
    console.log('--- no legacy iframe found ---');
  }
};

await dump('BEFORE PRESSING X');

const where = await page.evaluate(function () {
  const x = document.querySelector('.builder-tutorial-close');
  const r = x.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.touchscreen.tap(where.x, where.y);
await page.waitForTimeout(1200);
await dump('AFTER X (+1.2s)');
await page.waitForTimeout(4000);
await dump('AFTER X (+5.2s)');

await browser.close();
