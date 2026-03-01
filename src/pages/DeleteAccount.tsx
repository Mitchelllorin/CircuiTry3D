import { Link } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import "../styles/legal.css";

const DELETION_EMAIL = "privacy@circuitry3d.app";

const MAILTO_LINK = `mailto:${DELETION_EMAIL}?subject=${encodeURIComponent(
  "Account Deletion Request — CircuiTry3D"
)}&body=${encodeURIComponent(
  "Hi,\n\nI would like to permanently delete my CircuiTry3D account and all associated data.\n\nAccount email address: [YOUR EMAIL HERE]\n\nPlease confirm once the deletion has been completed.\n\nThank you."
)}`;

const PARTIAL_MAILTO_LINK = `mailto:${DELETION_EMAIL}?subject=${encodeURIComponent(
  "Partial Data Deletion Request — CircuiTry3D"
)}&body=${encodeURIComponent(
  "Hi,\n\nI would like to delete specific data from my CircuiTry3D account WITHOUT deleting my account.\n\nAccount email address: [YOUR EMAIL HERE]\n\nPlease delete the following data (check all that apply):\n☐ Saved circuit designs and projects\n☐ Community posts and comments\n☐ App usage and interaction history\n☐ Crash logs and diagnostic data\n☐ Profile bio\n\nPlease confirm once the deletion has been completed.\n\nThank you."
)}`;

export default function DeleteAccount() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← Home</Link>

      <header className="legal-header">
        <BrandSignature size="sm" decorative />
        <span className="legal-eyebrow">Account Management</span>
        <h1>Delete Your Account</h1>
        <p className="legal-meta">CircuiTry3D · Permanent account &amp; data removal</p>
      </header>

      <div className="legal-body">
        <p>
          You can permanently delete your CircuiTry3D account and all associated data at any time.
          This page is publicly accessible — no sign-in is required to submit a deletion request.
        </p>

        <div className="delete-account-warning">
          <strong>⚠ This action is permanent.</strong> Once deleted, your account, saved circuits,
          community posts, and subscription history cannot be recovered.
        </div>

        {/* ── Option 1: In-App ────────────────────────────────────────────── */}
        <h2>Option 1 — Delete in the App</h2>
        <p>If you are signed in to the CircuiTry3D app:</p>
        <ol>
          <li>Open the app and tap the <strong>Account</strong> tab.</li>
          <li>Scroll to the bottom of your profile.</li>
          <li>Tap <strong>Delete Account</strong>.</li>
          <li>Confirm the deletion when prompted.</li>
        </ol>
        <p>Your account and data will be permanently deleted within <strong>30 days</strong>.</p>

        {/* ── Option 2: Email Request ──────────────────────────────────────── */}
        <h2>Option 2 — Submit a Deletion Request by Email</h2>
        <p>
          Use the button below to send a pre-filled deletion request. We respond within{" "}
          <strong>48 hours</strong> and complete deletion within <strong>30 days</strong>.
        </p>

        <div className="delete-account-cta">
          <a
            href={MAILTO_LINK}
            className="delete-account-btn"
            aria-label="Open email client to send a deletion request"
          >
            ✉ Request Account Deletion by Email
          </a>
          <p className="delete-account-email-note">
            Sends to{" "}
            <a href={`mailto:${DELETION_EMAIL}`}>{DELETION_EMAIL}</a>
            {" "}— replace the placeholder with your account email address before sending.
          </p>
        </div>

        {/* ── Option 3: Delete Some Data (No Account Deletion) ───────────── */}
        <h2>Option 3 — Delete Specific Data Only (Keep Your Account)</h2>
        <p>
          You can request deletion of <strong>individual data types</strong> without closing your account.
          This satisfies Google Play's requirement for partial data deletion.
        </p>
        <p>The following data types can be deleted independently:</p>
        <ul>
          <li>Saved circuit designs and projects</li>
          <li>Community posts and comments</li>
          <li>App usage and interaction history</li>
          <li>Crash logs and diagnostic data</li>
          <li>Profile bio</li>
        </ul>
        <div className="delete-account-cta">
          <a
            href={PARTIAL_MAILTO_LINK}
            className="delete-account-btn"
            style={{ background: "rgba(59,130,246,0.18)", borderColor: "rgba(59,130,246,0.45)" }}
            aria-label="Open email client to send a partial data deletion request"
          >
            ✉ Request Partial Data Deletion by Email
          </a>
          <p className="delete-account-email-note">
            Tick the items you want removed in the email body. Your account stays open.
          </p>
        </div>

        {/* ── What gets deleted ────────────────────────────────────────────── */}
        <h2>What Gets Deleted</h2>
        <p>A deletion request removes <strong>all</strong> data associated with your account:</p>
        <ul>
          <li>Email address and password hash</li>
          <li>Display name and profile bio</li>
          <li>Saved circuit designs and projects</li>
          <li>Community posts, comments, and circuit shares</li>
          <li>App usage and interaction history</li>
          <li>Crash logs and diagnostic data tied to your account</li>
          <li>Authentication tokens and session data</li>
          <li>Subscription and purchase history records (transaction IDs)</li>
        </ul>

        <h2>What Is Not Deleted</h2>
        <ul>
          <li>
            <strong>Aggregated, anonymised analytics</strong> — data that cannot be linked back to you.
          </li>
          <li>
            <strong>Financial transaction records retained by Google Play</strong> — governed by Google's
            own retention policy and applicable law.
          </li>
          <li>
            <strong>Backup copies</strong> — purged from all backup systems within 90 days.
          </li>
        </ul>

        <h2>Timeline</h2>
        <ul>
          <li>Deletion request acknowledged within <strong>48 hours</strong>.</li>
          <li>Account deactivated and primary data deleted within <strong>30 days</strong>.</li>
          <li>Backup and disaster-recovery copies purged within <strong>90 days</strong>.</li>
        </ul>

        <h2>Cancelling a Subscription Before Deleting</h2>
        <p>
          If you have an active subscription, cancel it in Google Play before deleting your account
          to avoid future charges. Go to{" "}
          <a
            href="https://play.google.com/store/account/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Manage subscriptions on Google Play (opens in new window)"
          >
            Google Play → Subscriptions
          </a>
          {" "}and cancel the CircuiTry3D subscription.
        </p>

        <div className="legal-contact-card">
          <h3>Contact — Privacy &amp; Data Deletion</h3>
          <p><strong>Mitchell Lorin McKnight</strong></p>
          <p>Email: <a href={`mailto:${DELETION_EMAIL}`}>{DELETION_EMAIL}</a></p>
          <p>Response time: within 48 hours (2 business days)</p>
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
