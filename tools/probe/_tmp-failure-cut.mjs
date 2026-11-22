/** Throw the Solo bench and watch whether the failure cut engages. */
import { openBuilder } from './_harness.mjs';

const { browser, page, logs } = await openBuilder();
await page.setViewportSize({ width: 360, height: 640 });
await page.evaluate(() => document.querySelector('[data-mode="arena"]')?.click());
await page.waitForTimeout(9000);
await page.evaluate(() => document.querySelector('.arena-dash__switch')?.click());

const samples = [];
let shotAt = null;
for (let i = 0; i < 60; i += 1) {
  await page.waitForTimeout(250);
  const sample = await page.evaluate(() => {
    const el = document.querySelector('.arena-scene__isolate');
    return {
      cut: el?.dataset.cut ?? null,
      op: el ? getComputedStyle(el).opacity : null,
      card: !!document.querySelector('.arena-fail'),
      label: document.querySelector('.arena-dash__switch-label')?.textContent.trim() ?? null,
    };
  });
  samples.push({ t: i * 250, ...sample });
  if (sample.cut && shotAt == null) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/breakit/06-failure-cut.png', timeout: 90000 });
    shotAt = i * 250 + 1500;
  }
}

const changes = samples.filter(
  (s, i) => i === 0 || JSON.stringify({ ...s, t: 0 }) !== JSON.stringify({ ...samples[i - 1], t: 0 }),
);
console.log('changes', JSON.stringify(changes));
console.log('cutEver ', samples.some((s) => s.cut));
console.log('shotAt  ', shotAt);
console.log('cardEver', samples.some((s) => s.card));
console.log('errors  ', logs.filter((l) => l.type === 'pageerror').length);
await browser.close();
