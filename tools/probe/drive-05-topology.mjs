import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ---- ${m}`);
stamp('launching');
const { browser, page } = await openBuilder();
stamp('loaded');
const f = ws(page);
console.log('frame:', f === page.mainFrame() ? 'MAIN (BAD)' : 'legacy iframe');

const r1 = await f.evaluate(() => {
  const others = components.filter(c => c.type !== 'battery');
  const topo = detectCircuitTopology(others, wires, junctions);
  const basic = performCircuitAnalysis();
  return {
    counts: { components: components.length, wires: wires.length, junctions: junctions.length },
    detected: topo.type,
    combinationStubReturns: calculateCombinationResistance(topo),
    reported: { R: +basic.resistance.toFixed(4), I: +basic.current.toFixed(5), P: +basic.power.toFixed(4), V: basic.voltage, topology: basic.topology },
    truePathResistance: +(basic.flow?.pathResistance ?? NaN),
    parts: others.map(c => ({ type: c.type, R: c.properties?.resistance })),
  };
});
console.log('\n=== AS SHIPPED (showcase circuit) ===');
console.log(JSON.stringify(r1, null, 2));

// Now drop the total resistance well below the hardcoded 100 and see if R clamps.
const r2 = await f.evaluate(() => {
  const others = components.filter(c => c.type !== 'battery');
  const before = others.map(c => c.properties?.resistance);
  others.forEach(c => { if (typeof c.properties?.resistance === 'number') c.updateProperties({ resistance: 2 }); });
  const topo = detectCircuitTopology(others, wires, junctions);
  const basic = performCircuitAnalysis();
  const trueSum = others.reduce((s, c) => s + (c.properties?.resistance || 0), 0);
  return {
    before, setEachTo: 2, trueResistorSum: +trueSum.toFixed(3),
    detected: topo.type,
    reported: { R: +basic.resistance.toFixed(4), I: +basic.current.toFixed(5), P: +basic.power.toFixed(4), V: basic.voltage },
    pathResistance: +(basic.flow?.pathResistance ?? NaN),
    expectedIfCorrect: { R: +(trueSum).toFixed(3), I: +(basic.voltage / trueSum).toFixed(5), P: +(basic.voltage ** 2 / trueSum).toFixed(4) },
  };
});
console.log('\n=== LOW-RESISTANCE CIRCUIT (each part 2 ohm) ===');
console.log(JSON.stringify(r2, null, 2));

stamp('done');
await browser.close();
