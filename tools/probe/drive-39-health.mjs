import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 250)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(12000);
console.log(JSON.stringify({
  reactMounted: await page.evaluate(() => !!document.querySelector('.builder-shell')),
  modeBarTabs: await page.evaluate(() => document.querySelectorAll('.mode-tab').length),
  pillPresent: await page.evaluate(() => !!document.querySelector('.builder-payoff-guard')),
  demoText: await page.evaluate(() => [...document.querySelectorAll('*')].some(e => !e.children.length && /Demo circuit/i.test(e.textContent || ''))),
  wireBtn: await page.evaluate(() => { const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b ? (b.disabled ? 'present-disabled' : 'present-enabled') : 'absent'; }),
  errors: errs.slice(0, 8),
}, null, 2));
await browser.close();
