import { useEffect, useState } from "react";
import type {
  BuilderInvokeAction,
  LegacyCircuitState,
  LegacyModeState,
} from "../types";
import "../../../styles/interactive-tutorial.css";

type BuildAlongProps = {
  open: boolean;
  onClose: () => void;
  circuitState: LegacyCircuitState | null;
  modeState: LegacyModeState;
  onInvokeAction: (action: BuilderInvokeAction, data?: Record<string, unknown>) => void;
  onRequestOpenLeftMenu: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

type BuildStep = {
  id: string;
  text: string;
  // CSS selector for the control this step is about — spotlit (blur everything
  // else) and ringed while the step is active.
  target?: string;
  // Auto-advance when the real circuit state satisfies this (omit for read-only
  // / mechanic steps that advance with the Next button).
  isDone?: (circuit: LegacyCircuitState | null, mode: LegacyModeState) => boolean;
};

const countOf = (circuit: LegacyCircuitState | null, type: string) =>
  circuit?.counts?.byType?.[type] ?? 0;

// Padding around a spotlit target.
const PAD = 8;

// Stage 1: place every part yourself, learn the mechanics, wire it up, read the
// W.I.R.E. metrics. (Practice/worksheet + F.U.S.E. are the next stages.)
const BUILD_STEPS: BuildStep[] = [
  {
    id: "intro",
    text: "Now build one yourself — I'll guide every step. Drag the canvas any time to look around.",
  },
  {
    id: "battery",
    text: "Open the parts library and tap a Battery to drop it onto the workspace — your power source.",
    isDone: (c) => countOf(c, "battery") > 0,
  },
  {
    id: "edit",
    text: "Tap a part to select it. Long-press it to open its editor — change voltage, resistance and more.",
  },
  {
    id: "rotate",
    text: "Drag a part to move it, and use rotate to spin it so its two terminals line up with your layout.",
  },
  {
    id: "resistor",
    text: "Add a Resistor — it limits how much current can flow.",
    isDone: (c) => countOf(c, "resistor") > 0,
  },
  {
    id: "lamp",
    text: "Add a Light — it shows the power being used; it glows when current flows.",
    isDone: (c) => countOf(c, "lamp") > 0,
  },
  {
    id: "switch",
    text: "Add a Switch — it opens and closes the circuit, like a tap on the current.",
    isDone: (c) => countOf(c, "switch") > 0,
  },
  {
    id: "wire",
    text: "Tap the Wire tool, then connect the parts end to end into one complete circuit.",
    target: '[data-tutorial-id="tutorial-enable-wire"]',
    isDone: (c) => Boolean(c?.metrics?.isComplete),
  },
  {
    id: "flow",
    text: "It's alive — current is flowing. Up top are the W.I.R.E. metrics: Watts, Amps, Ohms, Volts.",
    target: ".ticker-wire-fixed",
  },
  {
    id: "done",
    text: "You built a working circuit. Next we'll cover the W.I.R.E. solving method and F.U.S.E. — but first, go play.",
  },
];

export function BuilderBuildAlong({
  open,
  onClose,
  circuitState,
  modeState,
  onInvokeAction,
  onRequestOpenLeftMenu,
}: BuildAlongProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // On open: start at step 0 and pop the parts library so parts are reachable.
  // Depend ONLY on `open` — if we also depended on onRequestOpenLeftMenu, an
  // un-memoized parent callback would give a new reference on every re-render
  // (e.g. as circuitState updates while you build), re-firing this effect and
  // snapping you back to step 0 mid-build. That was the "loops back to the
  // start" bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      setStep(0);
      onRequestOpenLeftMenu();
    }
  }, [open]);

  // Auto-advance the instant the real circuit state satisfies the current step.
  useEffect(() => {
    if (!open) {
      return;
    }
    const current = BUILD_STEPS[step];
    if (
      current?.isDone &&
      step < BUILD_STEPS.length - 1 &&
      current.isDone(circuitState, modeState)
    ) {
      setStep((x) => x + 1);
    }
  }, [open, step, circuitState, modeState]);

  // Track this step's spotlight target rect (poll — the targets are static DOM
  // but layout can shift; polling avoids a heavy per-frame rAF over the canvas).
  useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const selector = BUILD_STEPS[step]?.target;
    if (!selector) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const id = window.setInterval(measure, 300);
    return () => window.clearInterval(id);
  }, [open, step]);

  if (!open) {
    return null;
  }

  const current = BUILD_STEPS[step];
  const isLast = step >= BUILD_STEPS.length - 1;
  const canManualAdvance = !current.isDone; // mechanic/info steps advance via Next

  const advance = () => setStep((x) => Math.min(x + 1, BUILD_STEPS.length - 1));

  return (
    <div className="builder-tutorial-layer">
      <button type="button" className="builder-tour-skip" onClick={onClose}>
        {isLast ? "Done ✕" : "Skip ✕"}
      </button>

      {/* Spotlight: blur everything except the target, with a focus ring. */}
      {rect && (
        <>
          <div
            className="tutorial-blur"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) }}
          />
          <div
            className="tutorial-blur"
            style={{ top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="tutorial-blur"
            style={{
              top: rect.top - PAD,
              left: 0,
              width: Math.max(0, rect.left - PAD),
              height: rect.height + 2 * PAD,
            }}
          />
          <div
            className="tutorial-blur"
            style={{
              top: rect.top - PAD,
              left: rect.left + rect.width + PAD,
              right: 0,
              height: rect.height + 2 * PAD,
            }}
          />
          <div
            className="tutorial-focus-ring"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + 2 * PAD,
              height: rect.height + 2 * PAD,
            }}
          />
        </>
      )}

      <div className="builder-tutorial-card builder-tutorial-card--tour">
        <div className="builder-tutorial-header">
          <span className="builder-tutorial-kicker">Build it with me</span>
          <span className="builder-tutorial-kicker-step">
            {Math.min(step + 1, BUILD_STEPS.length)} / {BUILD_STEPS.length}
          </span>
        </div>
        <div className="builder-tutorial-body">
          <p className="builder-tutorial-text">{current.text}</p>
        </div>
        {isLast ? (
          <button type="button" className="builder-tour-next" onClick={onClose}>
            Done
          </button>
        ) : canManualAdvance ? (
          <button type="button" className="builder-tour-next" onClick={advance}>
            Next ›
          </button>
        ) : null}
      </div>
    </div>
  );
}
