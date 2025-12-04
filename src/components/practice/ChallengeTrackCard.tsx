import { useMemo } from "react";
import { useChallengeProgress } from "../../context/ChallengeProgressContext";
import type { ChallengeAchievement } from "../../data/challenges";
import "../../styles/practice.css";

const formatPercent = (value: number) =>
  `${Math.round(Math.min(100, Math.max(0, value * 100)))}%`;

const formatCount = (value: number) =>
  value > 999 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${value}`;

const pickBadgePreview = (
  unlocked: ChallengeAchievement[],
  locked: ChallengeAchievement[],
): ChallengeAchievement[] => {
  const featuredUnlocked = unlocked.slice(-2);
  const firstLocked = locked[0] ? [locked[0]] : [];
  const combined = [...featuredUnlocked, ...firstLocked];
  return combined.length ? combined : locked.slice(0, 3);
};

export function ChallengeTrackCard() {
  const {
    state,
    level,
    xpIntoLevel,
    xpToNextLevel,
    levelProgress,
    unlockedAchievements,
    lockedAchievements,
    nextMilestone,
  } = useChallengeProgress();

  const uniqueProblems = Object.keys(state.completionIndex).length;
  const requirement = xpIntoLevel + xpToNextLevel;
  const levelLabel = `Level ${level}`;
  const levelStats = `${Math.round(xpIntoLevel)} XP / ${Math.round(requirement)} XP`;
  const statItems = [
    { label: "Cleared", value: state.totalCompletions },
    { label: "Unique", value: uniqueProblems },
    { label: "Streak", value: state.streak, suffix: "d" },
  ];

  const badgePreview = useMemo(
    () => pickBadgePreview(unlockedAchievements, lockedAchievements),
    [lockedAchievements, unlockedAchievements],
  );

  return (
    <section className="challenge-card" aria-live="polite">
      <div className="challenge-card-header">
        <div>
          <h2>Challenge Mode</h2>
          <p>Earn XP, level up, and unlock teaching badges.</p>
        </div>
        <span className="challenge-level">{levelLabel}</span>
      </div>

      <div className="challenge-level-bar" role="progressbar" aria-valuenow={Math.round(levelProgress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Experience progress">
        <div className="challenge-level-bar-fill" style={{ width: formatPercent(levelProgress) }} />
        <span className="challenge-level-bar-label">{levelStats}</span>
      </div>

      {state.lastReward && (
        <div className="challenge-reward-banner">
          <span>+{state.lastReward.xpEarned} XP</span>
          {state.lastReward.achievementIds.length ? (
            <small>
              Unlocked {state.lastReward.achievementIds.length} badge
              {state.lastReward.achievementIds.length > 1 ? "s" : ""}
            </small>
          ) : (
            <small>Worksheet mastered</small>
          )}
        </div>
      )}

      <div className="challenge-stats-grid">
        {statItems.map((stat) => (
          <div key={stat.label} className="challenge-stat">
            <span className="challenge-stat-label">{stat.label}</span>
            <strong className="challenge-stat-value">
              {formatCount(stat.value)}
              {stat.suffix ?? ""}
            </strong>
          </div>
        ))}
      </div>

      {badgePreview.length ? (
        <div className="challenge-badge-row" aria-label="Achievement badges">
          {badgePreview.map((badge) => {
            const unlocked = !!state.achievements[badge.id]?.unlocked;
            return (
              <div
                key={badge.id}
                className={`challenge-badge${unlocked ? " is-unlocked" : ""}`}
              >
                <div className="challenge-badge-icon" aria-hidden="true">
                  {badge.icon}
                </div>
                <div>
                  <strong>{badge.title}</strong>
                  <small>{unlocked ? "Unlocked" : "Locked"}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {nextMilestone && (
        <div className="challenge-next">
          <div className="challenge-next-header">
            <strong>Next unlock: {nextMilestone.achievement.title}</strong>
            <span>
              {nextMilestone.progress}/{nextMilestone.target}
            </span>
          </div>
          <p>{nextMilestone.achievement.description}</p>
          <div className="challenge-next-bar">
            <div
              className="challenge-next-bar-fill"
              style={{
                width: `${Math.min(
                  100,
                  (nextMilestone.progress / nextMilestone.target) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default ChallengeTrackCard;
