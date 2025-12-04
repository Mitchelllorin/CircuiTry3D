import type { PracticeDifficulty, PracticeTopology } from "../model/practice";

export type GamificationRequirement =
  | { kind: "total"; count: number }
  | { kind: "unique"; count: number }
  | { kind: "difficulty"; difficulty: PracticeDifficulty; count: number }
  | { kind: "topology"; topology: PracticeTopology; count: number }
  | { kind: "streak"; days: number }
  | { kind: "masteryTag"; tag: string; count: number }
  | { kind: "masterySpread"; distinct: number };

export type GamificationBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: GamificationRequirement;
  xp: number;
};

export type ComponentUnlock = {
  id: string;
  label: string;
  description: string;
  xpThreshold: number;
  icon: string;
};

export type LeaderboardSeed = {
  id: string;
  name: string;
  xp: number;
  location: string;
};

export const XP_REWARD_BY_DIFFICULTY: Record<PracticeDifficulty, number> = {
  intro: 20,
  standard: 32,
  challenge: 50,
};

export const UNIQUE_COMPLETION_BONUS = 12;
export const REPEAT_COMPLETION_BONUS = 4;
export const STREAK_STEP_BONUS = 6;
export const HISTORY_LIMIT = 25;

export const GAMIFICATION_BADGES: GamificationBadge[] = [
  {
    id: "first-light",
    title: "First Light",
    description: "Complete your first worksheet to power up the tracker.",
    icon: "💡",
    requirement: { kind: "total", count: 1 },
    xp: 25,
  },
  {
    id: "steady-hand",
    title: "Steady Hand",
    description: "Solve worksheets on three different days in a row.",
    icon: "🔥",
    requirement: { kind: "streak", days: 3 },
    xp: 40,
  },
  {
    id: "series-savant",
    title: "Series Savant",
    description: "Master five series circuit challenges.",
    icon: "🔗",
    requirement: { kind: "topology", topology: "series", count: 5 },
    xp: 35,
  },
  {
    id: "parallel-prodigy",
    title: "Parallel Prodigy",
    description: "Master five parallel circuit challenges.",
    icon: "🔀",
    requirement: { kind: "topology", topology: "parallel", count: 5 },
    xp: 35,
  },
  {
    id: "combo-captain",
    title: "Combination Captain",
    description: "Complete four combination circuit worksheets.",
    icon: "🧩",
    requirement: { kind: "topology", topology: "combination", count: 4 },
    xp: 35,
  },
  {
    id: "concept-curator",
    title: "Concept Curator",
    description: "Collect mastery in six distinct concept tags.",
    icon: "🧠",
    requirement: { kind: "masterySpread", distinct: 6 },
    xp: 45,
  },
  {
    id: "challenge-champion",
    title: "Challenge Champion",
    description: "Beat three challenge difficulty problems.",
    icon: "🏆",
    requirement: { kind: "difficulty", difficulty: "challenge", count: 3 },
    xp: 50,
  },
  {
    id: "unique-explorer",
    title: "Unique Explorer",
    description: "Solve ten different worksheets.",
    icon: "🧭",
    requirement: { kind: "unique", count: 10 },
    xp: 45,
  },
];

export const COMPONENT_UNLOCKS: ComponentUnlock[] = [
  {
    id: "precision-op-amp",
    label: "Precision Op-Amp",
    description: "Adds the precision instrumentation op-amp to the builder.",
    xpThreshold: 120,
    icon: "🎛️",
  },
  {
    id: "logic-decoder",
    label: "Hex Decoder",
    description: "Unlocks programmable logic decoder templates.",
    xpThreshold: 240,
    icon: "🧮",
  },
  {
    id: "sensor-pack",
    label: "Sensor Pack",
    description: "Adds the full sensor reference kit with thermistors & LDRs.",
    xpThreshold: 360,
    icon: "📦",
  },
  {
    id: "power-lab",
    label: "Power Lab",
    description: "Gain access to MOSFET driver templates for arena builds.",
    xpThreshold: 520,
    icon: "⚡",
  },
];

export const LEADERBOARD_SEEDS: LeaderboardSeed[] = [
  { id: "mentor-mia", name: "Mentor Mia", xp: 640, location: "Austin Lab" },
  { id: "builder-ben", name: "Builder Ben", xp: 520, location: "Denver Makerspace" },
  { id: "student-sky", name: "Student Sky", xp: 305, location: "STEM Charter" },
  { id: "coach-lia", name: "Coach Lia", xp: 450, location: "Robotics Club" },
];

