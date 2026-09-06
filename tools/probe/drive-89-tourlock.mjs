/**
 * TOUR LOCK — does ✕ on the guided tour actually hand the workspace over?
 *
 * Reported from the phone: taps do not select a component, long-press edit
 * never appears, and the app "goes back to the beginning" on its own. The
 * perimeter probe could not close the tour card at all, which points at the
 * same place: if the tour is up (or re-opens), `shouldShowEdgeActions` is false
 * — no action bar — and the showcase lock is on, so the canvas ignores taps.
 *
 *   node tools/probe/drive-89-tourlock.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

const STATE = () => ({
  tourCard: !!document.querySelector('.builder-tutorial-card--tour'),
  closeBtn: !!document.querySelector('.builder-tutorial-close'),
  actionBar: !!document.querySelector('.unified-action-bar'),
  lockGuard: [...document.querySelectorAll('[class*="lock"], [class*="guard"]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 200 && r.height > 200 && getComputedStyle(el).display !== 'none';
    })
    .map((el) => `${el.className} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
  tourKey: (() => { try { return localStorage.getItem('circuitry3d:tour-dismissed:v2'); } catch { return 'ERR'; } })(),
  keys: (() => { try { return Object.keys(localStorage).filter(k => k.startsWith('circuitry3d')); } catch { return []; } })(),
});

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  const reactLogs = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/CT3D|payoff|tour|lock/i.test(t)) reactLogs.push(`[${m.type()}] ${t}`);
  });
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);

  console.log('\n── ON LOAD ──');
  console.log(JSON.stringify(await page.evaluate(STATE), null, 2));

  const close = page.locator('.builder-tutorial-close').first();
  const n = await close.count();
  console.log(`\nclose button count: ${n}`);
  if (n) {
    const box = await close.boundingBox();
    console.log('close button box:', JSON.stringify(box));
    // What is actually on top of its centre? (the layering bug class)
    if (box) {
      const owner = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? `${el.tagName.toLowerCase()}.${el.className}` : 'nothing';
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      console.log('elementFromPoint at close-button centre:', owner);
    }
    await close.click({ timeout: 3000, force: true }).catch((e) => console.log('click threw:', e.message));
    await page.waitForTimeout(2500);
    console.log('\n── AFTER CLICKING ✕ ──');
    console.log(JSON.stringify(await page.evaluate(STATE), null, 2));
  }

  // Does it come BACK on its own?
  await page.waitForTimeout(8000);
  console.log('\n── 8s LATER (did it re-open?) ──');
  console.log(JSON.stringify(await page.evaluate(STATE), null, 2));

  // Can we select a component now? Tap the middle of the workspace.
  const before = await page.evaluate(() => document.querySelectorAll('.unified-action-bar button').length);
  console.log(`\naction-bar buttons visible: ${before}`);

  console.log('\n── react/tour console ──');
  console.log(reactLogs.slice(-25).join('\n') || '(none)');

  await page.screenshot({ path: 'tools/probe/tourlock.png' });
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
