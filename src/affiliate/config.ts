/**
 * Affiliate configuration — read from the environment, never hard-coded.
 *
 * The tag used to be a constant in the Arena's link builder, and that is the
 * one thing this file exists to prevent. A tracking id is per-account and
 * per-marketplace: baked into the source it cannot differ between the web
 * build and the Play build, cannot be rotated without a code change, and — the
 * real hazard — a PLACEHOLDER tag ships looking exactly like a working one.
 * Sales then attribute to nobody (or to whoever does own that id) and nothing
 * anywhere reports an error.
 *
 * So the rule here is: no tag configured means no affiliate link. The buy
 * links still render and still go to the merchant, they simply go untagged,
 * un-"sponsored" and undisclosed — which is honest, costs nothing, and means
 * shipping before you are approved is safe.
 *
 * Vite inlines VITE_* at build time, so the tag ends up in the bundle. That is
 * correct and unavoidable for affiliate links: a tracking id is public by
 * design — it travels in the URL of every link you publish. Do not put
 * anything secret here.
 */

/** What the app needs to know to build a buy link. */
export type AffiliateConfig = {
  /** Master switch. False disables tagging everywhere, links stay plain. */
  enabled: boolean;
  amazon: {
    /** Marketplace host used when we have no better information. */
    defaultDomain: string;
    /**
     * Tracking id per marketplace host.
     *
     * Per-marketplace because Amazon Associates accounts ARE per-marketplace:
     * a .com tag earns nothing on .co.uk. Anyone who joins a second programme
     * needs this map, and anyone who has not simply has one entry in it.
     */
    tagsByDomain: Record<string, string>;
  };
  /**
   * Raw query fragment appended to non-Amazon merchant links, for programmes
   * that track with their own parameters (Digi-Key and Mouser both run theirs
   * through affiliate networks that hand you a parameter string). Empty means
   * those links are plain reference links, which is what they are until you
   * are accepted somewhere.
   */
  extraParams: Record<string, string>;
};

/** The one place the disclosure text is written. */
export const AFFILIATE_DISCLOSURE =
  "As an Amazon Associate, CircuiTry3D earns from qualifying purchases.";

/**
 * A shorter form for tight spots, e.g. beside a single link in a list.
 *
 * Still a disclosure, still adjacent to the link — the requirement is that a
 * reader understands the link is paid before they click it, not that a
 * particular sentence appears.
 */
export const AFFILIATE_DISCLOSURE_SHORT = "Paid link — we may earn a commission.";

const DEFAULT_AMAZON_DOMAIN = "www.amazon.com";

function readString(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parse `host=tag,host=tag` into a map.
 *
 * Tolerant on purpose: this is hand-edited in a .env file or a CI variable,
 * where a stray space or trailing comma is normal and should not silently
 * produce a broken tag on a live link.
 */
export function parseTagMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [host, tag] = pair.split("=");
    const cleanHost = host?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const cleanTag = tag?.trim();
    if (cleanHost && cleanTag) {
      map[cleanHost] = cleanTag;
    }
  }
  return map;
}

/** Parse `key=value,key=value` into a map of extra link parameters. */
export function parseParamMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key && value) {
      map[key] = value;
    }
  }
  return map;
}

/**
 * Build the config from an environment bag.
 *
 * Takes the environment as an argument rather than reaching for
 * `import.meta.env` itself, so the whole of this can be tested — the bug this
 * file is guarding against (a wrong or missing tag) is precisely the kind that
 * cannot be caught by looking at a running app.
 */
export function resolveAffiliateConfig(
  env: Record<string, unknown> = {},
): AffiliateConfig {
  const primaryTag = readString(env, "VITE_AMAZON_ASSOCIATES_TAG");
  const defaultDomain =
    readString(env, "VITE_AMAZON_MARKETPLACE") || DEFAULT_AMAZON_DOMAIN;

  const tagsByDomain = parseTagMap(readString(env, "VITE_AMAZON_ASSOCIATES_TAGS"));
  // The single-tag variable is the common case and wins for the default
  // marketplace, so nobody has to learn the map syntax to get started.
  if (primaryTag) {
    tagsByDomain[defaultDomain] = primaryTag;
  }

  // Explicit opt-OUT rather than opt-in: with a tag present the links should
  // work, and requiring a second variable to turn them on is a trap you only
  // discover by wondering why a month of clicks earned nothing.
  const enabled = readString(env, "VITE_AFFILIATE_ENABLED").toLowerCase() !== "false";

  return {
    enabled,
    amazon: { defaultDomain, tagsByDomain },
    extraParams: parseParamMap(readString(env, "VITE_AFFILIATE_EXTRA_PARAMS")),
  };
}

/** The tracking id for a marketplace, or null if that marketplace has none. */
export function amazonTagFor(
  config: AffiliateConfig,
  domain: string = config.amazon.defaultDomain,
): string | null {
  if (!config.enabled) return null;
  return config.amazon.tagsByDomain[domain] ?? null;
}

/**
 * True when links to this merchant will actually carry tracking.
 *
 * This is what decides whether a disclosure is shown and whether the link is
 * marked `sponsored` — both of which are claims about money changing hands,
 * and must not appear on a link that earns nothing.
 */
export function isAffiliateActive(config: AffiliateConfig, merchantId: string): boolean {
  if (!config.enabled) return false;
  if (merchantId === "amazon") {
    return Object.keys(config.amazon.tagsByDomain).length > 0;
  }
  return Object.keys(config.extraParams).length > 0;
}

/** The live config, resolved once from the build's environment. */
export const AFFILIATE_CONFIG: AffiliateConfig = resolveAffiliateConfig(
  (import.meta.env ?? {}) as unknown as Record<string, unknown>,
);
