// "The Launch button has always been unresponsive and is worse now."
// Three separate questions: is it reachable, does ONE tap navigate, and how
// long does it take. Measured on a phone viewport with real taps.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
const log = [];
page.on('console', m => log.push(m.type()[0] + ':' + m.text().slice(0,110)));
page.on('pageerror', e => log.push('PAGEERROR:' + String(e).slice(0,110)));

await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(6000);

const frame = page.frames().find(f => /landing\.html/.test(f.url()));
if (!frame) { console.log('NO LANDING IFRAME'); await browser.close(); process.exit(1); }

// ── 1. Is it reachable? ──────────────────────────────────────────────
console.log('=== BUTTON GEOMETRY / HIT TEST ===');
console.log(JSON.stringify(await frame.evaluate(() => {
  const b = document.getElementById('launch-btn');
  if (!b) return { missing: true };
  const r = b.getBoundingClientRect();
  const pts = {
    centre: [r.left + r.width/2, r.top + r.height/2],
    topLeft: [r.left + 6, r.top + 6],
    botRight: [r.right - 6, r.bottom - 6],
  };
  const at = {};
  for (const [k, [x,y]] of Object.entries(pts)) {
    const el = document.elementFromPoint(x, y);
    at[k] = el ? (el.id || el.className || el.tagName).toString().slice(0,40) : null;
    at[k] += (el && (el === b || b.contains(el))) ? '  <-- the button' : '  <-- NOT the button';
  }
  const cs = getComputedStyle(b);
  return {
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    tapTargetOK: r.width >= 44 && r.height >= 44,
    pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, opacity: cs.opacity,
    href: b.getAttribute('href'), target: b.getAttribute('target'),
    hitAt: at,
  };
}, null), null, 2));

// ── 2. Does ONE real tap navigate, and how fast? ─────────────────────
console.log('\n=== ONE TAP ===');
const box = await frame.evaluate(() => {
  const b = document.getElementById('launch-btn');
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2 };
});
// iframe offset within the page
const off = await page.evaluate(() => {
  const f = document.querySelector('.home-page iframe');
  const r = f.getBoundingClientRect();
  return { x: r.left, y: r.top };
});
const t0 = Date.now();
await page.mouse.click(off.x + box.x, off.y + box.y);
let arrived = null;
for (let i = 0; i < 60; i++) {
  const h = await page.evaluate(() => location.hash);
  if (h.includes('/app')) { arrived = Date.now() - t0; break; }
  await page.waitForTimeout(250);
}
console.log('hash after 1 tap :', await page.evaluate(() => location.hash));
console.log('time to navigate :', arrived === null ? 'NEVER (15s timeout)' : arrived + 'ms');
console.log('builder mounted  :', await page.evaluate(() => !!document.querySelector('.builder-shell')));

console.log('\n=== CONSOLE ===');
console.log(log.slice(0, 14).join('\n') || '(clean)');
await browser.close();
