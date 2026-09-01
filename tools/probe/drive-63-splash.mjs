// Prove there is only ONE screen on the way in. The flat-text wordmark splash
// in index.html used to paint for a couple of seconds before landing.html's
// real 3D logo arrived - two landing screens in a row. Samples what is actually
// on top, and what it says, across the whole boot.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/', { waitUntil: 'commit', timeout: 180000 });

const read = () => page.evaluate(() => {
  const loader = document.getElementById('initial-loader');
  const iframe = document.querySelector('.home-page iframe');
  let hero = null, flatFallbackShown = null;
  try {
    const d = iframe && iframe.contentDocument;
    if (d) {
      hero = (d.querySelector('.hero')?.textContent || '').trim().replace(/\s+/g, ' ');
      const wm = d.querySelector('.wordmark3d');
      const fb = d.querySelector('.wordmark--fallback');
      flatFallbackShown = !!(wm && wm.classList.contains('is-fallback')) &&
        !!(fb && getComputedStyle(fb).display !== 'none');
    }
  } catch (e) {}
  return {
    loaderPresent: !!loader,
    loaderText: loader ? (loader.textContent || '').trim() : null,
    loaderBg: loader ? getComputedStyle(loader).backgroundColor : null,
    // Any element still drawing the wordmark as flat CSS text.
    flatWordmarks: [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && /^Circui$|^Try$|^3D$/.test((el.textContent || '').trim()))
      .length,
    hero, flatFallbackShown,
  };
});

let last = 0;
for (const t of [0, 300, 800, 1500, 2500, 4000, 7000, 11000]) {
  if (t > last) { await page.waitForTimeout(t - last); last = t; }
  const s = await read();
  console.log(`t=${String(t).padStart(5)}ms  loader=${s.loaderPresent ? 'PRESENT ' + s.loaderBg : 'gone'}` +
    `  loaderText="${s.loaderText ?? ''}"  flatWordmarkNodes=${s.flatWordmarks}` +
    `  hero="${(s.hero ?? '').slice(0, 40)}"  3DfellBackToFlat=${s.flatFallbackShown}`);
}
await page.screenshot({ path: 'tools/probe/boot-final.png', timeout: 60000 }).catch(e => console.log('screenshot skipped:', e.message));
await browser.close();
