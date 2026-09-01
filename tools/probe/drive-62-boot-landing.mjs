// What does a visitor actually SEE, in order, on "/"? Snapshots the full-screen
// layers over the first seconds of boot so a "there are two landing pages" report
// can be pinned to real elements rather than guessed at.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

const snap = async (label) => {
  const rows = await page.evaluate(() => {
    const out = [];
    const walk = (doc, where) => {
      doc.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
        const r = el.getBoundingClientRect();
        // Only things covering most of the viewport, or carrying the wordmark.
        const big = r.width > innerWidth * 0.8 && r.height > innerHeight * 0.5;
        const words = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        if (!big) return;
        out.push({ where, tag: el.tagName.toLowerCase(),
          id: el.id || '', cls: String(el.className).split(' ')[0] || '',
          z: cs.zIndex, bg: cs.backgroundColor, words });
      });
    };
    walk(document, 'top');
    const f = document.querySelector('iframe');
    try { if (f && f.contentDocument) walk(f.contentDocument, 'iframe'); } catch (e) {}
    return out;
  });
  console.log(`\n[${label}]`);
  rows.forEach(r => console.log(`  ${r.where.padEnd(6)} ${r.tag}#${r.id}.${r.cls} z=${r.z} bg=${r.bg}  "${r.words}"`));
  if (!rows.length) console.log('  (nothing full-screen)');
};

await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
for (const ms of [200, 1200, 3000, 6000, 11000]) {
  await page.waitForTimeout(ms === 200 ? 200 : 0);
  if (ms !== 200) await page.waitForTimeout(0);
  await snap(`t=${ms}ms`);
  if (ms !== 11000) await page.waitForTimeout([1000, 1800, 3000, 5000][[200,1200,3000,6000].indexOf(ms)]);
}
await browser.close();
