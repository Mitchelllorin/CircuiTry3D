/**
 * ══════════════════════════════════════════════════════════════════════════
 *  THE CIRCUIT SWEEP — the one and only walkthrough in this app. LOCKED.
 *  ID: CT3D-TUTORIAL-1 — part 1 of the first-run tutorial. PROTECTED.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Protected by Mitchell's instruction (2026-09-22): the camera narration, the
 * text cards, first-open firing and its showcase lock stay exactly as they are.
 * Part 2 is CT3D-TUTORIAL-2 (BuilderBuildAlong), reached from the last card.
 *
 * A camera-sweep cinematic: the camera flies to each part of the live showcase
 * circuit while a text card explains it, with the W.I.R.E. terms colour-coded.
 * Eight cards, eight camera positions, in step.
 *
 * It is called Circuit Sweep and NOT "tutorial", "guide", "walkthrough" or
 * "onboarding" on purpose. This app repeatedly grew a second thing wearing one
 * of those names — most recently a static wall of text calling itself the
 * Guided Tutorial behind the Help tab — and every round of fixing one broke the
 * other. Those are deleted. This is the survivor and it owns the concept.
 *
 * RULES, do not relax them:
 *   1. Do NOT add another tutorial/walkthrough surface. Extend this one.
 *   2. Do NOT open it before the workspace iframe is ready. Every step past the
 *      first sweeps the camera by postMessage; sent early they are dropped and
 *      the cards play over a dead camera. Builder.tsx decides ELIGIBILITY at
 *      mount and STARTS it on frame-ready. Those are two different things.
 *   3. Do NOT test it by asserting it opened or that cards appeared — that
 *      passes while the camera is dead. Assert the camera MOVED:
 *      tools/probe/drive-95-toursweep.mjs and drive-97-tourcards.mjs.
 *   4. Build-it-with-me (BuilderBuildAlong) is a separate, deliberate thing.
 *      It is not a duplicate of this and must not be merged into it.
 */
import { useEffect, useState } from "react";
import type { BuilderInvokeAction } from "../types";
import { highlightTerms } from "../../../utils/highlightTerms";
import { Logo3D } from "../branding/Logo3D";
import "../../../styles/interactive-tutorial.css";

type CircuitSweepProps = {
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

export function CircuitSweep({
  open,
  onClose,
  onInvokeAction,
  onStartBuildAlong,
}: CircuitSweepProps) {
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
      {/* An always-present way out. The tour is an autoplaying cinematic: each
          step sweeps the camera, shows its card for a few seconds, HIDES it,
          then advances. During those gaps there was no card and therefore no ✕
          — but the tour was still open, which keeps the workspace locked and
          the whole action bar hidden. So the screen looked live and idle while
          nothing responded to a tap, and then a card reappeared out of nowhere.
          This button outlives the cards, so there is never a moment where the
          app is held and cannot be released. */}
      {!showCard && (
        <button
          type="button"
          className="builder-tour-exit"
          onClick={dismiss}
          aria-label="Skip the tour and start building"
        >
          Skip tour
        </button>
      )}
      {showCard && (
        <div className="builder-tutorial-card builder-tutorial-card--tour">
          <div className="builder-tutorial-header">
            <Logo3D className="builder-tutorial-logo" />
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
            <p className="builder-tutorial-text">{highlightTerms(current.text, { symbols: true, wrapPlain: true })}</p>
          </div>
          {/* Three ways out, and "no thanks" has to be one of them.
              The card offered Next and Build it with me, and the only way to
              decline BOTH was the ✕ in the header — a small glyph a thumb has to
              find, sitting where a close button on a panel goes, not where a
              choice goes. Someone who wants neither walkthrough was being asked
              to work out that the tour is a thing you close rather than a
              question you answer.
              So Skip sits in the same row as the offers, because it is one of
              the offers. It is deliberately quiet — plain text, no border, no
              chevron — so it reads as the third option rather than competing
              with the one most people want. */}
          <div className="builder-tour-actions">
            <button type="button" className="builder-tour-skip-link" onClick={dismiss}>
              Skip
            </button>
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
        </div>
      )}
    </div>
  );
}
