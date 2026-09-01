// Both three-tier cycles: the action bar and the component nameplates.
// Each must open on the MIDDLE tier and cycle through exactly three stops.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();

const barState = () => page.evaluate(() => {
  const bar = document.querySelector('.unified-action-bar');
  if (!bar) return { missing: true };
  const vis = [...bar.children].flatMap(c =>
    c.classList.contains('quick-add-btn-wrapper') ? [...c.children] : [c])
    .filter(el => el.checkVisibility && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    .map(el => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 22))
    .filter(Boolean);
  return { mode: bar.getAttribute('data-bar-mode'), count: vis.length, visible: vis };
});

console.log('=== ACTION BAR ===');
console.log('tier on open:', JSON.stringify(await barState()));
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => document.querySelector('.action-bar-cycle')?.click());
  await page.waitForTimeout(500);
  console.log(`  after press ${i + 1}:`, JSON.stringify(await barState()));
}

console.log('\n=== NAMEPLATE TIERS ===');
const w = ws(page);
const lvl = () => w.evaluate(() => ({
  level: typeof labelVisibilityLevel !== 'undefined' ? labelVisibilityLevel : 'undefined',
  tiers: typeof LABEL_TIERS !== 'undefined' ? LABEL_TIERS : 'undefined',
}));
console.log('tier on open:', JSON.stringify(await lvl()));
for (let i = 0; i < 4; i++) {
  await w.evaluate(() => toggleLabels());
  console.log(`  after press ${i + 1}:`, JSON.stringify(await lvl()));
}
await browser.close();
