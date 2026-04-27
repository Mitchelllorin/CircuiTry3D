/**
 * Owner Access — password-gated lifetime-tier unlock.
 *
 * Works on every deployment (GitHub Pages, Vercel, Android) regardless of
 * whether demo mode is active.  Navigate to /#/owner to open the password
 * prompt.
 *
 * ── Configuration ─────────────────────────────────────────────────────────────
 *
 * Simplest (plaintext password):
 *   Set VITE_OWNER_KEY=YourPassword as a build-time env variable.
 *
 *   GitHub Actions — add OWNER_KEY as a repository secret, then expose it in
 *   your workflow:
 *     env:
 *       VITE_OWNER_KEY: ${{ secrets.OWNER_KEY }}
 *
 *   Vercel — add VITE_OWNER_KEY as a project environment variable.
 *
 * More obscured (hashed password):
 *   Compute the SHA-256 hex digest of your password:
 *     macOS/Linux:  echo -n "YourPassword" | shasum -a 256
 *     PowerShell:   [System.BitConverter]::ToString(
 *                     [System.Security.Cryptography.SHA256]::Create()
 *                       .ComputeHash([System.Text.Encoding]::UTF8.GetBytes("YourPassword"))
 *                   ).Replace("-","").ToLower()
 *   Then set VITE_OWNER_KEY_HASH=<hex-digest>.
 *
 * VITE_OWNER_KEY takes precedence over VITE_OWNER_KEY_HASH when both are set.
 */

import {
  OWNER_KEY_HASH_CONFIGURED,
  OWNER_STORAGE_KEY,
  verifyOwnerPassword as _verifyOwnerPassword,
} from "./demoMode";
import { setStoredTier, getStoredTier } from "./playStoreBilling";

// Re-export so consumers only need one import.
export { OWNER_KEY_HASH_CONFIGURED as OWNER_ACCESS_CONFIGURED };
export { _verifyOwnerPassword as verifyOwnerPassword };

/** Separate localStorage key for the permanent owner-access flag. */
const OWNER_ACCESS_FLAG_KEY = "circuitry3d.ownerAccess";

/** Returns true when this browser session has been granted owner access. */
export function hasOwnerAccess(): boolean {
  try {
    return window.localStorage.getItem(OWNER_ACCESS_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persist owner access for this browser and upgrade the subscription tier to
 * "lifetime".  Call only after a successful `verifyOwnerPassword`.
 */
export function grantOwnerAccess(): void {
  try {
    // Flag used by hasOwnerAccess() / the OwnerAccess page.
    window.localStorage.setItem(OWNER_ACCESS_FLAG_KEY, "1");
    // Flag used by demoMode.ts — disables demo-mode gate if active.
    window.localStorage.setItem(OWNER_STORAGE_KEY, "true");
  } catch {
    // ignore storage errors
  }
  setStoredTier("lifetime");
  window.dispatchEvent(new Event("circuitry3d:tierChanged"));
}

/**
 * Remove owner access from this browser session and revert the subscription
 * tier to "free" (only if it was granted by owner access).
 */
export function revokeOwnerAccess(): void {
  try {
    window.localStorage.removeItem(OWNER_ACCESS_FLAG_KEY);
    window.localStorage.removeItem(OWNER_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (getStoredTier() === "lifetime") {
    setStoredTier("free");
    window.dispatchEvent(new Event("circuitry3d:tierChanged"));
  }
}
