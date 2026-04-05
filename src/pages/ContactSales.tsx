import { useSearchParams, Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import { ENTERPRISE_TIERS } from "../data/hybridPricing";

/**
 * ContactSales — placeholder "Contact Sales" screen shown when a user taps
 * the "Contact Sales" button on an enterprise tier card.
 *
 * The page accepts a `tier` query-string parameter that identifies which
 * enterprise tier the user is interested in so the mailto: subject line can
 * be pre-filled accordingly.
 *
 * Route: /contact-sales?tier=education-arena   (or component-arena / manufacturing-arena)
 */
export default function ContactSales() {
  const [searchParams] = useSearchParams();
  const tierId = searchParams.get("tier") ?? "";

  // Resolve the matching enterprise tier, or fall back to a generic message.
  const tier = ENTERPRISE_TIERS.find((t) => t.id === tierId) ?? null;

  const heroTitle = tier ? `${tier.icon} ${tier.name}` : "Enterprise & Arenas";
  const heroSubtitle = tier
    ? `Interested in ${tier.name}? Our team will help you get started.`
    : "Get in touch with our team to discuss enterprise and arena options.";

  const mailtoHref = tier
    ? tier.contactMailto
    : "mailto:hello@circuitry3d.net?subject=Enterprise%20Inquiry";

  return (
    <main style={pageStyle}>
      {/* Back navigation */}
      <Link to="/pricing" style={backLinkStyle} aria-label="Back to Pricing">
        ← Pricing
      </Link>

      {/* Hero */}
      <div style={heroStyle}>
        <BrandSignature size="sm" decorative />
        <h1 style={titleStyle}>{heroTitle}</h1>
        <p style={subtitleStyle}>{heroSubtitle}</p>
      </div>

      {/* Tier detail card */}
      {tier && (
        <div style={cardStyle}>
          <span style={badgeStyle}>{tier.badge}</span>
          <h2 style={cardTitleStyle}>{tier.name}</h2>
          <ul style={featureListStyle}>
            {tier.description.map((item) => (
              <li key={item} style={featureItemStyle}>
                <span style={bulletStyle}>●</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact section */}
      <div style={contactSectionStyle}>
        <p style={contactLabelStyle}>
          Ready to learn more? Send us a message and we'll get back to you
          within one business day.
        </p>
        <a href={mailtoHref} style={primaryButtonStyle}>
          📧 Contact Sales
        </a>
        <Link to="/pricing" style={secondaryButtonStyle}>
          View all plans
        </Link>
      </div>

      {/* All enterprise options */}
      <div style={allTiersSectionStyle}>
        <p style={allTiersLabelStyle}>Other Enterprise Options</p>
        <div style={allTiersGridStyle}>
          {ENTERPRISE_TIERS.filter((t) => t.id !== tierId).map((t) => (
            <Link
              key={t.id}
              to={`/contact-sales?tier=${t.id}`}
              style={tierChipStyle}
            >
              {t.icon} {t.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg-darker, #0f172a)",
  color: "var(--text-primary, #e2e8f0)",
  padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 5vw, 2rem)",
  maxWidth: "42rem",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
  fontFamily: "inherit",
};

const backLinkStyle: React.CSSProperties = {
  color: "var(--brand-primary, #3b82f6)",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: 500,
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "1rem",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted, rgba(226,232,240,0.65))",
  lineHeight: 1.7,
  fontSize: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-overlay, rgba(255,255,255,0.05))",
  border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
  borderRadius: "1.25rem",
  padding: "1.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "0.25rem 0.8rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  background: "linear-gradient(135deg, var(--brand-accent, #38bdf8), var(--brand-secondary, #818cf8))",
  color: "var(--bg-dark, #0f172a)",
  alignSelf: "flex-start",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 700,
};

const featureListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "0.65rem",
};

const featureItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.65rem",
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const bulletStyle: React.CSSProperties = {
  color: "var(--brand-accent, #38bdf8)",
  fontSize: "0.5rem",
  marginTop: "0.45rem",
  flexShrink: 0,
};

const contactSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  alignItems: "stretch",
};

const contactLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted, rgba(226,232,240,0.65))",
  fontSize: "0.95rem",
  lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.9rem 1.5rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, var(--brand-accent, #38bdf8), var(--brand-secondary, #818cf8))",
  color: "var(--bg-dark, #0f172a)",
  fontWeight: 700,
  fontSize: "1rem",
  textDecoration: "none",
  letterSpacing: "0.02em",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.75rem 1.5rem",
  borderRadius: "999px",
  border: "1px solid var(--border-subtle, rgba(255,255,255,0.15))",
  background: "transparent",
  color: "var(--text-primary, #e2e8f0)",
  fontWeight: 600,
  fontSize: "0.95rem",
  textDecoration: "none",
};

const allTiersSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const allTiersLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-muted, rgba(226,232,240,0.5))",
};

const allTiersGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.65rem",
};

const tierChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.45rem 0.9rem",
  borderRadius: "999px",
  border: "1px solid var(--border-subtle, rgba(255,255,255,0.15))",
  background: "var(--bg-overlay, rgba(255,255,255,0.05))",
  color: "var(--text-primary, #e2e8f0)",
  textDecoration: "none",
  fontSize: "0.9rem",
};
