import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import pricingSource from "../data/pricing.json";
import BrandSignature from "./BrandSignature";
import SectionWorkflowStrip, {
  type SectionWorkflowStep,
} from "./SectionWorkflowStrip";
import "../styles/pricing.css";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Billing cycle selector for the Pro subscription tier. */
type ProCycle = "monthly" | "yearly";

type PurchaseStatus = "idle" | "purchasing" | "failed" | "cancelled";

const OPENING_GOOGLE_PLAY_LABEL = "Opening Google Play…";
const GET_ON_GOOGLE_PLAY_LABEL = "Get it on Google Play";
const SUBSCRIBE_IN_GOOGLE_PLAY_LABEL = "Subscribe in Google Play";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a localised price string (e.g. "$2.49", "€2,49") into a numeric
 * value in the major currency unit.  Returns NaN when parsing fails.
 */
function parsePriceAmount(formatted: string): number {
  return parseFloat(formatted.replace(/[^0-9.]/g, ""));
}

/**
 * Extract the currency symbol / prefix from a formatted price string.
 *
 * @example extractCurrencySymbol("$2.49")  // → "$"
 * @example extractCurrencySymbol("€2,49")  // → "€"
 */
function extractCurrencySymbol(formatted: string): string {
  return formatted.replace(/[0-9.,\s]/g, "").trim();
}

/**
 * Derive the yearly price label from the monthly price string.
 * Parses the currency symbol + numeric value, multiplies by 12, and formats
 * a "save X%" note.  Falls back to the static yearly fallback when parsing fails.
 *
 * @param monthlyLabel  Formatted price string from BillingClient, e.g. "$2.49"
 * @param yearlyLabel   Formatted price string from BillingClient, e.g. "$14.99"
 */
function buildYearlyLabel(monthlyLabel: string, yearlyLabel?: string): string {
  if (yearlyLabel) return yearlyLabel;
  // Auto-calculate: strip currency symbol, parse float, multiply by 12
  const num = parsePriceAmount(monthlyLabel);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const yearly = num * 12;
  const currencySymbol = extractCurrencySymbol(monthlyLabel);
  return `${currencySymbol}${yearly.toFixed(2)} / yr`;
}

function buildConsumerCtaLabel(options: {
  purchaseStatus: PurchaseStatus;
  onAndroid: boolean;
  supportsDirectWebCheckout: boolean;
  actionLabel: string;
  priceLabel?: string;
}): string {
  const { purchaseStatus, onAndroid, supportsDirectWebCheckout, actionLabel, priceLabel } = options;

  if (purchaseStatus === "purchasing") return OPENING_GOOGLE_PLAY_LABEL;
  if (!onAndroid && !supportsDirectWebCheckout) {
    return actionLabel === "Subscribe"
      ? SUBSCRIBE_IN_GOOGLE_PLAY_LABEL
      : GET_ON_GOOGLE_PLAY_LABEL;
  }
  return priceLabel ? `${actionLabel} — ${priceLabel}` : actionLabel;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * PricingSection — hybrid pricing page that displays both consumer tiers
 * (backed by Google Play Billing) and enterprise tiers (Contact Sales only).
 *
 * On Android, live localised prices are fetched from BillingClient via
 * `getConsumerProductPrices()` and override the static fallback values.
 * On web, static fallback prices are shown instead.
 *
 * Features:
 *  • Consumer tier cards with live prices and Play Store purchase buttons
 *  • Pro subscription toggle (monthly / yearly) with auto-calculated yearly price
 *  • Enterprise tier cards with "Contact Sales" CTA (no in-app purchase)
 *  • Feature comparison table
 *  • "Restore Purchases" button for consumer tiers
 *  • EntitlementManager integration to show locked/unlocked state
 */
export default function PricingSection() {
  const onAndroid = isAndroidApp();
  const entitlements = useEntitlements();

  // Live prices fetched from BillingClient (Android only; empty on web)
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});
  // Pro subscription billing cycle selector
  const [proCycle, setProCycle] = useState<ProCycle>("monthly");
  // Restore-purchases UX state
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "restoring" | "done">("idle");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const supportsDirectWebCheckout = hasWebPaymentCheckout();

  // ── Initialise billing & fetch live prices ──────────────────────────────────

  useEffect(() => {
    if (!onAndroid) return;

    void (async () => {
      await initBilling();
      const prices = await getConsumerProductPrices();
      setLivePrices(prices);
    })();
  }, [onAndroid]);

  useEffect(() => {
    const clearPurchaseState = () => {
      setPurchaseStatus("idle");
      setPurchaseError(null);
    };
    const handleFailedPurchase = (event: Event) => {
      const detail = (event as CustomEvent<{ cancelled?: boolean; error?: string }>).detail;
      setPurchaseStatus(detail?.cancelled ? "cancelled" : "failed");
      setPurchaseError(detail?.error ?? null);
    };

type Plan = {
  id: string;
  name: string;
  tagline?: string;
  audience?: string;
  popular?: boolean;
  price: PriceMap;
  unit?: string;
  features: string[];
  renewal?: string;
  cta: CallToAction;
  bulk?: {
    minimumSeats?: number;
    notes?: string;
  };
};

    return () => {
      window.removeEventListener("circuitry3d:tierChanged", clearPurchaseState);
      window.removeEventListener("circuitry3d:premiumUnlocked", clearPurchaseState);
      window.removeEventListener("circuitry3d:proUnlocked", clearPurchaseState);
      window.removeEventListener("circuitry3d:purchaseFailed", handleFailedPurchase);
    };
  }, []);

type ManufacturerTier = {
  id: string;
  name: string;
  tagline?: string;
  priceRange: {
    min: number;
    max: number | null;
  };
  period: string;
  features: string[];
  popular?: boolean;
};

type ManufacturerPartnerships = {
  title: string;
  subtitle: string;
  description: string;
  tiers: ManufacturerTier[];
  cta: {
    label: string;
    href: string;
  };
  factors: Array<{
    title: string;
    description: string;
  }>;
};

type PricingData = {
  currency: string;
  billingCycles: BillingCycle[];
  plans: Plan[];
  addons?: AddOn[];
  manufacturerPartnerships?: ManufacturerPartnerships;
  stripe?: {
    status: string;
    note?: string;
  };
};

  /**
   * Return the display price for a consumer tier.
   * Prefers the live BillingClient price when available.
   */
  const resolveTierPrice = useCallback(
    (tier: ConsumerTier, cycle?: ProCycle): string => {
      if (tier.id === "free") return "Free";

const DEFAULT_CYCLE: BillingCycleId = "annual";
const PRICING_WORKFLOW_STEPS: SectionWorkflowStep[] = [
  {
    id: "pricing-compare",
    title: "Compare plan scope",
    detail:
      "Review educator tiers, included features, and add-ons before selecting a package.",
  },
  {
    id: "pricing-cycle",
    title: "Set billing cadence",
    detail:
      "Switch monthly vs annual billing to align costs with your classroom or district cycle.",
  },
  {
    id: "pricing-activate",
    title: "Activate and launch",
    detail:
      "Start the sandbox or contact the team to finalize rollout and subscription onboarding.",
  },
];

      if (tier.id === "pro" && tier.skus) {
        if (cycle === "yearly") {
          const monthlyPrice = livePrices[tier.skus.monthly] ?? "";
          const yearlyPrice = livePrices[tier.skus.yearly];
          // Prefer live BillingClient price → static yearly fallback → auto-compute from monthly.
          return buildYearlyLabel(
            monthlyPrice || tier.staticPriceFallback,
            yearlyPrice ?? tier.staticYearlyPriceFallback
          );
        }
        return livePrices[tier.skus.monthly] ?? tier.staticPriceFallback;
      }

      return tier.staticPriceFallback;
    },
    [livePrices]
  );

  // ── Purchase handlers ──────────────────────────────────────────────────────

  /**
   * Handle web-only purchase routing: open the configured checkout URL or fall
   * back to the Play Store listing.  Returns true when a redirect was performed
   * so callers can skip the native billing flow.
   */
  const handleWebPurchase = useCallback((): boolean => {
    if (isAndroidApp()) return false;
    if (supportsDirectWebCheckout) {
      openWebPayment();
    } else {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    }
    return true;
  }, [supportsDirectWebCheckout]);

  /** Handle a tap on the Premium Unlock buy button. */
  const handlePurchasePremium = useCallback(async () => {
    setPurchaseStatus("purchasing");
    setPurchaseError(null);
    if (handleWebPurchase()) {
      setPurchaseStatus("idle");
      return;
    }
    const launched = await purchasePremiumUnlock();
    if (!launched) {
      window.location.href =
        "mailto:hello@circuitry3d.net?subject=Premium%20Unlock%20Purchase";
    }
  }, [handleWebPurchase]);

function formatPriceRange(min: number, max: number | null, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });

  if (max === null) {
    return `${formatter.format(min)}+`;
  }

  return `${formatter.format(min)} – ${formatter.format(max)}`;
}

function getDisplayUnit(plan: Plan | AddOn): string | undefined {
  if (plan.unit) {
    return plan.unit;
  }
  return undefined;
}

  /** Restore all consumer purchases (subscriptions + one-time). */
  const handleRestorePurchases = useCallback(async () => {
    setRestoreStatus("restoring");
    await Promise.all([
      restorePurchases(),
      restorePremiumPurchases(),
      restoreProPurchases(),
    ]);
    setRestoreStatus("done");
    setTimeout(() => setRestoreStatus("idle"), 3000);
  }, []);

type AudienceTab = "all" | "students" | "educators" | "institutions" | "general";

const AUDIENCE_TABS: { id: AudienceTab; label: string }[] = [
  { id: "all", label: "All Plans" },
  { id: "students", label: "Students" },
  { id: "educators", label: "Educators" },
  { id: "institutions", label: "Schools" },
  { id: "general", label: "Makers" },
];

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>(() => {
    const preferred = normalizeCycle(pricingData.billingCycles?.[0]?.id);
    return preferred ?? DEFAULT_CYCLE;
  });

  const [audienceFilter, setAudienceFilter] = useState<AudienceTab>("all");

  const cycles = useMemo(() => pricingData.billingCycles.map((cycle) => normalizeCycle(cycle.id)), []);

  const activeCycle = billingCycle;
  const activeCycleMeta = pricingData.billingCycles.find((cycle) => normalizeCycle(cycle.id) === activeCycle);

  const filteredPlans = useMemo(() => {
    if (audienceFilter === "all") {
      return pricingData.plans;
    }
    return pricingData.plans.filter((plan) => plan.audience === audienceFilter);
  }, [audienceFilter]);

  const handleCycleChange = (cycle: BillingCycleId) => {
    setBillingCycle(cycle);
  };

  const handleStripeClick = (sku: string) => {
    console.info("Stripe checkout pending integration", { sku });
    window.alert?.("Stripe checkout coming soon. Contact us to activate your subscription.");
  };

  const renderCTA = (cta: CallToAction) => {
    if (cta.type === "link") {
      const isInternal = cta.href.startsWith("/");
      if (isInternal) {
        return (
          <Link className="pricing-cta" to="/app" data-cta-type="internal">
            Start Free
          </Link>
        );
      }

      if (isTierActive(tier.id)) {
        return (
          <button type="button" className="pricing-cta pricing-cta--active" disabled>
            ✓ Current Plan
          </button>
        );
      }

      if (tier.id === "premium") {
        return (
          <button
            type="button"
            className="pricing-cta"
            data-cta-type={!onAndroid && !supportsDirectWebCheckout ? "external" : "play-store"}
            onClick={handlePurchasePremium}
            disabled={purchaseStatus === "purchasing"}
          >
            {buildConsumerCtaLabel({
              purchaseStatus,
              onAndroid,
              supportsDirectWebCheckout,
              actionLabel: "Unlock",
              priceLabel: resolveTierPrice(tier),
            })}
          </button>
        );
      }

      if (tier.id === "pro") {
        return (
          <button
            type="button"
            className="pricing-cta"
            data-cta-type={!onAndroid && !supportsDirectWebCheckout ? "external" : "play-store"}
            onClick={handlePurchasePro}
            disabled={purchaseStatus === "purchasing"}
          >
            {buildConsumerCtaLabel({
              purchaseStatus,
              onAndroid,
              supportsDirectWebCheckout,
              actionLabel: "Subscribe",
              priceLabel: resolveTierPrice(tier, proCycle),
            })}
          </button>
        );
      }

      return null;
    },
    [
      handlePurchasePremium,
      handlePurchasePro,
      isTierActive,
      onAndroid,
      proCycle,
      purchaseStatus,
      resolveTierPrice,
      supportsDirectWebCheckout,
    ]
  );

  /** Render the CTA for an enterprise tier. */
  const renderEnterpriseCTA = useCallback((tier: EnterpriseTier) => {
    return (
      <button
        type="button"
        className="pricing-cta"
        data-cta-type="stripe"
        disabled={checkoutLoading === cta.sku}
        onClick={() => handleStripeClick(cta.sku)}
      >
        {checkoutLoading === cta.sku ? "Redirecting..." : cta.label}
      </button>
    );
  }, []);

  // ── Yearly price note ──────────────────────────────────────────────────────

  const yearlyPriceNote = useMemo(() => {
    const monthlyPrice = livePrices[SUB_MONTHLY_SKU];
    if (!monthlyPrice) return null;
    const num = parsePriceAmount(monthlyPrice);
    if (!Number.isFinite(num) || num <= 0) return null;
    const currency = extractCurrencySymbol(monthlyPrice);
    const yearly = num * 12;
    const yearlyLive = livePrices[SUB_YEARLY_SKU];
    if (yearlyLive) {
      const yearlyNum = parsePriceAmount(yearlyLive);
      if (Number.isFinite(yearlyNum) && yearlyNum > 0) {
        const saving = Math.round((1 - yearlyNum / yearly) * 100);
        if (saving > 0) return `Save ${saving}% with yearly`;
      }
    }
    return `Yearly billed as ${currency}${yearly.toFixed(2)}`;
  }, [livePrices]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const manufacturerData = pricingData.manufacturerPartnerships;

  return (
    <section className="pricing-section" aria-labelledby="pricing-title">
      <SectionWorkflowStrip
        sectionLabel="Pricing"
        steps={PRICING_WORKFLOW_STEPS}
      />

      <div className="pricing-hero">
        <h1 id="pricing-title">Simple, Accessible Pricing</h1>
        <p className="pricing-subtitle">
          CircuiTry3D is free for students and makers. Educators get free tools too, with premium options for those who want more.
        </p>

        <div className="audience-tabs" role="tablist" aria-label="Filter by audience">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`audience-tab${audienceFilter === tab.id ? " active" : ""}`}
              onClick={() => setAudienceFilter(tab.id)}
              aria-selected={audienceFilter === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="billing-toggle" role="group" aria-label="Billing cycle selector">
          {cycles.map((cycleId) => {
            const meta = pricingData.billingCycles.find((cycle) => normalizeCycle(cycle.id) === cycleId);
            const isActive = activeCycle === cycleId;
            return (
              <article
                key={tier.id}
                className={`plan-card plan-card--consumer plan-${tier.id}${active ? " plan-card--active" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                <header className="plan-header">
                  {tier.badge && <span className="plan-badge">{tier.badge}</span>}
                  <div className="plan-icon" aria-hidden="true">{tier.icon}</div>
                  <h3 className="plan-name">{tier.name}</h3>
                </header>

                <div className="plan-price">
                  <span className="plan-price-amount">
                    {tier.id === "pro"
                      ? resolveTierPrice(tier, proCycle)
                      : resolveTierPrice(tier)}
                  </span>
                  {tier.id === "pro" && (
                    <span className="plan-price-cycle">
                      {proCycle === "monthly" ? "/ month" : "/ year"}
                    </span>
                  )}
                  {tier.purchaseType === "one_time" && (
                    <span className="plan-price-cycle">one-time</span>
                  )}
                </div>

                <ul className="plan-features">
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <div className="plan-cta-wrapper">{renderConsumerCTA(tier)}</div>
              </article>
            );
          })}
        </div>

        {/* Restore Purchases */}
        <div className="pricing-restore-row">
          <button
            type="button"
            className="pricing-restore-btn"
            onClick={handleRestorePurchases}
            disabled={restoreStatus === "restoring"}
          >
            {restoreStatus === "restoring"
              ? "Restoring…"
              : restoreStatus === "done"
              ? "✓ Purchases Restored"
              : "Restore Purchases"}
          </button>
        </div>
      </div>

      <div className="plan-grid" data-plan-count={filteredPlans.length}>
        {filteredPlans.map((plan) => {
          const amount = plan.price?.[activeCycle];
          const priceLabel = formatPrice(amount, pricingData.currency);
          const unit = getDisplayUnit(plan);
          const isFree = amount === 0;
          return (
            <article
              key={plan.id}
              className={`plan-card plan-${plan.id}${plan.popular ? " plan-popular" : ""}${isFree ? " plan-free" : ""}`}
            >
              {plan.popular && <span className="plan-badge">Most Popular</span>}
              {isFree && !plan.popular && <span className="plan-badge plan-badge-free">Free Forever</span>}
              <header className="plan-header">
                {plan.popular && <span className="plan-popular-badge">Most Popular</span>}
                <h2>{plan.name}</h2>
                {plan.tagline && <p className="plan-tagline">{plan.tagline}</p>}
              </header>
              <div className="plan-price">
                <span className="plan-price-amount">{priceLabel}</span>
                {unit && <span className="plan-price-unit">{unit}</span>}
                {amount && amount > 0 && (
                  <span className="plan-price-cycle">per {activeCycle === "annual" ? "year" : "month"}</span>
                )}
                {plan.renewal && <p className="plan-renewal">{plan.renewal}</p>}
              </div>
            ))}
          </div>
          {/* Data rows */}
          {COMPARISON_ROWS.map((row) => (
            <div key={row.id} className="pricing-comparison-row" role="row">
              <div className="pricing-comparison-cell pricing-comparison-cell--label" role="rowheader">
                {row.label}
              </div>
              {(["free", "premium", "pro"] as const).map((tierId) => {
                const value = row[tierId];
                const isCheck = value === "✓";
                const isCross = value === "✗";
                return (
                  <div
                    key={tierId}
                    className={`pricing-comparison-cell${isCheck ? " pricing-comparison-cell--yes" : ""}${isCross ? " pricing-comparison-cell--no" : ""}`}
                    role="cell"
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {pricingData.addons && pricingData.addons.length > 0 && (
        <div className="addon-section">
          <h3>Add-Ons & Bundles</h3>
          <div className="addon-grid">
            {pricingData.addons.map((addon) => {
              const amount = addon.price?.[activeCycle];
              const priceLabel = formatPrice(amount, pricingData.currency);
              const unit = getDisplayUnit(addon);
              return (
                <article key={addon.id} className="addon-card">
                  <header className="addon-header">
                    <h4>{addon.name}</h4>
                    {addon.tagline && <p className="addon-tagline">{addon.tagline}</p>}
                    {addon.availability && <span className="addon-availability">{addon.availability}</span>}
                  </header>
                  <div className="addon-price">
                    <span className="addon-price-amount">{priceLabel}</span>
                    {unit && <span className="addon-price-unit">{unit}</span>}
                    {amount && amount > 0 && (
                      <span className="addon-price-cycle">per {activeCycle}</span>
                    )}
                  </div>
                  <ul className="addon-features">
                    {addon.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="addon-cta-wrapper">{renderCTA(addon.cta)}</div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {manufacturerData && (
        <div className="manufacturer-section" id="partnerships">
          <div className="manufacturer-hero">
            <span className="manufacturer-kicker">For Manufacturers</span>
            <h2>{manufacturerData.title}</h2>
            <p className="manufacturer-subtitle">{manufacturerData.subtitle}</p>
            <p className="manufacturer-description">{manufacturerData.description}</p>
          </div>

          <div className="manufacturer-grid">
            {manufacturerData.tiers.map((tier) => (
              <article
                key={tier.id}
                className={`manufacturer-card${tier.popular ? " manufacturer-popular" : ""}`}
              >
                {tier.popular && <span className="plan-badge">Recommended</span>}
                <header className="manufacturer-header">
                  <h3>{tier.name}</h3>
                  {tier.tagline && <p className="manufacturer-tagline">{tier.tagline}</p>}
                </header>
                <div className="manufacturer-price">
                  <span className="manufacturer-price-range manufacturer-contact-sales">
                    Contact Sales
                  </span>
                </div>
                <ul className="manufacturer-features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="manufacturer-factors">
            <h3>What Affects Partnership Pricing?</h3>
            <div className="manufacturer-factors-grid">
              {manufacturerData.factors.map((factor) => (
                <div key={factor.title} className="manufacturer-factor">
                  <h4>{factor.title}</h4>
                  <p>{factor.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="manufacturer-cta-wrapper">
            <a
              className="manufacturer-cta"
              href={manufacturerData.cta.href}
            >
              {manufacturerData.cta.label}
            </a>
            <p className="manufacturer-cta-note">
              We'll discuss your goals and create a custom partnership package.
            </p>
          </div>
        </div>
      )}

      <footer className="pricing-footer">
        {pricingData.stripe && pricingData.stripe.status !== "active" && (
          <p className="pricing-stripe-note">
            {pricingData.stripe.note ?? "Online payments launching soon."}
          </p>
        )}
        <p className="pricing-contact-help">
          Questions? <a href="mailto:info@circuitry3d.net">Reach out to our team</a> for help finding the right plan.
        </p>
      </footer>
    </section>
  );
}
