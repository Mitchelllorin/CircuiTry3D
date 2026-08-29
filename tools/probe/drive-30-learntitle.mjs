import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Learn/.test(b.innerText))?.click());
await page.waitForTimeout(1600);
console.log(JSON.stringify(await page.evaluate(() => {
  const panel = document.querySelector('.learn-launcher')?.closest('[class*="panel"]');
  return {
    panelClass: String(panel?.className || '').slice(0, 70),
    heading: panel ? [...panel.querySelectorAll('h1,h2,h3,[class*="title"]')].map(e => e.innerText.trim()).slice(0,3) : null,
    subtitle: panel ? [...panel.querySelectorAll('[class*="subtitle"]')].map(e => e.innerText.trim()).slice(0,2) : null,
  };
}), null, 2));
await browser.close();
