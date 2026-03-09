import React, { useRef, useState } from "react";
import { IS_DEMO_MODE, OWNER_STORAGE_KEY } from "../utils/demoMode";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.circuitry3d.app";

type UnlockStatus = "idle" | "loading" | "error" | "misconfigured";

function getPasswordBorderColor(status: UnlockStatus): string {
  if (status === "error") return "rgba(255,120,120,0.6)";
  if (status === "misconfigured") return "rgba(255,200,80,0.6)";
  return "rgba(136,204,255,0.3)";
}

const codeTagStyle: React.CSSProperties = {
  fontFamily: "monospace",
  background: "rgba(255,200,80,0.12)",
  padding: "0 3px",
  borderRadius: "3px",
};

/**
 * A fixed banner shown at the top of every page when the app is running in
 * demo mode (i.e. the Vercel web deployment). Informs users that this is a
 * limited preview and directs them to the Play Store for the full release.
 *
 * The owner can click the subtle lock icon to enter their owner password.
 * A successful authentication call to /api/owner stores the unlock flag in
 * localStorage and reloads the page with full-access enabled.
 */
export default function DemoBanner() {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!IS_DEMO_MODE) {
    return null;
  }

  const openUnlock = () => {
    setUnlockOpen(true);
    setPassword("");
    setStatus("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeUnlock = () => {
    setUnlockOpen(false);
    setPassword("");
    setStatus("idle");
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 503) {
        // OWNER_SECRET env var is not configured in this Vercel deployment.
        setStatus("misconfigured");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setPassword("");
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        localStorage.setItem(OWNER_STORAGE_KEY, "true");
        window.location.reload();
      } else {
        setStatus("error");
        setPassword("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <div
        role="banner"
        aria-label="Demo version notice"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          padding: "7px 16px",
          background:
            "linear-gradient(90deg, rgba(30,58,120,0.97) 0%, rgba(15,35,90,0.99) 100%)",
          borderBottom: "1px solid rgba(136,204,255,0.22)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          fontSize: "0.78rem",
          fontFamily:
            '"Inter","Poppins","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
          color: "rgba(200,225,255,0.9)",
          letterSpacing: "0.01em",
          lineHeight: 1.4,
        }}
      >
        <span
          style={{
            background: "rgba(136,204,255,0.15)",
            border: "1px solid rgba(136,204,255,0.35)",
            borderRadius: "4px",
            padding: "2px 8px",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#88ccff",
            whiteSpace: "nowrap",
          }}
        >
          ⚡ Demo Version
        </span>
        <span style={{ opacity: 0.85 }}>
          Limited component library &mdash; Battery, Resistor, LED, Switch, Ground &amp; Junction
          only.
        </span>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(136,204,255,0.45)",
            background: "rgba(136,204,255,0.12)",
            color: "#c8e6ff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "rgba(136,204,255,0.22)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor =
              "rgba(136,204,255,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "rgba(136,204,255,0.12)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor =
              "rgba(136,204,255,0.45)";
          }}
        >
          🚀 Get Full Version on Play Store
        </a>

        {/* Subtle owner-unlock button — visible but unobtrusive */}
        <button
          type="button"
          aria-label="Owner access"
          onClick={openUnlock}
          title="Owner access"
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
            color: "rgba(136,180,255,0.35)",
            fontSize: "0.8rem",
            lineHeight: 1,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(136,180,255,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(136,180,255,0.35)";
          }}
        >
          🔑
        </button>
      </div>

      {/* Owner unlock dialog */}
      {unlockOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Owner access"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5,10,30,0.75)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeUnlock();
          }}
        >
          <form
            onSubmit={handleUnlock}
            style={{
              background: "linear-gradient(135deg, rgba(15,30,80,0.98) 0%, rgba(10,20,55,0.99) 100%)",
              border: "1px solid rgba(136,204,255,0.25)",
              borderRadius: "12px",
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              minWidth: "300px",
              maxWidth: "90vw",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              fontFamily: '"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
              color: "rgba(200,225,255,0.9)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: "#88ccff",
              }}
            >
              🔑 Owner Access
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>
              Enter your owner password to unlock the full version.
            </p>

            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Owner password"
              autoComplete="current-password"
              style={{
                background: "rgba(136,204,255,0.07)",
                border: `1px solid ${getPasswordBorderColor(status)}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: "rgba(200,225,255,0.9)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />

            {status === "error" && (
              <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,120,120,0.9)", lineHeight: 1.5 }}>
                Incorrect password. Try again.{" "}
                <span style={{ opacity: 0.8 }}>
                  (The password is case-sensitive and must match the value you
                  set for <code style={codeTagStyle}>OWNER_SECRET</code> in
                  Vercel.)
                </span>
              </p>
            )}

            {status === "misconfigured" && (
              <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,200,80,0.9)", lineHeight: 1.6 }}>
                <strong>OWNER_SECRET is not configured.</strong>
                <br />
                In your Vercel project, go to{" "}
                <strong>Settings → Environment Variables</strong> and add a new
                variable:
                <br />
                <span style={{ display: "inline-block", marginTop: "4px" }}>
                  • <strong>Name&nbsp;(Key):</strong>{" "}
                  <code style={codeTagStyle}>OWNER_SECRET</code>
                  &nbsp;— must be typed exactly like this (all caps, underscore,
                  no spaces).
                  <br />
                  • <strong>Value:</strong> your chosen password.
                </span>
                <br />
                After saving, <strong>redeploy</strong> the project so the new
                variable takes effect.
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeUnlock}
                style={{
                  padding: "7px 18px",
                  borderRadius: "6px",
                  border: "1px solid rgba(136,204,255,0.2)",
                  background: "transparent",
                  color: "rgba(180,210,255,0.7)",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading" || status === "misconfigured" || !password}
                style={{
                  padding: "7px 18px",
                  borderRadius: "6px",
                  border: "1px solid rgba(136,204,255,0.45)",
                  background: "rgba(136,204,255,0.15)",
                  color: "#c8e6ff",
                  cursor: status === "loading" || status === "misconfigured" ? "default" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  opacity: !password || status === "misconfigured" ? 0.5 : 1,
                }}
              >
                {status === "loading" ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
