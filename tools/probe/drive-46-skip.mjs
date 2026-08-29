import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
let up = false;
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1500);
  up = await page.evaluate(() => !!document.querySelector('.builder-tour-skip'));
  if (up) { console.log('tour appeared at ' + ((i+1)*1.5) + 's'); break; }
}
if (!up) {
  console.log('TOUR NEVER OPENED. dismissKey=' + await page.evaluate(() =>
    localStorage.getItem('circuitry3d:onboarding:tour-dismissed:v2')));
  await browser.close(); process.exit(0);
}
console.log(JSON.stringify(await page.evaluate(() => {
  const s = document.querySelector('.builder-tour-skip');
  const bar = document.querySelector('.workspace-mode-bar');
  const sb = s.getBoundingClientRect(), bb = bar?.getBoundingClientRect();
  const cx = sb.left + sb.width / 2, cy = sb.top + sb.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  return {
    skip: { top: +sb.top.toFixed(1), right: +sb.right.toFixed(1), w: +sb.width.toFixed(1), h: +sb.height.toFixed(1) },
    bar: bb ? { top: +bb.top.toFixed(1), bottom: +bb.bottom.toFixed(1), left: +bb.left.toFixed(1), right: +bb.right.toFixed(1) } : null,
    overlapsBar: bb ? !(sb.bottom <= bb.top || sb.top >= bb.bottom || sb.right <= bb.left || sb.left >= bb.right) : null,
    zSkipLayer: getComputedStyle(document.querySelector('.builder-tutorial-layer')).zIndex,
    zBar: bar ? getComputedStyle(bar).zIndex : null,
    topmostAtSkipCentre: hit ? (hit.className || hit.tagName) : null,
    skipIsClickable: hit === s || s.contains(hit),
    bg: getComputedStyle(s).backgroundColor, border: getComputedStyle(s).borderTopWidth,
  };
}), null, 2));
await browser.close();
