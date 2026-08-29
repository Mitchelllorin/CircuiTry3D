import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const t0 = Date.now();
const log = m => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
});
await ctx.addInitScript(() => {
  try {
    ['circuitry3d:onboarding:tour-dismissed:v1', 'circuitry3d:onboarding:current-flow-payoff:v2',
     'circuitry3d:onboarding:v1', 'circuitry3d:junction-tip-dismissed:v1']
      .forEach(k => localStorage.setItem(k, '1'));
  } catch {}
});
const page = await ctx.newPage();
const bus = [];
page.on('console', m => {
  const t = m.text();
  if (/Effect 2|Payoff|handleComponentAction|FIRST:|Wire connected|Cannot connect|wire/i.test(t)) bus.push(t.slice(0, 150));
});
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => { const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; },
  null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);
log('loaded');
const f = page.frames().find(fr => /legacy\.html/.test(fr.url()));

const snap = async label => {
  const s = await f.evaluate(() => ({
    parts: components.length, wires: wires.length, wireMode: isWireMode,
    locked: isCircuitEditLocked, wireStart: !!wireStart,
    flow: !!currentFlowState?.hasFlow, I: +Number(currentFlowState?.currentValue || 0).toFixed(4),
  }));
  console.log(`   ${label.padEnd(18)} ${JSON.stringify(s)}`);
  return s;
};
const drain = label => {
  const b = bus.splice(0);
  if (b.length) { console.log(`   -- console (${label}) --`); b.slice(-6).forEach(t => console.log('     ' + t)); }
};
const tapXY = async (x, y, l) => {
  await page.touchscreen.tap(x, y); await page.waitForTimeout(700);
  log(`  tap ${l} @ ${Math.round(x)},${Math.round(y)}`);
};

// Find a point that ACTUALLY hits the element — what a thumb would have to find.
// Returns ok:false when no point on the element is reachable, which is itself a result.
const hitPoint = sel => page.evaluate(s => {
  const e = document.querySelector(s);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  if (b.width < 2 || b.height < 2) return null;
  for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85]) {
    for (const fx of [0.5, 0.7, 0.3, 0.85, 0.15]) {
      const x = b.left + b.width * fx, y = b.top + b.height * fy;
      if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === e || e.contains(hit) || hit.contains(e))) return { x, y, ok: true };
    }
  }
  return { ok: false, rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] };
}, sel);

const tapBtn = async (sel, l) => {
  const p = await hitPoint(sel);
  if (!p) { log(`  !! ${l} NOT FOUND`); return false; }
  if (!p.ok) { log(`  !! ${l} has NO reachable point (rect ${JSON.stringify(p.rect)})`); return false; }
  await tapXY(p.x, p.y, l);
  return true;
};
const bridge = a => page.evaluate(x => {
  document.querySelector('iframe.builder-iframe').contentWindow
    .postMessage({ type: 'builder:invoke-action', payload: { action: x } }, '*');
}, a);
const scrollPalette = dy => page.evaluate(d => {
  let n = document.querySelector('[data-tutorial-id="tutorial-add-resistor"]');
  while (n) {
    const cs = getComputedStyle(n);
    if (/auto|scroll/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) { n.scrollTop += d; return n.scrollTop; }
    n = n.parentElement;
  }
  return 'no scroll container';
}, dy);

log('waiting out the Effect 2 retry window (~20s)');
await page.waitForTimeout(20000);
bus.splice(0);
await snap('settled');

// SETUP ONLY, via the bridge. The CLEAR *button* is the thing under suspicion
// (its centre is occluded by the Library rail and it behaves differently at
// x=38 vs x=44) — using it here would confound "can I empty the canvas" with
// "does wiring work". Everything after this point is driven through real taps.
console.log('\n== clear via bridge (setup) ==');
await bridge('clear-workspace');
await page.waitForTimeout(2500);
let s = await snap('after clear'); drain('clear');
if (s.parts) { console.log('\nABORT: workspace will not stay empty'); await browser.close(); process.exit(0); }

console.log('\n== add battery ==');
await tapBtn('.builder-menu-toggle-left', 'Library');
await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery');
await snap('after battery');

console.log('\n== add resistor (scroll the palette until it is reachable) ==');
for (let i = 0; i < 6; i++) {
  const p = await hitPoint('[data-tutorial-id="tutorial-add-resistor"]');
  if (p && p.ok) { log(`  resistor reachable after ${i} scroll(s)`); break; }
  log(`  scrolled palette -> ${await scrollPalette(140)}`);
  await page.waitForTimeout(500);
}
await tapBtn('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor');
s = await snap('after resistor'); drain('adds');
if (s.parts < 2) { console.log('\nABORT: second part would not add'); await browser.close(); process.exit(0); }

console.log('\n== close library, enable WIRE ==');
if (await page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open')))
  await tapBtn('.builder-menu-toggle-left', 'Library close');
await tapBtn('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
s = await snap('after WIRE'); drain('WIRE');
const uiWire = s.wireMode;
if (!s.wireMode) {
  log('  WIRE button did not do it — retrying over the bridge to separate UI from engine');
  await bridge('toggle-wire-mode');
  await page.waitForTimeout(1200);
  s = await snap('after bridge');
}
if (!s.wireMode) { console.log('\nABORT: wire mode never turns on at all'); await browser.close(); process.exit(0); }

console.log('\n== fit to screen, read terminal positions ==');
await bridge('fit-screen');
await page.waitForTimeout(2500);
const terms = await f.evaluate(() => components.flatMap(c => (c.connectionPoints || []).map(pt => {
  const p = worldToScreen(pt.getWorldPosition(new THREE.Vector3()));
  return { type: c.type, side: pt.userData?.side, x: Math.round(p.x), y: Math.round(p.y) };
})));
console.log('   ' + JSON.stringify(terms));
const on = t => t && t.x > 4 && t.x < 408 && t.y > 4 && t.y < 910;
const bat = terms.filter(t => t.type === 'battery' && on(t));
const res = terms.filter(t => t.type === 'resistor' && on(t));
if (bat.length < 2 || res.length < 2) {
  console.log(`\nABORT: terminals off-screen (battery ${bat.length}/2, resistor ${res.length}/2)`);
  await browser.close(); process.exit(0);
}

console.log('\n== wire battery+ -> R.a, then R.b -> battery- ==');
const bP = bat.find(t => t.side === 'positive') || bat[0];
const bN = bat.find(t => t.side === 'negative') || bat[1];
await tapXY(bP.x, bP.y, 'battery+'); await snap('1st terminal');
await tapXY(res[0].x, res[0].y, 'R.a'); await snap('wire 1 made?');
await tapXY(res[1].x, res[1].y, 'R.b'); await snap('3rd terminal');
await tapXY(bN.x, bN.y, 'battery-'); const w2 = await snap('wire 2 made?');
drain('wiring');

console.log('\n== DOES CURRENT FLOW? ==');
console.log(JSON.stringify(await f.evaluate(() => {
  analyzeCircuit();
  const a = performCircuitAnalysis();
  return {
    wires: wires.length, isComplete: a.isComplete, topology: a.topology, V: a.voltage,
    R: Number.isFinite(a.resistance) ? +a.resistance.toFixed(3) : String(a.resistance),
    I: +a.current.toFixed(4), P: +a.power.toFixed(3),
    flowHasPath: !!a.flow?.hasPath, flowHasFlow: !!a.flow?.hasFlow,
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a',
  };
}), null, 2));

console.log(`\nRESULT wireModeFromButton=${uiWire} wires=${w2.wires} flow=${w2.flow} I=${w2.I}`);
await browser.close();
