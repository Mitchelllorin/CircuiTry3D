import { openBuilder } from './_harness.mjs';
const { browser, page } = await openBuilder();
const show = (label, val) => console.log(`\n=== ${label} ===\n` + JSON.stringify(val, null, 2));

show('TOP NAV / HEADER', await page.evaluate(() => {
  const link = [...document.querySelectorAll('a,button')].find(e => /Pricing/.test(e.innerText || ''));
  if (!link) return { error: 'no Pricing link' };
  const chain = [];
  let el = link;
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    chain.push({
      tag: el.tagName.toLowerCase(),
      cls: String((el.className && (el.className.baseVal ?? el.className)) || '').slice(0, 50),
      ovx: cs.overflowX, pos: cs.position,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      scrollW: el.scrollWidth, clientW: el.clientWidth,
      scrollable: el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(cs.overflowX),
    });
    el = el.parentElement;
  }
  return { pricingFullyOnScreen: link.getBoundingClientRect().right <= window.innerWidth, chain };
}));

show('DOCUMENT HORIZONTAL OVERFLOW', await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  docScrollW: document.documentElement.scrollWidth,
  bodyScrollW: document.body.scrollWidth,
  bodyOverflowX: getComputedStyle(document.body).overflowX,
  htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
  offenders: [...document.querySelectorAll('*')]
    .map(e => ({ e, r: e.getBoundingClientRect() }))
    .filter(o => o.r.right > window.innerWidth + 4 && o.r.width > 40)
    .slice(0, 10)
    .map(o => ({
      cls: String((o.e.className && (o.e.className.baseVal ?? o.e.className)) || o.e.tagName).slice(0, 50),
      pos: getComputedStyle(o.e).position, right: Math.round(o.r.right), w: Math.round(o.r.width),
    })),
})));

show('FIXED/STICKY ELEMENTS NEAR TOP (y < 130)', await page.evaluate(() => {
  const items = [];
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (!/fixed|sticky/.test(cs.position)) return;
    const r = el.getBoundingClientRect();
    if (r.height < 8 || r.width < 8 || r.top > 130) return;
    if (cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    items.push({
      cls: String((el.className && (el.className.baseVal ?? el.className)) || el.tagName).slice(0, 44),
      z: cs.zIndex,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      txt: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    });
  });
  return items;
}));

await browser.close();
