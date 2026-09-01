import type { LegacyModeState } from "./types";

/**
 * Nameplate detail is a THREE-tier cycle, not a four-step dimmer.
 *
 *   0 — off
 *   2 — name + value
 *   3 — name + value + live metrics
 *
 * Level 1 (identifier with no value) is deliberately not a stop: a name with
 * no number attached is the one state nobody reaches for, and a toggle with
 * four presses to get back where you started is a toggle people stop using.
 * Kept as a legal INPUT though — legacy state, saved circuits and the tutorial
 * can all still hand one over, and those snap to the nearest tier.
 *
 * Mirrors LABEL_TIERS in legacy.html; the two must not drift.
 */
export const LABEL_TIERS = [0, 2, 3] as const;

/** The tier the workspace opens on — the middle one. */
export const DEFAULT_LABEL_LEVEL = LABEL_TIERS[1];

export const clampLabelVisibilityLevel = (value: number): number =>
  Math.max(0, Math.min(3, Math.round(value)));

/** Nearest legal tier to whatever came in. */
export const snapToLabelTier = (value: number): number => {
  const level = clampLabelVisibilityLevel(value);
  return LABEL_TIERS.reduce(
    (best, tier) => (Math.abs(tier - level) < Math.abs(best - level) ? tier : best),
    LABEL_TIERS[0] as number,
  );
};

export const resolveLabelVisibilityLevel = (
  state: Pick<LegacyModeState, "labelVisibilityLevel" | "showLabels">,
): number =>
  typeof state.labelVisibilityLevel === "number"
    ? clampLabelVisibilityLevel(state.labelVisibilityLevel)
    : state.showLabels
      ? 3
      : 0;

export const getLabelVisibilityDescription = (level: number): string => {
  if (level >= 3) return "Names, values and live metrics";
  if (level >= 2) return "Names and values";
  if (level >= 1) return "Names only";
  return "Nameplates hidden";
};

export const getNextLabelToggleTitle = (level: number): string => {
  if (level >= 3) return "Hide nameplates";
  if (level >= 2) return "Add live metrics";
  return "Show names and values";
};
