import { openBuilder } from './_harness.mjs';
const { browser, page, logs } = await openBuilder();
await page.waitForTimeout(6000);
const r = await page.evaluate(() => {
  const img = document.querySelector('.mode-icon--3d');
  if (!img) return { rendered: false, fallbackGlyph: document.querySelector('.mode-tab .mode-icon')?.textContent };
  const b = img.getBoundingClientRect();
  return {
    rendered: true,
    isDataUrl: img.src.startsWith('data:image/png'),
    bytes: img.src.length,
    natural: [img.naturalWidth, img.naturalHeight],
    css: [Math.round(b.width), Math.round(b.height)],
    inTab: img.closest('.mode-tab')?.innerText?.trim(),
  };
});
console.log(JSON.stringify(r, null, 2));
console.log('WEBGL CONTEXTS WARNING:', JSON.stringify(logs.filter(l => /context|WebGL/i.test(l.text)).slice(0,5)));
if (r.rendered && r.isDataUrl) {
  const img = await page.locator('.mode-icon--3d').first();
  await img.screenshot({ path: 'tools/probe/icon-build.png' });
  // also a big version straight from the data URL, so the modelling is judgeable
  const src = await page.evaluate(() => document.querySelector('.mode-icon--3d').src);
  const fs = await import('fs');
  fs.writeFileSync('tools/probe/icon-build-full.png', Buffer.from(src.split(',')[1], 'base64'));
  console.log('wrote tools/probe/icon-build-full.png');
}
await browser.close();
