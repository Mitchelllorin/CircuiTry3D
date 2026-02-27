export type ArcadeDirection = "up" | "down" | "left" | "right";

type Props = {
  onDirection: (direction: ArcadeDirection) => void;
  onA?: () => void;
  onB?: () => void;
  labelA?: string;
  labelB?: string;
};

export default function ArcadeController({
  onDirection,
  onA,
  onB,
  labelA = "A",
  labelB = "B",
}: Props) {
  return (
    <div className="arcade-controller">
      {/* D-pad cross */}
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

      {/* A / B action buttons — Gameboy diagonal arrangement */}
      <div className="arcade-ab-buttons" role="group" aria-label="Action buttons">
        <button
          type="button"
          className="arcade-btn-a"
          aria-label={labelA}
          onClick={onA}
          disabled={!onA}
        >
          {labelA}
        </button>
        <button
          type="button"
          className="arcade-btn-b"
          aria-label={labelB}
          onClick={onB}
          disabled={!onB}
        >
          {labelB}
        </button>
      </div>
    </div>
  );
}
