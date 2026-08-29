import { openBuilder } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ---- ${m}`);
stamp('launching');
const { browser, page } = await openBuilder();
stamp('loaded');

const map = await page.evaluate(() => {
  const nm = el => {
    const c = String((el.className && (el.className.baseVal ?? el.className)) || '');
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 2).join('.') : '');
  };
  const rows = [];
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (!/fixed|absolute/.test(cs.position)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    const vis = el.checkVisibility
      ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })
      : true;
    rows.push({ n: nm(el), z: cs.zIndex, pos: cs.position, vis,
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      pe: cs.pointerEvents,
      t: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30) });
  });
  return rows.filter(x => x.vis).sort((a, b) => a.r[1] - b.r[1]);
});
console.log('\n=== VISIBLE POSITIONED LAYERS (sorted by top) ===');
console.log(' top  bot | z     | pe       | rect                  | name | text');
for (const m of map) console.log(
  String(m.r[1]).padStart(4), String(m.r[1] + m.r[3]).padStart(4), '|',
  String(m.z).padEnd(5), '|', m.pe.padEnd(8), '|', JSON.stringify(m.r).padEnd(21), '|', m.n, '|', m.t);

stamp('map done');

const blocked = await page.evaluate(() => {
  const nm = el => {
    const c = String((el.className && (el.className.baseVal ?? el.className)) || '');
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 2).join('.') : '');
  };
  const out = [];
  document.querySelectorAll('button, a[href], input, select, [role="button"], [role="tab"]').forEach(el => {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 1 || cy < 1 || cx > innerWidth - 1 || cy > innerHeight - 1) return;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    // ignore when the blocker is a descendant of the same interactive control
    if (hit.closest && hit.closest('button,a[href],[role="button"]') === el) return;
    out.push({ text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      target: nm(el), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      by: nm(hit), byText: (hit.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 28) });
  });
  return out;
});
console.log(`\n=== BLOCKED (ancestor-aware): ${blocked.length} ===`);
for (const b of blocked) console.log(`  "${b.text || '(icon)'}" <${b.target}> ${JSON.stringify(b.rect)}\n      -> <${b.by}> "${b.byText}"`);

stamp('done');
await browser.close();
