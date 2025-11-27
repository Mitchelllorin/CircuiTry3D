import type { LegacyModeState, PanelAction, HelpModalView, PracticeWorksheetStatus } from "../types";
import {
  WIRE_METRICS,
  PRACTICE_ACTIONS,
  PRACTICE_SCENARIOS,
  SETTINGS_ITEMS,
  HELP_ENTRIES,
} from "../constants";
import { findPracticeProblemById, findPracticeProblemByPreset } from "../../../data/practiceProblems";

interface BottomToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onBuilderAction: (action: string, data?: unknown) => void;
  onPracticeAction: (action: PanelAction) => void;
  onOpenHelpCenter: (view: HelpModalView) => void;
  onPracticePanelOpen: () => void;
  onOpenLastArenaSession: () => void;
  modeState: LegacyModeState;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
  currentFlowLabel: string;
  practiceWorksheetMessage: string;
  practiceWorksheetState: PracticeWorksheetStatus | null;
  activePracticeProblemId: string | null;
  isArenaSyncing: boolean;
  canOpenLastArena: boolean;
  practiceProblemRef: React.MutableRefObject<string | null>;
  setActivePracticeProblemId: (id: string) => void;
  setPracticeWorksheetState: React.Dispatch<React.SetStateAction<PracticeWorksheetStatus | null>>;
}

export function BottomToolbar({
  isOpen,
  onToggle,
  onBuilderAction,
  onPracticeAction,
  onOpenHelpCenter,
  onPracticePanelOpen,
  onOpenLastArenaSession,
  modeState,
  controlsDisabled,
  controlDisabledTitle,
  currentFlowLabel,
  practiceWorksheetMessage,
  practiceWorksheetState,
  activePracticeProblemId,
  isArenaSyncing,
  canOpenLastArena,
  practiceProblemRef,
  setActivePracticeProblemId,
  setPracticeWorksheetState,
}: BottomToolbarProps) {
  return (
    <div
      className={`builder-menu-stage builder-menu-stage-bottom${isOpen ? " open" : ""}`}
    >
      <button
        type="button"
        className="builder-menu-toggle builder-menu-toggle-bottom"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? "Collapse analysis and guidance"
            : "Expand analysis and guidance"
        }
        title={
          isOpen
            ? "Collapse analysis and guidance"
            : "Expand analysis and guidance"
        }
      >
        <span className="toggle-icon">{isOpen ? "v" : "^"}</span>
        <span className="toggle-text">Insights</span>
      </button>
      <nav
        className="builder-menu builder-menu-bottom"
        role="navigation"
        aria-label="Analysis, practice, and guides"
      >
        <div className="builder-menu-scroll builder-menu-scroll-bottom">
          <div className="slider-section">
            <span className="slider-heading">Analysis</span>
            <div className="menu-track menu-track-metrics">
              {WIRE_METRICS.map((metric) => (
                <div
                  key={metric.id}
                  className="slider-metric"
                  title={`${metric.label}: ${metric.value} - Click to view calculation details`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenHelpCenter("wire-guide")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenHelpCenter("wire-guide");
                    }
                  }}
                >
                  <span className="metric-letter">{metric.letter}</span>
                  <span className="metric-value">{metric.value}</span>
                  <span className="metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Practice</span>
            <div className="menu-track menu-track-chips">
              <div
                role="status"
                style={{
                  fontSize: "11px",
                  color: "rgba(136, 204, 255, 0.78)",
                  textAlign: "center",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(136, 204, 255, 0.22)",
                  background: "rgba(14, 30, 58, 0.48)",
                }}
              >
                {practiceWorksheetMessage}
              </div>
              {PRACTICE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="slider-chip"
                  onClick={() => onPracticeAction(action)}
                  disabled={
                    controlsDisabled ||
                    (action.action === "open-arena" && isArenaSyncing)
                  }
                  aria-disabled={
                    controlsDisabled ||
                    (action.action === "open-arena" && isArenaSyncing)
                  }
                  title={
                    controlsDisabled
                      ? controlDisabledTitle
                      : action.action === "open-arena" && isArenaSyncing
                        ? "Preparing Component Arena export?"
                        : action.description
                  }
                >
                  <span className="slider-chip-label">{action.label}</span>
                </button>
              ))}
              <button
                type="button"
                className="slider-chip"
                onClick={onPracticePanelOpen}
                title={practiceWorksheetMessage}
                data-complete={
                  practiceWorksheetState &&
                  activePracticeProblemId &&
                  practiceWorksheetState.problemId === activePracticeProblemId &&
                  practiceWorksheetState.complete
                    ? "true"
                    : undefined
                }
              >
                <span className="slider-chip-label">Practice Worksheets</span>
              </button>
              {PRACTICE_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className="slider-chip"
                  onClick={() => {
                    onBuilderAction("load-preset", {
                      preset: scenario.preset,
                    });
                    const problem = scenario.problemId
                      ? findPracticeProblemById(scenario.problemId)
                      : findPracticeProblemByPreset(scenario.preset);
                    if (problem) {
                      practiceProblemRef.current = problem.id;
                      setActivePracticeProblemId(problem.id);
                      setPracticeWorksheetState({
                        problemId: problem.id,
                        complete: false,
                      });
                    }
                    onPracticePanelOpen();
                  }}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : scenario.question}
                >
                  <span className="slider-chip-label">{scenario.label}</span>
                </button>
              ))}
              <button
                type="button"
                className="slider-chip"
                onClick={onOpenLastArenaSession}
                disabled={!canOpenLastArena}
                aria-disabled={!canOpenLastArena}
                title={
                  canOpenLastArena
                    ? "Open the most recent Component Arena export"
                    : "Run a Component Arena export first"
                }
              >
                <span className="slider-chip-label">Open Last Arena Run</span>
              </button>
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Settings</span>
            <div className="slider-stack">
              {SETTINGS_ITEMS.map((setting) => {
                const description = setting.getDescription(modeState, {
                  currentFlowLabel,
                });
                const isActive = setting.isActive?.(modeState) ?? false;
                return (
                  <button
                    key={setting.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => onBuilderAction(setting.action, setting.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    aria-pressed={setting.isActive ? isActive : undefined}
                    data-active={
                      setting.isActive && isActive ? "true" : undefined
                    }
                    title={controlsDisabled ? controlDisabledTitle : description}
                    data-intent="settings"
                  >
                    <span className="slider-label">{setting.label}</span>
                    <span className="slider-description">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Guides</span>
            <div className="menu-track menu-track-chips">
              {HELP_ENTRIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="slider-chip"
                  onClick={() => onOpenHelpCenter(entry.view)}
                  title={entry.description}
                >
                  <span className="slider-chip-label">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
