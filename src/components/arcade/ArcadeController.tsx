export type ArcadeDirection = "up" | "down" | "left" | "right";

type Props = {
  onDirection: (direction: ArcadeDirection) => void;
  /** Start button — center-left of controller body */
  onStart?: () => void;
  /** Select button — center-right of controller body */
  onSelect?: () => void;
  /** Primary action (red, bottom-right of A/B cluster) */
  onA?: () => void;
  /** Secondary action (grey, top-left of A/B cluster) */
  onB?: () => void;
  labelStart?: string;
  labelSelect?: string;
  labelA?: string;
  labelB?: string;
};

export default function ArcadeController({
  onDirection,
  onStart,
  onSelect,
  onA,
  onB,
  labelStart = "Start",
  labelSelect = "Select",
  labelA = "A",
  labelB = "B",
}: Props) {
  return (
    <div className="arcade-controller" role="group" aria-label="Game controller">
      {/* ── Left zone: D-pad cross ── */}
      <div className="arcade-ctrl-left">
        <div className="retro-direction-pad" role="group" aria-label="Direction pad">
          <button
            type="button"
            aria-label="Up"
            className="retro-dpad-up"
            onClick={() => onDirection("up")}
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Left"
            className="retro-dpad-left"
            onClick={() => onDirection("left")}
          >
            ◄
          </button>
          <span className="retro-dpad-center" aria-hidden="true" />
          <button
            type="button"
            aria-label="Right"
            className="retro-dpad-right"
            onClick={() => onDirection("right")}
          >
            ►
          </button>
          <button
            type="button"
            aria-label="Down"
            className="retro-dpad-down"
            onClick={() => onDirection("down")}
          >
            ▼
          </button>
        </div>
      </div>

      {/* ── Center zone: Start + Select ── */}
      <div className="arcade-ctrl-center">
        <button
          type="button"
          className="arcade-btn-start"
          aria-label={labelStart}
          onClick={onStart}
          disabled={!onStart}
        >
          {labelStart}
        </button>
        <button
          type="button"
          className="arcade-btn-select"
          aria-label={labelSelect}
          onClick={onSelect}
          disabled={!onSelect}
        >
          {labelSelect}
        </button>
      </div>

      {/* ── Right zone: A / B action buttons (SNES diagonal) ── */}
      <div className="arcade-ctrl-right">
        <div className="arcade-ab-buttons" role="group" aria-label="Action buttons">
          <button
            type="button"
            className="arcade-btn-b"
            aria-label={labelB}
            onClick={onB}
            disabled={!onB}
          >
            {labelB}
          </button>
          <button
            type="button"
            className="arcade-btn-a"
            aria-label={labelA}
            onClick={onA}
            disabled={!onA}
          >
            {labelA}
          </button>
        </div>
      </div>
    </div>
  );
}
