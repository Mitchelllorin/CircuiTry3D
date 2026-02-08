import { useState } from "react";
import pricingSource from "../data/pricing.json";
import BrandSignature from "./BrandSignature";
import "../styles/pricing.css";

type BillingCycleId = "monthly" | "annual";

type CallToAction = {
  label: string;
  type: "link";
  href: string;
};

type ManufacturerTier = {
  id: string;
  name: string;
  tagline?: string;
  popular?: boolean;
  price: Partial<Record<BillingCycleId, number | null>>;
  unit?: string;
  features: string[];
  renewal?: string;
  cta: CallToAction;
};

type PricingData = {
  currency: string;
  manufacturerTiers?: ManufacturerTier[];
};

const pricingData = pricingSource as PricingData;

function formatPrice(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "Contact";
  if (amount === 0) return "Free";

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  });

  return formatter.format(amount / 100);
}

export default function ManufacturerSection() {
  const tiers = pricingData.manufacturerTiers;
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>("annual");

  if (!tiers || tiers.length === 0) return null;

  return (
    <section className="manufacturer-section" aria-labelledby="manufacturer-title">
      <div className="manufacturer-hero">
        <BrandSignature size="sm" decorative className="manufacturer-brand" />
        <span className="manufacturer-kicker">Manufacturer Program</span>
        <h2 id="manufacturer-title">Put your components in students' hands</h2>
        <p className="manufacturer-subtitle">
          Partner with CircuiTry3D to feature your real-world electronic components inside the learning arena.
          Students build circuits with your parts, learn your datasheets, and discover your brand — while you
          gain visibility with the next generation of engineers and makers.
        </p>
        <div className="billing-toggle" role="group" aria-label="Billing cycle selector">
          <button
            type="button"
            className={`billing-toggle-btn${billingCycle === "monthly" ? " active" : ""}`}
            onClick={() => setBillingCycle("monthly")}
            aria-pressed={billingCycle === "monthly"}
          >
            <span className="billing-toggle-label">Monthly</span>
            <span className="billing-toggle-note">Flexible</span>
          </button>
          <button
            type="button"
            className={`billing-toggle-btn${billingCycle === "annual" ? " active" : ""}`}
            onClick={() => setBillingCycle("annual")}
            aria-pressed={billingCycle === "annual"}
          >
            <span className="billing-toggle-label">Annual</span>
            <span className="billing-toggle-note">Save 15%</span>
          </button>
        </div>
      </div>

      <div className="manufacturer-grid">
        {tiers.map((tier) => {
          const amount = tier.price?.[billingCycle];
          const priceLabel = formatPrice(amount, pricingData.currency);
          return (
            <article
              key={tier.id}
              className={`manufacturer-card${tier.popular ? " manufacturer-popular" : ""}`}
            >
              <header className="manufacturer-card-header">
                {tier.popular && <span className="manufacturer-popular-badge">Recommended</span>}
                <h3>{tier.name}</h3>
                {tier.tagline && <p className="manufacturer-tagline">{tier.tagline}</p>}
              </header>
              <div className="manufacturer-price">
                <span className="manufacturer-price-amount">{priceLabel}</span>
                {tier.unit && <span className="manufacturer-price-unit">{tier.unit}</span>}
                {amount && amount > 0 && (
                  <span className="manufacturer-price-cycle">per {billingCycle === "annual" ? "year" : "month"}</span>
                )}
                {tier.renewal && <p className="manufacturer-renewal">{tier.renewal}</p>}
              </div>
              <ul className="manufacturer-features">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="manufacturer-cta-wrapper">
                <a
                  className="pricing-cta"
                  href={tier.cta.href}
                  data-cta-type="external"
                  target={tier.cta.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer noopener"
                >
                  {tier.cta.label}
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="manufacturer-benefits">
        <h3>Why partner with CircuiTry3D?</h3>
        <div className="manufacturer-benefits-grid">
          <div className="manufacturer-benefit">
            <span className="manufacturer-benefit-icon">&#x1f393;</span>
            <h4>Reach future engineers</h4>
            <p>
              Your components appear in circuits built by thousands of STEM students, trades learners, and self-taught makers.
            </p>
          </div>
          <div className="manufacturer-benefit">
            <span className="manufacturer-benefit-icon">&#x1f3ae;</span>
            <h4>Arena product placement</h4>
            <p>
              Real part numbers, datasheets, and branded cards inside the Component Arena — where students explore and compare parts.
            </p>
          </div>
          <div className="manufacturer-benefit">
            <span className="manufacturer-benefit-icon">&#x1f4ca;</span>
            <h4>Measurable engagement</h4>
            <p>
              Get analytics on how often your components are placed, viewed, and used in circuits across the platform.
            </p>
          </div>
        </div>
      </div>

      <footer className="manufacturer-footer">
        <p>
          Interested in a custom partnership?{" "}
          <a href="mailto:partnerships@circuitry3d.net?subject=Custom%20Partnership%20Inquiry">
            Reach out to our partnerships team
          </a>{" "}
          to discuss your goals.
        </p>
      </footer>
    </section>
  );
}
