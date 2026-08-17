/**
 * Where a buy link can point.
 *
 * A registry rather than an Amazon function, because the merchant is the thing
 * most likely to change: Amazon is where a hobbyist buys a bag of resistors,
 * but Digi-Key and Mouser are where the branded parts in this app's catalog
 * actually come from, and their programmes are joined separately and later.
 * With a registry that is a config change; with `buildAmazonUrl()` sprinkled
 * through the UI it is a refactor.
 *
 * Each merchant knows only how to turn a PartQuery into a URL. Whether that
 * URL carries tracking is decided by config, not here.
 */
import { amazonTagFor, type AffiliateConfig } from "./config";
import type { PartQuery } from "./partQuery";

export type MerchantId = "amazon" | "digikey" | "mouser";

export type Merchant = {
  id: MerchantId;
  label: string;
  /** Where the link goes. `subtag` is a per-placement marker, when supported. */
  buildUrl: (query: PartQuery, config: AffiliateConfig, subtag?: string) => string;
};

/** Amazon is the default: broadest stock of the parts this app teaches with. */
export const DEFAULT_MERCHANT: MerchantId = "amazon";

function applyExtraParams(url: URL, config: AffiliateConfig): void {
  for (const [key, value] of Object.entries(config.extraParams)) {
    url.searchParams.set(key, value);
  }
}

const AMAZON: Merchant = {
  id: "amazon",
  label: "Amazon",
  buildUrl(query, config, subtag) {
    const domain = config.amazon.defaultDomain;
    const url = new URL(`https://${domain}/s`);
    url.searchParams.set("k", query.terms);

    const tag = amazonTagFor(config, domain);
    if (tag) {
      url.searchParams.set("tag", tag);
      // Amazon's own sub-tag parameter. It rides along on the click and shows
      // up in the Associates reports, which is the only way to learn WHICH
      // surface in the app earns — one tracking id cannot tell a leaderboard
      // click from a part-editor click on its own.
      if (subtag) {
        url.searchParams.set("ascsubtag", subtag);
      }
    }
    return url.toString();
  },
};

const DIGIKEY: Merchant = {
  id: "digikey",
  label: "Digi-Key",
  buildUrl(query, config) {
    const url = new URL("https://www.digikey.com/en/products/result");
    url.searchParams.set("keywords", query.terms);
    applyExtraParams(url, config);
    return url.toString();
  },
};

const MOUSER: Merchant = {
  id: "mouser",
  label: "Mouser",
  buildUrl(query, config) {
    const url = new URL("https://www.mouser.com/c/");
    url.searchParams.set("q", query.terms);
    applyExtraParams(url, config);
    return url.toString();
  },
};

export const MERCHANTS: Record<MerchantId, Merchant> = {
  amazon: AMAZON,
  digikey: DIGIKEY,
  mouser: MOUSER,
};

export function getMerchant(id: MerchantId = DEFAULT_MERCHANT): Merchant {
  return MERCHANTS[id] ?? AMAZON;
}
