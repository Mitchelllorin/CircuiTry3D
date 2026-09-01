// Two things at once: the Build nav icon is now the real logo file, and the
// three menu toggles paint no box at all.
import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
console.log(JSON.stringify(await page.evaluate(() => {
  const paints = (el) => {
    const cs = getComputedStyle(el);
    const out = [];
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') out.push('bg=' + cs.backgroundColor);
    if (cs.backgroundImage !== 'none') out.push('bgImg');
    if (!/^0px/.test(cs.borderTopWidth + ' ')) out.push('border=' + cs.borderTopWidth);
    if (cs.boxShadow !== 'none') out.push('shadow=' + cs.boxShadow.slice(0, 70));
    if (cs.borderRadius !== '0px') out.push('radius=' + cs.borderRadius);
    return out.length ? out : ['(nothing)'];
  };
  const buildTab = [...document.querySelectorAll('.mode-tab')].find(b => /Build/.test(b.innerText));
  const img = buildTab && buildTab.querySelector('img');
  return {
    buildIcon: img ? {
      srcKind: /^data:/.test(img.src) ? 'rendered-3D-png' : img.src.split('/').pop(),
      naturalW: img.naturalWidth, naturalH: img.naturalHeight,
      displayed: [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)],
      complete: img.complete,
    } : 'no <img> in the Build tab (still on the glyph fallback?)',
    otherIconsStill3D: [...document.querySelectorAll('.mode-tab img')]
      .filter(i => /^data:/.test(i.src)).length,
    toggles: Object.fromEntries(['left', 'right', 'bottom'].map(s => {
      const t = document.querySelector(`.builder-menu-toggle-${s}`);
      return [s, t ? paints(t) : 'ABSENT'];
    })),
  };
}, null), null, 2));
await browser.close();
