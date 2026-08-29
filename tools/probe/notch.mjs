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
const measure = () => {
  const box = s => { const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect();
    return { top:Math.round(b.top), bottom:Math.round(b.bottom), h:Math.round(b.height) }; };
  const nav = box('.workspace-mode-bar'), tick = box('.builder-ticker-feed');
  const cs = getComputedStyle(document.documentElement);
  return { nav, tick, overlap: nav && tick ? Math.max(0, nav.bottom - tick.top) : 'n/a',
    safeArea: cs.getPropertyValue('--builder-safe-area-top').trim(),
    barH: cs.getPropertyValue('--app-mode-bar-height').trim() };
};
console.log('no notch  ', JSON.stringify(await page.evaluate(measure)));
await page.addStyleTag({ content: ':root { --builder-safe-area-top: 48px !important; }' });
await page.waitForTimeout(400);
console.log('48px notch', JSON.stringify(await page.evaluate(measure)));
await page.addStyleTag({ content: '.workspace-mode-bar { padding-top: 14px !important; padding-bottom: 14px !important; }' });
await page.waitForTimeout(900);
console.log('notch+tall', JSON.stringify(await page.evaluate(measure)));
await browser.close();
