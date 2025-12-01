import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import pricingSource from "../data/pricing.json";
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

function resolveCycleNote(cycle: BillingCycle | undefined): string | undefined {
  return cycle?.note;
}

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

  const manufacturerData = pricingData.manufacturerPartnerships;

  return (
    <section className="pricing-section" aria-labelledby="pricing-title">
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
      )}

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
