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

const STORAGE_KEY = "circuitry3d:tutorial:basic-circuits:v1";

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
  const [tutorialOpenedAt, setTutorialOpenedAt] = useState(() => Date.now());
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  const steps: TutorialStep[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome: build your first working circuit",
        body:
          "You’ll build a simple battery + resistor circuit, then use W.I.R.E. (Watts, Current, Resistance, Voltage) to read what’s happening.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "battery",
        title: "Step 1 — Add a Battery (the voltage source)",
        body:
          "Open the Library and click Battery. A circuit needs a source (voltage / EMF) to push charge.",
        targetId: "tutorial-add-battery",
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.byType?.battery ?? 0) > 0),
      },
      {
        id: "resistor",
        title: "Step 2 — Add a Resistor (the load)",
        body:
          "Click Resistor. Resistors limit current and create a voltage drop.",
        targetId: "tutorial-add-resistor",
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.byType?.resistor ?? 0) > 0),
      },
      {
        id: "wire-mode",
        title: "Step 3 — Enable Wire Mode",
        body:
          "Turn on Wire Mode so you can connect terminals. You’ll make a circuit: battery → resistor → back to battery.",
        targetId: "tutorial-enable-wire",
        isComplete: ({ mode }) => Boolean(mode.isWireMode),
      },
      {
        id: "close-circuit",
        title: "Step 4 — Close the circuit so current can flow",
        body:
          "Draw wires between the battery terminals and the resistor terminals until the simulator reports a complete circuit (current can flow).",
        canSkipRequirement: false,
        isComplete: ({ circuit }) => Boolean(circuit?.metrics.isComplete),
      },
      {
        id: "simulate",
        title: "Step 5 — Run the simulation",
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
        title: "Step 6 — Read W.I.R.E. (live circuit metrics)",
        body:
          "The W.I.R.E. panel labels each quantity with a fixed color: W (Watts/Power) = blue, I (Current) = yellow-orange, R (Resistance) = green, E (Voltage) = red. The glowing particles moving along the wires use a separate color system — they show current speed and resistance, not the W, I, R, or E categories. Change the resistor value (long-press the resistor) and watch the metrics respond.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "junction-intro",
        title: "Step 7 — Junctions: branch your circuit",
        body:
          "Junctions (bright yellow dots) are the key to building ANY circuit shape. Hover over a wire to see the pulsing '+' indicator, then click to drop a junction and immediately start a new branch from that point — no matter where on the wire you land. The new wire follows your current wiring mode (free, square, routing, etc.). Press J as a shortcut to add a junction at any time. Junctions are essential for parallel and series-parallel circuits.",
        canSkipRequirement: true,
        isComplete: ({ circuit }) =>
          Boolean((circuit?.counts.junctions ?? 0) > 0),
      },
      {
        id: "junction-parallel",
        title: "Step 8 — Build a parallel path",
        body:
          "Place two junctions on the wire that connects your battery to the resistor — one on each side. Then add a second resistor and wire it between those two junctions to create a parallel branch. Each wiring mode draws a different style of route from a junction: free draws straight lines, square routes at 90°, and routing uses smart pathfinding. Current divides between the branches and total resistance drops below the smallest individual branch.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "wire-table-method",
        title: "Step 9 — Solve with the W.I.R.E. table",
        body:
          "The W.I.R.E. table is the standard worksheet for any circuit. Rows: W (Watts) · I (Current) · R (Resistance) · E (Voltage). Columns: one per real component plus Circuit Totals. For combination circuits, follow this order: First, collapse each parallel group to R_eq in your working space using (R_a × R_b) / (R_a + R_b). R_eq is a working-space value only — it does NOT get its own table column. Second, fill the Totals column: enter R_T (all series resistances added) and E_T, then solve I_T = E_T / R_T. Third, fill component columns: series elements copy I_T into their I cell; parallel-branch elements copy the group voltage (I_T × R_eq) into their E cell and solve I = E / R. Fourth, solve W = E × I for every component and verify that component watts sum to Totals-W. Open Practice Worksheets to try this on a real problem.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "done",
        title: "Done — you're ready for complex circuits",
        body:
          "You've mastered the full approach: place components, close the circuit, read W.I.R.E. metrics, add junctions for parallel paths, collapse parallel groups to R_eq, then fill the W.I.R.E. table from Totals inward. Head to Practice Worksheets to work through series, parallel, and combination problems using this exact method.",
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

    // Some steps need the Library open so the user can actually click the target.
    if (
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

  useEffect(() => {
    if (!isOpen) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(stepIndex));
    } catch {
      // ignore
    }
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = safeParseInt(window.localStorage.getItem(STORAGE_KEY));
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
      case "battery":
      case "resistor":
        return {
          label: "Open Library",
          action: onRequestOpenLeftMenu,
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

  return (
    <div className="builder-tutorial-layer" aria-live="polite">
      <div className="builder-tutorial-card" role="dialog" aria-modal="false">
        <div className="builder-tutorial-header">
          <div className="builder-tutorial-kicker">Interactive Tutorial</div>
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
              Circuit: <strong>{isComplete ? "Closed" : "Open"}</strong>
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
                window.localStorage.removeItem(STORAGE_KEY);
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
      </div>
    </div>
  );
}
