import { useId, useState } from "react";
import { AffiliateDisclosure, BuyLink } from "../../affiliate";
import {
  marginC,
  ratedFraction,
  type LeaderboardEntry,
} from "./leaderboardModel";
import type { ArenaRunRecord } from "./runHistory";
import { FuseHistoryPanel } from "./FuseHistoryPanel";
import type { FamilyImportResult } from "./fuseHistory";
import type { FuseRecord } from "../../lib/fuseRecord";

type ArenaLeaderboardProps = {
  entries: LeaderboardEntry[];
  runs: ArenaRunRecord[];
  onClear: () => void;
  onClearRuns: () => void;
  /** Verdicts the family record holds on this device, from every app. */
  familyLog?: FuseRecord[];
  onClearFamilyLog?: () => void;
  onImportFamilyText?: (text: string) => FamilyImportResult;
};

function fmtWatts(value: number): string {
  if (value >= 1) return `${value.toFixed(2)} W`;
  return `${Math.round(value * 1000)} mW`;
}

/** A run's finish time, local, short enough for a phone row. */
function fmtWhen(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 16).replace("T", " ");
  }
}

/**
 * The board: every part that has been run on this bench, best showing first —
 * and, behind the second tab, every run that produced those showings.
 *
 * Two questions, one surface. The board answers "which part is best" and keeps
 * each contender's best result; the history answers "what happened, and in what
 * order" and keeps every run separately. They are read together because that is
 * how the experiment is actually read: a part at the top of the board is a claim,
 * and the run it came from is the evidence. Putting the history in its own panel
 * would put the evidence somewhere else on screen from the claim.
 *
 * Board columns, each carrying its own reference, never a bare number:
 *
 *   HELD TO   the load multiple it survived to. The headline result.
 *   POWER     what it was dissipating at its worst against its rating. This is
 *             the column that explains the other two.
 *   TEMP      how hot it got against its junction limit, as margin. Positive
 *             is headroom left; negative is how far past its limit it went.
 *
 * Contenders are keyed by identity PLUS ratings, so "this resistor at 0.25 W"
 * and "the same resistor at 0.5 W" are two entries — which is the whole point.
 */
export function ArenaLeaderboard({
  entries,
  runs,
  onClear,
  onClearRuns,
  familyLog = [],
  onClearFamilyLog,
  onImportFamilyText,
}: ArenaLeaderboardProps) {
  const [tab, setTab] = useState<"board" | "runs" | "history">("board");
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const panelId = useId();

  // Every clear is irreversible, so every clear asks first. A board is an
  // afternoon of runs; there is no undo behind any of these buttons.
  const clear = (message: string, action: () => void) => {
    if (typeof window !== "undefined" && !window.confirm(message)) {
      return;
    }
    action();
  };

  const clearButton =
    tab === "board"
      ? entries.length > 0
        ? {
            label: "Clear board",
            message: "Clear every result on the leaderboard?",
            action: onClear,
          }
        : null
      : tab === "runs"
        ? runs.length > 0
          ? {
              label: "Clear runs",
              message: "Clear the whole run history?",
              action: onClearRuns,
            }
          : null
        : familyLog.length > 0 && onClearFamilyLog
          ? {
              label: "Clear record",
              message:
                "Clear the family record? Verdicts from every app go, and there is no undo.",
              action: onClearFamilyLog,
            }
          : null;

  return (
    <section className="arena-board">
      <header className="arena-board__head">
        <div className="arena-board__tabs" role="tablist" aria-label="Arena results">
          <button
            type="button"
            role="tab"
            id={`${panelId}-board-tab`}
            aria-selected={tab === "board"}
            aria-controls={`${panelId}-board`}
            className="arena-board__tab"
            onClick={() => setTab("board")}
          >
            Leaderboard
          </button>
          <button
            type="button"
            role="tab"
            id={`${panelId}-runs-tab`}
            aria-selected={tab === "runs"}
            aria-controls={`${panelId}-runs`}
            className="arena-board__tab"
            onClick={() => setTab("runs")}
          >
            Runs{runs.length > 0 ? ` (${runs.length})` : ""}
          </button>
          <button
            type="button"
            role="tab"
            id={`${panelId}-history-tab`}
            aria-selected={tab === "history"}
            aria-controls={`${panelId}-history`}
            className="arena-board__tab"
            onClick={() => setTab("history")}
          >
            Record{familyLog.length > 0 ? ` (${familyLog.length})` : ""}
          </button>
        </div>
        {clearButton ? (
          <button
            type="button"
            className="arena-board__clear"
            onClick={() => clear(clearButton.message, clearButton.action)}
          >
            {clearButton.label}
          </button>
        ) : null}
      </header>

      {tab === "board" ? (
        <div
          role="tabpanel"
          id={`${panelId}-board`}
          aria-labelledby={`${panelId}-board-tab`}
          className="arena-board__panel"
        >
          {entries.length === 0 ? (
            <p className="arena-board__empty">
              Run a test and every part that takes part lands here — best result
              first, kept across runs so you can change a rating and compare.
            </p>
          ) : (
            <>
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
                          {entry.survived ? "survived" : "failed"} ·{" "}
                          {entry.scenarioName} · run {entry.runIndex}
                        </em>
                        {/* The link belongs HERE and not on a "winner" banner: the
                            row already says what this part did and what it cost
                            it, so a reader arrives at the link having just been
                            told whether it is worth buying. It renders untagged
                            (and unmarked) until a tracking id is configured — see
                            src/affiliate/config.ts. */}
                        <BuyLink part={entry.partQuery} placement="leaderboard" />
                      </span>
                      <span className="arena-board__stat">
                        <b>{entry.heldToLoad.toFixed(1)}×</b>
                        <em>rated load</em>
                      </span>
                      <span
                        className={`arena-board__stat${fraction > 1 ? " is-over" : ""}`}
                      >
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
            </>
          )}
        </div>
      ) : tab === "runs" ? (
        <div
          role="tabpanel"
          id={`${panelId}-runs`}
          aria-labelledby={`${panelId}-runs-tab`}
          className="arena-board__panel"
        >
          {runs.length === 0 ? (
            <p className="arena-board__empty">
              Every finished run is filed here — what was on the bench, what won,
              and what each part did on that run. The leaderboard keeps the best
              showing; this keeps the runs that produced them.
            </p>
          ) : (
            <ol className="arena-runs">
              {runs.map((run) => {
                const open = openRunId === run.id;
                return (
                  <li key={run.id} className="arena-runs__item">
                    <button
                      type="button"
                      className="arena-runs__summary"
                      aria-expanded={open}
                      onClick={() => setOpenRunId(open ? null : run.id)}
                    >
                      <span className="arena-runs__index">#{run.runIndex}</span>
                      <span className="arena-runs__title">
                        {run.scenarioName}
                        <em className="arena-runs__meta">
                          {run.mode === "bench" ? "Solo bench" : "Battle"} ·{" "}
                          {run.totalCount} part{run.totalCount === 1 ? "" : "s"} ·{" "}
                          {run.survivorCount} survived · {fmtWhen(run.at)}
                        </em>
                      </span>
                      <span className="arena-runs__winner">
                        {run.winnerName ?? "—"}
                        <em>
                          {run.winnerLoad != null
                            ? `held ${run.winnerLoad.toFixed(1)}×`
                            : ""}
                        </em>
                      </span>
                    </button>

                    {open ? (
                      <ul className="arena-runs__detail">
                        {run.parts.map((part, index) => (
                          <li
                            // Names are not unique on a bench — two of one resistor
                            // is a real experiment — so the position is part of the key.
                            key={`${part.name}-${index}`}
                            className={`arena-runs__part${part.survived ? "" : " is-failed"}`}
                          >
                            <b>{part.name}</b>
                            <em>
                              {part.heldToLoad.toFixed(1)}× · {fmtWatts(part.peakW)} of{" "}
                              {fmtWatts(part.ratedW)}
                            </em>
                            <em>
                              {part.survived
                                ? `${Math.round(part.limitC - part.peakTempC)}°C left`
                                : (part.failureName ?? "failed")}
                            </em>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${panelId}-history`}
          aria-labelledby={`${panelId}-history-tab`}
          className="arena-board__panel"
        >
          {onImportFamilyText && onClearFamilyLog ? (
            <FuseHistoryPanel
              records={familyLog}
              onClear={onClearFamilyLog}
              onImport={onImportFamilyText}
            />
          ) : (
            <p className="arena-board__empty">
              Every verdict any app in the line has filed on this device lands
              here, newest first.
            </p>
          )}
        </div>
      )}

      {/* One disclosure for the surface, under the links it covers. Renders
          nothing at all while the links are untagged, because there is no
          commission to declare yet. */}
      <AffiliateDisclosure />
    </section>
  );
}
