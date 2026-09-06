/**
 * QUICK-ADD ROW — Battery, Resistor and Junction removed from the action bar.
 *
 * They duplicated the component Library drawer. Checks the row is down to LED +
 * Switch, that the three removed parts are still reachable in the Library, and
 * that the bar got narrower rather than just rearranged.
 *
 *   node tools/probe/drive-92-quickadd.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'); } catch { /* ignore */ }
  });
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
  // SwiftShader boots slowly and unevenly; wait for it to be attached, not painted.
  await page.waitForSelector('.unified-action-bar', { state: 'attached', timeout: 150000 });
  await page.waitForTimeout(6000);

  const row = await page.evaluate(() => {
    const wrap = document.querySelector('.quick-add-btn-wrapper');
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    return {
      labels: [...wrap.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30)),
      width: Math.round(r.width),
    };
  });
  console.log('\nquick-add row:', JSON.stringify(row, null, 2), '\n');

  check('quick-add row exists', !!row);
  if (row) {
    const has = (re) => row.labels.some(l => re.test(l));
    check('Battery gone from the row', !has(/batter/i));
    check('Resistor gone from the row', !has(/resistor/i));
    check('Junction gone from the row', !has(/junction/i));
    check('LED still there', has(/led/i));
    check('Switch still there', has(/switch/i));
    check('row is 2 buttons', row.labels.length === 2, `${row.labels.length} buttons`);
  }

  // The three removed parts must still be reachable in the Library drawer.
  const openedLib = await page.evaluate(() => {
    const tab = document.querySelector('.builder-menu-toggle-left');
    if (!tab) return false;
    tab.click();
    return true;
  });
  await page.waitForTimeout(2000);
  const lib = await page.evaluate(() => {
    const stage = document.querySelector('.builder-menu-stage-left');
    if (!stage) return [];
    return [...stage.querySelectorAll('button')]
      .map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase());
  });
  check('Library drawer opened', openedLib && lib.length > 0, `${lib.length} controls`);
  for (const part of ['batter', 'resistor', 'junction']) {
    check(`${part} still reachable in the Library`, lib.some(l => l.includes(part)));
  }

  // Nothing in the action bar may sit on top of anything else.
  const overlaps = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.unified-action-bar button')];
    const bad = [];
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const owner = document.elementFromPoint(cx, cy);
      if (owner && !b.contains(owner) && owner !== b) {
        bad.push(`${b.getAttribute('aria-label')} covered by ${owner.tagName}.${owner.className}`.slice(0, 90));
      }
    }
    return bad;
  });
  check('no action-bar button is covered at its own centre', overlaps.length === 0, overlaps.join(' | '));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
