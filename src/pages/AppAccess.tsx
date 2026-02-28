import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import "../styles/legal.css";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.circuitry3d.app";
const PACKAGE_NAME = "com.circuitry3d.app";

export default function AppAccess() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <BrandSignature size="sm" decorative />
        <span className="legal-eyebrow">Mobile App</span>
        <h1>Get the App</h1>
        <p className="legal-meta">CircuiTry3D · {PACKAGE_NAME}</p>
      </header>

      <div className="legal-body">
        <p>
          CircuiTry3D is available as a native Android app so you can build and simulate circuits on the go.
          The app delivers the same full 3D circuit-builder experience optimised for mobile devices.
        </p>

        <h2>Download</h2>
        <div className="app-access-badges">
          <a
            href={PLAY_STORE_URL}
            className="app-access-badge"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get CircuiTry3D on Google Play"
          >
            <span className="app-access-badge-icon" aria-hidden="true">▶</span>
            Google Play Store
          </a>
        </div>
        <p>
          <strong>Package:</strong> <code>{PACKAGE_NAME}</code>
        </p>

        <h2>App Access Level</h2>
        <p>All functionality is available without restrictions once the app is installed:</p>
        <ul>
          <li>No login required to explore the circuit builder.</li>
          <li>Create a free account to save circuits and join the community.</li>
          <li>Premium features (Classroom, advanced analytics) require a subscription — see the{" "}
            <Link to="/pricing">Pricing</Link> page.</li>
        </ul>

        <div className="app-access-highlight">
          <h3>No paywalled core features</h3>
          <p>
            The core 3D circuit builder, Ohm's law simulator, current-flow visualisation, and component library are
            all free. Subscriptions unlock classroom management, analytics, and additional content packs.
          </p>
        </div>

        <h2>Supported Devices</h2>
        <ul>
          <li>Android 8.0 (API level 26) and higher</li>
          <li>Minimum 2 GB RAM recommended for smooth 3D rendering</li>
          <li>Phones and tablets supported</li>
        </ul>

        <h2>Permissions</h2>
        <p>The app requests only the permissions it needs:</p>
        <ul>
          <li>
            <strong>Internet</strong> — Required to sync circuits, manage accounts, and load educational content.
          </li>
          <li>
            <strong>In-App Billing</strong> — Required to process subscription purchases through Google Play.
          </li>
        </ul>
        <p>
          The app does <strong>not</strong> request access to your camera, microphone, contacts, location, or any
          other sensitive permission.
        </p>

        <h2>Content Rating</h2>
        <p>
          CircuiTry3D is rated <strong>Everyone</strong> (Google Play). It is appropriate for all age groups and
          is specifically designed as an educational tool for students, teachers, and electronics enthusiasts.
        </p>

        <h2>Version Information</h2>
        <ul>
          <li>Current version: 1.0.0 (version code 1)</li>
          <li>Target SDK: Android 35</li>
          <li>Min SDK: Android 8.0 (API 26)</li>
        </ul>

        <h2>Support</h2>
        <p>
          Encountering an issue with the app? Use the in-app feedback form or reach out directly:
        </p>
        <div className="legal-contact-card">
          <h3>App Support Contact</h3>
          <p><strong>Mitchell Lorin McKnight</strong></p>
          <p>Email: <a href="mailto:support@circuitry3d.app">support@circuitry3d.app</a></p>
          <p>
            Privacy enquiries: <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a>
          </p>
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link to="/privacy">Privacy Policy</Link>
          {" · "}
          <Link to="/data-safety">Data Safety</Link>
        </p>
      </div>
    </div>
  );
}
