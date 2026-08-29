// After Arrange, a parallel circuit comes back reading as an OPEN circuit.
// Dump the electrical netlist before and after to see what the rail layout built.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();
const f = ws(page);
console.log(JSON.stringify(await f.evaluate(() => {
  clearAll(false);
  const last = () => components[components.length - 1];
  addComponent('battery'); const bat = last(); bat.updateProperties({ voltage: 12 });
  const R = (o) => { addComponent('resistor'); const c = last(); c.updateProperties({ resistance: o }); return c; };
  const a = R(100), b = R(200);
  connectTerminals(bat, 'positive', a, 'left');
  connectTerminals(bat, 'positive', b, 'left');
  connectTerminals(a, 'right', bat, 'negative');
  connectTerminals(b, 'right', bat, 'negative');

  const snap = (label) => {
    const { terminalToNode, nodeIds } = buildElectricalNodesLegacy();
    const { resistors, sources } = buildNetlistLegacy(terminalToNode);
    const short = (id) => String(id).slice(-6);
    return {
      label,
      wires: wires.length, junctions: junctions.length, components: components.length,
      nodes: nodeIds.size,
      sources: sources.map(s => `${short(s.positiveNode)}->${short(s.negativeNode)} ${s.volts}V`),
      resistors: resistors.map(r => `${r.kind} ${r.ohms} ${short(r.a)}-${short(r.b)}`),
      analysis: (() => { const x = performCircuitAnalysis();
        return { topology: x.topology, R: +Number(x.resistance).toFixed(2), complete: x.isComplete }; })(),
      // A wire whose ends are the SAME object+side is a self-loop and does nothing.
      degenerateWires: wires.filter(w => getTerminalKey(w.startObj, w.startSide || 'center')
        === getTerminalKey(w.endObj, w.endSide || 'center')).length,
    };
  };
  const before = snap('before Arrange');
  arrangeCircuitSchematic();
  const after = snap('after Arrange');
  return { before, after,
    wireEnds: wires.map(w => `${w.startObj?.type || 'junction'}.${w.startSide || 'center'} -> ${w.endObj?.type || 'junction'}.${w.endSide || 'center'}`) };
}), null, 2));
await browser.close();
