import { useCallback, useEffect, useRef, useState } from "react";
import CIRCUIT_TIPS_FACTS from "../data/circuitTipsFacts";

const ROTATION_INTERVAL_MS = 12000;
const DISMISSED_STORAGE_KEY = "circuitry3d:tips-ticker:dismissed:v1";

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
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * CIRCUIT_TIPS_FACTS.length),
  );
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (dismissed) {
      return;
    }
    intervalRef.current = setInterval(advance, ROTATION_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dismissed, advance]);

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

  if (dismissed || CIRCUIT_TIPS_FACTS.length === 0) {
    return null;
  }

  const entry = CIRCUIT_TIPS_FACTS[currentIndex];

  return (
    <div className="tips-ticker" role="status" aria-live="polite" aria-atomic="true">
      <span
        className={`tips-ticker__badge tips-ticker__badge--${entry.kind}`}
        aria-label={entry.kind === "tip" ? "Tip" : "Did you know"}
      >
        {entry.kind === "tip" ? "💡 Tip" : "⚡ Fact"}
      </span>
      <span className={`tips-ticker__text${visible ? " tips-ticker__text--visible" : ""}`}>
        {entry.text}
      </span>
      <div className="tips-ticker__actions">
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
  );
}

export default TipsTicker;
