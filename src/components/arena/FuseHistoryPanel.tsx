import { useId, useState } from "react";
import type { FuseRecord } from "../../lib/fuseRecord";
import {
  countByLevel,
  downloadFamilyBundle,
  type FamilyImportResult,
} from "./fuseHistory";

/**
 * The family record, as a list.
 *
 * Third tab beside the board and the runs, because it is the same question one
 * level up: the board answers "which part is best here", the runs answer "what
 * happened on this bench", and this answers "what has failed anywhere". The row
 * is a scan line — level, what, when — and the detail under it carries the
 * figures that produced the verdict.
 *
 * Rated beside actual is the point of the detail. A row that says "failed" is an
 * opinion; "38 A of 25 A rated" is the evidence for it, and it is the thing a
 * manufacturer or an instructor actually reads.
 */

type FuseLevel = FuseRecord["level"];

const LEVEL_WORD: Record<FuseLevel, string> = {
  safe: "held",
  stressed: "stressed",
  warning: "warning",
  critical: "critical",
  failed: "failed",
};

const LEVEL_ORDER: FuseLevel[] = [
  "failed",
  "critical",
  "warning",
  "stressed",
  "safe",
];

/** A figure with its unit. Never a bare number, never rounded past its meaning. */
function withUnit(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const abs = Math.abs(value);
  const shown =
    abs >= 100
      ? Math.round(value).toString()
      : abs >= 1
        ? value.toFixed(2).replace(/(\.\d)0$/, "$1").replace(/\.00$/, "")
        : value.toPrecision(3).replace(/\.?0+$/, "");
  return `${shown} ${unit}`.trim();
}

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

/** Long enough to read a session, short enough that a phone sheet stays usable. */
const SHOWN_MAX = 50;

type FuseHistoryPanelProps = {
  records: FuseRecord[];
  onClear: () => void;
  onImport: (text: string) => FamilyImportResult;
};

export function FuseHistoryPanel({
  records,
  onClear,
  onImport,
}: FuseHistoryPanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileId = useId();
  const counts = countByLevel(records);
  const shown = records.slice(0, SHOWN_MAX);

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const result = onImport(await file.text());
      const whose = result.apps.length > 0 ? ` from ${result.apps.join(", ")}` : "";
      setNote(
        `${result.added} added${whose}${result.rejected > 0 ? `, ${result.rejected} rejected` : ""} · ${result.total} in the record`,
      );
    } catch {
      setError("That file could not be read. Export a bundle from the app and try again.");
    }
  };

  const exportRecord = () => {
    const { count } = downloadFamilyBundle(records);
    setNote(
      `${count} verdict${count === 1 ? "" : "s"} written to a file`,
    );
  };

  const clearRecord = () => {
    const message =
      "Clear the family record? Verdicts from every app go, and there is no undo.";
    if (typeof window !== "undefined" && !window.confirm(message)) return;
    onClear();
    setNote(null);
  };

  return (
    <div className="arena-family">
      <div className="arena-family__counts" aria-label="Verdicts by level">
        {records.length === 0 ? (
          <span className="arena-family__count">no verdicts yet</span>
        ) : (
          LEVEL_ORDER.filter((level) => counts[level] > 0).map((level) => (
            <span
              key={level}
              className={`arena-family__count arena-family__count--${level}`}
            >
              <b>{counts[level]}</b> {LEVEL_WORD[level]}
            </span>
          ))
        )}
      </div>

      <div className="arena-family__actions">
        <button
          type="button"
          className="arena-family__btn"
          onClick={exportRecord}
          disabled={records.length === 0}
        >
          Export record
        </button>
        <button
          type="button"
          className="arena-family__btn"
          onClick={() => document.getElementById(fileId)?.click()}
        >
          Take in a bundle
        </button>
        <input
          id={fileId}
          className="arena-family__file"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void takeFile(event.target.files?.[0]);
            // Reset so choosing the same file twice still fires a change.
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="arena-family__btn arena-family__btn--quiet"
          onClick={clearRecord}
          disabled={records.length === 0}
        >
          Clear record
        </button>
      </div>

      {note ? (
        <p className="arena-family__note" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="arena-family__note is-error" role="alert">
          {error}
        </p>
      ) : null}

      {records.length === 0 ? (
        <p className="arena-board__empty">
          Run the bench, or take in a bundle from another app in the line. Every
          verdict lands here with the rated figure beside the one it actually ran
          at.
        </p>
      ) : (
        <ol className="arena-family__list">
          {shown.map((record) => {
            const open = openId === record.id;
            return (
              <li key={record.id} className="arena-family__item">
                <button
                  type="button"
                  className="arena-family__row"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : record.id)}
                >
                  <span
                    className={`arena-family__level arena-family__level--${record.level}`}
                  >
                    {LEVEL_WORD[record.level]}
                  </span>
                  <span className="arena-family__main">
                    {record.subject}
                    <em className="arena-family__meta">
                      {record.app}
                      {record.failure ? ` · ${record.failure}` : ""}
                    </em>
                  </span>
                  <span className="arena-family__when">{fmtWhen(record.at)}</span>
                </button>

                {open ? (
                  <div className="arena-family__detail">
                    {record.metrics.length > 0 ? (
                      <ul className="arena-family__metrics">
                        {record.metrics.map((metric, index) => (
                          <li key={`${metric.key}-${index}`}>
                            <b>{metric.key}</b>{" "}
                            {withUnit(metric.actual, metric.unit)}
                            {metric.rated != null
                              ? ` of ${withUnit(metric.rated, metric.unit)} rated`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {record.note ? (
                      <p className="arena-family__line">{record.note}</p>
                    ) : null}
                    <p className="arena-family__line">
                      {record.basis === "datasheet"
                        ? "maker's figures"
                        : record.basis}
                      {record.manufacturer ? ` · ${record.manufacturer}` : ""}
                      {record.partNumber ? ` ${record.partNumber}` : ""}
                      {record.severity != null
                        ? ` · ${withUnit(
                            record.severity,
                            record.severityScale === "seconds"
                              ? "s"
                              : record.severityScale === "0-3"
                                ? "of 3"
                                : "%",
                          )}`
                        : ""}
                    </p>
                    {record.runId ? (
                      <p className="arena-family__line">run {record.runId}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {records.length > shown.length ? (
        <p className="arena-family__note">
          Showing {shown.length} of {records.length}, newest first.
        </p>
      ) : null}
    </div>
  );
}
