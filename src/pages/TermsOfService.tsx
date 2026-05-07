import { Link } from "react-router-dom";
import "../styles/legal.css";

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <span className="legal-eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p className="legal-meta">Effective Date: October 25, 2025 · Version 1.0.0</p>
      </header>

      <div className="legal-body">
        <h2>Acceptance of Terms</h2>
        <p>
          By downloading, installing, or using CircuiTry3D ("the App"), you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
          CircuiTry3D is operated by <strong>Mitchell Lorin McKnight</strong> ("we," "us," or "our").
        </p>

        <h2>Use of the App</h2>
        <p>You may use the App for personal, educational, and non-commercial purposes. You agree not to:</p>
        <ul>
          <li>Reverse-engineer, decompile, or disassemble any part of the App.</li>
          <li>Use the App to violate any applicable law or regulation.</li>
          <li>Transmit harmful, offensive, or unlawful content through community features.</li>
          <li>Attempt to gain unauthorised access to our systems or other users' accounts.</li>
          <li>Reproduce or distribute the App or its content without our written permission.</li>
        </ul>

        <h2>Accounts</h2>
        <p>
          To access certain features you must create an account. You are responsible for maintaining
          the confidentiality of your login credentials and for all activity that occurs under your
          account. Notify us immediately at{" "}
          <a href="mailto:info@circuitry3d.net">info@circuitry3d.net</a> if you suspect unauthorised
          use.
        </p>

        <h2>Subscriptions and In-App Purchases</h2>
        <p>
          The App offers optional paid features, including one-time purchases and recurring
          subscriptions ("Pro"). All purchases are processed through Google Play. Prices are
          displayed in the App at the time of purchase.
        </p>
        <ul>
          <li>
            <strong>Recurring subscriptions</strong> renew automatically until cancelled. Cancel
            at any time via{" "}
            <a
              href="https://play.google.com/store/account/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play → Subscriptions
            </a>
            .
          </li>
          <li>
            <strong>Refunds</strong> are subject to{" "}
            <a
              href="https://support.google.com/googleplay/answer/2479637"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play's refund policy
            </a>
            . Contact us if you experience billing issues.
          </li>
        </ul>

        <h2>User-Generated Content</h2>
        <p>
          You retain ownership of circuit designs and other content you create. By sharing content
          through community features, you grant us a non-exclusive, royalty-free licence to display
          and distribute that content within the App. You are solely responsible for ensuring your
          content does not infringe third-party rights.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All App software, graphics, brand assets, and educational content (excluding user-generated
          content) are the exclusive property of Mitchell Lorin McKnight and are protected by
          copyright and other intellectual property laws. Nothing in these Terms grants you any
          ownership rights in the App.
        </p>

        <h2>Disclaimer of Warranties</h2>
        <p>
          The App is provided <strong>"as is"</strong> and <strong>"as available"</strong> without
          warranties of any kind, express or implied, including warranties of merchantability,
          fitness for a particular purpose, or non-infringement. We do not warrant that the App will
          be uninterrupted, error-free, or free of harmful components.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of or relating to your
          use of the App, even if we have been advised of the possibility of such damages.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate your access to the App at any time, with or without notice,
          for conduct that we believe violates these Terms or is harmful to other users, us, or third
          parties. You may terminate your account at any time via{" "}
          <Link to="/delete-account">the Delete Account page</Link>.
        </p>

        <h2>Children's Use</h2>
        <p>
          CircuiTry3D is designed for educational use by all ages. Users under 13 must have
          parental or guardian consent before creating an account. We do not knowingly collect
          personal information from children under 13 without such consent.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after changes
          constitutes acceptance of the revised Terms. We will notify you of material changes via
          email or in-app notification.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with applicable law. Any disputes
          arising under these Terms shall be resolved through good-faith negotiation, and where
          necessary, through binding arbitration or the courts of the applicable jurisdiction.
        </p>

        <div className="legal-contact-card">
          <h3>Contact</h3>
          <p><strong>Mitchell Lorin McKnight</strong></p>
          <p>Email: <a href="mailto:info@circuitry3d.net">info@circuitry3d.net</a></p>
          <p>Website: <a href="https://www.circuitry3d.net/terms" target="_blank" rel="noopener noreferrer">https://www.circuitry3d.net/terms</a></p>
          <p>Response time: within 48 hours (2 business days)</p>
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link to="/privacy">Privacy Policy</Link>
          {" · "}
          <Link to="/delete-account">Delete Account</Link>
        </p>
      </div>
    </div>
  );
}
