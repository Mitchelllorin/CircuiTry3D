import { useEffect, useRef, useState } from "react";
import type {
  BuilderInvokeAction,
  LegacyCircuitState,
  LegacyModeState,
} from "../types";
import { highlightTerms } from "../../../utils/highlightTerms";
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

type BuildStep = {
  id: string;
  text: string;
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
    id: "welcome",
    text: "I can show you how to build a circuit — it's easy as Pi (3.14 repeating). Ha, math joke! This is your CircuiTry3D workspace. The camera controls are so intuitive you probably already know how to use them, they are classic camera controls.",
  },
  {
    id: "camera",
    // Narrated by CAMERA_BEATS — this text shows before the demo starts.
    text: "Let me show you the camera controls — watch the buttons on the right.",
  },
  {
    id: "tools",
    // Narrated by TOOL_BEATS — the three buttons stacked under Zoom Out.
    text: "Three more tools sit just under Zoom Out — labels, the cinematic camera, and settings. I'll open each one.",
  },
  {
    id: "intro",
    text: "Now build one yourself — I'll guide every step. Drag the canvas any time to look around.",
  },
  {
    id: "battery",
    text: "Tap Battery once to pick it up — it follows you as a ghost. Tap the grid to drop it. Now it's real.",
    target: '[data-tutorial-id="tutorial-add-battery"]',
    library: true,
    isDone: (c) => placed(c, "battery"),
  },
  {
    id: "edit",
    text: "Long-press the battery to open its editor — change its voltage, and more.",
  },
  {
    id: "rotate",
    text: "Drag a part to move it. Long-press and rotate to line its two terminals up with your layout.",
  },
  {
    id: "resistor",
    text: "Same two taps: pick up a Resistor, then tap the grid. It limits how much current can flow.",
    target: '[data-tutorial-id="tutorial-add-resistor"]',
    library: true,
    isDone: (c) => placed(c, "resistor"),
  },
  {
    id: "lamp",
    text: "Add a Light — it shows the power being used; it glows when current flows.",
    library: true,
    isDone: (c) => placed(c, "lamp"),
  },
  {
    id: "switch",
    text: "Add a Switch — it opens and closes the circuit, like a tap on the current.",
    library: true,
    isDone: (c) => placed(c, "switch"),
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
    id: "junction-intro",
    text: "One part left to meet: the Junction ─●─. It's a solder node — the one place three or more wires can meet.",
    target: '[data-component-action="junction"]',
  },
  {
    id: "junction-place",
    text: "Add a Junction, then tap a wire to split it. Current can now take two paths at once — that's a parallel circuit.",
    target: '[data-component-action="junction"]',
    isDone: (c) => (c?.counts?.junctions ?? 0) > 0,
    skippable: true,
  },
  {
    id: "junction-kcl",
    text: "Every amp that flows into a junction flows back out. Nothing is lost there — that's the law that makes parallel circuits solvable.",
  },
  {
    id: "done",
    text: "You built a working circuit. Next we'll cover the W.I.R.E. solving method and F.U.S.E. — but first, go play.",
  },
];

// A demo step plays these beats in order: name a control, pulse its real button,
// and actually USE it so the user sees exactly what it does. The workspace is NOT
// blurred during a demo step (no spotlight target) so the effect is visible.
type DemoBeat = {
  text: string;
  selector: string;
  // EITHER fire a builder action (camera moves), `reps` times…
  action?: BuilderInvokeAction;
  reps?: number;
  // …OR click the real button. `toggle` = it opens a panel, so click it shut again
  // near the end of the beat (and on cleanup) so the demo never leaves it hanging.
  click?: boolean;
  toggle?: boolean;
};

const CAMERA_BEATS: DemoBeat[] = [
  {
    text: "This is Zoom In — tap + (or pinch out) to move closer.",
    selector: '.circuit-zoom-controls button[aria-label="Zoom in"]',
    action: "zoom-in",
    reps: 3,
  },
  {
    text: "This ⊡ centers everything back on screen — your reset view.",
    selector: '.circuit-zoom-controls button[aria-label="Fit circuit to screen"]',
    action: "fit-screen",
    reps: 1,
  },
  {
    text: "And this is Zoom Out — tap − (or pinch in) to pull back.",
    selector: '.circuit-zoom-controls button[aria-label="Zoom out"]',
    action: "zoom-out",
    reps: 3,
  },
];

// The three buttons stacked under Zoom Out — pulsed and explained, NOT pressed.
// We deliberately do NOT open the Cinematic or Settings panels here: flashing a
// whole panel open and shut mid-tour was jarring. Just point and describe; the
// user opens them when they're ready.
const TOOL_BEATS: DemoBeat[] = [
  {
    text: "The tag button toggles your component labels — part names and live W.I.R.E. numbers — on and off. Tap it any time to declutter the view.",
    selector: '.circuit-zoom-controls button[aria-label^="Cycle component label detail"]',
  },
  {
    text: "The film icon is the Cinematic Camera — line up a smooth fly-through of your circuit and record a clip to share.",
    selector: ".circuit-zoom-controls .cinematic-fab",
  },
  {
    text: "The gear opens Settings — grid colour, current-flow style, themes, and every other preference lives in here.",
    selector: '.circuit-zoom-controls button[title="Settings"]',
  },
];

// Which steps are beat-driven demos, and how long each beat holds. Tool beats run
// a touch longer so an opened panel is visible before it closes again.
const STEP_DEMOS: Record<string, { beats: DemoBeat[]; beatMs: number }> = {
  camera: { beats: CAMERA_BEATS, beatMs: 2400 },
  // Tool beats only pulse + explain (no panel opens), so this is pure reading
  // time for the caption — comfortable, not rushed.
  tools: { beats: TOOL_BEATS, beatMs: 3800 },
};

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

  // On the opening "welcome" step, sweep the camera once around the (empty)
  // workspace — the intro shot. Fires on entry only.
  useEffect(() => {
    if (!open) {
      return;
    }
    if (BUILD_STEPS[step]?.id === "welcome") {
      onInvokeAction("tour-focus", { target: "orbit" });
    }
  }, [open, step, onInvokeAction]);

  // Disco grid: on the opening "welcome" step the workspace grid strobes through
  // a rainbow so the empty canvas announces itself. It's the GRID's real hue we
  // cycle (via the same set-grid-style action the settings sliders use), and we
  // snapshot + restore the user's actual grid style when the step ends or the
  // walkthrough closes. Colour is the star; the brightness swing is kept mild and
  // the whole thing is skipped under prefers-reduced-motion — a harsh full-screen
  // luminance strobe is a real photosensitive-seizure risk.
  useEffect(() => {
    if (!open || BUILD_STEPS[step]?.id !== "welcome") {
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const original = {
      brightness: modeState.gridBrightness ?? 100,
      lineWidth: modeState.gridLineWidth ?? 1,
      hue: modeState.gridHue ?? 240,
    };
    let hue = 0;
    let tick = 0;
    const id = window.setInterval(() => {
      hue = (hue + 53) % 360; // hop around the wheel each beat = rainbow disco
      tick += 1;
      onInvokeAction("set-grid-style", {
        brightness: tick % 2 ? 100 : 78, // gentle shimmer, not an on/off strobe
        lineWidth: 2,
        hue,
      });
    }, 180);
    return () => {
      window.clearInterval(id);
      onInvokeAction("set-grid-style", original); // put the real grid back
    };
    // Snapshot original grid style at entry only; onInvokeAction is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, onInvokeAction]);

  // Beat-driven demo steps (camera, tools): for each beat, pulse the real button
  // and actually use it — fire an action, or click the button (closing any opened
  // panel again). -1 = not running (show the step's own text).
  const [beat, setBeat] = useState(-1);
  useEffect(() => {
    const demo = STEP_DEMOS[BUILD_STEPS[step]?.id ?? ""];
    if (!open || !demo) {
      setBeat(-1);
      return;
    }
    const { beats, beatMs } = demo;
    const timers: number[] = [];
    const clearPulse = () =>
      document
        .querySelectorAll(".tutorial-control-pulse")
        .forEach((el) => el.classList.remove("tutorial-control-pulse"));
    // Click any demo-opened panel shut (its toggle button reports aria-expanded).
    const closeOpenPanels = () =>
      beats.forEach((b) => {
        if (!b.toggle) return;
        const el = document.querySelector(b.selector);
        if (el?.getAttribute("aria-expanded") === "true") {
          (el as HTMLElement).click();
        }
      });
    beats.forEach((b, i) => {
      timers.push(
        window.setTimeout(() => {
          setBeat(i);
          clearPulse();
          const el = document.querySelector(b.selector);
          el?.classList.add("tutorial-control-pulse");
          if (b.action) {
            for (let r = 0; r < (b.reps ?? 1); r++) {
              timers.push(window.setTimeout(() => onInvokeAction(b.action!), r * 300));
            }
          } else if (b.click) {
            (el as HTMLElement | null)?.click();
            if (b.toggle) {
              // Reopen-safe: re-query (label may have flipped) and close near the
              // end of this beat so the panel doesn't cover the next one.
              timers.push(
                window.setTimeout(() => {
                  const now = document.querySelector(b.selector);
                  if (now?.getAttribute("aria-expanded") === "true") {
                    (now as HTMLElement).click();
                  }
                }, Math.max(600, beatMs - 900)),
              );
            }
          }
        }, i * beatMs),
      );
    });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      clearPulse();
      closeOpenPanels();
    };
  }, [open, step, onInvokeAction]);

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
          <p className="builder-tutorial-text">
            {/* Same as the guided tour: colour the W.I.R.E. reference words and
                wrap the plain copy so it gets the adaptive blend/shift. Symbols
                OFF — this copy uses the pronoun "I", which symbol-mode would
                wrongly light up as current. */}
            {highlightTerms(
              beat >= 0
                ? (STEP_DEMOS[current.id]?.beats[beat]?.text ?? current.text)
                : current.text,
              { wrapPlain: true },
            )}
          </p>
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
