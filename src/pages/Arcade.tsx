import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandSignature from "../components/BrandSignature";
import RetroCircuitMaze from "../components/arcade/RetroCircuitMaze";
import OhmsRacer from "../components/arcade/OhmsRacer";
import VoltFighter from "../components/arcade/VoltFighter";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import {
  ARCADE_CLEAN_SEEDS,
  ARCADE_SPRINT_SEEDS,
  CLEAN_SOLVE_BONUS,
  SPRINT_BONUS_BY_DIFFICULTY,
  SPRINT_TARGET_MS_BY_DIFFICULTY,
} from "../data/gamification";
import { findPracticeProblemById } from "../data/practiceProblems";
import "../styles/arcade.css";

const formatPercent = (value: number) => `${Math.round(Math.min(100, Math.max(0, value * 100)))}%`;

const formatDuration = (ms?: number) => {
  const safeMs = typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.round(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const CIRCUIT_FACTS = [
  {
    fact: "Ohm's Law: V = I × R — voltage equals current times resistance.",
    tip: "In CircuiTry3D, watch how the voltage readout changes as you swap resistor values in a series circuit.",
  },
  {
    fact: "In a series circuit all components share the same current path — break one link and the whole loop stops.",
    tip: "Try removing a single resistor in a series build in CircuiTry3D and watch every component go dark.",
  },
  {
    fact: "In a parallel circuit each branch receives the full supply voltage independently.",
    tip: "Add a second branch in CircuiTry3D and notice that the first branch's brightness doesn't drop.",
  },
  {
    fact: "A capacitor stores energy in an electric field between two conducting plates.",
    tip: "Charge a capacitor in CircuiTry3D then disconnect the source — the stored charge will slowly drain through a resistor.",
  },
  {
    fact: "A resistor limits current flow and converts electrical energy into heat (P = I² × R).",
    tip: "Swap in a higher-resistance component in CircuiTry3D and watch the current meter drop in real time.",
  },
  {
    fact: "A diode only allows current to flow in one direction — reverse it and the circuit goes dead.",
    tip: "Flip a diode backwards in CircuiTry3D to see how forward vs reverse bias changes the simulation.",
  },
  {
    fact: "Power formula: P = V × I. Doubling current quadruples the power consumed by a resistor.",
    tip: "Use CircuiTry3D's power display to compare a series vs parallel arrangement of identical bulbs.",
  },
  {
    fact: "Kirchhoff's Current Law: all current entering a junction must equal all current leaving it.",
    tip: "Place a current probe at a parallel junction in CircuiTry3D and verify the branch currents add up.",
  },
  {
    fact: "Kirchhoff's Voltage Law: the sum of all voltage drops around any closed loop equals zero.",
    tip: "Trace a complete loop in CircuiTry3D with the voltage inspector — the drops will always balance the supply.",
  },
  {
    fact: "A short circuit provides a near-zero resistance path, causing dangerously high current.",
    tip: "CircuiTry3D's safety mode will flash a warning when a short is detected in your build.",
  },
  {
    fact: "AC (alternating current) reverses direction many times per second — household supply is typically 50 or 60 Hz.",
    tip: "Switch to the AC source in CircuiTry3D and observe how the oscilloscope waveform changes.",
  },
  {
    fact: "A transistor can amplify a signal or act as a digital switch — the foundation of all modern chips.",
    tip: "Use a transistor as a switch in CircuiTry3D to control a high-power LED with a tiny base current.",
  },
];

type SprintLeaderboardRow = {
  id: string;
  name: string;
  bestMs: number;
  location: string;
  rank: number;
  isCurrentUser: boolean;
};

type CleanLeaderboardRow = {
  id: string;
  name: string;
  clears: number;
  location: string;
  rank: number;
  isCurrentUser: boolean;
};

export default function Arcade() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tipIndex, setTipIndex] = useState(0);
  const [activeGame, setActiveGame] = useState<"maze" | "racer" | "fighter">("maze");

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CIRCUIT_FACTS.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);
  const { setWorkspaceMode } = useWorkspaceMode();
  const {
    state,
    level,
    xpIntoLevel,
    xpToNextLevel,
    levelProgress,
    leaderboard,
    unlockedBadges,
    lockedBadges,
    unlockedComponentsDetailed,
    nextComponentUnlock,
  } = useGamification();

  const handleLaunchPractice = useCallback(() => {
    setWorkspaceMode("practice");
    navigate("/app");
  }, [navigate, setWorkspaceMode]);

  const bestRuns = useMemo(() => {
    return Object.entries(state.bestTimes)
      .map(([problemId, bestMs]) => {
        const problem = findPracticeProblemById(problemId);
        return {
          id: problemId,
          title: problem?.title ?? "Unknown circuit",
          topology: problem?.topology ?? "unknown",
          bestMs,
        };
      })
      .filter((entry) => Number.isFinite(entry.bestMs))
      .sort((a, b) => a.bestMs - b.bestMs)
      .slice(0, 5);
  }, [state.bestTimes]);

  const recentRewards = useMemo(() => {
    return state.history.slice(0, 6).map((entry) => {
      const problem = findPracticeProblemById(entry.problemId);
      return {
        id: entry.id,
        title: problem?.title ?? "Unknown circuit",
        topology: entry.topology,
        difficulty: entry.difficulty,
        xpEarned: entry.xpEarned,
        timestamp: new Date(entry.timestamp),
      };
    });
  }, [state.history]);

  const personalBestMs = bestRuns[0]?.bestMs;

  const sprintLeaderboard = useMemo<SprintLeaderboardRow[]>(() => {
    const userEntry = personalBestMs
      ? {
          id: "current-user",
          name: currentUser?.displayName || "You",
          bestMs: personalBestMs,
          location: currentUser?.bio || "Local Session",
        }
      : null;

    const combined = [...ARCADE_SPRINT_SEEDS, ...(userEntry ? [userEntry] : [])]
      .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index)
      .sort((a, b) => a.bestMs - b.bestMs);

    return combined.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: entry.id === "current-user",
    }));
  }, [currentUser?.displayName, currentUser?.bio, personalBestMs]);

  const cleanLeaderboard = useMemo<CleanLeaderboardRow[]>(() => {
    const userEntry = {
      id: "current-user",
      name: currentUser?.displayName || "You",
      clears: state.cleanSolves,
      location: currentUser?.bio || "Local Session",
    };

    const combined = [...ARCADE_CLEAN_SEEDS, userEntry]
      .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index)
      .sort((a, b) => b.clears - a.clears);

    return combined.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: entry.id === userEntry.id,
    }));
  }, [currentUser?.displayName, currentUser?.bio, state.cleanSolves]);

  const rewardSummary = state.lastReward
    ? {
        xp: state.lastReward.xpEarned,
        bonus: state.lastReward.bonusXp,
        labels: state.lastReward.bonusLabels,
      }
    : null;

  const arcadeStats = [
    { label: "Level", value: `Lv ${level}` },
    { label: "Total XP", value: `${Math.round(state.xp)} XP` },
    { label: "Clean clears", value: `${state.cleanSolves}` },
    { label: "Sprint clears", value: `${state.speedSolves}` },
    { label: "Streak", value: `${state.streak} days` },
    { label: "Best sprint", value: personalBestMs ? formatDuration(personalBestMs) : "--:--" },
  ];

  const sprintTargets = [
    {
      label: "Intro",
      target: formatDuration(SPRINT_TARGET_MS_BY_DIFFICULTY.intro),
      bonus: SPRINT_BONUS_BY_DIFFICULTY.intro,
    },
    {
      label: "Standard",
      target: formatDuration(SPRINT_TARGET_MS_BY_DIFFICULTY.standard),
      bonus: SPRINT_BONUS_BY_DIFFICULTY.standard,
    },
    {
      label: "Challenge",
      target: formatDuration(SPRINT_TARGET_MS_BY_DIFFICULTY.challenge),
      bonus: SPRINT_BONUS_BY_DIFFICULTY.challenge,
    },
  ];

  return (
    <div className="arcade-page">
      <header className="arcade-hero">
        <div className="arcade-hero-copy">
          <BrandSignature size="sm" decorative className="arcade-brand" />
          <p className="arcade-eyebrow">Circuit Arcade</p>
          <h1>Speed sprints, clean clears, and retro maze runs in one hub.</h1>
          <p>
            Track your fastest solves, lock in clean runs, and play an 80s-style
            cabinet challenge. Arcade progress saves automatically to this
            device.
          </p>
          <div className="arcade-hero-actions">
            <button type="button" onClick={handleLaunchPractice}>
              Launch Practice Mode
            </button>
            <button type="button" className="ghost" onClick={handleLaunchPractice}>
              Start a Sprint
            </button>
          </div>
        </div>
        <div className="arcade-hero-stats">
          {arcadeStats.map((stat) => (
            <div key={stat.label} className="arcade-stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* ── Unified Arcade Cabinet ── */}
      <section className="arcade-panel arcade-cabinet-panel">
        <div className="arcade-panel-header">
          <div>
            <h2>Retro Arcade Cabinet</h2>
            <p>Pick a game title, then play in the screen below.</p>
          </div>
        </div>

        {/* Game title selector */}
        <div className="arcade-game-selector" role="group" aria-label="Choose game">
          <button
            type="button"
            className={activeGame === "maze" ? "is-active" : ""}
            onClick={() => setActiveGame("maze")}
          >
            Circuit Chase &#39;84
          </button>
          <button
            type="button"
            className={activeGame === "racer" ? "is-active" : ""}
            onClick={() => setActiveGame("racer")}
          >
            Ohm&#39;s Racer &#39;85
          </button>
          <button
            type="button"
            className={activeGame === "fighter" ? "is-active" : ""}
            onClick={() => setActiveGame("fighter")}
          >
            Volt Fighter &#39;87
          </button>
        </div>

        {/* Game screen */}
        <div className="arcade-cabinet-screen">
          {activeGame === "maze" && <RetroCircuitMaze />}
          {activeGame === "racer" && <OhmsRacer />}
          {activeGame === "fighter" && <VoltFighter />}
        </div>
      </section>

      {/* ── Circuit Lab Notes (rotating educational facts) ── */}
      <section className="arcade-panel arcade-facts-panel">
        <div className="arcade-panel-header">
          <div>
            <h2>Circuit Lab Notes</h2>
            <p>Facts and tips to level up your circuit knowledge.</p>
          </div>
          <div className="arcade-facts-nav" aria-label="Navigate facts">
            <button
              type="button"
              aria-label="Previous fact"
              onClick={() =>
                setTipIndex((prev) => (prev - 1 + CIRCUIT_FACTS.length) % CIRCUIT_FACTS.length)
              }
            >
              ‹
            </button>
            <span>
              {tipIndex + 1}&thinsp;/&thinsp;{CIRCUIT_FACTS.length}
            </span>
            <button
              type="button"
              aria-label="Next fact"
              onClick={() =>
                setTipIndex((prev) => (prev + 1) % CIRCUIT_FACTS.length)
              }
            >
              ›
            </button>
          </div>
        </div>
        <div className="arcade-fact-card">
          <p className="arcade-fact-text">
            <span aria-hidden="true">💡</span> {CIRCUIT_FACTS[tipIndex].fact}
          </p>
          <p className="arcade-fact-tip">
            <span aria-hidden="true">🎮</span> {CIRCUIT_FACTS[tipIndex].tip}
          </p>
        </div>
      </section>

      <section className="arcade-panel">
        <div className="arcade-panel-header">
          <div>
            <h2>Arcade Missions</h2>
            <p>Bonus XP rules that power the arcade.</p>
          </div>
          {rewardSummary ? (
            <div className="arcade-reward-pill">
              <strong>Last reward:</strong> +{rewardSummary.xp} XP
              {rewardSummary.bonus ? (
                <span>
                  +{rewardSummary.bonus} bonus
                  {rewardSummary.labels.length ? ` (${rewardSummary.labels.join(" + ")})` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="arcade-mission-grid">
          <article className="arcade-mission-card">
            <header>
              <h3>Speed Sprint</h3>
              <p>Finish within the time target for extra XP.</p>
            </header>
            <div className="arcade-mission-table">
              {sprintTargets.map((target) => (
                <div key={target.label} className="arcade-mission-row">
                  <span>{target.label}</span>
                  <strong>{target.target}</strong>
                  <small>+{target.bonus} XP</small>
                </div>
              ))}
            </div>
          </article>
          <article className="arcade-mission-card">
            <header>
              <h3>Clean Circuit</h3>
              <p>Keep assists off until completion.</p>
            </header>
            <div className="arcade-mission-highlight">
              <strong>Clean bonus</strong>
              <span>+{CLEAN_SOLVE_BONUS} XP per clear</span>
              <small>Skip reveals and step hints to lock it in.</small>
            </div>
          </article>
          <article className="arcade-mission-card">
            <header>
              <h3>Level Progress</h3>
              <p>Build XP toward the next unlock.</p>
            </header>
            <div className="arcade-progress">
              <div className="arcade-progress-bar" role="progressbar" aria-valuenow={Math.round(levelProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="arcade-progress-fill" style={{ width: formatPercent(levelProgress) }} />
              </div>
              <span>
                {Math.round(xpIntoLevel)} XP / {Math.round(xpIntoLevel + xpToNextLevel)} XP
              </span>
            </div>
            {nextComponentUnlock ? (
              <div className="arcade-next-unlock">
                <strong>Next unlock:</strong> {nextComponentUnlock.label}
                <small>{nextComponentUnlock.remainingXp} XP to go</small>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <div className="arcade-grid">
        <section className="arcade-panel">
          <div className="arcade-panel-header">
            <div>
              <h2>Leaderboards</h2>
              <p>Standings across the arcade highlights.</p>
            </div>
          </div>
          <div className="arcade-leaderboard-grid">
            <div className="arcade-leaderboard-card">
              <header>
                <h3>Lab XP</h3>
                <small>Top builders this week</small>
              </header>
              <ul>
                {leaderboard.map((entry) => (
                  <li key={entry.id} className={entry.isCurrentUser ? "is-current" : undefined}>
                    <span className="rank">#{entry.rank}</span>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>{entry.location}</small>
                    </div>
                    <span className="value">{entry.xp} XP</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="arcade-leaderboard-card">
              <header>
                <h3>Sprint Times</h3>
                <small>Fastest circuit clears</small>
              </header>
              <ul>
                {sprintLeaderboard.map((entry) => (
                  <li key={entry.id} className={entry.isCurrentUser ? "is-current" : undefined}>
                    <span className="rank">#{entry.rank}</span>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>{entry.location}</small>
                    </div>
                    <span className="value">{formatDuration(entry.bestMs)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="arcade-leaderboard-card">
              <header>
                <h3>Clean Runs</h3>
                <small>Most assists-free clears</small>
              </header>
              <ul>
                {cleanLeaderboard.map((entry) => (
                  <li key={entry.id} className={entry.isCurrentUser ? "is-current" : undefined}>
                    <span className="rank">#{entry.rank}</span>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>{entry.location}</small>
                    </div>
                    <span className="value">{entry.clears}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="arcade-panel">
          <div className="arcade-panel-header">
            <div>
              <h2>Performance Snapshot</h2>
              <p>Best runs, rewards, and unlocks at a glance.</p>
            </div>
          </div>
          <div className="arcade-performance-grid">
            <div className="arcade-performance-card">
              <header>
                <h3>Best Sprint Times</h3>
                <small>Personal bests</small>
              </header>
              {bestRuns.length ? (
                <ul>
                  {bestRuns.map((run) => (
                    <li key={run.id}>
                      <div>
                        <strong>{run.title}</strong>
                        <small>{run.topology}</small>
                      </div>
                      <span>{formatDuration(run.bestMs)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Complete a sprint to log your first best time.</p>
              )}
            </div>
            <div className="arcade-performance-card">
              <header>
                <h3>Recent Rewards</h3>
                <small>Last {recentRewards.length || 0} clears</small>
              </header>
              {recentRewards.length ? (
                <ul>
                  {recentRewards.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{entry.title}</strong>
                        <small>{entry.timestamp.toLocaleDateString()}</small>
                      </div>
                      <span>+{entry.xpEarned} XP</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Finish a worksheet to start your reward log.</p>
              )}
            </div>
            <div className="arcade-performance-card">
              <header>
                <h3>Component Unlocks</h3>
                <small>{unlockedComponentsDetailed.length} unlocked</small>
              </header>
              {unlockedComponentsDetailed.length ? (
                <ul>
                  {unlockedComponentsDetailed.map((component) => (
                    <li key={component.id}>
                      <div>
                        <strong>{component.label}</strong>
                        <small>{component.description}</small>
                      </div>
                      <span>{component.xpThreshold} XP</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Earn XP to unlock your first component pack.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="arcade-panel">
        <div className="arcade-panel-header">
          <div>
            <h2>Badges &amp; Milestones</h2>
            <p>Achievement tracking across practice modes.</p>
          </div>
          <div className="arcade-badge-summary">
            <span>{unlockedBadges.length} unlocked</span>
            <span>{lockedBadges.length} pending</span>
          </div>
        </div>
        <div className="arcade-badges-grid">
          {unlockedBadges.map((badge) => (
            <div key={badge.id} className="arcade-badge-card is-unlocked">
              <span className="arcade-badge-icon" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <strong>{badge.title}</strong>
                <small>{badge.description}</small>
              </div>
            </div>
          ))}
          {lockedBadges.slice(0, 6).map((badge) => (
            <div key={badge.id} className="arcade-badge-card">
              <span className="arcade-badge-icon" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <strong>{badge.title}</strong>
                <small>{badge.description}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
