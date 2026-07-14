import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/schematic.css";
import "../styles/practice.css";
import {
  isMobile,
  getMobileRendererOptions,
  getMobilePixelRatio,
  getMobileShadowSettings,
  getTargetFrameRate,
} from "../utils/mobilePerformance";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
} from "../data/practiceProblems";
import type { PracticeProblem, PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue, formatNumber } from "../utils/electrical";
import { trySolvePracticeProblem, type SolveAttempt, type SolveResult } from "../utils/practiceSolver";
import { parseResistanceOhms, solveDCCircuit } from "../sim/dcSolver";
import WireTable, {
  METRIC_ORDER,
  METRIC_PRECISION,
  type WireTableRow,
  type WorksheetEntry,
} from "../components/practice/WireTable";
import SolutionSteps from "../components/practice/SolutionSteps";
import ComponentRenderDrawer from "../components/schematic/ComponentRenderDrawer";
import { COMPONENT_CATALOG } from "../schematic/catalog";
import {
  CatalogEntry,
  GroundElement,
  Orientation,
  SchematicStandard,
  SchematicElement,
  SymbolStandard,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../schematic/threeFactory";
import { loadThree } from "../schematic/threeLoader";

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
      "Current is constant at every point in the circuit.",
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
    description: "Classical zig-zag resistor symbol labelled R₁, R₂, R₃, etc.",
  },
  {
    label: "Battery",
    description: "Long and short plates indicating the + and - terminals of the source.",
  },
  {
    label: "Node",
    description: "Filled connection dots marking junctions and branch points.",
  },
  {
    label: "Wire",
    description: "Straight conductive segments following the diagram path.",
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
    { series: [], parallel: [], combination: [] },
  );

const ensureProblem = (problem: PracticeProblem | null): PracticeProblem | null => {
  if (problem) {
    return problem;
  }
  if (!DEFAULT_PRACTICE_PROBLEM) {
    return null;
  }
  return DEFAULT_PRACTICE_PROBLEM;
};

const resolveProblem = (id: string | null): PracticeProblem | null => ensureProblem(findPracticeProblemById(id));

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

type PlacementDraft = {
  mode: "two-point";
  entry: CatalogEntry;
  start: Vec2;
  current: Vec2;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snapValue = (value: number, step = SNAP_STEP) => Math.round(value / step) * step;

const clampPoint = (point: Vec2): Vec2 => ({
  x: clampValue(snapValue(point.x), BOARD_LIMITS.minX, BOARD_LIMITS.maxX),
  z: clampValue(snapValue(point.z), BOARD_LIMITS.minZ, BOARD_LIMITS.maxZ),
});

const resolveAxisPlacement = (start: Vec2, target: Vec2) => {
  const snappedStart = clampPoint(start);
  const snappedTarget = clampPoint(target);
  const dx = Math.abs(snappedTarget.x - snappedStart.x);
  const dz = Math.abs(snappedTarget.z - snappedStart.z);
  if (dx >= dz) {
    const end: Vec2 = { x: snappedTarget.x, z: snappedStart.z };
    return {
      start: snappedStart,
      end,
      orientation: "horizontal" as Orientation,
      length: Math.abs(end.x - snappedStart.x),
    };
  }
  const end: Vec2 = { x: snappedStart.x, z: snappedTarget.z };
  return {
    start: snappedStart,
    end,
    orientation: "vertical" as Orientation,
    length: Math.abs(end.z - snappedStart.z),
  };
};

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `element-${Math.random().toString(36).slice(2, 10)}`;

const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

const formatPoint = (point: Vec2) => `(${point.x.toFixed(1)}, ${point.z.toFixed(1)})`;

type ViewMode = "practice" | "builder";

const MODE_SUMMARY: Record<ViewMode, string> = {
  practice:
    "Load practice presets, work the W.I.R.E. worksheet, and study the circuit drawn with canonical 2D schematic symbols.",
  builder:
    "Assemble custom DC circuits by placing standard symbols from the catalog onto a snap-to-grid board.",
};

const MODE_TABS: { key: ViewMode; label: string }[] = [
  { key: "practice", label: "Practice Presets" },
  { key: "builder", label: "Custom Builder" },
];

const STANDARD_LABELS: Record<SchematicStandard, string> = {
  ansi: "ANSI",
  ieee: "IEEE",
  iec: "IEC",
};

export default function SchematicMode() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialId, setDrawerInitialId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("practice");
  const [standard, setStandard] = useState<SchematicStandard>("ansi");

  const handleShowCatalog = useCallback((componentId?: string) => {
    setDrawerInitialId(componentId ?? null);
    setDrawerOpen(true);
  }, []);

  const handleCloseCatalog = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <div className="schematic-shell">
      <ComponentRenderDrawer open={drawerOpen} onClose={handleCloseCatalog} initialComponentId={drawerInitialId} />
      <header className="schematic-header">
        <div>
          <h1>Schematic Mode</h1>
          <p>{MODE_SUMMARY[viewMode]}</p>
        </div>
        <div className="schematic-header-actions">
          <button
            type="button"
            className="schematic-drawer-trigger"
            onClick={() => handleShowCatalog()}
          >
            Browse 3D Catalog
          </button>
          <div className="schematic-controls" role="tablist" aria-label="Schematic mode selector">
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
        </div>
      </header>

      {viewMode === "practice" ? (
        <PracticeModeView onShowCatalog={handleShowCatalog} />
      ) : (
        <BuilderModeView onShowCatalog={handleShowCatalog} />
      )}
    </div>
  );
}

type CatalogOpener = (componentId?: string) => void;

function PracticeModeView({ onShowCatalog }: { onShowCatalog: CatalogOpener }) {
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
  const solutionResult = useMemo((): SolveAttempt => {
    if (!selectedProblem) {
      return { ok: false, error: "No practice problems available" };
    }
    return trySolvePracticeProblem(selectedProblem);
  }, [selectedProblem]);
  const solution = solutionResult.ok ? solutionResult.data : null;
  const tableRows = useMemo(
    () => buildTableRows(selectedProblem, solution),
    [selectedProblem, solution],
  );
  const stepPresentations = useMemo(
    () => selectedProblem.steps.map((step) => step(solution.stepContext)),
    [selectedProblem, solution],
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
    // Wrap worksheet and UI state resets in startTransition to prevent blocking the 3D viewport render
    // This fixes flickering/glitching when switching to parallel circuits
    startTransition(() => {
      setWorksheetEntries(baselineWorksheet);
      setWorksheetComplete(false);
      setTableRevealed(false);
      setStepsVisible(false);
      setAnswerRevealed(false);
    });
  }, [baselineWorksheet, selectedProblem.id]);

  useEffect(() => {
    if (worksheetComplete && !answerRevealed) {
      startTransition(() => {
        setAnswerRevealed(true);
      });
    }
  }, [worksheetComplete, answerRevealed]);

  const targetValue = selectedProblem && solution ? resolveTarget(selectedProblem, solution) : null;

  const highlightRowId = (() => {
    if (!selectedProblem) {
      return null;
    }
    const id = selectedProblem.targetMetric.componentId;
    if (id === "source") {
      return selectedProblem.source.id;
    }
    return id;
  })();

  const highlightKey = selectedProblem ? (selectedProblem.targetMetric.key as WireMetricKey) : null;

  const computeWorksheetComplete = (state: WorksheetState) =>
    tableRows.every((row) =>
      METRIC_ORDER.every((metric) => {
        const cell = state[row.id]?.[metric];
        if (!cell || cell.given) {
          return true;
        }
        return cell.status === "correct";
      }),
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
    if (!selectedProblem) {
      return;
    }
    const bucket = grouped[selectedProblem.topology] ?? practiceProblems;
    const currentIndex = bucket.findIndex((problem) => problem.id === selectedProblem.id);
    const nextProblem =
      (currentIndex >= 0 && bucket[(currentIndex + 1) % bucket.length]) || practiceProblems[0] || null;

    if (nextProblem) {
      setSelectedProblemId(nextProblem.id);
    }
  };

  if (!selectedProblem || !solution) {
    return (
      <div className="schematic-shell">
        <header className="schematic-header">
          <div>
            <h1>3D Schematic Mode</h1>
            <p>Practice presets are unavailable right now.</p>
          </div>
        </header>
        <div className="schematic-body">
          <p className="schematic-empty">
            {solutionResult.ok ? "No practice problems are available." : solutionResult.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>Schematic Mode</h1>
          <p>
            Load practice presets, manipulate the W.I.R.E. worksheet, and review the circuit rendered with textbook 2D schematic symbols.
            Each preset mirrors the classic practice mode while preserving authoritative diagram conventions.
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
            <PracticeViewport problem={selectedProblem} />
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
                  <strong>{formatMetricValue(targetValue as number, selectedProblem.targetMetric.key)}</strong>
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
          <div className="schematic-panel-callout">
            <div>
              <strong>Explore 3D components</strong>
              <p>Open the render drawer to inspect every schematic element up close.</p>
            </div>
            <button type="button" className="schematic-secondary" onClick={() => onShowCatalog()}>
              Open Drawer
            </button>
          </div>

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
                : "Enter the missing watts, amps, ohms, and volts using the 2D schematic as your guide."}
            </span>
          </div>

          <div className="worksheet-sync" role="status" aria-live="polite">
            <strong>Synced to schematic</strong>
            <span>
              {`Preset givens from ${selectedProblem.title} are locked in. Update only the unknowns and compare against the 2D layout.`}
            </span>
          </div>

          <div className="schematic-worksheet-wrapper">
            <WireTable
              rows={tableRows}
              revealAll={tableRevealed}
              highlight={
                highlightRowId && highlightKey
                  ? { rowId: highlightRowId, key: highlightKey }
                  : undefined
              }
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

function BuilderModeView({ onShowCatalog }: { onShowCatalog: CatalogOpener }) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(COMPONENT_CATALOG[0]?.id ?? "");
  const [elements, setElements] = useState<SchematicElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlacementDraft | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [labelCounters, setLabelCounters] = useState<Record<string, number>>({});
  const [singleNodeOrientation, setSingleNodeOrientation] = useState<Orientation>("horizontal");
  const [symbolStandard, setSymbolStandard] = useState<SymbolStandard>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SYMBOL_STANDARD;
    }
    const stored = window.localStorage.getItem("schematic.symbolStandard");
    return isSymbolStandard(stored) ? stored : DEFAULT_SYMBOL_STANDARD;
  });

  const selectedCatalogEntry = useMemo(() => {
    const entry = COMPONENT_CATALOG.find((item) => item.id === selectedCatalogId);
    return entry ?? COMPONENT_CATALOG[0];
  }, [selectedCatalogId]);

  const standardMeta = useMemo(
    () => SYMBOL_STANDARD_OPTIONS.find((option) => option.value === symbolStandard),
    [symbolStandard]
  );

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedElementId) ?? null,
    [elements, selectedElementId],
  );

  const instructions = draft
    ? `Move the cursor to set the ${draft.entry.name.toLowerCase()} span, then click to confirm placement.`
    : `Click on the board to place a ${selectedCatalogEntry.name.toLowerCase()}.`;

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedbackMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedbackMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("schematic.symbolStandard", symbolStandard);
  }, [symbolStandard]);

  const handleStandardChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      if (isSymbolStandard(next)) {
        setSymbolStandard(next);
      }
    },
    []
  );

  const handleCatalogSelect = useCallback((entry: CatalogEntry) => {
    setSelectedCatalogId(entry.id);
    setDraft(null);
    setSelectedElementId(null);
    setFeedbackMessage(`${entry.name} ready for placement.`);
  }, []);

  const handleBoardHover = useCallback((point: Vec2 | null) => {
    if (!point) {
      setHoverPoint(null);
      return;
    }
    const snapped = clampPoint(point);
    setHoverPoint(snapped);
    setDraft((prev) => (prev ? { ...prev, current: snapped } : prev));
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (!selectedElementId) {
      return;
    }
    setElements((prev) => prev.filter((element) => element.id !== selectedElementId));
    setSelectedElementId(null);
    setFeedbackMessage("Selected component removed.");
  }, [selectedElementId]);

  const handleClearBoard = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
    setDraft(null);
    setLabelCounters({});
    setFeedbackMessage("Board cleared.");
  }, []);

  const toggleSingleNodeOrientation = useCallback(() => {
    setSingleNodeOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedElementId) {
        event.preventDefault();
        handleRemoveSelected();
      }
      if (event.key === "Escape") {
        setDraft(null);
        setSelectedElementId(null);
        setFeedbackMessage("Placement cancelled.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, handleRemoveSelected]);

  const handleBoardClick = useCallback(
    (point: Vec2) => {
      const entry = selectedCatalogEntry;
      if (!entry) {
        return;
      }

      const snapped = clampPoint(point);

      if (entry.placement === "single-point") {
        const newElement: GroundElement = {
          id: createId(),
          kind: "ground",
          position: snapped,
          orientation: singleNodeOrientation,
        };
        setElements((prev) => [...prev, newElement]);
        setSelectedElementId(newElement.id);
        setFeedbackMessage(`${entry.name} placed ${formatPoint(snapped)}.`);
        return;
      }

      if (!draft || draft.entry.id !== entry.id) {
        setDraft({ mode: "two-point", entry, start: snapped, current: snapped });
        setSelectedElementId(null);
        setFeedbackMessage("Anchor set. Choose a second point to complete placement.");
        return;
      }

      const resolved = resolveAxisPlacement(draft.start, snapped);
      if (resolved.length < MIN_SEGMENT_LENGTH) {
        setFeedbackMessage("Segment too short. Extend the component before placing.");
        return;
      }

      if (entry.kind === "wire") {
        const newWire: WireElement = {
          id: createId(),
          kind: "wire",
          path: [resolved.start, resolved.end],
        };
        setElements((prev) => [...prev, newWire]);
        setSelectedElementId(newWire.id);
        setFeedbackMessage("Wire segment placed.");
      } else {
        const prefix = entry.defaultLabelPrefix;
        let label = entry.name;
        if (prefix) {
          const nextIndex = (labelCounters[prefix] ?? 0) + 1;
          label = `${prefix}${nextIndex}`;
          setLabelCounters((prev) => ({
            ...prev,
            [prefix]: nextIndex,
          }));
        }

        const newComponent: TwoTerminalElement = {
          id: createId(),
          kind: entry.kind as TwoTerminalElement["kind"],
          label,
          start: resolved.start,
          end: resolved.end,
          orientation: resolved.orientation,
        };
        setElements((prev) => [...prev, newComponent]);
        setSelectedElementId(newComponent.id);
        setFeedbackMessage(
          `${entry.name} placed ${formatPoint(resolved.start)} → ${formatPoint(resolved.end)}.`,
        );
      }

      setDraft(null);
    },
    [selectedCatalogEntry, draft, labelCounters, singleNodeOrientation],
  );

  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
    setDraft(null);
    setFeedbackMessage("Component selected.");
  }, []);

  const previewElement = useMemo<SchematicElement | null>(() => {
    if (!draft) {
      return null;
    }
    const resolved = resolveAxisPlacement(draft.start, draft.current);
    if (resolved.length < MIN_SEGMENT_LENGTH) {
      return null;
    }

    if (draft.entry.kind === "wire") {
      return {
        id: "preview-wire",
        kind: "wire",
        path: [resolved.start, resolved.end],
      } satisfies WireElement;
    }

    const prefix = draft.entry.defaultLabelPrefix;
    const suggestion = prefix ? `${prefix}${(labelCounters[prefix] ?? 0) + 1}` : draft.entry.name;

    return {
      id: "preview-component",
      kind: draft.entry.kind as TwoTerminalElement["kind"],
      label: suggestion,
      start: resolved.start,
      end: resolved.end,
      orientation: resolved.orientation,
    } satisfies TwoTerminalElement;
  }, [draft, labelCounters]);

  const elementSummaries = useMemo(
    () =>
      elements.map((element) => {
        if (element.kind === "wire") {
          const wire = element as WireElement;
          return {
            id: element.id,
            title: "Wire",
            detail: `${formatPoint(wire.path[0])} → ${formatPoint(wire.path[wire.path.length - 1])}`,
          };
        }
        if (element.kind === "ground") {
          const ground = element as GroundElement;
          return {
            id: element.id,
            title: "Ground",
            detail: `${formatPoint(ground.position)} · ${ground.orientation}`,
          };
        }
        const component = element as TwoTerminalElement;
        return {
          id: element.id,
          title: component.label,
          detail: `${formatPoint(component.start)} → ${formatPoint(component.end)}`,
        };
      }),
    [elements],
  );

  return (
    <div className="schematic-workspace builder-mode">
      <section className="schematic-stage" aria-live="polite">
        <BuilderViewport
          elements={elements}
          previewElement={previewElement}
          selectedElementId={selectedElementId}
          draftAnchor={draft ? draft.start : null}
          hoverPoint={hoverPoint}
          symbolStandard={symbolStandard}
          onBoardPointClick={handleBoardClick}
          onBoardPointMove={handleBoardHover}
          onElementClick={handleElementClick}
        />
        <div className="schematic-overlay">
          <div className="schematic-instructions">{instructions}</div>
          <div className="schematic-readout">
            <span>Snapped: {hoverPoint ? formatPoint(hoverPoint) : "—"}</span>
            <span>Tool: {selectedCatalogEntry.name}</span>
          </div>
          {feedbackMessage && <div className="schematic-feedback">{feedbackMessage}</div>}
        </div>
        </section>

        <aside className="schematic-sidebar">
        <div className="schematic-catalog">
          <div className="schematic-catalog-header">
            <h2>Component Catalog</h2>
            <button
              type="button"
              className="schematic-catalog-drawer"
              onClick={() => onShowCatalog(selectedCatalogId)}
            >
              3D Drawer
            </button>
          </div>
          <div className="catalog-grid" role="list">
            {COMPONENT_CATALOG.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="listitem"
                className={entry.id === selectedCatalogEntry.id ? "catalog-entry is-selected" : "catalog-entry"}
                onClick={() => handleCatalogSelect(entry)}
              >
                <span className="catalog-icon">{entry.icon}</span>
                <span className="catalog-name">{entry.name}</span>
                <span className="catalog-desc">{entry.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="schematic-panel">
          <div className="schematic-panel-section">
            <h3>Board Controls</h3>
            <div className="schematic-actions">
              <button type="button" onClick={handleClearBoard} disabled={!elements.length}>
                Clear Board
              </button>
              <button type="button" onClick={handleRemoveSelected} disabled={!selectedElementId}>
                Remove Selected
              </button>
              <button type="button" onClick={toggleSingleNodeOrientation} className="schematic-secondary">
                Rotate Ground ({singleNodeOrientation === "horizontal" ? "⇔" : "⇕"})
              </button>
            </div>
          </div>

          <div className="schematic-panel-section">
            <h3>Symbol Standard</h3>
            <p className="schematic-panel-description">
              {standardMeta?.description ?? "Select the symbol library to mirror your documentation standard."}
            </p>
            <select
              aria-label="Symbol standard"
              className="schematic-standard-select"
              value={symbolStandard}
              onChange={handleStandardChange}
            >
              {SYMBOL_STANDARD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {standardMeta?.references?.length ? (
              <p className="schematic-panel-footnote">
                Standards: {standardMeta.references.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="schematic-panel-section">
            <h3>Selection</h3>
            {selectedElement ? (
              <ul className="schematic-selection">
                {selectedElement.kind === "ground" ? (
                  <>
                    <li>Kind: Ground</li>
                    <li>Position: {formatPoint((selectedElement as GroundElement).position)}</li>
                    <li>Orientation: {(selectedElement as GroundElement).orientation}</li>
                  </>
                ) : selectedElement.kind === "wire" ? (
                  <>
                    <li>Kind: Wire</li>
                    <li>
                      Path: {formatPoint((selectedElement as WireElement).path[0])} →
                      {formatPoint(
                        (selectedElement as WireElement).path[(selectedElement as WireElement).path.length - 1],
                      )}
                    </li>
                  </>
                ) : (
                  <>
                    <li>Label: {(selectedElement as TwoTerminalElement).label}</li>
                    <li>
                      Span: {formatPoint((selectedElement as TwoTerminalElement).start)} →
                      {formatPoint((selectedElement as TwoTerminalElement).end)}
                    </li>
                    <li>Orientation: {(selectedElement as TwoTerminalElement).orientation}</li>
                  </>
                )}
              </ul>
            ) : (
              <p className="schematic-empty">No component selected.</p>
            )}
          </div>

          <div className="schematic-panel-section">
            <h3>Placed Components</h3>
            {elements.length === 0 ? (
              <p className="schematic-empty">Board is empty. Start by placing a component.</p>
            ) : (
              <ul className="schematic-element-list">
                {elementSummaries.map((element) => (
                  <li key={element.id}>
                    <button
                      type="button"
                      className={element.id === selectedElementId ? "element-button is-selected" : "element-button"}
                      onClick={() => setSelectedElementId(element.id)}
                    >
                      <span className="element-title">{element.title}</span>
                      <span className="element-detail">{element.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </aside>
      </div>
    );
}

type BuilderViewportProps = {
  elements: SchematicElement[];
  previewElement: SchematicElement | null;
  selectedElementId: string | null;
  draftAnchor: Vec2 | null;
  hoverPoint: Vec2 | null;
  onBoardPointClick: (point: Vec2) => void;
  onBoardPointMove: (point: Vec2 | null) => void;
  onElementClick: (elementId: string) => void;
};

function BuilderViewport({
  elements,
  previewElement,
  selectedElementId,
  draftAnchor,
  hoverPoint,
  symbolStandard,
  onBoardPointClick,
  onBoardPointMove,
  onElementClick,
  standard,
}: BuilderViewportProps) {
  const resolvePointer = useCallback((event: React.PointerEvent<SVGSVGElement>): Vec2 | null => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const localX = ((event.clientX - rect.left) / rect.width) * BOARD_VIEWBOX.width;
    const localY = ((event.clientY - rect.top) / rect.height) * BOARD_VIEWBOX.height;
    return svgPointToWorld(localX, localY);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const world = resolvePointer(event);
      onBoardPointMove(world);
    },
    [onBoardPointMove, resolvePointer],
  );

  const handlePointerLeave = useCallback(() => {
    onBoardPointMove(null);
  }, [onBoardPointMove]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return;
      }
      const world = resolvePointer(event);
      if (world) {
        onBoardPointClick(world);
      }
    },
    [onBoardPointClick, resolvePointer],
  );

  const handleElementPointerDown = useCallback(
    (_event: React.PointerEvent<SVGElement>, elementId: string) => {
      onElementClick(elementId);
    },
    [onElementClick],
  );

  return (
    <div className="schematic-viewport">
      <div className="schematic-canvas">
        <SchematicSvg
          elements={elements}
          previewElement={previewElement ?? undefined}
          selectedElementId={selectedElementId ?? undefined}
          draftAnchor={draftAnchor ?? undefined}
          hoverPoint={hoverPoint ?? undefined}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onElementPointerDown={handleElementPointerDown}
        />
      </div>
    </div>
  );
}

type PracticeViewportProps = {
  problem: PracticeProblem;
  standard: SchematicStandard;
};

function PracticeViewport({ problem }: PracticeViewportProps) {
  const elements = useMemo(() => createPresetElements(problem), [problem]);

  useEffect(() => {
    if (applyProblemRef.current) {
      applyProblemRef.current(problemRef.current);
    }
  }, [standard]);

  return (
    <div className="schematic-viewport">
      <div className="schematic-canvas">
        <SchematicSvg elements={elements} />
      </div>
    </div>
  );
}

type Vec2 = {
  x: number;
  z: number;
};

const WIRE_RADIUS = 0.08;
const RESISTOR_RADIUS = 0.085;
const NODE_RADIUS = 0.14;
const WIRE_HEIGHT = 0.18;
const COMPONENT_HEIGHT = 0.22;
const LABEL_HEIGHT = 0.55;

function buildCircuit(three: any, problem: PracticeProblem) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

  const strokeColor = 0x111111;
  const accentColor = 0x2563eb;

  const applyMaterialStyle = (material: any, baseColor: number, preview = false, highlight = false) => {
    const color = new three.Color(baseColor);
    if (highlight) {
      material.color = new three.Color(accentColor);
    } else if (preview) {
      material.color = color.clone().lerp(new three.Color(0x94a3b8), 0.45);
      material.transparent = true;
      material.opacity = 0.55;
      material.depthWrite = false;
    } else {
      material.color = color;
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
    }
    material.metalness = 0;
    material.roughness = 0.6;
    material.emissive = new three.Color(0x000000);
    material.emissiveIntensity = 0;
  };

  const wireMaterial = new three.MeshStandardMaterial({ color: strokeColor });
  applyMaterialStyle(wireMaterial, strokeColor);

  const resistorMaterial = new three.MeshStandardMaterial({ color: strokeColor });
  applyMaterialStyle(resistorMaterial, strokeColor);

  const nodeMaterial = new three.MeshStandardMaterial({ color: strokeColor });
  applyMaterialStyle(nodeMaterial, strokeColor);

  const batteryPositiveMaterial = new three.MeshStandardMaterial({ color: strokeColor });
  applyMaterialStyle(batteryPositiveMaterial, strokeColor);

  const batteryNegativeMaterial = new three.MeshStandardMaterial({ color: strokeColor });
  applyMaterialStyle(batteryNegativeMaterial, strokeColor);

  const toVec3 = (point: Vec2, height = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

  const addNode = (point: Vec2) => {
    const geometry = new three.SphereGeometry(NODE_RADIUS, 28, 20);
    const mesh = new three.Mesh(geometry, nodeMaterial);
    mesh.position.copy(toVec3(point, COMPONENT_HEIGHT + 0.08));
    group.add(mesh);
  };

  const cylinderBetween = (startVec: any, endVec: any, radius: number, material: any) => {
    const direction = new three.Vector3().subVectors(endVec, startVec);
    const length = direction.length();
    if (length <= 1e-6) {
      return null;
    }
    const geometry = new three.CylinderGeometry(radius, radius, length, 24, 1, true);
    const mesh = new three.Mesh(geometry, material);
    const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    const quaternion = new three.Quaternion().setFromUnitVectors(
      new three.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    mesh.setRotationFromQuaternion(quaternion);
    return mesh;
  };

  const addWireSegment = (start: Vec2, end: Vec2) => {
    const startVec = toVec3(start, WIRE_HEIGHT);
    const endVec = toVec3(end, WIRE_HEIGHT);
    const mesh = cylinderBetween(startVec, endVec, WIRE_RADIUS, wireMaterial);
    if (mesh) {
      group.add(mesh);
    }
  };

  const createLabelSprite = (text: string, color = "#111111", preview = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!preview) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = color;
    ctx.font = "bold 150px 'Inter', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 12);
    const texture = new three.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const material = new three.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new three.Sprite(material);
    sprite.scale.set(1.4, 0.7, 1);
    sprite.userData.texture = texture;
    return sprite;
  };

  const createComponentLabel = (label: string) => {
    const sprite = createLabelSprite(label);
    if (sprite) {
      sprite.scale.set(1.4, 0.6, 1);
    }
    return sprite;
  };

  const createResistor = (start: Vec2, end: Vec2, label: string) => {
    const resistorGroup = new three.Group();
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.z - start.z);
    const zigCount = 6;
    const amplitude = 0.35;

    const points: Vec2[] = [];
    for (let i = 0; i <= zigCount; i += 1) {
      const t = i / zigCount;
      if (horizontal) {
        const x = start.x + (end.x - start.x) * t;
        const zOffset = i === 0 || i === zigCount ? 0 : i % 2 === 0 ? -amplitude : amplitude;
        points.push({ x, z: start.z + zOffset });
      } else {
        const z = start.z + (end.z - start.z) * t;
        const xOffset = i === 0 || i === zigCount ? 0 : i % 2 === 0 ? amplitude : -amplitude;
        points.push({ x: start.x + xOffset, z });
      }
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const segStart = toVec3(points[i], COMPONENT_HEIGHT);
      const segEnd = toVec3(points[i + 1], COMPONENT_HEIGHT);
      const mesh = cylinderBetween(segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
      if (mesh) {
        resistorGroup.add(mesh);
      }
    }

    const startVec = toVec3(start, COMPONENT_HEIGHT);
    const endVec = toVec3(end, COMPONENT_HEIGHT);
    const leadStart = cylinderBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = cylinderBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
    if (leadStart) {
      resistorGroup.add(leadStart);
    }
    if (leadEnd) {
      resistorGroup.add(leadEnd);
    }

    const labelSprite = createComponentLabel(label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      resistorGroup.add(labelSprite);
    }

    group.add(resistorGroup);
  };

  const createBattery = (start: Vec2, end: Vec2, label: string) => {
    const batteryGroup = new three.Group();
    const startVec = toVec3(start, COMPONENT_HEIGHT - 0.05);
    const endVec = toVec3(end, COMPONENT_HEIGHT - 0.05);
    const vertical = Math.abs(end.x - start.x) < Math.abs(end.z - start.z);

    if (vertical) {
      const centerZ = (start.z + end.z) / 2;
      const x = start.x;
      const longPlate = new three.Mesh(new three.BoxGeometry(1.0, 0.18, 0.9), batteryPositiveMaterial);
      longPlate.position.set(x, COMPONENT_HEIGHT, centerZ + 0.4);
      const shortPlate = new three.Mesh(new three.BoxGeometry(0.8, 0.18, 0.45), batteryNegativeMaterial);
      shortPlate.position.set(x, COMPONENT_HEIGHT, centerZ - 0.4);
      batteryGroup.add(longPlate, shortPlate);

      const plusLabel = createLabelSprite("+", "#111111");
      if (plusLabel) {
        plusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ + 0.6);
        plusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(plusLabel);
      }
      const minusLabel = createLabelSprite("−", "#111111");
      if (minusLabel) {
        minusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ - 0.6);
        minusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(minusLabel);
      }
    } else {
      const centerX = (start.x + end.x) / 2;
      const z = start.z;
      const longPlate = new three.Mesh(new three.BoxGeometry(0.9, 0.18, 1.0), batteryPositiveMaterial);
      longPlate.position.set(centerX + 0.4, COMPONENT_HEIGHT, z);
      const shortPlate = new three.Mesh(new three.BoxGeometry(0.45, 0.18, 0.8), batteryNegativeMaterial);
      shortPlate.position.set(centerX - 0.4, COMPONENT_HEIGHT, z);
      batteryGroup.add(longPlate, shortPlate);

      const plusLabel = createLabelSprite("+", "#111111");
      if (plusLabel) {
        plusLabel.position.set(centerX + 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        plusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(plusLabel);
      }
      const minusLabel = createLabelSprite("−", "#111111");
      if (minusLabel) {
        minusLabel.position.set(centerX - 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        minusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(minusLabel);
      }
    }

    const leadStart = cylinderBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = cylinderBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
    if (leadStart) {
      batteryGroup.add(leadStart);
    }
    if (leadEnd) {
      batteryGroup.add(leadEnd);
    }

    const labelSprite = createComponentLabel(label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      batteryGroup.add(labelSprite);
    }

    group.add(batteryGroup);
  };

  const addSegmentNodes = (points: Vec2[]) => {
    points.forEach((point) => addNode(point));
  };

  const sourceLabel = problem.source.label ?? "Source";
  const componentLabels = new Map(problem.components.map((component) => [component.id, component.label]));

  const buildSeries = () => {
    const left = -4.4;
    const right = 4.4;
    const top = 2.7;
    const bottom = -2.7;

    const start: Vec2 = { x: left, z: bottom };
    const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
    const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
    const topLeft: Vec2 = { x: left, z: top };
    const topRight: Vec2 = { x: right, z: top };
    const bottomRight: Vec2 = { x: right, z: bottom };

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, topLeft);

    const componentCount = Math.max(problem.components.length, 1);
    const segmentWidth = (topRight.x - topLeft.x) / componentCount;
    const margin = Math.min(segmentWidth * 0.2, 0.5);

    let previousPoint = topLeft;
    problem.components.forEach((component, index) => {
      const startX = topLeft.x + index * segmentWidth + margin;
      const endX = topLeft.x + (index + 1) * segmentWidth - margin;
      const resistorStart: Vec2 = { x: startX, z: top };
      const resistorEnd: Vec2 = { x: endX, z: top };
      addWireSegment(previousPoint, resistorStart);
      createResistor(resistorStart, resistorEnd, component.label ?? component.id);
      addNode(resistorStart);
      addNode(resistorEnd);
      previousPoint = resistorEnd;
    });

    addWireSegment(previousPoint, topRight);
    addWireSegment(topRight, bottomRight);
    addWireSegment(bottomRight, start);

    addSegmentNodes([start, batteryStart, batteryEnd, topLeft, topRight, bottomRight]);
  };

  const buildParallel = () => {
    const left = -2.6;
    const right = 3.8;
    const top = 2.5;
    const bottom = -2.5;

    const leftBottom: Vec2 = { x: left, z: bottom };
    const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
    const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
    const leftTop: Vec2 = { x: left, z: top };
    const rightTop: Vec2 = { x: right, z: top };
    const rightBottom: Vec2 = { x: right, z: bottom };

    addWireSegment(leftBottom, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, leftTop);
    addWireSegment(leftTop, rightTop);
    addWireSegment(leftBottom, rightBottom);

    const branchCount = Math.max(problem.components.length, 1);
    const spacing = (right - left) / (branchCount + 1);
    const branchSpan = Math.min(Math.abs(top - bottom) - 1, 4.2);
    const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, 0.6);

    problem.components.forEach((component, index) => {
      const x = left + spacing * (index + 1);
      const topNode: Vec2 = { x, z: top };
      const bottomNode: Vec2 = { x, z: bottom };
      const resistorStart: Vec2 = { x, z: top - offset };
      const resistorEnd: Vec2 = { x, z: bottom + offset };

      addWireSegment(topNode, resistorStart);
      createResistor(resistorStart, resistorEnd, component.label ?? component.id);
      addWireSegment(resistorEnd, bottomNode);

      addNode(topNode);
      addNode(bottomNode);
    });

    addSegmentNodes([leftTop, rightTop, leftBottom, rightBottom, batteryStart, batteryEnd]);
  };

  const buildCombination = () => {
    const start: Vec2 = { x: -4.2, z: -2.3 };
    const batteryStart: Vec2 = { x: -4.2, z: -1.5 };
    const batteryEnd: Vec2 = { x: -4.2, z: 1.5 };
    const topLeft: Vec2 = { x: -4.2, z: 2.3 };
    const topMid: Vec2 = { x: -1.2, z: 2.3 };
    const branchTop: Vec2 = { x: 1.4, z: 2.3 };
    const branchRightTop: Vec2 = { x: 3.2, z: 2.3 };
    const branchBottom: Vec2 = { x: 1.4, z: -0.3 };
    const branchRightBottom: Vec2 = { x: 3.2, z: -0.3 };
    const dropNode: Vec2 = { x: 1.4, z: -2.3 };
    const bottomLeft: Vec2 = { x: -2.0, z: -2.3 };

    const labelFor = (id: string) => componentLabels.get(id) ?? id;

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, topLeft);
    addWireSegment(topLeft, topMid);

    const seriesTop: Vec2 = { x: 0.4, z: 2.3 };
    const r1Start: Vec2 = topMid;
    const r1End: Vec2 = seriesTop;
    createResistor(r1Start, r1End, labelFor("R1"));

    addWireSegment(seriesTop, branchTop);

    const r2Start: Vec2 = { x: branchTop.x, z: branchTop.z };
    const r2End: Vec2 = { x: branchBottom.x, z: branchBottom.z };
    createResistor(r2Start, r2End, labelFor("R2"));

    addWireSegment(branchTop, branchRightTop);

    const r3Start: Vec2 = { x: branchRightTop.x, z: branchRightTop.z };
    const r3End: Vec2 = { x: branchRightBottom.x, z: branchRightBottom.z };
    createResistor(r3Start, r3End, labelFor("R3"));

    addWireSegment(branchRightBottom, branchBottom);
    addWireSegment(branchBottom, dropNode);

    const r4Start: Vec2 = { x: dropNode.x, z: dropNode.z };
    const r4End: Vec2 = { x: bottomLeft.x, z: bottomLeft.z };
    createResistor(r4Start, r4End, labelFor("R4"));

    addWireSegment(r4End, start);

    addNode(seriesTop);
    addNode(branchTop);
    addNode(branchBottom);
    addNode(branchRightTop);
    addNode(branchRightBottom);
    addNode(dropNode);
    addSegmentNodes([topLeft, start, batteryStart, batteryEnd]);
  };

  const presetKey = problem.presetHint ?? problem.topology;

  switch (presetKey) {
    case "parallel_basic":
      buildParallel();
      break;
    case "mixed_circuit":
      buildCombination();
      break;
    case "series_basic":
    default:
      if (problem.topology === "parallel") {
        buildParallel();
      } else if (problem.topology === "combination") {
        buildCombination();
      } else {
        buildSeries();
      }
      break;
  }

  return group;
}

function disposeThreeObject(root: any) {
  const disposeMaterial = (material: any) => {
    if (!material) {
      return;
    }
    if (Array.isArray(material)) {
      material.forEach((mat) => disposeMaterial(mat));
      return;
    }
    if (material.dispose && typeof material.dispose === "function") {
      material.dispose();
    }
  };

  root.traverse((child: any) => {
    if (child.geometry && typeof child.geometry.dispose === "function") {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
    if (child.userData && child.userData.texture && typeof child.userData.texture.dispose === "function") {
      child.userData.texture.dispose();
    }
  });
}
