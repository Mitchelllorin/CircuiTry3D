import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";

export default function PrivacyPolicy() {
  return (
    <div style={{
      maxWidth: 760,
      margin: "0 auto",
      padding: "40px 24px 64px",
      color: "var(--text-secondary)",
      lineHeight: 1.8,
    }}>
      <div style={{ marginBottom: 32 }}>
        <BrandSignature size="sm" />
      </div>

      <h1 style={{ color: "var(--text-primary)", marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 40 }}>
        <strong>Effective Date:</strong> October 25, 2025
      </p>

      <section>
        <h2>Introduction</h2>
        <p>
          CircuiTry3D, founded and operated by <strong>Mitchell Lorin McKnight</strong> ("we," "our," or "the
          app"), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and
          safeguard your information when you use our application.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>

        <h3>Personal Information</h3>
        <p>We collect the following personal information:</p>
        <ol>
          <li>
            <strong>User Email Address</strong> — Collected during account registration; used for account
            authentication, password recovery, and important updates.
          </li>
          <li>
            <strong>Purchase History</strong> — In-app purchases and subscription information including
            transaction IDs and purchase dates; used for subscription management and customer support.
          </li>
          <li>
            <strong>App Usage Data</strong> — Circuit designs and saved projects, feature usage statistics, and
            app performance metrics; used to improve app functionality and user experience.
          </li>
          <li>
            <strong>Authentication Tokens</strong> — Session tokens for maintaining login state and OAuth tokens
            if using third-party login; stored securely and used only for authentication.
          </li>
        </ol>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <p>We use the collected information for:</p>
        <ul>
          <li><strong>Account Management:</strong> Creating and managing user accounts.</li>
          <li><strong>Subscription Services:</strong> Processing and managing in-app purchases and subscriptions.</li>
          <li><strong>App Functionality:</strong> Saving your circuit designs and preferences.</li>
          <li><strong>Customer Support:</strong> Responding to inquiries and providing assistance.</li>
          <li><strong>App Improvement:</strong> Analyzing usage patterns to enhance features and performance.</li>
          <li><strong>Security:</strong> Protecting against unauthorized access and fraud.</li>
        </ul>
      </section>

      <section>
        <h2>Data Storage and Security</h2>
        <ul>
          <li>All personal data is encrypted in transit and at rest.</li>
          <li>Authentication tokens are stored securely using industry-standard practices.</li>
          <li>We implement appropriate technical and organizational measures to protect your data.</li>
          <li>We do not sell or share your personal information with third parties for marketing purposes.</li>
        </ul>
      </section>

      <section>
        <h2>Third-Party Services</h2>
        <p>We may use third-party services for:</p>
        <ul>
          <li>Payment processing (Google Play Billing)</li>
          <li>Analytics (anonymized usage data)</li>
          <li>Cloud storage for user-generated content</li>
        </ul>
        <p>These services have their own privacy policies and we encourage you to review them.</p>
      </section>

      <section>
        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt out of non-essential data collection.</li>
          <li>Export your circuit designs and data.</li>
        </ul>
        <p>
          To exercise these rights, contact us at:{" "}
          <a href="mailto:privacy@circuitry3d.app" style={{ color: "var(--brand-primary)" }}>
            privacy@circuitry3d.app
          </a>
        </p>
      </section>

      <section>
        <h2>Children's Privacy</h2>
        <p>
          CircuiTry3D is designed for educational purposes and is appropriate for users of all ages. We do not
          knowingly collect personal information from children under 13 without parental consent. If you believe
          we have collected such information, please contact us immediately.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide services. You may
          request deletion of your account at any time by contacting{" "}
          <a href="mailto:privacy@circuitry3d.app" style={{ color: "var(--brand-primary)" }}>
            privacy@circuitry3d.app
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes
          through the app or via email.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact founder and data controller{" "}
          <strong>Mitchell Lorin McKnight</strong>:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:privacy@circuitry3d.app" style={{ color: "var(--brand-primary)" }}>
            privacy@circuitry3d.app
          </a>
          <br />
          <strong>Website:</strong>{" "}
          <a href="https://circuitry3d.app/privacy" style={{ color: "var(--brand-primary)" }}>
            https://circuitry3d.app/privacy
          </a>
        </p>
      </section>

      <section>
        <h2>Compliance</h2>
        <p>This app complies with:</p>
        <ul>
          <li>Google Play Developer Program Policies</li>
          <li>General Data Protection Regulation (GDPR)</li>
          <li>California Consumer Privacy Act (CCPA)</li>
          <li>Children's Online Privacy Protection Act (COPPA)</li>
        </ul>
      </section>

      <hr style={{ borderColor: "var(--border-subtle)", margin: "40px 0" }} />

      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        <strong>Last Updated:</strong> October 25, 2025
      </p>

      <p style={{ marginTop: 32 }}>
        <Link to="/" style={{ color: "var(--brand-primary)", textDecoration: "none" }}>
          ← Back to CircuiTry3D
        </Link>
      </p>
    </div>
  );
}
