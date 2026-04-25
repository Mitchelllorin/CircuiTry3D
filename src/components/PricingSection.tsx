import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BrandSignature from "./BrandSignature";
import {
  initBilling,
  isAndroidApp,
  openWebPayment,
  WEB_PAYMENT_URL,
  PLAY_STORE_URL,
  purchasePremiumUnlock,
  purchaseProSubscription,
  restorePurchases,
  restorePremiumPurchases,
  restoreProPurchases,
  getConsumerProductPrices,
  PREMIUM_UNLOCK_SKU,
  SUB_MONTHLY_SKU,
  SUB_YEARLY_SKU,
} from "../utils/playStoreBilling";
import { useEntitlements } from "../utils/entitlementManager";
import {
  CONSUMER_TIERS,
  ENTERPRISE_TIERS,
  COMPARISON_ROWS,
  type ConsumerTier,
  type EnterpriseTier,
} from "../data/hybridPricing";
import "../styles/pricing.css";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Billing cycle selector for the Pro subscription tier. */
type ProCycle = "monthly" | "yearly";

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

  // ── Initialise billing & fetch live prices ──────────────────────────────────

  useEffect(() => {
    if (!onAndroid) return;

    void (async () => {
      await initBilling();
      const prices = await getConsumerProductPrices();
      setLivePrices(prices);
    })();
  }, [onAndroid]);

  // ── Price resolution helpers ───────────────────────────────────────────────

  /**
   * Return the display price for a consumer tier.
   * Prefers the live BillingClient price when available.
   */
  const resolveTierPrice = useCallback(
    (tier: ConsumerTier, cycle?: ProCycle): string => {
      if (tier.id === "free") return "Free";

      if (tier.id === "premium" && tier.sku) {
        return livePrices[tier.sku] ?? tier.staticPriceFallback;
      }

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

  /** Handle a tap on the Premium Unlock buy button. */
  const handlePurchasePremium = useCallback(async () => {
    // On web with a payment URL configured, open the checkout page.
    if (!isAndroidApp() && WEB_PAYMENT_URL) {
      openWebPayment();
      return;
    }
    // On web without a payment URL, redirect to the Play Store listing.
    if (!isAndroidApp()) {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    const launched = await purchasePremiumUnlock();
    if (!launched) {
      // Billing unavailable on this device — nothing more we can do here;
      // the billing plugin's purchaseFailed event handles UI feedback on Android.
      console.warn("[Pricing] purchasePremiumUnlock: billing unavailable");
    }
  }, []);

  /** Handle a tap on the Pro Subscription buy button. */
  const handlePurchasePro = useCallback(async () => {
    // On web with a payment URL configured, open the checkout page.
    if (!isAndroidApp() && WEB_PAYMENT_URL) {
      openWebPayment();
      return;
    }
    // On web without a payment URL, redirect to the Play Store listing.
    if (!isAndroidApp()) {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    const launched = await purchaseProSubscription(proCycle);
    if (!launched) {
      console.warn("[Pricing] purchaseProSubscription: billing unavailable");
    }
  }, [proCycle]);

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

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Determine whether a consumer tier is currently active for the user. */
  const isTierActive = useCallback(
    (tierId: "free" | "premium" | "pro"): boolean => {
      if (tierId === "free") return entitlements.tier === "free";
      if (tierId === "premium") return entitlements.hasPremium && !entitlements.hasPro;
      if (tierId === "pro") return entitlements.hasPro;
      return false;
    },
    [entitlements]
  );

  /** Render the CTA button for a consumer tier. */
  const renderConsumerCTA = useCallback(
    (tier: ConsumerTier) => {
      if (tier.id === "free") {
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
            data-cta-type="play-store"
            onClick={handlePurchasePremium}
          >
            Unlock — {resolveTierPrice(tier)}
          </button>
        );
      }

      if (tier.id === "pro") {
        return (
          <button
            type="button"
            className="pricing-cta"
            data-cta-type="play-store"
            onClick={handlePurchasePro}
          >
            Subscribe — {resolveTierPrice(tier, proCycle)}
          </button>
        );
      }

      return null;
    },
    [isTierActive, handlePurchasePremium, handlePurchasePro, resolveTierPrice, proCycle]
  );

  /** Render the CTA for an enterprise tier. */
  const renderEnterpriseCTA = useCallback((tier: EnterpriseTier) => {
    return (
      <Link
        className="pricing-cta pricing-cta--enterprise"
        to={`/contact-sales?tier=${tier.id}`}
        data-cta-type="internal"
      >
        Contact Sales
      </Link>
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

  return (
    <section className="pricing-section" aria-labelledby="pricing-title">

      {/* ── Hero ── */}
      <div className="pricing-hero">
        <BrandSignature size="sm" decorative className="pricing-brand" />
        <h1 id="pricing-title">Plans &amp; Pricing</h1>
        <p className="pricing-subtitle">
          Choose the plan that powers your circuits. Upgrade any time.
        </p>
      </div>

      {/* ── Consumer tiers ── */}
      <div className="pricing-section-group">
        <div className="pricing-section-label">
          <span className="pricing-section-kicker">App Purchase</span>
          <h2 className="pricing-section-title">Consumer Plans</h2>
          <p className="pricing-section-desc">
            One-time purchase or subscription — fully managed through Google Play.
          </p>
        </div>

        {/* Pro cycle toggle — only visible above the Pro card */}
        <div className="pricing-pro-cycle-toggle" role="group" aria-label="Pro billing cycle">
          {(["monthly", "yearly"] as ProCycle[]).map((cycle) => (
            <button
              key={cycle}
              type="button"
              className={`billing-toggle-btn${proCycle === cycle ? " active" : ""}`}
              onClick={() => setProCycle(cycle)}
              aria-pressed={proCycle === cycle}
            >
              <span className="billing-toggle-label">
                {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
              </span>
              {cycle === "yearly" && yearlyPriceNote && (
                <span className="billing-toggle-note">{yearlyPriceNote}</span>
              )}
            </button>
          ))}
        </div>

        <div className="plan-grid plan-grid--consumer">
          {CONSUMER_TIERS.map((tier) => {
            const active = isTierActive(tier.id);
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

      {/* ── Feature comparison table ── */}
      <div className="pricing-comparison">
        <h2 className="pricing-comparison-title">Feature Comparison</h2>
        <div className="pricing-comparison-table" role="table" aria-label="Feature comparison">
          {/* Header row */}
          <div className="pricing-comparison-row pricing-comparison-row--header" role="row">
            <div className="pricing-comparison-cell pricing-comparison-cell--label" role="columnheader">Feature</div>
            {CONSUMER_TIERS.map((t) => (
              <div key={t.id} className="pricing-comparison-cell pricing-comparison-cell--tier" role="columnheader">
                <span className="pricing-comparison-tier-icon" aria-hidden="true">{t.icon}</span>
                {t.name}
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

      {/* ── Enterprise tiers ── */}
      <div className="pricing-section-group pricing-section-group--enterprise">
        <div className="pricing-section-label">
          <span className="pricing-section-kicker pricing-section-kicker--enterprise">Enterprise</span>
          <h2 className="pricing-section-title">Arena Plans</h2>
          <p className="pricing-section-desc">
            Designed for manufacturers, educators, and enterprise teams. No in-app
            purchase — contact our sales team to get started.
          </p>
        </div>

        <div className="plan-grid plan-grid--enterprise">
          {ENTERPRISE_TIERS.map((tier) => (
            <article key={tier.id} className={`plan-card plan-card--enterprise plan-${tier.id}`}>
              <header className="plan-header">
                <span className="plan-badge plan-badge--enterprise">{tier.badge}</span>
                <div className="plan-icon" aria-hidden="true">{tier.icon}</div>
                <h3 className="plan-name">{tier.name}</h3>
              </header>

              <div className="plan-price">
                <span className="plan-price-amount plan-price-amount--enterprise">Contact Sales</span>
              </div>

              <ul className="plan-features">
                {tier.description.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <div className="plan-cta-wrapper">{renderEnterpriseCTA(tier)}</div>
            </article>
          ))}
        </div>
      </div>

      {/* ── Manufacturer placement callout ── */}
      <div className="pricing-section-group pricing-section-group--placement">
        <div className="pricing-section-label">
          <span className="pricing-section-kicker pricing-section-kicker--placement">Component Arena</span>
          <h2 className="pricing-section-title">Manufacturer Placement</h2>
          <p className="pricing-section-desc">
            Get your real components in front of students and educators running live FUSE™ stress
            tests. Packages start at <strong>$149 / mo</strong> — from a basic catalog listing
            to a sponsored top-of-panel spotlight.
          </p>
        </div>
        <div className="pricing-placement-callout">
          <span className="pricing-placement-callout-icon" aria-hidden="true">🏭</span>
          <div className="pricing-placement-callout-body">
            <p className="pricing-placement-callout-text">
              Standard Listing · Featured Placement · Sponsored Spotlight
            </p>
            <Link to="/partnerships#placement" className="pricing-cta pricing-cta--placement">
              View Placement Packages →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="pricing-footer">
        <p className="pricing-contact-help">
          Need a custom package? <a href="mailto:info@circuitry3d.net">Contact our team</a> for tailored pricing.
          Have questions?{" "}
          <a href="mailto:info@circuitry3d.net">Contact our team</a> for
          tailored pricing or enterprise onboarding.
        </p>
      </footer>
    </section>
  );
}
