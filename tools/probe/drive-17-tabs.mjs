import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const r = await page.evaluate(() => {
  const out = {};
  const grab = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), cy: Math.round(b.top + b.height/2), h: Math.round(b.height), visible: b.width > 2 };
  };
  out.viewportH = window.innerHeight;
  out.centerY = Math.round(window.innerHeight / 2);
  out.left = grab('.builder-menu-toggle-left');
  out.right = grab('.builder-menu-toggle-right');
  out.drop = getComputedStyle(document.documentElement).getPropertyValue('--builder-menu-toggle-drop').trim();
  // does anything clip them?
  const el = document.querySelector('.builder-menu-toggle-left');
  const chain = [];
  let p = el?.parentElement;
  while (p && p !== document.documentElement) {
    const cs = getComputedStyle(p), br = p.getBoundingClientRect();
    if (cs.overflowY !== 'visible') chain.push({ cls: String(p.className).slice(0,40), ovy: cs.overflowY, top: Math.round(br.top), bottom: Math.round(br.bottom) });
    p = p.parentElement;
  }
  out.clippers = chain;
  // hit test the tab centre — is it actually the topmost element there?
  if (out.left) {
    const hit = document.elementFromPoint(20, out.left.cy);
    out.leftHit = String(hit?.className || hit?.tagName).slice(0, 50);
  }
  if (out.right) {
    const hit = document.elementFromPoint(window.innerWidth - 20, out.right.cy);
    out.rightHit = String(hit?.className || hit?.tagName).slice(0, 50);
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
