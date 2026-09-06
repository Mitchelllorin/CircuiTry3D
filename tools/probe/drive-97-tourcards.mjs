/**
 * TOUR CARDS IN SEQUENCE WITH THE SWEEPS — the tour is only working if BOTH
 * halves land: the camera flies to a part, and that part's text card is on
 * screen while you are looking at it.
 *
 * drive-95 proved the camera moves. This proves the CARDS keep step with it:
 * samples card text + camera position together, and screenshots each new card.
 *
 *   node tools/probe/drive-97-tourcards.mjs
 */
import { openBuilder, ws } from './_harness.mjs';
const dir = process.env.SHOT_DIR || '.';

const { browser, page } = await openBuilder({ dismissTour: false });
const f = ws(page);

const sample = () => Promise.all([
  page.evaluate(() => {
    const card = document.querySelector('.builder-tutorial-card--tour');
    const body = card?.querySelector('p, .builder-tutorial-body');
    return {
      cardVisible: !!card,
      text: (body?.textContent || card?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
      highlights: card ? [...card.querySelectorAll('[class*="term"], .wire-term, mark, strong')]
        .map(e => e.textContent.trim()).filter(Boolean).slice(0, 6) : [],
      exit: !!document.querySelector('.builder-tour-exit'),
    };
  }),
  f.evaluate(() => (typeof camera !== 'undefined' && camera)
    ? [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)] : null),
]);

const seen = [];
let lastText = null, shot = 0;
const t0 = Date.now();

for (let i = 0; i < 40; i++) {
  const [c, cam] = await sample();
  const t = ((Date.now() - t0) / 1000).toFixed(0);
  if (c.cardVisible && c.text && c.text !== lastText) {
    lastText = c.text;
    shot++;
    await page.screenshot({ path: `${dir}/tour-card-${shot}.png`, timeout: 120000, animations: 'disabled' });
    console.log(`\n[${t}s] CARD ${shot}  cam=${JSON.stringify(cam)}`);
    console.log(`      "${c.text}"`);
    if (c.highlights.length) console.log(`      highlighted: ${c.highlights.join(' · ')}`);
    seen.push({ t, cam, text: c.text });
  } else if (!c.cardVisible && lastText !== null) {
    lastText = null;
    console.log(`[${t}s] (no card — gap; exit button present: ${c.exit}) cam=${JSON.stringify(cam)}`);
  }
  await page.waitForTimeout(2500);
}

console.log(`\n${seen.length} distinct cards, ${new Set(seen.map(s => JSON.stringify(s.cam))).size} distinct camera positions across them`);
await browser.close();
