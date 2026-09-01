// Inventory every button the running app actually shows, grouped by the
// container it sits in — to find what "the QA buttons" really are.
import { openBuilder, ws } from './_harness.mjs';
const { browser, page } = await openBuilder();
const dump = async (label, frame) => {
  const rows = await frame.evaluate(() => {
    const groups = {};
    document.querySelectorAll('button, [role="button"], a[href]').forEach(el => {
      const t = (el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      if (!t) return;
      const cs = getComputedStyle(el);
      const vis = el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : cs.display !== 'none';
      let p = el.parentElement, key = '(root)';
      for (let i = 0; i < 4 && p; i++) {
        const c = String(p.className || '');
        if (c) { key = c.split(/\s+/).slice(0, 2).join('.'); break; }
        p = p.parentElement;
      }
      (groups[key] ||= []).push((vis ? '' : '(hidden) ') + t);
    });
    return groups;
  });
  console.log(`\n===== ${label} =====`);
  for (const [k, v] of Object.entries(rows)) {
    console.log(`  ${k}\n      ${v.join(' | ').slice(0, 400)}`);
  }
};
await dump('MAIN DOCUMENT', page);
await dump('WORKSPACE IFRAME (legacy.html)', ws(page));
await browser.close();
