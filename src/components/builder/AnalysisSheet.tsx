import { useEffect } from "react";
import { InsightsFilmReel } from "./InsightsFilmReel";

type WireProfileSummary = {
  gaugeLabel: string;
  resistancePer: string;
  isActive: boolean;
};

interface AnalysisSheetProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: Array<{ id: string; letter: string; label: string; value: string }>;
  wireProfile: WireProfileSummary;
}

/**
 * The circuit's numbers, opened by tapping the W.I.R.E. readout.
 *
 * This was the "Analysis" section of the Insights tab along the bottom edge.
 * The tab showed the same four figures the readout already shows, so it cost a
 * permanent tab across the bottom of the workspace to repeat what was on
 * screen. Now the readout is the control: tap it and the detail opens here.
 *
 * Transient — ✕, Escape or a tap outside — so it is solid, and it shares the
 * .ws-sheet shell with Help.
 */
export function AnalysisSheet({ isOpen, onClose, metrics, wireProfile }: AnalysisSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <div
      className={`ws-sheet analysis-sheet${isOpen ? " ws-sheet--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-sheet-title"
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div className="ws-sheet__card" onClick={(event) => event.stopPropagation()}>
        <header className="ws-sheet__head">
          <h2 className="ws-sheet__title" id="analysis-sheet-title">The numbers</h2>
          <button type="button" className="ws-sheet__close" onClick={onClose} aria-label="Close the numbers">
            ✕
          </button>
        </header>
        <div className="ws-sheet__body">
          <InsightsFilmReel metrics={metrics} wireProfile={wireProfile} />
        </div>
      </div>
    </div>
  );
}
