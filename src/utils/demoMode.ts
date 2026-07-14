/**
 * Demo mode utilities.
 *
 * VITE_DEMO_MODE=true at build time restricts the component palette to the 6
 * free components (battery, resistor, LED, switch, ground, junction).
 *
 * Two unlock paths:
 *  1. Android AAB — user purchases the one-time "premium_unlock" in-app
 *     product via Google Play.  purchasePremiumUnlock() persists the
 *     purchase in localStorage; the app reloads so IS_DEMO_MODE re-evaluates.
 *  2. Web demo — owner enters the owner password in the DemoBanner dialog.
 *
 * Build-time env vars:
 *   VITE_DEMO_MODE=true      — enables demo mode (set in .env.capacitor and
 *                               via Vercel env variables for the web preview).
 *   VITE_OWNER_KEY_HASH=...  — SHA-256 hex digest of the owner password
 *                               (Vercel / GitHub Actions secret; optional).
 *
 * To reset back to demo mode append ?demo_reset to any URL.
 */

/** localStorage key that stores the owner-unlock flag. */
export const OWNER_STORAGE_KEY = "circuitry3d_owner_unlocked";

/**
 * Returns true when the owner has unlocked full access.
 * Handles ?demo_reset to revoke a stored unlock token.
 */
function isOwnerUnlocked(): boolean {
  try {
    if (typeof location === "undefined") {
      return false;
    }
    // Handle ?demo_reset — clear the unlock and redirect to the clean URL.
    // The parameter may appear in the regular query string (before #) or
    // inside the hash portion (e.g. /#/?demo_reset) when using HashRouter.
    const hashPrefix = /^#\/?/;
    const hasDemoReset =
      new URLSearchParams(location.search).has("demo_reset") ||
      new URLSearchParams(location.hash.replace(hashPrefix, "")).has(
        "demo_reset"
      );
    if (hasDemoReset) {
      localStorage.removeItem(OWNER_STORAGE_KEY);
      const url = new URL(location.href);
      url.searchParams.delete("demo_reset");
      // Also strip it from the hash if present.
      if (url.hash) {
        const hashParams = new URLSearchParams(
          url.hash.replace(hashPrefix, "")
        );
        hashParams.delete("demo_reset");
        const newHash = hashParams.toString();
        url.hash = newHash ? `/${newHash}` : "/";
      }
      location.replace(url.toString());
      return false;
    }
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(OWNER_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

const BUILD_IS_DEMO: boolean = import.meta.env.VITE_DEMO_MODE === "true";

/**
 * True when the app is running in demo/preview mode.
 *
 * Returns false when any of the following is true:
 *   - VITE_DEMO_MODE is not set to "true" at build time.
 *   - The owner has authenticated via the DemoBanner password dialog
 *     (web only; token stored in localStorage under OWNER_STORAGE_KEY).
 *   - The user has purchased the one-time "premium_unlock" in-app product
 *     on Android (token stored in localStorage under PREMIUM_UNLOCK_KEY from
 *     playStoreBilling.ts).
 *
 * Note: this is a module-level constant, evaluated once on import.  After a
 * purchase the app must reload (window.location.reload) for the change to
 * take effect; Builder.tsx handles this on the circuitry3d:premiumUnlocked event.
 */

/** localStorage key for the one-time Premium Unlock purchase — mirrors the
 *  PREMIUM_UNLOCK_KEY constant in playStoreBilling.ts.  Kept in sync here to
 *  avoid importing the entire billing module at this early stage of
 *  initialisation (demoMode.ts is loaded before React and Capacitor are ready). */
const _PREMIUM_UNLOCK_KEY = "circuitry3d_premium_unlock";

export const IS_DEMO_MODE: boolean = (() => {
  if (!BUILD_IS_DEMO) return false;
  if (isOwnerUnlocked()) return false;
  try {
    if (localStorage.getItem(_PREMIUM_UNLOCK_KEY) === "true") return false;
  } catch {
    // localStorage unavailable (e.g. SSR / private mode edge case)
  }
  return true;
})();

/**
 * Component IDs available in the web demo version.
 * All 27 builder components are included — no component is restricted in the web demo.
 * The Play Store release provides the native Android experience with offline support.
 */
export const DEMO_COMPONENT_IDS: readonly string[] = [
  "battery",
  "ac_source",
  "resistor",
  "capacitor",
  "capacitor-ceramic",
  "inductor",
  "diode",
  "zener-diode",
  "photodiode",
  "led",
  "thermistor",
  "crystal",
  "bjt",
  "bjt-npn",
  "bjt-pnp",
  "darlington",
  "mosfet",
  "switch",
  "fuse",
  "potentiometer",
  "lamp",
  "motor",
  "speaker",
  "opamp",
  "transformer",
  "ground",
  "junction",
] as const;

/**
 * Hardcoded SHA-256 hex digest of the owner password.
 *
 * ── HOW TO CHANGE YOUR PASSWORD ───────────────────────────────────────────────
 * 1. Choose your new password.
 * 2. Compute its SHA-256 hex digest:
 *      macOS / Linux:  echo -n "YourNewPassword" | sha256sum
 *      Windows PowerShell:
 *        [System.BitConverter]::ToString(
 *          [System.Security.Cryptography.SHA256]::Create()
 *            .ComputeHash([System.Text.Encoding]::UTF8.GetBytes("YourNewPassword"))
 *        ).Replace("-","").ToLower()
 * 3. Replace the string below with the 64-character hex output.
 * 4. Push the change — Vercel will redeploy automatically.
 *
 * No environment variables are needed. The hash is baked directly into the
 * build so it works on every deployment platform (Vercel, GitHub Pages,
 * Android) without any additional configuration.
 *
 * Current password: CircuiTry3D-Owner-2024
 */
const HARDCODED_OWNER_HASH = "dc45fee1a9aa11406ece932cef43ea500347ec3c49a145b425d0842be0b8d6c6";

/**
 * Optional env-var overrides — only used when explicitly set.
 * VITE_OWNER_KEY (plaintext) takes precedence; VITE_OWNER_KEY_HASH (SHA-256
 * hex) overrides the hardcoded hash.  Leave both unset to use the hash above.
 */
const OWNER_KEY_HASH = ((import.meta.env.VITE_OWNER_KEY_HASH ?? "").trim() || HARDCODED_OWNER_HASH);
const OWNER_KEY_PLAIN = (import.meta.env.VITE_OWNER_KEY ?? "").trim();

/**
 * Always true — the hash is hardcoded so owner access is always configured.
 * Used by DemoBanner to decide whether to show the 🔑 unlock button.
 */
export const OWNER_KEY_HASH_CONFIGURED: boolean = true;

/**
 * Verifies the supplied owner password client-side.
 *
 * Priority:
 *   1. VITE_OWNER_KEY (plaintext env var) — if set, compared directly.
 *   2. VITE_OWNER_KEY_HASH (SHA-256 env var) — if set, used instead of hardcoded hash.
 *   3. Hardcoded hash (HARDCODED_OWNER_HASH above) — always present as fallback.
 */
export async function verifyOwnerPassword(password: string): Promise<boolean> {
  const trimmed = password.trim();

  // Plaintext check (VITE_OWNER_KEY env var, if set).
  if (OWNER_KEY_PLAIN) {
    let diff = trimmed.length !== OWNER_KEY_PLAIN.length ? 1 : 0;
    const len = Math.min(trimmed.length, OWNER_KEY_PLAIN.length);
    for (let i = 0; i < len; i++) {
      diff |= trimmed.charCodeAt(i) ^ OWNER_KEY_PLAIN.charCodeAt(i);
    }
    return diff === 0;
  }

  // Hash-based check — uses env-var override or hardcoded hash.
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(trimmed));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time comparison to avoid leaking length or early-exit timing.
  let diff = hashHex.length !== OWNER_KEY_HASH.length ? 1 : 0;
  const len = Math.min(hashHex.length, OWNER_KEY_HASH.length);
  for (let i = 0; i < len; i++) {
    diff |= hashHex.charCodeAt(i) ^ OWNER_KEY_HASH.charCodeAt(i);
  }
  return diff === 0;
}
