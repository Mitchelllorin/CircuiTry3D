import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  hasOwnerAccess,
  verifyOwnerPassword,
  grantOwnerAccess,
  revokeOwnerAccess,
  OWNER_ACCESS_CONFIGURED,
} from "../utils/ownerAccess";

export default function OwnerAccess() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessGranted, setAccessGranted] = useState<boolean>(() => hasOwnerAccess());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || isSubmitting) return;
    setStatus(null);
    setIsSubmitting(true);

    // Minimum delay to prevent timing-based probing
    const [valid] = await Promise.all([
      verifyOwnerPassword(password),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);

    setIsSubmitting(false);
    setPassword("");

    if (valid) {
      grantOwnerAccess();
      setAccessGranted(true);
      setStatus({ type: "success", message: "✓ Owner access granted. Lifetime tier active." });
    } else {
      setStatus({ type: "error", message: "Incorrect password." });
    }
  };

  const handleRevoke = () => {
    revokeOwnerAccess();
    setAccessGranted(false);
    setStatus({ type: "info", message: "Owner access revoked for this browser." });
  };

  return (
    <div style={styles.page}>
      <Link to="/" style={styles.back}>← Home</Link>

      <div style={styles.card}>
        {/* Lock / unlocked icon */}
        <div style={styles.icon} aria-hidden="true">
          {accessGranted ? "🔓" : "🔒"}
        </div>

        <h1 style={styles.heading}>Owner Access</h1>
        <p style={styles.subtext}>
          {accessGranted
            ? "This browser session has owner access."
            : "Enter your owner password to unlock lifetime access on this device."}
        </p>

        {status && (
          <div
            style={{
              ...styles.statusBox,
              background: status.type === "success"
                ? "rgba(34,197,94,0.15)"
                : status.type === "error"
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(99,102,241,0.15)",
              borderColor: status.type === "success"
                ? "rgba(34,197,94,0.4)"
                : status.type === "error"
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(99,102,241,0.4)",
              color: status.type === "success"
                ? "#4ade80"
                : status.type === "error"
                  ? "#f87171"
                  : "#a5b4fc",
            }}
            role="status"
          >
            {status.message}
          </div>
        )}

        {OWNER_ACCESS_CONFIGURED && !accessGranted && (
          <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
            <label style={styles.label} htmlFor="owner-password">
              Password
            </label>
            <input
              id="owner-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter owner password"
              style={styles.input}
              autoFocus
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: isSubmitting || !password ? 0.5 : 1,
                cursor: isSubmitting || !password ? "not-allowed" : "pointer",
              }}
              disabled={isSubmitting || !password}
            >
              {isSubmitting ? "Verifying…" : "Unlock"}
            </button>
          </form>
        )}

        {accessGranted && (
          <button type="button" onClick={handleRevoke} style={styles.revokeButton}>
            Revoke access for this browser
          </button>
        )}
      </div>
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-darker, #0f172a)",
    padding: "24px",
    position: "relative" as const,
  },
  back: {
    position: "absolute" as const,
    top: "20px",
    left: "20px",
    color: "rgba(200,220,255,0.6)",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--bg-overlay, rgba(255,255,255,0.04))",
    border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
    borderRadius: "16px",
    padding: "40px 32px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 24px 60px -16px rgba(99,102,241,0.3)",
  },
  icon: {
    fontSize: "2.5rem",
    lineHeight: 1,
  },
  heading: {
    margin: 0,
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "var(--text-primary, #fff)",
    textAlign: "center" as const,
  },
  subtext: {
    margin: 0,
    fontSize: "0.875rem",
    color: "var(--text-muted, rgba(200,220,255,0.6))",
    textAlign: "center" as const,
    lineHeight: 1.5,
  },
  statusBox: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "0.85rem",
    lineHeight: 1.5,
    textAlign: "center" as const,
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-muted, rgba(200,220,255,0.6))",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 600,
    transition: "opacity 0.2s",
  },
  revokeButton: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: "8px",
    color: "rgba(239,68,68,0.8)",
    padding: "8px 16px",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "border-color 0.2s, color 0.2s",
  },
  code: {
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.3)",
    padding: "1px 4px",
    borderRadius: "3px",
    fontSize: "0.85em",
  },
} as const;
