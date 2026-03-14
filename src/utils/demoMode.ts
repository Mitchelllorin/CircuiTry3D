/**
 * Demo mode utilities.
 *
 * The GitHub Pages web build is a demo/preview version with a limited set of
 * components. The full component library is available in the Play Store release.
 *
 * Set VITE_DEMO_MODE=true at build time (see .env.production) to enable demo
 * mode. When the flag is absent or false the full component set is used.
 *
 * The owner can unlock the full version at runtime by entering their password
 * in the DemoBanner dialog.  The password is verified client-side against
 * VITE_OWNER_KEY_HASH (the SHA-256 hex digest of the owner password, injected
 * at build time from the OWNER_KEY_HASH GitHub Actions secret).  On success
 * the unlock flag is persisted in localStorage under OWNER_STORAGE_KEY.
 *
 * To reset back to demo mode append ?demo_reset to any URL (e.g.
 * https://demo.circuitry3d.net/?demo_reset).
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
 * False when the build flag is off OR when the owner has authenticated.
 */
export const IS_DEMO_MODE: boolean = BUILD_IS_DEMO && !isOwnerUnlocked();

/**
 * Component IDs that are available in the demo version.
 * All other components are unlocked in the full Play Store release.
 */
export const DEMO_COMPONENT_IDS: readonly string[] = [
  "battery",
  "resistor",
  "led",
  "switch",
  "ground",
  "junction",
] as const;

/**
 * The SHA-256 hex digest of the owner password, embedded at build time.
 * Empty when the OWNER_KEY_HASH secret was not provided during the build.
 */
const OWNER_KEY_HASH = (import.meta.env.VITE_OWNER_KEY_HASH ?? "").trim();

/**
 * True when an owner key hash has been configured in this build.
 * Used by DemoBanner to decide whether to show the 🔑 unlock button.
 */
export const OWNER_KEY_HASH_CONFIGURED: boolean = OWNER_KEY_HASH.length > 0;

/**
 * Verifies the supplied owner password client-side by hashing it with
 * SHA-256 and comparing the result to the build-time VITE_OWNER_KEY_HASH.
 *
 * Uses the Web Crypto API (available in all modern browsers and in the Vite
 * dev/preview server environment).  Returns false immediately when
 * OWNER_KEY_HASH is not configured in this build.
 */
export async function verifyOwnerPassword(password: string): Promise<boolean> {
  if (!OWNER_KEY_HASH) return false;
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(password.trim())
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time comparison: XOR every character code and OR into diff.
  // SHA-256 hex output is always 64 chars; if lengths somehow differ, fold
  // the mismatch into diff without an early return to avoid leaking length.
  let diff = hashHex.length !== OWNER_KEY_HASH.length ? 1 : 0;
  const len = Math.min(hashHex.length, OWNER_KEY_HASH.length);
  for (let i = 0; i < len; i++) {
    diff |= hashHex.charCodeAt(i) ^ OWNER_KEY_HASH.charCodeAt(i);
  }
  return diff === 0;
}
