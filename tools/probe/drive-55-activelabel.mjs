// The mode bar caption: on a phone it is the only printed tab name, so it has to
//   1. exist, and name the OPEN mode at rest;
//   2. follow the strip as it scrolls, naming whatever is under the middle;
//   3. hand back to the open mode once the strip settles;
//   4. cost the bar no height, and work in BOTH themes.
// (4) is the one that keeps regressing - the light overrides have quietly undone
// every containerless change so far.
import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';

const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
// The caption is aria-hidden and pointer-events:none; waitForSelector reports it
// visible and then times out anyway, so wait on the clock instead.
await page.waitForTimeout(14000);

const read = () => page.evaluate(() => {
  const cap = document.querySelector('.mode-bar-caption');
  const bar = document.querySelector('.workspace-mode-bar');
  const cs = cap && getComputedStyle(cap);
  const cb = cap?.getBoundingClientRect();
  const bb = bar?.getBoundingClientRect();
  return {
    text: cap?.textContent?.trim() ?? null,
    display: cs?.display ?? null,
    colour: cs?.color ?? null,
    shadow: cs?.textShadow ?? null,
    barTop: bb ? Math.round(bb.top) : 0,
    barH: bb ? Math.round(bb.height) : 0,
    // The caption sits ABOVE the icons now, so it must end before the bar starts.
    aboveBar: cb && bb ? cb.bottom <= bb.top + 1 : null,
    // The scrollbar is gone: a horizontal one would show up as height that the
    // content box doesn't get.
    scrollbarPx: bar ? bar.offsetHeight - bar.clientHeight : null,
    canScroll: bar?.getAttribute('data-can-scroll') ?? null,
    maskedEdges: bar ? getComputedStyle(bar).maskImage !== 'none' : null,
    inlineLabels: [...document.querySelectorAll('.mode-tab .mode-label')]
      .filter(l => { const r = l.getBoundingClientRect(); return r.width > 2 && r.height > 2; })
      .map(l => l.textContent.trim()),
  };
});

for (const theme of ['dark', 'light']) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(400);
  const at = await read();
  console.log(`\n[${theme}] bar top ${at.barTop} h${at.barH} | caption "${at.text}" display=${at.display} aboveBar=${at.aboveBar}`);
  console.log(`   colour ${at.colour}`);
  console.log(`   shadow ${at.shadow}`);
  console.log(`   scrollbar ${at.scrollbarPx}px | data-can-scroll=${at.canScroll} | edge fade=${at.maskedEdges}`);
  if (at.inlineLabels.length) console.log(`   !! inline labels still printed: ${at.inlineLabels.join(', ')}`);
  if (!at.text) console.log('   !! no caption');
  if (at.aboveBar === false) console.log('   !! caption is not clear above the bar');
  if (at.scrollbarPx) console.log('   !! the scrollbar is still taking height');
  if (at.canScroll && !at.maskedEdges) console.log('   !! scrollable but no edge fade drawn');
}

// Scroll to the far end and see whether the caption followed.
await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), 'dark');
const atRest = (await read()).text;
// Let the strip emit its own scroll events - a synthetic dispatch on top of the
// native ones just restarts the settle timer and makes the timing unreadable.
await page.evaluate(() => {
  const bar = document.querySelector('.workspace-mode-bar');
  bar.scrollLeft = bar.scrollWidth;
});
await page.waitForTimeout(250);
// Not an assertion - the native scroll event has often not fired this early, so
// this sample says nothing. The timeline below is what decides.
const firstSample = (await read()).text;

// Sample rather than take one late reading: the hand-back is on a timer that
// restarts with every scroll event, so a single sample cannot tell "never handed
// back" from "sampled mid-settle".
const timeline = [];
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(400);
  timeline.push((await read()).text);
}

console.log(`\nat rest      : "${atRest}"  (first sample after scroll: "${firstSample}")`);
console.log(`timeline     : ${timeline.map(t => `"${t}"`).join(' ')}`);
if (!timeline.some(t => t !== atRest)) console.log('   !! caption did NOT follow the scroll');
if (timeline[timeline.length - 1] !== atRest) console.log('   !! caption did not hand back to the open mode');
if (timeline.some(t => t !== atRest) && timeline[timeline.length - 1] === atRest) {
  console.log('   OK: followed the scroll, then handed back to the open mode');
}
await browser.close();
