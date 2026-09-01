// Android 15 / targetSdk 35 forces edge-to-edge: the webview now spans UNDER
// the status bar and nav bar. MainActivity calls EdgeToEdge.enable(), and the
// CSS reads env(safe-area-inset-*) into --app-safe-area-top/bottom. That is the
// plumbing; this checks it actually MOVES things.
//
// env() cannot be faked from Playwright, but the app never reads env() directly
// at the point of use — it reads the two custom properties. Overriding those at
// :root reproduces exactly what a real device hands the page.
import { openBuilder } from './_harness.mjs';

const TOP = 48;    // status bar, roughly a Pixel's
const BOTTOM = 24; // gesture nav pill

const { browser, page } = await openBuilder();

const sample = () => page.evaluate(({ TOP, BOTTOM }) => {
  const bands = [];
  document.querySelectorAll('button, a[href], [role="button"], [role="tab"], input').forEach(el => {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return;
    if (r.right < 0 || r.left > innerWidth) return;
    const label = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 26);
    if (!label) return;
    // Anything whose MIDDLE sits inside a system bar is unreachable there.
    const midY = r.top + r.height / 2;
    if (midY < 0 || midY > innerHeight) return;   // below the fold is not a collision
    if (midY < TOP) bands.push({ where: 'under status bar', label, midY: Math.round(midY) });
    else if (midY > innerHeight - BOTTOM) bands.push({ where: 'under nav bar', label, midY: Math.round(midY) });
  });
  return {
    topVar: getComputedStyle(document.documentElement).getPropertyValue('--app-safe-area-top').trim(),
    bottomVar: getComputedStyle(document.documentElement).getPropertyValue('--app-safe-area-bottom').trim(),
    builderTopVar: getComputedStyle(document.documentElement).getPropertyValue('--builder-safe-area-top').trim(),
    builderBottomVar: getComputedStyle(document.documentElement).getPropertyValue('--builder-safe-area-bottom').trim(),
    insightsTop: (() => { const b = document.querySelector('.builder-menu-stage-bottom');
      return b ? Math.round(b.getBoundingClientRect().top) : null; })(),
    modeBarTop: (() => { const b = document.querySelector('.workspace-mode-bar--global');
      return b ? Math.round(b.getBoundingClientRect().top) : null; })(),
    collisions: bands,
  };
}, { TOP, BOTTOM });

console.log('=== NO INSETS (desktop / browser) ===');
console.log(JSON.stringify(await sample(), null, 2));

await page.addStyleTag({ content: `:root {
  --app-safe-area-top: ${TOP}px !important;
  --app-safe-area-bottom: ${BOTTOM}px !important;
  --builder-safe-area-top: ${TOP}px !important;
  --builder-safe-area-bottom: ${BOTTOM}px !important;
}` });
await page.waitForTimeout(1200);

console.log(`\n=== WITH INSETS (top ${TOP}px, bottom ${BOTTOM}px — Android 15 edge-to-edge) ===`);
console.log(JSON.stringify(await sample(), null, 2));
await browser.close();
