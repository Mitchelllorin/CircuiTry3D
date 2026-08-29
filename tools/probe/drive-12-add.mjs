import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const t0 = Date.now();
const log = m => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
await ctx.addInitScript(() => { try {
  ['circuitry3d:onboarding:tour-dismissed:v1','circuitry3d:onboarding:current-flow-payoff:v2',
   'circuitry3d:onboarding:v1','circuitry3d:junction-tip-dismissed:v1'].forEach(k => localStorage.setItem(k, '1'));
} catch {} });
const page = await ctx.newPage();
const bus = [];
page.on('console', m => { const t = m.text();
  if (/handleComponentAction|add-component|Effect 2|payoff|lock|Payoff|invoke-action/i.test(t)) bus.push(t.slice(0, 170)); });
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => { const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);
log('loaded');
const f = page.frames().find(fr => /legacy\.html/.test(fr.url()));
const drain = (label) => { console.log(`   --- console during ${label} ---`); bus.splice(0).forEach(t => console.log('     ' + t)); };
const snap = async l => { const s = await f.evaluate(() => ({ parts: components.length, wires: wires.length,
    wireMode: isWireMode, locked: isCircuitEditLocked })); console.log(`   ${l.padEnd(18)} ${JSON.stringify(s)}`); return s; };

const probeBtn = async (sel, label) => page.evaluate(([s, l]) => {
  const e = document.querySelector(s);
  if (!e) return { label: l, found: false };
  const b = e.getBoundingClientRect();
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const hit = document.elementFromPoint(Math.min(Math.max(cx,1),innerWidth-1), Math.min(Math.max(cy,1),innerHeight-1));
  return { label: l, found: true, rect: [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)],
    disabled: e.disabled === true, ariaDisabled: e.getAttribute('aria-disabled'),
    reachable: !!hit && (e === hit || e.contains(hit) || hit.contains(e)),
    hit: hit ? hit.tagName + '.' + String(hit.className||'').slice(0,36) : null };
}, [sel, label]);

const tapBtn = async (sel, l) => {
  const p = await probeBtn(sel, l);
  console.log('   probe ' + JSON.stringify(p));
  if (!p.found) return;
  let x = Math.min(Math.max(p.rect[0] + p.rect[2] / 2, 3), 409);
  let y = Math.min(Math.max(p.rect[1] + p.rect[3] / 2, 3), 912);
  if (x < 40) x = 44;
  await page.touchscreen.tap(x, y); await page.waitForTimeout(700); log(`  tapped ${l} @ ${Math.round(x)},${Math.round(y)}`);
};

await snap('initial'); bus.splice(0);
console.log('\n== CLEAR =='); await tapBtn('.edge-action-btn--clear', 'CLEAR'); await snap('after CLEAR'); drain('CLEAR');
console.log('\n== open library =='); await tapBtn('.builder-menu-toggle-left', 'Library'); bus.splice(0);
console.log('\n== battery =='); await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery'); await snap('after battery'); drain('battery');
console.log('\n== resistor =='); await tapBtn('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor'); await snap('after resistor'); drain('resistor');
console.log('\n== battery AGAIN (is it "2nd add" or "the resistor button"?) ==');
await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery#2'); await snap('after battery#2'); drain('battery#2');
console.log('\nDONE'); await browser.close();
