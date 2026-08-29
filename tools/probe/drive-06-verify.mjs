import { openBuilder, ws } from './_harness.mjs';
const t0 = Date.now();
const stamp = m => console.log(`\n[+${((Date.now() - t0) / 1000).toFixed(1)}s] ---- ${m}`);
stamp('launching');
const { browser, page, logs } = await openBuilder();
stamp('loaded');
const f = ws(page);

console.log('\n=== 1. PAYOFF PILL REACHABLE? ===');
console.log(JSON.stringify(await page.evaluate(() => {
  const chip = document.querySelector('.builder-payoff-guard');
  if (!chip) return { rendered: false, note: 'not rendered (banner may be showing, which is now expected)' };
  const r = chip.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { rendered: true, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    reachable: !!hit && (chip === hit || chip.contains(hit) || hit.contains(chip)),
    hit: hit ? hit.tagName + '.' + String(hit.className || '').slice(0, 40) : null };
}), null, 2));

console.log('\n=== 2. BANNER + PILL BOTH ON SCREEN? (should never be) ===');
console.log(JSON.stringify(await page.evaluate(() => ({
  banner: !!document.querySelector('.current-flow-payoff-strip'),
  pill: !!document.querySelector('.builder-payoff-guard'),
})), null, 2));

console.log('\n=== 3. RESISTANCE MATH ===');
console.log(JSON.stringify(await f.evaluate(() => {
  const others = components.filter(c => c.type !== 'battery');
  const shipped = performCircuitAnalysis();
  others.forEach(c => { if (typeof c.properties?.resistance === 'number') c.updateProperties({ resistance: 2 }); });
  const low = performCircuitAnalysis();
  const trueR = low.flow?.pathResistance;
  return {
    showcase: { R: +shipped.resistance.toFixed(3), I: +shipped.current.toFixed(4), P: +shipped.power.toFixed(3) },
    lowResistance: { R: +low.resistance.toFixed(3), I: +low.current.toFixed(4), P: +low.power.toFixed(3) },
    truePathResistance: +Number(trueR).toFixed(3),
    correctI: +(low.voltage / trueR).toFixed(4),
    correctP: +(low.voltage ** 2 / trueR).toFixed(3),
    PASS: Math.abs(low.resistance - trueR) < 0.01,
  };
}), null, 2));

console.log('\n=== 4. OHM LABELS IN EDIT FORM ===');
console.log(JSON.stringify(await f.evaluate(() => {
  const r = components.find(c => c.type === 'resistor');
  if (!r) return { note: 'no resistor' };
  const html = createEditForm(r);
  return { html: html.replace(/\s+/g, ' ').trim().slice(0, 120), hasOhm: html.includes('Ω'), hasQuestionMark: /\(\s*\?\s*\)/.test(html) };
}), null, 2));

console.log('\n=== 5. FULL HIT-TEST SWEEP ===');
const blocked = await page.evaluate(() => {
  const nm = el => { const c = String((el.className && (el.className.baseVal ?? el.className)) || '');
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 2).join('.') : ''); };
  const out = [];
  document.querySelectorAll('button, a[href], input, select, [role="button"], [role="tab"]').forEach(el => {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 1 || cy < 1 || cx > innerWidth - 1 || cy > innerHeight - 1) return;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    if (hit.closest && hit.closest('button,a[href],[role="button"]') === el) return;
    out.push(`"${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 34)}" <${nm(el)}> -> <${nm(hit)}>`);
  });
  return out;
});
console.log(`blocked: ${blocked.length}`);
blocked.forEach(b => console.log('  ' + b));

const errs = logs.filter(l => /^(error|pageerror|weberror)$/.test(l.type));
console.log(`\n=== 6. ERRORS: ${errs.length} ===`);
[...new Set(errs.map(e => e.text.slice(0, 140)))].forEach(t => console.log('  ' + t));
stamp('done');
await browser.close();
