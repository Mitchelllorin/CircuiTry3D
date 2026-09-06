// Verify F.U.S.E. clears the footer AND the CTA, at a tall and a short phone.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const h of [915, 740, 640]) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(4500);
  const f = page.frames().find(x => /landing\.html/.test(x.url()));
  const r = await f.evaluate(() => {
    const b = s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect();
      return { top: Math.round(q.top), bottom: Math.round(q.bottom), left: Math.round(q.left), right: Math.round(q.right) }; };
    const fuse = b('#fuse-watermark'), nav = b('.landing-footer nav'), cta = b('#launch-btn'), ftr = b('.landing-footer');
    const gap = (a, c) => a && c ? Math.round(c.top - a.bottom) : null;
    return {
      fuseToFooterGap: gap(fuse, ftr),
      fuseToLegalRowGap: gap(fuse, nav),
      ctaToFuseGap: gap(cta, fuse),
      footerFullyOnScreen: ftr ? ftr.bottom <= innerHeight + 1 : null,
      fuse, legalRow: nav,
    };
  });
  console.log(`--- viewport 412x${h} ---`);
  console.log(`  CTA -> FUSE gap      : ${r.ctaToFuseGap}px`);
  console.log(`  FUSE -> footer gap   : ${r.fuseToFooterGap}px  ${r.fuseToFooterGap > 0 ? 'OK' : 'OVERLAP'}`);
  console.log(`  FUSE -> legal row gap: ${r.fuseToLegalRowGap}px  ${r.fuseToLegalRowGap > 0 ? 'OK' : 'OVERLAP'}`);
  console.log(`  footer fully visible : ${r.footerFullyOnScreen}`);
  await ctx.close();
}
await browser.close();
