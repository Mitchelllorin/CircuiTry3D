import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import "../styles/legal.css";

type DataRow = {
  type: string;
  collected: boolean;
  sharedWithThirdParties: boolean;
  purposes: string;
  canDelete: boolean;
};

const dataRows: DataRow[] = [
  {
    type: "Email address",
    collected: true,
    sharedWithThirdParties: false,
    purposes: "Account management, authentication, communication",
    canDelete: true,
  },
  {
    type: "Purchase history",
    collected: true,
    sharedWithThirdParties: true,
    purposes: "In-app purchases, subscription management (Google Play Billing only)",
    canDelete: true,
  },
  {
    type: "App interactions / usage",
    collected: true,
    sharedWithThirdParties: false,
    purposes: "Analytics, app functionality, product personalisation",
    canDelete: true,
  },
  {
    type: "Crash logs",
    collected: true,
    sharedWithThirdParties: false,
    purposes: "App diagnostics, bug fixes, performance improvement",
    canDelete: true,
  },
  {
    type: "Diagnostics",
    collected: true,
    sharedWithThirdParties: false,
    purposes: "Performance monitoring, feature optimisation",
    canDelete: true,
  },
  {
    type: "Authentication tokens",
    collected: true,
    sharedWithThirdParties: false,
    purposes: "User authentication, session management, account security",
    canDelete: true,
  },
];

const notCollected = [
  "Location data (precise or approximate)",
  "Contacts",
  "Photos and videos",
  "Audio files",
  "Files and documents",
  "Calendar",
  "Personal health information",
  "Messages",
  "Microphone",
  "Camera",
  "Phone number",
  "Physical address",
  "Web browsing history",
  "Social graph",
  "Race and ethnicity",
  "Sexual orientation",
  "Device ID (except authentication tokens)",
];

function Yes() {
  return <span className="data-safety-yes">✔ Yes</span>;
}

function No() {
  return <span className="data-safety-no">No</span>;
}

export default function DataSafety() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <BrandSignature size="sm" decorative />
        <span className="legal-eyebrow">Transparency</span>
        <h1>Data Safety</h1>
        <p className="legal-meta">Last updated: October 25, 2025 · Version 1.0.0</p>
      </header>

      <div className="legal-body">
        <p>
          This page describes exactly what data CircuiTry3D collects, why it is collected, and how it is handled.
          We believe in full transparency so you can make an informed decision about using the app.
        </p>

        <h2>Does CircuiTry3D collect user data?</h2>
        <p>
          <strong>Yes.</strong> Some data is collected to provide core features such as account management and
          subscription handling. All data is encrypted in transit and at rest. Users can request deletion at any
          time.
        </p>

        <h2>Data Collected</h2>
        <table className="data-safety-table">
          <thead>
            <tr>
              <th>Data Type</th>
              <th>Collected</th>
              <th>Shared with 3rd parties</th>
              <th>Purposes</th>
              <th>User can delete</th>
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row) => (
              <tr key={row.type}>
                <td><strong>{row.type}</strong></td>
                <td>{row.collected ? <Yes /> : <No />}</td>
                <td>{row.sharedWithThirdParties ? <Yes /> : <No />}</td>
                <td>{row.purposes}</td>
                <td>{row.canDelete ? <Yes /> : <No />}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Data Not Collected</h2>
        <p>The following data types are <strong>never</strong> collected:</p>
        <ul>
          {notCollected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>Security Practices</h2>
        <ul>
          <li>All data is encrypted in transit using TLS 1.2 or higher.</li>
          <li>All sensitive data is encrypted at rest using AES-256.</li>
          <li>Users can request data deletion via in-app settings or email.</li>
          <li>Users can export their data at any time.</li>
          <li>Optional data collection can be controlled in app settings.</li>
        </ul>

        <h2>Third-Party Services</h2>
        <ul>
          <li>
            <strong>Google Play Billing</strong> — Used for payment processing. Purchase history and transaction IDs
            are shared with Google Play. See the{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google Privacy Policy
            </a>.
          </li>
          <li>
            <strong>Firebase</strong> — May be used for analytics and authentication. App usage and
            authentication tokens may be shared. See the{" "}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">
              Firebase Privacy Policy
            </a>.
          </li>
        </ul>

        <h2>How to Delete Your Data</h2>
        <ol>
          <li>
            <strong>In-App</strong> — Go to Settings → Account → Delete Account. All data will be permanently
            deleted within 30 days.
          </li>
          <li>
            <strong>Email Request</strong> — Send a request to{" "}
            <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a>. We respond within 48 hours and
            complete deletion within 30 days.
          </li>
        </ol>
        <p>
          <Link to="/delete-account">→ Visit the dedicated Delete Account page for full instructions and a pre-filled request link.</Link>
        </p>

        <h2>Compliance</h2>
        <ul>
          <li>Follows Google Play's Families Policy</li>
          <li>Complies with COPPA</li>
          <li>Complies with GDPR</li>
          <li>Complies with CCPA</li>
        </ul>

        <div className="legal-contact-card">
          <h3>Contact</h3>
          <p><strong>Mitchell Lorin McKnight</strong></p>
          <p>Email: <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a></p>
          <p>Response time: within 48 hours (2 business days)</p>
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link to="/privacy">Read the full Privacy Policy →</Link>
        </p>
      </div>
    </div>
  );
}
