import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const rows = await page.evaluate(() => {
  const out = [];
  const bg = (cs) => {
    const b = cs.backgroundColor;
    const m = b.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map(s => parseFloat(s));
    return p.length < 4 ? 1 : p[3];
  };
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (!/fixed|absolute/.test(cs.position)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 20) return;
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    if (r.top > window.innerHeight || r.bottom < 0) return;
    const a = bg(cs);
    const hasBorder = cs.borderTopWidth !== '0px' && !/transparent|rgba\(0, 0, 0, 0\)/.test(cs.borderTopColor);
    const btns = el.querySelectorAll('button').length;
    if (a < 0.02 && !hasBorder) return;
    out.push({
      cls: String(el.className).slice(0, 46) || el.tagName,
      alpha: +a.toFixed(2),
      border: hasBorder ? cs.borderTopColor.replace(/\s/g,'') : '-',
      radius: cs.borderTopLeftRadius,
      blur: cs.backdropFilter === 'none' ? '-' : cs.backdropFilter,
      buttons: btns,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      areaPct: +((r.width * r.height) / (window.innerWidth * window.innerHeight) * 100).toFixed(1),
    });
  });
  return out.sort((x, y) => y.areaPct - x.areaPct).slice(0, 30);
});
console.log(rows.map(r =>
  `${String(r.areaPct).padStart(5)}%  a=${String(r.alpha).padEnd(4)} btn=${String(r.buttons).padStart(2)} r=${r.radius.padEnd(6)} ${JSON.stringify(r.rect).padEnd(24)} ${r.cls}`
).join('\n'));
await browser.close();
