/**
 * Demo mode utilities.
 *
 * The Vercel-hosted web build is a demo/preview version with a limited set of
 * components. The full component library is available in the Play Store release.
 *
 * Set VITE_DEMO_MODE=true at build time (see .env.production) to enable demo
 * mode. When the flag is absent or false the full component set is used.
 */

export const IS_DEMO_MODE: boolean =
  import.meta.env.VITE_DEMO_MODE === "true";

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
