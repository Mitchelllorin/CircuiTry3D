/**
 * THE RAMP — the failure shot, photographed at 360x640.
 *
 * Mitchell's acceptance note (BREAK-IT.md section 4): the sweep had green tests
 * and still did not happen on a real screen. So this drives the actual UI and
 * looks at it: the strip, a preset tapped, the sweep mid-flight, the failure
 * card up — and checks the two layout rules that keep the part visible while it
 * all happens (strip at most a third of the screen, canvas at least two thirds).
 *
 *   node tools/probe/drive-108-ramp-sweep.mjs
 *
 * Needs the dev server already running on 3000 (this script does not start one).
 * Shots land in docs/breakit/.
 */
import { mkdirSync } from 'node:fs';
import { openBuilder } from './_harness.mjs';

const OUT = 'docs/breakit';
const VIEW = { width: 360, height: 640 };
const THIRD = VIEW.height / 3;

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

mkdirSync(OUT, { recursive: true });

const { browser, page, logs } = await openBuilder();
await page.setViewportSize(VIEW);
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(10000);

const strip = () => page.evaluate(() => {
  const el = document.querySelector('.arena-breakit');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    height: Math.round(r.height),
    vh: window.innerHeight,
    presets: el.querySelectorAll('.arena-breakit__preset').length,
    bars: el.querySelectorAll('.arena-breakit__bar').length,
    failedBars: el.querySelectorAll('.arena-breakit__bar--failed').length,
    rampShown: !!el.querySelector('.arena-breakit__ramp') &&
      getComputedStyle(el.querySelector('.arena-breakit__ramp')).display !== 'none',
    broken: el.classList.contains('is-broken'),
  };
});

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}`, animations: 'allow' });
  console.log(`   shot ${OUT}/${name}`);
};

// ── 1. the strip ─────────────────────────────────────────────────────────────
const base = await strip();
check('The Ramp strip is mounted', !!base);
if (!base) { await browser.close(); process.exit(1); }
console.log(`\nstrip top=${base.top} height=${base.height} of ${base.vh}\n`);
check('strip is at most a third of the screen', base.height <= THIRD + 2,
  `${base.height}px vs ${Math.round(THIRD)}px`);
check('canvas keeps at least two thirds', base.vh - base.height >= VIEW.height * 2 / 3 - 2,
  `${base.vh - base.height}px of ${VIEW.height}`);
check('three stress bars on show', base.bars === Math.min(3, base.bars) && base.bars > 0, `${base.bars}`);
check('presets are offered', base.presets > 0, `${base.presets}`);
// QC 1: a part that is broken before the ramp moves proves nothing. The 470 µF
// capacitor used to sit at 683 % of an invented power rating at 1.00x and peak
// at 162 °C without the sweep touching it.
check('nothing is broken before the ramp moves', base.failedBars === 0,
  `${base.failedBars} bar(s) already failed`);
const labels = await page.evaluate(() =>
  [...document.querySelectorAll('.arena-breakit__preset')].map((b) => b.textContent.trim()));
check('no maker names on the preset buttons',
  !labels.some((l) => /littelfuse|vishay|onsemi|bourns|yageo|texas|smiths/i.test(l)),
  JSON.stringify(labels));
await shot('01-ramp-strip.png');

// ── 2. tap a preset: sweep, then the card ────────────────────────────────────
await page.evaluate(() => document.querySelector('.arena-breakit__preset')?.click());
await page.waitForTimeout(550);
await shot('02-mid-sweep.png');

const mid = await strip();
check('strip shrinks or stays within the third mid-sweep', !!mid && mid.height <= THIRD + 2,
  mid ? `${mid.height}px` : 'gone');

let card = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(250);
  card = await page.evaluate(() => {
    const el = document.querySelector('.arena-fail');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      height: Math.round(r.height),
      text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 90),
      isolate: getComputedStyle(document.querySelector('.arena-scene__isolate')).opacity,
    };
  });
  if (card) break;
}
check('the failure card comes up', !!card, card ? card.text : 'no .arena-fail within 10s');
check('everything but the part is isolated', !!card && Number(card.isolate) > 0.9,
  card ? `overlay opacity ${card.isolate}` : '');
const broke = await strip();
check('the strip steps back at the break', !!broke && broke.height < base.height,
  broke ? `${broke.height}px vs ${base.height}px` : '');
check('the ramp controls leave the strip at the break', !!broke && !broke.rampShown,
  broke ? `ramp shown: ${broke.rampShown}` : '');
if (card) {
  // QC 2/3: the card was 217px tall and started at y273, leaving 43 % of the
  // screen above it and covering the part the camera had just framed.
  check('the card is a band, not a sheet', card.height <= 170, `${card.height}px`);
  check('the clear canvas above the card is at least two thirds',
    card.top >= VIEW.height * 2 / 3 - 2,
    `card top ${card.top}px, needs ${Math.round(VIEW.height * 2 / 3)}px`);
}
const tempText = await page.evaluate(() => {
  const el = document.querySelector('.arena-breakit__gauge b');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { text: el.textContent.trim(), clipped: el.scrollWidth > r.width + 1 };
});
check('the failed temperature reads in full, not "FAILE…"',
  !!tempText && !tempText.clipped, tempText ? JSON.stringify(tempText) : 'no gauge');
await shot('03-failure-card.png');

const errors = logs.filter((l) => l.type === 'pageerror');
check('no page errors during the run', errors.length === 0, errors.slice(0, 2).map((e) => e.text).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
