import { useEffect, useId } from "react";

interface ExplodeControlProps {
  /** 0 = assembled, 1 = every part fully off the board. */
  amount: number;
  onAmountChange: (amount: number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

/**
 * Circuit explode — the family's slider, in this app's right-edge control column.
 *
 * ThePrints3D keeps its slider permanently on screen at the foot of the right
 * edge. This column has no room for that at 360×640: six controls and the right
 * rail's tab already share the edge. So the persistent part is ONE button, and
 * the same vertical slider (0 at the bottom, apart at the top — the way the parts
 * travel) opens beside it on a tap. It is transient: tap the button again, press
 * Escape, or reach for the model and it goes. The explode position does not go
 * with it — it holds until the user takes it back to zero.
 */
export function ExplodeControl({
  amount,
  onAmountChange,
  isOpen,
  onOpenChange,
  disabled,
}: ExplodeControlProps) {
  const sliderId = useId();
  const percent = Math.round(amount * 100);
  const isExploded = amount > 0;

  // The column this lives in comes and goes with overlays; an open slider must
  // not outlive it, or it keeps holding the idle turntable with nothing on screen.
  useEffect(() => () => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onOpenChange]);

  return (
    <div className="explode-control">
      {isOpen && (
        <div className="explode-pop" role="group" aria-label="Explode">
          <label className="explode-pop__label" htmlFor={sliderId}>
            Explode
          </label>
          <output className="explode-pop__value" htmlFor={sliderId}>
            {percent}%
          </output>
          <input
            id={sliderId}
            className="explode-pop__slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={amount}
            onChange={(event) => onAmountChange(Number(event.target.value))}
            aria-valuetext={isExploded ? `${percent}% apart` : "Assembled"}
          />
          {/* Space held even at zero, so the slider never shifts under the thumb
              the moment it leaves the bottom. */}
          <button
            type="button"
            className="explode-pop__reset"
            style={{ visibility: isExploded ? "visible" : "hidden" }}
            onClick={() => onAmountChange(0)}
            aria-hidden={!isExploded}
            tabIndex={isExploded ? 0 : -1}
          >
            Assemble
          </button>
        </div>
      )}
      <button
        type="button"
        className={`circuit-zoom-btn explode-toggle${isExploded ? " explode-toggle--apart" : ""}`}
        onClick={() => onOpenChange(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-label={isExploded ? `Explode, ${percent}% apart` : "Explode"}
        title="Explode"
      >
        {/* Drawn, not an emoji, so it takes currentColor like the rest of the
            column. Same burst-and-bomb glyph as ThePrints3D. */}
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M23 12 18.3 14.6 19.8 19.8 14.6 18.3 12 23 9.4 18.3 4.2 19.8 5.7 14.6 1 12 5.7 9.4 4.2 4.2 9.4 5.7 12 1 14.6 5.7 19.8 4.2 18.3 9.4 Z" />
          <circle cx="11.4" cy="12.6" r="3.1" />
          <path d="M13.6 10.4 15.2 8.8" />
        </svg>
      </button>
    </div>
  );
}
