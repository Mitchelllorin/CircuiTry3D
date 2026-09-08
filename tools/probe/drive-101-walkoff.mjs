// End-of-shift easter egg. The one thing that must be true: the walk is a LIE told
// to the GPU. component.position (what the solver and every save file read) must be
// byte-identical before, during and after — only mesh.position may move.
import { openBuilder, ws } from './_harness.mjs';

const R = [];
const check = (name, pass, detail) => { R.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const { browser, page, logs } = await openBuilder();
const f = ws(page);

const snap = () => f.evaluate(() => ({
  n: components.length,
  walking: !!window.__ct3dIdle?.walking,
  real: components.map(c => `${c.position.x.toFixed(3)},${c.position.y.toFixed(3)},${c.position.z.toFixed(3)}`).join('|'),
  mesh: components.map(c => `${c.mesh.position.x.toFixed(3)},${c.mesh.position.y.toFixed(3)},${c.mesh.position.z.toFixed(3)}`).join('|'),
  legsOn: components.filter(c => c._walkLegs && c._walkLegs.visible).length,
  hatOn: components.filter(c => c._walkHat && c._walkHat.visible).length,
  caseOn: components.filter(c => c._walkCase && c._walkCase.visible).length,
  reason: window.__ct3dIdle?.reason, since: window.__ct3dIdle?.msSinceInput,
}));

const before = await snap();
check('boot.components', before.n > 0, `${before.n} parts on the board`);
check('boot.seated', !before.walking && before.real === before.mesh, 'nobody walking at rest');

// Nobody waits 45 s.
await f.evaluate(() => window.__ct3dWalkNow());

// Sample across the whole cycle: stand → out → offstage → back → sit.
const samples = [];
for (let i = 0; i < 18; i++) {
  await page.waitForTimeout(800);
  const sm = await snap(); samples.push(sm);
  console.log(`   t+${((i+1)*0.8).toFixed(1)}s walking=${sm.walking} legs=${sm.legsOn} hat=${sm.hatOn} case=${sm.caseOn} since=${sm.since} blocked=${sm.reason}`);
}

const moved  = samples.filter(s => s.mesh !== before.mesh);
const walked = samples.filter(s => s.walking);
const legs   = samples.filter(s => s.legsOn > 0);
check('walk.happens', moved.length > 0, `${moved.length}/18 samples had parts off their seats`);
check('walk.flag', walked.length > 0, `__ct3dIdle.walking true on ${walked.length}/18 (drives the nameplate throttle)`);
check('walk.props', samples.some(s => s.hatOn > 0) && samples.some(s => s.caseOn > 0),
  `hats peak ${Math.max(...samples.map(s => s.hatOn))}, briefcases peak ${Math.max(...samples.map(s => s.caseOn))}`);
check('walk.legs', legs.length > 0, `legs visible on ${legs.length}/18, peak ${Math.max(...samples.map(s => s.legsOn))} parts`);

// THE load-bearing assertion.
const drifted = samples.filter(s => s.real !== before.real);
check('walk.circuit-untouched', drifted.length === 0,
  drifted.length ? `component.position CHANGED on ${drifted.length} samples — the solver can see this` : 'component.position identical on all 18 samples');

// They must go home instantly, mid-stride, with no scurry.
await f.evaluate(() => { window.__ct3dWalkNow(); });
await page.waitForTimeout(3000);          // catch them out on the floor
const midStride = await snap();
await f.evaluate(() => document.dispatchEvent(new Event('pointerdown')));
await page.waitForTimeout(120);           // a couple of frames, not an animation
const after = await snap();
check('walk.caught-out', midStride.mesh !== before.mesh, 'parts were genuinely away when input landed');
check('walk.snap-back', after.mesh === before.mesh, after.mesh === before.mesh ? 'every part back on its exact transform' : 'parts did not return to their seats');
check('walk.kit-stowed', after.legsOn === 0 && after.hatOn === 0 && after.caseOn === 0,
  `legs ${after.legsOn}, hats ${after.hatOn}, cases ${after.caseOn} left showing`);

const errs = logs.filter(l => l.type === 'pageerror' || l.type === 'weberror');
check('console.clean', errs.length === 0, errs.length ? errs[0].text : 'no page errors');

await browser.close();
const failed = R.filter(r => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed`);
process.exit(failed.length ? 1 : 0);
