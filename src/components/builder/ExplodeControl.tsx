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
        {/* A part lifted off the board, leads stretched down to it, with an up
            arrow: what this explode does. Drawn, so it takes currentColor like
            the rest of the column. It replaced ThePrints3D's burst glyph, which
            at 18px in this column read as a second Settings gear. */}
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 21h18" />
          <rect x="6.5" y="8" width="11" height="5" rx="1.2" />
          <path d="M9 13v8M15 13v8" strokeDasharray="1.6 1.9" />
          <path d="M12 6V2M10 4l2-2 2 2" />
        </svg>
      </button>
    </div>
  );
}
