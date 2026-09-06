/**
 * LIBRARY ADD PATH — drive-93 proved Battery, Resistor and Junction still APPEAR
 * in the Library drawer. That is not the same as being addable.
 *
 * The drawer is a scroller: exactly one part sits centered and carries the
 * "Add X (centered)" action; every other row is only "Scroll to X". So the claim
 * behind removing them from the quick-add bar — "still a tap away" — is really a
 * TWO-tap path, and this probe checks that second tap actually lands a part.
 *
 *   node tools/probe/drive-94-libraryadd.mjs
 */
import { openBuilder, ws } from './_harness.mjs';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const { browser, page } = await openBuilder();
const f = ws(page);
const count = () => f.evaluate(() => components.length);

// Open the Library drawer.
await page.evaluate(() => document.querySelector('.builder-menu-toggle-left')?.click());
await page.waitForTimeout(2000);

const centered = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('.builder-menu-stage-left button, .builder-menu-stage-left [role="button"]')]
    .find((x) => /^Add /.test(x.getAttribute('aria-label') || ''));
  return b ? b.getAttribute('aria-label') : null;
});

console.log(`centered on open: ${await centered()}`);

for (const part of ['Resistor', 'Junction']) {
  const before = await count();

  // Tap 1 — bring it to the centre.
  const scrolled = await page.evaluate((p) => {
    const b = [...document.querySelectorAll('.builder-menu-stage-left button, .builder-menu-stage-left [role="button"]')]
      .find((x) => x.getAttribute('aria-label') === `Scroll to ${p}`);
    if (!b) return false;
    b.click();
    return true;
  }, part);
  check(`${part}: "Scroll to ${part}" row exists`, scrolled);
  await page.waitForTimeout(1400);

  const nowCentered = await centered();
  check(`${part}: tap 1 centers it`, nowCentered === `Add ${part} (centered)`,
    `centered = ${nowCentered}`);

  // Tap 2 — add it.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.builder-menu-stage-left button, .builder-menu-stage-left [role="button"]')]
      .find((x) => /^Add /.test(x.getAttribute('aria-label') || ''));
    b?.click();
  });
  await page.waitForTimeout(2000);

  const after = await count();
  check(`${part}: tap 2 adds a part`, after > before, `${before} -> ${after}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
