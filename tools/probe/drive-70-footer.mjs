// The landing footer reads cluttered / off-centre. Measure it: every row's
// rect against the page centre line, the gaps, and where the text wraps.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(5000);
const frame = page.frames().find(f => /landing\.html/.test(f.url()));
console.log(JSON.stringify(await frame.evaluate(() => {
  const W = innerWidth;
  const m = (el, label) => {
    if (!el) return { label, missing: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      label,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      centreOffset: +(r.left + r.width / 2 - W / 2).toFixed(1),  // 0 = perfectly centred
      leftGap: Math.round(r.left), rightGap: Math.round(W - r.right),
      font: cs.fontSize, color: cs.color, display: cs.display,
      flexDir: cs.flexDirection, align: cs.alignItems, justify: cs.justifyContent,
      gap: cs.gap, pad: cs.padding, margin: cs.margin,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
    };
  };
  const footer = document.querySelector('.landing-footer');
  const rows = [...(footer ? footer.children : [])].map((c, i) => m(c, `row${i}:${c.tagName.toLowerCase()}`));
  // How many visual lines does each row occupy?
  const lines = (el) => { if (!el) return 0; const range = document.createRange();
    range.selectNodeContents(el); return range.getClientRects().length; };
  return {
    viewportW: W,
    footer: m(footer, 'footer'),
    rows,
    legalLineBoxes: lines(footer && footer.querySelector('nav')),
    creditLineBoxes: lines(document.querySelector('.landing-credit')),
    linkRects: [...document.querySelectorAll('.landing-footer-link, .landing-credit-link, .landing-footer-sep')]
      .map(a => ({ t: a.textContent.trim().slice(0, 18),
        r: (() => { const b = a.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width)]; })(),
        cls: a.className })),
  };
}, null), null, 2));
await browser.close();
