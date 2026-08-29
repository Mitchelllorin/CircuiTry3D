import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const log = m => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const { browser, page } = await openBuilder();
log('loaded');
const f = ws(page);

const snap = async (label) => {
  const s = await f.evaluate(() => ({
    parts: components.length, wires: wires.length, junc: junctions.length,
    wireMode: isWireMode, editLocked: isCircuitEditLocked, wireStart: !!wireStart,
    flow: !!currentFlowState?.hasFlow, I: +Number(currentFlowState?.currentValue || 0).toFixed(4),
  }));
  console.log(`   ${label.padEnd(22)} ${JSON.stringify(s)}`);
  return s;
};
const tap = async (x, y, label) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(600); log(`  tap ${label} @ ${Math.round(x)},${Math.round(y)}`); };
const rectOf = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
  const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, sel);

// Tap a button at a point that is actually inside the viewport AND not in the
// screen-edge rail columns (x<40 / x>372) — the rails eat taps there.
const tapBtn = async (sel, label) => {
  const r = await rectOf(sel);
  if (!r) { log(`  !! ${label} NOT FOUND`); return false; }
  let x = r[0] + r[2] / 2, y = r[1] + r[3] / 2;
  if (x < 40) x = Math.min(r[0] + r[2] - 6, 44);
  if (x > 372) x = Math.max(r[0] + 6, 368);
  x = Math.min(Math.max(x, 3), 409); y = Math.min(Math.max(y, 3), 912);
  await tap(x, y, label);
  return true;
};

console.log('\n== 0. initial =='); await snap('initial');

console.log('\n== 1. unlock demo via banner Edit ==');
await tapBtn('.current-flow-payoff-strip__btn--primary', 'banner Edit');
await snap('after unlock');

console.log('\n== 2. CLEAR (avoiding the blocked centre) ==');
await tapBtn('.edge-action-btn--clear', 'CLEAR');
let s = await snap('after CLEAR');
if (s.parts !== 0) {
  log('  CLEAR via UI did not empty the workspace — falling back to the bridge action so the wiring test can still run');
  await page.evaluate(() => {
    document.querySelector('iframe.builder-iframe').contentWindow.postMessage(
      { type: 'builder:invoke-action', payload: { action: 'clear-workspace' } }, '*');
  });
  await page.waitForTimeout(1500);
  s = await snap('after bridge clear');
}
if (s.parts !== 0) { console.log('\nABORT: workspace would not clear'); await browser.close(); process.exit(0); }

console.log('\n== 3. add battery + resistor from the Library ==');
await tapBtn('.builder-menu-toggle-left', 'Library toggle');
await tapBtn('[data-tutorial-id="tutorial-add-battery"]', 'Battery');
await snap('after battery');
await tapBtn('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor');
s = await snap('after resistor');
if (s.parts < 2) { console.log('\nABORT: parts not added'); await browser.close(); process.exit(0); }

console.log('\n== 4. WIRE mode ==');
await tapBtn('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
s = await snap('after WIRE tap');
if (!s.wireMode) {
  log('  !! WIRE button did not enable wire mode — retrying via the bridge to isolate UI vs engine');
  await page.evaluate(() => {
    document.querySelector('iframe.builder-iframe').contentWindow.postMessage(
      { type: 'builder:invoke-action', payload: { action: 'toggle-wire-mode' } }, '*');
  });
  await page.waitForTimeout(1200);
  s = await snap('after bridge toggle');
}
const wireModeCameFromUI = s.wireMode;

console.log('\n== 5. frame the parts, then read terminal screen positions ==');
await page.evaluate(() => {
  document.querySelector('iframe.builder-iframe').contentWindow.postMessage(
    { type: 'builder:invoke-action', payload: { action: 'fit-screen' } }, '*');
});
await page.waitForTimeout(1800);
const terms = await f.evaluate(() => components.flatMap((c, ci) =>
  (c.connectionPoints || []).map(pt => {
    const s = worldToScreen(pt.getWorldPosition(new THREE.Vector3()));
    return { ci, type: c.type, side: pt.userData?.side, x: Math.round(s.x), y: Math.round(s.y) };
  })));
console.log('   ' + JSON.stringify(terms));
const onScreen = t => t && t.x > 2 && t.x < 410 && t.y > 2 && t.y < 913;
const bat = terms.filter(t => t.type === 'battery');
const res = terms.filter(t => t.type === 'resistor');
console.log(`   battery terminals on-screen: ${bat.filter(onScreen).length}/${bat.length}, resistor: ${res.filter(onScreen).length}/${res.length}`);
if (bat.filter(onScreen).length < 2 || res.filter(onScreen).length < 2) {
  console.log('\nABORT: terminals not reachable on screen after fit-screen'); await browser.close(); process.exit(0);
}

console.log('\n== 6. wire it: battery+ -> R.left, R.right -> battery- ==');
const bPos = bat.find(t => t.side === 'positive'), bNeg = bat.find(t => t.side === 'negative');
await tap(bPos.x, bPos.y, 'battery +');  await snap('1st terminal');
await tap(res[0].x, res[0].y, 'R left'); await snap('wire 1 made?');
await tap(res[1].x, res[1].y, 'R right');await snap('3rd terminal');
await tap(bNeg.x, bNeg.y, 'battery -'); const s6 = await snap('wire 2 made?');

console.log('\n== 7. does current flow? ==');
console.log(JSON.stringify(await f.evaluate(() => {
  analyzeCircuit();
  const a = performCircuitAnalysis();
  return { wires: wires.length, isComplete: a.isComplete, topology: a.topology,
    V: a.voltage, R: Number.isFinite(a.resistance) ? +a.resistance.toFixed(3) : String(a.resistance),
    I: +a.current.toFixed(4), P: +a.power.toFixed(3),
    flowHasPath: !!a.flow?.hasPath, flowHasFlow: !!a.flow?.hasFlow,
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a' };
}), null, 2));

console.log(`\nRESULT wireModeFromUIButton=${wireModeCameFromUI} wires=${s6.wires} flow=${s6.flow} I=${s6.I}`);
await browser.close();
