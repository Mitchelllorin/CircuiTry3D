/**
 * Affiliate linking — one entry point.
 *
 * Import from here, not from the files inside: the surfaces that show buy
 * links should not have to know that the tag comes from config, the URL from a
 * merchant registry, and the `rel` from whether the two agree.
 *
 * See docs/AFFILIATE-SETUP.md for what has to be done outside the code before
 * any of this earns anything.
 */
export {
  AFFILIATE_CONFIG,
  AFFILIATE_DISCLOSURE,
  AFFILIATE_DISCLOSURE_SHORT,
  amazonTagFor,
  isAffiliateActive,
  parseParamMap,
  parseTagMap,
  resolveAffiliateConfig,
  type AffiliateConfig,
} from "./config";

export {
  buildPartQuery,
  familyWord,
  looksLikePartNumber,
  specFragment,
  type PartQuery,
  type PartQueryInput,
} from "./partQuery";

export {
  DEFAULT_MERCHANT,
  MERCHANTS,
  getMerchant,
  type Merchant,
  type MerchantId,
} from "./merchants";

export {
  buildBuyLink,
  subtagFor,
  type AffiliatePlacement,
  type BuyLinkSpec,
} from "./links";

export {
  clearAffiliateClicks,
  readAffiliateClicks,
  recordAffiliateClick,
  summariseClicks,
  type AffiliateClick,
} from "./clickLog";

import "../styles/affiliate.css";

export { AffiliateDisclosure, BuyLink } from "./BuyLink";
