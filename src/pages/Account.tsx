import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { FormEvent } from "react";
import { isLifetimeTester } from "../utils/lifetimeTesterEmails";
import "../styles/account.css";

type Mode = "signin" | "signup" | "profile" | "forgot-password" | "pin";

type PinSetupPhase =
  | { active: false }
  | { active: true; step: "enter" | "confirm"; first: string };

function PinDots({ length }: { length: number }) {
  return (
    <div className="pin-dots" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`pin-dot${length > i ? " is-filled" : ""}`} />
      ))}
    </div>
  );
}

function PinPad({ onDigit, onBackspace }: { onDigit: (d: string) => void; onBackspace: () => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;
  return (
    <div className="pin-pad" role="group" aria-label="PIN keypad">
      {keys.map((key, i) =>
        key === "" ? (
          <span key={i} className="pin-key-empty" aria-hidden="true" />
        ) : key === "⌫" ? (
          <button key={i} type="button" className="pin-key pin-key-back" onClick={onBackspace} aria-label="Delete last digit">
            ⌫
          </button>
        ) : (
          <button key={i} type="button" className="pin-key" onClick={() => onDigit(key)}>
            {key}
          </button>
        )
      )}
    </div>
  );
}

export default function Account() {
  const { currentUser, lastSignedInUser, hasPIN, loading, users, signIn, signUp, signOut, updateProfile, resetPassword, setPIN, clearPIN, signInWithPIN } = useAuth();
  const [mode, setMode] = useState<Mode>(currentUser ? "profile" : "signin");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ email: "", password: "", displayName: "", bio: "" });
  const [profileForm, setProfileForm] = useState({ displayName: currentUser?.displayName ?? "", bio: currentUser?.bio ?? "" });
  const [forgotForm, setForgotForm] = useState({ email: "", newPassword: "", confirmPassword: "", step: 1 as 1 | 2 });
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PIN sign-in state
  const [pinEntry, setPinEntry] = useState("");
  const [pinShake, setPinShake] = useState(false);

  // PIN setup state (in profile)
  const [pinSetup, setPinSetupPhase] = useState<PinSetupPhase>({ active: false });
  const [pinSetupEntry, setPinSetupEntry] = useState("");

  const hasSetInitialModeRef = useRef(false);

  // After loading, auto-switch to PIN mode if applicable
  useEffect(() => {
    if (!loading && !hasSetInitialModeRef.current) {
      hasSetInitialModeRef.current = true;
      if (currentUser) {
        setMode("profile");
        setProfileForm({ displayName: currentUser.displayName, bio: currentUser.bio ?? "" });
      } else if (hasPIN && lastSignedInUser) {
        setMode("pin");
      }
    }
  }, [loading, currentUser, hasPIN, lastSignedInUser]);

  // When user becomes authenticated, go to profile
  useEffect(() => {
    if (currentUser) {
      setMode("profile");
      setProfileForm({ displayName: currentUser.displayName, bio: currentUser.bio ?? "" });
      setPinEntry("");
      setPinSetupPhase({ active: false });
      setPinSetupEntry("");
    }
  }, [currentUser]);

  // Keyboard support for PIN entry
  useEffect(() => {
    if (mode !== "pin" && !(mode === "profile" && pinSetup.active)) return;
    const handler = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        if (mode === "pin") {
          handlePinDigit(e.key);
        } else {
          handlePinSetupDigit(e.key);
        }
      } else if (e.key === "Backspace") {
        if (mode === "pin") {
          setPinEntry((prev) => prev.slice(0, -1));
        } else {
          setPinSetupEntry((prev) => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pinSetup.active]);

  const handlePinDigit = useCallback((digit: string) => {
    setPinEntry((prev) => {
      const next = prev.length < 4 ? prev + digit : prev;
      return next;
    });
  }, []);

  const handlePinSetupDigit = useCallback((digit: string) => {
    setPinSetupEntry((prev) => (prev.length < 4 ? prev + digit : prev));
  }, []);

  // Auto-submit PIN sign-in when 4 digits entered
  useEffect(() => {
    if (mode === "pin" && pinEntry.length === 4) {
      const submit = async () => {
        setIsSubmitting(true);
        try {
          const result = await signInWithPIN(pinEntry);
          if (!result.ok) {
            setPinShake(true);
            setStatus({ type: "error", message: result.message });
            setTimeout(() => {
              setPinShake(false);
              setPinEntry("");
            }, 600);
          }
        } finally {
          setIsSubmitting(false);
        }
      };
      submit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinEntry, mode]);

  // Auto-advance PIN setup when 4 digits entered
  useEffect(() => {
    if (mode === "profile" && pinSetup.active && pinSetupEntry.length === 4) {
      if (pinSetup.step === "enter") {
        const first = pinSetupEntry;
        setPinSetupPhase({ active: true, step: "confirm", first });
        setPinSetupEntry("");
      } else if (pinSetup.step === "confirm") {
        if (pinSetupEntry !== pinSetup.first) {
          setStatus({ type: "error", message: "PINs didn't match. Try again." });
          setPinSetupPhase({ active: true, step: "enter", first: "" });
          setPinSetupEntry("");
        } else {
          const finish = async () => {
            setIsSubmitting(true);
            try {
              const result = await setPIN(pinSetupEntry);
              if (result.ok) {
                setStatus({ type: "success", message: "PIN set! You can now unlock quickly next time." });
                setPinSetupPhase({ active: false });
                setPinSetupEntry("");
              } else {
                setStatus({ type: "error", message: result.message });
                setPinSetupPhase({ active: false });
                setPinSetupEntry("");
              }
            } finally {
              setIsSubmitting(false);
            }
          };
          finish();
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSetupEntry, pinSetup, mode]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await signIn({ email: signInForm.email, password: signInForm.password });
      if (result.ok) {
        setStatus({ type: "success", message: `Welcome back, ${result.user.displayName}!` });
        setMode("profile");
        setSignInForm({ email: "", password: "" });
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await signUp({
        email: signUpForm.email,
        password: signUpForm.password,
        displayName: signUpForm.displayName,
        bio: signUpForm.bio,
      });
      if (result.ok) {
        setStatus({ type: "success", message: "Account created! You are signed in." });
        setMode("profile");
        setSignUpForm({ email: "", password: "", displayName: "", bio: "" });
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await updateProfile({ displayName: profileForm.displayName, bio: profileForm.bio });
      if (result.ok) {
        setStatus({ type: "success", message: "Profile updated." });
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setMode(hasPIN && lastSignedInUser ? "pin" : "signin");
    setStatus({ type: "success", message: "Signed out." });
    setPinEntry("");
  };

  const handleForgotStep1 = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const emailNorm = forgotForm.email.trim().toLowerCase();
    const emailExists = users.some((u) => u.email.toLowerCase() === emailNorm);
    if (!emailExists) {
      setStatus({ type: "error", message: "No account found with that email address." });
      return;
    }
    setForgotForm((previous) => ({ ...previous, step: 2 }));
  };

  const handleForgotStep2 = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await resetPassword(forgotForm.email, forgotForm.newPassword);
      if (result.ok) {
        setStatus({ type: "success", message: "Password reset successfully. You can now sign in." });
        setForgotForm({ email: "", newPassword: "", confirmPassword: "", step: 1 });
        setMode("signin");
      } else {
        setStatus({ type: "error", message: result.message });
        setForgotForm((previous) => ({ ...previous, step: 1 }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForgot = () => {
    setForgotForm({ email: "", newPassword: "", confirmPassword: "", step: 1 });
    setStatus(null);
    setMode("signin");
  };

  const handleClearPIN = async () => {
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await clearPIN();
      if (result.ok) {
        setStatus({ type: "success", message: "PIN removed." });
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeLabel = useMemo(() => {
    switch (mode) {
      case "signin":
        return "Sign In";
      case "signup":
        return "Create Account";
      case "profile":
        return "Your Account";
      case "forgot-password":
        return "Reset Password";
      case "pin":
        return "Quick Unlock";
      default:
        return "Account";
    }
  }, [mode]);

  return (
    <div className="account-page">
      <header className="account-header">
        <div>
          <span className="account-eyebrow">User Accounts</span>
          <h1>{modeLabel}</h1>
          <p>Join the community to chat, share circuits, and sync your builds across devices.</p>
        </div>
        <div className="account-switcher" role="tablist" aria-label="Account modes">
          <button
            type="button"
            className={mode === "signin" || mode === "pin" ? "tab-button is-active" : "tab-button"}
            onClick={() => { setStatus(null); setPinEntry(""); setMode(hasPIN && lastSignedInUser ? "pin" : "signin"); }}
            disabled={isSubmitting || Boolean(currentUser)}
            role="tab"
            aria-selected={mode === "signin" || mode === "pin"}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "tab-button is-active" : "tab-button"}
            onClick={() => { setStatus(null); setMode("signup"); }}
            disabled={isSubmitting || Boolean(currentUser)}
            role="tab"
            aria-selected={mode === "signup"}
          >
            Create Account
          </button>
          <button
            type="button"
            className={mode === "profile" ? "tab-button is-active" : "tab-button"}
            onClick={() => setMode("profile")}
            disabled={!currentUser || isSubmitting}
            role="tab"
            aria-selected={mode === "profile"}
          >
            Profile
          </button>
        </div>
      </header>

      {status && (
        <div className={`account-status ${status.type === "success" ? "is-success" : "is-error"}`} role="status">
          {status.message}
        </div>
      )}

      {loading ? (
        <p className="account-loading">Loading account state…</p>
      ) : (
        <div className="account-panels">
          {mode === "pin" && lastSignedInUser && (
            <div className="account-form pin-entry-wrap">
              <div className="pin-welcome-card">
                <div className="profile-avatar" style={{ backgroundColor: lastSignedInUser.avatarColor }} aria-hidden="true">
                  {lastSignedInUser.displayName
                    .split(" ")
                    .map((s) => s.trim()[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <p className="pin-welcome-name">Welcome back,<br /><strong>{lastSignedInUser.displayName}</strong></p>
              </div>
              <p className="forgot-intro">Enter your 4-digit PIN to unlock.</p>
              <div className={`pin-dots-wrap${pinShake ? " pin-shake" : ""}`}>
                <PinDots length={pinEntry.length} />
              </div>
              <PinPad
                onDigit={(d) => { if (!isSubmitting) handlePinDigit(d); }}
                onBackspace={() => { if (!isSubmitting) setPinEntry((prev) => prev.slice(0, -1)); }}
              />
              <div className="account-hint-row">
                <p className="account-hint">
                  Not you? <button type="button" onClick={() => { setStatus(null); setPinEntry(""); setMode("signin"); }}>Sign in with a different account</button>
                </p>
                <p className="account-hint">
                  <button type="button" onClick={() => { setStatus(null); setPinEntry(""); setMode("signin"); }}>Use password instead</button>
                </p>
              </div>
            </div>
          )}

          {mode === "signin" && (
            <form className="account-form" onSubmit={handleSignIn} aria-label="Sign in form">
              <label>
                Email
                <input
                  type="email"
                  required
                  value={signInForm.email}
                  onChange={(event) => setSignInForm({ ...signInForm, email: event.target.value })}
                  placeholder="you@example.com"
                />
                {isLifetimeTester(signInForm.email) && (
                  <span className="lifetime-hint"><span aria-hidden="true">✦ </span>Founding Tester — Lifetime all-access will be granted</span>
                )}
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  value={signInForm.password}
                  onChange={(event) => setSignInForm({ ...signInForm, password: event.target.value })}
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="account-primary" disabled={isSubmitting}>
                {isSubmitting ? "Signing In…" : "Sign In"}
              </button>
              <div className="account-hint-row">
                <p className="account-hint">
                  Need an account? <button type="button" onClick={() => setMode("signup")}>Create one</button>
                </p>
                <p className="account-hint">
                  <button type="button" onClick={() => { setStatus(null); setMode("forgot-password"); }}>Forgot password?</button>
                </p>
              </div>
              {hasPIN && lastSignedInUser && (
                <p className="account-hint" style={{ textAlign: "center" }}>
                  <button type="button" onClick={() => { setStatus(null); setPinEntry(""); setMode("pin"); }}>← Back to PIN unlock</button>
                </p>
              )}
              <aside className="account-sample">
                <strong>Sample accounts</strong>
                <div>
                  <code>mentor@circuitry3d.dev / mentor</code>
                </div>
                <div>
                  <code>builder@circuitry3d.dev / builder</code>
                </div>
              </aside>
            </form>
          )}

          {mode === "signup" && (
            <form className="account-form" onSubmit={handleSignUp} aria-label="Create account form">
              <label>
                Display name
                <input
                  type="text"
                  required
                  value={signUpForm.displayName}
                  onChange={(event) => setSignUpForm({ ...signUpForm, displayName: event.target.value })}
                  placeholder="Circuit Designer"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={signUpForm.email}
                  onChange={(event) => setSignUpForm({ ...signUpForm, email: event.target.value })}
                  placeholder="you@example.com"
                />
                {isLifetimeTester(signUpForm.email) && (
                  <span className="lifetime-hint"><span aria-hidden="true">✦ </span>Founding Tester — Lifetime all-access will be granted</span>
                )}
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  value={signUpForm.password}
                  onChange={(event) => setSignUpForm({ ...signUpForm, password: event.target.value })}
                  placeholder="At least 6 characters"
                />
              </label>
              <label>
                Short bio <span>(optional)</span>
                <textarea
                  value={signUpForm.bio}
                  onChange={(event) => setSignUpForm({ ...signUpForm, bio: event.target.value })}
                  rows={3}
                  placeholder="Tell the community about your builds or interests."
                />
              </label>
              <button type="submit" className="account-primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Account"}
              </button>
              <p className="account-hint">
                Already registered? <button type="button" onClick={() => setMode("signin")}>Sign in</button>
              </p>
            </form>
          )}

          {mode === "forgot-password" && (
            <div className="account-form" aria-label="Reset password">
              {forgotForm.step === 1 ? (
                <form onSubmit={handleForgotStep1} aria-label="Verify email for password reset">
                  <p className="forgot-intro">Enter the email address for your account and we'll let you set a new password.</p>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={forgotForm.email}
                      onChange={(event) => setForgotForm((previous) => ({ ...previous, email: event.target.value }))}
                      placeholder="you@example.com"
                    />
                  </label>
                  <button type="submit" className="account-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Checking…" : "Continue"}
                  </button>
                  <p className="account-hint">
                    <button type="button" onClick={handleCancelForgot}>← Back to Sign In</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleForgotStep2} aria-label="Set new password">
                  <p className="forgot-intro">Choose a new password for <strong>{forgotForm.email}</strong>.</p>
                  <label>
                    New password
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotForm.newPassword}
                      onChange={(event) => setForgotForm((previous) => ({ ...previous, newPassword: event.target.value }))}
                      placeholder="At least 6 characters"
                    />
                  </label>
                  <label>
                    Confirm new password
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotForm.confirmPassword}
                      onChange={(event) => setForgotForm((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                      placeholder="Repeat your new password"
                    />
                  </label>
                  <button type="submit" className="account-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Reset Password"}
                  </button>
                  <p className="account-hint">
                    <button type="button" onClick={() => setForgotForm((previous) => ({ ...previous, step: 1 }))}>← Change email</button>
                  </p>
                </form>
              )}
            </div>
          )}

          {mode === "profile" && currentUser && (
            <section className="account-dashboard" aria-label="Profile overview">
              {isLifetimeTester(currentUser.email) && (
                <div className="lifetime-banner" role="status" aria-label="Lifetime membership active">
                  <span className="lifetime-banner-icon" aria-hidden="true">✦</span>
                  <div>
                    <strong>Founding Tester · Lifetime All-Access</strong>
                    <p>Thank you for being part of the CircuiTry3D founding team. You have permanent, full access to every feature — past, present, and future.</p>
                  </div>
                </div>
              )}
              <div className="profile-card">
                <div className="profile-avatar" style={{ backgroundColor: currentUser.avatarColor }} aria-hidden="true">
                  {currentUser.displayName
                    .split(" ")
                    .map((segment) => segment.trim()[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h2>
                    {currentUser.displayName}
                    {isLifetimeTester(currentUser.email) && (
                      <span className="lifetime-badge" title="Founding Tester — Lifetime All-Access"><span aria-hidden="true">✦ </span>Lifetime</span>
                    )}
                  </h2>
                  <p>{currentUser.email}</p>
                  {currentUser.bio && <p className="profile-bio">{currentUser.bio}</p>}
                  <button type="button" className="account-secondary" onClick={handleSignOut} disabled={isSubmitting}>
                    Sign out
                  </button>
                </div>
              </div>

              <form className="account-form profile-form" onSubmit={handleUpdateProfile} aria-label="Update profile form">
                <h3>Edit profile</h3>
                <label>
                  Display name
                  <input
                    type="text"
                    required
                    value={profileForm.displayName}
                    onChange={(event) => setProfileForm({ ...profileForm, displayName: event.target.value })}
                  />
                </label>
                <label>
                  Bio
                  <textarea
                    rows={4}
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                    placeholder="Share what you are working on or how the lab can help."
                  />
                </label>
                <button type="submit" className="account-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </form>

              {/* PIN management */}
              <div className="account-form pin-management">
                <h3>Quick Unlock PIN</h3>
                <p className="forgot-intro">Set a 4-digit PIN so the app recognises you instantly — no password needed next time.</p>
                {!pinSetup.active ? (
                  <>
                    {hasPIN ? (
                      <div className="pin-status-row">
                        <span className="pin-status-badge">🔐 PIN is active on this device</span>
                        <div className="pin-status-actions">
                          <button
                            type="button"
                            className="account-secondary"
                            disabled={isSubmitting}
                            onClick={() => { setStatus(null); setPinSetupPhase({ active: true, step: "enter", first: "" }); setPinSetupEntry(""); }}
                          >
                            Change PIN
                          </button>
                          <button type="button" className="account-secondary pin-remove-btn" disabled={isSubmitting} onClick={handleClearPIN}>
                            Remove PIN
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="account-primary"
                        disabled={isSubmitting}
                        onClick={() => { setStatus(null); setPinSetupPhase({ active: true, step: "enter", first: "" }); setPinSetupEntry(""); }}
                      >
                        Set up PIN
                      </button>
                    )}
                  </>
                ) : (
                  <div className="pin-setup-inline">
                    <p className="forgot-intro">
                      {pinSetup.step === "enter" ? "Enter a new 4-digit PIN:" : "Confirm your PIN:"}
                    </p>
                    <div className="pin-dots-wrap">
                      <PinDots length={pinSetupEntry.length} />
                    </div>
                    <PinPad
                      onDigit={(d) => { if (!isSubmitting) handlePinSetupDigit(d); }}
                      onBackspace={() => { if (!isSubmitting) setPinSetupEntry((prev) => prev.slice(0, -1)); }}
                    />
                    <p className="account-hint" style={{ textAlign: "center" }}>
                      <button type="button" onClick={() => { setPinSetupPhase({ active: false }); setPinSetupEntry(""); setStatus(null); }}>
                        Cancel
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
