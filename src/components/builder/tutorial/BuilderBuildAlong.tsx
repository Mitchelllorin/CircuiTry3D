import { useEffect, useRef, useState } from "react";
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
  onRequestSetLeftMenu: (open: boolean) => void;
};

type Rect = { top: number; left: number; width: number; height: number };

type AnimationType = "tap" | "long-press" | "drag" | "info";

type BuildStep = {
  id: string;
  text: string;
  ctaLabel?: string;
  ctaIcon?: string;
  animationType?: AnimationType;
  // CSS selector for the control this step is about — spotlit (blur everything
  // else) and ringed while the step is active.
  target?: string;
  // Whether this step needs the component library drawer. It is closed for every
  // other step so the workspace — and the long-press editor — stay visible.
  library?: boolean;
  // Auto-advance when the real circuit state satisfies this (omit for read-only
  // / mechanic steps that advance with the Next button).
  isDone?: (circuit: LegacyCircuitState | null, mode: LegacyModeState) => boolean;
  // Offer Next even on an auto-advancing step, so a user who can't work out the
  // gesture is never trapped.
  skippable?: boolean;
};

const countOf = (circuit: LegacyCircuitState | null, type: string) =>
  circuit?.counts?.byType?.[type] ?? 0;

// A part is counted the instant it is picked up as a ghost, so "placed" means
// counted AND no longer held.
const placed = (circuit: LegacyCircuitState | null, type: string) =>
  countOf(circuit, type) > 0 && !circuit?.isPlacing;

// Padding around a spotlit target.
const PAD = 8;

// Stage 1: place every part yourself, learn the mechanics, wire it up, read the
// W.I.R.E. metrics, then meet the junction node. (Practice/worksheet + F.U.S.E.
// are the next stages.)
const BUILD_STEPS: BuildStep[] = [
  {
    id: "intro",
    ctaIcon: "🧭",
    ctaLabel: "Drag to look around",
    animationType: "drag",
    text: "Now build one yourself — I'll guide every step. Drag the canvas any time to look around.",
  },
  {
    id: "controls",
    text: "The controls are easy and intuitive — you probably already know how to use them; they are classic camera controls.",
  },
  {
    id: "battery",
    ctaIcon: "👆",
    ctaLabel: "Tap Battery",
    animationType: "tap",
    text: "Tap Battery once to pick it up — it follows you as a ghost. Tap the grid to drop it. Now it's real.",
    target: '[data-tutorial-id="tutorial-add-battery"]',
    library: true,
    isDone: (c) => placed(c, "battery"),
  },
  {
    id: "edit",
    ctaIcon: "✋",
    ctaLabel: "Long press Battery",
    animationType: "long-press",
    text: "Long-press the battery to open its editor — change its voltage, and more.",
  },
  {
    id: "rotate",
    ctaIcon: "↔",
    ctaLabel: "Drag + long press to rotate",
    animationType: "drag",
    text: "Drag a part to move it. Long-press and rotate to line its two terminals up with your layout.",
  },
  {
    id: "resistor",
    ctaIcon: "👆",
    ctaLabel: "Tap Resistor",
    animationType: "tap",
    text: "Same two taps: pick up a Resistor, then tap the grid. It limits how much current can flow.",
    target: '[data-tutorial-id="tutorial-add-resistor"]',
    library: true,
    isDone: (c) => placed(c, "resistor"),
  },
  {
    id: "lamp",
    ctaIcon: "👆",
    ctaLabel: "Tap Light",
    animationType: "tap",
    text: "Add a Light — it shows the power being used; it glows when current flows.",
    target: '[data-tutorial-id="tutorial-add-lamp"]',
    library: true,
    isDone: (c) => placed(c, "lamp"),
  },
  {
    id: "switch",
    ctaIcon: "👆",
    ctaLabel: "Tap Switch",
    animationType: "tap",
    text: "Add a Switch — it opens and closes the circuit, like a tap on the current.",
    target: '[data-tutorial-id="tutorial-add-switch"]',
    library: true,
    isDone: (c) => placed(c, "switch"),
  },
  {
    id: "wire",
    ctaIcon: "👆",
    ctaLabel: "Tap Wire Tool",
    animationType: "tap",
    text: "Tap the Wire tool, then connect the parts end to end into one complete circuit.",
    target: '[data-tutorial-id="tutorial-enable-wire"]',
    isDone: (c) => Boolean(c?.metrics?.isComplete),
  },
  {
    id: "flow",
    ctaIcon: "✅",
    ctaLabel: "Read W.I.R.E. metrics",
    animationType: "info",
    text: "It's alive — current is flowing. Up top are the W.I.R.E. metrics: Watts, Amps, Ohms, Volts.",
    target: ".ticker-wire-fixed",
  },
  {
    id: "junction-intro",
    ctaIcon: "👆",
    ctaLabel: "Tap Junction",
    animationType: "tap",
    text: "One part left to meet: the Junction ─●─. It's a solder node — the one place three or more wires can meet.",
    target: '[data-component-action="junction"]',
  },
  {
    id: "junction-place",
    ctaIcon: "👆",
    ctaLabel: "Tap Junction, then split a wire",
    animationType: "tap",
    text: "Add a Junction, then tap a wire to split it. Current can now take two paths at once — that's a parallel circuit.",
    target: '[data-component-action="junction"]',
    isDone: (c) => (c?.counts?.junctions ?? 0) > 0,
    skippable: true,
  },
  {
    id: "junction-kcl",
    ctaIcon: "✅",
    ctaLabel: "Understand the split",
    animationType: "info",
    text: "Every amp that flows into a junction flows back out. Nothing is lost there — that's the law that makes parallel circuits solvable.",
  },
  {
    id: "done",
    ctaIcon: "🎉",
    ctaLabel: "Go build freely",
    animationType: "info",
    text: "You built a working circuit. Next we'll cover the W.I.R.E. solving method and F.U.S.E. — but first, go play.",
  },
];

function TapIndicator({ rect }: { rect: Rect }) {
  const centerTop = rect.top + rect.height / 2;
  const centerLeft = rect.left + rect.width / 2;
  return (
    <div className="tutorial-tap-indicator" style={{ top: centerTop, left: centerLeft }} aria-hidden="true">
      <div className="tutorial-tap-ring tutorial-tap-ring--one" />
      <div className="tutorial-tap-ring tutorial-tap-ring--two" />
      <div className="tutorial-tap-ring tutorial-tap-ring--three" />
      <div className="tutorial-tap-dot" />
    </div>
  );
}

function GestureHint({ kind }: { kind: "long-press" | "drag" }) {
  return (
    <div
      className={`tutorial-gesture-hint${kind === "drag" ? " tutorial-drag-hint" : ""}`}
      aria-hidden="true"
    >
      <div className="tutorial-hold-ring tutorial-hold-ring--inner" />
      <div className="tutorial-hold-ring tutorial-hold-ring--outer" />
      <div className="tutorial-gesture-label">{kind === "drag" ? "↔ DRAG + HOLD" : "✋ HOLD"}</div>
    </div>
  );
}

export function BuilderBuildAlong({
  open,
  onClose,
  circuitState,
  modeState,
  onInvokeAction,
  onRequestSetLeftMenu,
}: BuildAlongProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Held in a ref so the drawer effect below can call it without taking it as a
  // dependency: an un-memoized parent callback gives a new reference on every
  // re-render (circuitState updates constantly while you build), which would
  // re-fire any effect that depended on it. That was the "loops back to the
  // start" bug.
  const setLeftMenu = useRef(onRequestSetLeftMenu);
  useEffect(() => {
    setLeftMenu.current = onRequestSetLeftMenu;
  });

  // On open: start at step 0. Depend ONLY on `open` — see the note above.
  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  // The library drawer is open only while a step actually needs it, AND only
  // until a part is picked up. The moment you grab a ghost the drawer gets out
  // of the way — it used to sit over the workspace hiding the very part (and
  // long-press editor) the next step talks about.
  const isPlacing = Boolean(circuitState?.isPlacing);
  useEffect(() => {
    if (!open) {
      return;
    }
    setLeftMenu.current(Boolean(BUILD_STEPS[step]?.library) && !isPlacing);
  }, [open, step, isPlacing]);

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
  const showTapIndicator = current.animationType === "tap" && rect !== null;
  const showLongPressHint = current.animationType === "long-press";
  const showDragHint = current.animationType === "drag";
  // Mechanic/info steps advance via Next; so do auto-steps flagged skippable, so
  // a gesture you can't work out never traps you.
  const canManualAdvance = !current.isDone || Boolean(current.skippable);

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
      {showTapIndicator && rect && <TapIndicator rect={rect} />}
      {showLongPressHint && <GestureHint kind="long-press" />}
      {showDragHint && <GestureHint kind="drag" />}

      <div className="builder-tutorial-card builder-tutorial-card--tour">
        <div className="builder-tutorial-header">
          <span className="builder-tutorial-kicker">Build it with me</span>
          <div className="builder-tutorial-header-buttons">
            <span className="builder-tutorial-kicker-step">
              {Math.min(step + 1, BUILD_STEPS.length)} / {BUILD_STEPS.length}
            </span>
            {/* Dismiss on the card itself — the Skip pill is pinned to the far
                top-right corner, which is easy to miss and awkward to reach. */}
            <button
              type="button"
              className="builder-tutorial-close"
              onClick={onClose}
              aria-label="Close the build-along walkthrough"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="builder-tutorial-body">
          {current.ctaLabel && (
            <div className="builder-tutorial-cta-chip">
              {current.ctaIcon && (
                <span className="builder-tutorial-cta-chip-icon" aria-hidden="true">
                  {current.ctaIcon}
                </span>
              )}
              <span>{current.ctaLabel}</span>
            </div>
          )}
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
