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
   'circuitry3d:onboarding:v1','circuitry3d:junction-tip-dismissed:v1'].forEach(k => localStorage.setItem(k, '1')); } catch {} });
const page = await ctx.newPage();
const bus = [];
page.on('console', m => { const t = m.text(); if (/Effect 2|Payoff|payoff|lock|handleComponentAction|FIRST:|Wire|wire/i.test(t)) bus.push(t.slice(0, 150)); });
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => { const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);
log('loaded');
const f = page.frames().find(fr => /legacy\.html/.test(fr.url()));
const snap = async l => { const s = await f.evaluate(() => ({ parts: components.length, wires: wires.length,
  wireMode: isWireMode, locked: isCircuitEditLocked, wireStart: !!wireStart,
  flow: !!currentFlowState?.hasFlow, I: +Number(currentFlowState?.currentValue || 0).toFixed(4) }));
  console.log(`   ${l.padEnd(18)} ${JSON.stringify(s)}`); return s; };
const drain = l => { const b = bus.splice(0); if (b.length) { console.log(`   -- console (${l}) --`); b.slice(-8).forEach(t => console.log('     ' + t)); } };
const tapXY = async (x, y, l) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(700); log(`  tap ${l} @ ${Math.round(x)},${Math.round(y)}`); };
const tapBtn = async (sel, l) => {
  const r = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, sel);
  if (!r) { log(`  !! ${l} NOT FOUND`); return false; }
  // keep the point INSIDE the element while dodging the screen-edge rail columns
  let x = r[0] + r[2] / 2, y = r[1] + r[3] / 2;
  if (x < 40) x = Math.min(r[0] + r[2] - 6, 44);
  if (x > 372) x = Math.max(r[0] + 6, 368);
  x = Math.min(Math.max(x, 3), 409); y = Math.min(Math.max(y, 3), 912);
  await tapXY(x, y, l); return true;
};
const bridge = a => page.evaluate(x => { document.querySelector('iframe.builder-iframe').contentWindow
  .postMessage({ type: 'builder:invoke-action', payload: { action: x } }, '*'); }, a);

log('waiting out Effect 2 retry window (~20s)');
await page.waitForTimeout(20000); bus.splice(0);
await snap('settled');

console.log('\n== CLEAR ==');
await tapBtn('.edge-action-btn--clear', 'CLEAR');
await page.waitForTimeout(4000);
let s = await snap('after CLEAR+4s'); drain('CLEAR');
if (s.parts) { log('  demo came back — clearing again'); await tapBtn('.edge-action-btn--clear', 'CLEAR#2');
  await page.waitForTimeout(3000); s = await snap('after CLEAR#2'); }
if (s.parts) { console.log('\nABORT: workspace will not stay empty'); await browser.close(); process.exit(0); }

console.log('\n== add battery + resistor ==');
await tapBtn('.builder-menu-toggle-left', 'Library');
await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery'); await snap('after battery');
const stillOpen = await page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open'));
log(`  library open after add? ${stillOpen}`);
if (!stillOpen) await tapBtn('.builder-menu-toggle-left', 'Library reopen');
await tapBtn('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor'); s = await snap('after resistor'); drain('adds');
if (s.parts < 2) { console.log('\nABORT: second part would not add'); await browser.close(); process.exit(0); }

console.log('\n== close library, WIRE ==');
if (await page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open'))) await tapBtn('.builder-menu-toggle-left', 'Library close');
await tapBtn('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
s = await snap('after WIRE'); drain('WIRE');
const uiWire = s.wireMode;
if (!s.wireMode) { log('  WIRE button failed — trying the bridge'); await bridge('toggle-wire-mode'); await page.waitForTimeout(1200); s = await snap('bridge wire'); }
if (!s.wireMode) { console.log('\nABORT: wire mode never turns on'); await browser.close(); process.exit(0); }

console.log('\n== fit + terminals ==');
await bridge('fit-screen'); await page.waitForTimeout(2500);
const terms = await f.evaluate(() => components.flatMap(c => (c.connectionPoints || []).map(pt => {
  const p = worldToScreen(pt.getWorldPosition(new THREE.Vector3()));
  return { type: c.type, side: pt.userData?.side, x: Math.round(p.x), y: Math.round(p.y) }; })));
console.log('   ' + JSON.stringify(terms));
const on = t => t && t.x > 4 && t.x < 408 && t.y > 4 && t.y < 910;
const bat = terms.filter(t => t.type === 'battery' && on(t)), res = terms.filter(t => t.type === 'resistor' && on(t));
if (bat.length < 2 || res.length < 2) { console.log(`\nABORT: terminals off-screen (bat ${bat.length}/2 res ${res.length}/2)`); await browser.close(); process.exit(0); }

console.log('\n== wire battery+ -> R.a, R.b -> battery- ==');
const bP = bat.find(t => t.side === 'positive') || bat[0], bN = bat.find(t => t.side === 'negative') || bat[1];
await tapXY(bP.x, bP.y, 'battery+'); await snap('1st terminal');
await tapXY(res[0].x, res[0].y, 'R.a'); const w1 = await snap('wire 1?');
await tapXY(res[1].x, res[1].y, 'R.b'); await snap('3rd terminal');
await tapXY(bN.x, bN.y, 'battery-'); const w2 = await snap('wire 2?'); drain('wiring');

console.log('\n== DOES CURRENT FLOW? ==');
console.log(JSON.stringify(await f.evaluate(() => { analyzeCircuit(); const a = performCircuitAnalysis();
  return { wires: wires.length, isComplete: a.isComplete, topology: a.topology, V: a.voltage,
    R: Number.isFinite(a.resistance) ? +a.resistance.toFixed(3) : String(a.resistance),
    I: +a.current.toFixed(4), P: +a.power.toFixed(3), flowHasPath: !!a.flow?.hasPath, flowHasFlow: !!a.flow?.hasFlow,
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a' }; }), null, 2));
console.log(`\nRESULT wireModeFromButton=${uiWire} wires=${w2.wires} flow=${w2.flow} I=${w2.I}`);
await browser.close();
