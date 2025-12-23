import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandMark from "../components/BrandMark";
import type { FormEvent } from "react";
import "../styles/account.css";

type Mode = "signin" | "signup" | "profile";

export default function Account() {
  const { currentUser, loading, signIn, signUp, signOut, updateProfile } = useAuth();
  const [mode, setMode] = useState<Mode>(currentUser ? "profile" : "signin");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ email: "", password: "", displayName: "", bio: "" });
  const [profileForm, setProfileForm] = useState({ displayName: currentUser?.displayName ?? "", bio: currentUser?.bio ?? "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setMode("profile");
      setProfileForm({ displayName: currentUser.displayName, bio: currentUser.bio ?? "" });
    }
  }, [currentUser]);

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
    setMode("signin");
    setStatus({ type: "success", message: "Signed out." });
  };

  const modeLabel = useMemo(() => {
    switch (mode) {
      case "signin":
        return "Sign In";
      case "signup":
        return "Create Account";
      case "profile":
        return "Your Account";
      default:
        return "Account";
    }
  }, [mode]);

  return (
    <div className="account-page">
      <header className="account-header">
        <div>
          <BrandMark size="sm" decorative className="account-brand" />
          <span className="account-eyebrow">User Accounts</span>
          <h1>{modeLabel}</h1>
          <p>Join the community to chat, share circuits, and sync your builds across devices.</p>
        </div>
        <div className="account-switcher" role="tablist" aria-label="Account modes">
          <button
            type="button"
            className={mode === "signin" ? "tab-button is-active" : "tab-button"}
            onClick={() => setMode("signin")}
            disabled={isSubmitting}
            role="tab"
            aria-selected={mode === "signin"}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "tab-button is-active" : "tab-button"}
            onClick={() => setMode("signup")}
            disabled={isSubmitting}
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
              <p className="account-hint">
                Need an account? <button type="button" onClick={() => setMode("signup")}>Create one</button>
              </p>
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

          {mode === "profile" && currentUser && (
            <section className="account-dashboard" aria-label="Profile overview">
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
                  <h2>{currentUser.displayName}</h2>
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
