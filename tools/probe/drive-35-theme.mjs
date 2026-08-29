import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const out = await page.evaluate(() => ({
  htmlTheme: document.documentElement.getAttribute('data-theme'),
  bodyClass: String(document.body.className).slice(0, 80),
  sheets: document.styleSheets.length,
  readable: [...document.styleSheets].filter(s => { try { return !!s.cssRules; } catch { return false; } }).length,
}));
console.log(JSON.stringify(out, null, 2));
await browser.close();
