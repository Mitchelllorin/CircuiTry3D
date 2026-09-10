// REGRESSION LOCK: "the nameplate metrics are shaking again."
//
// This has now been fixed twice and come back twice, from two different
// directions, so it gets a standing guard rather than another eyeball check.
//
//   1st time — the label pass was throttled to LABEL_UPDATE_INTERVAL while the
//   camera flew at frame rate, so the text stepped along behind the part it was
//   pinned to. Fixed by exempting camera animations from the throttle.
//
//   2nd time — the end-of-shift walk-off. Nameplates are pinned to
//   mesh.matrixWorld, and a walking part BOBS once per pace, so the live metrics
//   physically bounced a couple of times a second. Fixed by hiding the readout of
//   any part that is off its seat: a part that has gone home is not reporting.
//
// Both share one root: something moved the mesh and the text was dragged along
// for the ride. So the assertions below are about that relationship, not about
// either specific cause — a third way of shaking a nameplate should trip them too.
//
// Note on the environment: headless swiftshader renders this scene at ~5 fps, so
// nothing here may depend on frame timing. Every check is a state invariant.
import { openBuilder, ws } from './_harness.mjs';

const R = [];
const check = (name, pass, detail) => { R.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const { browser, page, logs } = await openBuilder();
const f = ws(page);

const sample = () => f.evaluate(() => {
  const rows = components.filter(c => c.labelDiv && c.mesh).map(c => {
    const r = c.labelDiv.getBoundingClientRect();
    return {
      id: c.id,
      walkOff: !!c._walkOff,
      shown: c.labelDiv.style.display !== 'none' && r.width > 0,
      top: +r.top.toFixed(2),
      w: +r.width.toFixed(2),
      // Moved by transform, never by left/top: left/top re-lay-out and
      // re-rasterise every glyph, which at frame rate is text that crawls.
      usesOffsets: !!(c.labelDiv.style.left || c.labelDiv.style.top),
      // ...and landing on a whole DEVICE pixel, so the glyph bitmap sits on the
      // physical grid instead of being resampled a little differently each frame.
      offGrid: (() => {
        const d = window.devicePixelRatio || 1;
        const off = (v) => Math.abs(v * d - Math.round(v * d));
        return Math.max(off(r.left), off(r.top)) > 0.02;
      })(),
      text: c.labelDiv.innerText.replace(/\s+/g, ' ').trim(),
      // How far the mesh has been shoved off the seat the solver still believes
      // it occupies. Non-zero means the walk (or anything else) is driving it.
      off: +Math.hypot(c.mesh.position.x - c.position.x, c.mesh.position.y - c.position.y, c.mesh.position.z - c.position.z).toFixed(3),
    };
  });
  return { walking: !!window.__ct3dIdle?.walking, rows };
});

const first = await sample();
check('boot.plates', first.rows.length > 0, `${first.rows.length} nameplates on the board`);

// ── At rest ──────────────────────────────────────────────────────────────────
// The idle turntable is drifting by now, so absolute position MOVES and that is
// correct. What must not happen is the readout rewriting itself, or the plate
// changing width, while the numbers are standing still — width is sideways
// movement here, because .component-label-floating is centred on its anchor.
const rest = [];
for (let i = 0; i < 16; i++) { await page.waitForTimeout(250); rest.push(await sample()); }

const restRows = (id) => rest.map(s => s.rows.find(r => r.id === id)).filter(Boolean);
let widthDrift = 0, textChurn = 0;
for (const r0 of first.rows) {
  const series = restRows(r0.id);
  if (series.length < 2) continue;
  widthDrift = Math.max(widthDrift, Math.max(...series.map(s => s.w)) - Math.min(...series.map(s => s.w)));
  if (new Set(series.map(s => s.text)).size > 1) textChurn++;
}
check('rest.width-stable', widthDrift <= 1,
  `widest swing ${widthDrift.toFixed(2)}px (budget 1px — tabular-nums + the markup guard in updateLabels)`);
check('rest.text-stable', textChurn === 0,
  textChurn ? `${textChurn} plates rewrote their readout with nothing happening` : 'no plate rewrote itself at rest');

// The third cause, and the one that only shows up on a real screen: a plate moved
// with left/top is laid out and re-rasterised on every update, so at 60fps under a
// drifting camera the letters land on a different subpixel grid each frame and
// crawl. A composited transform on whole device pixels rasterises once.
const offsetMovers = rest.flatMap(s => s.rows.filter(r => r.usesOffsets)).length;
const offGrid = rest.flatMap(s => s.rows.filter(r => r.offGrid)).length;
const restSamples = rest.reduce((n, s) => n + s.rows.length, 0);
check('rest.transform-not-offsets', offsetMovers === 0,
  offsetMovers ? `${offsetMovers}/${restSamples} samples still positioned with left/top` : 'every plate is moved by transform alone');
check('rest.whole-device-pixels', offGrid === 0,
  offGrid ? `${offGrid}/${restSamples} samples sat off the device pixel grid — this is the crawl you see on a phone` : 'every plate landed on a whole device pixel');

// ── While the crew is clocked out ────────────────────────────────────────────
// THE assertion. A part that is off its seat carries no nameplate, so there is
// no text left for the walk bob to shake.
await f.evaluate(() => window.__ct3dWalkNow());
const walk = [];
for (let i = 0; i < 40; i++) { await page.waitForTimeout(300); walk.push(await sample()); }

let sawWalkers = 0, leaks = 0, leakEg = '';
for (const s of walk) {
  for (const r of s.rows) {
    if (r.off > 0.05) {
      sawWalkers++;
      if (r.shown) { leaks++; if (!leakEg) leakEg = `${r.id} was ${r.off} units off its seat with its readout still on screen`; }
    }
  }
}
check('walk.observed', sawWalkers > 0, `${sawWalkers} part-samples were away from their seat`);
check('walk.no-plate-rides-along', leaks === 0,
  leaks ? `${leaks} samples had a nameplate travelling with a walking part — ${leakEg}` : 'every clocked-out part had its readout hidden');

// One or two at a time, not a fire drill. This is the pacing the user asked for,
// and it is a property of walkerDelay(), so it belongs in the same guard.
const concurrent = walk.map(s => s.rows.filter(r => r.off > 0.05).length);
const peak = Math.max(0, ...concurrent);
check('walk.ones-and-twos', peak <= 2, `at most ${peak} parts were off their seats at the same moment (budget 2)`);

// ── Back on the payroll ──────────────────────────────────────────────────────
await f.evaluate(() => document.dispatchEvent(new Event('pointerdown')));
await page.waitForTimeout(400);
const home = await sample();
check('home.plates-return', home.rows.every(r => !r.walkOff),
  home.rows.some(r => r.walkOff) ? 'a part is still flagged as clocked out after input' : 'every part is back on the payroll');
check('home.seated', home.rows.every(r => r.off < 0.001), 'every mesh is back on its exact seat');

const errs = logs.filter(l => l.type === 'pageerror' || l.type === 'weberror');
check('console.clean', errs.length === 0, errs.length ? errs[0].text : 'no page errors');

await browser.close();
const failed = R.filter(r => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed`);
process.exit(failed.length ? 1 : 0);
