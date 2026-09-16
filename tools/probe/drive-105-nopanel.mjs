/**
 * THE ARENA HAS NO PARAMS PANEL — rule zero, on the screen that broke it worst.
 *
 * Both benches used to mount a WorkspaceModePanel that covered y208–757 of a
 * 915px phone: the 3D bench the arena exists to show was a strip along the top.
 * Everything it carried moved to the perimeter (quick bar sheets, console).
 *
 * Checks, on BOTH benches:
 *   1. no arena params panel is mounted at all
 *   2. the middle 60% of the viewport carries no persistent control
 *   3. the console's bench row is reachable: 48px targets, 8px apart
 *   4. what the panel carried is still reachable, in its new home
 *
 *   node tools/probe/drive-105-nopanel.mjs
 */
import { openBuilder } from './_harness.mjs';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const { browser, page, logs } = await openBuilder();
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(10000);

async function survey(label) {
  const s = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    // The middle 60% band, both axes.
    const band = { x0: vw * 0.2, x1: vw * 0.8, y0: vh * 0.2, y1: vh * 0.8 };
    const persistent = [];
    for (const el of document.querySelectorAll('button, input, [role="button"], a[href]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      // Inside an open sheet / drawer / modal? That is transient, and allowed.
      if (el.closest('.arena-quickbar__sheet, [role="dialog"], .workspace-mode-panel, .arena-part-editor')) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx > band.x0 && cx < band.x1 && cy > band.y0 && cy < band.y1) {
        persistent.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} @${Math.round(cx)},${Math.round(cy)}`);
      }
    }
    const benchRow = [...document.querySelectorAll('.arena-dash__mode-btn, .arena-dash__reset')].map((b) => {
      const r = b.getBoundingClientRect();
      return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height),
               l: Math.round(r.left), rt: Math.round(r.right), on: b.classList.contains('is-on') };
    });
    return {
      vw, vh,
      panels: document.querySelectorAll('.workspace-mode-panel--arena').length,
      persistent,
      benchRow,
      quickbar: [...document.querySelectorAll('.arena-quickbar__btn')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
      dashTop: Math.round((document.querySelector('.arena-dash')?.getBoundingClientRect().top) ?? -1),
    };
  });

  console.log(`\n── ${label} ──  viewport ${s.vw}x${s.vh}, console top=${s.dashTop}`);
  check(`${label}: no arena params panel mounted`, s.panels === 0, `${s.panels} found`);
  check(`${label}: middle 60% carries no persistent control`, s.persistent.length === 0,
    s.persistent.join(' | '));
  check(`${label}: bench row present (Solo, Battle, Reset)`, s.benchRow.length === 3,
    s.benchRow.map((b) => b.t).join(', '));
  for (const b of s.benchRow) {
    check(`${label}: "${b.t}" is a 48px target`, b.w >= 48 && b.h >= 48, `${b.w}x${b.h}`);
  }
  // 8px apart, left to right.
  const sorted = [...s.benchRow].sort((a, b) => a.l - b.l);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].l - sorted[i - 1].rt;
    check(`${label}: gap "${sorted[i - 1].t}"→"${sorted[i].t}" ≥ 8px`, gap >= 8, `${gap}px`);
  }
  check(`${label}: exactly one bench is lit`, s.benchRow.filter((b) => b.on).length === 1);
  console.log(`      quick bar: ${s.quickbar.join(' | ')}`);
  return s;
}

async function openSheet(name) {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('.arena-quickbar__btn')]
      .find((el) => el.textContent.replace(/\s+/g, ' ').toLowerCase().includes(n));
    b?.click();
  }, name);
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const sheet = document.querySelector('.arena-quickbar__sheet');
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    return {
      has: (sel) => 0,
      forecast: !!sheet.querySelector('.arena-fuse-forecast, [class*="forecast"]'),
      picker: !!sheet.querySelector('.arena-roster-picker, [class*="roster"]'),
      envelope: !!sheet.querySelector('.arena-bench-envelope'),
      log: !!sheet.querySelector('.arena-log-panel, [class*="log"]'),
      board: !!sheet.querySelector('.arena-leaderboard, [class*="leaderboard"]'),
      scrolls: getComputedStyle(sheet).overflowY === 'auto' || sheet.scrollHeight > r.height + 1,
      h: Math.round(r.height), vh: window.innerHeight,
    };
  });
}

// ── Solo bench (the arena opens here) ──
await survey('solo bench');
const soloParts = await openSheet('parts');
check('solo: Parts sheet carries the picker', !!soloParts?.picker);
check('solo: Parts sheet carries the F.U.S.E. forecast', !!soloParts?.forecast);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const soloResults = await openSheet('results');
check('solo: Results sheet carries the test log', !!soloResults?.log);
await page.screenshot({ path: 'tools/probe/nopanel-solo.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ── Walk to the battle bench, from the console ──
await page.evaluate(() => {
  [...document.querySelectorAll('.arena-dash__mode-btn')]
    .find((b) => /battle/i.test(b.textContent))?.click();
});
await page.waitForTimeout(6000);
await survey('battle bench');
const battleParts = await openSheet('parts');
check('battle: Parts sheet carries the picker', !!battleParts?.picker);
check('battle: Parts sheet carries the F.U.S.E. forecast', !!battleParts?.forecast);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: 'tools/probe/nopanel-battle.png' });

const errs = logs.filter((l) => l.type === 'pageerror' || l.type === 'weberror');
check('no page errors', errs.length === 0, errs.map((e) => e.text).join(' | ').slice(0, 300));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
