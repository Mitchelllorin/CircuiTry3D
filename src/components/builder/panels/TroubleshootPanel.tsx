import { useCallback, useMemo } from "react";
import troubleshootingProblems from "../../../data/troubleshootingProblems";
import { TroubleshootDiagram } from "../../troubleshoot/TroubleshootDiagram";
import WordMark from "../../WordMark";
import "../../../styles/troubleshoot-panel.css";

type TroubleshootPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  activeProblemId: string | null;
  onProblemChange: (problemId: string | null) => void;
  solvedIds: string[];
  status: string | null;
  isChecking: boolean;
  onReset: () => void;
  onCheck: () => void;
  onNext: () => void;
  onClose: () => void;
  isFrameReady: boolean;
  isCircuitLocked: boolean;
  onUnlockCircuit: () => void;
};

export function TroubleshootPanel({
  isOpen,
  onToggle,
  activeProblemId,
  onProblemChange,
  solvedIds,
  status,
  isChecking,
  onReset,
  onCheck,
  onNext,
  onClose,
  isFrameReady,
  isCircuitLocked,
  onUnlockCircuit,
}: TroubleshootPanelProps) {
  const activeProblem = useMemo(
    () => troubleshootingProblems.find((p) => p.id === activeProblemId) ?? null,
    [activeProblemId]
  );

  const progressCount = solvedIds.length;
  const totalCount = troubleshootingProblems.length;
  const isSolved = activeProblem ? solvedIds.includes(activeProblem.id) : false;

  const handleProblemSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value || null;
      onProblemChange(nextId);
    },
    [onProblemChange]
  );

  const getStatusClass = useCallback((statusText: string | null): string => {
    if (!statusText) return "";
    if (statusText.toLowerCase().includes("solved")) return "troubleshoot-status--success";
    if (statusText.toLowerCase().includes("not solved")) return "troubleshoot-status--warning";
    if (statusText.toLowerCase().includes("checking")) return "troubleshoot-status--checking";
    return "";
  }, []);

  return (
    <div className={`troubleshoot-panel${isOpen ? " open" : ""}`}>
      <div className="troubleshoot-panel-header">
        <div className="troubleshoot-panel-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="troubleshoot-panel-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse troubleshoot panel" : "Expand troubleshoot panel"}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">
            <span className="toggle-label-icon">🩺</span>
            {isSolved ? "✓ Problem Solved" : "Troubleshoot Mode"}
          </span>
        </button>
        <div className="troubleshoot-panel-progress">
          <span className="progress-badge">
            {progressCount}/{totalCount} solved
          </span>
        </div>
        {isOpen && (
          <button
            type="button"
            className="troubleshoot-panel-close"
            onClick={onClose}
            aria-label="Exit troubleshoot mode"
          >
            Exit
          </button>
        )}
      </div>

      <div className="troubleshoot-panel-body">
        <div className="troubleshoot-panel-content">
          <div className="troubleshoot-problem-selector">
            <label className="troubleshoot-select-label">
              Problem
              <select
                value={activeProblemId ?? ""}
                onChange={handleProblemSelect}
                className="troubleshoot-select"
              >
                {troubleshootingProblems.map((problem) => (
                  <option key={problem.id} value={problem.id}>
                    {problem.title}
                    {solvedIds.includes(problem.id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeProblem && (
            <div className="troubleshoot-overview-row">
              {/* Left column: Problem description */}
              <div className="troubleshoot-description-column">
                <div className="troubleshoot-problem-card">
                  <div className="troubleshoot-problem-header">
                    <h3 className="troubleshoot-problem-title">
                      {activeProblem.title}
                    </h3>
                    {isSolved && (
                      <span className="troubleshoot-solved-badge">Solved</span>
                    )}
                  </div>
                  <p className="troubleshoot-problem-prompt">
                    {activeProblem.prompt}
                  </p>

                  {/* Schematic description */}
                  <p className="troubleshoot-schematic-description">
                    {activeProblem.schematic.description}
                  </p>

                  {activeProblem.hints && activeProblem.hints.length > 0 && (
                    <details className="troubleshoot-hints">
                      <summary className="troubleshoot-hints-toggle">
                        💡 Show hints ({activeProblem.hints.length})
                      </summary>
                      <ul className="troubleshoot-hints-list">
                        {activeProblem.hints.map((hint, index) => (
                          <li key={index} className="troubleshoot-hint-item">
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>

              {/* Right column: 2D Schematic */}
              <div className="troubleshoot-schematic-column">
                <div className="troubleshoot-schematic-card">
                  <div className="troubleshoot-schematic-header">
                    <span className="troubleshoot-schematic-label">Circuit Schematic</span>
                    <span className="troubleshoot-schematic-topology">
                      {activeProblem.schematic.topology} circuit
                    </span>
                  </div>
                  <div className="troubleshoot-schematic-diagram">
                    <TroubleshootDiagram schematic={activeProblem.schematic} />
                  </div>
                  <p className="troubleshoot-schematic-hint">
                    Red elements indicate the fault location
                  </p>
                </div>
              </div>
            </div>
          )}

          {status && (
            <div
              className={`troubleshoot-status ${getStatusClass(status)}`}
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
          )}

          {/* Lock state banner - shows when circuit is locked for analysis */}
          {isCircuitLocked && activeProblem && !isSolved && (
            <div className="troubleshoot-lock-banner">
              <div className="lock-banner-content">
                <span className="lock-icon">🔒</span>
                <div className="lock-text">
                  <strong>Circuit Locked</strong>
                  <span>Study the schematic and hints above, then unlock to start fixing.</span>
                </div>
              </div>
              <button
                type="button"
                className="troubleshoot-action-btn troubleshoot-action-btn--unlock"
                onClick={onUnlockCircuit}
                disabled={!isFrameReady}
              >
                🔓 Start Fixing
              </button>
            </div>
          )}

          <div className="troubleshoot-actions">
            {!isCircuitLocked && (
              <>
                <button
                  type="button"
                  className="troubleshoot-action-btn troubleshoot-action-btn--reset"
                  onClick={onReset}
                  disabled={!activeProblem}
                >
                  Reset Circuit
                </button>
                <button
                  type="button"
                  className="troubleshoot-action-btn troubleshoot-action-btn--check"
                  onClick={onCheck}
                  disabled={!activeProblem || !isFrameReady || isChecking}
                  aria-busy={isChecking}
                >
                  {isChecking ? "Checking…" : "Check Fix"}
                </button>
              </>
            )}
            <button
              type="button"
              className="troubleshoot-action-btn troubleshoot-action-btn--next"
              onClick={onNext}
              disabled={troubleshootingProblems.length === 0}
            >
              Next Problem →
            </button>
          </div>

          <div className="troubleshoot-workspace-tip">
            <span className="tip-icon">👆</span>
            <span className="tip-text">
              {isCircuitLocked
                ? "The 3D circuit is visible in the workspace above. Zoom and pan to inspect it before fixing!"
                : "The 3D circuit is visible in the workspace above. Zoom and pan to inspect the circuit, then fix the fault!"}
            </span>
          </div>

          <div className="troubleshoot-tip">
            <span className="tip-icon">💡</span>
            <span className="tip-text">
              Tap the floating ▶ button to run a simulation anytime.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TroubleshootPanel;
