/**
 * ARENA DASHBOARD IS READABLE — the console is the instrument panel you operate
 * a live run with. All four W.I.R.E. readouts must be legible, all the time.
 *
 * They were not: the app's tips ticker is z-index 1310 pinned 56px off the
 * bottom in workspace, which is exactly the dashboard's readout row, and it
 * covered I and R outright — half the panel unreadable precisely while a part is
 * cooking and those are the numbers you are watching. ArenaView marks the shell
 * .is-arena so app furniture stands down.
 *
 * Hit-tests the CENTRE of each readout, because a thing can overlap a control
 * without covering its middle and still be wrong; the centre is where the number
 * is. Reports the covering element by name so the next regression names itself.
 *
 *   node tools/probe/drive-100-arenadash.mjs
 */
import { openBuilder } from './_harness.mjs';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const { browser, page } = await openBuilder();
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(10000);

const state = await page.evaluate(() => {
  const dash = document.querySelector('.arena-dash');
  if (!dash) return null;
  const dr = dash.getBoundingClientRect();
  const displays = [...dash.querySelectorAll('.arena-dash__display')].map((d) => {
    const r = d.getBoundingClientRect();
    const owner = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      label: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 18),
      covered: !!(owner && owner !== d && !d.contains(owner)),
      by: owner && owner !== d && !d.contains(owner)
        ? `${owner.tagName.toLowerCase()}.${String(owner.className).slice(0, 34)}` : '',
      w: Math.round(r.width), h: Math.round(r.height),
    };
  });
  const controls = [...dash.querySelectorAll('.arena-dash__fader input, .arena-dash__switch')].map((c) => {
    const r = c.getBoundingClientRect();
    const owner = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      label: c.getAttribute('aria-label') || c.textContent.trim().slice(0, 18),
      covered: !!(owner && owner !== c && !c.contains(owner) && !owner.contains(c)),
    };
  });
  return { dash: [Math.round(dr.top), Math.round(dr.height)], vh: window.innerHeight, displays, controls,
    tickerHidden: !document.querySelector('.tips-ticker')
      || getComputedStyle(document.querySelector('.tips-ticker')).display === 'none' };
});

check('dashboard is mounted', !!state);
if (!state) { console.log('\n0 passed, 1 failed'); await browser.close(); process.exit(1); }

console.log(`\ndash top=${state.dash[0]} height=${state.dash[1]} of ${state.vh}\n`);
check('all four W.I.R.E. readouts present', state.displays.length === 4, `${state.displays.length} found`);
for (const d of state.displays) check(`${d.label}: readable`, !d.covered, d.by);
for (const c of state.controls) check(`${c.label.slice(0, 34)}: reachable`, !c.covered);
check('tips ticker stands down in the arena', state.tickerHidden);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
