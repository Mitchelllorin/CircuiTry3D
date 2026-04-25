/**
 * Hybrid monetisation tier definitions for the CircuiTry3D Pricing Page.
 *
 * CONSUMER TIERS — backed by Google Play Billing.
 *   Prices shown here are USD fallbacks; on Android, live localised prices
 *   are fetched from BillingClient and override these values.
 *
 * ENTERPRISE TIERS — no in-app purchase; show "Contact Sales" instead.
 *
 * FEATURE COMPARISON — rows used in the feature-comparison table.
 */

import {
  PREMIUM_UNLOCK_SKU,
  SUB_MONTHLY_SKU,
  SUB_YEARLY_SKU,
} from "../utils/playStoreBilling";

// ── Consumer tiers ────────────────────────────────────────────────────────────

/** A row in the feature comparison table for a consumer tier. */
export interface ConsumerFeatureValue {
  /** Whether the tier includes this feature at all. */
  included: boolean;
  /** Optional short label (e.g. "1 slot", "Unlimited"). Overrides the check/cross icon. */
  label?: string;
}

/** One consumer pricing tier. */
export interface ConsumerTier {
  id: "free" | "premium" | "pro";
  name: string;
  /** Emoji icon used as a placeholder badge. */
  icon: string;
  /** Optional badge label shown on the card (e.g. "Best Value"). */
  badge?: string;
  /** Static fallback price shown when live BillingClient prices are unavailable (monthly for Pro). */
  staticPriceFallback: string;
  /** Static fallback yearly price (Pro only) when live BillingClient prices are unavailable. */
  staticYearlyPriceFallback?: string;
  /** Play Store product SKU. Undefined for the Free tier. */
  sku?: string;
  /**
   * For the Pro subscription tier only: both monthly and yearly SKUs so the
   * yearly price can be auto-calculated from the monthly price.
   * Only present when `purchaseType` is "subscription".
   */
  skus?: { monthly: string; yearly: string };
  /** "one_time" for a permanent unlock; "subscription" for recurring; undefined for free. */
  purchaseType?: "one_time" | "subscription";
  features: string[];
}

export const CONSUMER_TIERS: ConsumerTier[] = [
  {
    id: "free",
    name: "Free Tier",
    icon: "🔌",
    staticPriceFallback: "Free",
    features: [
      "Basic components only",
      "1 save slot",
      "No advanced physics",
      "No premium components",
      "No cloud save",
      "No pro tools",
    ],
  },
  {
    id: "premium",
    name: "Premium Unlock",
    icon: "⚡",
    badge: "One-Time",
    staticPriceFallback: "$6.99",
    sku: PREMIUM_UNLOCK_SKU,
    purchaseType: "one_time",
    features: [
      "All components unlocked",
      "Unlimited save slots",
      "Advanced physics",
      "All templates",
      "All future components",
    ],
  },
  {
    id: "pro",
    name: "Pro Subscription",
    icon: "🚀",
    badge: "Best Value",
    staticPriceFallback: "$1.50 / mo",
    staticYearlyPriceFallback: "$14.99 / yr",
    skus: { monthly: SUB_MONTHLY_SKU, yearly: SUB_YEARLY_SKU },
    purchaseType: "subscription",
    features: [
      "Everything in Premium Unlock",
      "Cloud save",
      "Early access to new components",
      "Exclusive templates",
      "Pro tools (oscilloscope, multimeter, logic analyzer, waveform generator)",
      "Priority support",
    ],
  },
];

// ── Enterprise tiers ──────────────────────────────────────────────────────────

/** One enterprise tier (Contact Sales — no in-app purchase). */
export interface EnterpriseTier {
  id: "component-arena" | "education-arena" | "manufacturing-arena";
  name: string;
  /** Emoji icon used as a placeholder badge. */
  icon: string;
  /** Short badge label. */
  badge: string;
  description: string[];
  contactMailto: string;
  /**
   * Optional "starting at" price shown on the enterprise card so users can
   * gauge cost before clicking through to the full pricing details.
   * E.g. "From $9 / mo"
   */
  startingPrice?: string;
}

export const ENTERPRISE_TIERS: EnterpriseTier[] = [
  {
    id: "component-arena",
    name: "Component Arena",
    icon: "🏭",
    badge: "Manufacturer",
    startingPrice: "From $149 / mo",
    description: [
      "Branded components",
      "Sponsored placements",
      "OEM component packs",
      "Analytics for manufacturers",
    ],
    contactMailto:
      "mailto:info@circuitry3d.net?subject=Component%20Arena%20Inquiry",
  },
  {
    id: "education-arena",
    name: "Education Arena",
    icon: "🏫",
    badge: "Classroom",
    startingPrice: "From $9 / mo",
    description: [
      "Classroom management",
      "Shared circuits",
      "Assignments",
      "Multi-seat licensing",
    ],
    contactMailto:
      "mailto:info@circuitry3d.net?subject=Education%20Arena%20Inquiry",
  },
  {
    id: "manufacturing-arena",
    name: "Manufacturing Arena",
    icon: "⚙️",
    badge: "Enterprise",
    description: [
      "Enterprise simulation modules",
      "OEM workflows",
      "Custom component packs",
      "White-label builds",
    ],
    contactMailto:
      "mailto:info@circuitry3d.net?subject=Manufacturing%20Arena%20Inquiry",
  },
];

// ── Manufacturer placement tiers ─────────────────────────────────────────────

/**
 * Pricing tier for manufacturers who want product placement in the
 * FUSE™ Component Arena's Featured Components panel.
 * All tiers go through "Contact Sales" — prices shown are list rates.
 */
export interface ManufacturerPlacementTier {
  id: "standard-listing" | "featured-placement" | "sponsored-spotlight";
  name: string;
  icon: string;
  /** Short badge label displayed on the card. */
  badge: string;
  /** Whether this tier should be visually highlighted as most popular. */
  highlighted?: boolean;
  /** USD list price per month. */
  pricePerMonth: number;
  /** Human-readable price string shown on the card. */
  priceLabel: string;
  /** Billing cadence note shown beneath the price. */
  billingNote: string;
  /** Feature list shown on the pricing card. */
  features: string[];
  /** Subject line for the contact-sales mailto link. */
  mailtoSubject: string;
}

export const MANUFACTURER_PLACEMENT_TIERS: ManufacturerPlacementTier[] = [
  {
    id: "standard-listing",
    name: "Standard Listing",
    icon: "📋",
    badge: "Entry",
    pricePerMonth: 149,
    priceLabel: "$149",
    billingNote: "per month, billed monthly",
    features: [
      "Catalog card with part number & manufacturer name",
      "Datasheet-accurate specs in FUSE™ simulation",
      "Discoverable via catalog search",
      "Datasheet PDF link on component card",
      "Up to 5 component SKUs listed",
    ],
    mailtoSubject: "Component Arena — Standard Listing Inquiry",
  },
  {
    id: "featured-placement",
    name: "Featured Placement",
    icon: "⭐",
    badge: "Popular",
    highlighted: true,
    pricePerMonth: 349,
    priceLabel: "$349",
    billingNote: "per month, billed monthly",
    features: [
      "Everything in Standard Listing",
      "Priority placement in Featured Components panel",
      "Highlighted card with branded accent",
      "Up to 20 component SKUs listed",
      "Direct link to your product page or distributor",
      "Mention in CircuiTry3D partner docs",
    ],
    mailtoSubject: "Component Arena — Featured Placement Inquiry",
  },
  {
    id: "sponsored-spotlight",
    name: "Sponsored Spotlight",
    icon: "🏆",
    badge: "Premium",
    pricePerMonth: 749,
    priceLabel: "$749",
    billingNote: "per month, billed monthly",
    features: [
      "Everything in Featured Placement",
      "Top-of-panel anchor placement",
      "Category-level sponsorship badge",
      "Unlimited component SKUs",
      "Monthly placement analytics report",
      "Co-branded Arena promotion",
      "Dedicated partner onboarding session",
    ],
    mailtoSubject: "Component Arena — Sponsored Spotlight Inquiry",
  },
];

/** Base mailto address for manufacturer placement inquiries. */
export const MANUFACTURER_PLACEMENT_EMAIL = "info@circuitry3d.net";

// ── Education license tiers ───────────────────────────────────────────────────

/**
 * Affordable licensing tiers for educators and schools.
 * All tiers include classroom management and the FUSE™ Arena.
 * Prices are designed to be fair — schools and educators shouldn't
 * need to over-spend to bring interactive circuit simulation to students.
 */
export interface EducationTier {
  id: "educator-solo" | "multi-class" | "campus";
  name: string;
  icon: string;
  /** Short badge label displayed on the card. */
  badge: string;
  /** Whether this tier should be visually highlighted as most popular. */
  highlighted?: boolean;
  /** USD list price per month. */
  pricePerMonth: number;
  /** Human-readable price string shown on the card. */
  priceLabel: string;
  /** Billing cadence note shown beneath the price. */
  billingNote: string;
  /** Feature list shown on the pricing card. */
  features: string[];
  /** Subject line for the contact / sign-up mailto link. */
  mailtoSubject: string;
}

export const EDUCATION_TIERS: EducationTier[] = [
  {
    id: "educator-solo",
    name: "Educator Solo",
    icon: "👩‍🏫",
    badge: "Individual",
    pricePerMonth: 9,
    priceLabel: "$9",
    billingNote: "per month, billed monthly",
    features: [
      "1 educator account",
      "Up to 30 student seats",
      "Full 3D circuit builder",
      "FUSE™ Component Arena access",
      "Assignment creation & sharing",
      "Student progress overview",
    ],
    mailtoSubject: "Education License — Educator Solo Inquiry",
  },
  {
    id: "multi-class",
    name: "Multi-Class",
    icon: "🏫",
    badge: "Department",
    highlighted: true,
    pricePerMonth: 25,
    priceLabel: "$25",
    billingNote: "per month, billed monthly",
    features: [
      "Up to 5 educator accounts",
      "Up to 150 student seats",
      "Everything in Educator Solo",
      "Shared circuit library across classes",
      "Department-level analytics dashboard",
      "Curriculum-aligned templates",
    ],
    mailtoSubject: "Education License — Multi-Class Inquiry",
  },
  {
    id: "campus",
    name: "Campus License",
    icon: "🏛️",
    badge: "Campus",
    pricePerMonth: 49,
    priceLabel: "$49",
    billingNote: "per month, billed monthly",
    features: [
      "Unlimited educator accounts",
      "Unlimited student seats on one campus",
      "Everything in Multi-Class",
      "Campus-wide admin dashboard",
      "SSO / SIS integration (coming soon)",
      "Dedicated onboarding session",
      "Priority support",
    ],
    mailtoSubject: "Education License — Campus License Inquiry",
  },
];

/** Base mailto address for education license inquiries. */
export const EDUCATION_LICENSE_EMAIL = "info@circuitry3d.net";

// ── Feature comparison rows ───────────────────────────────────────────────────

/** One row in the feature comparison table. */
export interface ComparisonRow {
  /** Unique key for the row. */
  id: string;
  /** Display label. */
  label: string;
  /** Values for each consumer tier (free → premium → pro). */
  free: string;
  premium: string;
  pro: string;
}

/**
 * Rows for the feature comparison table.
 * Values use short strings; "✓" / "✗" are rendered as icons.
 */
export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: "components",
    label: "Components",
    free: "Basic only",
    premium: "All unlocked",
    pro: "All unlocked",
  },
  {
    id: "save-slots",
    label: "Save Slots",
    free: "1 slot",
    premium: "Unlimited",
    pro: "Unlimited",
  },
  {
    id: "physics",
    label: "Physics",
    free: "✗",
    premium: "Advanced",
    pro: "Advanced",
  },
  {
    id: "templates",
    label: "Templates",
    free: "✗",
    premium: "All",
    pro: "All + Exclusive",
  },
  {
    id: "cloud-sync",
    label: "Cloud Sync",
    free: "✗",
    premium: "✗",
    pro: "✓",
  },
  {
    id: "pro-tools",
    label: "Pro Tools",
    free: "✗",
    premium: "✗",
    pro: "✓",
  },
  {
    id: "arenas",
    label: "Arenas Access",
    free: "✗",
    premium: "✗",
    pro: "✗",
  },
];
