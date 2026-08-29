import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();          // tour pre-dismissed
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

show('NAV TABS', await page.evaluate(() =>
  [...document.querySelectorAll('.mode-tab')].map(b => b.innerText.replace(/\s+/g,' ').trim()).filter(Boolean)));

// LEARN
await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Learn/.test(b.innerText))?.click());
await page.waitForTimeout(1600);
show('LEARN PANEL', await page.evaluate(() => ({
  title: document.querySelector('.builder-panel-title, .workspace-panel-title, h2, h3')?.innerText?.slice(0,40),
  buttons: [...document.querySelectorAll('.learn-launch-btn')].map(b => b.innerText.replace(/\s+/g,' ').slice(0,60)),
})));
await page.evaluate(() => [...document.querySelectorAll('.learn-launch-btn')].find(b => /Take the Tour/.test(b.innerText))?.click());
await page.waitForTimeout(2500);
show('LEARN -> TOUR', await page.evaluate(() => ({
  tourActive: document.querySelector('[data-tour-active]')?.getAttribute('data-tour-active'),
  layer: !!document.querySelector('.builder-tutorial-layer'),
  learnPanelGone: document.querySelectorAll('.learn-launch-btn').length === 0,
})));

// HELP must now be reference only
await page.evaluate(() => document.querySelector('.builder-tour-skip')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Help/.test(b.innerText))?.click());
await page.waitForTimeout(1600);
show('HELP PANEL (should have NO tour buttons)', await page.evaluate(() => ({
  actions: [...document.querySelectorAll('.guides-action-btn')].map(b => b.innerText.trim()),
  tourButtonsPresent: [...document.querySelectorAll('button')].some(b => /Take the Tour|Build it with me/.test(b.innerText)),
})));
await browser.close();
