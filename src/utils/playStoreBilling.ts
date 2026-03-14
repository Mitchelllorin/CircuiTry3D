/**
 * Google Play Billing bridge for the Android (Capacitor) build.
 *
 * On Android the web layer calls the native BillingPlugin via Capacitor to
 * open the Play Store subscription flow.  On the web/desktop the helpers
 * return false so callers can fall back to a mailto: contact link.
 *
 * Usage:
 *   import { initBilling, purchasePlan, restorePurchases } from "./playStoreBilling";
 *
 *   // Call once at app start (no-op on web)
 *   await initBilling();
 *
 *   // Trigger a purchase
 *   const handled = await purchasePlan("student", "annual");
 *   if (!handled) window.location.href = FALLBACK_MAILTO;
 *
 *   // Restore existing subscriptions
 *   const tier = await restorePurchases();
 */

import { registerPlugin } from "@capacitor/core";

// ── Types exposed by the native plugin ────────────────────────────────────────

export interface ProductInfo {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceMicros: number;
  currencyCode: string;
  offerToken: string;
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  purchaseToken?: string;
  orderId?: string;
  products?: string[];
}

export interface RestoredPurchase {
  orderId: string;
  purchaseToken: string;
  products: string[];
  purchaseTime: number;
}

interface BillingPluginInterface {
  initialize(): Promise<void>;
  getProducts(options: { skus: string[] }): Promise<{ products: ProductInfo[] }>;
  purchase(options: { sku: string }): Promise<void>;
  restorePurchases(): Promise<{ purchases: RestoredPurchase[] }>;
  addListener(
    event: "purchaseCompleted" | "purchaseFailed",
    callback: (result: PurchaseResult) => void
  ): Promise<{ remove: () => void }>;
}

const BillingPluginProxy = registerPlugin<BillingPluginInterface>("Billing");

// ── Constants ─────────────────────────────────────────────────────────────────

/** localStorage key that stores the active subscription tier. */
export const SUBSCRIPTION_TIER_KEY = "circuitry3d_subscription_tier";

/** Supported subscription tiers, in ascending order. */
export type SubscriptionTier = "free" | "student" | "educator" | "institutional";

/**
 * Maps each Play Store product ID to its corresponding subscription tier.
 * These IDs must match what is configured in Google Play Console.
 */
export const PRODUCT_TIER_MAP: Readonly<Record<string, SubscriptionTier>> = {
  circuitry3d_student_monthly: "student",
  circuitry3d_student_annual: "student",
  circuitry3d_educator_monthly: "educator",
  circuitry3d_educator_annual: "educator",
} as const;

/**
 * Play Store subscription product IDs for each plan and billing cycle.
 * Must match the subscription IDs created in Google Play Console.
 */
export const PLAN_SKUS: Readonly<Record<string, Readonly<Partial<Record<string, string>>>>> = {
  student: {
    monthly: "circuitry3d_student_monthly",
    annual: "circuitry3d_student_annual",
  },
  educator: {
    monthly: "circuitry3d_educator_monthly",
    annual: "circuitry3d_educator_annual",
  },
} as const;

// ── Platform detection ────────────────────────────────────────────────────────

/** Minimal type for the Capacitor global injected by the Android bridge. */
interface CapacitorGlobal {
  isNativePlatform: () => boolean;
}

type WindowWithCapacitor = Window & typeof globalThis & { Capacitor?: CapacitorGlobal };

/** Returns true when running inside the Capacitor Android shell. */
export function isAndroidApp(): boolean {
  try {
    const cap = (window as WindowWithCapacitor).Capacitor;
    return typeof cap?.isNativePlatform === "function" && (cap.isNativePlatform() ?? false);
  } catch {
    return false;
  }
}

// ── Tier storage ──────────────────────────────────────────────────────────────

/** Read the persisted subscription tier from localStorage. */
export function getStoredTier(): SubscriptionTier {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_TIER_KEY);
    if (raw === "student" || raw === "educator" || raw === "institutional") {
      return raw;
    }
  } catch {
    // localStorage unavailable
  }
  return "free";
}

/** Persist the subscription tier after a successful purchase or restore. */
export function setStoredTier(tier: SubscriptionTier): void {
  try {
    localStorage.setItem(SUBSCRIPTION_TIER_KEY, tier);
  } catch {
    // localStorage unavailable
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_ORDER: SubscriptionTier[] = ["free", "student", "educator", "institutional"];

/** Return the highest tier present in a list of active product IDs. */
function tierFromProducts(products: string[]): SubscriptionTier {
  let best: SubscriptionTier = "free";
  for (const pid of products) {
    const t = PRODUCT_TIER_MAP[pid];
    if (t && TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(best)) {
      best = t;
    }
  }
  return best;
}

// ── Public API ────────────────────────────────────────────────────────────────

let initialized = false;

/**
 * Initialize the billing client and register purchase event listeners.
 * Safe to call multiple times — only connects once.
 * No-op when not running on Android.
 */
export async function initBilling(): Promise<void> {
  if (!isAndroidApp() || initialized) return;

  try {
    await BillingPluginProxy.initialize();
    initialized = true;

    await BillingPluginProxy.addListener("purchaseCompleted", (result) => {
      if (result.success && result.products) {
        const tier = tierFromProducts(result.products);
        setStoredTier(tier);
        window.dispatchEvent(
          new CustomEvent("circuitry3d:tierChanged", { detail: { tier } })
        );
      }
    });

    await BillingPluginProxy.addListener("purchaseFailed", (result) => {
      window.dispatchEvent(
        new CustomEvent("circuitry3d:purchaseFailed", {
          detail: { cancelled: result.cancelled ?? false, error: result.error },
        })
      );
    });
  } catch {
    // Billing unavailable (e.g., device has no Play Services)
  }
}

/**
 * Launch the Play Store subscription flow for a given plan and billing cycle.
 *
 * @returns true if the native billing flow was launched (Android only),
 *          false on web — caller should fall back to a mailto: link.
 */
export async function purchasePlan(
  planId: string,
  cycle: string
): Promise<boolean> {
  if (!isAndroidApp()) return false;

  const sku = PLAN_SKUS[planId]?.[cycle];
  if (!sku) return false;

  try {
    await BillingPluginProxy.purchase({ sku });
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore existing Play Store subscriptions.
 * Updates the stored tier and dispatches a `circuitry3d:tierChanged` event.
 *
 * @returns The highest active tier, or "free" if no active subscriptions.
 */
export async function restorePurchases(): Promise<SubscriptionTier> {
  if (!isAndroidApp()) return getStoredTier();

  try {
    const { purchases } = await BillingPluginProxy.restorePurchases();
    const allProducts = purchases.flatMap((p) => p.products);
    const tier = tierFromProducts(allProducts);
    setStoredTier(tier);
    window.dispatchEvent(
      new CustomEvent("circuitry3d:tierChanged", { detail: { tier } })
    );
    return tier;
  } catch {
    return getStoredTier();
  }
}
