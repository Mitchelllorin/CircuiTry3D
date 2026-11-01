/**
 * The bench's explode dial, on the right edge.
 *
 * Explode is this family's signature interaction, so the arena has one too —
 * but a bench of parts sitting in parallel has no assembly to take apart. What
 * it does have is a PACKAGE, and the interior behind that package is the thing
 * the failure stories have been about all along: the film wound on the core,
 * the foil in the can, the die under the lens. So the arena's explode opens the
 * selected part onto its own construction, continuously, and leaves it open for
 * as long as you want to look.
 *
 * It lives on the right edge in the same place the siblings keep their explode,
 * for the same reason: it changes the VIEW, not the run, so it does not belong
 * in the console with the things you operate. It only appears when the selected
 * family actually has a modelled interior — a slider that opens nothing is a
 * control that lies about what it does.
 */
export function ArenaExplodeRail({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div className="arena-explode">
      <span className="arena-explode__label">Explode</span>
      <div className="arena-explode__track">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          aria-label="Open the selected part's package"
          aria-valuetext={`${percent}% apart`}
        />
      </div>
      <b className="arena-explode__value">{percent}%</b>
    </div>
  );
}
