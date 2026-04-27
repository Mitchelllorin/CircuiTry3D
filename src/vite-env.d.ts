/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" at build time to enable demo/preview mode. */
  readonly VITE_DEMO_MODE: string;
  /**
   * Plaintext owner password, injected at build time (e.g. from a GitHub
   * Actions secret or Vercel environment variable).  Simplest to configure —
   * just set VITE_OWNER_KEY to your chosen password.  Takes precedence over
   * VITE_OWNER_KEY_HASH when both are provided.
   */
  readonly VITE_OWNER_KEY: string;
  /**
   * SHA-256 hex digest of the owner password, injected at build time from the
   * OWNER_KEY_HASH GitHub Actions secret.  When empty the owner-unlock button
   * is hidden (not configured).
   */
  readonly VITE_OWNER_KEY_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

