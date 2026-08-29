import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const log = [];
page.on('pageerror', e => log.push('PAGEERROR: ' + String(e).slice(0, 400)));
page.on('requestfailed', r => log.push('REQFAIL: ' + r.url() + ' :: ' + (r.failure()?.errorText||'')));
page.on('response', r => { if (r.status() >= 400) log.push('HTTP ' + r.status() + ' ' + r.url()); });
page.on('console', m => { if (m.type() === 'error') log.push('console: ' + m.text().slice(0, 300)); });
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);
console.log(log.join('\n') || '(clean)');
console.log('--- bodyStart ---');
console.log((await page.evaluate(() => document.body.innerHTML)).slice(0, 600));
await browser.close();
