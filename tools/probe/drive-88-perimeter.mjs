/**
 * PERIMETER MAP — what actually occupies each edge of the phone screen.
 *
 * Before moving the action-bar buttons out to the perimeter we need to know
 * which bands are already taken. Reading the CSS is not enough: half these
 * elements are positioned off CSS variables, and one (measure-fab) is
 * display:none but still in the stylesheet.
 *
 * Measures LEAF controls — the things a thumb can actually hit — not their
 * stage wrappers. The wrappers are pointer-events:none and mostly off-screen,
 * so measuring those reported both side rails as free when in fact each one
 * carries a drawer toggle tab down the middle of it.
 *
 *   node tools/probe/drive-88-perimeter.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};
const RAIL = 64; // a side rail this wide is what we are trying to fit buttons into

const MAP = () => {
  const W = window.innerWidth, H = window.innerHeight;
  const out = [];
  // Leaf controls only: something you can hit, that doesn't contain another one.
  const CONTROL = 'button, a, [role="button"], input, select, .builder-menu-toggle';
  for (const el of document.querySelectorAll(CONTROL)) {
    if (el.querySelector(CONTROL)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
    if (parseFloat(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase();
    out.push({
      cls,
      label: (el.getAttribute('aria-label') || (el.textContent || '').trim()).slice(0, 26),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    });
  }
  return { W, H, out };
};

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  // Skip the autoplaying tour: it locks the workspace and hides the action bar,
  // so measuring under it measures the wrong screen.
  await page.addInitScript(() => {
    try { localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'); } catch { /* ignore */ }
  });
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.unified-action-bar', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  const { W, H, out } = await page.evaluate(MAP);
  console.log(`\nVIEWPORT ${W}x${H}   (${out.length} live controls)\n`);

  const onLeft = out.filter(i => i.rect[0] < RAIL);
  const onRight = out.filter(i => W - (i.rect[0] + i.rect[2]) < RAIL);
  const onTop = out.filter(i => i.rect[1] < 120);
  const onBottom = out.filter(i => H - (i.rect[1] + i.rect[3]) < 120);

  const show = (name, items) => {
    console.log(`── ${name} (${items.length}) ──`);
    for (const i of [...items].sort((a, b) => a.rect[1] - b.rect[1])) {
      const [x, y, w, h] = i.rect;
      console.log(`  x${String(x).padStart(4)} y${String(y).padStart(4)}  ${String(w).padStart(3)}x${String(h).padStart(3)}  ${i.cls} ${i.label ? '· ' + i.label : ''}`);
    }
    console.log('');
  };
  show('LEFT RAIL', onLeft);
  show('RIGHT RAIL', onRight);
  show('TOP', onTop);
  show('BOTTOM', onBottom);

  for (const [side, items] of [['LEFT', onLeft], ['RIGHT', onRight]]) {
    const spans = items.map(i => [i.rect[1], i.rect[1] + i.rect[3]]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of spans) {
      if (merged.length && s <= merged[merged.length - 1][1] + 4) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      else merged.push([s, e]);
    }
    const free = [];
    let cursor = 0;
    for (const [s, e] of merged) { if (s - cursor >= 44) free.push([cursor, s]); cursor = Math.max(cursor, e); }
    if (H - cursor >= 44) free.push([cursor, H]);
    console.log(`${side} RAIL taken: ${merged.map(([a, b]) => `${a}-${b}`).join(', ') || 'nothing'}`);
    console.log(`${side} RAIL free : ${free.map(([a, b]) => `${a}-${b} (${b - a}px = ${Math.floor((b - a) / 48)} buttons)`).join(', ') || 'none'}\n`);
  }

  await page.screenshot({ path: 'tools/probe/perimeter.png' });
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
