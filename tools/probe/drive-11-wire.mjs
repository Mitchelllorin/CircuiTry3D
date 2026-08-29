import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const t0 = Date.now();
const log = m => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
// Silence ALL onboarding so the payoff lock race can't contaminate the wiring test.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v1', '1');
    localStorage.setItem('circuitry3d:onboarding:current-flow-payoff:v2', '1');
    localStorage.setItem('circuitry3d:onboarding:v1', '1');
    localStorage.setItem('circuitry3d:junction-tip-dismissed:v1', '1');
  } catch {}
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => { const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);
log('loaded');
const f = page.frames().find(fr => /legacy\.html/.test(fr.url()));

const snap = async label => {
  const s = await f.evaluate(() => ({
    parts: components.length, wires: wires.length, junc: junctions.length,
    wireMode: isWireMode, locked: isCircuitEditLocked, wireStart: !!wireStart,
    flow: !!currentFlowState?.hasFlow, I: +Number(currentFlowState?.currentValue || 0).toFixed(4),
    status: (document.getElementById('status')?.style.display !== 'none'
      ? document.getElementById('status')?.textContent?.trim().slice(0, 62) : '') || '',
  }));
  console.log(`   ${label.padEnd(20)} ${JSON.stringify(s)}`);
  return s;
};
const tap = async (x, y, l) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(650); log(`  tap ${l} @ ${Math.round(x)},${Math.round(y)}`); };
const tapBtn = async (sel, l) => {
  const r = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height, e.disabled === true]; }, sel);
  if (!r) { log(`  !! ${l} NOT FOUND`); return false; }
  if (r[4]) log(`  (note: ${l} is disabled)`);
  let x = r[0] + r[2] / 2, y = r[1] + r[3] / 2;
  if (x < 40) x = Math.min(r[0] + r[2] - 6, 44);
  x = Math.min(Math.max(x, 3), 409); y = Math.min(Math.max(y, 3), 912);
  await tap(x, y, l); return true;
};
const bridge = (action) => page.evaluate(a => {
  document.querySelector('iframe.builder-iframe').contentWindow.postMessage(
    { type: 'builder:invoke-action', payload: { action: a } }, '*'); }, action);

console.log('\n== 0 =='); await snap('initial');
await tapBtn('.edge-action-btn--clear', 'CLEAR');
let s = await snap('after CLEAR');
if (s.parts) { await bridge('clear-workspace'); await page.waitForTimeout(1200); s = await snap('bridge clear'); }

console.log('\n== add battery ==');
await tapBtn('.builder-menu-toggle-left', 'Library open');
await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery');
await snap('after battery');

console.log('\n== add resistor (reopen library first) ==');
const libOpen = await page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open'));
log(`  library still open? ${libOpen}`);
if (!libOpen) await tapBtn('.builder-menu-toggle-left', 'Library reopen');
await tapBtn('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor');
s = await snap('after resistor');
if (s.parts < 2) { console.log('\nABORT: could not add a second part'); await browser.close(); process.exit(0); }

console.log('\n== close library, WIRE mode ==');
if (await page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open')))
  await tapBtn('.builder-menu-toggle-left', 'Library close');
await tapBtn('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
s = await snap('after WIRE');
const uiEnabledWire = s.wireMode;
if (!s.wireMode) { await bridge('toggle-wire-mode'); await page.waitForTimeout(1000); s = await snap('bridge wire'); }
if (!s.wireMode) { console.log('\nABORT: wire mode will not turn on at all'); await browser.close(); process.exit(0); }

console.log('\n== fit + terminals ==');
await bridge('fit-screen'); await page.waitForTimeout(2000);
const terms = await f.evaluate(() => components.flatMap(c => (c.connectionPoints || []).map(pt => {
  const s = worldToScreen(pt.getWorldPosition(new THREE.Vector3()));
  return { type: c.type, side: pt.userData?.side, x: Math.round(s.x), y: Math.round(s.y) }; })));
console.log('   ' + JSON.stringify(terms));
const on = t => t && t.x > 2 && t.x < 410 && t.y > 2 && t.y < 913;
const bat = terms.filter(t => t.type === 'battery' && on(t));
const res = terms.filter(t => t.type === 'resistor' && on(t));
if (bat.length < 2 || res.length < 2) { console.log(`\nABORT: terminals off-screen (battery ${bat.length}/2, resistor ${res.length}/2)`); await browser.close(); process.exit(0); }

console.log('\n== wire it ==');
const bPos = bat.find(t => t.side === 'positive') || bat[0];
const bNeg = bat.find(t => t.side === 'negative') || bat[1];
await tap(bPos.x, bPos.y, 'battery+'); await snap('1st tap');
await tap(res[0].x, res[0].y, 'R.a');   const w1 = await snap('after wire 1');
await tap(res[1].x, res[1].y, 'R.b');   await snap('3rd tap');
await tap(bNeg.x, bNeg.y, 'battery-');  const w2 = await snap('after wire 2');

console.log('\n== does current flow? ==');
console.log(JSON.stringify(await f.evaluate(() => {
  analyzeCircuit();
  const a = performCircuitAnalysis();
  return { wires: wires.length, isComplete: a.isComplete, topology: a.topology, V: a.voltage,
    R: Number.isFinite(a.resistance) ? +a.resistance.toFixed(3) : String(a.resistance),
    I: +a.current.toFixed(4), P: +a.power.toFixed(3),
    flowHasPath: !!a.flow?.hasPath, flowHasFlow: !!a.flow?.hasFlow,
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a' };
}), null, 2));
console.log(`\nRESULT wireModeFromButton=${uiEnabledWire} wiresAfter1=${w1.wires} wiresAfter2=${w2.wires} flow=${w2.flow} I=${w2.I}`);
await browser.close();
