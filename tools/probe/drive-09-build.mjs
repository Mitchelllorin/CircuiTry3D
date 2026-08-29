import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const log = m => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const { browser, page } = await openBuilder();
log('loaded');
const f = ws(page);

const state = async (label) => {
  const s = await f.evaluate(() => ({
    components: components.length, wires: wires.length, junctions: junctions.length,
    wireMode: isWireMode, wireStart: !!wireStart,
    hasFlow: !!currentFlowState?.hasFlow,
    current: +Number(currentFlowState?.currentValue || 0).toFixed(4),
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a',
    status: (document.getElementById('status-text') || document.querySelector('.status-text'))?.textContent?.trim().slice(0, 70) || null,
  }));
  console.log(`   ${label}: ` + JSON.stringify(s));
  return s;
};

const iframeOffset = await page.evaluate(() => {
  const el = document.querySelector('iframe.builder-iframe');
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top };
});
log(`iframe offset ${JSON.stringify(iframeOffset)}`);

const tapEl = async (sel, label) => {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return [b.left, b.top, b.width, b.height];
  }, sel);
  if (!r) { log(`  !! ${label}: NOT FOUND (${sel})`); return false; }
  // tap a point guaranteed inside the viewport (some rails hang off-screen)
  const x = Math.min(Math.max(r[0] + r[2] / 2, 4), 408);
  const y = Math.min(Math.max(r[1] + r[3] / 2, 4), 911);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(700);
  log(`  tapped ${label} @ ${Math.round(x)},${Math.round(y)}`);
  return true;
};

console.log('\n===== STEP 0: as loaded =====');
await state('initial');

console.log('\n===== STEP 1: unlock the demo (banner Edit) =====');
await tapEl('.current-flow-payoff-strip__btn--primary', 'banner ✏️ Edit');
await state('after unlock');

console.log('\n===== STEP 2: clear the workspace =====');
await tapEl('.edge-action-btn--clear', 'CLEAR');
await state('after CLEAR');

console.log('\n===== STEP 3: open Library, add battery + resistor =====');
await tapEl('.builder-menu-toggle-left', 'Library toggle');
await tapEl('[data-tutorial-id="tutorial-add-battery"]', 'Battery');
await state('after battery');
await tapEl('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor');
const s3 = await state('after resistor');

if (s3.components < 2) { console.log('\n!!! ABORT: parts did not get added'); await browser.close(); process.exit(0); }

console.log('\n===== STEP 4: enable WIRE mode =====');
await tapEl('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
await state('after WIRE');

console.log('\n===== STEP 5: terminal screen positions =====');
const terms = await f.evaluate(() => {
  const out = [];
  components.forEach((c, ci) => {
    (c.connectionPoints || []).forEach(pt => {
      const w = pt.getWorldPosition(new THREE.Vector3());
      const s = worldToScreen(w);
      out.push({ ci, type: c.type, side: pt.userData?.side, x: Math.round(s.x), y: Math.round(s.y) });
    });
  });
  return out;
});
console.log(JSON.stringify(terms));

const pick = (type, side) => terms.find(t => t.type === type && t.side === side) || terms.find(t => t.type === type);
const bPos = terms.find(t => t.type === 'battery' && t.side === 'positive');
const bNeg = terms.find(t => t.type === 'battery' && t.side === 'negative');
const rTerms = terms.filter(t => t.type === 'resistor');
console.log('battery+', bPos, 'battery-', bNeg, 'resistor', rTerms);

const tapWorld = async (t, label) => {
  if (!t) { log(`  !! ${label} missing`); return; }
  await page.touchscreen.tap(t.x + iframeOffset.x, t.y + iframeOffset.y);
  await page.waitForTimeout(800);
  log(`  tapped ${label} @ ${t.x},${t.y}`);
};

console.log('\n===== STEP 6: wire battery+ -> resistor[0] =====');
await tapWorld(bPos, 'battery +');
await state('after 1st terminal');
await tapWorld(rTerms[0], 'resistor A');
await state('after 2nd terminal');

console.log('\n===== STEP 7: wire resistor[1] -> battery- =====');
await tapWorld(rTerms[1], 'resistor B');
await state('after 3rd terminal');
await tapWorld(bNeg, 'battery -');
const s7 = await state('after 4th terminal');

console.log('\n===== STEP 8: analyse =====');
console.log(JSON.stringify(await f.evaluate(() => {
  analyzeCircuit();
  const a = performCircuitAnalysis();
  return { wires: wires.length, hasFlow: !!currentFlowState?.hasFlow,
    reported: { V: a.voltage, R: +a.resistance.toFixed(3), I: +a.current.toFixed(4), P: +a.power.toFixed(3) },
    topology: a.topology, flowHasPath: !!a.flow?.hasPath, flowHasFlow: !!a.flow?.hasFlow,
    particles: (typeof currentFlowParticles !== 'undefined' && currentFlowParticles) ? currentFlowParticles.length : 'n/a' };
}), null, 2));

console.log(`\nRESULT: wires=${s7.wires} flow=${s7.hasFlow} current=${s7.current}`);
await browser.close();
