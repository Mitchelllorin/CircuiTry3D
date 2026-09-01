// Verify the new website / studio-credit links: they exist, they point at the
// real domains, they are actually on top at their own centre (the hit-test that
// catches the translucent-overlay bug class), and the off-site ones are NOT
// stolen by landing.html's SPA navigation bridge.
import { chromium } from 'playwright';
import { CHROME, openBuilder } from './_harness.mjs';

const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

// Reads every anchor matching `sel`, plus whether the element at its own centre
// is itself (or inside it) — i.e. whether a tap would really land on the link.
const readLinks = (sel) => {
  const out = [];
  for (const a of document.querySelectorAll(sel)) {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    out.push({
      text: (a.textContent || '').trim(),
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      w: Math.round(r.width), h: Math.round(r.height),
      onScreen: r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 1 && r.top >= -1,
      visible: cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05,
      tappable: !!top && (top === a || a.contains(top) || top.contains(a)),
      blockedBy: top && !(top === a || a.contains(top) || top.contains(a))
        ? (top.className || top.tagName).toString().slice(0, 60) : null,
    });
  }
  return out;
};

// ── 1. LANDING FOOTER ────────────────────────────────────────────────
{
  const browser = await chromium.launch({ headless: true, executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(4000);
  const frame = page.frames().find(f => /landing\.html/.test(f.url())) || page.mainFrame();

  show('LANDING credit links', await frame.evaluate(readLinks, '.landing-credit-link'));
  show('LANDING credit line', await frame.evaluate(() => {
    const p = document.querySelector('.landing-credit');
    if (!p) return { present: false };
    const r = p.getBoundingClientRect();
    return {
      present: true,
      text: (p.textContent || '').replace(/\s+/g, ' ').trim(),
      // The footer must not be pushed off the one-pager screen by the new row.
      fullyOnScreen: r.bottom <= innerHeight + 1 && r.top >= 0,
      bottomGap: Math.round(innerHeight - r.bottom),
    };
  }));
  // The bridge intercepts `.landing-footer-link`. If the off-site links ever
  // pick up that class they get rewritten into an in-app route.
  show('LANDING bridge safety', await frame.evaluate(() => ({
    offsiteLinksWithBridgeClass: [...document.querySelectorAll('.landing-footer-link')]
      .filter(a => /^https?:/.test(a.getAttribute('href') || '')).map(a => a.getAttribute('href')),
  })));
  await browser.close();
}

// ── 2. BUILDER: HELP -> ABOUT ────────────────────────────────────────
{
  const { browser, page } = await openBuilder();
  await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Help/.test(b.innerText))?.click());
  await page.waitForTimeout(1600);
  show('HELP actions', await page.evaluate(() =>
    [...document.querySelectorAll('.guides-action-btn')].map(b => b.innerText.trim())));

  await page.evaluate(() => [...document.querySelectorAll('.guides-action-btn')]
    .find(b => /About CircuiTry3D/.test(b.innerText))?.click());
  await page.waitForTimeout(1500);

  show('ABOUT modal', await page.evaluate(() => ({
    open: !!document.querySelector('.builder-help-modal.open'),
    title: document.querySelector('.help-title')?.innerText,
    creditPresent: !!document.querySelector('.studio-credit'),
    creditText: (document.querySelector('.studio-credit')?.innerText || '').replace(/\s+/g, ' ').trim(),
  })));
  show('ABOUT links', await page.evaluate(readLinks, '.studio-credit a'));

  // "< Back" must actually leave About (it used to route behind a modal that
  // stayed open, so nothing appeared to happen).
  await page.locator('.builder-help-modal.open .help-back').click({ timeout: 5000 })
    .catch(e => console.log('back click failed:', e.message.slice(0, 80)));
  await page.waitForTimeout(1200);
  show('BACK from About', await page.evaluate(() => ({
    modalStillOpen: !!document.querySelector('.builder-help-modal.open'),
    helpPanelShowing: !!document.querySelector('.guides-action-btn'),
  })));

  // The credit belongs to About alone — Shortcuts must not inherit it.
  await page.evaluate(() => [...document.querySelectorAll('.guides-action-btn')]
    .find(b => /Keyboard Shortcuts/.test(b.innerText))?.click());
  await page.waitForTimeout(1200);
  show('SHORTCUTS view (credit must be absent)', await page.evaluate(() => {
    const modal = document.querySelector('.builder-help-modal.open');
    return {
      title: modal?.querySelector('.help-title')?.innerText,
      creditInOpenModal: !!modal?.querySelector('.studio-credit'),
    };
  }));

  await page.screenshot({ path: 'tools/probe/studio-links.png', timeout: 60000 }).catch(e => console.log('shot skipped:', e.message));
  await browser.close();
}
