import { openBuilder, ws } from './_harness.mjs';
const { browser, page, logs } = await openBuilder();

console.log('=== FRAMES ===');
for (const f of page.frames()) console.log(' ', f.name() || '(main)', f.url().slice(0, 90));

const frame = ws(page);
console.log('workspace frame:', frame === page.mainFrame() ? 'MAIN (iframe not found!)' : 'legacy iframe');

console.log('\n=== CONSOLE (errors/warnings) ===');
const bad = logs.filter(l => /error|warn|pageerror|weberror/i.test(l.type));
if (!bad.length) console.log('  (none)');
const seen = new Set();
for (const l of bad) { const k = l.text.slice(0,120); if (seen.has(k)) continue; seen.add(k); console.log(`  [${l.type}] ${l.text}`); }

console.log('\n=== CONSOLE (notable app logs) ===');
const notable = logs.filter(l => /FAILSAFE|FLOW|CT3D|fail|missing|undefined|NaN|Infinity/i.test(l.text));
const seen2 = new Set();
for (const l of notable.slice(0, 400)) { const k = l.text.slice(0,110); if (seen2.has(k)) continue; seen2.add(k); console.log(`  ${l.text.slice(0,170)}`); }

console.log('\n=== SHELL BUTTONS (React chrome) ===');
const btns = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('button, [role=button], a[href]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return;
    out.push({ t: (el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,34),
      id: el.dataset.tutorialId || el.id || '', dis: el.disabled === true,
      r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)] });
  });
  return out;
});
for (const b of btns) console.log(`  ${b.dis?'[x]':'[ ]'} ${JSON.stringify(b.r).padEnd(22)} ${b.t || '(icon)'} ${b.id?'#'+b.id:''}`);

console.log('\n=== WORKSPACE STATE (legacy iframe) ===');
const state = await frame.evaluate(() => {
  const g = (k) => { try { return typeof window[k]; } catch { return 'err'; } };
  const api = window.CT3D || window.ct3d || null;
  return {
    globals: ['components','wires','scene','renderer','circuitState','solveCircuit','isMobile','wireMode']
      .reduce((a,k)=> (a[k]=g(k), a), {}),
    counts: { components: (window.components||[]).length, wires: (window.wires||[]).length },
    canvases: [...document.querySelectorAll('canvas')].map(c => [c.width, c.height, c.className||'(none)']),
    apiKeys: api ? Object.keys(api).slice(0,40) : null,
  };
});
console.log(JSON.stringify(state, null, 2));

await page.screenshot({ path: 'tools/probe/shot-01-load.png' });
console.log('\nscreenshot -> tools/probe/shot-01-load.png');
await browser.close();
