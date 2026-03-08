import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/legal.css";

const SITE_ORIGIN = "https://circuitry3d.app";

type ConsoleUrl = { label: string; field: string; url: string };

const CONSOLE_URLS: ConsoleUrl[] = [
  { label: "Privacy Policy", field: "Store listing → Privacy policy", url: `${SITE_ORIGIN}/privacy` },
  { label: "Data Safety", field: "Data safety → Privacy policy link", url: `${SITE_ORIGIN}/data-safety` },
  { label: "Delete Account", field: "Data safety → Account deletion URL", url: `${SITE_ORIGIN}/delete-account` },
  { label: "App Access", field: "App content → App access", url: `${SITE_ORIGIN}/app-access` },
];

// Screenshot PNG files are kept in play-store-assets/screenshots/ in the
// repository.  They are NOT bundled into the app to keep the install size
// small.  Developers can generate fresh ones via the Screenshot Generator.

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <button
      type="button"
      className={`console-url-copy${copied ? " console-url-copy--copied" : ""}`}
      onClick={handleCopy}
      aria-label={`Copy ${text}`}
    >
      {copied ? "✔ Copied" : "Copy"}
    </button>
  );
}

type Requirement = {
  id: string;
  icon: string;
  title: string;
  declaration: string;
  detail: string[];
  detailPagePath?: string;
  detailPageLabel?: string;
  downloadFile: string;
  downloadLabel: string;
  status: "complete" | "not-applicable";
};

const REQUIREMENTS: Requirement[] = [
  {
    id: "app-access",
    icon: "🔓",
    title: "App Access",
    declaration: "All core features available without login",
    detail: [
      "Circuit builder, simulator, and Arcade require no account.",
      "Free account unlocks saved circuits and community features.",
      "Classroom tools require an Educator subscription.",
      "Sample test credentials are documented for reviewers.",
    ],
    detailPagePath: "/app-access",
    detailPageLabel: "View App Access page",
    downloadFile: "/store-docs/app-access.md",
    downloadLabel: "App Access Declaration",
    status: "complete",
  },
  {
    id: "ads",
    icon: "🚫",
    title: "Ads",
    declaration: "This app contains NO advertisements",
    detail: [
      "No ad network SDK is included.",
      "No banner, interstitial, rewarded video, or native ads.",
      "No ad tracking or advertising identifiers used.",
      "Revenue comes exclusively from Google Play subscriptions.",
    ],
    downloadFile: "/store-docs/ads-declaration.md",
    downloadLabel: "Ads Declaration",
    status: "not-applicable",
  },
  {
    id: "content-rating",
    icon: "⭐",
    title: "Content Rating",
    declaration: "Everyone (ESRB) · PEGI 3 · No restricted content",
    detail: [
      "Category: Utility, Productivity, Communication, or Other.",
      "No violence, sexual content, profanity, or gambling.",
      "User interaction (community chat) present — moderated.",
      "User-generated content (circuit designs) — no inappropriate material possible.",
    ],
    downloadFile: "/store-docs/content-rating.md",
    downloadLabel: "Content Rating Answers",
    status: "complete",
  },
  {
    id: "target-audience",
    icon: "🎯",
    title: "Target Audience",
    declaration: "Ages 13 and older — STEM students, educators, hobbyists",
    detail: [
      "Primary audience: middle school, high school, and university students.",
      "Also suitable for teachers, CTE instructors, and adult makers.",
      "Not designed or marketed for children under 13.",
      "Not enrolled in Google Play Families programme.",
    ],
    downloadFile: "/store-docs/target-audience.md",
    downloadLabel: "Target Audience Declaration",
    status: "complete",
  },
  {
    id: "data-safety",
    icon: "🔒",
    title: "Data Safety",
    declaration: "Minimal data collected — encrypted, user-deletable",
    detail: [
      "Collects: email, purchase history, app usage, crash logs, auth tokens.",
      "Does NOT collect: location, contacts, photos, microphone, camera.",
      "All data encrypted in transit (TLS 1.2+) and at rest (AES-256).",
      "Users can request full data deletion within 30 days.",
    ],
    detailPagePath: "/data-safety",
    detailPageLabel: "View Data Safety page",
    downloadFile: "/store-docs/data-safety-form.md",
    downloadLabel: "Data Safety Form",
    status: "complete",
  },
  {
    id: "government-apps",
    icon: "🏛️",
    title: "Government Apps",
    declaration: "Not a government app — independent commercial product",
    detail: [
      "Created and operated by Mitchell Lorin McKnight, a private individual.",
      "No government affiliation, funding, mandate, or endorsement.",
      "Does not impersonate any government agency or official.",
      "Does not provide official government services or benefits.",
    ],
    downloadFile: "/store-docs/government-apps.md",
    downloadLabel: "Government Apps Declaration",
    status: "not-applicable",
  },
  {
    id: "financial-features",
    icon: "💳",
    title: "Financial Features",
    declaration: "No financial services — subscriptions via Google Play Billing only",
    detail: [
      "No banking, investment, loans, insurance, or crypto features.",
      "No money transfers between users.",
      "No real-money gambling or wagering.",
      "In-app subscriptions are standard digital service purchases through Google Play.",
    ],
    downloadFile: "/store-docs/financial-features.md",
    downloadLabel: "Financial Features Declaration",
    status: "not-applicable",
  },
  {
    id: "health",
    icon: "🩺",
    title: "Health",
    declaration: "Not a health or medical app — no health data collected",
    detail: [
      "No health, fitness, or medical functionality.",
      "No connection to health sensors, wearables, or medical devices.",
      "No health API access (Google Fit, HealthKit, etc.).",
      "No personal health information (PHI) collected or processed.",
    ],
    downloadFile: "/store-docs/health-declaration.md",
    downloadLabel: "Health Declaration",
    status: "not-applicable",
  },
];

export default function PlayStoreCompliance() {
  return (
    <div className="legal-page compliance-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <span className="legal-eyebrow">Google Play Store</span>
        <h1>Play Store Compliance</h1>
        <p className="legal-meta">
          All 8 required Play Console sections · Last updated October 25, 2025
        </p>
      </header>

      <div className="legal-body">
        <p>
          This page covers every section Google Play Console requires during app submission.
          Each requirement includes the declaration answer, supporting detail, and a downloadable
          document you can reference while filling out the Play Console form.
        </p>

        {/* ── App Icon Downloads ──────────────────────────────────────────── */}
        <div className="icon-download-panel">
          <h2 className="icon-download-heading">🖼️ App Icon Downloads</h2>
          <p className="icon-download-hint">
            Download the app icon in the sizes required by Google Play Console.
            Upload the <strong>512 × 512 PNG</strong> to{" "}
            <em>Store listing → App icon</em> in the Play Console.
          </p>
          <div className="icon-download-body">
            <div className="icon-download-preview">
              <img
                src="/icons/app-icon-512.png"
                alt="CircuiTry3D app icon"
                className="icon-download-img"
                width={120}
                height={120}
              />
              <span className="icon-download-preview-label">App Icon Preview</span>
            </div>
            <div className="icon-download-buttons">
              <a
                href="/icons/app-icon-512.png"
                download="circuitry3d-icon-512.png"
                className="icon-download-btn"
                aria-label="Download 512×512 PNG app icon for Play Store"
              >
                ⬇ 512 × 512 PNG
                <span className="icon-download-btn-note">Play Store high-res icon</span>
              </a>
              <a
                href="/app-icon.svg"
                download="circuitry3d-icon.svg"
                className="icon-download-btn"
                aria-label="Download SVG app icon"
              >
                ⬇ SVG (vector)
                <span className="icon-download-btn-note">Scalable, any size</span>
              </a>
            </div>
          </div>
          <p className="icon-download-sizes-note">
            <strong>Play Store icon requirement:</strong> 512 × 512 px · PNG · 32-bit (with alpha) ·
            max 1 MB. This single icon is used for both phone and tablet listings.
          </p>
        </div>

        {/* ── Screenshots ─────────────────────────────────────────────────── */}
        <div className="screenshot-download-panel">
          <h2 className="screenshot-download-heading">📸 Store Listing Screenshots</h2>
          <p className="screenshot-download-hint">
            Pre-generated PNGs for every device category live in{" "}
            <code>play-store-assets/screenshots/</code> in the repository.
            Screenshot files are <strong>not</strong> bundled into the app to keep the install
            size small — upload them to <em>Google Play Console → Store listing</em> directly
            from your local checkout.
          </p>

          {/* ── Screenshot Generator CTA ──────────────────────────────────── */}
          <div style={{
            margin: "16px 0 20px",
            padding: "18px 20px",
            background: "rgba(136,204,255,0.08)",
            border: "1px solid rgba(136,204,255,0.35)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--brand-primary)", fontSize: "0.95rem" }}>
                🖼️ Generate fresh screenshots
              </p>
              <p style={{ margin: 0, color: "rgba(200,220,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Canvas-rendered app screenshots at the exact Play Store dimensions for every
                device type — 10-in tablet, 7-in tablet, Android XR, and Chromebook.
                Each screenshot shows the real app UI with your circuit builder and current-flow visualiser.
              </p>
            </div>
            <Link
              to="/screenshots"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 24px",
                background: "var(--brand-primary)",
                color: "#04070c",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "0.9rem",
                textDecoration: "none",
                letterSpacing: ".05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              ⬇ OPEN SCREENSHOT GENERATOR
            </Link>
          </div>
        </div>

        {/* ── Play Console URL reference ──────────────────────────────────── */}
        <div className="console-url-panel">
          <h2 className="console-url-panel-heading">🔗 Play Console URLs</h2>
          <p className="console-url-panel-hint">Copy each URL and paste it into the matching field in Google Play Console.</p>
          <div className="console-url-list">
            {CONSOLE_URLS.map(({ label, field, url }) => (
              <div key={url} className="console-url-row">
                <div className="console-url-meta">
                  <span className="console-url-label">{label}</span>
                  <span className="console-url-field">{field}</span>
                </div>
                <code className="console-url-value">{url}</code>
                <CopyButton text={url} />
              </div>
            ))}
          </div>
        </div>

        <div className="compliance-grid">
          {REQUIREMENTS.map((req) => (
            <section
              key={req.id}
              id={req.id}
              className="compliance-card"
              aria-labelledby={`${req.id}-title`}
            >
              <div className="compliance-card-header">
                <span className="compliance-icon" aria-hidden="true">{req.icon}</span>
                <div className="compliance-card-title-group">
                  <h2 id={`${req.id}-title`} className="compliance-card-title">
                    {req.title}
                  </h2>
                  <span
                    className={
                      req.status === "complete"
                        ? "compliance-status compliance-status--complete"
                        : "compliance-status compliance-status--na"
                    }
                  >
                    {req.status === "complete" ? "✔ Complete" : "✔ N/A — Declared"}
                  </span>
                </div>
              </div>

              <p className="compliance-declaration">{req.declaration}</p>

              <ul className="compliance-detail">
                {req.detail.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="compliance-actions">
                <a
                  href={req.downloadFile}
                  download
                  className="compliance-btn compliance-btn--download"
                  aria-label={`Download ${req.downloadLabel}`}
                >
                  ⬇ {req.downloadLabel}
                </a>
                {req.detailPagePath && req.detailPageLabel && (
                  <Link
                    to={req.detailPagePath}
                    className="compliance-btn compliance-btn--view"
                  >
                    → {req.detailPageLabel}
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="legal-contact-card" style={{ marginTop: "3rem" }}>
          <h3>Need a copy of all documents?</h3>
          <p>
            Each card above has an individual download. All source documents also live in the
            repository under <code>play-store-assets/metadata/</code>.
          </p>
          <p>
            Questions or review requests:{" "}
            <a href="mailto:support@circuitry3d.app">support@circuitry3d.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
