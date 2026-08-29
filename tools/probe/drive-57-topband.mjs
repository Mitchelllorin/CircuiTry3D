// The bar just moved down 16px to make room for the caption. Anything parked in
// the top band that was placed from a DIFFERENT variable will now be under it.
// Lists everything painting in the top 140px and flags overlaps with the bar.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(14000);
for (const theme of ['dark','light']) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => {
    const bar = document.querySelector('.workspace-mode-bar').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (!/fixed|absolute|sticky/.test(cs.position)) return;
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.top > 140 || r.bottom < 0) return;
      if (el.closest('.workspace-mode-bar')) return;
      const hits = r.top < bar.bottom && r.bottom > bar.top && r.left < bar.right && r.right > bar.left;
      out.push({ cls: (String(el.className).split(' ')[0] || el.tagName).slice(0,34),
        top: Math.round(r.top), bottom: Math.round(r.bottom), z: cs.zIndex, hits });
    });
    return { bar: { top: Math.round(bar.top), bottom: Math.round(bar.bottom) }, out };
  });
  console.log(`\n[${theme}] bar ${rows.bar.top}..${rows.bar.bottom}`);
  for (const r of rows.out) console.log(`   ${r.hits ? '!! OVERLAPS' : '   ok      '} ${r.top}..${r.bottom} z${r.z} .${r.cls}`);
}
await browser.close();
