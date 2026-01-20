import type { PracticeDifficulty, PracticeProblem, PracticeTopology } from "../../model/practice";

type CircuitGamesPanelProps = {
  problem: PracticeProblem;
  worksheetComplete: boolean;
  assistUsed: boolean;
  sprintActive: boolean;
  sprintElapsedMs: number;
  sprintTargetMs: number;
  sprintBonusXp: number;
  cleanBonusXp: number;
  sprintBestMs?: number;
  sprintLastMs?: number | null;
  cleanSolves: number;
  speedSolves: number;
  onStartSprint: () => void;
  onResetSprint: () => void;
  onShuffleProblem: () => void;
};

const TOPOLOGY_LABEL: Record<PracticeTopology, string> = {
  series: "Series",
  parallel: "Parallel",
  combination: "Combination",
};

const DIFFICULTY_LABEL: Record<PracticeDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  challenge: "Challenge",
};

const formatDuration = (ms: number) => {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.round(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function CircuitGamesPanel({
  problem,
  worksheetComplete,
  assistUsed,
  sprintActive,
  sprintElapsedMs,
  sprintTargetMs,
  sprintBonusXp,
  cleanBonusXp,
  sprintBestMs,
  sprintLastMs,
  cleanSolves,
  speedSolves,
  onStartSprint,
  onResetSprint,
  onShuffleProblem,
}: CircuitGamesPanelProps) {
  const sprintResult =
    typeof sprintLastMs === "number" ? sprintLastMs <= sprintTargetMs : null;
  const sprintDisplayMs = sprintActive
    ? sprintElapsedMs
    : sprintLastMs ?? 0;
  const sprintState = sprintActive
    ? "Live"
    : sprintLastMs
      ? "Recorded"
      : "Ready";
  const cleanState = worksheetComplete
    ? assistUsed
      ? "Assist used"
      : "Clean clear"
    : assistUsed
      ? "Assist on"
      : "Ready";

  return (
    <section className="arcade-card" aria-live="polite">
      <div className="arcade-card-header">
        <div>
          <h2>Circuit Arcade</h2>
          <p>Quick game modes for bonus XP and variety.</p>
        </div>
        <button
          type="button"
          className="arcade-shuffle"
          onClick={onShuffleProblem}
        >
          Surprise Circuit
        </button>
      </div>

      <div className="arcade-meta">
        <div className="arcade-meta-item">
          <span className="arcade-meta-label">Current mission</span>
          <strong>{problem.title}</strong>
          <small>
            {TOPOLOGY_LABEL[problem.topology]} -{" "}
            {DIFFICULTY_LABEL[problem.difficulty]}
          </small>
        </div>
        <div className="arcade-meta-item">
          <span className="arcade-meta-label">Arcade totals</span>
          <strong>{cleanSolves} clean clears</strong>
          <small>{speedSolves} sprint clears</small>
        </div>
      </div>

      <div className="arcade-grid">
        <div className="arcade-module">
          <div className="arcade-module-header">
            <div>
              <h3>Speed Sprint</h3>
              <p>
                Beat {formatDuration(sprintTargetMs)} for +{sprintBonusXp} XP.
              </p>
            </div>
            <span className={`arcade-pill${sprintActive ? " is-live" : ""}`}>
              {sprintState}
            </span>
          </div>

          <div className="arcade-timer">
            <strong className="arcade-timer-value">
              {formatDuration(sprintDisplayMs)}
            </strong>
            <span className="arcade-timer-label">
              {sprintActive
                ? "Sprint running"
                : sprintLastMs
                  ? "Last sprint"
                  : "Tap start to race"}
            </span>
          </div>

          <div className="arcade-timer-meta">
            <span>
              Best: {sprintBestMs ? formatDuration(sprintBestMs) : "--:--"}
            </span>
            <span>Target: {formatDuration(sprintTargetMs)}</span>
          </div>

          <div className="arcade-actions">
            <button
              type="button"
              onClick={sprintActive ? onResetSprint : onStartSprint}
              disabled={worksheetComplete && !sprintActive}
            >
              {sprintActive ? "Reset Sprint" : "Start Sprint"}
            </button>
            {worksheetComplete && sprintLastMs != null ? (
              <span
                className={`arcade-result${sprintResult ? " is-success" : " is-retry"}`}
              >
                {sprintResult ? "Sprint clear!" : "Try again for bonus"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="arcade-module">
          <div className="arcade-module-header">
            <div>
              <h3>Clean Circuit</h3>
              <p>
                Finish without reveals for +{cleanBonusXp} XP.
              </p>
            </div>
            <span
              className={`arcade-pill${
                worksheetComplete
                  ? assistUsed
                    ? " is-warning"
                    : " is-success"
                  : assistUsed
                    ? " is-warning"
                    : " is-ready"
              }`}
            >
              {cleanState}
            </span>
          </div>

          <div className="arcade-clean-status">
            <strong>
              {assistUsed ? "Assists active" : "Clean run intact"}
            </strong>
            <small>
              {worksheetComplete
                ? assistUsed
                  ? "Bonus skipped this round"
                  : "Bonus secured"
                : "Avoid reveals until the worksheet is complete"}
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CircuitGamesPanel;
