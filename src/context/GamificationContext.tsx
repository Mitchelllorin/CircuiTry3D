import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PracticeDifficulty, PracticeProblem, PracticeTopology } from "../model/practice";
import {
  CLEAN_SOLVE_BONUS,
  COMPONENT_UNLOCKS,
  GAMIFICATION_BADGES,
  HISTORY_LIMIT,
  LEADERBOARD_SEEDS,
  REPEAT_COMPLETION_BONUS,
  SPRINT_BONUS_BY_DIFFICULTY,
  SPRINT_TARGET_MS_BY_DIFFICULTY,
  STREAK_STEP_BONUS,
  UNIQUE_COMPLETION_BONUS,
  XP_REWARD_BY_DIFFICULTY,
  type GamificationBadge,
  type GamificationRequirement,
  type LeaderboardSeed,
} from "../data/gamification";
import { useAuth } from "./AuthContext";

type CompletionMeta = {
  count: number;
  lastCompletedAt: number;
};

type CompletionRewardMeta = {
  elapsedMs?: number;
  usedAssist?: boolean;
};

type ArcadeRewardMeta = {
  xp: number;
  label: string;
  bonusLabels?: string[];
};

type GamificationHistoryEntry = {
  id: string;
  timestamp: number;
  problemId: string;
  topology: PracticeTopology;
  difficulty: PracticeDifficulty;
  xpEarned: number;
};

type BadgeState = {
  unlocked: boolean;
  unlockedAt?: number;
};

export type GamificationReward = {
  xpEarned: number;
  bonusXp: number;
  bonusLabels: string[];
  badgeIds: string[];
  unlockedComponents: string[];
  streak: number;
  timestamp: number;
  elapsedMs?: number;
  source?: "practice" | "arcade";
  primaryLabel?: string;
};

type GamificationState = {
  xp: number;
  totalCompletions: number;
  completionIndex: Record<string, CompletionMeta>;
  byTopology: Record<PracticeTopology, number>;
  byDifficulty: Record<PracticeDifficulty, number>;
  masteryCounts: Record<string, number>;
  bestTimes: Record<string, number>;
  cleanSolves: number;
  speedSolves: number;
  streak: number;
  lastCompletionDay?: string;
  unlockedComponents: string[];
  badges: Record<string, BadgeState>;
  history: GamificationHistoryEntry[];
  lastReward?: GamificationReward;
};

type LeaderboardEntry = LeaderboardSeed & {
  rank: number;
  isCurrentUser: boolean;
};

type GamificationContextValue = {
  state: GamificationState;
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  levelProgress: number;
  unlockedBadges: GamificationBadge[];
  lockedBadges: GamificationBadge[];
  leaderboard: LeaderboardEntry[];
  unlockedComponentsDetailed: typeof COMPONENT_UNLOCKS;
  nextComponentUnlock?: {
    id: string;
    label: string;
    xpThreshold: number;
    remainingXp: number;
  };
  recordCompletion(problem: PracticeProblem, meta?: CompletionRewardMeta): GamificationReward | null;
  grantArcadeReward(meta: ArcadeRewardMeta): GamificationReward | null;
};

const STORAGE_KEY = "circuiTry3d.gamification.v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEVEL_BASE_REQUIREMENT = 150;
const LEVEL_STEP_INCREMENT = 75;

const createTopologyBaseline = (): Record<PracticeTopology, number> => ({
  series: 0,
  parallel: 0,
  combination: 0,
});

const createDifficultyBaseline = (): Record<PracticeDifficulty, number> => ({
  intro: 0,
  standard: 0,
  challenge: 0,
});

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  totalCompletions: 0,
  completionIndex: {},
  byTopology: createTopologyBaseline(),
  byDifficulty: createDifficultyBaseline(),
  masteryCounts: {},
  bestTimes: {},
  cleanSolves: 0,
  speedSolves: 0,
  streak: 0,
  unlockedComponents: [],
  badges: {},
  history: [],
};

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

const formatDayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (previousDay: string, currentDay: string): number => {
  const previous = Date.parse(`${previousDay}T00:00:00Z`);
  const current = Date.parse(`${currentDay}T00:00:00Z`);
  return Math.round((current - previous) / MS_PER_DAY);
};

const computeLevelInfo = (xp: number) => {
  let level = 1;
  let floor = 0;
  let requirement = LEVEL_BASE_REQUIREMENT;

  while (xp >= floor + requirement) {
    floor += requirement;
    level += 1;
    requirement = LEVEL_BASE_REQUIREMENT + (level - 1) * LEVEL_STEP_INCREMENT;
  }

  const nextLevelXp = floor + requirement;
  const xpIntoLevel = xp - floor;
  const xpToNextLevel = Math.max(0, nextLevelXp - xp);
  const levelProgress = requirement === 0 ? 1 : Math.min(1, xpIntoLevel / requirement);

  return { level, xpIntoLevel, xpToNextLevel, levelProgress };
};

type GamificationStats = {
  total: number;
  unique: number;
  byTopology: Record<PracticeTopology, number>;
  byDifficulty: Record<PracticeDifficulty, number>;
  streak: number;
  masteryCounts: Record<string, number>;
  masterySpread: number;
};

const meetsRequirement = (requirement: GamificationRequirement, stats: GamificationStats): boolean => {
  switch (requirement.kind) {
    case "total":
      return stats.total >= requirement.count;
    case "unique":
      return stats.unique >= requirement.count;
    case "difficulty":
      return stats.byDifficulty[requirement.difficulty] >= requirement.count;
    case "topology":
      return stats.byTopology[requirement.topology] >= requirement.count;
    case "streak":
      return stats.streak >= requirement.days;
    case "masteryTag":
      return (stats.masteryCounts[requirement.tag] ?? 0) >= requirement.count;
    case "masterySpread":
      return stats.masterySpread >= requirement.distinct;
    default:
      return false;
  }
};

const readStoredState = (): GamificationState => {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<GamificationState>;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_STATE;
    }

    const parsedReward = parsed.lastReward;
    const normalizedReward =
      parsedReward && typeof parsedReward === "object"
        ? {
            ...parsedReward,
            bonusXp:
              typeof parsedReward.bonusXp === "number" && Number.isFinite(parsedReward.bonusXp)
                ? parsedReward.bonusXp
                : 0,
            bonusLabels: Array.isArray(parsedReward.bonusLabels) ? parsedReward.bonusLabels : [],
            badgeIds: Array.isArray(parsedReward.badgeIds) ? parsedReward.badgeIds : [],
            unlockedComponents: Array.isArray(parsedReward.unlockedComponents)
              ? parsedReward.unlockedComponents
              : [],
          }
        : undefined;

    return {
      ...DEFAULT_STATE,
      ...parsed,
      byTopology: {
        ...createTopologyBaseline(),
        ...(parsed.byTopology ?? {}),
      },
      byDifficulty: {
        ...createDifficultyBaseline(),
        ...(parsed.byDifficulty ?? {}),
      },
      completionIndex: parsed.completionIndex ?? {},
      masteryCounts: parsed.masteryCounts ?? {},
      bestTimes:
        parsed.bestTimes && typeof parsed.bestTimes === "object" ? parsed.bestTimes : {},
      cleanSolves: parsed.cleanSolves ?? 0,
      speedSolves: parsed.speedSolves ?? 0,
      unlockedComponents: parsed.unlockedComponents ?? [],
      badges: parsed.badges ?? {},
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      lastReward: normalizedReward,
      streak: parsed.streak ?? 0,
    };
  } catch (error) {
    console.warn("[Gamification] Failed to read stored state", error);
    return DEFAULT_STATE;
  }
};

const writeStoredState = (state: GamificationState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[Gamification] Failed to persist state", error);
  }
};

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState<GamificationState>(() => readStoredState());

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  const recordCompletion = useCallback<GamificationContextValue["recordCompletion"]>(
    (problem, meta) => {
      let reward: GamificationReward | null = null;
      setState((previous) => {
        const timestamp = Date.now();
        const dayKey = formatDayKey(timestamp);

        const completionIndex = { ...previous.completionIndex };
        const existingCompletion = completionIndex[problem.id];
        completionIndex[problem.id] = {
          count: (existingCompletion?.count ?? 0) + 1,
          lastCompletedAt: timestamp,
        };

        const byTopology: GamificationState["byTopology"] = {
          ...previous.byTopology,
          [problem.topology]: (previous.byTopology[problem.topology] ?? 0) + 1,
        };

        const byDifficulty: GamificationState["byDifficulty"] = {
          ...previous.byDifficulty,
          [problem.difficulty]: (previous.byDifficulty[problem.difficulty] ?? 0) + 1,
        };

        const masteryCounts = { ...previous.masteryCounts };
        const masteryTags = problem.gamification?.masteryTags ?? problem.conceptTags ?? [];
        masteryTags.forEach((tag) => {
          if (!tag) {
            return;
          }
          masteryCounts[tag] = (masteryCounts[tag] ?? 0) + 1;
        });
        const masterySpread = Object.keys(masteryCounts).length;
        const bestTimes = { ...previous.bestTimes };
        let cleanSolves = previous.cleanSolves;
        let speedSolves = previous.speedSolves;
        const bonusLabels: string[] = [];
        let bonusXp = 0;
        const cleanSolve = meta?.usedAssist === false;
        if (cleanSolve) {
          bonusXp += CLEAN_SOLVE_BONUS;
          bonusLabels.push("Clean run");
          cleanSolves += 1;
        }

        const elapsedMs =
          typeof meta?.elapsedMs === "number" && Number.isFinite(meta.elapsedMs) && meta.elapsedMs > 0
            ? meta.elapsedMs
            : undefined;
        if (elapsedMs !== undefined) {
          const bestTime = bestTimes[problem.id];
          if (bestTime === undefined || elapsedMs < bestTime) {
            bestTimes[problem.id] = elapsedMs;
          }
          const sprintTarget = SPRINT_TARGET_MS_BY_DIFFICULTY[problem.difficulty];
          if (elapsedMs <= sprintTarget) {
            const sprintBonus = SPRINT_BONUS_BY_DIFFICULTY[problem.difficulty];
            bonusXp += sprintBonus;
            bonusLabels.push("Speed sprint");
            speedSolves += 1;
          }
        }

        const totalCompletions = previous.totalCompletions + 1;
        const uniqueCompletions = Object.keys(completionIndex).length;

        let streak = previous.streak;
        if (!previous.lastCompletionDay) {
          streak = 1;
        } else if (previous.lastCompletionDay === dayKey) {
          streak = previous.streak;
        } else {
          const delta = daysBetween(previous.lastCompletionDay, dayKey);
          streak = delta === 1 ? previous.streak + 1 : 1;
        }

        let xpEarned =
          (problem.gamification?.xpReward ?? XP_REWARD_BY_DIFFICULTY[problem.difficulty]) +
          (existingCompletion ? REPEAT_COMPLETION_BONUS : UNIQUE_COMPLETION_BONUS);

        if (previous.lastCompletionDay && dayKey !== previous.lastCompletionDay && streak > previous.streak) {
          xpEarned += STREAK_STEP_BONUS;
        }

        const stats: GamificationStats = {
          total: totalCompletions,
          unique: uniqueCompletions,
          byTopology,
          byDifficulty,
          streak,
          masteryCounts,
          masterySpread,
        };

        const badges = { ...previous.badges };
        const unlockedBadges: string[] = [];
        GAMIFICATION_BADGES.forEach((badge) => {
          if (badges[badge.id]?.unlocked) {
            return;
          }
          if (meetsRequirement(badge.requirement, stats)) {
            badges[badge.id] = { unlocked: true, unlockedAt: timestamp };
            unlockedBadges.push(badge.id);
            xpEarned += badge.xp;
          }
        });

        xpEarned += bonusXp;

        const unlockedComponents = new Set(previous.unlockedComponents);
        const newlyUnlockedComponents: string[] = [];
        COMPONENT_UNLOCKS.forEach((unlock) => {
          if (unlockedComponents.has(unlock.id)) {
            return;
          }
          if (previous.xp + xpEarned >= unlock.xpThreshold) {
            unlockedComponents.add(unlock.id);
            newlyUnlockedComponents.push(unlock.id);
          }
        });

        const historyEntry: GamificationHistoryEntry = {
          id: `${timestamp}-${problem.id}`,
          timestamp,
          problemId: problem.id,
          topology: problem.topology,
          difficulty: problem.difficulty,
          xpEarned,
        };

        const nextState: GamificationState = {
          xp: previous.xp + xpEarned,
          totalCompletions,
          completionIndex,
          byTopology,
          byDifficulty,
          masteryCounts,
          bestTimes,
          cleanSolves,
          speedSolves,
          streak,
          lastCompletionDay: dayKey,
          unlockedComponents: Array.from(unlockedComponents),
          badges,
          history: [historyEntry, ...previous.history].slice(0, HISTORY_LIMIT),
          lastReward: {
            xpEarned,
            bonusXp,
            bonusLabels,
            badgeIds: unlockedBadges,
            unlockedComponents: newlyUnlockedComponents,
            streak,
            timestamp,
            elapsedMs,
            source: "practice",
          },
        };

        reward = nextState.lastReward ?? null;
        return nextState;
      });
      return reward;
    },
    [],
  );

  const levelInfo = useMemo(() => computeLevelInfo(state.xp), [state.xp]);

  const unlockedBadges = useMemo(
    () => GAMIFICATION_BADGES.filter((badge) => state.badges[badge.id]?.unlocked),
    [state.badges],
  );

  const lockedBadges = useMemo(
    () => GAMIFICATION_BADGES.filter((badge) => !state.badges[badge.id]?.unlocked),
    [state.badges],
  );

  const unlockedComponentsDetailed = useMemo(
    () => COMPONENT_UNLOCKS.filter((unlock) => state.unlockedComponents.includes(unlock.id)),
    [state.unlockedComponents],
  );

  const nextComponentUnlock = useMemo(() => {
    const pending = COMPONENT_UNLOCKS.find((unlock) => !state.unlockedComponents.includes(unlock.id));
    if (!pending) {
      return undefined;
    }
    return {
      id: pending.id,
      label: pending.label,
      xpThreshold: pending.xpThreshold,
      remainingXp: Math.max(0, pending.xpThreshold - state.xp),
    };
  }, [state.unlockedComponents, state.xp]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const selfEntry: LeaderboardSeed = {
      id: "current-user",
      name: currentUser?.displayName || "You",
      xp: state.xp,
      location: currentUser?.bio || "Local Session",
    };
    const combined = [...LEADERBOARD_SEEDS, selfEntry]
      .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index)
      .sort((a, b) => b.xp - a.xp);
    return combined.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: entry.id === selfEntry.id,
    }));
  }, [currentUser?.displayName, currentUser?.bio, state.xp]);

  const value: GamificationContextValue = {
    state,
    level: levelInfo.level,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpToNextLevel: levelInfo.xpToNextLevel,
    levelProgress: levelInfo.levelProgress,
    unlockedBadges,
    lockedBadges,
    leaderboard,
    unlockedComponentsDetailed,
    nextComponentUnlock,
    recordCompletion,
    grantArcadeReward: (meta) => {
      let reward: GamificationReward | null = null;
      setState((previous) => {
        const timestamp = Date.now();
        const xpEarned = Math.max(0, Math.round(meta.xp));
        const bonusLabels = Array.isArray(meta.bonusLabels) ? meta.bonusLabels : [];

        if (!xpEarned) {
          return previous;
        }

        const unlockedComponents = new Set(previous.unlockedComponents);
        const newlyUnlockedComponents: string[] = [];
        COMPONENT_UNLOCKS.forEach((unlock) => {
          if (unlockedComponents.has(unlock.id)) {
            return;
          }
          if (previous.xp + xpEarned >= unlock.xpThreshold) {
            unlockedComponents.add(unlock.id);
            newlyUnlockedComponents.push(unlock.id);
          }
        });

        const nextState: GamificationState = {
          ...previous,
          xp: previous.xp + xpEarned,
          unlockedComponents: Array.from(unlockedComponents),
          lastReward: {
            xpEarned,
            bonusXp: 0,
            bonusLabels,
            badgeIds: [],
            unlockedComponents: newlyUnlockedComponents,
            streak: previous.streak,
            timestamp,
            source: "arcade",
            primaryLabel: meta.label,
          },
        };

        reward = nextState.lastReward ?? null;
        return nextState;
      });
      return reward;
    },
  };

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
};

