/**
 * LITTELFUSE 0218.250 — model it from the datasheet, then run it to destruction.
 *
 * The part is a 5x20mm time-lag glass cartridge fuse, 250 mA / 250 VAC, nominal
 * melting I²t 0.5405 A²s, nominal cold resistance 1.0495Ω, 35 A interrupting
 * rating (Littelfuse 218 series datasheet). It is in the shared catalog as
 * `littelfuse-0218-250mxp`, which makes it a Library card in the Builder.
 *
 * What this proves, in order:
 *   1. the branded card exists in the Library and spawns a fuse into the
 *      workspace carrying the datasheet rating, not a placeholder;
 *   2. wired into a 9 V / 10 Ω loop it draws ~0.9 A — 3.6x its 250 mA rating —
 *      and FUSE opens the element;
 *   3. the trip time matches the datasheet I²t (0.5405 / 0.9² ≈ 0.67 s), so the
 *      thing that failed is the part on the datasheet and not a stand-in.
 *
 * Before the catalog's `toWorkspaceProperties` fuse mapping carried the rating,
 * the workspace sent `current` only and FUSE fell back to its own 1 A default:
 * this fuse would have sat happily at 1.1 A and blown as though it were a 1 A
 * part. Step 2 is the regression test for that.
 *
 *   node tools/probe/drive-107-littelfuse-break.mjs
 */
import { openBuilder, ws } from './_harness.mjs';

const PART = '218 series cartridge fuse';
const RATING = 0.25;          // A, datasheet
const I2T = 0.5405;           // A²s, datasheet
const R_LOAD = 10;            // Ω, chosen so the loop draws ~3.6x the rating

const R = [];
const check = (name, pass, detail = '') => {
  R.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const { browser, page, logs } = await openBuilder();
const f = ws(page);

const parts = () => f.evaluate(() => components.map((c) => ({
  type: c.type, id: c.id, name: c.name,
  props: { ...(c.properties || {}) },
})));

// ── helpers ──────────────────────────────────────────────────────────────────
const isLibOpen = () => page.evaluate(() => !!document.querySelector('.builder-menu-stage-left.open'));

async function openLibrary() {
  if (await isLibOpen()) return;
  await page.evaluate(() => document.querySelector('.builder-menu-toggle-left')?.click());
  await page.waitForTimeout(1800);
}

async function closeLibrary() {
  if (!(await isLibOpen())) return;
  await page.evaluate(() => document.querySelector('.builder-menu-toggle-left')?.click());
  await page.waitForTimeout(900);
}

/**
 * The drawer is a film reel of ~60 cards, so a branded part is found by searching
 * rather than by scrolling. One tap on a card adds it, wherever it sits in the
 * reel — `handleCardTap` calls onSelect without needing the card to be centred.
 */
async function addFromLibrary(query, matcher) {
  await openLibrary();
  const hasInput = await page.evaluate(() => !!document.querySelector('.scroller-search-input'));
  if (!hasInput) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Search components');
      b?.click();
    });
    await page.waitForTimeout(700);
  }
  const input = await page.$('.scroller-search-input');
  if (!input) return { ok: false, why: 'no search input in the drawer' };
  await input.fill(query);
  await page.waitForTimeout(1300);

  const result = await page.evaluate((re) => {
    const cards = [...document.querySelectorAll('.builder-menu-stage-left button, .builder-menu-stage-left [role="button"]')];
    const b = cards.find((x) => new RegExp(re, 'i').test(x.getAttribute('aria-label') || ''));
    if (!b) return { ok: false, labels: cards.map((x) => x.getAttribute('aria-label')).filter(Boolean).slice(0, 10) };
    b.click();
    return { ok: true, label: b.getAttribute('aria-label') };
  }, matcher);
  await page.waitForTimeout(2400);
  return result;
}

const tap = async (x, y, what) => {
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(700);
  console.log(`   tap ${what} @ ${Math.round(x)},${Math.round(y)}`);
};

const snap = async () => f.evaluate(() => ({
  parts: components.length,
  wires: wires.length,
  current: +Number(currentFlowState?.currentValue || 0).toFixed(4),
  hasFlow: !!currentFlowState?.hasFlow,
}));

// ── 1. the card exists and spawns the real part ──────────────────────────────
await page.evaluate(() => document.querySelector('.edge-action-btn--clear')?.click());
await page.waitForTimeout(1500);
await f.evaluate(() => { try { clearAll(); } catch { /* workspace may already be empty */ } });
await page.waitForTimeout(1200);

await closeLibrary();
// The card's label carries the maker as well as the part — "Add Littelfuse
// 0218.250MXP" — and matching `^Add 218` against it missed, failing the probe at
// step 1 before it had looked at anything. Match the ADD action on the 0218, not
// the exact string: the last card in the drawer is also labelled "Pin 218 ...",
// and tapping that one pins a part instead of spawning it.
const fuseAdd = await addFromLibrary('218', '^Add 218 series cartridge fuse$');
check('library.branded-card', fuseAdd.ok,
  fuseAdd.ok ? `"${PART}" added from the Library search` : `${fuseAdd.why} — saw ${JSON.stringify(fuseAdd.labels)}`);
if (!fuseAdd.ok) { await browser.close(); process.exit(1); }
await closeLibrary();

for (const [query, matcher, name] of [['Battery', '^Add Battery$', 'battery'], ['Resistor', '^Add Resistor$', 'resistor']]) {
  const before = (await parts()).length;
  const r = await addFromLibrary(query, matcher);
  const after = (await parts()).length;
  check(`library.${name}`, r.ok && after > before, r.ok ? `${before} -> ${after} parts` : r.why);
  await closeLibrary();
}

const afterAdd = await parts();
const fuse = afterAdd.find((p) => p.type === 'fuse');
check('workspace.fuse-spawned', !!fuse, afterAdd.map((p) => p.type).join(', '));
check('workspace.fuse-carries-rating',
  !!fuse && fuse.props.ratedCurrentA === RATING && fuse.props.meltingI2t === I2T,
  fuse ? JSON.stringify(fuse.props) : 'no fuse');
// The 1 A default is the bug this probe exists to catch.
check('workspace.fuse-not-default-1A', !!fuse && fuse.props.ratedCurrentA !== 1,
  fuse ? `ratedCurrentA = ${fuse.props.ratedCurrentA}` : 'no fuse');

// ── 2. wire it into a loop that overloads it ─────────────────────────────────
await f.evaluate((ohms) => {
  const res = components.find((c) => c.type === 'resistor');
  if (!res) return;
  if (typeof res.updateProperties === 'function') res.updateProperties({ resistance: ohms });
  if (res.properties) res.properties.resistance = ohms;
}, R_LOAD);
const load = await parts();
console.log(`   load resistor now ${JSON.stringify(load.find((p) => p.type === 'resistor')?.props)}`);

// "Built" — three parts on the board, not yet a circuit. This is the before
// shot: a 250 mA part sitting on a 9 V battery and a 10 Ω load.
await page.screenshot({ path: 'littelfuse-0218-built.png' });

// The parts arrive through the Library, but the loop is closed through the
// workspace's own wire API (`connectTerminals`), not by aiming taps at terminals:
// the terminals are 40 px apart on a phone and a missed tap silently leaves an
// open circuit that reads exactly like a fuse that refused to blow.
const wiring = await f.evaluate(() => {
  const bat = components.find((c) => c.type === 'battery');
  const fu = components.find((c) => c.type === 'fuse');
  const res = components.find((c) => c.type === 'resistor');
  if (!bat || !fu || !res) return { ok: false, why: 'a part is missing' };
  try {
    connectTerminals(bat, 'positive', fu, 'left');
    connectTerminals(fu, 'right', res, 'left');
    connectTerminals(res, 'right', bat, 'negative');
  } catch (e) {
    return { ok: false, why: String(e).slice(0, 160) };
  }
  analyzeCircuit();
  if (typeof updateCircuitInfo === 'function') updateCircuitInfo();
  return { ok: true, wires: wires.length };
});
console.log('   wiring ' + JSON.stringify(wiring));
await page.waitForTimeout(2500);

const wired = await snap();
console.log('   after wiring ' + JSON.stringify(wired));
check('circuit.wired', wired.wires >= 3, `${wired.wires} wires`);

// ── 3. run it ────────────────────────────────────────────────────────────────
// Sample as the flow starts rather than after it: a 250 mA element opening
// against 3.6x its rating stops carrying current within a frame or two, and a
// reading taken after the melt reads 0 A — the open circuit, not the overload.
let live = { V: 0, I: 0, hasFlow: false };
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(150);
  live = await f.evaluate(() => {
    const bat = components.find((c) => c.type === 'battery');
    return {
      V: Number(bat?.properties?.voltage ?? 0),
      I: +Number(currentFlowState?.currentValue || 0).toFixed(4),
      hasFlow: !!currentFlowState?.hasFlow,
    };
  });
  if (live.I > 0.1) break;
}
console.log('   live ' + JSON.stringify(live));

const amps = live.I;
check('circuit.carries-current', amps > 0.1, `${amps.toFixed(3)} A in the loop at ${live.V} V`);
check('circuit.overloads-fuse', amps > RATING * 1.1,
  `${amps.toFixed(3)} A through a ${RATING} A part (${(amps / RATING).toFixed(1)}x rated)`);

// The datasheet I²t is what says how long that takes: t = I²t / I².
if (amps > 0) console.log(`   datasheet I²t → ${(I2T / (amps * amps)).toFixed(2)} s to open at ${amps.toFixed(3)} A`);

// Ask the engine directly, on both sides of the rating. A clone of the
// properties is used because a part that has already failed carries its own
// state, and that state is exactly what is being tested here.
const physics = await f.evaluate(([id, atAmps]) => {
  if (!window.FailureEngine) return null;
  const fu = components.find((c) => c.id === id);
  if (!fu) return null;
  const clone = { type: fu.type, properties: { ...(fu.properties || {}) } };
  const at = (a) => {
    const r = window.FailureEngine.detectFailure(clone, {
      powerDissipation: a * a * 0.02, currentRms: a, operatingVoltage: 9,
      thermalRise: 1, impedance: 0.02, storedEnergy: 0, energyDelivered: 0,
    });
    return { failed: !!r.failed, severity: r.severity, name: r.name, visual: r.visual };
  };
  return { overload: at(atAmps), below: at(atAmps * 0.28), atRating: at(0.25) };
}, [fuse.id, amps]);
console.log('   FUSE engine ' + JSON.stringify(physics));

check('fuse.opens-overloaded', !!physics?.overload?.failed && physics.overload.visual === 'blowout',
  physics ? `${physics.overload.name} (${physics.overload.visual}), severity ${physics.overload.severity}` : 'no FailureEngine on the workspace');
// The half that matters for a manufacturer: it must NOT fail under its rating.
check('fuse.holds-under-rating', physics?.below?.failed === false,
  physics ? `at ${(amps * 0.28).toFixed(3)} A: severity ${physics.below.severity}, failed ${physics.below.failed}` : 'no engine');

// And it must actually happen on the board, not just in the engine.
let screen = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(250);
  screen = await f.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, ' ');
    const toast = document.getElementById('fuse-toast-container');
    return {
      failed: /Fuse Element Melts/i.test(txt),
      toast: (toast?.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
      current: +Number(currentFlowState?.currentValue || 0).toFixed(4),
    };
  });
  if (screen.failed) break;
}
check('fuse.trips-on-screen', !!screen?.failed,
  screen?.failed
    ? `nameplate/toast report the melt; current is now ${screen.current} A (element open)`
    : 'no failure text on the workspace after 10 s');
if (screen?.toast) console.log(`   FUSE toast: ${screen.toast}`);

await page.waitForTimeout(1500);
await page.screenshot({ path: 'littelfuse-0218-blown.png' });

const errs = logs.filter((l) => l.type === 'pageerror' || l.type === 'weberror');
check('console.clean', errs.length === 0, errs.length ? errs[0].text : 'no page errors');

await browser.close();
const failed = R.filter((r) => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed`);
process.exit(failed.length ? 1 : 0);
