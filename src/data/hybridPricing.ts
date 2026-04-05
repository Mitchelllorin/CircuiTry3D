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
  /** Static fallback price shown when live BillingClient prices are unavailable. */
  staticPriceFallback: string;
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
    staticPriceFallback: "$2.49 / mo",
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
}

export const ENTERPRISE_TIERS: EnterpriseTier[] = [
  {
    id: "component-arena",
    name: "Component Arena",
    icon: "🏭",
    badge: "Manufacturer",
    description: [
      "Branded components",
      "Sponsored placements",
      "OEM component packs",
      "Analytics for manufacturers",
    ],
    contactMailto:
      "mailto:hello@circuitry3d.com?subject=Component%20Arena%20Inquiry",
  },
  {
    id: "education-arena",
    name: "Education Arena",
    icon: "🏫",
    badge: "Classroom",
    description: [
      "Classroom management",
      "Shared circuits",
      "Assignments",
      "Multi-seat licensing",
    ],
    contactMailto:
      "mailto:hello@circuitry3d.com?subject=Education%20Arena%20Inquiry",
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
      "mailto:hello@circuitry3d.com?subject=Manufacturing%20Arena%20Inquiry",
  },
];

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
