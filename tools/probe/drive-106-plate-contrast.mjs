/**
 * CAN YOU READ THE NAMEPLATE WHEN THE BENCH IS BRIGHT?
 *
 * The arena used to float every readout directly on the 3D — no chip, no tint,
 * no blur, just a tight text-shadow, on the argument that the dome behind them
 * is dark. It is not dark where the plates are: they sit over lit parts, copper
 * wire and failure flashes, because that is where the parts are.
 *
 * This is the check the family rules actually ask for, in their words:
 * "composite the panel over pure white and over pure black and confirm text
 * still clears 4.5:1 both times. If it fails on white, the model turning to a
 * bright face will kill it."
 *
 *   node tools/probe/drive-106-plate-contrast.mjs
 *
 * ── Why it is computed and not screenshotted ────────────────────────────────
 *
 * It used to blank the plates' text, screenshot the page, and read the pixels
 * under each readout. That is the obvious way to do it and it could not be made
 * to tell the truth on this hardware:
 *
 *   - THE WRONG RECTANGLE. It took one rect per PLATE and scored every ink in
 *     it against all of those pixels. A W.I.R.E. glyph sits in the solid inset
 *     at the foot of the plate; scoring it against the part name two rows up
 *     measured ground it never stands on.
 *
 *   - THE WRONG FRAME, which is what produced the alarming numbers. A
 *     screenshot here takes 1–3 seconds — the compositor, not the pixel count;
 *     clipping it to 20x20 saved nothing. The parts walk on and the plates
 *     track them, so between reading a rect and capturing the frame every
 *     readout moved: 98px mid-walk, 5px on a settled bench, 27px even with the
 *     virtual clock paused (the renderer holds its own rAF reference, so it
 *     cannot be frozen from outside). The probe was sampling bare 3D a fifth of
 *     a screen from the glyph and calling it the glyph's ground. "The E glyph
 *     loses 94% of its own area" was that, and nothing else.
 *
 * Compositing over uniform white and uniform black removes the race entirely,
 * and it is not the softer test — it is the harsher one. Pure white is a worse
 * backdrop than any lit part the dome can actually produce, so passing here
 * passes everywhere. It is also EXACT rather than sampled: over a uniform
 * backdrop a blur is a no-op, so the composited surface under a chip can be
 * computed rather than guessed at.
 *
 * What it still catches is the case this probe exists for: a readout with no
 * chip under it compositing straight onto white, where near-white ink vanishes.
 */
import { openBuilder } from './_harness.mjs';

const BODY_MIN = 4.5;      // WCAG AA body text

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const { browser, page } = await openBuilder({ gpu: true });
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(9000);
// Head-to-head: more parts, more plates, and the bright failure flashes.
await page.evaluate(() => {
  [...document.querySelectorAll('.arena-dash__mode-btn')].find((b) => /battle/i.test(b.textContent))?.click();
});
await page.waitForTimeout(6000);
// Throw the switch — the plates only carry live figures during a run.
await page.evaluate(() => document.querySelector('.arena-dash__switch')?.click());
await page.waitForTimeout(16000);   // let the parts finish walking on

/**
 * Every run of text a plate paints, with the stack of surfaces beneath it.
 *
 * The stack is what matters and why this is read from the live DOM rather than
 * from the stylesheet: a glyph's ground is its own box if that box paints one,
 * otherwise its parent's, and the answer changes with plate state (focused,
 * compact, failing). Ancestor opacity is folded in because a dimmed plate dims
 * its own background too.
 */
const readouts = await page.evaluate(() => {
  const out = [];
  const parse = (css) => {
    const n = (css.match(/[\d.]+/g) || []).map(Number);
    return n.length >= 3 ? { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 } : null;
  };
  for (const p of document.querySelectorAll('.arena-nameplate, .arena-dial-label')) {
    const pr = p.getBoundingClientRect();
    if (pr.width < 2 || pr.height < 2) continue;
    const pcs = getComputedStyle(p);
    if (pcs.visibility === 'hidden' || pcs.opacity === '0') continue;
    const cls = p.className.split(' ')[0];
    const walk = (el) => {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText) {
        const ink = parse(getComputedStyle(el).color);
        const stack = [];
        let cur = el, dim = 1;
        while (cur && cur !== document.documentElement) {
          const cs = getComputedStyle(cur);
          dim *= Number(cs.opacity) || 1;
          const bg = parse(cs.backgroundColor);
          if (bg && bg.a > 0) stack.push({ ...bg, a: bg.a * dim });
          if (bg && bg.a * dim >= 0.999) break;   // opaque: nothing below shows
          cur = cur.parentElement;
        }
        if (ink) {
          out.push({
            cls,
            sample: (el.textContent || '').trim().slice(0, 22),
            ink: { ...ink, a: ink.a * dim },
            stack,
          });
        }
      }
      for (const kid of el.children) walk(kid);
    };
    walk(p);
  }
  return out;
});

const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ({ r, g, b }) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** `over` shows through wherever `src` is not fully opaque. */
const over = (src, dst) => ({
  r: src.r * src.a + dst.r * (1 - src.a),
  g: src.g * src.a + dst.g * (1 - src.a),
  b: src.b * src.a + dst.b * (1 - src.a),
  a: 1,
});

/** The surface a readout's ink is printed on, given what lies behind the page. */
function surfaceOver(stack, backdrop) {
  let out = backdrop;
  for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
  return out;
}

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

console.log(`\n${readouts.length} readouts on screen\n`);
console.log('Each readout composited over pure white and over pure black.');
console.log('Both must clear 4.5:1 — white is the one that kills a bare readout.\n');

// One row per distinct readout, worst of the two backdrops.
const seen = new Map();
for (const r of readouts) {
  const results = [['white', WHITE], ['black', BLACK]].map(([name, bd]) => {
    const surf = surfaceOver(r.stack, bd);
    const ink = over(r.ink, surf);          // ink alpha blends onto its own ground
    return { name, ratio: ratio(lum(ink), lum(surf)), bare: r.stack.length === 0 };
  });
  const worstOne = results.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
  const key = `${r.cls} "${r.sample}"`;
  const prev = seen.get(key);
  if (!prev || worstOne.ratio < prev.ratio) seen.set(key, worstOne);
}

for (const [key, v] of [...seen].sort((a, b) => a[1].ratio - b[1].ratio)) {
  check(
    `${key}  ${v.ratio.toFixed(2)}:1`,
    v.ratio >= BODY_MIN,
    `worst over ${v.name}${v.bare ? ' — NO CHIP: ink sits straight on the render' : ''}`,
  );
}

await page.screenshot({ path: 'tools/probe/plate-contrast.png' });
console.log(`\n${pass} passed, ${fail} failed  (body text floor ${BODY_MIN}:1)`);
await browser.close();
process.exit(fail ? 1 : 0);
