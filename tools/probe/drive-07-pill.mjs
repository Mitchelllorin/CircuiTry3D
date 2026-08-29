import { openBuilder } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ---- ${m}`);
stamp('launching');
const { browser, page } = await openBuilder();
stamp('loaded');

// The pill only renders in the tour path (showcase locked, banner suppressed).
// Inject the exact markup Builder.tsx renders into the exact parent it renders
// into, so the CSS fix is tested for real: same classes, same stacking context.
const out = await page.evaluate(() => {
  const parent = document.querySelector('.builder-workspace');
  if (!parent) return { error: 'no .builder-workspace' };
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'builder-payoff-guard';
  btn.setAttribute('data-probe', '1');
  btn.innerHTML = '<span class="builder-payoff-guard__hint">🔒 Demo circuit — tap to edit</span>';
  parent.appendChild(btn);

  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const nm = el => el ? el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 44) : null;

  // what else lives in that band?
  const neighbours = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el === btn || btn.contains(el)) return;
    const cs = getComputedStyle(el);
    if (!/fixed|absolute/.test(cs.position)) return;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    const b = el.getBoundingClientRect();
    if (b.width < 10 || b.height < 10) return;
    const overlaps = b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
    if (overlaps) neighbours.push({ n: nm(el), z: cs.zIndex, rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] });
  });

  const res = {
    pillRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    viewport: [innerWidth, innerHeight],
    onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    reachable: !!hit && (btn === hit || btn.contains(hit) || hit.contains(btn)),
    hitAtCentre: nm(hit),
    overlappingLayers: neighbours,
  };
  btn.remove();
  return res;
});
console.log(JSON.stringify(out, null, 2));
stamp('done');
await browser.close();
