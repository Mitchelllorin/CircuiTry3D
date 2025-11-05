import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/schematic.css";
import "../styles/practice.css";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
} from "../data/practiceProblems";
import type { PracticeProblem, PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue, formatNumber } from "../utils/electrical";
import { solvePracticeProblem, type SolveResult } from "../utils/practiceSolver";
import WireTable, {
  METRIC_ORDER,
  METRIC_PRECISION,
  type WireTableRow,
  type WorksheetEntry,
} from "../components/practice/WireTable";
import SolutionSteps from "../components/practice/SolutionSteps";
import { DEFAULT_SYMBOL_STANDARD, SYMBOL_STANDARD_OPTIONS, SymbolStandard } from "../schematic/standards";
import { COMPONENT_CATALOG } from "../schematic/catalog";
import PracticeViewport from "../components/schematic/PracticeViewport";
import BuilderWorkspace from "../components/schematic/BuilderWorkspace";
import ComponentDrawer from "../components/schematic/ComponentDrawer";

type TopologyInfo = {
  title: string;
  summary: string;
  bulletPoints: string[];
};

const TOPOLOGY_CONTENT: Record<PracticeTopology, TopologyInfo> = {
  series: {
    title: "Series Circuit",
    summary:
      "Single current path with elements chained end-to-end. Current is identical through every component while voltage divides proportionally to resistance.",
    bulletPoints: [
      "Current is constant at every point in the loop.",
      "Voltage drops add to the source voltage (Kirchhoff's Voltage Law).",
      "Equivalent resistance is the algebraic sum of individual resistances.",
    ],
  },
  parallel: {
    title: "Parallel Circuit",
    summary:
      "Multiple branches share the same voltage across each load. Total current equals the sum of branch currents, inversely related to branch resistances.",
    bulletPoints: [
      "Voltage across every branch equals the source voltage.",
      "Branch currents sum to the source current (Kirchhoff's Current Law).",
      "Equivalent resistance follows the reciprocal rule 1/Rₜ = Σ(1/Rᵢ).",
    ],
  },
  combination: {
    title: "Series-Parallel Combination",
    summary:
      "Series sections feed a parallel network before recombining. Total behaviour blends series voltage division with parallel current splitting.",
    bulletPoints: [
      "Identify series portions and solve sequentially for total resistance.",
      "At the parallel node, voltage is common while branch currents diverge.",
      "Recombine branch currents and continue series analysis back to the source.",
    ],
  },
};

const LEGEND_ITEMS = [
  {
    label: "Resistor",
    description:
      "Rendered with a 3D zig-zag symbol aligned to the connection axis and labelled R₁, R₂, R₃, etc.",
  },
  {
    label: "Battery",
    description:
      "Twin plates with the longer positive terminal and explicit + / − identifiers on the supply side.",
  },
  {
    label: "Node",
    description:
      "Glowing junction spheres emphasise connection points and branch nodes within the topology.",
  },
  {
    label: "Wire",
    description:
      "Cylindrical conductors follow the schematic path, hovering above the reference plane for clear depth separation.",
  },
];

const TOPOLOGY_ORDER: PracticeTopology[] = ["series", "parallel", "combination"];

const TOPOLOGY_LABEL: Record<PracticeTopology, string> = {
  series: "Series",
  parallel: "Parallel",
  combination: "Combination",
};

const DIFFICULTY_LABEL: Record<PracticeProblem["difficulty"], string> = {
  intro: "Intro",
  standard: "Standard",
  challenge: "Challenge",
};

type GroupedProblems = Record<PracticeTopology, PracticeProblem[]>;

type WorksheetState = Record<string, Record<WireMetricKey, WorksheetEntry>>;

const groupProblems = (problems: PracticeProblem[]): GroupedProblems =>
  problems.reduce<GroupedProblems>(
    (acc, problem) => {
      acc[problem.topology] = acc[problem.topology] || [];
      acc[problem.topology].push(problem);
      return acc;
    },
    { series: [], parallel: [], combination: [] }
  );

const ensureProblem = (problem: PracticeProblem | null): PracticeProblem => {
  if (problem) {
    return problem;
  }
  if (!DEFAULT_PRACTICE_PROBLEM) {
    throw new Error("No practice problems available");
  }
  return DEFAULT_PRACTICE_PROBLEM;
};

const resolveProblem = (id: string | null): PracticeProblem => ensureProblem(findPracticeProblemById(id));

const buildTableRows = (problem: PracticeProblem, solution: SolveResult): WireTableRow[] => {
  const componentRows = problem.components.map((component) => ({
    id: component.id,
    label: component.label,
    role: "load" as const,
    givens: component.givens,
    metrics: solution.components[component.id],
  }));

  return [
    {
      id: problem.source.id,
      label: problem.source.label,
      role: "source" as const,
      givens: problem.source.givens,
      metrics: solution.source,
    },
    ...componentRows,
    {
      id: "totals",
      label: "Circuit Totals",
      role: "total" as const,
      givens: problem.totalsGivens,
      metrics: solution.totals,
    },
  ];
};

const resolveTarget = (problem: PracticeProblem, solution: SolveResult) => {
  const { componentId, key } = problem.targetMetric;

  if (componentId === "totals") {
    return solution.totals[key];
  }

  if (componentId === "source" || componentId === problem.source.id) {
    return solution.source[key];
  }

  return solution.components[componentId]?.[key];
};

const parseMetricInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const numericMatch = trimmed.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (numericMatch) {
    const candidate = Number(numericMatch[0]);
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  const fallback = Number(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
};

const withinTolerance = (expected: number, actual: number, tolerance = 0.01): boolean => {
  const absoluteExpected = Math.abs(expected);
  const absoluteDiff = Math.abs(expected - actual);

  if (absoluteExpected < 1e-4) {
    return absoluteDiff <= 1e-3;
  }

  return absoluteDiff / absoluteExpected <= tolerance;
};

const formatSeedValue = (value: number, key: WireMetricKey) => formatNumber(value, METRIC_PRECISION[key]);


type ViewMode = "practice" | "builder";

const MODE_SUMMARY: Record<ViewMode, string> = {
  practice:
    "Load practice presets, manipulate the W.I.R.E. worksheet, and see the schematic rendered as floating 3D symbols.",
  builder:
    "Assemble custom DC circuits by placing components from the catalog onto a snap-to-grid board.",
};

const MODE_TABS: { key: ViewMode; label: string }[] = [
  { key: "practice", label: "Practice Presets" },
  { key: "builder", label: "Custom Builder" },
];

export default function SchematicMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("practice");
  const [symbolStandard, setSymbolStandard] = useState<SymbolStandard>(DEFAULT_SYMBOL_STANDARD);

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Mode</h1>
          <p>{MODE_SUMMARY[viewMode]}</p>
        </div>
        <div className="schematic-controls">
          <div className="schematic-mode-toggle" role="tablist" aria-label="Schematic mode selector">
            {MODE_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={viewMode === key}
                className={viewMode === key ? "schematic-toggle is-active" : "schematic-toggle"}
                onClick={() => setViewMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="schematic-standard-control" role="group" aria-label="Schematic symbol standard">
            <span className="schematic-standard-label">Symbol Standard</span>
            <div className="schematic-standard-buttons">
              {SYMBOL_STANDARD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={
                    symbolStandard === option.key
                      ? "schematic-standard-button is-active"
                      : "schematic-standard-button"
                  }
                  title={option.description}
                  onClick={() => setSymbolStandard(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {viewMode === "practice" ? (
        <PracticeModeView symbolStandard={symbolStandard} />
      ) : (
        <BuilderWorkspace symbolStandard={symbolStandard} />
      )}
    </div>
  );
}

function PracticeModeView({ symbolStandard }: { symbolStandard: SymbolStandard }) {
  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const fallbackProblemId = practiceProblems[0]?.id ?? null;

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(fallbackProblemId);
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>({});
  const [worksheetComplete, setWorksheetComplete] = useState(false);
  const [catalogSelection, setCatalogSelection] = useState<string | null>(COMPONENT_CATALOG[0]?.id ?? null);

  const selectedProblem = useMemo(() => resolveProblem(selectedProblemId), [selectedProblemId]);
  const solution = useMemo(() => solvePracticeProblem(selectedProblem), [selectedProblem]);
  const tableRows = useMemo(
    () => buildTableRows(selectedProblem, solution),
    [selectedProblem, solution]
  );
  const stepPresentations = useMemo(
    () => selectedProblem.steps.map((step) => step(solution.stepContext)),
    [selectedProblem, solution]
  );
  const selectedCatalogEntry = useMemo(
    () => COMPONENT_CATALOG.find((entry) => entry.id === catalogSelection) ?? null,
    [catalogSelection]
  );

  const expectedValues = useMemo(() => {
    const map: Record<string, Record<WireMetricKey, number>> = {};

    tableRows.forEach((row) => {
      map[row.id] = {
        watts: row.metrics.watts,
        current: row.metrics.current,
        resistance: row.metrics.resistance,
        voltage: row.metrics.voltage,
      };
    });

    return map;
  }, [tableRows]);

  const baselineWorksheet = useMemo(() => {
    const baseline: WorksheetState = {};

    tableRows.forEach((row) => {
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
  }, [expectedValues, tableRows]);

  useEffect(() => {
    setWorksheetEntries(baselineWorksheet);
    setWorksheetComplete(false);
    setTableRevealed(false);
    setStepsVisible(false);
    setAnswerRevealed(false);
  }, [baselineWorksheet, selectedProblem.id]);

  useEffect(() => {
    if (worksheetComplete && !answerRevealed) {
      setAnswerRevealed(true);
    }
  }, [worksheetComplete, answerRevealed]);

  const targetValue = resolveTarget(selectedProblem, solution);

  const highlightRowId = (() => {
    const id = selectedProblem.targetMetric.componentId;
    if (id === "source") {
      return selectedProblem.source.id;
    }
    return id;
  })();

  const highlightKey = selectedProblem.targetMetric.key as WireMetricKey;

  const computeWorksheetComplete = (state: WorksheetState) =>
    tableRows.every((row) =>
      METRIC_ORDER.every((metric) => {
        const cell = state[row.id]?.[metric];
        if (!cell || cell.given) {
          return true;
        }
        return cell.status === "correct";
      })
    );

  const handleWorksheetChange = (rowId: string, key: WireMetricKey, raw: string) => {
    setWorksheetEntries((prev) => {
      const next: WorksheetState = { ...prev };
      const previousRow = prev[rowId] ?? {};
      const row: Record<WireMetricKey, WorksheetEntry> = {
        ...previousRow,
      } as Record<WireMetricKey, WorksheetEntry>;

      const matchingRow = tableRows.find((entry) => entry.id === rowId);
      const givenFromRow =
        typeof matchingRow?.givens?.[key] === "number" && Number.isFinite(matchingRow.givens[key]);

      if (givenFromRow) {
        return prev;
      }

      const baseCell: WorksheetEntry = row[key] ?? {
        raw: "",
        value: null,
        status: "blank",
        given: false,
      };

      if (baseCell.given) {
        return prev;
      }

      const parsed = parseMetricInput(raw);
      const expected = expectedValues[rowId]?.[key];

      let status: WorksheetEntry["status"] = "blank";
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

      row[key] = {
        raw,
        value,
        status,
        given: baseCell.given,
      };

      next[rowId] = row;

      const complete = computeWorksheetComplete(next);
      setWorksheetComplete(complete);

      return next;
    });
  };

  const advanceToNextProblem = () => {
    const bucket = grouped[selectedProblem.topology] ?? practiceProblems;
    const currentIndex = bucket.findIndex((problem) => problem.id === selectedProblem.id);
    const nextProblem =
      (currentIndex >= 0 && bucket[(currentIndex + 1) % bucket.length]) || practiceProblems[0] || null;

    if (nextProblem) {
      setSelectedProblemId(nextProblem.id);
    }
  };

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Mode</h1>
          <p>
            Load practice presets, manipulate the W.I.R.E. worksheet, and see the schematic rendered as floating 3D symbols.
            Each preset mirrors the classic practice mode but presents the circuit in a playful spatial scene.
          </p>
        </div>
      </header>

      <div className="schematic-body">
        <aside className="schematic-sidebar" aria-label="Practice preset selection">
          <h2>Practice Presets</h2>
          {TOPOLOGY_ORDER.map((topology) => {
            const bucket = grouped[topology];
            if (!bucket.length) {
              return null;
            }
            return (
              <section key={topology} className="schematic-problem-group">
                <h3>{TOPOLOGY_LABEL[topology]}</h3>
                <div className="problem-list">
                  {bucket.map((problem) => (
                    <button
                      key={problem.id}
                      type="button"
                      className="problem-button"
                      data-active={problem.id === selectedProblem.id ? "true" : undefined}
                      onClick={() => setSelectedProblemId(problem.id)}
                    >
                      <strong>{problem.title}</strong>
                      <small>
                        {TOPOLOGY_LABEL[problem.topology]} · {DIFFICULTY_LABEL[problem.difficulty]}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </aside>

        <section className="schematic-main" aria-live="polite">
          <header className="schematic-main-header">
            <div>
              <h2>{selectedProblem.title}</h2>
              <div className="schematic-meta">
                <span className="difficulty-pill">{DIFFICULTY_LABEL[selectedProblem.difficulty]}</span>
                <span className="schematic-chip">{TOPOLOGY_LABEL[selectedProblem.topology]}</span>
                {selectedProblem.conceptTags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="schematic-stage">
            <ComponentDrawer
              entries={COMPONENT_CATALOG}
              selectedId={catalogSelection}
              onSelect={(entry) => setCatalogSelection(entry.id)}
              placement="left"
              defaultOpen
            />
            <PracticeViewport problem={selectedProblem} symbolStandard={symbolStandard} />
          </div>

          <div className="schematic-main-grid">
            <article className="schematic-card">
              <h3>Practice Prompt</h3>
              <p>{selectedProblem.prompt}</p>
            </article>
            <article className="schematic-card target-card">
              <h3>Target Metric</h3>
              <p className="target-question">{selectedProblem.targetQuestion}</p>
              <div className="target-answer" aria-live="polite">
                {answerRevealed && Number.isFinite(targetValue) ? (
                  <strong>
                    {formatMetricValue(targetValue as number, selectedProblem.targetMetric.key)}
                  </strong>
                ) : (
                  <span>Reveal the answer once your worksheet is complete.</span>
                )}
              </div>
              <button
                type="button"
                className="target-toggle"
                onClick={() => setAnswerRevealed((value) => !value)}
              >
                {answerRevealed ? "Hide Final Answer" : "Reveal Final Answer"}
              </button>
            </article>
            <article className="schematic-card">
              <h3>{TOPOLOGY_CONTENT[selectedProblem.topology].title}</h3>
              <p>{TOPOLOGY_CONTENT[selectedProblem.topology].summary}</p>
              <ul>
                {TOPOLOGY_CONTENT[selectedProblem.topology].bulletPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
            <article className="schematic-card">
              <h3>Component Library</h3>
              {selectedCatalogEntry ? (
                <div className="schematic-component-summary">
                  <strong>{selectedCatalogEntry.name}</strong>
                  <p>{selectedCatalogEntry.description}</p>
                  {selectedCatalogEntry.tags?.length ? (
                    <div className="schematic-component-tags">
                      {selectedCatalogEntry.tags.map((tag) => (
                        <span key={tag} className="schematic-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p>Select a component from the drawer to review its symbol notes.</p>
              )}
            </article>
          </div>
        </section>

        <aside className="schematic-panel">
          <div className="worksheet-controls">
            <button type="button" onClick={() => setTableRevealed((value) => !value)}>
              {tableRevealed ? "Hide Worksheet Answers" : "Reveal Worksheet"}
            </button>
            <button type="button" onClick={() => setStepsVisible((value) => !value)}>
              {stepsVisible ? "Hide Steps" : "Show Solving Steps"}
            </button>
            <button
              type="button"
              onClick={advanceToNextProblem}
              disabled={!worksheetComplete}
              className="next-problem"
            >
              {worksheetComplete ? "Next Problem" : "Solve to Unlock Next"}
            </button>
          </div>

          <div
            className="worksheet-status-banner"
            role="status"
            aria-live="polite"
            data-complete={worksheetComplete ? "true" : undefined}
          >
            <div className="worksheet-status-header">
              <strong>{worksheetComplete ? "Worksheet Complete" : "Fill the W.I.R.E. table"}</strong>
            </div>
            <span>
              {worksheetComplete
                ? "Every unknown matches the solved circuit. Advance when you're ready."
                : "Enter the missing watts, amps, ohms, and volts using the 3D schematic as your guide."}
            </span>
          </div>

          <div className="worksheet-sync" role="status" aria-live="polite">
            <strong>Synced to schematic</strong>
            <span>
              {`Preset givens from ${selectedProblem.title} are locked in. Update only the unknowns and compare against the 3D layout.`}
            </span>
          </div>

          <div className="schematic-worksheet-wrapper">
            <WireTable
              rows={tableRows}
              revealAll={tableRevealed}
              highlight={{ rowId: highlightRowId, key: highlightKey }}
              entries={worksheetEntries}
              onChange={handleWorksheetChange}
            />
          </div>

          <SolutionSteps steps={stepPresentations} visible={stepsVisible} />

          <aside className="schematic-legend">
            <h3>Symbol Legend</h3>
            <ul>
              {LEGEND_ITEMS.map((item) => (
                <li key={item.label}>
                  <span className="legend-term">{item.label}</span>
                  <span className="legend-desc">{item.description}</span>
                </li>
              ))}
            </ul>
          </aside>
        </aside>
      </div>
    </div>
  );
}


