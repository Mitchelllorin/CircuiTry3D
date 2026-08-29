import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const out = await page.evaluate(() => {
  const bar = document.querySelector('.workspace-mode-bar');
  const r = bar.getBoundingClientRect();
  const tabs = [...bar.querySelectorAll('.mode-tab')].map(b => {
    const br = b.getBoundingClientRect();
    return { t: (b.getAttribute('aria-label') || 'brand').replace(' mode',''), x: Math.round(br.x), right: Math.round(br.right), w: Math.round(br.width),
             onScreen: br.x >= -1 && br.right <= window.innerWidth + 1 };
  });
  return {
    viewportW: window.innerWidth,
    barHeight: Math.round(r.height),
    contentWidth: bar.scrollWidth,
    visibleWidth: bar.clientWidth,
    overflowsBy: bar.scrollWidth - bar.clientWidth,
    tabsOnScreen: tabs.filter(t => t.onScreen).length,
    tabsTotal: tabs.length,
    tabs,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
