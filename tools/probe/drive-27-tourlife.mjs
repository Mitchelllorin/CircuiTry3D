import { openBuilder, ws } from './_harness.mjs';
const { browser, page, logs } = await openBuilder({ dismissTour: false });

// record camera-sweep receipts inside the iframe
const f = ws(page);
await f.evaluate(() => {
  window.__tourFocus = [];
  const orig = window.tourFocusCamera;
  window.__hasTourFocusCamera = typeof orig === 'function';
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && (d.action === 'tour-focus' || d.type === 'tour-focus' || JSON.stringify(d).includes('tour-focus'))) {
      window.__tourFocus.push(JSON.stringify(d).slice(0, 160));
    }
  });
});

for (let i = 0; i < 24; i++) {
  const s = await page.evaluate(() => {
    const card = document.querySelector('.builder-tutorial-card');
    const txt = document.querySelector('.builder-tutorial-text');
    const spans = txt ? [...txt.querySelectorAll('span[class]')].map(e => e.className + ':' + e.textContent) : [];
    return {
      card: !!card,
      text: txt ? txt.innerText.replace(/\s+/g, ' ').slice(0, 60) : null,
      hi: spans.slice(0, 5),
      hiCount: spans.length,
    };
  });
  console.log(`t+${(i*2.5).toFixed(0)}s card=${s.card?'Y':'.'} hi=${s.hiCount} ${s.text ? '"'+s.text+'"' : ''}`);
  if (s.hiCount) console.log('        spans:', JSON.stringify(s.hi));
  await page.waitForTimeout(2500);
}
console.log('\nCAMERA SWEEPS SEEN IN IFRAME:', JSON.stringify(await f.evaluate(() => ({ hasFn: window.__hasTourFocusCamera, msgs: window.__tourFocus })), null, 2));
await browser.close();
