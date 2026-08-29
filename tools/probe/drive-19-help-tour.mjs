import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();          // tour pre-dismissed = returning user
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

show('BEFORE — tour running?', await page.evaluate(() => ({
  tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
  layer: !!document.querySelector('.builder-tutorial-layer'),
})));

await page.locator('button', { hasText: 'Help' }).first().click();
await page.waitForTimeout(1500);

show('HELP PANEL ACTIONS', await page.evaluate(() => ({
  panel: !!document.querySelector('.compact-guides-panel, [class*="guides"]'),
  buttons: [...document.querySelectorAll('.guides-action-btn')]
    .map(b => ({ text: b.innerText.trim(), primary: b.className.includes('--primary') })),
})));

const tour = page.locator('.guides-action-btn', { hasText: 'Take the Tour' }).first();
if (await tour.count()) {
  await tour.click();
  await page.waitForTimeout(2500);
  show('AFTER CLICKING "Take the Tour"', await page.evaluate(() => ({
    tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
    layer: !!document.querySelector('.builder-tutorial-layer'),
    skipBtn: !!document.querySelector('.builder-tour-skip'),
    guidesPanelStillUp: !!document.querySelector('.guides-action-btn'),
  })));
} else {
  console.log('\n!! "Take the Tour" button not found');
}
await browser.close();
