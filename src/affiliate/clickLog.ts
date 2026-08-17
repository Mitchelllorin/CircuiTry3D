/**
 * A local record of every buy-link click.
 *
 * Amazon's reports are the money, but they are also delayed, aggregated, and
 * silent about the thing you most need early on: whether anybody is clicking
 * at all. Before approval there is no report of any kind, and the first
 * question — is this placement worth keeping? — is answerable from clicks
 * alone. So the app keeps its own count.
 *
 * Deliberately local-only and anonymous: what was clicked, where in the app,
 * and when. No identifier, nothing sent anywhere. It is a diagnostic for the
 * app's owner, not analytics on the user, which also keeps it clear of the
 * consent questions that a third-party tracker would drag in.
 */

const STORAGE_KEY = "circuitry:affiliate-clicks";

/** Bounded so a long-lived install cannot grow this without limit. */
const MAX_ENTRIES = 200;

export type AffiliateClick = {
  /** Epoch ms. */
  at: number;
  merchant: string;
  placement: string;
  /** The part, by name — enough to spot a pattern, not enough to identify anyone. */
  part: string;
};

function readStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Storage access throws outright in some embedded WebViews and in private
    // modes. A click log is never worth breaking a click over.
    return null;
  }
}

export function readAffiliateClicks(): AffiliateClick[] {
  const storage = readStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AffiliateClick[]) : [];
  } catch {
    return [];
  }
}

/**
 * Record one click. Never throws: this runs in the click handler of a link the
 * user is trying to follow, and a logging failure must not stop them.
 */
export function recordAffiliateClick(click: AffiliateClick): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    // Newest first, so the cap drops the OLDEST rather than refusing new ones.
    const next = [click, ...readAffiliateClicks()].slice(0, MAX_ENTRIES);
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* full, blocked, or serialising failed — not worth a broken link */
  }
}

export function clearAffiliateClicks(): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Clicks per placement — the "which surface earns" summary. */
export function summariseClicks(
  clicks: AffiliateClick[] = readAffiliateClicks(),
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const click of clicks) {
    totals[click.placement] = (totals[click.placement] ?? 0) + 1;
  }
  return totals;
}
