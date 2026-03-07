/**
 * Demo mode utilities.
 *
 * The Vercel-hosted web build is a demo/preview version with a limited set of
 * components. The full component library is available in the Play Store release.
 *
 * Set VITE_DEMO_MODE=true at build time (see .env.production) to enable demo
 * mode. When the flag is absent or false the full component set is used.
 *
 * The owner can unlock the full version at runtime by authenticating via the
 * /api/owner endpoint. The unlock is persisted in localStorage under
 * OWNER_STORAGE_KEY and is checked on every page load.
 *
 * To reset back to demo mode append ?demo_reset to any URL (e.g.
 * https://circuitry3d.vercel.app/?demo_reset).
 */

/** localStorage key that stores the owner-unlock flag. */
export const OWNER_STORAGE_KEY = "circuitry3d_owner_unlocked";

/** Returns true when the owner has unlocked full access via /api/owner. */
function isOwnerUnlocked(): boolean {
  try {
    // Handle ?demo_reset — clear the unlock and redirect to the clean URL.
    if (typeof location !== "undefined" && new URLSearchParams(location.search).has("demo_reset")) {
      localStorage.removeItem(OWNER_STORAGE_KEY);
      const url = new URL(location.href);
      url.searchParams.delete("demo_reset");
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
