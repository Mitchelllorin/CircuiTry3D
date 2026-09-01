// The guided tour auto-opens on a first run and used to offer only "Next" and
// "Build it with me" — declining BOTH meant finding a small x in the header.
// Checks that a Skip exists, is thumb-sized, and actually ends the tour for good.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
// NOTE: no tour pre-dismissal here — the whole point is the first-run path.
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });

let up = false;
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(1500);
  up = await page.evaluate(() => !!document.querySelector('.builder-tutorial-card--tour'));
  if (up) { console.log(`tour card appeared at ${((i + 1) * 1.5).toFixed(1)}s`); break; }
}
if (!up) { console.log('!! the tour never opened'); await browser.close(); process.exit(1); }

for (const theme of ['dark', 'light']) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => {
    const skip = document.querySelector('.builder-tour-skip-link');
    if (!skip) return null;
    const r = skip.getBoundingClientRect();
    const cs = getComputedStyle(skip);
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: skip.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height),
      colour: cs.color, bg: cs.backgroundColor, border: cs.borderTopWidth,
      reachable: !!hit && (hit === skip || skip.contains(hit)),
      offers: [...document.querySelectorAll('.builder-tour-actions button')].map(b => b.textContent.trim()) };
  });
  if (!s) { console.log(`[${theme}] !! NO SKIP CONTROL`); continue; }
  console.log(`[${theme}] "${s.text}" ${s.w}x${s.h}px  reachable=${s.reachable}  colour=${s.colour}` +
    `  bg=${s.bg} border=${s.border}\n         row: ${s.offers.join('  |  ')}`);
  if (s.h < 44) console.log('         !! under the 44px touch target');
  if (!/rgba\(0, 0, 0, 0\)|transparent/.test(s.bg) || s.border !== '0px')
    console.log('         !! Skip has a container — should be text only');
  if (!s.reachable) console.log('         !! something is covering Skip');
}

await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), 'dark');
await page.click('.builder-tour-skip-link');
await page.waitForTimeout(900);
console.log('\nafter tapping Skip:', JSON.stringify(await page.evaluate(() => ({
  cardGone: !document.querySelector('.builder-tutorial-card--tour'),
  dismissedForGood: localStorage.getItem('circuitry3d:onboarding:tour-dismissed:v2') === '1',
  // Skipping must hand the workspace back, not leave the showcase read-only.
  actionBarVisible: !!document.querySelector('.unified-action-bar'),
  tourActiveAttr: document.querySelector('.app-shell')?.getAttribute('data-tour-active') ?? null,
}))));
await browser.close();
