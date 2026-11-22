interface ExplodeControlProps {
  /** 0 = assembled, 1 = every part fully off the board. */
  amount: number;
  onAmountChange: (amount: number) => void;
  disabled?: boolean;
}

/**
 * Circuit explode — the family's dial, slimmed to fit this app's right-edge
 * control column.
 *
 * ThePrints3D keeps its slider permanently on screen at the foot of the right
 * edge. This column has no room for a labelled card, so the slider carries no
 * card at all: a bare vertical rail with the explode mark under it, both taking
 * currentColor from the column like every other glyph on this edge. The thumb's
 * position is the reading — a printed percentage would be text sitting straight
 * on the 3D scene for a number the slider already shows.
 *
 * It stays up. Behind a tap it made a one-gesture view into two, and a dial you
 * have to summon is one you forget is there.
 */
export function ExplodeControl({
  amount,
  onAmountChange,
  disabled,
}: ExplodeControlProps) {
  const percent = Math.round(amount * 100);
  const isExploded = amount > 0;

  return (
    <div
      className={`explode-control${isExploded ? " explode-control--apart" : ""}${
        disabled ? " explode-control--disabled" : ""
      }`}
    >
      <input
        className="explode-slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={amount}
        onChange={(event) => onAmountChange(Number(event.target.value))}
        disabled={disabled}
        aria-label="Explode"
        aria-valuetext={isExploded ? `${percent}% apart` : "Assembled"}
        title="Explode"
      />
      {/* A part lifted off the board, leads stretched down to it, with an up
          arrow: what this dial does. Drawn, so it takes currentColor like the
          rest of the column. The filled state is the apart signal — a change of
          shape, not only of colour. */}
      <span className="explode-mark" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <rect x="6.5" y="8" width="11" height="5" rx="1.2" />
          <path d="M9 13v8M15 13v8" strokeDasharray="1.6 1.9" />
          <path d="M12 6V2M10 4l2-2 2 2" />
        </svg>
      </span>
    </div>
  );
}
