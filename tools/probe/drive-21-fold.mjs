import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
await page.locator('button', { hasText: 'Help' }).first().click();
await page.waitForTimeout(1800);
console.log(JSON.stringify(await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.guides-action-btn')].find(b => /Take the Tour/.test(b.innerText));
  if (!btn) return { error: 'no button' };
  const r = btn.getBoundingClientRect();
  let sc = btn.parentElement;
  while (sc && sc.scrollHeight <= sc.clientHeight + 2) sc = sc.parentElement;
  return {
    viewportH: window.innerHeight,
    btnTop: Math.round(r.top), btnBottom: Math.round(r.bottom),
    inViewWithoutScrolling: r.top >= 0 && r.bottom <= window.innerHeight,
    scroller: sc ? { cls: String(sc.className).slice(0,50), scrollTop: sc.scrollTop, scrollH: sc.scrollHeight, clientH: sc.clientHeight } : null,
  };
}), null, 2));
await browser.close();
