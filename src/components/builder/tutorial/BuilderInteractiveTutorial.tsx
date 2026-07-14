import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BuilderInvokeAction,
  LegacyCircuitState,
  LegacyModeState,
} from "../types";

type TutorialStep = {
  id: string;
  title: string;
  body: string;
  /** Optional selector target ID to highlight via `[data-tutorial-id="..."]` */
  targetId?: string;
  /** Whether the user is allowed to proceed without meeting the requirement. */
  canSkipRequirement?: boolean;
  isComplete: (state: {
    circuit: LegacyCircuitState | null;
    mode: LegacyModeState;
    lastSimulationAt: string | null;
    tutorialOpenedAt: number;
  }) => boolean;
};

type TutorialProgressState = {
  circuit: LegacyCircuitState | null;
  mode: LegacyModeState;
  lastSimulationAt: string | null;
  tutorialOpenedAt: number;
};

type TutorialObjective = {
  id: string;
  label: string;
  done: boolean;
};

export const INTERACTIVE_TUTORIAL_PROGRESS_STORAGE_KEY =
  "circuitry3d:tutorial:basic-circuits:v2";
export const INTERACTIVE_TUTORIAL_DONE_STEP_INDEX = 14;

function safeParseInt(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSimulationAfterTutorialOpen(
  lastSimulationAt: string | null,
  tutorialOpenedAt: number,
) {
  if (!lastSimulationAt) return false;
  const simulationTimestamp = new Date(lastSimulationAt).getTime();
  return (
    Number.isFinite(simulationTimestamp) && simulationTimestamp >= tutorialOpenedAt
  );
}

export function BuilderInteractiveTutorial(props: {
  isOpen: boolean;
  onClose: () => void;
  modeState: LegacyModeState;
  circuitState: LegacyCircuitState | null;
  lastSimulationAt: string | null;
  isLeftMenuOpen: boolean;
  onRequestOpenLeftMenu: () => void;
  onInvokeAction: (action: BuilderInvokeAction) => void;
}) {
  const {
    isOpen,
    onClose,
    modeState,
    circuitState,
    lastSimulationAt,
    isLeftMenuOpen,
    onRequestOpenLeftMenu,
    onInvokeAction,
  } = props;

  const [stepIndex, setStepIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tutorialOpenedAt, setTutorialOpenedAt] = useState(() => Date.now());
  const highlightedElementRef = useRef<HTMLElement | null>(null);
  // Spotlight: live screen rect of the element the current step points at, so we
  // can dim the whole screen except a cut-out hole around it (coach-mark style).
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const steps: TutorialStep[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Let's build a circuit",
        body:
          "A battery, a resistor, two wires. Tap Next and I'll point at each step on screen.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "parts-tour",
        title: "The parts",
        body:
          "Battery = the push. Resistor = the brake. Wires = the roads. Put them together and that's a circuit.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "battery",
        title: "Add a battery",
        body:
          "Tap Battery in the Library. It's the push that drives the current.",
        targetId: "tutorial-add-battery",
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.byType?.battery ?? 0) > 0),
      },
      {
        id: "resistor",
        title: "Add a resistor",
        body:
          "Now tap Resistor. It limits the current so nothing burns out.",
        targetId: "tutorial-add-resistor",
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.byType?.resistor ?? 0) > 0),
      },
      {
        id: "tune-parts",
        title: "Tune a part",
        body:
          "Turn on Wire Mode so you can connect terminals. You’ll complete a circuit: battery → resistor → back to battery.",
        targetId: "tutorial-enable-wire",
        isComplete: ({ mode }) => Boolean(mode.isWireMode),
      },
      {
        id: "complete-circuit",
        title: "Step 4 — Complete the circuit so current can flow",
        body:
          "Connect battery → resistor → back to the battery. Any gap (an 'open') and nothing flows.",
        canSkipRequirement: false,
        isComplete: ({ circuit }) => Boolean(circuit?.metrics.isComplete),
      },
      {
        id: "simulate",
        title: "Run it",
        body:
          "Run a simulation to confirm values and visualize flow. (Tip: if current is 0, you likely have an open circuit.)",
        targetId: "tutorial-run-simulation",
        isComplete: ({ lastSimulationAt, tutorialOpenedAt }) => {
          if (!lastSimulationAt) return false;
          const when = new Date(lastSimulationAt).getTime();
          return Number.isFinite(when) && when >= tutorialOpenedAt;
        },
      },
      {
        id: "wire-metrics",
        title: "Read W.I.R.E.",
        body:
          "W = power, I = current, R = resistance, E = voltage. Four live numbers — everything the circuit is doing.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "dials",
        title: "Change a value",
        body:
          "Turn the resistor up → current drops. More volts → more current. That's I = V ÷ R.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "junction-intro",
        title: "Add a junction",
        body:
          "Tap a wire to drop a junction (yellow dot) and branch a new wire from it.",
        canSkipRequirement: true,
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.junctions ?? 0) > 0),
      },
      {
        id: "junction-parallel",
        title: "Make a parallel branch",
        body:
          "Wire a second resistor between two junctions. The current splits between the two paths.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "wire-table-method",
        title: "Solve it on paper",
        body:
          "The W.I.R.E. table works any circuit. Open Practice to try one.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "arena-fuse",
        title: "Push parts to failure",
        body:
          "Open the Arena: ramp the current up and watch exactly where a part fails. Real physics, not a guess.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "done",
        title: "You've got it",
        body:
          "Pick parts, wire a circuit, run it, read W.I.R.E. That's the app.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
    ],
    [],
  );

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];
  const progressState: TutorialProgressState = {
    circuit: circuitState,
    mode: modeState,
    lastSimulationAt,
    tutorialOpenedAt,
  };
  const completion = activeStep.isComplete(progressState);

  useEffect(() => {
    if (!isOpen) return;
    setTutorialOpenedAt(Date.now());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Some steps need the Library open so the user can actually see/click the target.
    if (
      activeStep.id === "parts-tour" ||
      activeStep.id === "battery" ||
      activeStep.id === "resistor" ||
      activeStep.id === "wire-mode" ||
      activeStep.id === "simulate"
    ) {
      if (!isLeftMenuOpen) {
        onRequestOpenLeftMenu();
      }
    }
  }, [activeStep.id, isLeftMenuOpen, isOpen, onRequestOpenLeftMenu]);

  useEffect(() => {
    if (!isOpen) {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove("tutorial-highlight");
        highlightedElementRef.current = null;
      }
      return;
    }

    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove("tutorial-highlight");
      highlightedElementRef.current = null;
    }

    if (!activeStep.targetId) return;
    const element = document.querySelector<HTMLElement>(
      `[data-tutorial-id="${activeStep.targetId}"]`,
    );
    if (!element) return;
    element.classList.add("tutorial-highlight");
    highlightedElementRef.current = element;
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeStep.targetId, isOpen]);

  // Track the target's live screen rect every frame so the spotlight hole follows
  // it (the target can move as panels open or the library reel scrolls). Only
  // commits to state when the rect actually changes, to avoid per-frame re-renders.
  useEffect(() => {
    if (!isOpen || !activeStep.targetId) {
      setSpotlightRect(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tutorial-id="${activeStep.targetId}"]`,
      );
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotlightRect((prev) => {
          if (
            prev &&
            Math.abs(prev.top - r.top) < 0.5 &&
            Math.abs(prev.left - r.left) < 0.5 &&
            Math.abs(prev.width - r.width) < 0.5 &&
            Math.abs(prev.height - r.height) < 0.5
          ) {
            return prev;
          }
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        });
      } else {
        setSpotlightRect((prev) => (prev ? null : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeStep.targetId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      window.localStorage.setItem(
        INTERACTIVE_TUTORIAL_PROGRESS_STORAGE_KEY,
        String(stepIndex),
      );
    } catch {
      // ignore
    }
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = safeParseInt(
        window.localStorage.getItem(INTERACTIVE_TUTORIAL_PROGRESS_STORAGE_KEY),
      );
      if (stored != null && stored >= 0 && stored < steps.length) {
        setStepIndex(stored);
      }
    } catch {
      // ignore
    }
    // only run on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const canGoNext =
    completion || Boolean(activeStep.canSkipRequirement) || stepIndex === 0;

  const batteryCount = circuitState?.counts.byType?.battery ?? 0;
  const resistorCount = circuitState?.counts.byType?.resistor ?? 0;
  const wireCount = circuitState?.counts.wires ?? 0;
  const junctionCount = circuitState?.counts.junctions ?? 0;
  const isComplete = Boolean(circuitState?.metrics.isComplete);
  const hasSimulationSinceTutorialOpened = isSimulationAfterTutorialOpen(
    lastSimulationAt,
    tutorialOpenedAt,
  );

  const objectives: TutorialObjective[] = (() => {
    switch (activeStep.id) {
      case "battery":
        return [
          {
            id: "battery-count",
            label: "Place at least 1 Battery",
            done: batteryCount > 0,
          },
        ];
      case "resistor":
        return [
          {
            id: "resistor-count",
            label: "Place at least 1 Resistor",
            done: resistorCount > 0,
          },
        ];
      case "wire-mode":
        return [
          {
            id: "wire-mode-on",
            label: "Turn Wire Mode on",
            done: modeState.isWireMode,
          },
        ];
      case "close-circuit":
        return [
          {
            id: "min-wires",
            label: "Place at least 2 wires",
            done: wireCount >= 2,
          },
          {
            id: "closed-loop",
            label: "Connect components to close the circuit",
            done: isComplete,
          },
        ];
      case "simulate":
        return [
          {
            id: "simulation-run",
            label: "Run simulation after opening this tutorial",
            done: hasSimulationSinceTutorialOpened,
          },
        ];
      case "wire-metrics":
        return [
          {
            id: "live-current",
            label: "Observe current (I) update in W.I.R.E.",
            done:
              circuitState?.metrics.current != null &&
              Number.isFinite(circuitState.metrics.current),
          },
          {
            id: "live-voltage",
            label: "Observe voltage (E) update in W.I.R.E.",
            done:
              circuitState?.metrics.voltage != null &&
              Number.isFinite(circuitState.metrics.voltage),
          },
        ];
      case "junction-intro":
        return [
          {
            id: "one-junction",
            label: "Add at least 1 junction",
            done: junctionCount > 0,
          },
        ];
      case "junction-parallel":
        return [
          {
            id: "two-junctions",
            label: "Add 2+ junctions for branch anchors",
            done: junctionCount >= 2,
          },
          {
            id: "second-resistor",
            label: "Add a second resistor for a parallel branch",
            done: resistorCount >= 2,
          },
        ];
      default:
        return [];
    }
  })();

  const helperAction:
    | { label: string; action: () => void; disabled?: boolean }
    | null = (() => {
    switch (activeStep.id) {
      case "parts-tour":
      case "battery":
      case "resistor":
        return {
          label: "Open Library",
          action: onRequestOpenLeftMenu,
        };
      case "tune-parts":
        return {
          label: modeState.isRotateMode ? "Rotate Mode On" : "Try Rotate Mode",
          disabled: modeState.isRotateMode,
          action: () => {
            if (!modeState.isRotateMode) onInvokeAction("toggle-rotate-mode");
          },
        };
      case "arena-fuse":
        return {
          label: "Open Arena",
          action: () => onInvokeAction("open-arena"),
        };
      case "wire-mode":
      case "close-circuit":
        return {
          label: modeState.isWireMode ? "Wire Mode Enabled" : "Enable Wire Mode",
          disabled: modeState.isWireMode,
          action: () => {
            if (!modeState.isWireMode) onInvokeAction("toggle-wire-mode");
          },
        };
      case "simulate":
        return {
          label: "Run Simulation",
          action: () => onInvokeAction("run-simulation"),
        };
      case "junction-intro":
      case "junction-parallel":
        return {
          label: "Add Junction",
          action: () => onInvokeAction("add-junction"),
        };
      default:
        return null;
    }
  })();

  // Focus frame: blur + dim everything EXCEPT a hole around the targeted element,
  // so the one thing you need to see/tap is the only sharp, bright thing on screen.
  // Built from four rectangles framing the hole (reliable on mobile WebView, where
  // a single clip-path cutout is flaky) plus a glowing ring around the target.
  const FOCUS_PAD = 10;
  const focus =
    spotlightRect && !isCollapsed
      ? {
          top: Math.max(0, spotlightRect.top - FOCUS_PAD),
          left: Math.max(0, spotlightRect.left - FOCUS_PAD),
          width: spotlightRect.width + FOCUS_PAD * 2,
          height: spotlightRect.height + FOCUS_PAD * 2,
        }
      : null;

  return (
    <div className="builder-tutorial-layer" aria-live="polite">
      {focus && (
        <>
          <div
            className="tutorial-blur"
            aria-hidden="true"
            style={{ top: 0, left: 0, right: 0, height: focus.top }}
          />
          <div
            className="tutorial-blur"
            aria-hidden="true"
            style={{ top: focus.top + focus.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="tutorial-blur"
            aria-hidden="true"
            style={{ top: focus.top, left: 0, width: focus.left, height: focus.height }}
          />
          <div
            className="tutorial-blur"
            aria-hidden="true"
            style={{
              top: focus.top,
              left: focus.left + focus.width,
              right: 0,
              height: focus.height,
            }}
          />
          <div
            className="tutorial-focus-ring"
            aria-hidden="true"
            style={{
              top: focus.top,
              left: focus.left,
              width: focus.width,
              height: focus.height,
            }}
          />
        </>
      )}
      <div
        className="builder-tutorial-card"
        role="dialog"
        aria-modal="false"
        data-collapsed={isCollapsed ? "true" : undefined}
      >
        <div className="builder-tutorial-header">
          <div className="builder-tutorial-kicker">
            Interactive Tutorial
            {isCollapsed ? (
              <span className="builder-tutorial-kicker-step">
                {" "}· {stepIndex + 1}/{steps.length}
              </span>
            ) : null}
          </div>
          <div className="builder-tutorial-header-buttons">
            <button
              type="button"
              className="builder-tutorial-close"
              onClick={() => setIsCollapsed((v) => !v)}
              aria-label={isCollapsed ? "Expand tutorial" : "Minimize tutorial"}
              title={isCollapsed ? "Expand" : "Minimize — get it out of the way"}
            >
              {isCollapsed ? "▢" : "—"}
            </button>
            <button
              type="button"
              className="builder-tutorial-close"
              onClick={onClose}
              aria-label="Close tutorial"
              title="Close tutorial"
            >
              ×
            </button>
          </div>
        </div>

        {isCollapsed ? (
          <div className="builder-tutorial-collapsed-row">
            <span className="builder-tutorial-collapsed-title">
              {activeStep.title}
            </span>
            <button
              type="button"
              className="builder-tutorial-btn builder-tutorial-btn--primary"
              onClick={() => setIsCollapsed(false)}
            >
              Show
            </button>
          </div>
        ) : (
        <>
        <div className="builder-tutorial-progress">
          <div className="builder-tutorial-progress-bar">
            <div
              className="builder-tutorial-progress-bar-fill"
              style={{
                width: `${Math.round(((stepIndex + 1) / steps.length) * 100)}%`,
              }}
            />
          </div>
          <div className="builder-tutorial-progress-text">
            Step {stepIndex + 1} / {steps.length}
          </div>
        </div>

        <div className="builder-tutorial-body">
          <h3 className="builder-tutorial-title">{activeStep.title}</h3>
          <p className="builder-tutorial-text">{activeStep.body}</p>

          {objectives.length > 0 && (
            <div className="builder-tutorial-objectives" aria-live="polite">
              {objectives.map((objective) => (
                <div
                  key={objective.id}
                  className="builder-tutorial-objective"
                  data-done={objective.done ? "true" : undefined}
                >
                  <span
                    className="builder-tutorial-objective-icon"
                    aria-hidden="true"
                  >
                    {objective.done ? "✓" : "○"}
                  </span>
                  <span>{objective.label}</span>
                </div>
              ))}
            </div>
          )}

          {helperAction && (
            <button
              type="button"
              className="builder-tutorial-helper-btn"
              onClick={helperAction.action}
              disabled={helperAction.disabled}
            >
              {helperAction.label}
            </button>
          )}

          <div className="builder-tutorial-status">
            <span className="builder-tutorial-status-item">
              Battery: <strong>{batteryCount}</strong>
            </span>
            <span className="builder-tutorial-status-item">
              Resistor: <strong>{resistorCount}</strong>
            </span>
            <span className="builder-tutorial-status-item">
              Wires: <strong>{wireCount}</strong>
            </span>
            <span className="builder-tutorial-status-item">
              Junctions: <strong>{junctionCount}</strong>
            </span>
            <span className="builder-tutorial-status-item">
              Circuit: <strong>{isComplete ? "Complete" : "Open"}</strong>
            </span>
          </div>

          {!completion && !activeStep.canSkipRequirement && (
            <div className="builder-tutorial-blocker" role="status">
              Complete the step to continue.
            </div>
          )}
        </div>

        <div className="builder-tutorial-actions">
          <button
            type="button"
            className="builder-tutorial-btn"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            aria-disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="builder-tutorial-btn builder-tutorial-btn--primary"
            onClick={() =>
              setStepIndex((i) => Math.min(steps.length - 1, i + 1))
            }
            disabled={!canGoNext}
            aria-disabled={!canGoNext}
            title={!canGoNext ? "Finish the step first" : "Next"}
          >
            Next
          </button>
          <button
            type="button"
            className="builder-tutorial-btn builder-tutorial-btn--ghost"
            onClick={() => {
              try {
                window.localStorage.removeItem(
                  INTERACTIVE_TUTORIAL_PROGRESS_STORAGE_KEY,
                );
              } catch {
                // ignore
              }
              setStepIndex(0);
              setTutorialOpenedAt(Date.now());
            }}
            title="Restart tutorial"
          >
            Restart
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
