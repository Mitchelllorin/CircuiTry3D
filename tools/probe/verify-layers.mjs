import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const TOUR = 'circuitry3d:onboarding:tour-dismissed:v1';
const browser = await chromium.launch({ headless:true, executablePath:CHROME, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
await ctx.addInitScript(k => { try { localStorage.setItem(k,'1'); } catch {} }, TOUR);
await ctx.addInitScript(() => { window.__gl=0; const o=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(t,...r){ if(typeof t==='string'&&t.startsWith('webgl')) window.__gl++; return o.call(this,t,...r); }; });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,250)));
await page.goto('http://localhost:3000/#/app', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => { const b=document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout:70000 }).catch(()=>console.log('(wire btn never enabled)'));
await page.waitForTimeout(3500);

const r = await page.evaluate(() => {
  const box = s => { const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect();
    return { top:Math.round(b.top), bottom:Math.round(b.bottom), h:Math.round(b.height), w:Math.round(b.width) }; };
  const nav = box('.workspace-mode-bar');
  const tick = box('.builder-ticker-feed');
  const cs = getComputedStyle(document.documentElement);
  return {
    navBar: nav, ticker: tick,
    overlap: nav && tick ? (nav.bottom > tick.top ? nav.bottom - tick.top : 0) : 'n/a',
    gap: nav && tick ? tick.top - nav.bottom : 'n/a',
    measuredBarHeight: cs.getPropertyValue('--app-mode-bar-height').trim(),
    tickerTopVar: cs.getPropertyValue('--builder-ticker-top').trim(),
    actionBar: box('.unified-action-bar'),
    floatingLogoPresent: !!document.querySelector('.builder-floating-logo'),
    topDocCanvases: document.querySelectorAll('canvas').length,
    glContexts: window.__gl,
    logoMotionMenuItem: [...document.querySelectorAll('button')].some(b => /logo motion/i.test(b.textContent||'')),
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
