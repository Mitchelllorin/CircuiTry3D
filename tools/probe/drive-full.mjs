import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ---- ${m}`);
const show = (label, val) => console.log(`\n=== ${label} ===\n` + JSON.stringify(val, null, 2));

stamp('launching');
const { browser, page, logs } = await openBuilder();
stamp('loaded');

const SHOT = n => page.screenshot({ path: `tools/probe/shot-${n}.png` }).catch(e => console.log('shot fail', n, e.message));
await SHOT('a-loaded');

// ---------- 1. layering / hit-test ----------
const hitTest = () => page.evaluate(() => {
  const desc = (el) => {
    const c = String((el.className && (el.className.baseVal ?? el.className)) || '');
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 2).join('.') : '');
  };
  const blocked = [];
  document.querySelectorAll('button, a[href], input, select, [role="button"], [role="tab"]').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return;
    if (r.right < 1 || r.bottom < 1 || r.left > innerWidth - 1 || r.top > innerHeight - 1) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    blocked.push({ text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      target: desc(el), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      coveredBy: desc(hit), coverText: (hit.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      tz: cs.zIndex, cz: getComputedStyle(hit).zIndex });
  });
  return blocked;
});
show('BLOCKED CONTROLS (default view)', await hitTest());
stamp('hit-test done');

// ---------- 2. the demo lock chip ----------
show('DEMO LOCK CHIP', await page.evaluate(() => {
  const el = [...document.querySelectorAll('button,[role=button],div')].find(e =>
    /Demo circuit/.test((e.innerText || '')) && e.children.length === 0 || /Demo circuit — tap to edit/.test(e.getAttribute?.('aria-label') || ''));
  const chip = el || [...document.querySelectorAll('*')].find(e => (e.innerText || '').trim() === '🔒 Demo circuit — tap to edit');
  if (!chip) return { found: false };
  const r = chip.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  return { found: true, tag: chip.tagName, cls: String(chip.className || '').slice(0, 60),
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    z: getComputedStyle(chip).zIndex,
    hitAtCenter: hit ? hit.tagName + '.' + String(hit.className || '').slice(0, 50) : null,
    hitZ: hit ? getComputedStyle(hit).zIndex : null,
    reachable: hit ? (chip === hit || chip.contains(hit) || hit.contains(chip)) : false };
}));

// ---------- 3. ticker vs mode bar ----------
show('TOP BAND GEOMETRY', await page.evaluate(() => {
  const b = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
  const nav = b('.workspace-mode-bar'), tick = b('.builder-ticker-feed'), bar = b('.unified-action-bar');
  const cs = getComputedStyle(document.documentElement);
  return { nav, ticker: tick, actionBar: bar,
    navVsTicker: nav && tick ? Math.max(0, nav.bottom - tick.top) : 'n/a',
    tickerVsActionBar: tick && bar ? Math.max(0, tick.bottom - bar.top) : 'n/a',
    varBarH: cs.getPropertyValue('--app-mode-bar-height').trim(),
    varTickerTop: cs.getPropertyValue('--builder-ticker-top').trim() };
}));

// ---------- 4. drive: open library, add a resistor ----------
stamp('driving: open LIBRARY');
const click = async (sel, label) => {
  try { await page.click(sel, { timeout: 8000 }); await page.waitForTimeout(900); console.log(`  clicked ${label}`); return true; }
  catch (e) { console.log(`  FAILED to click ${label}: ${e.message.split('\n')[0]}`); return false; }
};
await click('.builder-menu-stage-left .builder-menu-toggle, .builder-menu-stage-left button', 'left menu toggle');
await SHOT('b-library');
show('BLOCKED CONTROLS (library open)', await hitTest());

stamp('driving: add resistor');
await click('[data-tutorial-id="tutorial-add-resistor"]', 'Resistor');
await SHOT('c-resistor');

stamp('driving: WIRE mode');
await click('[data-tutorial-id="tutorial-enable-wire"]', 'WIRE');
await SHOT('d-wire');
show('BLOCKED CONTROLS (wire mode)', await hitTest());

stamp('driving: RUN');
await click('[data-tutorial-id="tutorial-run-simulation"]', 'RUN');
await SHOT('e-run');

// ---------- 5. readouts ----------
show('TICKER READOUT TEXT', await page.evaluate(() => {
  const t = document.querySelector('.builder-ticker-feed');
  return t ? t.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
}));

// ---------- 6. console ----------
const bad = logs.filter(l => /^(error|pageerror|weberror)$/i.test(l.type));
const warns = logs.filter(l => l.type === 'warning');
const dedupe = arr => { const s = new Set(), o = []; for (const l of arr) { const k = l.text.slice(0, 110); if (!s.has(k)) { s.add(k); o.push(l); } } return o; };
console.log(`\n=== ERRORS (${bad.length}, deduped) ===`);
for (const l of dedupe(bad)) console.log(`  [${l.type}] ${l.text}`);
console.log(`\n=== WARNINGS (${warns.length}, deduped) ===`);
for (const l of dedupe(warns)) console.log(`  ${l.text.slice(0, 200)}`);
console.log(`\n=== SUSPICIOUS LOGS ===`);
for (const l of dedupe(logs.filter(l => /NaN|Infinity|undefined|FAILSAFE|still empty|fallback|Falling back|failed|cannot|null/i.test(l.text))))
  console.log(`  [${l.type}] ${l.text.slice(0, 200)}`);

stamp('done');
await browser.close();
