import { chromium } from 'playwright';
export const CHROME = 'C:/Users/mitch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
export const TOUR = 'circuitry3d:circuit-sweep:dismissed:v1';

// gpu: render on the real graphics card instead of swiftshader. Swiftshader draws
// the builder at ~5 fps, which makes anything about MOTION invisible by
// construction — a label that trails its part by one frame looks perfect at 5 fps.
export async function openBuilder({ dismissTour = true, hash = '#/app', gpu = false } = {}) {
  const args = gpu
    ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
  if (dismissTour) await ctx.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch {} }, TOUR);
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push({ type: m.type(), text: m.text().slice(0, 300) }));
  page.on('pageerror', e => logs.push({ type: 'pageerror', text: String(e).slice(0, 300) }));
  ctx.on('weberror', e => logs.push({ type: 'weberror', text: String(e.error()).slice(0, 300) }));
  // The 30s default is not enough: swiftshader compiles the builder's shaders on
  // the first paint and a cold Vite dep-optimise on top of that has taken >140s.
  // A goto timeout here fails the whole probe before it has looked at anything.
  await page.goto(`http://localhost:3000/${hash}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]');
    return b && !b.disabled;
  }, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3500);
  return { browser, ctx, page, logs };
}

// The workspace lives in an iframe (public/legacy.html).
export function ws(page) {
  const f = page.frames().find(fr => /legacy\.html/.test(fr.url()));
  return f || page.mainFrame();
}
