import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
await page.screenshot({ path: 'tools/probe/shot-nav.png', clip: { x: 0, y: 0, width: 412, height: 120 } });
console.log('ok');
await browser.close();
