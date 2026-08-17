import { AffiliateDisclosure, BuyLink } from "../../affiliate";
import { marginC, ratedFraction, type LeaderboardEntry } from "./leaderboardModel";

type ArenaLeaderboardProps = {
  entries: LeaderboardEntry[];
  onClear: () => void;
};

function fmtWatts(value: number): string {
  if (value >= 1) return `${value.toFixed(2)} W`;
  return `${Math.round(value * 1000)} mW`;
}

/**
 * The board: every part that has been run on this bench, best showing first.
 *
 * Three columns, because these are the three questions actually asked of a
 * component — and every one carries its reference, never a bare number:
 *
 *   HELD TO   the load multiple it survived to. The headline result.
 *   POWER     what it was dissipating at its worst against its rating. This is
 *             the column that explains the other two.
 *   TEMP      how hot it got against its junction limit, as margin. Positive
 *             is headroom left; negative is how far past its limit it went.
 *
 * It accumulates across runs rather than showing only the last one, because the
 * comparison the bench exists for is between runs: edit the part's rating,
 * run it again, and see the two side by side. Contenders are keyed by identity
 * PLUS ratings, so "this resistor at 0.25 W" and "the same resistor at 0.5 W"
 * are two entries — which is the whole point.
 */
export function ArenaLeaderboard({ entries, onClear }: ArenaLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <section className="arena-board">
        <header className="arena-board__head">
          <h3 className="arena-board__title">Leaderboard</h3>
        </header>
        <p className="arena-board__empty">
          Run a test and every part that takes part lands here — best result
          first, kept across runs so you can change a rating and compare.
        </p>
      </section>
    );
  }

  return (
    <section className="arena-board">
      <header className="arena-board__head">
        <h3 className="arena-board__title">Leaderboard</h3>
        <button type="button" className="arena-board__clear" onClick={onClear}>
          Clear
        </button>
      </header>

      <div className="arena-board__legend" aria-hidden>
        <span>Held to</span>
        <span>Power at peak</span>
        <span>Temp margin</span>
      </div>

      <ol className="arena-board__rows">
        {entries.map((entry, index) => {
          const margin = marginC(entry);
          const over = margin < 0;
          const fraction = ratedFraction(entry);
          return (
            <li
              key={entry.key}
              className={`arena-board__row${entry.survived ? " is-survivor" : ""}`}
            >
              <span className="arena-board__rank">{index + 1}</span>
              <span className="arena-board__name">
                {entry.name}
                <em className="arena-board__meta">
                  {entry.survived ? "survived" : "failed"} · {entry.scenarioName} ·
                  run {entry.runIndex}
                </em>
                {/* The link belongs HERE and not on a "winner" banner: the row
                    already says what this part did and what it cost it, so a
                    reader arrives at the link having just been told whether it
                    is worth buying. It renders untagged (and unmarked) until a
                    tracking id is configured — see src/affiliate/config.ts. */}
                <BuyLink part={entry.partQuery} placement="leaderboard" />
              </span>
              <span className="arena-board__stat">
                <b>{entry.heldToLoad.toFixed(1)}×</b>
                <em>rated load</em>
              </span>
              <span className={`arena-board__stat${fraction > 1 ? " is-over" : ""}`}>
                <b>{fmtWatts(entry.peakW)}</b>
                <em>of {fmtWatts(entry.ratedW)} rated</em>
              </span>
              <span className={`arena-board__stat${over ? " is-over" : ""}`}>
                <b>
                  {over ? "+" : ""}
                  {Math.abs(Math.round(margin))}°C
                </b>
                <em>{over ? "over limit" : "headroom"}</em>
              </span>
            </li>
          );
        })}
      </ol>

      {/* One disclosure for the surface, under the links it covers. Renders
          nothing at all while the links are untagged, because there is no
          commission to declare yet. */}
      <AffiliateDisclosure />
    </section>
  );
}
