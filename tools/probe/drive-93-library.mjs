/**
 * LIBRARY REACH — Battery, Resistor and Junction left the quick-add row, so
 * the Library drawer is now their only tap-based route. Prove it is a real one.
 *
 *   node tools/probe/drive-93-library.mjs
 */
import { chromium } from 'playwright';

const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

const run = async () => {
  const browser = await chromium.launch({ args: LAUNCH });
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem('circuitry3d:onboarding:tour-dismissed:v2', '1'); } catch { /* ignore */ }
  });
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.unified-action-bar', { state: 'attached', timeout: 150000 });
  await page.waitForTimeout(6000);

  // Overlap check BEFORE anything is opened — the resting workspace.
  const overlaps = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('.unified-action-bar button')) {
      const r = b.getBoundingClientRect();
      if (r.width < 4) continue;
      const owner = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (owner && owner !== b && !b.contains(owner)) {
        bad.push(`${b.getAttribute('aria-label')} <- ${owner.tagName}.${String(owner.className).slice(0, 40)}`);
      }
    }
    return bad;
  });
  console.log(`\nresting action bar, covered buttons: ${overlaps.length ? '\n  ' + overlaps.join('\n  ') : 'none'}`);

  await page.evaluate(() => document.querySelector('.builder-menu-toggle-left')?.click());
  await page.waitForTimeout(2500);

  const dump = await page.evaluate(() => {
    const stage = document.querySelector('.builder-menu-stage-left');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    return {
      stageRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      controls: [...stage.querySelectorAll('button, [role="button"]')]
        .map(b => ({
          text: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40),
          title: b.getAttribute('title') || '',
        }))
        .filter(c => c.text || c.title),
      html: stage.innerHTML.length,
    };
  });
  console.log('\nlibrary stage rect:', JSON.stringify(dump?.stageRect));
  console.log(`library controls (${dump?.controls.length}):`);
  for (const c of dump?.controls ?? []) console.log(`   "${c.text}"${c.title ? '  [title: ' + c.title + ']' : ''}`);

  // Search the whole open drawer text for the three parts.
  const text = await page.evaluate(() =>
    (document.querySelector('.builder-menu-stage-left')?.textContent || '').toLowerCase());
  for (const part of ['battery', 'resistor', 'junction']) {
    console.log(`  ${text.includes(part) ? 'ok  ' : 'MISS'} "${part}" present in the open drawer`);
  }

  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
