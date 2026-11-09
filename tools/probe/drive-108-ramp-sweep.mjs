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
if (card) {
  check('the card does not cover the part frame',
    card.top > (broke ? broke.height : 0) - 4,
    `card top ${card.top}, strip ${broke ? broke.height : '?'}`);
}
await shot('03-failure-card.png');

const errors = logs.filter((l) => l.type === 'pageerror');
check('no page errors during the run', errors.length === 0, errors.slice(0, 2).map((e) => e.text).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
