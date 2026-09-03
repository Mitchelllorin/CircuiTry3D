/**
 * Founding-tester allow-list.
 *
 * The addresses themselves are NOT stored here. This repository is public and
 * the bundle ships to every device that installs the app, so a plaintext list
 * of two dozen real people's inboxes was readable by anyone who opened either.
 * What is stored is a SHA-256 digest of each normalised address, namespaced so
 * the digests cannot be matched against a generic precomputed table.
 *
 * What this does: nobody can read the list, or extract it from the bundle.
 * What this does not do: someone who already knows an address can still test
 * whether it is on the list. Membership checks that must resist that belong on
 * a server, behind an authenticated call. This is the client-side floor, not
 * the ceiling.
 */

const HASH_NAMESPACE = "circuitry3d.lifetime.v1:";

/** SHA-256 of `${HASH_NAMESPACE}${email.trim().toLowerCase()}`, hex, sorted. */
const LIFETIME_TESTERS: ReadonlySet<string> = new Set([
  "e4ed41f34a684b80f1f950c4657a87dfc0ea98f84c7772874a7fed4ceb645b22",
  "0f776716fb3041924d30d8447a9935c6cb4760ad8094c770aa26f0b8db320283",
  "6c9c3779f1186b120afe944d81b2526424dc43144fb2ef976e697d3a27622bab",
  "0eb3c6a0e3504ca5631e1db8f82032a872b260a9976fc81e9968c383729f509a",
  "4ac2eb781069b891589f17c83715270e0dbd3e51e95009352fb0c78a6597f477",
  "97451385ad59b07668bb99d659a06d4c6a0316edc7b8ed2f7a30b64b9e9d6c13",
  "cd7536ab9d03b37911795a19d00e261d9ecf88bda386c37df0263460e9d9395f",
  "938170d77b419d6cfe51442a349452d454a5c62a18ac79ce60b589a9918b9bdd",
  "fb3b31e5128db309bf12dd076fb8cfcabf026fb5720a3ebc67d99ee81a3d3518",
  "273026f3dd36a96ba63907bce5de617ef96b611b21d629e2e8afbea1f3a8af2f",
  "c2da7868fffa24a0c9e81f6b6669dc3a5979cdb3f2bb650f8e2dbd7f19eab532",
  "b8b11d782f56cf212d1e2aba32c107e4ae9cee648273215306ddc28bb72d6470",
  "9743bf8fd4dd7fcba1ec901f06e7c5a75cb397f93bbdfed911bba398fe78fe9b",
  "5290eedf16fe286a8ed3531e4af79cbf40454932da3dfab6c13d2880a97922be",
  "4de91fc6212b7473797180a939c5d225cac34aff48d6eb12f145e8ebb728272e",
  "b8cece713858287c714a92b92379668e5ba3c991515d69ce60d97890d4c4c6b5",
  "59fba9c5f3257de071d42601a1f7ae8aa25e1f02009a5c44452385a03cc24c41",
  "d6d24e97f20ffab2bc4c132cebc5837d9ceb16bb8c6d3cb01b01606916d910c5",
  "bc94d63959f42faadda883197741c0903b382959d6e26ffaf042140a7889d7b7",
  "71d6fe1fb13c1236018d1370e5bb83079a154fdc1fb3e4a9ef726d0cbee93bac",
  "4d62f000e887c1061565315366f38989d4412c1fe936c775e617e8df3ce12ba8",
  "d0db8107cacbe7057dbd5db88975954e24fc332c9cba9c47e13656096b2f0eb7",
  "1a42a6ef207987570e1522bb883504197fc46901ff55e5200e37fca0495cba5e",
  "e7736e0c1cbbdbb4c662f87a827fe024511170e690da65bf048be4c1ef020ade",
]);

// ── SHA-256 ─────────────────────────────────────────────────────────────────
// Synchronous by necessity: isLifetimeTester is called during render, and
// crypto.subtle.digest is promise-based. FIPS 180-4, no dependencies.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const len = bytes.length;
  const blocks = Math.ceil((len + 9) / 64);
  const total = blocks * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;

  const view = new DataView(buf.buffer);
  const bitLen = len * 8;
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(total - 4, bitLen >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const a15 = w[t - 15];
      const a2 = w[t - 2];
      const s0 = rotr(a15, 7) ^ rotr(a15, 18) ^ (a15 >>> 3);
      const s1 = rotr(a2, 17) ^ rotr(a2, 19) ^ (a2 >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => x.toString(16).padStart(8, "0"))
    .join("");
}

/** Returns true if the given email belongs to a founding tester. */
export function isLifetimeTester(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return false;
  return LIFETIME_TESTERS.has(sha256Hex(HASH_NAMESPACE + normalised));
}
