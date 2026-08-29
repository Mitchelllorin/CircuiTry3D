import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const out = await page.evaluate(() => ({
  pillPresent: !!document.querySelector('.builder-payoff-guard'),
  demoText: [...document.querySelectorAll('*')].some(e => !e.children.length && /Demo circuit/i.test(e.textContent || '')),
  tourUp: !!document.querySelector('.builder-tour-skip'),
}));
console.log(JSON.stringify(out, null, 2));
await browser.close();
