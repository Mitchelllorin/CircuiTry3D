import { useCallback, useEffect, useRef, useState } from "react";
import CIRCUIT_TIPS_FACTS from "../data/circuitTipsFacts";
import { AskAboutTip } from "./AskAboutTip";

const ROTATION_INTERVAL_MS = 45000;
const STARTUP_DELAY_MS = 90000;
const DISMISSED_STORAGE_KEY = "circuitry3d:tips-ticker:dismissed:v1";
const TOUR_DISMISSED_KEY = "circuitry3d:onboarding:tour-dismissed:v1";
const INTERACTIVE_TUTORIAL_PROGRESS_KEY = "circuitry3d:tutorial:basic-circuits:v2";
const INTERACTIVE_TUTORIAL_DONE_STEP_INDEX = 14;

function hasCompletedOnboarding(): boolean {
  try {
    const tourDismissed = window.localStorage.getItem(TOUR_DISMISSED_KEY) === "1";
    const tutorialStepIndex = Number.parseInt(
      window.localStorage.getItem(INTERACTIVE_TUTORIAL_PROGRESS_KEY) ?? "",
      10,
    );
    const tutorialComplete =
      Number.isFinite(tutorialStepIndex) &&
      tutorialStepIndex >= INTERACTIVE_TUTORIAL_DONE_STEP_INDEX;
    return tourDismissed && tutorialComplete;
  } catch {
    return false;
  }
}

function getRandomIndex(length: number, exclude: number): number {
  if (length <= 1) {
    return 0;
  }
  let next = Math.floor(Math.random() * length);
  if (next === exclude) {
    next = (next + 1) % length;
  }
  return next;
}

export function TipsTicker() {
  const [askOpen, setAskOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(() =>
    hasCompletedOnboarding(),
  );

  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [ready, setReady] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * CIRCUIT_TIPS_FACTS.length),
  );
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (onboardingComplete) {
      return;
    }
    const timer = setInterval(() => {
      if (hasCompletedOnboarding()) {
        setOnboardingComplete(true);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [onboardingComplete]);

  // Delay initial appearance so the ticker doesn't pop up the moment the
  // workspace loads, giving users time to orient themselves first.
  useEffect(() => {
    if (dismissed || !onboardingComplete) {
      return;
    }
    const timer = setTimeout(() => setReady(true), STARTUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dismissed, onboardingComplete]);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        getRandomIndex(CIRCUIT_TIPS_FACTS.length, prev),
      );
      setVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    if (dismissed || !ready) {
      return;
    }
    intervalRef.current = setInterval(advance, ROTATION_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dismissed, ready, advance]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    } catch {
      // ignore storage errors
    }
  };

  const handleNext = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    advance();
    if (!dismissed) {
      intervalRef.current = setInterval(advance, ROTATION_INTERVAL_MS);
    }
  };

  if (
    dismissed ||
    !onboardingComplete ||
    !ready ||
    CIRCUIT_TIPS_FACTS.length === 0
  ) {
    return null;
  }

  const entry = CIRCUIT_TIPS_FACTS[currentIndex];

  return (
    <>
      {askOpen && (
        <AskAboutTip entry={entry} onClose={() => setAskOpen(false)} />
      )}
      <div className="tips-ticker" role="status" aria-live="polite" aria-atomic="true">
        <span
          className={`tips-ticker__badge tips-ticker__badge--${entry.kind}`}
          aria-label={entry.kind === "tip" ? "Tip" : entry.kind === "trick" ? "Trick" : "Did you know"}
        >
          {entry.kind === "tip" ? "💡 Tip" : entry.kind === "trick" ? "🔧 Trick" : "⚡ Fact"}
        </span>
        <span className={`tips-ticker__text${visible ? " tips-ticker__text--visible" : ""}`}>
          {entry.text}
        </span>
        <div className="tips-ticker__actions">
          <button
            type="button"
            className="tips-ticker__btn tips-ticker__btn--ask"
            onClick={() => setAskOpen(true)}
            aria-label="Ask about this topic"
            title="Ask me about this"
          >
            💬
          </button>
          <button
            type="button"
            className="tips-ticker__btn"
            onClick={handleNext}
            aria-label="Next tip"
            title="Next tip"
          >
            →
          </button>
          <button
            type="button"
            className="tips-ticker__btn tips-ticker__btn--dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss tips"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}

export default TipsTicker;
