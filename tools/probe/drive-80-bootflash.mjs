// "A split second of chaos on boot" — ~30 quick-action buttons, the nav bar
// and the ticker all visible, then it settles to the near-empty default.
//
// Samples what is actually on screen from the first paint onward, so the flash
// is described in milliseconds and element counts rather than impressions.
import { chromium } from 'playwright';
import { CHROME, TOUR } from './_harness.mjs';

const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
});
await ctx.addInitScript((k) => { try { localStorage.setItem(k, '1'); } catch (e) {} }, TOUR);
const page = await ctx.newPage();

// `commit` so we start sampling at the very first paint, not after load.
await page.goto('http://localhost:3000/#/app', { waitUntil: 'commit', timeout: 180000 });

const SAMPLE = function () {
  const vis = function (el) {
    if (el.checkVisibility) {
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    }
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
  };
  const count = function (sel) {
    return [].slice.call(document.querySelectorAll(sel)).filter(vis).length;
  };
  const bar = document.querySelector('.unified-action-bar');
  return {
    // Has the stylesheet that hides things actually arrived?
    cssReady: !!bar && getComputedStyle(bar).position !== 'static',
    barMode: bar ? bar.getAttribute('data-bar-mode') : null,
    quickAdds: count('.quick-add-btn-wrapper > *'),
    edgeBtns: count('.edge-action-btn'),
    navTabs: count('.mode-tab'),
    ticker: count('.tips-ticker'),
    allButtons: count('button'),
    shell: !!document.querySelector('.builder-shell'),
  };
};

console.log('ms    css  mode    quickAdds edge nav ticker allBtns shell');
const t0 = Date.now();
const seen = [];
for (let i = 0; i < 70; i++) {
  let s = null;
  try { s = await page.evaluate(SAMPLE); } catch (e) { /* navigating */ }
  if (s) {
    const ms = Date.now() - t0;
    seen.push({ ms, ...s });
    console.log(
      String(ms).padEnd(6) +
      String(s.cssReady).padEnd(5) +
      String(s.barMode).padEnd(8) +
      String(s.quickAdds).padEnd(10) +
      String(s.edgeBtns).padEnd(5) +
      String(s.navTabs).padEnd(4) +
      String(s.ticker).padEnd(7) +
      String(s.allButtons).padEnd(8) +
      s.shell,
    );
  }
  await page.waitForTimeout(120);
}

const peak = seen.reduce((a, b) => (b.allButtons > a.allButtons ? b : a), seen[0]);
const settled = seen[seen.length - 1];
console.log('\n=== VERDICT ===');
console.log('peak on screen   :', peak.allButtons, 'buttons at', peak.ms + 'ms  (quickAdds=' + peak.quickAdds + ', mode=' + peak.barMode + ')');
console.log('settled state    :', settled.allButtons, 'buttons (quickAdds=' + settled.quickAdds + ', mode=' + settled.barMode + ')');
console.log('excess shown     :', peak.allButtons - settled.allButtons, 'extra buttons during the flash');
const firstCss = seen.find((s) => s.cssReady);
console.log('css ready at     :', firstCss ? firstCss.ms + 'ms' : 'never in window');

await browser.close();
