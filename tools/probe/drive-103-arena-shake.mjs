/**
 * ARENA NAMEPLATES MUST NOT SHAKE — the same lock as drive-102, on the other
 * surface. The arena has its OWN nameplate implementation (ArenaScene.tsx +
 * .arena-nameplate), copied from the builder's, which means it inherited the
 * builder's bug and did not inherit the builder's fix.
 *
 * The bug class: the plate is written with translate(-50%, -100%), i.e. CENTRED
 * on its anchor, while its box is shrink-to-fit (max-inline-size, not
 * inline-size). So the moment its content changes width, every line in it slides
 * sideways by half the difference — and in the arena the content is live
 * telemetry that changes constantly. Its measured width also feeds the
 * screen-edge clamp, so a width wobble moves the plate twice.
 *
 *   node tools/probe/drive-103-arena-shake.mjs
 */
import { openBuilder } from './_harness.mjs';

const R = [];
const check = (name, pass, detail) => { R.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const { browser, page, logs } = await openBuilder();
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(10000);

const sample = () => page.evaluate(() => [...document.querySelectorAll('.arena-nameplate')].map((el, i) => {
  const m = /translate3d\(([-\d.]+)px, *([-\d.]+)px/.exec(el.style.transform || '');
  return {
    i,
    x: m ? +(+m[1]).toFixed(2) : null,
    y: m ? +(+m[2]).toFixed(2) : null,
    w: el.offsetWidth,
    text: el.innerText.replace(/\s+/g, ' ').trim(),
  };
}));

const first = await sample();
check('arena.plates', first.length > 0, `${first.length} nameplates in the dome`);
if (!first.length) { await browser.close(); process.exit(1); }

// Sample through a live run, which is when the telemetry is actually moving —
// a plate that is stable on a still bench proves nothing.
// The dashboard's power switch is what puts the bench under load; the load fader
// is what makes the numbers move. Without both, the telemetry sits still and this
// probe proves nothing, which is why arena.telemetry-live is checked first.
await page.evaluate(() => {
  document.querySelector('.arena-dash__switch')?.click();
  const fader = document.querySelector('.arena-dash__fader input');
  if (fader) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    set?.call(fader, String(Number(fader.max || 100)));
    fader.dispatchEvent(new Event('input', { bubbles: true }));
    fader.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
const frames = [];
for (let i = 0; i < 30; i++) { await page.waitForTimeout(250); frames.push(await sample()); }

let worstW = 0, worstWho = '', textChanged = 0;
for (let i = 0; i < first.length; i++) {
  const series = frames.map(f => f.find(p => p.i === i)).filter(Boolean);
  if (series.length < 2) continue;
  const dw = Math.max(...series.map(s => s.w)) - Math.min(...series.map(s => s.w));
  if (new Set(series.map(s => s.text)).size > 1) textChanged++;
  if (dw > worstW) { worstW = dw; worstWho = `plate ${i}`; }
  console.log(`  plate ${i}: width ${Math.min(...series.map(s => s.w))}-${Math.max(...series.map(s => s.w))}px, `
    + `x ${Math.min(...series.map(s => s.x))}-${Math.max(...series.map(s => s.x))}, `
    + `${new Set(series.map(s => s.text)).size} distinct readouts`);
}

console.log('');
check('arena.telemetry-live', textChanged > 0,
  textChanged ? `${textChanged} plates updated their numbers during the run (so this test means something)` : 'NOTHING changed — the run never started, the result below proves nothing');
// THE assertion. A plate centred on its anchor must never change width, or it
// walks sideways under its own readout.
check('arena.width-locked', worstW === 0,
  worstW ? `${worstWho} changed width by ${worstW}px while centred on its anchor — half of that came straight off the text position` : 'every plate held a fixed width through the whole run');

const errs = logs.filter(l => l.type === 'pageerror' || l.type === 'weberror');
check('console.clean', errs.length === 0, errs.length ? errs[0].text : 'no page errors');

await browser.close();
const failed = R.filter(r => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed`);
process.exit(failed.length ? 1 : 0);
