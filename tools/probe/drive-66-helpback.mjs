// The About modal's "< Back" would not take a click in drive-65. Is the button
// missing, off-screen, or covered? (Hit-test = the layering bug class detector.)
import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Help/.test(b.innerText))?.click());
await page.waitForTimeout(1600);
await page.evaluate(() => [...document.querySelectorAll('.guides-action-btn')].find(b => /About CircuiTry3D/.test(b.innerText))?.click());
await page.waitForTimeout(1500);

console.log(JSON.stringify(await page.evaluate(() => {
  const els = [...document.querySelectorAll('.help-back')];
  return els.map(b => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, position: cs.position,
      onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      topAtCentre: top ? (top.className || top.tagName).toString().slice(0, 70) : null,
      isSelf: top === b || b.contains(top),
    };
  });
}, null), null, 2));
await browser.close();
