import { useEffect, useRef, useState } from "react";
import { SERIES_OHMS_MAX, seriesOhmsFor, seriesTFor } from "./supplyLoad";
import { ArenaThermalSheet } from "./ArenaThermalSheet";
import type { ThermalReport } from "./thermalModel";
import type { ArenaBattleStatus } from "./types";

type ArenaDashboardProps = {
  status: ArenaBattleStatus;
  /** Supply voltage as a multiple of nominal — the load the ramp drives. */
  voltsMultiple: number;
  /** Top of the volts fader for the active scenario. */
  voltsMax: number;
  onVoltsChange: (multiple: number) => void;
  seriesOhms: number;
  onSeriesOhmsChange: (ohms: number) => void;
  /** Throwing the switch runs the bench. */
  onThrowSwitch: () => void;
  /** Which bench you are standing at — one part to failure, or a field of them. */
  mode: "bench" | "battle";
  onSwitchMode: (mode: "bench" | "battle") => void;
  /** Put the bench back to untested: clears failures, scorch and the result. */
  onReset: () => void;
  /**
   * The selected part's margin against its DERATED rating, or null when nothing
   * is selected.
   *
   * Computed by the view and handed down rather than derived here, because the
   * figure depends on the load factor the run is actually driving at — which
   * the console is not the owner of.
   */
  thermal?: ThermalReport | null;
  /**
   * Reports how tall the console currently is, so the scene can compose the
   * circuit into the space left above it. Measured rather than assumed: the
   * height changes when a sheet opens, and a hard-coded number would drift the
   * moment anything in here gained a line.
   */
  onHeightChange?: (px: number) => void;
};

/**
 * The bench's dashboard — fixed, at the bottom of the screen, in the DOM.
 *
 * It used to be a 3D object standing on the board: a beautifully built one,
 * with a machined bezel and a ka-chunk lever, and it was the wrong thing.
 * Three problems, all of them consequences of it being IN the scene:
 *
 *   - you had to CHASE it. Orbit the bench or let the camera cut to a failure
 *     and your controls wandered off frame. A dashboard you have to go and
 *     find is not a dashboard.
 *   - its displays could not be read. A tile face was 0.6 world units against
 *     a 0.75 column pitch, so it could not grow without columns colliding —
 *     about thirty pixels on a phone, which no canvas resolution rescues.
 *   - it competed with the circuit for the board, having to be sized against
 *     it so as not to read as a second bench.
 *
 * Fixed and in the DOM, all three dissolve at once: it is always exactly where
 * you left it, the numbers are real text at whatever size is legible, and the
 * board is handed back to the circuit it exists to show.
 *
 * The 3D dashboard is not "gone" so much as promoted — this is what it was
 * trying to be.
 *
 * It holds ONLY what you operate a live run with: the four circuit totals, the
 * two faders, and the switch. Parts / Conditions / Results used to sit in here
 * too and have moved onto the arena itself ({@link ArenaQuickBar}) — they
 * choose what the next run is, they are not touched during one, and down here
 * they were charging a band of the screen for three words.
 */
export function ArenaDashboard({
  status,
  voltsMultiple,
  voltsMax,
  onVoltsChange,
  seriesOhms,
  onSeriesOhmsChange,
  onThrowSwitch,
  mode,
  onSwitchMode,
  onReset,
  onHeightChange,
  thermal = null,
}: ArenaDashboardProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  /** The formula sheet is transient: the user opens it, and it leaves. */
  const [thermalOpen, setThermalOpen] = useState(false);
  useEffect(() => {
    if (!thermal) setThermalOpen(false);
  }, [thermal]);
  // A ResizeObserver rather than a one-off measure: the console is the floor
  // the scene composes against, and it still changes height (an orientation
  // change, a value growing a digit).
  useEffect(() => {
    const element = rootRef.current;
    if (!element || !onHeightChange) return;
    const report = () => onHeightChange(element.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onHeightChange]);

  const running = status === "battling";
  const seriesT = seriesTFor(seriesOhms);

  return (
    <>
    <section ref={rootRef} className="arena-dash" aria-label="Bench dashboard">
      {/* ── Displays ──────────────────────────────────────────────────
          The four circuit totals, in their W.I.R.E. colours. These are the
          CIRCUIT's numbers, not any one part's: the parts sit in parallel, so
          I is the sum of every branch and R is the parallel combination —
          which is why R climbs as parts fail open and the survivors get hit
          harder. ArenaScene writes into these by their data-wire attributes. */}
      <div className="arena-dash__displays">
        {(
          [
            ["w", "power", "W", "power"],
            ["i", "current", "I", "current"],
            ["r", "resistance", "R", "resistance"],
            ["e", "voltage", "E", "supply"],
          ] as const
        ).map(([key, term, letter, caption]) => (
          <div
            key={key}
            className={`arena-dash__display ct-term-${term}`}
            // The caption is hidden at this size (see the stylesheet): the four
            // W.I.R.E. letters ARE the labels, and saying "POWER" under a lit
            // W cost a line of height on the tallest fixed thing on a phone.
            // Kept in the DOM for the accessible name rather than deleted.
            aria-label={caption}
          >
            <span className="arena-dash__display-letter">{letter}</span>
            <b className="arena-dash__display-value" data-wire={key}>
              —
            </b>
            <span className="arena-dash__display-caption">{caption}</span>
          </div>
        ))}
      </div>

      {/* ── The selected part's margin ─────────────────────────────────
          WHAT THE FOUR TOTALS ABOVE CANNOT SAY.

          The displays are the CIRCUIT's numbers, and they are the right
          numbers to watch a run with — but none of them answers "how close is
          this part to letting go", which is the question the whole bench
          exists to answer. That reading lived only on the part's floating
          nameplate: off by default, and when on, sitting over the part it
          describes. The console is always there and already the instrument, so
          the margin belongs here.

          Compared against the DERATED rating, not the nameplate one — see
          thermalModel. "130% of rated" on a 55 °C bench understates the
          problem; the part is at 170% of what it is actually allowed.

          One row, and tapping it opens the arithmetic. Shape as well as
          colour: the state word changes and the bar fills, so this is still
          readable in sunlight and for a colour-blind user. */}
      {thermal ? (
        <button
          type="button"
          className="arena-dash__margin"
          data-state={thermal.state}
          onClick={() => setThermalOpen((open) => !open)}
          aria-expanded={thermalOpen}
          aria-label={`Thermal margin for ${thermal.name}: ${thermal.utilisationPct.toFixed(
            0,
          )}% of its derated rating, ${Math.round(thermal.tempC)} of ${
            thermal.limitC
          } degrees. Show the working.`}
        >
          <span className="arena-dash__margin-name">{thermal.name}</span>
          <span className="arena-dash__margin-metric">
            <b>{Math.min(thermal.utilisationPct, 999).toFixed(0)}%</b>
            {thermal.saturated ? "+ " : " "}of derated
          </span>
          <span className="arena-dash__margin-metric">
            <b>{Math.round(thermal.tempC)}</b>/{Math.round(thermal.limitC)}°C
          </span>
          <span className="arena-dash__margin-bar" aria-hidden>
            <i style={{ width: `${Math.min(thermal.utilisationPct, 100)}%` }} />
          </span>
        </button>
      ) : null}

      {/* ── Controls ──────────────────────────────────────────────────
          Faders are real range inputs. A native range gets keyboard control,
          screen-reader semantics and the platform's own touch handling for
          free — all of which the 3D handles had to fake, and two of which
          they never managed at all.

          LIVE DURING A RUN, deliberately. They used to lock the moment a test
          started, which is backwards for a bench: riding the supply while the
          part is cooking — easing off as it reddens, leaning on it to find the
          edge — IS the experiment. Locking them made the console something you
          set up beforehand and then watched, which is the difference between
          operating an instrument and pressing start on one.

          The volts fader is driven FROM the live load while running (see
          voltsMultiple), so it tracks the ramp climbing and a drag scrubs the
          ramp to wherever you put it. A handle that sat still while the bench
          climbed past it would be lying about the thing it controls. */}
      <div className="arena-dash__controls">
        <label className="arena-dash__fader">
          <span className="arena-dash__fader-head">
            <span className="ct-term-voltage">Supply</span>
            <b className="ct-term-voltage">{voltsMultiple.toFixed(2)}×</b>
            {/* The reference sits ABOVE the track, not under it. Under a
                104px vertical fader it was the last line in the console and
                got clipped to the tops of its letters — a legend you cannot
                read is worse than none, because it still costs the space. */}
            <em className="arena-dash__fader-ref">of {voltsMax.toFixed(1)}× rated</em>
          </span>
          <input
            type="range"
            min={1}
            max={voltsMax}
            step={0.01}
            value={Math.min(Math.max(voltsMultiple, 1), voltsMax)}
            onChange={(event) => onVoltsChange(Number(event.target.value))}
            aria-label="Supply voltage, as a multiple of nominal"
          />
        </label>

        <label className="arena-dash__fader">
          <span className="arena-dash__fader-head">
            <span className="ct-term-resistance">Series R</span>
            <b className="ct-term-resistance">
              {seriesOhms >= 1000
                ? `${(seriesOhms / 1000).toFixed(2)} kΩ`
                : `${Math.round(seriesOhms)} Ω`}
            </b>
            <em className="arena-dash__fader-ref">
              of {(SERIES_OHMS_MAX / 1000).toFixed(1)} kΩ
            </em>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={seriesT}
            onChange={(event) =>
              onSeriesOhmsChange(seriesOhmsFor(Number(event.target.value)))
            }
            aria-label="Series resistance in the supply line"
          />
        </label>

        {/* ── Bench row ─────────────────────────────────────────────────
            Which bench, and put it back. These lived in a params panel that
            covered ~60% of a phone — y208 to y757 — so the 3D bench the arena
            exists to show was a strip at the top of the screen. Everything else
            that panel held was already on the quick bar (parts, conditions) or
            this console (the switch); these two were the only reason left to
            have it. Silkscreen text, no boxes: they are legends on the panel,
            not a second row of buttons. */}
        <div className="arena-dash__bench-row">
          <div className="arena-dash__mode" role="group" aria-label="Bench">
            {(
              [
                ["bench", "Solo"],
                ["battle", "Battle"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`arena-dash__mode-btn${mode === value ? " is-on" : ""}`}
                aria-pressed={mode === value}
                // Not mid-run: walking to the other bench would abandon a test
                // that is still cooking a part.
                disabled={running && mode !== value}
                onClick={() => mode !== value && onSwitchMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="arena-dash__reset" onClick={onReset}>
            ↺ Reset
          </button>
        </div>

        {/* The switch. Still the thing that starts the bench, and still the
            biggest control on the panel, because it is the one you throw. */}
        <button
          type="button"
          className={`arena-dash__switch${running ? " is-live" : ""}`}
          onClick={onThrowSwitch}
          aria-pressed={running}
        >
          <span className="arena-dash__switch-lever" aria-hidden />
          <span className="arena-dash__switch-label">
            {running ? "Running" : status === "complete" ? "Run again" : "Throw"}
          </span>
        </button>
      </div>

    </section>

      {/* OUTSIDE the console, and it has to be.

          The console is glass: `backdrop-filter` makes it the CONTAINING BLOCK
          for fixed-position descendants, and `overflow: hidden` then CLIPS
          them. A sheet rendered inside it was positioned from the console's box
          and cut off above its top edge — measured at 360×640, its close button
          landed behind the canvas and could not be tapped at all. It looked
          right in the DOM and was unreachable on the screen.

          A sibling escapes both, which is the whole fix. It also keeps the
          width measurement honest: `inset-inline` here is the viewport, not the
          console's content box. */}
      {thermalOpen && thermal ? (
        <ArenaThermalSheet report={thermal} onClose={() => setThermalOpen(false)} />
      ) : null}
    </>
  );
}
