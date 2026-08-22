export const ENGAGEMENT_PROMPT_STORAGE_KEY = "circuitry3d:engagement-prompts:v1";
export const UPGRADE_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const RATE_PROMPT_DELAY_MS = 3000;
export const MAX_UPGRADE_PROMPT_IMPRESSIONS = 2;
export const MAX_RATING_PROMPT_IMPRESSIONS = 1;
export const RATING_SUCCESS_THRESHOLD = 2;

export type EngagementPromptKind = "upgrade" | "rating";

export interface EngagementPromptState {
  successfulSessions: number;
  upgradeImpressions: number;
  ratingImpressions: number;
  lastUpgradePromptAt: number | null;
  lastRatingPromptAt: number | null;
  lastUpgradeDismissedAt: number | null;
  lastRatingDismissedAt: number | null;
  ratingActionedAt: number | null;
}

export interface EngagementPromptDecision {
  state: EngagementPromptState;
  prompt: EngagementPromptKind | null;
}

export interface EngagementPromptContext {
  now: number;
  hasPremiumAccess: boolean;
  isAndroid: boolean;
}

const DEFAULT_PROMPT_STATE: EngagementPromptState = {
  successfulSessions: 0,
  upgradeImpressions: 0,
  ratingImpressions: 0,
  lastUpgradePromptAt: null,
  lastRatingPromptAt: null,
  lastUpgradeDismissedAt: null,
  lastRatingDismissedAt: null,
  ratingActionedAt: null,
};

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function timestampOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function normalizeEngagementPromptState(value: unknown): EngagementPromptState {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROMPT_STATE };
  }

  const state = value as Partial<EngagementPromptState>;
  return {
    successfulSessions: nonNegativeInteger(state.successfulSessions),
    upgradeImpressions: nonNegativeInteger(state.upgradeImpressions),
    ratingImpressions: nonNegativeInteger(state.ratingImpressions),
    lastUpgradePromptAt: timestampOrNull(state.lastUpgradePromptAt),
    lastRatingPromptAt: timestampOrNull(state.lastRatingPromptAt),
    lastUpgradeDismissedAt: timestampOrNull(state.lastUpgradeDismissedAt),
    lastRatingDismissedAt: timestampOrNull(state.lastRatingDismissedAt),
    ratingActionedAt: timestampOrNull(state.ratingActionedAt),
  };
}

export function readEngagementPromptState(): EngagementPromptState {
  try {
    const raw = localStorage.getItem(ENGAGEMENT_PROMPT_STORAGE_KEY);
    return raw ? normalizeEngagementPromptState(JSON.parse(raw)) : { ...DEFAULT_PROMPT_STATE };
  } catch {
    return { ...DEFAULT_PROMPT_STATE };
  }
}

export function persistEngagementPromptState(state: EngagementPromptState): void {
  try {
    localStorage.setItem(ENGAGEMENT_PROMPT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Prompting remains optional when local storage is unavailable.
  }
}

function canShowUpgrade(state: EngagementPromptState, context: EngagementPromptContext): boolean {
  if (context.hasPremiumAccess || state.upgradeImpressions >= MAX_UPGRADE_PROMPT_IMPRESSIONS) {
    return false;
  }

  return (
    state.lastUpgradePromptAt === null ||
    context.now - state.lastUpgradePromptAt >= UPGRADE_PROMPT_COOLDOWN_MS
  );
}

function canShowRating(state: EngagementPromptState, context: EngagementPromptContext): boolean {
  return (
    context.isAndroid &&
    state.successfulSessions >= RATING_SUCCESS_THRESHOLD &&
    state.ratingImpressions < MAX_RATING_PROMPT_IMPRESSIONS
  );
}

/**
 * Records a verified learning success. It deliberately has no first-launch
 * branch: prompts can only result from an explicit success event.
 */
export function recordMeaningfulSuccess(
  previous: EngagementPromptState,
  context: EngagementPromptContext,
): EngagementPromptDecision {
  const state = normalizeEngagementPromptState(previous);
  const nextState = {
    ...state,
    successfulSessions: state.successfulSessions + 1,
  };

  if (canShowUpgrade(nextState, context)) {
    return { state: nextState, prompt: "upgrade" };
  }

  if (canShowRating(nextState, context)) {
    return { state: nextState, prompt: "rating" };
  }

  return { state: nextState, prompt: null };
}

export function markPromptShown(
  previous: EngagementPromptState,
  prompt: EngagementPromptKind,
  now: number,
): EngagementPromptState {
  const state = normalizeEngagementPromptState(previous);
  return prompt === "upgrade"
    ? {
        ...state,
        upgradeImpressions: state.upgradeImpressions + 1,
        lastUpgradePromptAt: now,
      }
    : {
        ...state,
        ratingImpressions: state.ratingImpressions + 1,
        lastRatingPromptAt: now,
      };
}

export function markPromptDismissed(
  previous: EngagementPromptState,
  prompt: EngagementPromptKind,
  now: number,
): EngagementPromptState {
  const state = normalizeEngagementPromptState(previous);
  return prompt === "upgrade"
    ? { ...state, lastUpgradeDismissedAt: now }
    : { ...state, lastRatingDismissedAt: now };
}

export function markRatingActioned(
  previous: EngagementPromptState,
  now: number,
): EngagementPromptState {
  return { ...normalizeEngagementPromptState(previous), ratingActionedAt: now };
}
