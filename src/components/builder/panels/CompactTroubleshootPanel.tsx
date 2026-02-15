import { useMemo } from "react";
import type { TroubleshootingProblem } from "../../../data/troubleshootingProblems";
import TroubleshootCircuitDiagram from "../../troubleshoot/TroubleshootCircuitDiagram";
import BrandSignature from "../../BrandSignature";
import "../../../styles/compact-troubleshoot.css";

type CompactTroubleshootPanelProps = {
  problems: TroubleshootingProblem[];
  activeProblemId: string | null;
  solvedIds: string[];
  isFixVerified?: boolean;
  status: string | null;
  isOpen: boolean;
  isChecking: boolean;
  isFrameReady: boolean;
  isCircuitLocked: boolean;
  onToggle: () => void;
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
  isFixVerified = false,
  status,
  isOpen,
  isChecking,
  isFrameReady,
  isCircuitLocked,
  onToggle,
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
  const isCurrentFixVerified = Boolean(isFixVerified);
  const statusTone = getStatusTone(status);
  const statusText =
    status ??
    (isCircuitLocked
      ? "3D troubleshooting circuit is loaded and locked. Pan, zoom, and rotate while you diagnose the fault."
      : "Fix verified. This troubleshooting circuit is unlocked for full editing.");

  return (
    <div className={`compact-troubleshoot-panel${isOpen ? " open" : ""}`}>
      <div className="compact-troubleshoot-header">
        <div className="compact-troubleshoot-brand" aria-hidden="true">
          <BrandSignature size="xs" decorative />
        </div>
        <button
          type="button"
          className="compact-troubleshoot-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">
            {isCurrentFixVerified ? "Fix Verified" : "Troubleshooting Problem"}
          </span>
        </button>
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

              <div className="troubleshoot-workspace-sync" role="status" aria-live="polite">
                <strong>Synced to 3D workspace</strong>
                <span>
                  {isCircuitLocked
                    ? "This challenge circuit is inspection-only. Use pan, rotate, and zoom until the fix is verified."
                    : "Editing is unlocked. You can now wire, move, and modify this circuit freely."}
                </span>
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
                {isCurrentFixVerified && isCircuitLocked && onUnlockEditing && (
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

