import type { ReactNode } from "react";

/**
 * The mode bar's mark set — thin monochrome glyphs, drawn rather than modelled.
 *
 * These replace the rendered 3D icons for the same reason ThePrints3D's rail
 * draws its marks: at nav size a glyph takes the bar's own ink, so it reads at a
 * glance instead of carrying a studio's cyan rim into the dark strip. Nothing
 * here has a colour, a gradient or a filter of its own — `currentColor` means
 * the tab decides (dim, hover, active), and the one shadow is separation.
 */
export type NavGlyphName =
  | "build"
  | "practice"
  | "troubleshoot"
  | "arena"
  | "learn"
  | "help"
  | "wire-guide"
  | "textbook"
  | "pricing"
  | "arcade"
  | "classroom"
  | "community"
  | "gallery"
  | "account"
  | "settings"
  | "sun"
  | "moon";

const GLYPHS: Partial<Record<string, ReactNode>> = {
  // A resistor between two leads — the most basic thing the builder builds.
  build: (
    <>
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M6 12l1.6-3.6 2.5 7.2 2.4-7.2 2.5 7.2L16.6 12" />
    </>
  ),
  // A worksheet with lines on it: the thing Practice hands you.
  practice: (
    <>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M8.6 12h6.8M8.6 15.4h4.6" />
    </>
  ),
  // Magnifier with a fault in what it found.
  troubleshoot: (
    <>
      <circle cx="10.4" cy="10.4" r="6.4" />
      <path d="M15.2 15.2 21 21" />
      <path d="M11 7.2 8.9 11.1h2.8L10 14.6l3.5-4.4h-2.8z" />
    </>
  ),
  // The bolt, as the reference rail draws it.
  arena: <path d="M13.4 2.5 5.6 13.2h5l-.9 8.3 8.3-11h-5.1z" />,
  learn: (
    <>
      <path d="M2.8 8.6 12 4.2l9.2 4.4L12 13z" />
      <path d="M6.4 10.6v4.5c0 1.9 2.5 3.2 5.6 3.2s5.6-1.3 5.6-3.2v-4.5" />
      <path d="M21.2 8.6v5.4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.5 9.3a2.7 2.7 0 1 1 3.9 2.5c-.9.5-1.4 1.1-1.4 2.1" />
      <path d="M12 17.1h.01" />
    </>
  ),
  // A spool with a tail — wire, not a gauge dial.
  "wire-guide": (
    <>
      <ellipse cx="11.6" cy="7.4" rx="7.4" ry="2.6" />
      <path d="M4.2 7.4v5.9c0 1.4 3.3 2.6 7.4 2.6s7.4-1.2 7.4-2.6V7.4" />
      <path d="M11.6 15.9v2.3c0 1.2-1 2.1-2.2 2.1H6.6" />
    </>
  ),
  textbook: (
    <>
      <path d="M12 6.5C10 4.9 7.3 4.2 4 4.4v13.4c3.3-.2 6 .5 8 2.1 2-1.6 4.7-2.3 8-2.1V4.4c-3.3-.2-6 .5-8 2.1Z" />
      <path d="M12 6.5v13.4" />
    </>
  ),
  pricing: (
    <>
      <path d="M20.4 3.6h-6.8L3.6 13.5a1.8 1.8 0 0 0 0 2.5l4.4 4.4a1.8 1.8 0 0 0 2.5 0L20.4 10.4z" />
      <circle cx="16.1" cy="7.7" r="1.3" />
    </>
  ),
  arcade: (
    <>
      <path d="M6.4 19.6h11.2l-1.7-3.2H8.1z" />
      <path d="M12 16.4v-6" />
      <circle cx="12" cy="8.2" r="2.3" />
    </>
  ),
  classroom: (
    <>
      <rect x="3" y="4" width="18" height="12.4" rx="1.2" />
      <path d="M7 8.4h6M7 11.4h4" />
      <path d="M7.6 16.4 6 20M16.4 16.4 18 20" />
    </>
  ),
  community: (
    <>
      <circle cx="9.2" cy="8.4" r="3" />
      <path d="M3.6 20c0-3.1 2.5-5.5 5.6-5.5s5.6 2.4 5.6 5.5" />
      <path d="M15.4 5.9a3 3 0 0 1 0 5.8" />
      <path d="M17.1 14.8c2 .7 3.4 2.5 3.4 4.6" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="1.6" />
      <circle cx="8.4" cy="9.6" r="1.6" />
      <path d="M4.4 17.6 9.5 12l4 4.4 2.8-2.6 3.4 3.8" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.8 20.5c0-3.6 3.2-6.5 7.2-6.5s7.2 2.9 7.2 6.5" />
    </>
  ),
  // Sliders rather than a gear: a gear at 20px is a cog-shaped smudge, and the
  // theme toggle sits beside Settings — two round marks there would twin.
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="17" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4Z" />,
};

type Props = {
  name: string;
  className?: string;
};

/** One nav mark. Decorative — the tab that holds it carries the name. */
export function NavGlyph({ name, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name] ?? GLYPHS.help}
    </svg>
  );
}

export default NavGlyph;
