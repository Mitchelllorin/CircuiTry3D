import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const out = await page.evaluate(() => {
  const el = document.querySelector('.workspace-mode-bar');
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, media) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules, r.conditionText || media); continue; }
        if (!r.selectorText) continue;
        let matches = false;
        try { matches = el.matches(r.selectorText); } catch { continue; }
        if (!matches) continue;
        const bg = r.style.getPropertyValue('background') || r.style.getPropertyValue('background-color');
        if (bg) hits.push({ sel: r.selectorText.slice(0, 90), bg: bg.slice(0, 60), media: media || '-', href: (sheet.href || 'inline').split('/').pop() });
      }
    };
    walk(rules, null);
  }
  return { computed: getComputedStyle(el).backgroundColor, inline: el.style.background || '-', hits };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
