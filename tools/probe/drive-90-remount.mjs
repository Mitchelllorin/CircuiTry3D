/**
 * REMOUNT — why does the guided tour come back seconds after ✕?
 *
 * The tour is now opened by a mount-only effect, so a tour that reappears means
 * <Builder> is being REMOUNTED under the user. That is the same event as
 * "for no reason I'm kicked out of building and back to the beginning".
 *
 * Instruments the real dismissal key and counts mounts.
 *
 *   node tools/probe/drive-90-remount.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const KEY = 'circuitry3d:onboarding:tour-dismissed:v2';
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();

  const marks = [];
  const t0 = Date.now();
  const mark = (s) => { marks.push(`${String(Date.now() - t0).padStart(6)}ms  ${s}`); };

  page.on('framenavigated', (f) => { if (f === page.mainFrame()) mark(`MAIN FRAME NAVIGATED -> ${f.url()}`); });
  page.on('console', (m) => {
    const t = m.text();
    if (/Effect 2|legacy:ready|CT3D-REACT|remount|reload/i.test(t)) mark(`console: ${t.slice(0, 110)}`);
  });

  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });

  // Poll the tour card + the dismissal key on a tight beat.
  let last = null;
  const poll = async () => {
    const s = await page.evaluate((k) => ({
      tour: !!document.querySelector('.builder-tutorial-card--tour'),
      key: (() => { try { return localStorage.getItem(k); } catch { return 'ERR'; } })(),
      frames: document.querySelectorAll('iframe').length,
    }), KEY).catch(() => null);
    if (!s) return;
    const sig = JSON.stringify(s);
    if (sig !== last) { mark(`state ${sig}`); last = sig; }
  };

  for (let i = 0; i < 24; i++) { await poll(); await page.waitForTimeout(500); }

  // Close the tour the way a user does.
  const close = page.locator('.builder-tutorial-close').first();
  if (await close.count()) {
    mark('>>> clicking ✕');
    await close.click({ timeout: 2000, force: true }).catch((e) => mark(`click err: ${e.message.slice(0, 60)}`));
  } else {
    mark('>>> no ✕ present to click');
  }

  for (let i = 0; i < 40; i++) { await poll(); await page.waitForTimeout(500); }

  console.log('\n── TIMELINE ──');
  console.log(marks.join('\n'));
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
