import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import "../styles/legal.css";

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
        <BrandSignature size="sm" decorative />
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
            repository under <code>play-store-assets/metadata/</code> and{" "}
            <code>public/store-docs/</code>.
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
