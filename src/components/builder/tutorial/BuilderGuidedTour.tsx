import { useEffect, useState } from "react";
import type { BuilderInvokeAction } from "../types";
import "../../../styles/interactive-tutorial.css";

type BuilderGuidedTourProps = {
  open: boolean;
  onClose: () => void;
  onInvokeAction: (action: BuilderInvokeAction, data?: Record<string, unknown>) => void;
  onStartBuildAlong: () => void;
};

type TourStep = {
  id: string;
  text: string;
  // Component the camera focuses on for this step ("overview" = whole circuit).
  focus: "overview" | "flow" | "battery" | "resistor" | "switch" | "lamp" | "switch-light";
  // Sweep the camera when this step begins (the first step is already framed).
  sweepOnEnter: boolean;
  // First sweep UP to the whole-circuit view, then DOWN onto the part.
  viaOverview: boolean;
  // Delay before the text appears, measured from the step's start. Use ~0 to show
  // the text as the sweep begins; use the sweep length to show it once the camera
  // has arrived (so the part is in view first).
  textDelayMs: number;
  // How long the text stays after it appears. null = stay (final step / awaiting copy).
  readMs: number | null;
};

// An empty beat after a step's text vanishes, before the next sweep — so the old
// text is gone BEFORE the camera moves and the next text appears.
const GAP_MS = 1000;
// Sweep durations must match tourFocusCamera in legacy.html (1300 direct,
// 1100 + 1300 via overview).
const DIRECT_SWEEP_MS = 1400;
const VIA_OVERVIEW_SWEEP_MS = 2500;
// Sweep back up to the full circuit (overviewKf duration in tourFocusCamera).
const OVERVIEW_SWEEP_MS = 1200;

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    text:
      "Welcome to CircuiTry3D — the first, only and best 3D interactive electric " +
      "circuit simulator. What you are looking at is a simple series circuit with " +
      "the electrical current flowing.",
    focus: "overview",
    sweepOnEnter: false,
    viaOverview: false,
    textDelayMs: 0,
    readMs: 19000,
  },
  {
    id: "flow",
    text:
      "This is the electrical current flow — measured in Amps, represented by I " +
      "(intensity). Current flows in one direction, from negative to positive, and " +
      "only flows in a complete circuit; if one component fails or is removed, no " +
      "flow. Current is invisible to the naked eye, so we've represented it " +
      "visually here so its behaviour can be understood. The colour of the flow " +
      "reflects its intensity/speed — red (slow) to white (fast). Current, in our " +
      "water analogy, is the water.",
    focus: "flow",
    sweepOnEnter: true,
    viaOverview: false,
    // Appears once the camera has swept down onto the flowing current.
    textDelayMs: DIRECT_SWEEP_MS,
    readMs: 25000,
  },
  {
    id: "battery",
    text:
      "This is a Battery — Source Voltage. Voltage is defined as the potential " +
      "difference between two points. If you think of electricity like a water " +
      "system, Voltage (E — Volts) is the pump driving the pressure through the pipes.",
    focus: "battery",
    sweepOnEnter: true,
    viaOverview: true,
    // Show the text only once the camera has arrived on the battery.
    textDelayMs: VIA_OVERVIEW_SWEEP_MS,
    readMs: 22000,
  },
  {
    id: "resistor",
    text:
      "This is a Resistor — measured in Ohms (Ω). Resistance is the property that " +
      "limits how much current can flow; the bands of colour reflect how much it " +
      "limits (resists) current flow. In our water analogy, Resistance (R — Ohms) " +
      "would be a kink in the hose, or a skinny pipe that the water (current) is " +
      "forced through by the Voltage.",
    focus: "resistor",
    sweepOnEnter: true,
    viaOverview: true,
    // Appears the moment the camera arrives back down on the resistor.
    textDelayMs: VIA_OVERVIEW_SWEEP_MS,
    readMs: 23000,
  },
  {
    id: "lamp",
    text:
      "This is the Light — where the energy goes to work. Current forced through it " +
      "makes it glow. The rate of that work is Power, measured in Watts (W): " +
      "W = Voltage × Current (E × I). In the water analogy, Power is the work the " +
      "water actually does — the wheel it turns, the light it lights.",
    focus: "lamp",
    sweepOnEnter: true,
    viaOverview: true,
    textDelayMs: VIA_OVERVIEW_SWEEP_MS,
    readMs: 20000,
  },
  {
    id: "switch",
    text:
      "This is the Switch — the control. Like a tap, it lets the current flow or " +
      "shuts it off completely. Open the switch and the circuit breaks: no complete " +
      "path, no current, and the light goes out.",
    focus: "switch",
    sweepOnEnter: true,
    viaOverview: true,
    textDelayMs: VIA_OVERVIEW_SWEEP_MS,
    readMs: 18000,
  },
  {
    id: "wire",
    text:
      "That's the whole circuit — W.I.R.E., the four properties (variables) of " +
      "electricity: Voltage (E) is the push, Current (I) is the flow, Resistance " +
      "(R) holds it back, and Power (W) is the work done. They're tied by Ohm's " +
      "Law: current rises with Voltage and falls with Resistance — I = E ÷ R. " +
      "Master these four and you can read any circuit.",
    focus: "overview",
    sweepOnEnter: true,
    viaOverview: false,
    // Camera sweeps back up to the full circuit for the closing card.
    textDelayMs: OVERVIEW_SWEEP_MS,
    readMs: 22000,
  },
  {
    // Closing "go build" card — highlights the Circuit AI button.
    id: "build",
    text:
      "That's the basics — now go to town and build away. And whenever you need a " +
      "hand, your Circuit AI is always right here.",
    focus: "overview",
    sweepOnEnter: false,
    viaOverview: false,
    textDelayMs: 0,
    readMs: null,
  },
];

export function BuilderGuidedTour({
  open,
  onClose,
  onInvokeAction,
  onStartBuildAlong,
}: BuilderGuidedTourProps) {
  const [step, setStep] = useState(0);
  const [textVisible, setTextVisible] = useState(false);

  // Reset to the first step whenever the tour (re)opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setTextVisible(false);
    }
  }, [open]);

  // Drive the current step: sweep the camera (if any), show the text after its
  // delay, hide it after the read time, then advance to the next step.
  useEffect(() => {
    if (!open) {
      return;
    }
    const s = TOUR_STEPS[step];
    if (!s) {
      return;
    }
    const timers: number[] = [];

    if (s.sweepOnEnter) {
      onInvokeAction("tour-focus", { target: s.focus, viaOverview: s.viaOverview });
    }

    timers.push(window.setTimeout(() => setTextVisible(true), s.textDelayMs));

    if (s.readMs != null) {
      timers.push(window.setTimeout(() => setTextVisible(false), s.textDelayMs + s.readMs));
      if (step < TOUR_STEPS.length - 1) {
        timers.push(
          window.setTimeout(() => setStep((x) => x + 1), s.textDelayMs + s.readMs + GAP_MS),
        );
      }
    }

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [open, step, onInvokeAction]);

  // On the closing "go build" card, reveal the action bar (the tour hides it for a
  // clean stage) and pulse-highlight the Circuit AI button so the user actually
  // sees where help lives — the copy says "right here", so it has to be visible.
  useEffect(() => {
    if (!open || TOUR_STEPS[step]?.id !== "build") {
      return;
    }
    const shell = document.querySelector(".builder-shell");
    shell?.setAttribute("data-tour-reveal-ai", "true");
    const el = document.querySelector(".edge-action-btn--ai");
    el?.classList.add("tour-ai-highlight");
    return () => {
      shell?.removeAttribute("data-tour-reveal-ai");
      el?.classList.remove("tour-ai-highlight");
    };
  }, [open, step]);

  if (!open) {
    return null;
  }

  const current = TOUR_STEPS[step];
  const showCard = textVisible && !!current?.text;

  // Dismiss the whole tour at any point (even mid-sweep) and return the camera to
  // the full-circuit view.
  const dismiss = () => {
    onInvokeAction("tour-focus", { target: "overview" });
    onClose();
  };

  // Advance to the next card early (hides the current text immediately; the next
  // step's effect drives its sweep + text).
  const goNext = () => {
    setTextVisible(false);
    setStep((x) => Math.min(x + 1, TOUR_STEPS.length - 1));
  };

  const isLast = step >= TOUR_STEPS.length - 1;

  return (
    <div className="builder-tutorial-layer">
      <button type="button" className="builder-tour-skip" onClick={dismiss}>
        Skip tour ✕
      </button>
      {showCard && (
        <div className="builder-tutorial-card builder-tutorial-card--tour">
          <div className="builder-tutorial-header">
            <span className="builder-tutorial-kicker">CircuiTry3D</span>
            <button
              type="button"
              className="builder-tutorial-close"
              onClick={dismiss}
              aria-label="Close tour"
            >
              ×
            </button>
          </div>
          <div className="builder-tutorial-body">
            <p className="builder-tutorial-text">{current.text}</p>
          </div>
          {!isLast && (
            <button type="button" className="builder-tour-next" onClick={goNext}>
              Next ›
            </button>
          )}
          {current?.id === "build" && (
            <button type="button" className="builder-tour-next" onClick={onStartBuildAlong}>
              Build it with me ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
