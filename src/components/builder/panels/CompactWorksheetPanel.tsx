import { useCallback, useMemo, useState } from "react";
import type { PracticeProblem } from "../../../model/practice";
import type { WireMetricKey } from "../../../utils/electrical";
import { formatMetricValue, formatNumber } from "../../../utils/electrical";
import { solvePracticeProblem, type SolveResult } from "../../../utils/practiceSolver";
import { METRIC_ORDER, METRIC_PRECISION, type WorksheetEntry, type WorksheetEntryStatus } from "../../../components/practice/WireTable";
import "../../../styles/compact-worksheet.css";

type CompactWorksheetPanelProps = {
  problem: PracticeProblem;
  isOpen: boolean;
  onToggle: () => void;
  onComplete: (complete: boolean) => void;
  onRequestUnlock: () => void;
};

type WorksheetState = Record<string, Record<WireMetricKey, WorksheetEntry>>;

const parseMetricInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const numericMatch = trimmed.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (numericMatch) {
    const candidate = Number(numericMatch[0]);
    if (Number.isFinite(candidate)) return candidate;
  }
  const fallback = Number(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
};

const withinTolerance = (expected: number, actual: number, tolerance = 0.01): boolean => {
  const absoluteExpected = Math.abs(expected);
  const absoluteDiff = Math.abs(expected - actual);
  if (absoluteExpected < 1e-4) return absoluteDiff <= 1e-3;
  return absoluteDiff / absoluteExpected <= tolerance;
};

const formatSeedValue = (value: number, key: WireMetricKey) =>
  formatNumber(value, METRIC_PRECISION[key]);

export function CompactWorksheetPanel({
  problem,
  isOpen,
  onToggle,
  onComplete,
  onRequestUnlock,
}: CompactWorksheetPanelProps) {
  const solution = useMemo(() => solvePracticeProblem(problem), [problem]);

  const expectedValues = useMemo(() => {
    const map: Record<string, Record<WireMetricKey, number>> = {};

    // Build expected values from solution
    map[problem.source.id] = {
      watts: solution.source.watts,
      current: solution.source.current,
      resistance: solution.source.resistance,
      voltage: solution.source.voltage,
    };

    problem.components.forEach((component) => {
      map[component.id] = {
        watts: solution.components[component.id].watts,
        current: solution.components[component.id].current,
        resistance: solution.components[component.id].resistance,
        voltage: solution.components[component.id].voltage,
      };
    });

    map["totals"] = {
      watts: solution.totals.watts,
      current: solution.totals.current,
      resistance: solution.totals.resistance,
      voltage: solution.totals.voltage,
    };

    return map;
  }, [problem, solution]);

  const baselineWorksheet = useMemo(() => {
    const baseline: WorksheetState = {};
    const allRows = [
      { id: problem.source.id, givens: problem.source.givens },
      ...problem.components.map(c => ({ id: c.id, givens: c.givens })),
      { id: "totals", givens: problem.totalsGivens },
    ];

    allRows.forEach((row) => {
      baseline[row.id] = {} as Record<WireMetricKey, WorksheetEntry>;
      METRIC_ORDER.forEach((key) => {
        const given = typeof row.givens?.[key] === "number" && Number.isFinite(row.givens[key]);
        const expected = expectedValues[row.id]?.[key];
        baseline[row.id][key] = {
          raw: given && Number.isFinite(expected) ? formatSeedValue(expected!, key) : "",
          value: given && Number.isFinite(expected) ? expected! : null,
          status: given ? "given" : "blank",
          given,
        };
      });
    });

    return baseline;
  }, [problem, expectedValues]);

  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>(baselineWorksheet);
  const [worksheetComplete, setWorksheetComplete] = useState(false);

  const computeWorksheetComplete = useCallback((state: WorksheetState) => {
    const allRows = [
      { id: problem.source.id },
      ...problem.components.map(c => ({ id: c.id })),
      { id: "totals" },
    ];

    return allRows.every((row) =>
      METRIC_ORDER.every((metric) => {
        const cell = state[row.id]?.[metric];
        if (!cell || cell.given) return true;
        return cell.status === "correct";
      })
    );
  }, [problem]);

  const handleWorksheetChange = useCallback((
    rowId: string,
    key: WireMetricKey,
    raw: string,
  ) => {
    setWorksheetEntries((prev) => {
      const next: WorksheetState = { ...prev };
      const previousRow = prev[rowId] ?? {};
      const row: Record<WireMetricKey, WorksheetEntry> = { ...previousRow } as Record<WireMetricKey, WorksheetEntry>;

      const baseCell: WorksheetEntry = row[key] ?? {
        raw: "",
        value: null,
        status: "blank",
        given: false,
      };

      if (baseCell.given) return prev;

      const parsed = parseMetricInput(raw);
      const expected = expectedValues[rowId]?.[key];

      let status: WorksheetEntryStatus = "blank";
      let value: number | null = null;

      if (!raw.trim()) {
        status = "blank";
      } else if (parsed === null) {
        status = "invalid";
      } else if (expected === undefined) {
        status = "incorrect";
        value = parsed;
      } else if (withinTolerance(expected, parsed)) {
        status = "correct";
        value = parsed;
      } else {
        status = "incorrect";
        value = parsed;
      }

      row[key] = { raw, value, status, given: baseCell.given };
      next[rowId] = row;

      const complete = computeWorksheetComplete(next);
      setWorksheetComplete(complete);
      onComplete(complete);

      return next;
    });
  }, [expectedValues, computeWorksheetComplete, onComplete]);

  const targetValue = useMemo(() => {
    const { componentId, key } = problem.targetMetric;
    if (componentId === "totals") return solution.totals[key];
    if (componentId === "source" || componentId === problem.source.id) return solution.source[key];
    return solution.components[componentId]?.[key];
  }, [problem, solution]);

  const metricLabels: Record<WireMetricKey, { letter: string; label: string; color: string }> = {
    watts: { letter: "W", label: "Watts", color: "#88CCFF" },
    current: { letter: "I", label: "Current", color: "#FFB347" },
    resistance: { letter: "R", label: "Resistance", color: "#90EE90" },
    voltage: { letter: "E", label: "Voltage", color: "#FF6B6B" },
  };

  const allRows = useMemo(() => [
    { id: problem.source.id, label: problem.source.label },
    ...problem.components.map(c => ({ id: c.id, label: c.label })),
    { id: "totals", label: "Totals" },
  ], [problem]);

  return (
    <div className={`compact-worksheet-panel${isOpen ? " open" : ""}`}>
      <div className="compact-worksheet-header">
        <button
          type="button"
          className="compact-worksheet-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "v" : "^"}</span>
          <span className="toggle-label">
            {worksheetComplete ? "✓ Worksheet Complete" : "Practice Worksheet"}
          </span>
        </button>
        {worksheetComplete && (
          <button
            type="button"
            className="compact-worksheet-unlock-btn"
            onClick={onRequestUnlock}
          >
            Unlock & Edit Circuit
          </button>
        )}
      </div>

      {isOpen && (
        <div className="compact-worksheet-body">
          <div className="compact-worksheet-problem-info">
            <h3>{problem.title}</h3>
            <p className="compact-worksheet-prompt">{problem.prompt}</p>
            <div className="compact-worksheet-target">
              <strong>{problem.targetQuestion}</strong>
              <span className="compact-worksheet-answer">
                {worksheetComplete && Number.isFinite(targetValue)
                  ? formatMetricValue(targetValue as number, problem.targetMetric.key)
                  : "Complete worksheet to reveal"}
              </span>
            </div>
          </div>

          <div className="compact-worksheet-table-wrapper">
            {/* W.I.R.E. layout: Metrics as rows (W, I, R, E from top to bottom), Components as columns */}
            <table className="compact-worksheet-table wire-rows-layout">
              <thead>
                <tr>
                  <th className="metric-label-header">W.I.R.E.</th>
                  {allRows.map((row) => (
                    <th key={row.id} className={row.id === "totals" ? "totals-column" : "component-column"}>
                      {row.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ORDER.map((key) => (
                  <tr key={key} className={`metric-row metric-${key}`}>
                    <td className="metric-label-cell" style={{ color: metricLabels[key].color }}>
                      <span className="metric-letter">{metricLabels[key].letter}</span>
                      <span className="metric-label-small">{metricLabels[key].label}</span>
                    </td>
                    {allRows.map((row) => {
                      const entry = worksheetEntries[row.id]?.[key] ?? {
                        raw: "",
                        value: null,
                        status: "blank",
                        given: false,
                      };
                      return (
                        <td key={row.id} data-status={entry.status} className={row.id === "totals" ? "totals-cell" : ""}>
                          <input
                            type="text"
                            value={entry.raw}
                            onChange={(e) => handleWorksheetChange(row.id, key, e.target.value)}
                            disabled={entry.given}
                            placeholder="?"
                            className={`worksheet-input ${entry.status}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="compact-worksheet-hint">
            <p>
              <strong>Tip:</strong> Fill each blank cell using the circuit in the workspace above.
              Green cells are correct. Complete all cells to unlock editing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
