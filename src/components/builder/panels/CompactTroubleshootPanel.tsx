import { useMemo } from "react";
import type { TroubleshootingProblem } from "../../../data/troubleshootingProblems";
import TroubleshootCircuitDiagram from "../../troubleshoot/TroubleshootCircuitDiagram";
import WordMark from "../../WordMark";
import "../../../styles/compact-troubleshoot.css";

type CompactTroubleshootPanelProps = {
  problems: TroubleshootingProblem[];
  activeProblemId: string | null;
  solvedIds: string[];
  status: string | null;
  isOpen: boolean;
  isChecking: boolean;
  isFrameReady: boolean;
  isCircuitLocked: boolean;
  onToggle: () => void;
  onExitMode: () => void;
  onSelectProblem: (problemId: string) => void;
  onResetCircuit: () => void;
  onCheckFix: () => void;
  onNextProblem: () => void;
  onUnlockEditing?: () => void;
};

const getStatusTone = (status: string | null): "success" | "warning" | "neutral" => {
  if (!status) return "neutral";
  const normalized = status.trim().toLowerCase();
  if (normalized.startsWith("solved")) return "success";
  if (normalized.startsWith("checking")) return "neutral";
  return "warning";
};

export function CompactTroubleshootPanel({
  problems,
  activeProblemId,
  solvedIds,
  status,
  isOpen,
  isChecking,
  isFrameReady,
  isCircuitLocked,
  onToggle,
  onExitMode,
  onSelectProblem,
  onResetCircuit,
  onCheckFix,
  onNextProblem,
  onUnlockEditing,
}: CompactTroubleshootPanelProps) {
  const activeProblem = useMemo(
    () => problems.find((problem) => problem.id === activeProblemId) ?? null,
    [activeProblemId, problems],
  );
  const solvedCount = useMemo(
    () => problems.filter((problem) => solvedIds.includes(problem.id)).length,
    [problems, solvedIds],
  );
  const isActiveSolved = activeProblem ? solvedIds.includes(activeProblem.id) : false;
  const statusTone = getStatusTone(status);
  const statusText =
    status ??
    (isCircuitLocked
      ? "3D problem loaded in workspace. Pan, zoom, and rotate to inspect while editing stays locked."
      : "Circuit is unlocked. You can now edit this solved troubleshooting problem.");

  return (
    <div className={`compact-troubleshoot-panel${isOpen ? " open" : ""}`}>
      <div className="compact-troubleshoot-header">
        <div className="compact-troubleshoot-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="compact-troubleshoot-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">
            {isActiveSolved ? "Fix Verified" : "Troubleshooting Problem"}
          </span>
        </button>
        <div className="compact-troubleshoot-header-actions">
          <button
            type="button"
            className="compact-troubleshoot-exit-btn"
            onClick={onExitMode}
          >
            Exit Mode
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="compact-troubleshoot-body">
          {!activeProblem ? (
            <div className="compact-troubleshoot-empty">
              No troubleshooting problems are available.
            </div>
          ) : (
            <>
              <div className="troubleshoot-toolbar">
                <label className="troubleshoot-select">
                  Problem
                  <select
                    value={activeProblem.id}
                    onChange={(event) => onSelectProblem(event.target.value)}
                  >
                    {problems.map((problem) => (
                      <option key={problem.id} value={problem.id}>
                        {problem.title}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="troubleshoot-progress">
                  Progress:{" "}
                  <strong>
                    {solvedCount}/{problems.length}
                  </strong>
                </span>
                <span
                  className={`troubleshoot-lock-chip ${isCircuitLocked ? "locked" : "unlocked"}`}
                >
                  {isCircuitLocked ? "Locked until solved" : "Editing unlocked"}
                </span>
              </div>

              <section className="troubleshoot-problem-card">
                <div className="troubleshoot-copy-column">
                  <div className="troubleshoot-title-row">
                    <h3>{activeProblem.title}</h3>
                    {isActiveSolved && <span className="troubleshoot-solved-pill">Solved</span>}
                  </div>
                  <p className="troubleshoot-prompt">{activeProblem.prompt}</p>
                  {activeProblem.hints?.length ? (
                    <ul className="troubleshoot-hints">
                      {activeProblem.hints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="troubleshoot-diagram-column">
                  <TroubleshootCircuitDiagram problem={activeProblem} />
                </div>
              </section>

              <div className={`troubleshoot-status troubleshoot-status--${statusTone}`}>
                {statusText}
              </div>

              <div className="troubleshoot-actions">
                <button
                  type="button"
                  className="troubleshoot-action-btn"
                  onClick={onResetCircuit}
                >
                  Reset Circuit
                </button>
                <button
                  type="button"
                  className="troubleshoot-action-btn"
                  onClick={onCheckFix}
                  disabled={!isFrameReady || isChecking}
                  aria-disabled={!isFrameReady || isChecking}
                  title={
                    !isFrameReady
                      ? "Workspace is still loading"
                      : "Run simulation and validate your fix"
                  }
                >
                  {isChecking ? "Checking..." : "Check Fix"}
                </button>
                <button
                  type="button"
                  className="troubleshoot-action-btn"
                  onClick={onNextProblem}
                >
                  Next Problem
                </button>
                {isActiveSolved && isCircuitLocked && onUnlockEditing && (
                  <button
                    type="button"
                    className="troubleshoot-action-btn troubleshoot-action-btn--unlock"
                    onClick={onUnlockEditing}
                  >
                    Unlock and Edit
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

