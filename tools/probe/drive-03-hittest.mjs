import { openBuilder } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.error(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

stamp('launching');
const { browser, page } = await openBuilder();
stamp('loaded');

const out = await page.evaluate(() => {
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
    if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return;
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    blocked.push({
      target: desc(el),
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 44),
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      coveredBy: desc(hit), coverText: (hit.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 34),
      targetZ: cs.zIndex, coverZ: getComputedStyle(hit).zIndex,
    });
  });
  return blocked;
});
stamp('evaluated');

console.log(`=== BLOCKED CONTROLS: ${out.length} ===`);
for (const b of out) {
  console.log(`\n  "${b.text || '(icon)'}"  <${b.target}> z=${b.targetZ}`);
  console.log(`    at ${JSON.stringify(b.rect)}  ->  covered by <${b.coveredBy}> z=${b.coverZ}  "${b.coverText}"`);
}
await browser.close();
stamp('closed');
