import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
stamp('launching'); const { browser, page } = await openBuilder(); stamp('loaded');
const f = ws(page);

console.log(JSON.stringify(await f.evaluate(() => {
  // no eval() — the page CSP blocks it
  const t = {};
  t.worldToScreen = typeof worldToScreen;
  t.screenToWorld = typeof screenToWorld;
  t.clearAll = typeof clearAll;
  t.analyzeCircuit = typeof analyzeCircuit;
  t.createComponent = typeof createComponent;
  t.addComponent = typeof addComponent;
  t.checkComponentHit = typeof checkComponentHit;
  t.getTerminalPosition = typeof getTerminalPosition;
  t.wiringMode = typeof wiringMode;
  t.isWiringMode = typeof isWiringMode;
  t.currentFlowState = typeof currentFlowState;
  t.camera = typeof camera;
  const c = components[0];
  return {
    typeofs: t,
    counts: { components: components.length, wires: wires.length, junctions: junctions.length },
    firstComponent: c ? {
      type: c.type,
      keys: Object.keys(c).slice(0, 26),
      propKeys: Object.keys(c.properties || {}),
      getTerminalPosition: typeof c.getTerminalPosition,
      terminals: c.terminals ? (Array.isArray(c.terminals) ? 'array:' + c.terminals.length : Object.keys(c.terminals)) : 'none',
      pos: c.mesh?.position ? [+c.mesh.position.x.toFixed(2), +c.mesh.position.y.toFixed(2), +c.mesh.position.z.toFixed(2)] : null,
    } : null,
    wireShape: wires[0] ? Object.keys(wires[0]).slice(0, 22) : null,
    canvasRect: (() => { const cv = renderer?.domElement; if (!cv) return null;
      const r = cv.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
  };
}), null, 2));
stamp('done'); await browser.close();
