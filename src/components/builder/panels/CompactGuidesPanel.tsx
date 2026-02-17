import { useEffect, useMemo, useState } from "react";
import WordMark from "../../WordMark";
import type { GuideWorkflowId } from "../types";
import "../../../styles/compact-guides.css";

type GuideStep = {
  id: string;
  title: string;
  detail: string;
};

type GuideWorkflowConfig = {
  label: string;
  description: string;
  completionSummary: string;
  workspaceSyncCopy: string;
  steps: GuideStep[];
};

type GuideProgressState = Record<GuideWorkflowId, string[]>;

type CompactGuidesPanelProps = {
  isOpen: boolean;
  activeGuide: GuideWorkflowId;
  onToggle: () => void;
  onSelectGuide: (guide: GuideWorkflowId) => void;
  onLaunchInteractiveTutorial: () => void;
  onOpenPracticeWorksheet: () => void;
  onOpenShortcutsReference: () => void;
  onOpenAboutReference: () => void;
};

const STORAGE_KEY = "circuitry3d.guides.workflow.v1";
const GUIDE_ORDER: GuideWorkflowId[] = ["help", "tutorial", "wire-guide"];

const DEFAULT_PROGRESS: GuideProgressState = {
  help: [],
  tutorial: [],
  "wire-guide": [],
};

const GUIDE_WORKFLOWS: Record<GuideWorkflowId, GuideWorkflowConfig> = {
  help: {
    label: "Help Workflow",
    description:
      "Use this flow when you are getting started in a new workspace and need a clean setup path.",
    completionSummary:
      "You have completed the core help workflow. Use Tutorial next for guided, hands-on practice.",
    workspaceSyncCopy:
      "These steps map directly to the live workspace. Keep this panel open while you build so the guide stays in lock-step.",
    steps: [
      {
        id: "help-open-library",
        title: "Open the Component Library",
        detail:
          "Expand the left Library rail so parts and quick actions stay visible while you build.",
      },
      {
        id: "help-place-source-load",
        title: "Place a source and a load",
        detail:
          "Drop at least one battery and one resistor before wiring to establish a basic circuit path.",
      },
      {
        id: "help-enable-wire",
        title: "Enable Wire Mode",
        detail:
          "Switch into wiring mode, choose a routing style, and connect terminals with clean runs.",
      },
      {
        id: "help-run-sim",
        title: "Run simulation and read W.I.R.E.",
        detail:
          "Use simulation to verify current flow, then check watts, current, resistance, and voltage.",
      },
    ],
  },
  tutorial: {
    label: "Tutorial Workflow",
    description:
      "Follow the guided tutorial sequence to complete a full battery-resistor circuit from scratch.",
    completionSummary:
      "Tutorial workflow complete. Launch the interactive tutorial again anytime to repeat or practice speed.",
    workspaceSyncCopy:
      "This workflow aligns with the interactive tutorial milestones, so progress here mirrors the in-app tutorial cadence.",
    steps: [
      {
        id: "tutorial-start",
        title: "Start Interactive Tutorial",
        detail:
          "Launch the interactive walkthrough to get live highlights and step-by-step validation.",
      },
      {
        id: "tutorial-build-loop",
        title: "Build and close a loop",
        detail:
          "Add the required parts and close the loop so the simulator reports a complete circuit.",
      },
      {
        id: "tutorial-simulate",
        title: "Run simulation checkpoint",
        detail:
          "Run simulation from the tutorial flow to confirm current can travel through the loop.",
      },
      {
        id: "tutorial-junctions",
        title: "Add a junction branch",
        detail:
          "Drop at least one junction on an existing wire and branch a path to practice parallel thinking.",
      },
    ],
  },
  "wire-guide": {
    label: "W.I.R.E. Guide Workflow",
    description:
      "Use this checklist to solve one circuit at a time without guessing: capture known values, pick a formula, solve, then verify.",
    completionSummary:
      "W.I.R.E. guide complete. Open Practice Worksheets and repeat the same solve-check loop on new circuits.",
    workspaceSyncCopy:
      "These steps use the same W.I.R.E. values shown in the Insights bar and worksheet totals row.",
    steps: [
      {
        id: "wire-identify-knowns",
        title: "Capture known values first",
        detail:
          "Write down any known W, I, R, or E values from the circuit before choosing a formula.",
      },
      {
        id: "wire-select-formula",
        title: "Choose one target unknown",
        detail:
          "Pick one unknown to solve and use a formula that matches the values you already know.",
      },
      {
        id: "wire-verify-totals",
        title: "Solve and label units",
        detail:
          "Record the answer with units (W, A, ohm, V) so worksheet rows stay clear and easy to check.",
      },
      {
        id: "wire-open-practice",
        title: "Verify in simulation and worksheet",
        detail:
          "Compare your solved value against live simulator metrics, then update the worksheet totals row.",
      },
    ],
  },
};

function readStoredProgress(): GuideProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROGRESS;
    }
    const parsed = JSON.parse(raw);
    const next: GuideProgressState = { ...DEFAULT_PROGRESS };
    GUIDE_ORDER.forEach((guide) => {
      const candidate = parsed?.[guide];
      if (Array.isArray(candidate)) {
        next[guide] = candidate.filter(
          (value): value is string => typeof value === "string",
        );
      }
    });
    return next;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function CompactGuidesPanel({
  isOpen,
  activeGuide,
  onToggle,
  onSelectGuide,
  onLaunchInteractiveTutorial,
  onOpenPracticeWorksheet,
  onOpenShortcutsReference,
  onOpenAboutReference,
}: CompactGuidesPanelProps) {
  const [progressByGuide, setProgressByGuide] = useState<GuideProgressState>(
    () => readStoredProgress(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressByGuide));
    } catch {
      // ignore storage errors
    }
  }, [progressByGuide]);

  const activeWorkflow = GUIDE_WORKFLOWS[activeGuide];
  const completedStepIds = progressByGuide[activeGuide] ?? [];
  const completedCount = useMemo(
    () =>
      activeWorkflow.steps.filter((step) => completedStepIds.includes(step.id))
        .length,
    [activeWorkflow.steps, completedStepIds],
  );
  const isComplete = completedCount >= activeWorkflow.steps.length;
  const nextStep =
    activeWorkflow.steps.find((step) => !completedStepIds.includes(step.id)) ??
    null;

  const toggleStep = (stepId: string) => {
    setProgressByGuide((previous) => {
      const completed = previous[activeGuide] ?? [];
      const hasStep = completed.includes(stepId);
      const nextCompleted = hasStep
        ? completed.filter((entry) => entry !== stepId)
        : [...completed, stepId];
      return {
        ...previous,
        [activeGuide]: nextCompleted,
      };
    });
  };

  const markNextStepComplete = () => {
    if (!nextStep) {
      return;
    }
    setProgressByGuide((previous) => {
      const completed = previous[activeGuide] ?? [];
      if (completed.includes(nextStep.id)) {
        return previous;
      }
      return {
        ...previous,
        [activeGuide]: [...completed, nextStep.id],
      };
    });
  };

  const resetActiveWorkflow = () => {
    setProgressByGuide((previous) => ({
      ...previous,
      [activeGuide]: [],
    }));
  };

  const openNextWorkflow = () => {
    const currentIndex = GUIDE_ORDER.indexOf(activeGuide);
    const nextGuide =
      GUIDE_ORDER[
        (currentIndex + 1 + GUIDE_ORDER.length) % GUIDE_ORDER.length
      ] ?? GUIDE_ORDER[0];
    onSelectGuide(nextGuide);
  };

  return (
    <div className={`compact-guides-panel${isOpen ? " open" : ""}`}>
      <div className="compact-guides-header">
        <div className="compact-guides-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="compact-guides-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">
            {isComplete ? `${activeWorkflow.label} Complete` : activeWorkflow.label}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="compact-guides-body">
          <div className="guides-toolbar">
            <label className="guides-select">
              Workflow
              <select
                value={activeGuide}
                onChange={(event) =>
                  onSelectGuide(event.target.value as GuideWorkflowId)
                }
              >
                {GUIDE_ORDER.map((guideId) => (
                  <option key={guideId} value={guideId}>
                    {GUIDE_WORKFLOWS[guideId].label}
                  </option>
                ))}
              </select>
            </label>
            <span className="guides-progress">
              Progress:{" "}
              <strong>
                {completedCount}/{activeWorkflow.steps.length}
              </strong>
            </span>
            <span
              className={`guides-state-chip ${isComplete ? "complete" : "active"}`}
            >
              {isComplete ? "Workflow complete" : "Workflow in progress"}
            </span>
          </div>

          <section className="guides-workflow-card">
            <div className="guides-title-row">
              <h3>{activeWorkflow.label}</h3>
              <span className="guides-step-counter">
                {completedCount}/{activeWorkflow.steps.length} steps
              </span>
            </div>
            <p className="guides-description">{activeWorkflow.description}</p>
            <div className="guides-next-step">
              <strong>
                {nextStep ? `Next: ${nextStep.title}` : "All workflow steps complete"}
              </strong>
              <span>
                {nextStep ? nextStep.detail : activeWorkflow.completionSummary}
              </span>
            </div>
            {activeGuide === "wire-guide" && (
              <aside
                className="guides-wire-cheatsheet"
                aria-label="W.I.R.E quick formula picker"
              >
                <strong>Quick formula picker</strong>
                <ul>
                  <li>
                    <span>Need current (I)</span>
                    <code>I = E / R</code>
                  </li>
                  <li>
                    <span>Need resistance (R)</span>
                    <code>R = E / I</code>
                  </li>
                  <li>
                    <span>Need voltage (E)</span>
                    <code>E = I * R</code>
                  </li>
                  <li>
                    <span>Need power (W)</span>
                    <code>W = E * I</code>
                  </li>
                </ul>
              </aside>
            )}
            <ul className="guides-step-list">
              {activeWorkflow.steps.map((step, index) => {
                const checked = completedStepIds.includes(step.id);
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      className={`guides-step-btn${checked ? " complete" : ""}`}
                      onClick={() => toggleStep(step.id)}
                      aria-pressed={checked}
                    >
                      <span className="guides-step-check" aria-hidden="true">
                        {checked ? "✓" : String(index + 1)}
                      </span>
                      <span className="guides-step-copy">
                        <strong>{step.title}</strong>
                        <span>{step.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div
            className={`guides-status ${isComplete ? "guides-status--complete" : "guides-status--active"}`}
          >
            {isComplete
              ? activeWorkflow.completionSummary
              : `Keep working through the ${activeWorkflow.label.toLowerCase()} sequence to stay aligned with the standard app workflow model.`}
          </div>

          <div className="guides-workspace-sync" role="status" aria-live="polite">
            <strong>Synced to 3D workspace</strong>
            <span>{activeWorkflow.workspaceSyncCopy}</span>
          </div>

          <div className="guides-actions">
            <button
              type="button"
              className="guides-action-btn"
              onClick={markNextStepComplete}
              disabled={!nextStep}
              aria-disabled={!nextStep}
            >
              Mark Next Step Complete
            </button>
            <button
              type="button"
              className="guides-action-btn"
              onClick={resetActiveWorkflow}
            >
              Reset Workflow
            </button>
            <button
              type="button"
              className="guides-action-btn"
              onClick={openNextWorkflow}
            >
              Next Workflow
            </button>
            {activeGuide === "tutorial" && (
              <button
                type="button"
                className="guides-action-btn guides-action-btn--primary"
                onClick={onLaunchInteractiveTutorial}
              >
                Launch Interactive Tutorial
              </button>
            )}
            {activeGuide === "wire-guide" && (
              <button
                type="button"
                className="guides-action-btn guides-action-btn--primary"
                onClick={onOpenPracticeWorksheet}
              >
                Open Practice Worksheet
              </button>
            )}
            <button
              type="button"
              className="guides-action-btn"
              onClick={onOpenShortcutsReference}
            >
              Keyboard Shortcuts
            </button>
            <button
              type="button"
              className="guides-action-btn"
              onClick={onOpenAboutReference}
            >
              About CircuiTry3D
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
