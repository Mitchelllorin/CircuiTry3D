// right=STUCK from the rounds walk. Is the right toggle actually dead, or did
// the walk's own left-panel open/close leave the app in a state that blocks it?
import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const state = () => page.evaluate(() => {
  const t = document.querySelector('.builder-menu-toggle-right');
  const st = document.querySelector('.builder-menu-stage-right');
  if (!t) return { toggle: 'ABSENT' };
  const r = t.getBoundingClientRect();
  const cs = getComputedStyle(t);
  const hit = document.elementFromPoint(
    Math.min(r.left + r.width / 2, innerWidth - 1), r.top + r.height / 2);
  return {
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    pe: cs.pointerEvents, disabled: t.disabled, ariaExpanded: t.getAttribute('aria-expanded'),
    stageOpen: st ? st.className.includes('open') : null,
    stagePE: st ? getComputedStyle(st).pointerEvents : null,
    topAtCentre: hit ? String(hit.className || hit.tagName).slice(0, 50) : null,
    isSelf: !!hit && (hit === t || t.contains(hit)),
  };
});
console.log('BEFORE ', JSON.stringify(await state()));
// 1) plain DOM click — bypasses every hit-test question
await page.evaluate(() => document.querySelector('.builder-menu-toggle-right')?.click());
await page.waitForTimeout(900);
console.log('domClick', JSON.stringify(await state()));
// close again, then 2) a real tap at the toggle's centre
await page.evaluate(() => document.querySelector('.builder-menu-toggle-right')?.click());
await page.waitForTimeout(700);
const r = await page.evaluate(() => { const t = document.querySelector('.builder-menu-toggle-right');
  const b = t.getBoundingClientRect(); return { x: Math.min(b.left + b.width / 2, 410), y: b.top + b.height / 2 }; });
await page.mouse.click(r.x, r.y);
await page.waitForTimeout(900);
console.log('realTap ', JSON.stringify(await state()), 'at', JSON.stringify(r));
await browser.close();
