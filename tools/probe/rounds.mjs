/**
 * THE ROUNDS — a guard walking the same beat every time.
 *
 * The one-off drive-NN probes each proved one thing once. This walks the whole
 * building on a fixed route, records what it saw, and — the point of rounds —
 * diffs against the last pass so a regression shows up as a change rather than
 * as a wall of output nobody reads.
 *
 *   node tools/probe/rounds.mjs            # walk, save, print the diff
 *   node tools/probe/rounds.mjs --quiet    # only speak up if something moved
 *
 * Reports land in tools/probe/rounds/ (latest.json + a timestamped copy).
 * Needs the dev server up on :3000.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CHROME, TOUR } from './_harness.mjs';

const OUT_DIR = path.join('tools', 'probe', 'rounds');
const LATEST = path.join(OUT_DIR, 'latest.json');
const QUIET = process.argv.includes('--quiet');
const LAUNCH = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const PHONE = {
  viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
};

/**
 * Console noise that is understood and not worth waking anyone for. A guard
 * that reports the same harmless thing every night stops being read, so each
 * entry needs a reason — and anything NOT on this list is still a failure.
 * Prune this whenever one of these is actually fixed.
 */
const KNOWN_NOISE = [
  { match: /\/api\/classroom/,
    why: 'dev-only: /api is a Vercel function that does not exist under vite; classroomApi already falls back to localStorage' },
];
const isKnownNoise = (text) => KNOWN_NOISE.some(n => n.match.test(text));

/** Everything a stop on the beat can report. A false `ok` is what wakes the guard. */
const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: !!ok, detail });

// ── page-side probes (stringified into the browser) ──────────────────

/** Interactive controls whose own centre belongs to something else.
 *  This is the mechanical detector for the translucent-overlay bug class. */
const BLOCKED_CONTROLS = () => {
  const desc = (el) => {
    const c = String((el.className && (el.className.baseVal ?? el.className)) || '');
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 2).join('.') : '');
  };
  const blocked = [];
  document.querySelectorAll('button, a[href], input, select, [role="button"], [role="tab"]').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return;
    // Own-opacity alone is not enough: a closed panel is still laid out, and
    // every control in it reads as covered. checkVisibility walks ancestors.
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return;
    if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return;
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    // A control that lives in the workspace iframe can only ever resolve to
    // that iframe from out here. Not a covering, just a document boundary.
    if (hit.tagName === 'IFRAME') return;
    blocked.push({
      target: desc(el),
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 44),
      coveredBy: desc(hit),
    });
  });
  return blocked;
};

/** Opaque-ish positioned surfaces, biggest first, as a share of the screen.
 *  The house rule is that panels are bottom sheets, not full screens. */
const PANEL_FOOTPRINT = () => {
  const alphaOf = (cs) => {
    const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map(Number);
    return p.length < 4 ? 1 : p[3];
  };
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (!/fixed|absolute/.test(cs.position)) return;
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    if (r.top > innerHeight || r.bottom < 0) return;
    if (alphaOf(cs) < 0.15) return;
    out.push({
      cls: String(el.className).slice(0, 46) || el.tagName,
      areaPct: +((r.width * r.height) / (innerWidth * innerHeight) * 100).toFixed(1),
    });
  });
  return out.sort((a, b) => b.areaPct - a.areaPct).slice(0, 6);
};

/** Flex/grid children that collapsed to zero height — the other half of the
 *  layering bug class: content that is not covered, it is simply not there. */
const COLLAPSED_BOXES = () => {
  const out = [];
  document.querySelectorAll('main, section, aside, .builder-shell *').forEach(el => {
    if (!el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.height > 2 || r.width < 40) return;
    // A deliberately hidden container has no laid-out children either; only a
    // box that crushed real content is worth reporting.
    const kids = [...el.children].filter(k => k.getBoundingClientRect().height > 2);
    if (!kids.length) return;
    out.push({ cls: String(el.className).slice(0, 46) || el.tagName, kidsWithHeight: kids.length });
  });
  return out.slice(0, 8);
};

/** Wire a page up so every complaint it makes is collected in one place. */
function listen(page) {
  const sink = { console: [], responses: [] };
  page.on('pageerror', e => sink.console.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') sink.console.push(m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400) sink.responses.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => sink.responses.push(`FAILED ${r.failure()?.errorText || '?'} ${r.url()}`));
  return sink;
}

/** Split what the page shouted into "new" and "already understood". */
function reportErrors(id, sink) {
  // A bad response already shows up as a generic console line with no URL in
  // it. Keep the response (it names the URL) and drop the console duplicate.
  const consoleReal = sink.console.filter(e => !/Failed to load resource/i.test(e) && !isKnownNoise(e));
  const responsesReal = sink.responses.filter(e => !isKnownNoise(e));
  const real = [...consoleReal, ...responsesReal];
  const muted = sink.responses.length - responsesReal.length;
  check(id, real.length === 0,
    real.length ? real.slice(0, 4).join(' | ')
                : `clean${muted ? ` (${muted} known-noise suppressed)` : ''}`);
}

// ── the beat ─────────────────────────────────────────────────────────

async function walkLanding(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  const sink = listen(page);
  await page.goto('http://localhost:3000/#/', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(5000);

  const frame = page.frames().find(f => /landing\.html/.test(f.url()));
  check('landing.iframe', !!frame, frame ? 'landing.html mounted' : 'landing iframe missing');
  if (frame) {
    const footer = await frame.evaluate(() => {
      const f = document.querySelector('.landing-footer');
      const credit = document.querySelector('.landing-credit');
      if (!f) return null;
      const r = f.getBoundingClientRect();
      return {
        onScreen: r.bottom <= innerHeight + 1,
        creditText: credit ? (credit.textContent || '').replace(/\s+/g, ' ').trim() : null,
        offsite: [...document.querySelectorAll('.landing-credit-link')].map(a => a.getAttribute('href')),
        // The SPA bridge rewrites anything carrying .landing-footer-link. An
        // off-site URL in that list would be hijacked into an in-app route.
        hijacked: [...document.querySelectorAll('.landing-footer-link')]
          .map(a => a.getAttribute('href') || '').filter(h => /^https?:/.test(h)),
      };
    });
    check('landing.footerOnScreen', footer && footer.onScreen, 'footer bottom within the one-pager viewport');
    check('landing.studioCredit', !!(footer && footer.creditText), (footer && footer.creditText) || 'credit line missing');
    check('landing.offsiteLinks', footer && footer.offsite.length === 2, JSON.stringify(footer && footer.offsite));
    check('landing.bridgeSafety', footer && footer.hijacked.length === 0,
      footer && footer.hijacked.length
        ? `off-site links stolen by the SPA bridge: ${footer.hijacked}`
        : 'no off-site link carries the bridge class');
  }
  reportErrors('landing.noErrors', sink);
  await ctx.close();
}

async function walkBuilder(browser) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch {} }, TOUR);
  const page = await ctx.newPage();
  const sink = listen(page);
  await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]');
    return b && !b.disabled;
  }, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const boot = await page.evaluate(() => ({
    shell: !!document.querySelector('.builder-shell'),
    tabs: [...document.querySelectorAll('.mode-tab')].map(b => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
    wireBtn: (() => {
      const b = document.querySelector('[data-tutorial-id="tutorial-enable-wire"]');
      return b ? (b.disabled ? 'present-disabled' : 'present-enabled') : 'absent';
    })(),
  }));
  check('builder.mounted', boot.shell, 'builder-shell present');
  check('builder.modeTabs', boot.tabs.length >= 4, boot.tabs.join(' / '));
  check('builder.wireButton', boot.wireBtn === 'present-enabled', boot.wireBtn);

  const blocked = await page.evaluate(BLOCKED_CONTROLS);
  check('builder.noBlockedControls', blocked.length === 0,
    blocked.length ? blocked.map(b => `"${b.text || b.target}" under ${b.coveredBy}`).join(' | ') : '0 blocked');

  const panels = await page.evaluate(PANEL_FOOTPRINT);
  const hog = panels.find(p => p.areaPct > 60);
  check('builder.panelBudget', !hog,
    hog ? `${hog.cls} covers ${hog.areaPct}% of the screen` : panels.map(p => `${p.cls}=${p.areaPct}%`).join(' '));

  const collapsed = await page.evaluate(COLLAPSED_BOXES);
  check('builder.noCollapsedBoxes', collapsed.length === 0,
    collapsed.length ? collapsed.map(c => c.cls).join(' | ') : '0 collapsed');

  // The three menu stages are pointer-transparent frames. Their toggles must
  // still open the panels — that is exactly what a stage's pointer-events can
  // break. Two separate questions: is the tab reachable by a thumb, and does
  // pressing it actually open the panel. Playwright's own .click() is no use
  // here: the side tabs deliberately overhang the screen edge, so its
  // actionability check fails on a tab that works perfectly.
  const opened = [];
  for (const side of ['left', 'right', 'bottom']) {
    const reachable = await page.evaluate(s2 => {
      const t = document.querySelector(`.builder-menu-toggle-${s2}`);
      if (!t) return false;
      const r = t.getBoundingClientRect();
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
      const hit = document.elementFromPoint(cx, cy);
      return !!hit && (hit === t || t.contains(hit));
    }, side);
    await page.evaluate(s2 => document.querySelector(`.builder-menu-toggle-${s2}`)?.click(), side);
    await page.waitForTimeout(800);
    const isOpen = await page.evaluate(s2 =>
      !!document.querySelector(`.builder-menu-stage-${s2}.open`), side);
    opened.push(`${side}=${reachable ? '' : 'UNREACHABLE/'}${isOpen ? 'opens' : 'STUCK'}`);
    if (isOpen) {
      await page.evaluate(s2 => document.querySelector(`.builder-menu-toggle-${s2}`)?.click(), side);
      await page.waitForTimeout(600);
    }
  }
  check('builder.menuTogglesWork', opened.every(o => o.endsWith('=opens')), opened.join(' '));

  // Android 15 / targetSdk 35 forces edge-to-edge: the webview spans UNDER the
  // status and nav bars. MainActivity calls EdgeToEdge.enable(); the CSS reads
  // env(safe-area-inset-*) into custom properties. This checks the plumbing
  // actually MOVES things rather than merely existing.
  //
  // env() cannot be faked from Playwright, but nothing reads env() at the point
  // of use — it reads the custom properties. There are TWO independent sets
  // (--app-safe-area-* and --builder-safe-area-*), each defined straight from
  // env(); a real device feeds both, so faking only one invents a collision.
  const TOP = 48, BOTTOM = 24;
  const inBars = () => page.evaluate(({ TOP, BOTTOM }) => {
    const hits = [];
    document.querySelectorAll('button, a[href], [role="button"], [role="tab"], input').forEach(el => {
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6 || r.right < 0 || r.left > innerWidth) return;
      const label = (el.innerText || el.getAttribute('aria-label') || '').replace(/s+/g, ' ').trim().slice(0, 26);
      if (!label) return;
      const midY = r.top + r.height / 2;
      if (midY < 0 || midY > innerHeight) return;   // below the fold is not a collision
      if (midY < TOP) hits.push(`"${label}" under the status bar`);
      else if (midY > innerHeight - BOTTOM) hits.push(`"${label}" under the nav bar`);
    });
    return {
      hits,
      barTop: (() => { const b = document.querySelector('.workspace-mode-bar--global');
        return b ? Math.round(b.getBoundingClientRect().top) : null; })(),
    };
  }, { TOP, BOTTOM });

  const flat = await inBars();
  await page.addStyleTag({ content: `:root {
    --app-safe-area-top: ${TOP}px !important;
    --app-safe-area-bottom: ${BOTTOM}px !important;
    --builder-safe-area-top: ${TOP}px !important;
    --builder-safe-area-bottom: ${BOTTOM}px !important;
  }` });
  await page.waitForTimeout(1200);
  const inset = await inBars();
  const movedBy = flat.barTop !== null && inset.barTop !== null ? inset.barTop - flat.barTop : null;
  check('builder.edgeToEdge', inset.hits.length === 0 && movedBy === TOP,
    `mode bar moved ${movedBy}px for a ${TOP}px inset; ` +
    (inset.hits.length ? `still in a system bar: ${inset.hits.slice(0, 4).join(', ')}` : 'nothing left in a system bar'));

  // HELP -> ABOUT: the website link and studio credit must survive.
  await page.evaluate(() => [...document.querySelectorAll('.mode-tab')].find(b => /Help/.test(b.innerText))?.click());
  await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('.guides-action-btn')]
    .find(b => /About CircuiTry3D/.test(b.innerText))?.click());
  await page.waitForTimeout(1500);
  const about = await page.evaluate(() => {
    const modal = document.querySelector('.builder-help-modal.open');
    const links = [...(modal ? modal.querySelectorAll('.studio-credit a') : [])].map(a => {
      const r = a.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { href: a.getAttribute('href'), tappable: !!top && (top === a || a.contains(top)) };
    });
    return { open: !!modal, title: modal && modal.querySelector('.help-title')?.innerText, links };
  });
  check('about.modalOpens', about.open, about.title || 'did not open');
  // Four now: the site, Google Play, and the two sibling studio sites. Every
  // other Play link in the app is behind demo mode or a purchase flow, so this
  // one is the only unconditional route to the listing from inside the app.
  const wantLinks = ['circuitry3d.app', 'play.google.com', 'theprints3d.com', 'automotive3d.ca'];
  const missing = wantLinks.filter(w => !about.links.some(l => (l.href || '').includes(w)));
  check('about.links', missing.length === 0 && about.links.every(l => l.tappable),
    (missing.length ? `missing: ${missing.join(', ')} — ` : '') +
    (about.links.map(l => `${l.href}${l.tappable ? '' : ' NOT-TAPPABLE'}`).join(' | ') || 'no links found'));

  // "< Back" has to actually leave About, not just route behind a live modal.
  await page.evaluate(() => document.querySelector('.builder-help-modal.open .help-back')?.click());
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({
    modalOpen: !!document.querySelector('.builder-help-modal.open'),
    helpPanel: !!document.querySelector('.guides-action-btn'),
  }));
  check('about.backWorks', !back.modalOpen && back.helpPanel,
    `modalStillOpen=${back.modalOpen} helpPanelShowing=${back.helpPanel}`);

  reportErrors('builder.noErrors', sink);
  await ctx.close();
}

// ── walk, save, diff ─────────────────────────────────────────────────

// Two walks at once corrupt the diff: they finish within a second of each
// other and each becomes the other's "previous walk", so real regressions get
// reported against a baseline from the same minute. One guard on the beat.
const LOCK = path.join(OUT_DIR, '.walking');
fs.mkdirSync(OUT_DIR, { recursive: true });
const lockAge = fs.existsSync(LOCK) ? Date.now() - fs.statSync(LOCK).mtimeMs : Infinity;
if (lockAge < 10 * 60 * 1000) {
  console.log(`ROUNDS skipped — another walk started ${Math.round(lockAge / 1000)}s ago.`);
  process.exit(0);
}
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => { try { fs.rmSync(LOCK, { force: true }); } catch {} });

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: LAUNCH });
try {
  await walkLanding(browser);
  await walkBuilder(browser);
} catch (e) {
  check('rounds.completed', false, `patrol aborted: ${String(e).slice(0, 200)}`);
} finally {
  await browser.close();
}

const report = { at: new Date().toISOString(), checks };
fs.mkdirSync(OUT_DIR, { recursive: true });
const prev = fs.existsSync(LATEST) ? JSON.parse(fs.readFileSync(LATEST, 'utf8')) : null;
fs.writeFileSync(path.join(OUT_DIR, `${report.at.replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2));
// A walk that never got out the door is not a baseline. Letting it become one
// throws away the last real result, so the NEXT walk has nothing to diff
// against and every check reports as brand new. Keep the timestamped copy for
// the record, but leave latest.json pointing at the last walk that happened.
const aborted = checks.some(c => c.id === 'rounds.completed' && !c.ok);
if (!aborted) fs.writeFileSync(LATEST, JSON.stringify(report, null, 2));

// Keep the last 20 walks. The diff only ever needs the previous one; the rest
// are for reading back a slow drift, and an unbounded pile is its own mess.
const kept = fs.readdirSync(OUT_DIR).filter(f => f !== 'latest.json' && f.endsWith('.json')).sort();
for (const stale of kept.slice(0, Math.max(0, kept.length - 20))) {
  fs.rmSync(path.join(OUT_DIR, stale), { force: true });
}

const prevById = new Map((prev ? prev.checks : []).map(c => [c.id, c]));
const changed = checks.filter(c => prevById.has(c.id) && prevById.get(c.id).ok !== c.ok);
const fresh = checks.filter(c => !prevById.has(c.id));
const failing = checks.filter(c => !c.ok);

if (!QUIET || changed.length || failing.length) {
  console.log(`ROUNDS ${report.at}  ${checks.length - failing.length}/${checks.length} pass` +
    (prev ? `  (previous walk ${prev.at})` : '  (first walk — baseline)'));
  for (const c of changed) console.log(`  ${c.ok ? 'RECOVERED' : 'REGRESSED'}  ${c.id}  — ${c.detail}`);
  for (const c of fresh) console.log(`  NEW ${c.ok ? 'pass' : 'FAIL'}  ${c.id}  — ${c.detail}`);
  const standing = failing.filter(c => !changed.includes(c) && !fresh.includes(c));
  for (const c of standing) console.log(`  still failing  ${c.id}  — ${c.detail}`);
  if (!changed.length && !fresh.length && !failing.length) console.log('  all quiet.');
}
process.exit(failing.length ? 1 : 0);
