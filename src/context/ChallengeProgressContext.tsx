import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PracticeDifficulty, PracticeProblem, PracticeTopology } from "../model/practice";
import {
  BASE_XP_BY_DIFFICULTY,
  CHALLENGE_ACHIEVEMENTS,
  REPEAT_COMPLETION_BONUS,
  UNIQUE_COMPLETION_BONUS,
  type ChallengeAchievement,
  type ChallengeRequirement,
} from "../data/challenges";

type CompletionMeta = {
  count: number;
  lastCompletedAt: number;
};

type CompletionHistoryEntry = {
  id: string;
  timestamp: number;
  problemId: string;
  topology: PracticeTopology;
  difficulty: PracticeDifficulty;
};

type ChallengeAchievementState = {
  unlocked: boolean;
  unlockedAt?: number;
};

type ChallengeReward = {
  xpEarned: number;
  achievementIds: string[];
  timestamp: number;
};

type ChallengeState = {
  xp: number;
  totalCompletions: number;
  completionIndex: Record<string, CompletionMeta>;
  byTopology: Record<PracticeTopology, number>;
  byDifficulty: Record<PracticeDifficulty, number>;
  history: CompletionHistoryEntry[];
  streak: number;
  lastCompletionDay?: string;
  achievements: Record<string, ChallengeAchievementState>;
  lastReward?: ChallengeReward;
};

type ChallengeStats = {
  total: number;
  unique: number;
  byTopology: Record<PracticeTopology, number>;
  byDifficulty: Record<PracticeDifficulty, number>;
  streak: number;
};

type ChallengeContextValue = {
  state: ChallengeState;
  level: number;
  xpToNextLevel: number;
  xpIntoLevel: number;
  levelProgress: number;
  unlockedAchievements: ChallengeAchievement[];
  lockedAchievements: ChallengeAchievement[];
  nextMilestone?: {
    achievement: ChallengeAchievement;
    progress: number;
    target: number;
  };
  recordPracticeCompletion(problem: PracticeProblem): ChallengeReward | null;
};

const STORAGE_KEY = "circuiTry3d.challenge.progress.v1";
const HISTORY_LIMIT = 25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEVEL_BASE_REQUIREMENT = 120;
const LEVEL_STEP_INCREMENT = 60;

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

const DEFAULT_STATE: ChallengeState = {
  xp: 0,
  totalCompletions: 0,
  completionIndex: {},
  byTopology: createTopologyBaseline(),
  byDifficulty: createDifficultyBaseline(),
  history: [],
  streak: 0,
  achievements: {},
};

const ChallengeProgressContext = createContext<ChallengeContextValue | undefined>(undefined);

const formatDayKey = (timestamp: number): string => {
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
  const levelProgress = requirement === 0 ? 1 : Math.min(1, xpIntoLevel / requirement);

  return {
    level,
    xpIntoLevel,
    xpToNextLevel: Math.max(0, nextLevelXp - xp),
    levelProgress,
  };
};

const meetsRequirement = (requirement: ChallengeRequirement, stats: ChallengeStats): boolean => {
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
    default:
      return false;
  }
};

const readStoredState = (): ChallengeState => {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<ChallengeState>;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_STATE;
    }
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
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      achievements: parsed.achievements ?? {},
      streak: parsed.streak ?? 0,
      lastReward: parsed.lastReward,
    };
  } catch (error) {
    console.warn("[ChallengeProgress] Failed to read progress", error);
    return DEFAULT_STATE;
  }
};

const writeStoredState = (state: ChallengeState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[ChallengeProgress] Failed to persist progress", error);
  }
};

const evaluateNextMilestone = (
  stats: ChallengeStats,
  achievements: Record<string, ChallengeAchievementState>,
): { achievement: ChallengeAchievement; progress: number; target: number } | undefined => {
  const pending = CHALLENGE_ACHIEVEMENTS.find((achievement) => !achievements[achievement.id]?.unlocked);
  if (!pending) {
    return undefined;
  }

  const computeRatio = (requirement: ChallengeRequirement): { progress: number; target: number } => {
    switch (requirement.kind) {
      case "total":
        return { progress: stats.total, target: requirement.count };
      case "unique":
        return { progress: stats.unique, target: requirement.count };
      case "difficulty":
        return {
          progress: stats.byDifficulty[requirement.difficulty],
          target: requirement.count,
        };
      case "topology":
        return {
          progress: stats.byTopology[requirement.topology],
          target: requirement.count,
        };
      case "streak":
        return { progress: stats.streak, target: requirement.days };
      default:
        return { progress: 0, target: 1 };
    }
  };

  const { progress, target } = computeRatio(pending.requirement);
  return {
    achievement: pending,
    progress,
    target,
  };
};

export function ChallengeProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChallengeState>(() => readStoredState());

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  const recordPracticeCompletion = useCallback<ChallengeContextValue["recordPracticeCompletion"]>(
    (problem) => {
      let reward: ChallengeReward | null = null;
      setState((previous) => {
        const timestamp = Date.now();
        const dayKey = formatDayKey(timestamp);
        const completionIndex = { ...previous.completionIndex };
        const existing = completionIndex[problem.id];
        completionIndex[problem.id] = {
          count: (existing?.count ?? 0) + 1,
          lastCompletedAt: timestamp,
        };

        const byTopology = {
          ...previous.byTopology,
          [problem.topology]:
            (previous.byTopology[problem.topology] ?? 0) + 1,
        };

        const byDifficulty = {
          ...previous.byDifficulty,
          [problem.difficulty]:
            (previous.byDifficulty[problem.difficulty] ?? 0) + 1,
        };

        const totalCompletions = previous.totalCompletions + 1;
        const uniqueProblems = Object.keys(completionIndex).length;

        let streak = previous.streak || 0;
        if (!previous.lastCompletionDay) {
          streak = 1;
        } else if (previous.lastCompletionDay === dayKey) {
          streak = previous.streak;
        } else {
          const delta = daysBetween(previous.lastCompletionDay, dayKey);
          streak = delta === 1 ? previous.streak + 1 : 1;
        }

        const stats: ChallengeStats = {
          total: totalCompletions,
          unique: uniqueProblems,
          byTopology,
          byDifficulty,
          streak,
        };

        const baseXp = BASE_XP_BY_DIFFICULTY[problem.difficulty];
        const uniquenessBonus = existing ? REPEAT_COMPLETION_BONUS : UNIQUE_COMPLETION_BONUS;
        let xpEarned = baseXp + uniquenessBonus;

        const achievements = { ...previous.achievements };
        const unlocked: string[] = [];

        CHALLENGE_ACHIEVEMENTS.forEach((achievement) => {
          const status = achievements[achievement.id];
          if (status?.unlocked) {
            return;
          }
          if (meetsRequirement(achievement.requirement, stats)) {
            achievements[achievement.id] = {
              unlocked: true,
              unlockedAt: timestamp,
            };
            unlocked.push(achievement.id);
            xpEarned += achievement.xp;
          }
        });

        const historyEntry: CompletionHistoryEntry = {
          id: `${timestamp}-${problem.id}`,
          timestamp,
          problemId: problem.id,
          topology: problem.topology,
          difficulty: problem.difficulty,
        };

        const history = [historyEntry, ...previous.history].slice(0, HISTORY_LIMIT);
        const nextState: ChallengeState = {
          xp: previous.xp + xpEarned,
          totalCompletions,
          completionIndex,
          byTopology,
          byDifficulty,
          history,
          streak,
          lastCompletionDay: dayKey,
          achievements,
          lastReward: {
            xpEarned,
            achievementIds: unlocked,
            timestamp,
          },
        };

        reward = nextState.lastReward ?? null;
        return nextState;
      });
      return reward;
    },
    [],
  );

  const derived = useMemo(() => {
    const stats: ChallengeStats = {
      total: state.totalCompletions,
      unique: Object.keys(state.completionIndex).length,
      byTopology: state.byTopology,
      byDifficulty: state.byDifficulty,
      streak: state.streak,
    };

    const unlockedAchievements = CHALLENGE_ACHIEVEMENTS.filter(
      (achievement) => state.achievements[achievement.id]?.unlocked,
    );
    const lockedAchievements = CHALLENGE_ACHIEVEMENTS.filter(
      (achievement) => !state.achievements[achievement.id]?.unlocked,
    );

    const milestone = evaluateNextMilestone(stats, state.achievements);

    return {
      stats,
      unlockedAchievements,
      lockedAchievements,
      milestone,
    };
  }, [state.achievements, state.byDifficulty, state.byTopology, state.completionIndex, state.streak, state.totalCompletions]);

  const levelInfo = useMemo(() => computeLevelInfo(state.xp), [state.xp]);

  const value: ChallengeContextValue = {
    state,
    level: levelInfo.level,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpToNextLevel: levelInfo.xpToNextLevel,
    levelProgress: levelInfo.levelProgress,
    unlockedAchievements: derived.unlockedAchievements,
    lockedAchievements: derived.lockedAchievements,
    nextMilestone: derived.milestone
      ? {
          achievement: derived.milestone.achievement,
          progress: derived.milestone.progress,
          target: derived.milestone.target,
        }
      : undefined,
    recordPracticeCompletion,
  };

  return (
    <ChallengeProgressContext.Provider value={value}>
      {children}
    </ChallengeProgressContext.Provider>
  );
}

export const useChallengeProgress = () => {
  const context = useContext(ChallengeProgressContext);
  if (!context) {
    throw new Error("useChallengeProgress must be used within a ChallengeProgressProvider");
  }
  return context;
};
