import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import "../styles/legal.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <BrandSignature size="sm" decorative />
        <span className="legal-eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Effective Date: October 25, 2025 · Version 1.0.0</p>
      </header>

      <div className="legal-body">
        <h2>Introduction</h2>
        <p>
          CircuiTry3D, founded and operated by <strong>Mitchell Lorin McKnight</strong> ("we," "our," or "the app"),
          is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
          your information when you use our application.
        </p>

        <h2>Information We Collect</h2>

        <h3>Personal Information</h3>
        <ul>
          <li>
            <strong>User Email Address</strong> — Collected during account registration; used for authentication,
            password recovery, and important updates.
          </li>
          <li>
            <strong>Purchase History</strong> — In-app purchases and subscription information (transaction IDs and
            dates) used for subscription management and customer support.
          </li>
          <li>
            <strong>App Usage Data</strong> — Circuit designs and saved projects, feature usage statistics, and app
            performance metrics used to improve functionality and user experience.
          </li>
          <li>
            <strong>Authentication Tokens</strong> — Session tokens for maintaining login state, stored securely and
            used only for authentication.
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li><strong>Account Management</strong> — Creating and managing user accounts.</li>
          <li><strong>Subscription Services</strong> — Processing and managing in-app purchases and subscriptions.</li>
          <li><strong>App Functionality</strong> — Saving your circuit designs and preferences.</li>
          <li><strong>Customer Support</strong> — Responding to inquiries and providing assistance.</li>
          <li><strong>App Improvement</strong> — Analyzing usage patterns to enhance features and performance.</li>
          <li><strong>Security</strong> — Protecting against unauthorised access and fraud.</li>
        </ul>

        <h2>Data Storage and Security</h2>
        <ul>
          <li>All personal data is encrypted in transit (TLS 1.2 or higher) and at rest (AES-256).</li>
          <li>Authentication tokens are stored using industry-standard secure storage.</li>
          <li>We implement appropriate technical and organisational measures to protect your data.</li>
          <li>We do not sell or share your personal information with third parties for marketing purposes.</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>We may use third-party services for:</p>
        <ul>
          <li>Payment processing (Google Play Billing)</li>
          <li>Analytics (anonymised usage data)</li>
          <li>Cloud storage for user-generated content</li>
        </ul>
        <p>These services have their own privacy policies and we encourage you to review them.</p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt-out of non-essential data collection.</li>
          <li>Export your circuit designs and data.</li>
        </ul>
        <p>
          To exercise these rights, contact us at{" "}
          <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a>.
        </p>

        <h2>Data Deletion</h2>
        <p>You can request deletion of your data in two ways:</p>
        <ol>
          <li>
            <strong>In-App</strong> — Go to Settings → Account → Delete Account. All data will be permanently
            deleted within 30 days.
          </li>
          <li>
            <strong>Email Request</strong> — Send a deletion request to{" "}
            <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a>. We respond within 48 hours and
            complete deletion within 30 days.
          </li>
        </ol>

        <h2>Children's Privacy</h2>
        <p>
          CircuiTry3D is designed for educational purposes and is appropriate for users of all ages. We do not
          knowingly collect personal information from children under 13 without parental consent. If you believe
          we have collected such information, please contact us immediately.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide services. You may
          request deletion of your account at any time.
        </p>

        <h2>Compliance</h2>
        <ul>
          <li>Follows Google Play's Families Policy</li>
          <li>Complies with COPPA</li>
          <li>Complies with GDPR</li>
          <li>Complies with CCPA</li>
        </ul>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes via
          email or in-app notification. Continued use of the app after changes constitutes acceptance of the
          updated policy.
        </p>

        <div className="legal-contact-card">
          <h3>Contact — Data Protection Officer</h3>
          <p><strong>Mitchell Lorin McKnight</strong></p>
          <p>Email: <a href="mailto:privacy@circuitry3d.app">privacy@circuitry3d.app</a></p>
          <p>Website: <a href="https://circuitry3d.app/privacy" target="_blank" rel="noopener noreferrer">https://circuitry3d.app/privacy</a></p>
          <p>Response time: within 48 hours (2 business days)</p>
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link to="/data-safety">View our Data Safety disclosure →</Link>
        </p>
      </div>
    </div>
  );
}
