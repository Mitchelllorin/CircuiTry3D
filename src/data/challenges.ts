import type { PracticeDifficulty, PracticeTopology } from "../model/practice";

export type ChallengeRequirement =
  | { kind: "total"; count: number }
  | { kind: "unique"; count: number }
  | { kind: "difficulty"; difficulty: PracticeDifficulty; count: number }
  | { kind: "topology"; topology: PracticeTopology; count: number }
  | { kind: "streak"; days: number };

export type ChallengeAchievement = {
  id: string;
  title: string;
  description: string;
  requirement: ChallengeRequirement;
  xp: number;
  icon: string;
};

export const BASE_XP_BY_DIFFICULTY: Record<PracticeDifficulty, number> = {
  intro: 15,
  standard: 25,
  challenge: 40,
};

export const UNIQUE_COMPLETION_BONUS = 10;
export const REPEAT_COMPLETION_BONUS = 4;

export const CHALLENGE_ACHIEVEMENTS: ChallengeAchievement[] = [
  {
    id: "first-spark",
    title: "First Spark",
    description: "Complete any worksheet to ignite your streak.",
    requirement: { kind: "total", count: 1 },
    xp: 30,
    icon: "✨",
  },
  {
    id: "worksheet-warrior",
    title: "Worksheet Warrior",
    description: "Solve five total worksheets.",
    requirement: { kind: "total", count: 5 },
    xp: 40,
    icon: "🛡️",
  },
  {
    id: "wire-master",
    title: "W.I.R.E. Master",
    description: "Complete fifteen total worksheets.",
    requirement: { kind: "total", count: 15 },
    xp: 60,
    icon: "🏆",
  },
  {
    id: "unique-explorer",
    title: "Unique Explorer",
    description: "Solve eight different practice problems.",
    requirement: { kind: "unique", count: 8 },
    xp: 45,
    icon: "🧭",
  },
  {
    id: "series-specialist",
    title: "Series Specialist",
    description: "Finish three series topology worksheets.",
    requirement: { kind: "topology", topology: "series", count: 3 },
    xp: 35,
    icon: "🔗",
  },
  {
    id: "parallel-pro",
    title: "Parallel Pro",
    description: "Finish three parallel topology worksheets.",
    requirement: { kind: "topology", topology: "parallel", count: 3 },
    xp: 35,
    icon: "🔀",
  },
  {
    id: "combo-conqueror",
    title: "Combo Conqueror",
    description: "Finish three combination topology worksheets.",
    requirement: { kind: "topology", topology: "combination", count: 3 },
    xp: 35,
    icon: "🎯",
  },
  {
    id: "challenge-conqueror",
    title: "Challenge Conqueror",
    description: "Clear three challenge difficulty worksheets.",
    requirement: { kind: "difficulty", difficulty: "challenge", count: 3 },
    xp: 50,
    icon: "💥",
  },
  {
    id: "streak-trio",
    title: "Streak Trio",
    description: "Complete worksheets on three consecutive days.",
    requirement: { kind: "streak", days: 3 },
    xp: 45,
    icon: "🔥",
  },
  {
    id: "streak-legend",
    title: "Streak Legend",
    description: "Stay active seven days in a row.",
    requirement: { kind: "streak", days: 7 },
    xp: 75,
    icon: "⚡",
  },
];
