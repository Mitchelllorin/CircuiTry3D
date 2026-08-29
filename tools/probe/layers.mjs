import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const TOUR = 'circuitry3d:onboarding:tour-dismissed:v1';
const browser = await chromium.launch({ headless:true, executablePath:CHROME, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
await ctx.addInitScript(k => { try { localStorage.setItem(k,'1'); } catch {} }, TOUR);
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => { const b=document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout:70000 }).catch(()=>{});
await page.waitForTimeout(3000);

const out = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const z = cs.zIndex === 'auto' ? null : parseInt(cs.zIndex, 10);
    const text = (el.innerText || '').trim().replace(/\s+/g,' ').slice(0, 46);
    const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    rows.push({
      cls: (el.className && String(el.className.baseVal ?? el.className)).slice(0, 42) || el.tagName.toLowerCase(),
      z, pos: cs.position,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      op: cs.opacity, pe: cs.pointerEvents, vis: cs.visibility,
      bg: hasBg ? cs.backgroundColor.slice(0,28) : '-',
      bgImg: cs.backgroundImage === 'none' ? '-' : cs.backgroundImage.slice(0,34),
      kids: el.children.length,
      text: text || '(no text)',
    });
  });
  rows.sort((a,b) => (a.z ?? -1) - (b.z ?? -1));
  return rows;
});
console.log('total positioned layers >=4px:', out.length);
console.log('z'.padStart(6), 'rect'.padEnd(24), 'op'.padEnd(5), 'pe'.padEnd(6), 'kid', 'bg'.padEnd(24), 'class / text');
for (const r of out) {
  console.log(String(r.z ?? '—').padStart(6), JSON.stringify(r.rect).padEnd(24), String(r.op).padEnd(5), r.pe.padEnd(6), String(r.kids).padStart(3), r.bg.padEnd(24), r.cls, '|', r.text);
}
await browser.close();
