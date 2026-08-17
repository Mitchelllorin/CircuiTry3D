/**
 * Building the actual link, with the two attributes that keep it legal.
 *
 * `rel` and the disclosure are not decoration. A paid link must be declared as
 * paid — to the reader (the disclosure) and to search engines (`rel=sponsored`,
 * which Google requires for links that carry compensation). Both are derived
 * from ONE fact, `isAffiliateActive`, so an untagged link can never be labelled
 * sponsored and a tagged one can never slip out undisclosed. Getting those two
 * out of step is the failure mode worth engineering against: it is invisible in
 * the app and it is the thing that costs an account.
 *
 * `noopener noreferrer` is always present — that is a security property of
 * opening any third-party page in a new tab, unrelated to money.
 */
import {
  AFFILIATE_CONFIG,
  isAffiliateActive,
  type AffiliateConfig,
} from "./config";
import { getMerchant, type MerchantId } from "./merchants";
import type { PartQuery } from "./partQuery";

/**
 * Where in the app a link was shown.
 *
 * Rides along as Amazon's `ascsubtag`, so the reports can answer "which surface
 * earns" rather than only "how much". Keep these short and stable — changing a
 * name splits its history in the reports.
 */
export type AffiliatePlacement =
  | "leaderboard"
  | "part-editor"
  | "roster"
  | "result"
  | "library";

export type BuyLinkSpec = {
  href: string;
  rel: string;
  /** True when this link carries tracking, so the UI must disclose it. */
  affiliate: boolean;
  merchantLabel: string;
  merchantId: MerchantId;
};

const BASE_REL = "noopener noreferrer";

/** `ct3d-<placement>`, the marker sent as Amazon's sub-tag. */
export function subtagFor(placement: AffiliatePlacement): string {
  return `ct3d-${placement}`;
}

/**
 * Everything the UI needs to render one buy link.
 *
 * Returned as data rather than JSX so the same decision can be reused by a
 * button, a menu item or a share sheet without any of them re-deriving the
 * `rel` and disclosure rules.
 */
export function buildBuyLink(
  query: PartQuery,
  options: {
    placement: AffiliatePlacement;
    merchant?: MerchantId;
    config?: AffiliateConfig;
  },
): BuyLinkSpec {
  const config = options.config ?? AFFILIATE_CONFIG;
  const merchant = getMerchant(options.merchant);
  const affiliate = isAffiliateActive(config, merchant.id);

  return {
    href: merchant.buildUrl(
      query,
      config,
      affiliate ? subtagFor(options.placement) : undefined,
    ),
    rel: affiliate ? `sponsored ${BASE_REL}` : BASE_REL,
    affiliate,
    merchantLabel: merchant.label,
    merchantId: merchant.id,
  };
}
