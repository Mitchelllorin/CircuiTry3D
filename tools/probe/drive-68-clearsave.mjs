// The rounds walk says CLEAR and SAVE are covered by the side menu stages.
// Which is it: the stage is wider than it looks, or the buttons sit under it?
import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
console.log(JSON.stringify(await page.evaluate(() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      z: cs.zIndex, pos: cs.position, pe: cs.pointerEvents, bg: cs.backgroundColor,
      opacity: cs.opacity, cls: String(el.className).slice(0, 60) }; };
  const btns = [...document.querySelectorAll('button')].filter(b => /^(CLEAR|SAVE)$/i.test(b.innerText.trim()));
  return {
    viewport: [innerWidth, innerHeight],
    buttons: btns.map(b => ({ text: b.innerText.trim(), ...box(b),
      // Walk up from the covering element to see who actually owns the pixel.
      coverChain: (() => {
        const r = b.getBoundingClientRect();
        let el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const chain = [];
        while (el && chain.length < 4) { chain.push(String(el.className || el.tagName).slice(0, 44)); el = el.parentElement; }
        return chain;
      })() })),
    stages: [...document.querySelectorAll('.builder-menu-stage')].map(box),
  };
}, null), null, 2));
await browser.close();
