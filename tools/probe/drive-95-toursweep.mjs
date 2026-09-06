/**
 * TOUR CAMERA SWEEP — the guided tour is a timed cinematic whose whole point is
 * that the camera flies to each part as it is narrated.
 *
 * The sweep is a `tour-focus` postMessage into the workspace iframe. If the tour
 * is opened BEFORE the frame is listening, every one of those is dropped: the
 * cards still tick by on their timers and the camera never moves. That is a
 * silent failure — the tutorial looks like it is running.
 *
 * So: don't check that the tour opened. Check that the CAMERA MOVED.
 *
 *   node tools/probe/drive-95-toursweep.mjs
 */
import { openBuilder, ws } from './_harness.mjs';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

// dismissTour:false — we WANT the first-run tour.
const { browser, page } = await openBuilder({ dismissTour: false });
const f = ws(page);

const cam = () => f.evaluate(() => {
  if (typeof camera === 'undefined' || !camera) return null;
  const p = camera.position;
  return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
});

const tourOpen = () => page.evaluate(() =>
  document.querySelector('.builder-shell')?.getAttribute('data-tour-active') === 'true');

check('tour is running', await tourOpen());
check('camera is reachable', (await cam()) !== null, JSON.stringify(await cam()));

// Step 0 ("welcome") is a static 19s overview, then step 1 sweeps to the flow.
// Sample across that boundary and look for real movement.
const seen = [];
for (let i = 0; i < 14; i++) {
  seen.push(await cam());
  await page.waitForTimeout(2500);
}

const uniq = [...new Set(seen.filter(Boolean).map(JSON.stringify))];
console.log(`\ncamera samples (${seen.length}), distinct positions: ${uniq.length}`);
for (const u of uniq.slice(0, 8)) console.log(`   ${u}`);

check('camera actually swept', uniq.length > 1,
  uniq.length <= 1 ? 'camera never moved — tour-focus messages are being dropped' : `${uniq.length} distinct positions`);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
