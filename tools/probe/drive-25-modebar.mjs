import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));
show('MODE BAR', await page.evaluate(() => {
  const bar = document.querySelector('.workspace-mode-bar');
  const cs = getComputedStyle(bar), r = bar.getBoundingClientRect();
  const track = [...bar.querySelectorAll('*')].find(e => e.scrollWidth > e.clientWidth + 2) || bar;
  return {
    viewportW: window.innerWidth,
    barRect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
    overflowX: cs.overflowX,
    track: { cls: String(track.className).slice(0,50), scrollW: track.scrollWidth, clientW: track.clientWidth, scrollLeft: track.scrollLeft },
    tabs: [...bar.querySelectorAll('.mode-tab')].map(b => {
      const br = b.getBoundingClientRect();
      return { t: b.innerText.replace(/\s+/g,' ').trim(), x: Math.round(br.x), right: Math.round(br.right), onScreen: br.x >= 0 && br.right <= window.innerWidth };
    }),
  };
}));
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.mode-tab')].find(x => /Help/.test(x.innerText));
  b.click();
});
await page.waitForTimeout(1800);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.guides-action-btn')].find(x => /Take the Tour/.test(x.innerText));
  if (b) b.click(); else console.log('NO TOUR BTN');
});
await page.waitForTimeout(2500);
show('HELP -> TOUR (DOM click)', await page.evaluate(() => ({
  tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
  layer: !!document.querySelector('.builder-tutorial-layer'),
})));
await browser.close();
