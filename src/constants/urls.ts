export const SITE_ORIGIN = "https://circuitry3d.app";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.circuitry3d.app";

/**
 * The public marketing home — the address shown to a person.
 *
 * Same value as SITE_ORIGIN, and that is now the point: circuitry3d.net went
 * dead on 2026-08-30 and everything moved to circuitry3d.app, so the marketing
 * home and the origin Play Console has on file for /privacy, /data-safety and
 * /delete-account are finally one domain. They stay two constants because they
 * answer two different questions — "where do we send a reader?" and "what
 * origin do the legal pages live on?" — and those could diverge again.
 */
export const APP_SITE_URL = SITE_ORIGIN;
export const APP_SITE_LABEL = "circuitry3d.app";

/** Sibling sites from the same maker — a credit, not a cross-sell. */
export const STUDIO_SITES = [
  { label: "ThePrints3D.com", href: "https://theprints3d.com" },
  { label: "Automotive3D.ca", href: "https://automotive3d.ca" },
] as const;
