/**
 * EntitlementManager — React hook and utilities for querying the current user's
 * unlock/subscription state across the hybrid monetisation model.
 *
 * Consumer tiers (managed via Play Billing / localStorage):
 *   free      — default; basic components, 1 save slot.
 *   premium   — one-time "premium_unlock" purchase; all components + unlimited saves.
 *   pro       — "sub_monthly" or "sub_yearly" subscription; everything in Premium
 *               plus cloud save, pro tools, and early-access features.
 *
 * Enterprise tiers (no Play Billing — Contact Sales only):
 *   component-arena    — branded / sponsored components for manufacturers.
 *   education-arena    — classroom management for schools.
 *   manufacturing-arena — enterprise simulation for OEMs.
 *
 * Usage:
 *   const { tier, hasPremium, hasPro, isPremiumOrAbove } = useEntitlements();
 */

import { useEffect, useState } from "react";
import {
  getStoredTier,
  userHasPremium,
  userHasPro,
  type SubscriptionTier,
} from "./playStoreBilling";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The full set of entitlement data exposed by the hook. */
export interface EntitlementState {
  /** The highest active subscription tier. */
  tier: SubscriptionTier;
  /** True if the user owns the one-time "premium_unlock" product. */
  hasPremium: boolean;
  /**
   * True if the user has an active Pro subscription (sub_monthly / sub_yearly).
   * A Pro subscriber implicitly has all Premium features too.
   */
  hasPro: boolean;
  /**
   * Convenience flag: true for Premium and above (including Pro subscriptions).
   * Use this to gate features that require at least a one-time purchase.
   */
  isPremiumOrAbove: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * React hook that returns the current user's entitlement state and keeps it
 * in sync with purchase/restore events dispatched by the billing utilities.
 *
 * Safe to call in any React component — initialises synchronously from
 * localStorage so there is no loading flash.
 */
export function useEntitlements(): EntitlementState {
  const [tier, setTier] = useState<SubscriptionTier>(getStoredTier);
  const [hasPremium, setHasPremium] = useState<boolean>(userHasPremium);
  const [hasPro, setHasPro] = useState<boolean>(
    () => getStoredTier() === "pro" || userHasPro()
  );

  useEffect(() => {
    /** Re-read all entitlement state after any billing event. */
    const refresh = () => {
      const t = getStoredTier();
      setTier(t);
      setHasPremium(userHasPremium());
      setHasPro(t === "pro" || userHasPro());
    };

    window.addEventListener("circuitry3d:tierChanged", refresh);
    window.addEventListener("circuitry3d:proUnlocked", refresh);
    window.addEventListener("circuitry3d:premiumUnlocked", refresh);

    return () => {
      window.removeEventListener("circuitry3d:tierChanged", refresh);
      window.removeEventListener("circuitry3d:proUnlocked", refresh);
      window.removeEventListener("circuitry3d:premiumUnlocked", refresh);
    };
  }, []);

  return {
    tier,
    hasPremium,
    hasPro,
    isPremiumOrAbove: hasPremium || hasPro,
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Return a human-readable label for a subscription tier.
 *
 * @example
 *   tierLabel("pro") // → "Pro"
 */
export function tierLabel(tier: SubscriptionTier): string {
  const labels: Record<SubscriptionTier, string> = {
    free: "Free",
    premium: "Premium",
    pro: "Pro",
    student: "Student",
    educator: "Educator",
    institutional: "Institutional",
    lifetime: "Lifetime",
  };
  return labels[tier] ?? "Unknown";
}
