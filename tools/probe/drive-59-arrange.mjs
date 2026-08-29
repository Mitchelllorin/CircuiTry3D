// arrangeCircuitSchematic() picks a LAYOUT from detectCircuitTopology and then
// rewires the circuit to match it. While the classifier answered from geometry,
// "Arrange" on a series loop read 'parallel' and rebuilt it on parallel rails -
// it did not just mislabel the circuit, it changed what the circuit WAS.
// This checks the shape survives the round trip.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();
const f = ws(page);

const run = (shape) => f.evaluate((shape) => {
  clearAll(false);
  const last = () => components[components.length - 1];
  addComponent('battery'); const bat = last(); bat.updateProperties({ voltage: 12 });
  const R = (o) => { addComponent('resistor'); const c = last(); c.updateProperties({ resistance: o }); return c; };
  if (shape === 'series') {
    const a = R(100), b = R(200);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', bat, 'negative');
  } else if (shape === 'parallel') {
    const a = R(100), b = R(200);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(bat, 'positive', b, 'left');
    connectTerminals(a, 'right', bat, 'negative');
    connectTerminals(b, 'right', bat, 'negative');
  } else {
    // (100 || 100) in series with (100 || 100) - the four-part shape
    // createCombinationFallbackLayout has a dedicated branch for.
    const a = R(100), b = R(100), c = R(100), d = R(100);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(bat, 'positive', b, 'left');
    connectTerminals(a, 'right', c, 'left');
    connectTerminals(b, 'right', c, 'left');
    connectTerminals(c, 'right', d, 'left');
    connectTerminals(d, 'left', c, 'right');
    connectTerminals(d, 'right', bat, 'negative');
    connectTerminals(c, 'right', bat, 'negative');
  }
  const before = performCircuitAnalysis();
  arrangeCircuitSchematic();
  const after = performCircuitAnalysis();
  const t = detectCircuitTopology(components.filter(c => c.type !== 'battery'), wires, junctions);
  return {
    beforeType: before.topology, beforeR: +Number(before.resistance).toFixed(2),
    afterType: t.type, afterR: +Number(after.resistance).toFixed(2),
  };
}, shape);

let bad = 0;
for (const shape of ['series', 'parallel', 'combination']) {
  const r = await run(shape);
  const typeOk = r.beforeType === shape && r.afterType === shape;
  const rOk = Math.abs(r.afterR - r.beforeR) / r.beforeR < 0.05;
  // All three shapes must survive Arrange intact now: the class AND the
  // resistance. Combination used to be exempt because the layout imposed its own
  // canonical shape; createNetlistLadderLayout rebuilds from the captured netlist
  // instead, so there is nothing left to excuse.
  const ok = typeOk && rOk;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  drew ${shape.padEnd(11)} -> analysed ${String(r.beforeType).padEnd(11)} R=${r.beforeR}` +
    `  | after Arrange: ${String(r.afterType).padEnd(11)} R=${r.afterR}`);
}
console.log(bad ? `\n${bad} FAILED - Arrange changed the circuit` : '\nArrange preserved every shape');
await browser.close();
