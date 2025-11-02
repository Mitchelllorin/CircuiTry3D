import type { PartialWireMetrics, WireMetricKey, WireMetrics } from "../../utils/electrical";
import { formatMetricValue } from "../../utils/electrical";

const METRIC_ORDER: WireMetricKey[] = ["watts", "current", "resistance", "voltage"];
const METRIC_HEADERS: Record<WireMetricKey, { label: string; description: string }> = {
  watts: { label: "W", description: "Watts" },
  current: { label: "I", description: "Amps" },
  resistance: { label: "R", description: "Ohms" },
  voltage: { label: "E", description: "Volts" },
};

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
};

const isGiven = (givens: PartialWireMetrics | undefined, key: WireMetricKey, revealAll: boolean) => {
  if (revealAll) {
    return true;
  }
  return typeof givens?.[key] === "number" && Number.isFinite(givens[key]);
};

const cellContent = (row: WireTableRow, key: WireMetricKey, revealAll: boolean) => {
  const shouldShow = isGiven(row.givens, key, revealAll);
  return shouldShow ? formatMetricValue(row.metrics[key], key) : "—";
};

export default function WireTable({ rows, revealAll, highlight }: WireTableProps) {
  return (
    <div className="practice-table" role="table" aria-label="W.I.R.E. worksheet">
      <div className="practice-table-header" role="row">
        <div className="practice-table-cell heading" role="columnheader">
          Component
        </div>
        {METRIC_ORDER.map((key) => (
          <div key={key} className="practice-table-cell heading" role="columnheader">
            <span className={`metric-pill metric-${key}`}>{METRIC_HEADERS[key].label}</span>
            <span className="metric-caption">{METRIC_HEADERS[key].description}</span>
          </div>
        ))}
      </div>
      <div className="practice-table-body">
        {rows.map((row) => (
          <div key={row.id} className={`practice-table-row role-${row.role}`} role="row">
            <div className="practice-table-cell label" role="cell">
              <span className="row-label">{row.label}</span>
            </div>
            {METRIC_ORDER.map((key) => {
              const content = cellContent(row, key, revealAll);
              const isHighlighted = highlight && highlight.rowId === row.id && highlight.key === key;
              return (
                <div
                  key={key}
                  className={`practice-table-cell metric ${isHighlighted ? "highlight" : ""}`}
                  role="cell"
                  data-empty={content === "—" ? "true" : undefined}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

