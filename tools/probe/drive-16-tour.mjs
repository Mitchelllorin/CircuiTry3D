import { openBuilder } from './_harness.mjs';
const { browser, page, logs } = await openBuilder({ dismissTour: false });
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

for (let i = 0; i < 8; i++) {
  const s = await page.evaluate(() => ({
    tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
    layer: !!document.querySelector('.builder-tutorial-layer'),
    card: document.querySelector('.builder-tutorial-card')?.innerText?.replace(/\s+/g,' ').slice(0,90) || null,
    payoffGuard: !!document.querySelector('.builder-payoff-guard'),
    modeBarActive: [...document.querySelectorAll('.workspace-mode-bar [aria-pressed="true"], .workspace-mode-bar .is-active')].map(e=>e.innerText.trim()).slice(0,3),
  }));
  console.log(`t+${i*2}s`, JSON.stringify(s));
  await page.waitForTimeout(2000);
}
show('ERRORS', logs.filter(l => /error/i.test(l.type)).slice(0,10));
show('TOUR LOGS', logs.filter(l => /tour|tutorial|payoff|showcase/i.test(l.text)).slice(0,20));
await browser.close();
