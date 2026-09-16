// Does each nameplate sit where its part IS, on the frame the part is drawn?
//
// drive-102 checks the plates are steady in themselves (width, text, pixel grid).
// This checks the thing you actually see shake: the plate against the 3D. It hooks
// renderer.render and, straight after each draw — when three has brought every
// matrix up to date — projects each part's anchor again and compares it with the
// transform the label pass wrote for that same frame. Any gap between the two is
// the plate being drawn somewhere the part is not.
//
// Run on the real GPU (default) — at swiftshader's ~5 fps a one-frame lag cannot
// be seen, which is how this survived three "fixes". `--swiftshader` to compare.
import { openBuilder, ws } from './_harness.mjs';

const gpu = !process.argv.includes('--swiftshader');
const { browser, page, logs } = await openBuilder({ gpu });
const f = ws(page);

const ok = await f.evaluate(() => {
  if (typeof renderer === 'undefined' || !renderer || typeof components === 'undefined') return false;
  const W = (window.__np = { on: false, frames: [] });
  const draw = renderer.render.bind(renderer);
  let last = performance.now();
  renderer.render = (s, c) => {
    draw(s, c);
    if (!W.on) return;
    const now = performance.now();
    const row = { dt: now - last, e: {} };
    last = now;
    for (const comp of components) {
      const d = comp.labelDiv;
      if (!d || !comp.mesh || d.style.display === 'none' || comp._labelHalfW == null) continue;
      const m = /translate3d\(([-\d.e]+)px,\s*([-\d.e]+)px/.exec(d.style.transform);
      if (!m) continue;
      const p = new THREE.Vector3().setFromMatrixPosition(comp.mesh.matrixWorld);
      p.y += 2.5;
      const s = worldToScreen(p);
      if (s.z > 1) continue;
      row.e[comp.id] = [+m[1] - (s.x - comp._labelHalfW), +m[2] - (s.y - 4 - comp._labelH)];
    }
    W.frames.push(row);
  };
  return true;
});
if (!ok) { console.log('FAIL  hook — renderer/components not reachable from the page'); await browser.close(); process.exit(1); }

async function record(ms) {
  await f.evaluate(() => { window.__np.frames = []; window.__np.on = true; });
  await page.waitForTimeout(ms);
  return f.evaluate(() => { window.__np.on = false; return window.__np.frames; });
}

function report(name, frames) {
  const dts = frames.slice(1).map(r => r.dt).sort((a, b) => a - b);
  const fps = dts.length ? 1000 / dts[Math.floor(dts.length / 2)] : 0;
  const mags = [], steps = [];
  let prev = null;
  for (const r of frames) {
    for (const [id, [x, y]] of Object.entries(r.e)) {
      mags.push(Math.hypot(x, y));
      if (prev && prev.e[id]) steps.push(Math.hypot(x - prev.e[id][0], y - prev.e[id][1]));
    }
    prev = r;
  }
  const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  const out = {
    name, frames: frames.length, fps: +fps.toFixed(1),
    offMean: +(mags.reduce((a, b) => a + b, 0) / (mags.length || 1)).toFixed(2),
    offP95: +pct(mags, 0.95).toFixed(2), offMax: +Math.max(0, ...mags).toFixed(2),
    jitterP95: +pct(steps, 0.95).toFixed(2), jitterMax: +Math.max(0, ...steps).toFixed(2),
  };
  console.log(`${name.padEnd(14)} ${String(out.frames).padStart(4)} frames @ ${String(out.fps).padStart(5)} fps | plate off its part: mean ${out.offMean}px p95 ${out.offP95}px max ${out.offMax}px | frame-to-frame wobble p95 ${out.jitterP95}px max ${out.jitterMax}px`);
  return out;
}

const results = [];

// ── Idle turntable ───────────────────────────────────────────────────────────
await f.waitForFunction(() => window.__ct3dIdle && window.__ct3dIdle.drifting, null, { timeout: 30000 }).catch(() => {});
results.push(report('idle-drift', await record(3000)));

// ── A finger orbiting the board ──────────────────────────────────────────────
// Real touch events through CDP, at a speed that swells and eases like a thumb.
const cdp = await page.context().newCDPSession(page);
const y0 = 300, x0 = 120;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
await f.evaluate(() => { window.__np.frames = []; window.__np.on = true; });
let x = x0;
for (let i = 0; i < 150; i++) {
  x += 2 + 4 * Math.abs(Math.sin(i / 9));
  if (x > 380) x = x0;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + 20 * Math.sin(i / 13) }] });
  await page.waitForTimeout(8);
}
const orbitFrames = await f.evaluate(() => { window.__np.on = false; return window.__np.frames; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
results.push(report('finger-orbit', orbitFrames));

// ── A part failing: the workspace camera shake ───────────────────────────────
await page.waitForTimeout(300);
await f.evaluate(() => triggerCameraShake(0.12, 0.6));
results.push(report('camera-shake', await record(700)));

const errs = logs.filter(l => l.type === 'pageerror');
if (errs.length) console.log('page errors:', errs.slice(0, 3).map(e => e.text));

// Budget: one device pixel of disagreement. The label pass rounds to device pixels,
// so up to ~0.5 CSS px of offset is the grid, not the bug.
const BUDGET = 1;
let failed = 0;
for (const r of results) {
  const pass = r.frames > 0 && r.offP95 <= BUDGET && r.jitterP95 <= BUDGET;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.name}.plate-on-part — p95 off ${r.offP95}px, p95 wobble ${r.jitterP95}px (budget ${BUDGET}px)`);
}
await browser.close();
process.exit(failed ? 1 : 0);
