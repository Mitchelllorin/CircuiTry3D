// Harder shapes for Arrange. drive-59 covers the three textbook ones; these are
// the circuits the parts-list layout builders CANNOT redraw correctly, so they
// exercise the netlist fingerprint check and the ladder rebuild behind it.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();
const f = ws(page);

const run = (shape) => f.evaluate((shape) => {
  clearAll(false);
  const last = () => components[components.length - 1];
  addComponent('battery'); const bat = last(); bat.updateProperties({ voltage: 12 });
  const R = (o) => { addComponent('resistor'); const c = last(); c.updateProperties({ resistance: o }); return c; };

  if (shape === 'series+stub') {
    // A loop plus a dead-end branch. createSeriesSquareLayout chains EVERY part
    // into the ring, so the stub would become a live series element.
    const a = R(100), b = R(200), stub = R(500);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', bat, 'negative');
    connectTerminals(a, 'right', stub, 'left');
  } else if (shape === 'parallel+stub') {
    // createParallelRailLayout busses EVERY part across the rails, so the stub
    // would become a third live branch.
    const a = R(100), b = R(200), stub = R(500);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(bat, 'positive', b, 'left');
    connectTerminals(a, 'right', bat, 'negative');
    connectTerminals(b, 'right', bat, 'negative');
    connectTerminals(a, 'right', stub, 'left');
  } else if (shape === 'ladder-3-rung') {
    // Three rungs across two mid rails - not the canonical two-pairs shape.
    // 100 + (200 || 200 || 200) + 50  =  100 + 66.67 + 50 = 216.67
    const top = R(100), x = R(200), y = R(200), z = R(200), bot = R(50);
    connectTerminals(bat, 'positive', top, 'left');
    connectTerminals(top, 'right', x, 'left');
    connectTerminals(top, 'right', y, 'left');
    connectTerminals(top, 'right', z, 'left');
    connectTerminals(x, 'right', bot, 'left');
    connectTerminals(y, 'right', bot, 'left');
    connectTerminals(z, 'right', bot, 'left');
    connectTerminals(bot, 'right', bat, 'negative');
  } else if (shape === 'nested') {
    // (100 + 100) in parallel with 300  ->  200 || 300 = 120
    const a = R(100), b = R(100), c = R(300);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', bat, 'negative');
    connectTerminals(bat, 'positive', c, 'left');
    connectTerminals(c, 'right', bat, 'negative');
  }

  const before = performCircuitAnalysis();
  const sigBefore = captureCircuitNodeSignature();
  arrangeCircuitSchematic();
  const after = performCircuitAnalysis();
  return {
    beforeType: before.topology, beforeR: +Number(before.resistance).toFixed(2),
    afterType: after.topology, afterR: +Number(after.resistance).toFixed(2),
    netlistIdentical: sigBefore === captureCircuitNodeSignature(),
    wires: wires.length, junctions: junctions.length,
  };
}, shape);

const CASES = [
  { shape: 'series+stub',   R: 300 },
  { shape: 'parallel+stub', R: 66.67 },
  { shape: 'ladder-3-rung', R: 216.67 },
  { shape: 'nested',        R: 120 },
];

let bad = 0;
for (const c of CASES) {
  const r = await run(c.shape);
  const drawnOk = Math.abs(r.beforeR - c.R) / c.R < 0.05;
  const keptOk = r.netlistIdentical && Math.abs(r.afterR - r.beforeR) / r.beforeR < 0.05;
  if (!drawnOk || !keptOk) bad++;
  console.log(`${drawnOk && keptOk ? 'PASS' : 'FAIL'}  ${c.shape.padEnd(15)} ` +
    `drawn R=${String(r.beforeR).padEnd(8)} (hand ${c.R})  ${String(r.beforeType).padEnd(11)}` +
    ` | after Arrange R=${String(r.afterR).padEnd(8)} ${String(r.afterType).padEnd(11)}` +
    ` netlist ${r.netlistIdentical ? 'IDENTICAL' : 'CHANGED'}` +
    (drawnOk ? '' : '   <- the DRAWN circuit does not match hand arithmetic'));
}
console.log(bad ? `\n${bad} of ${CASES.length} FAILED` : `\nall ${CASES.length} survived Arrange unchanged`);
await browser.close();
