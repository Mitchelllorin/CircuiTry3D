/**
 * The buy link, and the disclosure that has to travel with it.
 *
 * Both live in one file on purpose. They are two halves of one obligation:
 * wherever a paid link is rendered, a reader has to be able to tell it is paid
 * before they click it. Keeping them apart is how an app ends up shipping the
 * link and forgetting the sentence.
 *
 * Styling follows the app's rule for anything laid over the workspace — a text
 * link, no container, no button chrome. A part that just failed on the bench is
 * a moment of genuine interest, and the link should read as an offer to help,
 * not as an advert planted in the results.
 */
import { buildBuyLink, type AffiliatePlacement } from "./links";
import { recordAffiliateClick } from "./clickLog";
import { AFFILIATE_DISCLOSURE, AFFILIATE_DISCLOSURE_SHORT } from "./config";
import type { MerchantId } from "./merchants";
import { buildPartQuery, type PartQuery, type PartQueryInput } from "./partQuery";

type BuyLinkProps = {
  /** The part to look for — either a ready query or the part to build one from. */
  part: PartQueryInput | PartQuery;
  placement: AffiliatePlacement;
  merchant?: MerchantId;
  /** Link text. Defaults to naming the merchant, which is the honest label. */
  children?: React.ReactNode;
  className?: string;
};

function isPartQuery(value: PartQueryInput | PartQuery): value is PartQuery {
  return "terms" in value;
}

export function BuyLink({
  part,
  placement,
  merchant,
  children,
  className,
}: BuyLinkProps) {
  const query = isPartQuery(part) ? part : buildPartQuery(part);
  const link = buildBuyLink(query, { placement, merchant });

  return (
    <a
      className={className ?? "affiliate-link"}
      href={link.href}
      target="_blank"
      rel={link.rel}
      // Named for a human: "opens Amazon" is what actually happens, and a link
      // that says where it goes needs no warning icon.
      title={`Find ${query.label} on ${link.merchantLabel}`}
      onClick={() =>
        recordAffiliateClick({
          at: Date.now(),
          merchant: link.merchantId,
          placement,
          part: query.label,
        })
      }
    >
      {children ?? `Find on ${link.merchantLabel}`}
      {/* Marked inline as well as by the block disclosure, because a link can
          be read on its own — in a list, a reader's eye never passes the
          paragraph underneath. Two characters is a cheap way to be honest. */}
      {link.affiliate ? (
        <span className="affiliate-link__mark" aria-label="paid link">
          {" "}
          ·{" "}
          <span aria-hidden>ad</span>
        </span>
      ) : null}
    </a>
  );
}

/**
 * The full disclosure. Render once per surface that shows any buy link.
 *
 * Renders NOTHING when no tag is configured — at that point the links carry no
 * tracking and earn nothing, and claiming otherwise would be its own kind of
 * false statement.
 */
export function AffiliateDisclosure({
  short = false,
  className,
  merchant,
}: {
  short?: boolean;
  className?: string;
  merchant?: MerchantId;
}) {
  // Probe with a throwaway query: the only thing being asked is whether links
  // to this merchant currently carry tracking.
  const probe = buildBuyLink(
    { terms: "", family: "generic", label: "" },
    { placement: "library", merchant },
  );
  if (!probe.affiliate) return null;

  return (
    <p className={className ?? "affiliate-disclosure"}>
      {short ? AFFILIATE_DISCLOSURE_SHORT : AFFILIATE_DISCLOSURE}
    </p>
  );
}
