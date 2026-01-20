import { useMemo } from "react";
import { useGamification } from "../../context/GamificationContext";
import { COMPONENT_UNLOCKS } from "../../data/gamification";
import "../../styles/practice.css";

const formatPercent = (value: number) => `${Math.round(Math.min(100, Math.max(0, value * 100)))}%`;

const formatCount = (value: number) =>
  value > 999 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${value}`;

export function ProgressDashboard() {
  const {
    state,
    level,
    xpIntoLevel,
    xpToNextLevel,
    levelProgress,
    unlockedBadges,
    lockedBadges,
    leaderboard,
    unlockedComponentsDetailed,
    nextComponentUnlock,
  } = useGamification();

  const requirement = xpIntoLevel + xpToNextLevel;
  const levelLabel = `Level ${level}`;
  const levelStats = `${Math.round(xpIntoLevel)} XP / ${Math.round(requirement)} XP`;
  const statItems = [
    { label: "Cleared", value: state.totalCompletions },
    { label: "Unique", value: Object.keys(state.completionIndex).length },
    { label: "Streak", value: state.streak, suffix: "d" },
  ];
  const rewardPrimary = state.lastReward
    ? state.lastReward.badgeIds.length
      ? `Unlocked ${state.lastReward.badgeIds.length} badge${state.lastReward.badgeIds.length > 1 ? "s" : ""}`
      : state.lastReward.unlockedComponents.length
        ? "New component added to your lab"
        : "Worksheet mastered"
    : null;
  const rewardBonus =
    state.lastReward?.bonusLabels?.length && state.lastReward.bonusXp
      ? `+${state.lastReward.bonusXp} XP ${state.lastReward.bonusLabels.join(" + ")} bonus`
      : null;

  const featuredBadges = useMemo(() => {
    const nextBadge = lockedBadges[0];
    const unlockedRecent = unlockedBadges.slice(-2);
    return [...unlockedRecent, ...(nextBadge ? [nextBadge] : [])];
  }, [lockedBadges, unlockedBadges]);

  return (
    <section className="challenge-card" aria-live="polite">
      <div className="challenge-card-header">
        <div>
          <h2>Challenge Mode</h2>
          <p>Earn XP, unlock lab parts, and climb the leaderboard.</p>
        </div>
        <span className="challenge-level">{levelLabel}</span>
      </div>

      <div
        className="challenge-level-bar"
        role="progressbar"
        aria-valuenow={Math.round(levelProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Experience progress"
      >
        <div className="challenge-level-bar-fill" style={{ width: formatPercent(levelProgress) }} />
        <span className="challenge-level-bar-label">{levelStats}</span>
      </div>

      {state.lastReward && (
        <div className="challenge-reward-banner">
          <span>+{state.lastReward.xpEarned} XP</span>
          <small>
            {rewardPrimary}
            {rewardBonus ? ` | ${rewardBonus}` : ""}
          </small>
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

      {leaderboard.length ? (
        <div className="challenge-leaderboard">
          <div className="challenge-leaderboard-header">
            <strong>Lab Leaderboard</strong>
            <small>Top builders this week</small>
          </div>
          <ul>
            {leaderboard.map((entry) => (
              <li key={entry.id} className={entry.isCurrentUser ? "is-current" : undefined}>
                <span className="rank">#{entry.rank}</span>
                <div>
                  <strong>{entry.name}</strong>
                  <small>{entry.location}</small>
                </div>
                <span className="xp">{entry.xp} XP</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {unlockedComponentsDetailed.length ? (
        <div className="challenge-components">
          <div className="challenge-components-header">
            <strong>Unlocked Components</strong>
            <small>{unlockedComponentsDetailed.length}/{COMPONENT_UNLOCKS.length} unlocked</small>
          </div>
          <div className="challenge-components-grid">
            {unlockedComponentsDetailed.map((component) => (
              <div key={component.id} className="challenge-component">
                <span aria-hidden="true">{component.icon}</span>
                <div>
                  <strong>{component.label}</strong>
                  <small>{component.description}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {featuredBadges.length ? (
        <div className="challenge-badge-row" aria-label="Achievement badges">
          {featuredBadges.map((badge) => {
            const unlocked = !!state.badges[badge.id]?.unlocked;
            return (
              <div key={badge.id} className={`challenge-badge${unlocked ? " is-unlocked" : ""}`}>
                <div className="challenge-badge-icon" aria-hidden="true">
                  {badge.icon}
                </div>
                <div>
                  <strong>{badge.title}</strong>
                  <small>{unlocked ? "Unlocked" : "Next target"}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {nextComponentUnlock && (
        <div className="challenge-next">
          <div className="challenge-next-header">
            <strong>Next lab unlock: {nextComponentUnlock.label}</strong>
            <span>{nextComponentUnlock.remainingXp} XP to go</span>
          </div>
          <p>Complete worksheets to unlock new builder components and arena presets.</p>
          <div className="challenge-next-bar">
            <div
              className="challenge-next-bar-fill"
              style={{
                width: `${Math.min(
                  100,
                  ((nextComponentUnlock.xpThreshold - nextComponentUnlock.remainingXp) / nextComponentUnlock.xpThreshold) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default ProgressDashboard;

