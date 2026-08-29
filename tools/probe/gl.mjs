import { chromium } from 'playwright';
const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const TOUR = 'circuitry3d:onboarding:tour-dismissed:v1';
const browser = await chromium.launch({ headless:true, executablePath:CHROME, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
await ctx.addInitScript(k => { try { localStorage.setItem(k,'1'); } catch {} }, TOUR);
await ctx.addInitScript(() => {
  // count getContext('webgl*') calls across the top document
  window.__glCount = 0; window.__glWho = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (typeof type === 'string' && type.indexOf('webgl') === 0) {
      window.__glCount++;
      window.__glWho.push((this.className || this.parentElement?.className || '?') + ' ' + this.width + 'x' + this.height);
    }
    return orig.call(this, type, ...rest);
  };
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => { const b=document.querySelector('[data-tutorial-id="tutorial-enable-wire"]'); return b && !b.disabled; }, null, { timeout:70000 }).catch(()=>{});
await page.waitForTimeout(4000);
const r = await page.evaluate(() => ({
  topLevelGLContexts: window.__glCount, who: window.__glWho,
  canvasesInTopDoc: [...document.querySelectorAll('canvas')].map(c => (String(c.className||'') || c.parentElement?.className || '?') + ' ' + c.width + 'x' + c.height),
  iframeCanvases: (() => { try { return [...document.querySelector('iframe').contentDocument.querySelectorAll('canvas')].map(c => (c.id||c.className||'?')+' '+c.width+'x'+c.height); } catch(e){ return ['ERR']; } })(),
}));
console.log(JSON.stringify(r, null, 1));
await browser.close();
