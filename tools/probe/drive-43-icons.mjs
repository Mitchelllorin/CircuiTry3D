import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(12000);
const out = await page.evaluate(() => [...document.querySelectorAll('.workspace-mode-bar img')]
  .map((i, n) => ({ n, cls: i.className, alt: i.alt, label: i.closest('a,button')?.getAttribute('aria-label') || '',
                    w: i.naturalWidth, isData: i.src.startsWith('data:image/png'), src: i.src })));
console.log(out.map(o => `${o.n} ${o.label} | ${o.cls} | ${o.w}px ${o.isData?'PNG':'svg'}`).join('\n'));
for (const o of out) {
  if (o.isData && /build|wrench/i.test(o.label + o.cls)) {
    fs.writeFileSync(`tools/probe/icon-${o.n}.png`, Buffer.from(o.src.split(',')[1], 'base64'));
    console.log('SAVED icon-' + o.n + '.png for ' + o.label);
  }
}
await browser.close();
