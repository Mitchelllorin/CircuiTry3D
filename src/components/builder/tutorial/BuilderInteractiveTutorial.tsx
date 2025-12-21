import { useEffect, useMemo, useRef, useState } from "react";
import type { LegacyCircuitState, LegacyModeState } from "../types";

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

const STORAGE_KEY = "circuitry3d:tutorial:basic-circuits:v1";

function safeParseInt(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function BuilderInteractiveTutorial(props: {
  isOpen: boolean;
  onClose: () => void;
  modeState: LegacyModeState;
  circuitState: LegacyCircuitState | null;
  lastSimulationAt: string | null;
  isLeftMenuOpen: boolean;
  onRequestOpenLeftMenu: () => void;
}) {
  const {
    isOpen,
    onClose,
    modeState,
    circuitState,
    lastSimulationAt,
    isLeftMenuOpen,
    onRequestOpenLeftMenu,
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
          "Turn on Wire Mode so you can connect terminals. You’ll make a loop: battery → resistor → back to battery.",
        targetId: "tutorial-enable-wire",
        isComplete: ({ mode }) => Boolean(mode.isWireMode),
      },
      {
        id: "close-loop",
        title: "Step 4 — Close the loop so current can flow",
        body:
          "Draw wires between the battery terminals and the resistor terminals until the simulator reports a **complete circuit** (current can flow).",
        canSkipRequirement: false,
        isComplete: ({ circuit }) => Boolean(circuit?.metrics.isComplete),
      },
      {
        id: "simulate",
        title: "Step 5 — Run the simulation",
        body:
          "Run a simulation to confirm values and visualize flow. (Tip: if current is 0, you likely have an open loop.)",
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
          "Look at the W.I.R.E. metrics (W, I, R, E). Change the resistor value (long-press the resistor) and watch current and power respond.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
      {
        id: "done",
        title: "Done — next: try an LED + resistor",
        body:
          "You’ve built a working circuit. Next, add an LED in series with a resistor and compare how the W.I.R.E. values change.",
        canSkipRequirement: true,
        isComplete: () => true,
      },
    ],
    [],
  );

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];
  const completion = activeStep.isComplete({
    circuit: circuitState,
    mode: modeState,
    lastSimulationAt,
    tutorialOpenedAt,
  });

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
  const isComplete = Boolean(circuitState?.metrics.isComplete);

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
              Loop: <strong>{isComplete ? "Closed" : "Open"}</strong>
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

