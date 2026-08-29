import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
await page.goto('http://localhost:3000/legacy.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
console.log(JSON.stringify({
  builderReady: await page.evaluate(() => window._builderReady === true),
  canvas: await page.evaluate(() => !!document.querySelector('canvas')),
  fnCount: await page.evaluate(() => ['showWireGuide','analyzeCircuit','enableWireMode','init'].map(n => n + '=' + typeof window[n])),
  modalGone: await page.evaluate(() => document.getElementById('tutorial-backdrop') === null),
  errors: errs.slice(0, 10),
}, null, 2));
await browser.close();
