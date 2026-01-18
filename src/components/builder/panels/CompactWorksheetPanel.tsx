import { useCallback, useEffect, useMemo, useState } from "react";
import type { PracticeProblem } from "../../../model/practice";
import type { WireMetricKey } from "../../../utils/electrical";
import { formatMetricValue, formatNumber } from "../../../utils/electrical";
import { trySolvePracticeProblem } from "../../../utils/practiceSolver";
import { METRIC_ORDER, METRIC_PRECISION, type WorksheetEntry, type WorksheetEntryStatus } from "../../../components/practice/WireTable";
import CircuitDiagram from "../../../components/practice/CircuitDiagram";
import { Component3DViewer } from "../../arena/Component3DViewer";
import WordMark from "../../WordMark";
import "../../../styles/compact-worksheet.css";

type CompactWorksheetPanelProps = {
  problem: PracticeProblem;
  isOpen: boolean;
  onToggle: () => void;
  onComplete: (complete: boolean) => void;
  onRequestUnlock: () => void;
  onAdvance?: () => void;
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

const shouldIncludeSource = (problem: PracticeProblem): boolean => {
  const { componentId } = problem.targetMetric;
  // Include source column only if the problem targets the source specifically
  return componentId === "source" || componentId === problem.source.id;
};

const formatSeedValue = (value: number, key: WireMetricKey) =>
  formatNumber(value, METRIC_PRECISION[key]);

export function CompactWorksheetPanel({
  problem,
  isOpen,
  onToggle,
  onComplete,
  onRequestUnlock,
  onAdvance,
}: CompactWorksheetPanelProps) {
  const solutionResult = useMemo(() => trySolvePracticeProblem(problem), [problem]);
  const solution = solutionResult.ok ? solutionResult.data : null;

  const expectedValues = useMemo<Record<string, Record<WireMetricKey, number>>>(() => {
    if (!solution) {
      return {};
    }
    const map: Record<string, Record<WireMetricKey, number>> = {};
    const includeSource = shouldIncludeSource(problem);

    // Build expected values from solution - only include source if needed
    if (includeSource) {
      map[problem.source.id] = {
        watts: solution.source.watts,
        current: solution.source.current,
        resistance: solution.source.resistance,
        voltage: solution.source.voltage,
      };
    }

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
    const includeSource = shouldIncludeSource(problem);
    const allRows = [
      ...(includeSource ? [{ id: problem.source.id, givens: problem.source.givens }] : []),
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

  useEffect(() => {
    setWorksheetEntries(baselineWorksheet);
    setWorksheetComplete(false);
  }, [baselineWorksheet, problem.id]);

  const computeWorksheetComplete = useCallback((state: WorksheetState) => {
    const includeSource = shouldIncludeSource(problem);
    const allRows = [
      ...(includeSource ? [{ id: problem.source.id }] : []),
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
    if (!solution) {
      return null;
    }
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

  const allRows = useMemo(() => {
    const includeSource = shouldIncludeSource(problem);
    return [
      ...(includeSource ? [{ id: problem.source.id, label: problem.source.label }] : []),
      ...problem.components.map(c => ({ id: c.id, label: c.label })),
      { id: "totals", label: "Totals" },
    ];
  }, [problem]);

  const [activeTab, setActiveTab] = useState<"worksheet" | "3dview" | "hints" | "formulas">("worksheet");
  const [tipDismissed, setTipDismissed] = useState(false);

  // Extract givens from problem for display
  const givensDisplay = useMemo(() => {
    const givens: Array<{ label: string; value: string; metric: string }> = [];

    // Source givens
    if (problem.source.givens) {
      Object.entries(problem.source.givens).forEach(([key, value]) => {
        if (typeof value === "number") {
          givens.push({
            label: problem.source.label || "Source",
            value: formatMetricValue(value, key as WireMetricKey),
            metric: key,
          });
        }
      });
    }

    // Component givens
    problem.components.forEach((comp) => {
      if (comp.givens) {
        Object.entries(comp.givens).forEach(([key, value]) => {
          if (typeof value === "number") {
            givens.push({
              label: comp.label,
              value: formatMetricValue(value, key as WireMetricKey),
              metric: key,
            });
          }
        });
      }
    });

    return givens;
  }, [problem]);

  // W.I.R.E. wheel data for mini wheel display
  const wireFormulas = {
    W: { color: "#88CCFF", formulas: ["P = E × I", "P = I² × R", "P = E² / R"] },
    I: { color: "#FFB347", formulas: ["I = E / R", "I = P / E", "I = √(P/R)"] },
    R: { color: "#90EE90", formulas: ["R = E / I", "R = P / I²", "R = E² / P"] },
    E: { color: "#FF6B6B", formulas: ["E = I × R", "E = P / I", "E = √(P×R)"] },
  };

  return (
      <div className={`compact-worksheet-panel${isOpen ? " open" : ""}`}>
      <div className="compact-worksheet-header">
        <div className="compact-worksheet-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="compact-worksheet-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">
            {worksheetComplete ? "✓ Worksheet Complete" : "Practice Worksheet"}
          </span>
        </button>
        {!worksheetComplete && isOpen && (
          <span className="compact-worksheet-nav-hint">
            View circuit above - zoom & pan to inspect
          </span>
        )}
        {worksheetComplete && (
          <div className="compact-worksheet-actions">
            <button
              type="button"
              className="compact-worksheet-unlock-btn"
              onClick={onRequestUnlock}
            >
              Unlock & Edit Circuit
            </button>
            {onAdvance && (
              <button
                type="button"
                className="compact-worksheet-next-btn"
                onClick={onAdvance}
              >
                Next Problem
              </button>
            )}
          </div>
        )}
        {!worksheetComplete && onAdvance && (
          <div className="compact-worksheet-actions">
            <button
              type="button"
              className="compact-worksheet-next-btn skip-btn"
              onClick={onAdvance}
            >
              Skip to Next Problem
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="compact-worksheet-body">
          {!solution && (
            <div className="compact-worksheet-error" role="status">
              <h3>Practice data unavailable</h3>
              <p>We couldn't solve this worksheet. Try another practice preset.</p>
              {!solutionResult.ok && (
                <p className="compact-worksheet-error-detail">{solutionResult.error}</p>
              )}
            </div>
          )}
          {solution && (
            <>
          {/* Problem Header with Learning Objective and Inline Schematic */}
          <div className="compact-worksheet-problem-info">
            <div className="problem-overview-row">
              <div className="problem-description-column">
                <div className="problem-header-row">
                  <h3>{problem.title}</h3>
                  <span className="problem-difficulty" data-difficulty={problem.difficulty}>
                    {problem.difficulty}
                  </span>
                </div>
                {problem.learningObjective && (
                  <p className="learning-objective">{problem.learningObjective}</p>
                )}
                <p className="compact-worksheet-prompt">{problem.prompt}</p>

                {/* Givens Display */}
                {givensDisplay.length > 0 && (
                  <div className="givens-display">
                    <span className="givens-label">Given:</span>
                    {givensDisplay.map((given, index) => (
                      <span key={index} className="given-item">
                        {given.label} {given.metric} = {given.value}
                        {index < givensDisplay.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}

                <div className="compact-worksheet-target">
                  <strong>{problem.targetQuestion}</strong>
                  <span className="compact-worksheet-answer">
                    {worksheetComplete && Number.isFinite(targetValue)
                      ? formatMetricValue(targetValue as number, problem.targetMetric.key)
                      : "Complete worksheet to reveal"}
                  </span>
                </div>
              </div>

              {/* Inline Schematic Diagram - Always Visible */}
              <div className="problem-schematic-column">
                <CircuitDiagram problem={problem} />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="worksheet-tabs">
            <button
              type="button"
              className={`worksheet-tab${activeTab === "worksheet" ? " active" : ""}`}
              onClick={() => setActiveTab("worksheet")}
            >
              W.I.R.E. Table
            </button>
            <button
              type="button"
              className={`worksheet-tab${activeTab === "3dview" ? " active" : ""}`}
              onClick={() => setActiveTab("3dview")}
            >
              3D Circuit
            </button>
            <button
              type="button"
              className={`worksheet-tab${activeTab === "hints" ? " active" : ""}`}
              onClick={() => setActiveTab("hints")}
            >
              Hints & Tips
            </button>
            <button
              type="button"
              className={`worksheet-tab${activeTab === "formulas" ? " active" : ""}`}
              onClick={() => setActiveTab("formulas")}
            >
              W.I.R.E. Wheel
            </button>
          </div>

          {/* Tab Content */}
          <div className="worksheet-tab-content">
            {/* Worksheet Tab */}
            {activeTab === "worksheet" && (
              <div className="compact-worksheet-table-wrapper">
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
            )}

            {/* 3D Circuit View Tab */}
            {activeTab === "3dview" && (
              <div className="circuit-3d-tab-content">
                <div className="circuit-3d-header">
                  <h4>Circuit Components</h4>
                  <p className="circuit-3d-description">
                    Individual component previews. Use the full 3D circuit workspace above to see the connected circuit - you can zoom and pan to inspect it freely.
                  </p>
                </div>
                <div className="circuit-3d-grid">
                  {/* Source component */}
                  <div className="circuit-3d-card">
                    <div className="circuit-3d-viewer-container">
                      <Component3DViewer
                        componentType={problem.source.type || "battery"}
                        isRotating={true}
                      />
                    </div>
                    <div className="circuit-3d-label">
                      <span className="circuit-3d-name">{problem.source.label || "Source"}</span>
                      <span className="circuit-3d-type">{problem.source.type || "Battery"}</span>
                      {problem.source.givens?.voltage !== undefined && (
                        <span className="circuit-3d-value">
                          {formatMetricValue(problem.source.givens.voltage, "voltage")}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Other components */}
                  {problem.components.map((comp) => (
                    <div key={comp.id} className="circuit-3d-card">
                      <div className="circuit-3d-viewer-container">
                        <Component3DViewer
                          componentType={comp.type || "resistor"}
                          isRotating={true}
                        />
                      </div>
                      <div className="circuit-3d-label">
                        <span className="circuit-3d-name">{comp.label}</span>
                        <span className="circuit-3d-type">{comp.type || "Component"}</span>
                        {comp.givens?.resistance !== undefined && (
                          <span className="circuit-3d-value">
                            {formatMetricValue(comp.givens.resistance, "resistance")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hints Tab */}
            {activeTab === "hints" && (
              <div className="hints-tab-content">
                {problem.hints && problem.hints.length > 0 && (
                  <div className="hints-section">
                    <h4>Hints</h4>
                    <ul className="hints-list">
                      {problem.hints.map((hint, index) => (
                        <li key={index} className="hint-item">
                          <span className="hint-text">{hint.text}</span>
                          {hint.formula && (
                            <code className="hint-formula">{hint.formula}</code>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {problem.tips && problem.tips.length > 0 && (
                  <div className="tips-section">
                    <h4>Tips</h4>
                    <ul className="tips-list">
                      {problem.tips.map((tip, index) => (
                        <li key={index} className="tip-item">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {problem.facts && problem.facts.length > 0 && (
                  <div className="facts-section">
                    <h4>Did You Know?</h4>
                    <ul className="facts-list">
                      {problem.facts.map((fact, index) => (
                        <li key={index} className="fact-item">{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* W.I.R.E. Wheel Tab */}
            {activeTab === "formulas" && (
              <div className="formulas-tab-content">
                <div className="mini-wire-wheel">
                  <h4>W.I.R.E. Formula Wheel</h4>
                  <p className="wheel-intro">
                    Find the variable you need, then use a formula with values you know.
                  </p>
                  <div className="wire-wheel-grid">
                    {Object.entries(wireFormulas).map(([letter, data]) => (
                      <div key={letter} className="wire-quadrant" style={{ borderColor: data.color }}>
                        <span className="quadrant-letter" style={{ color: data.color }}>{letter}</span>
                        <ul className="quadrant-formulas">
                          {data.formulas.map((formula, index) => (
                            <li key={index} style={{ color: data.color }}>{formula}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="key-laws">
                  <div className="law-card">
                    <h5>Ohm's Law</h5>
                    <code>E = I × R</code>
                    <p>Voltage equals current times resistance</p>
                  </div>
                  <div className="law-card">
                    <h5>Power Formula</h5>
                    <code>P = E × I</code>
                    <p>Power equals voltage times current</p>
                  </div>
                  <div className="law-card">
                    <h5>Series Resistance</h5>
                    <code>R_T = R₁ + R₂ + R₃...</code>
                    <p>Total resistance is the sum of all resistors</p>
                  </div>
                  <div className="law-card">
                    <h5>Parallel Resistance</h5>
                    <code>1/R_T = 1/R₁ + 1/R₂...</code>
                    <p>Reciprocal sum for parallel circuits</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dismissable hint */}
          {!tipDismissed && (
            <div className="compact-worksheet-hint">
              <button
                type="button"
                className="hint-dismiss-btn"
                onClick={() => setTipDismissed(true)}
                aria-label="Dismiss tip"
              >
                ×
              </button>
              <p>
                <strong>Tip:</strong> Zoom and pan the 3D circuit above to inspect components while solving.
                Green cells are correct. Complete all cells to unlock editing.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )}
    </div>
  );
}
