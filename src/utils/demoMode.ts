/**
 * Demo mode utilities.
 *
 * The GitHub Pages web build is a demo/preview version with a limited set of
 * components. The full component library is available in the Play Store release.
 *
 * Set VITE_DEMO_MODE=true at build time (see .env.production) to enable demo
 * mode. When the flag is absent or false the full component set is used.
 */

/**
 * True when the app is running in demo/preview mode.
 * Determined entirely at build time — no runtime unlock mechanism.
 */
export const IS_DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE === "true";

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
 * 4. Push the change — the deployment workflow will rebuild automatically.
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
