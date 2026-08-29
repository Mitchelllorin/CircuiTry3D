// Build series / parallel / combination circuits from scratch and check BOTH the
// classification and the reported R against the hand arithmetic. The showcase
// alone only ever exercises one shape.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();
const f = ws(page);

const build = async (shape) => f.evaluate((shape) => {
  clearAll(false);
  // addComponent() does not hand the object back, so take the newest one.
  const last = () => components[components.length - 1];
  addComponent('battery');
  const bat = last();
  bat.updateProperties({ voltage: 12 });
  const R = (ohms) => { addComponent('resistor'); const c = last(); c.updateProperties({ resistance: ohms }); return c; };

  if (shape === 'series') {
    // 12V - 100 - 200 - back.  R = 300
    const a = R(100), b = R(200);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', bat, 'negative');
  } else if (shape === 'series-with-corners') {
    // Same loop, but drawn through junction splices - the shape the old
    // geometry classifier could never call series.
    const a = R(100), b = R(200);
    const j1 = new Junction(new THREE.Vector3(0, 0, 40));
    const j2 = new Junction(new THREE.Vector3(0, 0, -40));
    junctions.push(j1, j2);
    connectTerminals(bat, 'positive', j1, 'center');
    connectTerminals(j1, 'center', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', j2, 'center');
    connectTerminals(j2, 'center', bat, 'negative');
  } else if (shape === 'parallel') {
    // Two 100 across the battery.  R = 50
    const a = R(100), b = R(100);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(bat, 'positive', b, 'left');
    connectTerminals(a, 'right', bat, 'negative');
    connectTerminals(b, 'right', bat, 'negative');
  } else if (shape === 'combination') {
    // 100 in series with (100 || 100).  R = 150
    const s = R(100), a = R(100), b = R(100);
    connectTerminals(bat, 'positive', s, 'left');
    connectTerminals(s, 'right', a, 'left');
    connectTerminals(s, 'right', b, 'left');
    connectTerminals(a, 'right', bat, 'negative');
    connectTerminals(b, 'right', bat, 'negative');
  } else if (shape === 'series-with-stub') {
    // A series loop plus a dead-end branch that carries no current.
    const a = R(100), b = R(200), stub = R(500);
    connectTerminals(bat, 'positive', a, 'left');
    connectTerminals(a, 'right', b, 'left');
    connectTerminals(b, 'right', bat, 'negative');
    connectTerminals(a, 'right', stub, 'left');
  }

  const others = components.filter(c => c.type !== 'battery');
  const topo = detectCircuitTopology(others, wires, junctions);
  const basic = performCircuitAnalysis();
  return {
    detected: topo.type, loops: topo.loops, nodesAfterPrune: topo.nodes,
    R: +Number(basic.resistance).toFixed(3),
    I: +Number(basic.current).toFixed(5),
    P: +Number(basic.power).toFixed(3),
    pathResistance: +Number(basic.flow?.pathResistance ?? NaN).toFixed(3),
  };
}, shape);

const CASES = [
  { shape: 'series',              want: 'series',      R: 300 },
  { shape: 'series-with-corners', want: 'series',      R: 300 },
  { shape: 'parallel',            want: 'parallel',    R: 50  },
  { shape: 'combination',         want: 'combination', R: 150 },
  { shape: 'series-with-stub',    want: 'series',      R: 300 },
];

let bad = 0;
for (const c of CASES) {
  const got = await build(c.shape);
  // Wire resistance adds a small amount on top; 5% is plenty of room for it.
  const rOk = Math.abs(got.R - c.R) / c.R < 0.05;
  const tOk = got.detected === c.want;
  if (!tOk || !rOk) bad++;
  console.log(
    `${tOk && rOk ? 'PASS' : 'FAIL'}  ${c.shape.padEnd(20)} ` +
    `type=${String(got.detected).padEnd(12)} (want ${c.want})  ` +
    `R=${String(got.R).padEnd(9)} (want ~${c.R})  I=${got.I}  P=${got.P}  ` +
    `loops=${got.loops} nodes=${got.nodesAfterPrune} path=${got.pathResistance}`);
}
console.log(bad ? `\n${bad} of ${CASES.length} FAILED` : `\nall ${CASES.length} passed`);
await browser.close();
