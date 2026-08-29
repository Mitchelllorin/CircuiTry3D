import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Learn/.test(b.innerText))?.click());
await page.waitForTimeout(1600);
console.log(JSON.stringify(await page.evaluate(() => {
  let el = document.querySelector('.learn-launcher');
  const chain = [];
  while (el && chain.length < 6) {
    el = el.parentElement;
    if (!el) break;
    chain.push({ cls: String(el.className).slice(0,60), text: (el.innerText||'').replace(/\s+/g,' ').slice(0,110) });
  }
  return chain;
}), null, 2));
await browser.close();
