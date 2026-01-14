import type { MouseEvent } from "react";
import BrandMark from "../../BrandMark";
import type { TroubleshootingProblem } from "../../../data/troubleshootingProblems";

interface TroubleshootPanelProps {
  isOpen: boolean;
  onClose: () => void;
  problems: TroubleshootingProblem[];
  activeProblemId: string | null;
  onChangeProblemId: (id: string | null) => void;
  solvedIds: string[];
  status: string | null;
  isChecking: boolean;
  isFrameReady: boolean;
  onReset: () => void;
  onCheckFix: () => void;
  onNextProblem: () => void;
}

export function TroubleshootPanel({
  isOpen,
  onClose,
  problems,
  activeProblemId,
  onChangeProblemId,
  solvedIds,
  status,
  isChecking,
  isFrameReady,
  onReset,
  onCheckFix,
  onNextProblem,
}: TroubleshootPanelProps) {
  const activeProblem =
    activeProblemId && problems.length
      ? problems.find((problem) => problem.id === activeProblemId) ?? null
      : null;

  const handleOverlayClick = () => {
    onClose();
  };

  const handleShellClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const progressLabel = `${solvedIds.length}/${problems.length}`;

  return (
    <div
      className={`builder-panel-overlay builder-panel-overlay--troubleshoot${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={handleOverlayClick}
    >
      <div
        className="builder-panel-shell builder-panel-shell--troubleshoot"
        onClick={handleShellClick}
      >
        <div className="builder-panel-brand" aria-hidden="true">
          <BrandMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="builder-panel-close"
          onClick={onClose}
          aria-label="Close troubleshooting mode"
        >
          X
        </button>
        <div className="builder-panel-body builder-panel-body--troubleshoot">
          <div className="troubleshoot-shell">
            <div className="troubleshoot-header">
              <div>
                <h2>Troubleshooting</h2>
                <p>
                  Load a broken circuit, find the fault, then restore current
                  flow.
                </p>
              </div>
              <div className="troubleshoot-meta">
                <label className="troubleshoot-control">
                  <span className="troubleshoot-label">Problem</span>
                  <select
                    className="troubleshoot-select"
                    value={activeProblemId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null;
                      onChangeProblemId(nextId);
                    }}
                  >
                    {problems.map((problem) => (
                      <option key={problem.id} value={problem.id}>
                        {problem.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="troubleshoot-progress" aria-label="Progress">
                  <span>Progress</span>
                  <strong>{progressLabel}</strong>
                </div>
              </div>
            </div>

            {activeProblem ? (
              <div className="troubleshoot-card">
                <div className="troubleshoot-card-title">
                  <h3>{activeProblem.title}</h3>
                  {solvedIds.includes(activeProblem.id) ? (
                    <span className="troubleshoot-badge">Solved</span>
                  ) : null}
                </div>
                <p>{activeProblem.prompt}</p>
                {activeProblem.hints?.length ? (
                  <ul className="troubleshoot-hints">
                    {activeProblem.hints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="troubleshoot-status">
                No troubleshooting problems available.
              </div>
            )}

            {status ? (
              <div className="troubleshoot-status" role="status">
                {status}
              </div>
            ) : null}

            <div className="troubleshoot-actions">
              <button
                type="button"
                className="slider-chip"
                onClick={onReset}
                disabled={!activeProblem}
                aria-disabled={!activeProblem}
              >
                <span className="slider-chip-label">Reset Circuit</span>
              </button>
              <button
                type="button"
                className="slider-chip"
                onClick={onCheckFix}
                disabled={!activeProblem || !isFrameReady}
                aria-disabled={!activeProblem || !isFrameReady}
                title={
                  !isFrameReady
                    ? "Workspace is still loading"
                    : "Run simulation and check if current flows"
                }
              >
                <span className="slider-chip-label">
                  {isChecking ? "Checking…" : "Check Fix"}
                </span>
              </button>
              <button
                type="button"
                className="slider-chip"
                onClick={onNextProblem}
                disabled={!problems.length}
                aria-disabled={!problems.length}
              >
                <span className="slider-chip-label">Next Problem</span>
              </button>
            </div>

            <div className="troubleshoot-tip">
              Tip: You can also tap the floating ▶ button to run a simulation
              anytime.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

