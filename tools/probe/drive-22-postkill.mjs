import { openBuilder, ws } from './_harness.mjs';
const { browser, page, logs } = await openBuilder();
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

const f = ws(page);
show('LEGACY IFRAME HEALTH', await f.evaluate(() => ({
  builderReady: window._builderReady === true,
  modalGone: document.getElementById('tutorial-backdrop') === null,
  showTutorialGone: typeof window.showTutorial === 'undefined',
  showWireGuideStillThere: typeof window.showWireGuide === 'function',
  canvas: !!document.querySelector('canvas'),
})));

show('COMPONENTS ON SCREEN', await page.evaluate(() => ({
  payoffPill: !!document.querySelector('.builder-payoff-guard'),
  leftTab: !!document.querySelector('.builder-menu-toggle-left'),
})));

await page.locator('button', { hasText: 'Help' }).first().click();
await page.waitForTimeout(1500);
const tour = page.locator('.guides-action-btn', { hasText: 'Take the Tour' }).first();
await tour.click();
await page.waitForTimeout(2500);
show('HELP -> TOUR', await page.evaluate(() => ({
  tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
  layer: !!document.querySelector('.builder-tutorial-layer'),
})));

show('PAGE ERRORS', logs.filter(l => /pageerror|weberror/.test(l.type)).slice(0, 8));
await browser.close();
