import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import pricingSource from "../data/pricing.json";
import BrandMark from "./BrandMark";
import WordMark from "./WordMark";
import "../styles/pricing.css";

type BillingCycleId = "monthly" | "annual";

type BillingCycle = {
  id: BillingCycleId;
  label: string;
  note?: string;
};

type PriceMap = Partial<Record<BillingCycleId, number | null>>;

type CallToAction =
  | {
      label: string;
      type: "link";
      href: string;
    }
  | {
      label: string;
      type: "stripeCheckout";
      sku: string;
    };

type Plan = {
  id: string;
  name: string;
  tagline?: string;
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

type AddOn = {
  id: string;
  name: string;
  tagline?: string;
  price: PriceMap;
  unit?: string;
  availability?: string;
  features: string[];
  cta: CallToAction;
};

type PricingData = {
  currency: string;
  billingCycles: BillingCycle[];
  plans: Plan[];
  addons?: AddOn[];
  stripe?: {
    status: string;
    note?: string;
  };
};

const pricingData = pricingSource as PricingData;

const DEFAULT_CYCLE: BillingCycleId = "annual";

function normalizeCycle(requested: string | undefined): BillingCycleId {
  if (requested === "monthly" || requested === "annual") {
    return requested;
  }
  return DEFAULT_CYCLE;
}

function formatPrice(amount: number | null | undefined, currency: string): string {
  if (amount == null) {
    return "Contact";
  }

  if (amount === 0) {
    return "Free";
  }

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  });

  return formatter.format(amount / 100);
}

function getDisplayUnit(plan: Plan | AddOn): string | undefined {
  if (plan.unit) {
    return plan.unit;
  }
  return undefined;
}

function resolveCycleNote(cycle: BillingCycle | undefined): string | undefined {
  return cycle?.note;
}

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>(() => {
    const preferred = normalizeCycle(pricingData.billingCycles?.[0]?.id);
    return preferred ?? DEFAULT_CYCLE;
  });

  const cycles = useMemo(() => pricingData.billingCycles.map((cycle) => normalizeCycle(cycle.id)), []);

  const activeCycle = billingCycle;
  const activeCycleMeta = pricingData.billingCycles.find((cycle) => normalizeCycle(cycle.id) === activeCycle);

  const handleCycleChange = (cycle: BillingCycleId) => {
    setBillingCycle(cycle);
  };

  const handleStripeClick = (sku: string) => {
    // Placeholder for future Stripe integration
    console.info("Stripe checkout pending integration", { sku });
    window.alert?.("Stripe checkout coming soon. Contact us to activate your subscription.");
  };

  const renderCTA = (cta: CallToAction) => {
    if (cta.type === "link") {
      const isInternal = cta.href.startsWith("/");
      if (isInternal) {
        return (
          <Link className="pricing-cta" to={cta.href} data-cta-type="internal">
            {cta.label}
          </Link>
        );
      }

      return (
        <a
          className="pricing-cta"
          href={cta.href}
          data-cta-type="external"
          target={cta.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noreferrer noopener"
        >
          {cta.label}
        </a>
      );
    }

    return (
      <button
        type="button"
        className="pricing-cta"
        data-cta-type="stripe"
        onClick={() => handleStripeClick(cta.sku)}
      >
        {cta.label}
      </button>
    );
  };

  return (
    <section className="pricing-section" aria-labelledby="pricing-title">
      <div className="pricing-hero">
        <div className="pricing-brand" aria-hidden="true">
          <BrandMark size="sm" decorative />
          <WordMark size="sm" decorative />
        </div>
        <h1 id="pricing-title">Plans &amp; Pricing</h1>
        <p className="pricing-subtitle">
          Choose the subscription that powers your classroom. Upgrade any time as your program grows.
        </p>
        <div className="billing-toggle" role="group" aria-label="Billing cycle selector">
          {cycles.map((cycleId) => {
            const meta = pricingData.billingCycles.find((cycle) => normalizeCycle(cycle.id) === cycleId);
            const isActive = activeCycle === cycleId;
            return (
              <button
                key={cycleId}
                type="button"
                className={`billing-toggle-btn${isActive ? " active" : ""}`}
                onClick={() => handleCycleChange(cycleId)}
                aria-pressed={isActive}
              >
                <span className="billing-toggle-label">{meta?.label ?? cycleId}</span>
                {meta?.note && <span className="billing-toggle-note">{meta.note}</span>}
              </button>
            );
          })}
        </div>
        {resolveCycleNote(activeCycleMeta) && (
          <p className="pricing-cycle-note">{resolveCycleNote(activeCycleMeta)}</p>
        )}
      </div>

      <div className="plan-grid">
        {pricingData.plans.map((plan) => {
          const amount = plan.price?.[activeCycle];
          const priceLabel = formatPrice(amount, pricingData.currency);
          const unit = getDisplayUnit(plan);
          return (
            <article key={plan.id} className={`plan-card plan-${plan.id}`}>
              <header className="plan-header">
                <h2>{plan.name}</h2>
                {plan.tagline && <p className="plan-tagline">{plan.tagline}</p>}
              </header>
              <div className="plan-price">
                <span className="plan-price-amount">{priceLabel}</span>
                {unit && <span className="plan-price-unit">{unit}</span>}
                {amount && amount > 0 && (
                  <span className="plan-price-cycle">per {activeCycle}</span>
                )}
                {plan.renewal && <p className="plan-renewal">{plan.renewal}</p>}
              </div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.bulk && (
                <div className="plan-bulk">
                  {plan.bulk.minimumSeats && <p>Minimum {plan.bulk.minimumSeats} seats</p>}
                  {plan.bulk.notes && <p>{plan.bulk.notes}</p>}
                </div>
              )}
              <div className="plan-cta-wrapper">{renderCTA(plan.cta)}</div>
            </article>
          );
        })}
      </div>

      {pricingData.addons && pricingData.addons.length > 0 && (
        <div className="addon-section">
          <h3>Certification Bundle (Coming Soon)</h3>
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
      )}

      <footer className="pricing-footer">
        {pricingData.stripe && (
          <p className="pricing-stripe-note" data-stripe-status={pricingData.stripe.status}>
            Stripe integration status: {pricingData.stripe.status}. {pricingData.stripe.note ?? ""}
          </p>
        )}
        <p className="pricing-contact-help">
          Need a custom package? <a href="mailto:hello@circuitry3d.com">Contact our team</a> for tailored pricing.
        </p>
      </footer>
    </section>
  );
}
