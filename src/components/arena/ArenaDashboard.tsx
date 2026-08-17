import { useEffect, useRef } from "react";
import { SERIES_OHMS_MAX, seriesOhmsFor, seriesTFor } from "./supplyLoad";
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
  onHeightChange,
}: ArenaDashboardProps) {
  const rootRef = useRef<HTMLElement | null>(null);
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
          <div key={key} className={`arena-dash__display ct-term-${term}`}>
            <span className="arena-dash__display-letter">{letter}</span>
            <b className="arena-dash__display-value" data-wire={key}>
              —
            </b>
            <span className="arena-dash__display-caption">{caption}</span>
          </div>
        ))}
      </div>

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
  );
}
