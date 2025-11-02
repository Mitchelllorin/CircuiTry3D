import type { PartialWireMetrics, WireMetricKey, WireMetrics } from "../../utils/electrical";
import { formatMetricValue, formatNumber } from "../../utils/electrical";

export const METRIC_ORDER: WireMetricKey[] = ["watts", "current", "resistance", "voltage"];

export const METRIC_HEADERS: Record<WireMetricKey, { label: string; description: string }> = {
  watts: { label: "W", description: "Watts" },
  current: { label: "I", description: "Current (A)" },
  resistance: { label: "R", description: "Resistance (Ω)" },
  voltage: { label: "E", description: "Voltage (V)" },
};

export const METRIC_UNITS: Record<WireMetricKey, string> = {
  watts: "W",
  current: "A",
  resistance: "Ω",
  voltage: "V",
};

export const METRIC_PRECISION: Record<WireMetricKey, number> = {
  watts: 2,
  current: 3,
  resistance: 2,
  voltage: 2,
};

export type WorksheetEntryStatus = "given" | "blank" | "invalid" | "correct" | "incorrect";

export type WorksheetEntry = {
  raw: string;
  value: number | null;
  status: WorksheetEntryStatus;
  given: boolean;
};

export type WorksheetEntries = Record<string, Record<WireMetricKey, WorksheetEntry>>;

export type WireTableRow = {
  id: string;
  label: string;
  role: "source" | "load" | "total";
  givens?: PartialWireMetrics;
  metrics: WireMetrics;
};

export type WireTableProps = {
  rows: WireTableRow[];
  revealAll: boolean;
  highlight?: { rowId: string; key: WireMetricKey };
  entries: WorksheetEntries;
  onChange(rowId: string, key: WireMetricKey, raw: string): void;
};

const formatWorksheetNumber = (value: number, key: WireMetricKey) => formatNumber(value, METRIC_PRECISION[key]);

const buildGridTemplate = (columnCount: number) =>
  `var(--worksheet-metric-width, 140px) repeat(${columnCount}, minmax(0, 1fr))`;

type CellStatus = WorksheetEntryStatus | "revealed";

export default function WireTable({ rows, revealAll, highlight, entries, onChange }: WireTableProps) {
  const gridTemplateColumns = buildGridTemplate(rows.length);

  const renderCell = (row: WireTableRow, key: WireMetricKey) => {
    const entry = entries[row.id]?.[key];
    const expected = row.metrics[key];
    const expectedDisplay = Number.isFinite(expected) ? formatWorksheetNumber(expected, key) : "—";
    const givenFromRow = typeof row.givens?.[key] === "number" && Number.isFinite(row.givens[key]);
    const isGiven = entry?.given ?? givenFromRow;
    const highlightActive = highlight && highlight.rowId === row.id && highlight.key === key;
    const statusBase: WorksheetEntryStatus | "blank" = entry?.status ?? (isGiven ? "given" : "blank");
    const cellStatus: CellStatus = revealAll ? "revealed" : statusBase;
    const unit = METRIC_UNITS[key];
    const ariaLabel = `${row.label} ${METRIC_HEADERS[key].description}`;
    const rawValue = entry?.raw ?? "";
    const inputInvalid = entry?.status === "invalid";

    const showInput = !revealAll && !isGiven;

    return (
      <div
        key={key}
        className={`practice-table-cell worksheet-cell status-${cellStatus} role-${row.role} ${
          highlightActive ? "highlight" : ""
        }`}
        data-given={isGiven ? "true" : undefined}
        data-reveal={revealAll ? "true" : undefined}
        role="gridcell"
      >
        {showInput ? (
          <div className="worksheet-input-wrapper">
            <input
              type="text"
              className="worksheet-input"
              inputMode="decimal"
              value={rawValue}
              placeholder="—"
              onChange={(event) => onChange(row.id, key, event.target.value)}
              aria-label={ariaLabel}
              aria-invalid={inputInvalid ? "true" : undefined}
            />
            <span className="worksheet-unit" aria-hidden="true">
              {unit}
            </span>
          </div>
        ) : (
          <span className="worksheet-value" aria-label={`${ariaLabel} ${formatMetricValue(expected, key)}`}>
            <span>{expectedDisplay}</span>
            <span className="worksheet-unit" aria-hidden="true">
              {unit}
            </span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="practice-table" role="grid" aria-label="W.I.R.E. worksheet">
      <div className="practice-table-header" role="row" style={{ gridTemplateColumns }}>
        <div className="practice-table-cell heading metric-heading" role="columnheader">
          <span className="metric-heading-title">Metric</span>
          <span className="metric-caption">W · I · R · E</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={`practice-table-cell heading component-heading role-${row.role}`}
            role="columnheader"
          >
            <span className="component-label">{row.label}</span>
            <span className="component-caption">
              {row.role === "source" ? "Source" : row.role === "total" ? "Totals" : "Component"}
            </span>
          </div>
        ))}
      </div>
      <div className="practice-table-body">
        {METRIC_ORDER.map((metric) => (
          <div
            key={metric}
            className="practice-table-row metric-row"
            role="row"
            style={{ gridTemplateColumns }}
            data-metric={metric}
          >
            <div className="practice-table-cell metric-label" role="rowheader">
              <span className={`metric-pill metric-${metric}`}>{METRIC_HEADERS[metric].label}</span>
              <span className="metric-caption">{METRIC_HEADERS[metric].description}</span>
            </div>
            {rows.map((row) => renderCell(row, metric))}
          </div>
        ))}
      </div>
    </div>
  );
}

