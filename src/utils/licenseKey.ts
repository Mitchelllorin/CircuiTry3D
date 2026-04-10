/**
 * App license public key.
 *
 * This RSA-2048 public key is embedded in the app binary for license
 * verification.  The corresponding private key is held by the license server;
 * only signatures produced by that private key will verify successfully here.
 *
 * Usage:
 *   import { importLicensePublicKey, verifyLicenseSignature } from "./licenseKey";
 *
 *   const key = await importLicensePublicKey();
 *   const valid = await verifyLicenseSignature(key, signatureBytes, dataBytes);
 */

// ── Public key ────────────────────────────────────────────────────────────────

/**
 * RSA-2048 public key in PEM format (SubjectPublicKeyInfo / SPKI).
 * Used to verify license tokens issued by the CircuiTry3D license server.
 */
export const LICENSE_PUBLIC_KEY_PEM =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvyQ7YEJovHjb/8Mzi9fB\n" +
  "uaCljONodgoxGu2eatg7WEMIBrBwq3z6mzDEN+KIjegiESp1iWEv/SgnlVJMjKXR\n" +
  "Gj6l5UQ4r4H4onAXOJ/DdnT6etRcjEVYLxh/u8TWIMiTi+Wr0i0j7Xck97+gWPf\n" +
  "yPn9ywtpdS0qiVGeNYBTUzYCeI9ETjoWxhYhZ/Zgc0JtZoQWSu7qe4h0r0bFF0EK\n" +
  "oPaQzCrql3smzD+Q0OJuQWxKHUjbGUP9E6UbYyUUf5ROkA/ly9VCk5wEvcDi9XQ7\n" +
  "NdajYfoHgazkqfW+JI7rzlQZayXyVSACrGk32sgUgqDw0N0d/j7BSRgP6BixiejZ\n" +
  "0zQIDAQAB\n" +
  "-----END PUBLIC KEY-----";

/**
 * Base64-encoded DER bytes of the public key (SPKI format).
 * Suitable for direct use with `crypto.subtle.importKey`.
 */
export const LICENSE_PUBLIC_KEY_BASE64 =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvyQ7YEJovHjb/8Mzi9fB" +
  "uaCljONodgoxGu2eatg7WEMIBrBwq3z6mzDEN+KIjegiESp1iWEv/SgnlVJMjKXR" +
  "Gj6l5UQ4r4H4onAXOJ/DdnT6etRcjEVYLxh/u8TWIMiTi+Wr0i0j7Xck97+gWPf" +
  "yPn9ywtpdS0qiVGeNYBTUzYCeI9ETjoWxhYhZ/Zgc0JtZoQWSu7qe4h0r0bFF0EK" +
  "oPaQzCrql3smzD+Q0OJuQWxKHUjbGUP9E6UbYyUUf5ROkA/ly9VCk5wEvcDi9XQ7" +
  "NdajYfoHgazkqfW+JI7rzlQZayXyVSACrGk32sgUgqDw0N0d/j7BSRgP6BixiejZ" +
  "0zQIDAQAB";

// ── Web Crypto helpers ────────────────────────────────────────────────────────

/**
 * Import the embedded license public key as a Web Crypto `CryptoKey`.
 *
 * The returned key can be used with `crypto.subtle.verify` to check
 * RSA-PSS or RSASSA-PKCS1-v1_5 signatures produced by the license server.
 *
 * @param algorithm - RSA signing algorithm used by the license server.
 *   Defaults to `"RSASSA-PKCS1-v1_5"` with SHA-256.
 * @returns A `CryptoKey` ready for signature verification.
 */
export async function importLicensePublicKey(
  algorithm: "RSASSA-PKCS1-v1_5" | "RSA-PSS" = "RSASSA-PKCS1-v1_5"
): Promise<CryptoKey> {
  const binaryStr = atob(LICENSE_PUBLIC_KEY_BASE64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: algorithm, hash: "SHA-256" },
    /* extractable */ false,
    ["verify"]
  );
}

/**
 * Verify a license signature against the embedded public key.
 *
 * @param key        - `CryptoKey` returned by `importLicensePublicKey`.
 * @param signature  - Raw signature bytes produced by the license server.
 * @param data       - The exact bytes that were signed (e.g. license payload).
 * @param algorithm  - Must match the algorithm used when importing the key.
 * @returns `true` if the signature is valid; `false` otherwise.
 */
export async function verifyLicenseSignature(
  key: CryptoKey,
  signature: BufferSource,
  data: BufferSource,
  algorithm: "RSASSA-PKCS1-v1_5" | "RSA-PSS" = "RSASSA-PKCS1-v1_5"
): Promise<boolean> {
  try {
    const algoParam =
      algorithm === "RSA-PSS"
        ? ({ name: "RSA-PSS", saltLength: 32 } as RsaPssParams)
        : algorithm;
    return await crypto.subtle.verify(algoParam, key, signature, data);
  } catch {
    return false;
  }
}
