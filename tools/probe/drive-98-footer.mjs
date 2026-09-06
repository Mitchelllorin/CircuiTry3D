/**
 * LANDING FOOTER LEGAL ROW — Privacy / Data Safety / Delete Account /
 * Partnerships must sit on ONE centred line. Play requires them reachable and
 * they are the last thing a reviewer looks at; the first link had dropped below
 * the row and hard left because the nav had no layout of its own.
 *
 *   node tools/probe/drive-98-footer.mjs
 */
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';

const SIZES = [
  { name: 'Pixel 7   ', width: 412, height: 915 },
  { name: 'iPhone SE ', width: 375, height: 667 },
  { name: 'narrow    ', width: 320, height: 640 },
];

let fail = 0;
const browser = await chromium.launch({ headless: true, executablePath: CHROME });

for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/landing.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.landing-footer-link')];
    const rects = links.map(a => { const b = a.getBoundingClientRect();
      return { text: a.textContent.trim(), top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right) }; });
    const nav = document.querySelector('.landing-footer nav').getBoundingClientRect();
    const foot = document.querySelector('.landing-footer').getBoundingClientRect();
    const mark = document.querySelector('#fuse-watermark')?.getBoundingClientRect();
    const plat = document.querySelector('.landing-platforms');
    const platRect = plat?.getBoundingClientRect();
    return {
      rects,
      nav: { left: Math.round(nav.left), right: Math.round(nav.right) },
      vw: window.innerWidth,
      footTop: Math.round(foot.top),
      // The watermark is positioned to clear the footer. The footer just gained
      // a row, and a fixed bottom offset tuned to the old height silently ends
      // up sitting on top of it.
      markOverlapsFooter: !!(mark && mark.bottom > foot.top),
      platforms: plat ? plat.textContent.replace(/\s+/g, ' ').trim() : null,
      platformsOneLine: platRect ? platRect.height < 26 : null,
    };
  });

  const tops = [...new Set(r.rects.map(x => x.top))];
  const oneLine = tops.length === 1;
  // Centre must be judged PER LINE. Taking min-left and max-right across every
  // link lumps two lines into one bounding box, which reports a perfectly
  // centred two-line layout as off-centre and tells you nothing either way.
  const centred = tops.every((t) => {
    const line = r.rects.filter((x) => x.top === t);
    const l = Math.min(...line.map((x) => x.left));
    const rt = Math.max(...line.map((x) => x.right));
    return Math.abs(l - (r.vw - rt)) <= 6;
  });
  const clusterL = Math.min(...r.rects.map(x => x.left));
  const clusterR = Math.max(...r.rects.map(x => x.right));

  console.log(`${s.name} ${s.width}px  ${oneLine ? 'ONE LINE' : `${tops.length} LINES`}  ${centred ? 'centred' : 'OFF-CENTRE'}  [${clusterL}..${clusterR}] of ${r.vw}`);
  for (const x of r.rects) console.log(`     ${x.text.padEnd(15)} top=${x.top} left=${x.left}`);
  console.log();
  console.log('     platforms: ' + (r.platforms || 'MISSING'));
  if (r.markOverlapsFooter) { console.log('      FAIL watermark overlaps the footer'); fail++; }
  if (!r.platforms) { console.log('      FAIL platforms line missing'); fail++; }
  if (!oneLine || !centred) fail++;
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} size(s) FAILED` : '\nall sizes: one centred line');
process.exit(fail ? 1 : 0);
