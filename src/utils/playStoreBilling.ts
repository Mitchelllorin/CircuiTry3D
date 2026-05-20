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
  getInAppProducts(options: { skus: string[] }): Promise<{ products: ProductInfo[] }>;
  purchase(options: { sku: string }): Promise<void>;
  purchaseInApp(options: { sku: string }): Promise<void>;
  restorePurchases(): Promise<{ purchases: RestoredPurchase[] }>;
  restoreInAppPurchases(): Promise<{ purchases: RestoredPurchase[] }>;
  addListener(
    event: "purchaseCompleted" | "purchaseFailed",
    callback: (result: PurchaseResult) => void
  ): Promise<{ remove: () => void }>;
}

const BillingPluginProxy = registerPlugin<BillingPluginInterface>("Billing");

// ── Constants ─────────────────────────────────────────────────────────────────

/** localStorage key that stores the active subscription tier. */
export const SUBSCRIPTION_TIER_KEY = "circuitry3d_subscription_tier";

/** localStorage key that stores the one-time Pro purchase state. */
export const PRO_UNLOCK_KEY = "circuitry3d_pro_unlock";

/** localStorage key that stores the one-time Premium Unlock purchase state. */
export const PREMIUM_UNLOCK_KEY = "circuitry3d_premium_unlock";

/** Product ID for the one-time Pro unlock managed product (legacy). */
export const PRO_UNLOCK_SKU = "pro_unlock";

/**
 * Product ID for the one-time Premium Unlock managed product.
 * Must match the in-app product created in Google Play Console.
 */
export const PREMIUM_UNLOCK_SKU = "premium_unlock";

/**
 * Product ID for the monthly Pro subscription.
 * Must match the subscription created in Google Play Console.
 */
export const SUB_MONTHLY_SKU = "sub_monthly";

/**
 * Product ID for the yearly Pro subscription.
 * Must match the subscription created in Google Play Console.
 */
export const SUB_YEARLY_SKU = "sub_yearly";

/** Supported subscription tiers, in ascending order. */
export type SubscriptionTier = "free" | "premium" | "pro" | "student" | "educator" | "institutional" | "lifetime";

/**
 * Maps each Play Store product ID to its corresponding subscription tier.
 * These IDs must match what is configured in Google Play Console.
 */
export const PRODUCT_TIER_MAP: Readonly<Record<string, SubscriptionTier>> = {
  circuitry3d_student_monthly: "student",
  circuitry3d_student_annual: "student",
  circuitry3d_educator_monthly: "educator",
  circuitry3d_educator_annual: "educator",
  sub_monthly: "pro",
  sub_yearly: "pro",
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
  pro: {
    monthly: SUB_MONTHLY_SKU,
    yearly: SUB_YEARLY_SKU,
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
    if (
      raw === "premium" ||
      raw === "pro" ||
      raw === "student" ||
      raw === "educator" ||
      raw === "institutional" ||
      raw === "lifetime"
    ) {
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

// ── One-time Pro unlock ───────────────────────────────────────────────────────

/**
 * Returns true if the user has purchased the "pro_unlock" one-time product.
 * The value is cached in localStorage so it persists across app restarts.
 */
export function userHasPro(): boolean {
  try {
    return localStorage.getItem(PRO_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the Pro purchase state. */
export function setProPurchased(purchased: boolean): void {
  try {
    if (purchased) {
      localStorage.setItem(PRO_UNLOCK_KEY, "true");
    } else {
      localStorage.removeItem(PRO_UNLOCK_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

// ── One-time Premium Unlock ───────────────────────────────────────────────────

/**
 * Returns true if the user has purchased the "premium_unlock" one-time product.
 * The value is cached in localStorage so it persists across app restarts.
 */
export function userHasPremium(): boolean {
  try {
    return localStorage.getItem(PREMIUM_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the Premium Unlock purchase state. */
export function setPremiumPurchased(purchased: boolean): void {
  try {
    if (purchased) {
      localStorage.setItem(PREMIUM_UNLOCK_KEY, "true");
    } else {
      localStorage.removeItem(PREMIUM_UNLOCK_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

/**
 * Returns true when the current user has pro-level access or above.
 * This covers:
 *  - the "lifetime" stored tier (founding testers / owner access)
 *  - the "pro" stored tier (active Play Store subscription)
 *  - the legacy "pro_unlock" one-time purchase flag
 */
export function userHasProAccess(): boolean {
  const tier = getStoredTier();
  return tier === "pro" || tier === "lifetime" || userHasPro();
}

/**
 * Returns true when the current user has premium-level access or above.
 * This covers lifetime and pro tiers in addition to the one-time premium purchase.
 */
export function userHasPremiumAccess(): boolean {
  const tier = getStoredTier();
  return tier === "premium" || tier === "pro" || tier === "lifetime" || userHasPremium();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_ORDER: SubscriptionTier[] = ["free", "premium", "pro", "student", "educator", "institutional", "lifetime"];

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
let initPromise: Promise<boolean> | null = null;
let listenersRegistered = false;

function getErrorMessageOrFallback(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function dispatchPurchaseFailed(detail: { cancelled?: boolean; error?: string }): void {
  window.dispatchEvent(
    new CustomEvent("circuitry3d:purchaseFailed", {
      detail: {
        cancelled: detail.cancelled ?? false,
        error: detail.error,
      },
    })
  );
}

/**
 * Initialize the billing client and register purchase event listeners.
 * Safe to call multiple times — only connects once.
 * Returns false when not running on Android or when billing could not be
 * initialised.
 */
export async function initBilling(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await BillingPluginProxy.initialize();

      if (!listenersRegistered) {
        await BillingPluginProxy.addListener("purchaseCompleted", (result) => {
          if (result.success && result.products) {
            // Handle subscription tier upgrades (including downgrades to "free")
            const tier = tierFromProducts(result.products);
            setStoredTier(tier);
            window.dispatchEvent(
              new CustomEvent("circuitry3d:tierChanged", { detail: { tier } })
            );
            // Handle one-time Pro unlock (legacy SKU)
            if (result.products.includes(PRO_UNLOCK_SKU)) {
              setProPurchased(true);
              window.dispatchEvent(new CustomEvent("circuitry3d:proUnlocked"));
            }
            // Handle one-time Premium Unlock (new SKU)
            if (result.products.includes(PREMIUM_UNLOCK_SKU)) {
              setPremiumPurchased(true);
              window.dispatchEvent(new CustomEvent("circuitry3d:premiumUnlocked"));
            }
          }
        });

        await BillingPluginProxy.addListener("purchaseFailed", (result) => {
          dispatchPurchaseFailed({
            cancelled: result.cancelled ?? false,
            error: result.error,
          });
        });

        listenersRegistered = true;
      }

      initialized = true;
      return true;
    } catch {
      // Billing unavailable (e.g., device has no Play Services)
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
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

  const billingReady = await initBilling();
  if (!billingReady) {
    dispatchPurchaseFailed({ error: "Google Play Billing is unavailable on this device." });
    return false;
  }

  try {
    await BillingPluginProxy.purchase({ sku });
    return true;
  } catch (error) {
    dispatchPurchaseFailed({
      error: getErrorMessageOrFallback(error, `Unable to start purchase for ${sku}.`),
    });
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
  if (!(await initBilling())) return getStoredTier();

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

/**
 * Launch the Play Store one-time purchase flow for the "pro_unlock" product.
 *
 * @returns true if the native billing flow was launched (Android only),
 *          false on web.
 */
export async function purchaseProUnlock(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  if (!(await initBilling())) {
    dispatchPurchaseFailed({ error: "Google Play Billing is unavailable on this device." });
    return false;
  }

  try {
    await BillingPluginProxy.purchaseInApp({ sku: PRO_UNLOCK_SKU });
    return true;
  } catch (error) {
    dispatchPurchaseFailed({
      error: getErrorMessageOrFallback(error, `Unable to start purchase for ${PRO_UNLOCK_SKU}.`),
    });
    return false;
  }
}

/**
 * Launch the Play Store one-time purchase flow for the "premium_unlock" product.
 *
 * @returns true if the native billing flow was launched (Android only),
 *          false on web.
 */
export async function purchasePremiumUnlock(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  if (!(await initBilling())) {
    dispatchPurchaseFailed({ error: "Google Play Billing is unavailable on this device." });
    return false;
  }

  try {
    await BillingPluginProxy.purchaseInApp({ sku: PREMIUM_UNLOCK_SKU });
    return true;
  } catch (error) {
    dispatchPurchaseFailed({
      error: getErrorMessageOrFallback(error, `Unable to start purchase for ${PREMIUM_UNLOCK_SKU}.`),
    });
    return false;
  }
}

/**
 * Launch the Play Store subscription flow for the Pro plan.
 *
 * @param cycle - "monthly" uses sub_monthly; "yearly" uses sub_yearly.
 * @returns true if the native billing flow was launched (Android only),
 *          false on web.
 */
export async function purchaseProSubscription(cycle: "monthly" | "yearly"): Promise<boolean> {
  if (!isAndroidApp()) return false;

  const sku = cycle === "monthly" ? SUB_MONTHLY_SKU : SUB_YEARLY_SKU;
  if (!(await initBilling())) {
    dispatchPurchaseFailed({ error: "Google Play Billing is unavailable on this device." });
    return false;
  }

  try {
    await BillingPluginProxy.purchase({ sku });
    return true;
  } catch (error) {
    dispatchPurchaseFailed({
      error: getErrorMessageOrFallback(error, `Unable to start purchase for ${sku}.`),
    });
    return false;
  }
}

/**
 * Restore any previously purchased "pro_unlock" one-time product.
 * Updates localStorage and dispatches a `circuitry3d:proUnlocked` event if found.
 *
 * @returns true if the Pro purchase was found and restored.
 */
export async function restoreProPurchases(): Promise<boolean> {
  if (!isAndroidApp()) return userHasPro();
  if (!(await initBilling())) return userHasPro();

  try {
    const { purchases } = await BillingPluginProxy.restoreInAppPurchases();
    const hasPro = purchases.some((p) => p.products.includes(PRO_UNLOCK_SKU));
    if (hasPro) {
      setProPurchased(true);
      window.dispatchEvent(new CustomEvent("circuitry3d:proUnlocked"));
    }
    return hasPro;
  } catch {
    return userHasPro();
  }
}

/**
 * Restore any previously purchased "premium_unlock" one-time product.
 * Updates localStorage and dispatches a `circuitry3d:premiumUnlocked` event if found.
 *
 * @returns true if the Premium purchase was found and restored.
 */
export async function restorePremiumPurchases(): Promise<boolean> {
  if (!isAndroidApp()) return userHasPremium();
  if (!(await initBilling())) return userHasPremium();

  try {
    const { purchases } = await BillingPluginProxy.restoreInAppPurchases();
    const hasPremium = purchases.some((p) => p.products.includes(PREMIUM_UNLOCK_SKU));
    if (hasPremium) {
      setPremiumPurchased(true);
      window.dispatchEvent(new CustomEvent("circuitry3d:premiumUnlocked"));
    }
    return hasPremium;
  } catch {
    return userHasPremium();
  }
}

/**
 * Fetch live, localised prices for all consumer products from the Play Store.
 * On web (non-Android) this always returns an empty map.
 *
 * Returns a map of { [productId]: formattedPrice } for each known product:
 *   premium_unlock  — one-time purchase
 *   sub_monthly     — Pro monthly subscription
 *   sub_yearly      — Pro yearly subscription
 */
export async function getConsumerProductPrices(): Promise<Record<string, string>> {
  if (!isAndroidApp()) return {};
  if (!(await initBilling())) return {};

  const prices: Record<string, string> = {};

  try {
    // Fetch one-time in-app product prices
    const { products: inAppProducts } = await BillingPluginProxy.getInAppProducts({
      skus: [PREMIUM_UNLOCK_SKU],
    });
    for (const p of inAppProducts) {
      if (p.price) prices[p.productId] = p.price;
    }
  } catch {
    // Billing unavailable or product not found — fall back to static defaults
  }

  try {
    // Fetch subscription prices
    const { products: subProducts } = await BillingPluginProxy.getProducts({
      skus: [SUB_MONTHLY_SKU, SUB_YEARLY_SKU],
    });
    for (const p of subProducts) {
      if (p.price) prices[p.productId] = p.price;
    }
  } catch {
    // Billing unavailable or products not found — fall back to static defaults
  }

  return prices;
}

// ── Web payment (non-Android) ─────────────────────────────────────────────────

/**
 * URL of the web payment page (e.g. Google Pay / Gumroad checkout link).
 * Set VITE_PAYMENT_URL at build time in GitHub Actions repository secrets.
 * Left empty for the GitHub Pages / Android builds.
 */
export const WEB_PAYMENT_URL: string = (import.meta.env.VITE_PAYMENT_URL ?? "").trim();

/**
 * Google Play Store listing URL for the CircuiTry3D Android app.
 * Used as a fallback CTA on web when no VITE_PAYMENT_URL is configured.
 */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.circuitry3d.app";

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Returns true when a dedicated web checkout is configured.
 * A Play Store listing URL does not count as an in-browser checkout flow.
 */
export function hasWebPaymentCheckout(): boolean {
  const paymentUrl = normalizeUrl(WEB_PAYMENT_URL);
  return paymentUrl.length > 0 && paymentUrl !== normalizeUrl(PLAY_STORE_URL);
}

/**
 * Open the web payment page in a new tab.
 *
 * @returns true if a payment URL was configured and the tab was opened,
 *          false otherwise (caller can show a fallback message).
 */
export function openWebPayment(): boolean {
  if (!hasWebPaymentCheckout()) return false;
  window.open(WEB_PAYMENT_URL, "_blank", "noopener,noreferrer");
  return true;
}
