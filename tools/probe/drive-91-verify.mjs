/**
 * VERIFY — the three things just changed, checked on the running app.
 *
 *  1. There is ALWAYS a way out of the tour, including in the gaps between
 *     cards when no card is on screen.
 *  2. Skipping the tour actually hands the workspace over: action bar back,
 *     showcase unlocked, and it does not come back on its own.
 *  3. The action bar carries ONE ai button, not AI + Explain, and the Explain
 *     hand-off chip is inside the assistant.
 *
 *   node tools/probe/drive-91-verify.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.builder-shell', { timeout: 60000 });
  await page.waitForTimeout(4000);

  // ── 1. a way out at every instant of the tour ──
  console.log('\n── tour: is there always a way out? ──');
  let sampled = 0, cardless = 0, escapable = 0;
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => ({
      open: !!document.querySelector('.builder-tutorial-layer'),
      card: !!document.querySelector('.builder-tutorial-card--tour'),
      // any control that dismisses the tour, card or not
      out: !!document.querySelector('.builder-tour-exit, .builder-tutorial-close, .builder-tour-skip-link'),
    }));
    if (s.open) {
      sampled++;
      if (!s.card) cardless++;
      if (s.out) escapable++;
    }
    await page.waitForTimeout(1000);
  }
  check(`tour sampled while open (${sampled} samples, ${cardless} of them with no card)`, sampled > 0);
  check('a dismiss control was present in EVERY sample', sampled > 0 && escapable === sampled,
    `${escapable}/${sampled} escapable`);

  // ── 2. skipping hands the workspace over ──
  console.log('\n── tour: does skipping release the workspace? ──');
  const out = page.locator('.builder-tour-exit, .builder-tutorial-close').first();
  if (await out.count()) {
    // Real thumbs do not wait for CSS animations to settle; Playwright does.
    await page.evaluate(() => document.querySelector('.builder-tour-exit, .builder-tutorial-close')?.click());
  }
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => ({
    tourLayer: !!document.querySelector('.builder-tutorial-layer'),
    tourActive: document.querySelector('.builder-shell')?.getAttribute('data-tour-active'),
    barButtons: document.querySelectorAll('.unified-action-bar button').length,
    key: (() => { try { return localStorage.getItem('circuitry3d:onboarding:tour-dismissed:v2'); } catch { return 'ERR'; } })(),
  }));
  check('tour layer gone', !after.tourLayer);
  check('shell no longer data-tour-active', after.tourActive !== 'true', `got ${after.tourActive}`);
  check('action bar has buttons', after.barButtons > 0, `${after.barButtons} buttons`);
  check('dismissal persisted to localStorage', after.key === '1', `key=${after.key}`);

  await page.waitForTimeout(15000);
  const back = await page.evaluate(() => !!document.querySelector('.builder-tutorial-card--tour'));
  check('tour did NOT come back 15s later', !back);

  // ── 3. one AI button, Explain moved inside it ──
  console.log('\n── action bar: AI + Explain merged ──');
  const bar = await page.evaluate(() => [...document.querySelectorAll('.unified-action-bar button')]
    .map((b) => b.getAttribute('aria-label') || b.textContent.trim()));
  const explainInBar = bar.filter((l) => /explain/i.test(l));
  const aiInBar = bar.filter((l) => /circuit ai/i.test(l));
  check('no Explain button left in the bar', explainInBar.length === 0, explainInBar.join(', '));
  check('exactly one Circuit AI button', aiInBar.length === 1, aiInBar.join(', '));

  const aiBtn = page.locator('.edge-action-btn--ai').first();
  if (await aiBtn.count()) {
    await page.evaluate(() => document.querySelector('.edge-action-btn--ai')?.click());
    await page.waitForTimeout(1500);
    const chip = await page.evaluate(() => {
      const c = document.querySelector('.ai-suggestion-chip--explain');
      return c ? c.textContent.trim() : null;
    });
    check('Explain chip lives inside the assistant', !!chip, chip || 'not found');
  } else {
    check('AI button present to open', false);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
