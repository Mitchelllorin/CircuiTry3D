import type { LegacyModeState } from "./types";

export const clampLabelVisibilityLevel = (value: number): number =>
  Math.max(0, Math.min(3, Math.round(value)));

export const resolveLabelVisibilityLevel = (
  state: Pick<LegacyModeState, "labelVisibilityLevel" | "showLabels">,
): number =>
  typeof state.labelVisibilityLevel === "number"
    ? clampLabelVisibilityLevel(state.labelVisibilityLevel)
    : state.showLabels
      ? 3
      : 0;

export const getLabelVisibilityDescription = (level: number): string => {
  if (level >= 3) return "Full labels shown";
  if (level === 2) return "Wire metrics hidden";
  if (level === 1) return "References only";
  return "Labels hidden";
};

export const getNextLabelToggleTitle = (level: number): string => {
  if (level >= 3) return "Hide wire metrics";
  if (level === 2) return "Hide component values";
  if (level === 1) return "Hide all labels";
  return "Show full labels";
};
