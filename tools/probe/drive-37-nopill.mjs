import { openBuilder, ws } from './_harness.mjs';
const show = (l, v) => console.log(`\n=== ${l} ===\n` + JSON.stringify(v, null, 2));

// Returning user (tour already dismissed): no pill, and the circuit is editable.
{
  const { browser, page } = await openBuilder();
  const f = ws(page);
  show('RETURNING USER', {
    pillPresent: await page.evaluate(() => !!document.querySelector('.builder-payoff-guard')),
    demoCircuitTextAnywhere: await page.evaluate(() =>
      [...document.querySelectorAll('*')].some(e => !e.children.length && /Demo circuit/i.test(e.textContent || ''))),
    editLocked: await f.evaluate('typeof isCircuitEditLocked === "undefined" ? "n/a" : isCircuitEditLocked'),
  });
  await browser.close();
}
