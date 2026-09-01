// "The three toggle tabs still have containers — borders still visible."
// Report every property that can paint a box, for each toggle AND its ancestors.
import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
console.log(JSON.stringify(await page.evaluate(() => {
  const paint = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel: String(el.className || el.tagName).slice(0, 52),
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage === 'none' ? '-' : cs.backgroundImage.slice(0, 60),
      border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      radius: cs.borderRadius,
      boxShadow: cs.boxShadow === 'none' ? '-' : cs.boxShadow.slice(0, 110),
      filter: cs.filter === 'none' ? '-' : cs.filter.slice(0, 80),
      backdrop: cs.backdropFilter === 'none' ? '-' : cs.backdropFilter,
      padding: cs.padding,
    };
  };
  const out = {};
  for (const side of ['left', 'right', 'bottom']) {
    const t = document.querySelector(`.builder-menu-toggle-${side}`);
    if (!t) { out[side] = 'ABSENT'; continue; }
    const chain = [];
    let el = t;
    for (let i = 0; i < 3 && el; i++) { chain.push(paint(el)); el = el.parentElement; }
    out[side] = chain;
  }
  return out;
}, null), null, 2));
await browser.close();
