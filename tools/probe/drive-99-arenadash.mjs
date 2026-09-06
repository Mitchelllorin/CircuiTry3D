/**
 * ARENA CONTROL DASHBOARD — look at it, and report what is actually on screen.
 * Bounded hard: arena WebGL has frozen automation before, so every step has its
 * own timeout and the probe reports what it got rather than hanging.
 *
 *   node tools/probe/drive-99-arenadash.mjs
 */
import { openBuilder } from './_harness.mjs';
const dir = process.env.SHOT_DIR || '.';

const { browser, page } = await openBuilder();

const enter = await page.evaluate(() => {
  // The mode bar tags its tabs with data-mode; the visible text is just an
  // emoji, and the title says "Component testing and advanced simulation" with
  // no "arena" in it at all. Matching on label text finds nothing and reads as
  // "the arena is missing".
  const btn = document.querySelector('[data-mode="arena"]');
  if (!btn) return 'no arena button found';
  btn.click();
  return 'clicked: ' + (btn.getAttribute('aria-label') || btn.textContent || '').trim().slice(0, 40);
});
console.log('entry:', enter);

await page.waitForTimeout(9000);

const state = await page.evaluate(() => {
  const dash = document.querySelector('.arena-dash');
  if (!dash) return { present: false, mode: document.querySelector('.builder-shell')?.className || '' };
  const r = dash.getBoundingClientRect();
  const grab = (sel) => [...dash.querySelectorAll(sel)].map((e) => {
    const b = e.getBoundingClientRect();
    return { t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 24), w: Math.round(b.width), h: Math.round(b.height) };
  });
  return {
    present: true,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    vh: window.innerHeight,
    displays: grab('.arena-dash__display'),
    faders: grab('.arena-dash__fader'),
    switchEl: grab('.arena-dash__switch'),
    values: [...dash.querySelectorAll('[data-wire]')].map((e) => `${e.getAttribute('data-wire')}=${e.textContent.trim()}`),
  };
});

console.log(JSON.stringify(state, null, 1));
await page.screenshot({ path: `${dir}/arena-dash.png`, timeout: 120000, animations: 'disabled' });
console.log('shot written');
await browser.close();
