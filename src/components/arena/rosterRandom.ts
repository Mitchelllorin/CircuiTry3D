import type { ComponentAction } from "../builder/types";

/**
 * Random picks off the component library.
 *
 * The library is long — every branded catalog part sits beside the generic
 * ones — so reaching a part you have not tested is a scroll rather than a
 * choice, and a bench whose whole point is trying things you would not
 * otherwise reach for should not depend on that scroll.
 *
 * Two rules make a draw worth having:
 *
 *   distinct — five presses must not hand back the same resistor five times,
 *              which is what independent `Math.random()` draws degenerate into
 *              once you ask for more than one card.
 *   avoidable — parts already on the bench are skipped where the library has
 *              enough left, so a five-part draw stocks the bench with five
 *              different things to compare instead of re-picking what is
 *              already under test.
 *
 * `random` is injectable so a test can drive the draw rather than hope.
 */
export const RANDOM_ROSTER_COUNT = 5;

export function pickRandomParts(
  library: readonly ComponentAction[],
  count: number,
  options: { avoid?: readonly string[]; random?: () => number } = {},
): ComponentAction[] {
  const wanted = Math.max(0, Math.floor(count));
  if (wanted === 0 || library.length === 0) {
    return [];
  }

  const random = options.random ?? Math.random;
  const avoid = new Set(options.avoid ?? []);

  // Build the pool first, so "avoid" removes cards from the draw rather than
  // being retried against: a bench holding half the library would otherwise
  // need an unbounded number of draws before it found a free card. When the
  // free cards cannot fill the request, the whole library is fair game — a
  // short draw or a dead button would be a worse answer than a repeat.
  const pool = library.filter((action) => !avoid.has(action.label));
  const source = pool.length >= wanted ? pool : library;

  // Partial Fisher–Yates: only the positions actually drawn need shuffling.
  const indices = source.map((_, index) => index);
  const picked: ComponentAction[] = [];
  for (let i = 0; i < indices.length && picked.length < wanted; i += 1) {
    const span = indices.length - i;
    const j = i + Math.min(span - 1, Math.floor(random() * span));
    [indices[i], indices[j]] = [indices[j], indices[i]];
    picked.push(source[indices[i]]);
  }
  return picked;
}
