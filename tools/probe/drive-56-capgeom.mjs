// Exact rects for the caption vs the mode bar - drive-55 only says overlap y/n.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(13000);
console.log(JSON.stringify(await page.evaluate(() => {
  const cap = document.querySelector('.mode-bar-caption');
  const bar = document.querySelector('.workspace-mode-bar');
  const r = el => { const b = el.getBoundingClientRect();
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
  const root = getComputedStyle(document.documentElement);
  const v = n => root.getPropertyValue(n).trim() || '(unset)';
  return { cap: r(cap), bar: r(bar),
    band: v('--app-mode-caption-band'), builderSafeTop: v('--builder-safe-area-top'),
    appSafeTop: v('--app-safe-area-top'), gap: v('--app-mode-bar-gap'),
    barTopVar: v('--app-mode-bar-top'), barHVar: v('--app-mode-bar-height'),
    capTopCss: getComputedStyle(cap).top, barTopCss: getComputedStyle(bar).top };
}), null, 2));
await browser.close();
