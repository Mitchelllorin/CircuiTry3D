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
import { COMPONENT_CATALOG } from "../schematic/catalog";
import {
  BoardLimits,
  CatalogEntry,
  GroundElement,
  Orientation,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../schematic/threeFactory";
import { DEFAULT_SYMBOL_STANDARD, SYMBOL_STANDARD_OPTIONS, SymbolStandard } from "../schematic/standards";
import { buildPracticeCircuit } from "../schematic/presets";
import { CurrentFlowAnimationSystem } from "../schematic/currentFlowAnimation";

declare global {
  interface Window {
    THREE?: any;
  }
}

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r161/three.min.js";
let threeLoaderPromise: Promise<any> | null = null;

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

const SNAP_STEP = 0.5;
const MIN_SEGMENT_LENGTH = SNAP_STEP;

const BOARD_LIMITS: BoardLimits = {
  minX: -7.5,
  maxX: 7.5,
  minZ: -5.5,
  maxZ: 5.5,
};

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
        <BuilderModeView symbolStandard={symbolStandard} />
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

export function BuilderModeView({ symbolStandard }: { symbolStandard: SymbolStandard }) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(COMPONENT_CATALOG[0]?.id ?? "");
  const [elements, setElements] = useState<SchematicElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlacementDraft | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [labelCounters, setLabelCounters] = useState<Record<string, number>>({});
  const [singleNodeOrientation, setSingleNodeOrientation] = useState<Orientation>("horizontal");
  const [isCatalogOpen, setCatalogOpen] = useState(true);

  const selectedCatalogEntry = useMemo(() => {
    const entry = COMPONENT_CATALOG.find((item) => item.id === selectedCatalogId);
    return entry ?? COMPONENT_CATALOG[0];
  }, [selectedCatalogId]);

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedElementId) ?? null,
    [elements, selectedElementId]
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
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        current: snapped,
      };
    });
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
          `${entry.name} placed ${formatPoint(resolved.start)} → ${formatPoint(resolved.end)}.`
        );
      }

      setDraft(null);
    },
    [selectedCatalogEntry, draft, labelCounters, singleNodeOrientation]
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
      const previewWire: WireElement = {
        id: "preview-wire",
        kind: "wire",
        path: [resolved.start, resolved.end],
      };
      return previewWire;
    }

    const prefix = draft.entry.defaultLabelPrefix;
    const suggestion = prefix ? `${prefix}${(labelCounters[prefix] ?? 0) + 1}` : draft.entry.name;

    const previewComponent: TwoTerminalElement = {
      id: "preview-component",
      kind: draft.entry.kind as TwoTerminalElement["kind"],
      label: suggestion,
      start: resolved.start,
      end: resolved.end,
      orientation: resolved.orientation,
    };
    return previewComponent;
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
    [elements]
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
          onBoardPointClick={handleBoardClick}
          onBoardPointMove={handleBoardHover}
          onElementClick={handleElementClick}
          symbolStandard={symbolStandard}
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

      <aside className="schematic-sidebar" data-open={isCatalogOpen ? "true" : "false"}>
        <button
          type="button"
          className="schematic-drawer-toggle"
          onClick={() => setCatalogOpen((open) => !open)}
          aria-expanded={isCatalogOpen}
          aria-controls="schematic-drawer-panel"
        >
          {isCatalogOpen ? "Hide Library" : "Show Library"}
        </button>
        <div id="schematic-drawer-panel" className="schematic-drawer-body">
          <div className="schematic-catalog">
            <h2>Component Catalog</h2>
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
                          (selectedElement as WireElement).path[(selectedElement as WireElement).path.length - 1]
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
  onBoardPointClick: (point: Vec2, event: PointerEvent) => void;
  onBoardPointMove: (point: Vec2 | null) => void;
  onElementClick: (elementId: string, event: PointerEvent) => void;
  symbolStandard: SymbolStandard;
};

function BuilderViewport({
  elements,
  previewElement,
  selectedElementId,
  draftAnchor,
  hoverPoint,
  onBoardPointClick,
  onBoardPointMove,
  onElementClick,
  symbolStandard,
}: BuilderViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera control constants
  const CAMERA_DEFAULT_POSITION = useMemo(() => ({ x: 9.5, y: 7.8, z: 12.4 }), []);
  const CAMERA_DEFAULT_TARGET = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const CAMERA_RADIUS_LIMITS = useMemo(() => ({ min: 2.5, max: 50 }), []);
  const CAMERA_PAN_LIMITS = useMemo(() => ({ x: 12, y: 5, z: 12 }), []);
  const CAMERA_PHI_LIMITS = useMemo(() => ({ min: Math.PI * 0.05, max: Math.PI * 0.48 }), []);
  const TWO_PI = Math.PI * 2;
  const DOM_DELTA_LINE = typeof WheelEvent !== "undefined" ? WheelEvent.DOM_DELTA_LINE : 1;

  const threeRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const boardMeshRef = useRef<any>(null);
  const componentGroupRef = useRef<any>(null);
  const nodeGroupRef = useRef<any>(null);
  const previewGroupRef = useRef<any>(null);
  const anchorGroupRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const pointerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  // Camera control state refs
  const cameraStateRef = useRef<any>(null);
  const activePointersRef = useRef<Map<number, any>>(new Map());
  const multiTouchStateRef = useRef<any>({
    active: false,
    lastDistance: 0,
    lastMidpoint: { x: 0, y: 0 }
  });

  // Camera control utility functions
  const normalizeAzimuth = useCallback(() => {
    const cameraState = cameraStateRef.current;
    if (!cameraState) return;
    cameraState.spherical.theta = ((cameraState.spherical.theta + Math.PI) % TWO_PI) - Math.PI;
  }, []);

  const updateCamera = useCallback((force = false, three?: any, camera?: any) => {
    const threeInstance = three || threeRef.current;
    const cameraInstance = camera || cameraRef.current;
    const cameraState = cameraStateRef.current;
    
    if (!threeInstance || !cameraInstance || !cameraState) return;
    if (!force && !cameraState.needsUpdate) return;

    // Apply radius limits
    cameraState.spherical.radius = Math.max(CAMERA_RADIUS_LIMITS.min, 
      Math.min(CAMERA_RADIUS_LIMITS.max, cameraState.spherical.radius));
    
    // Apply phi (vertical angle) limits  
    cameraState.spherical.phi = Math.max(CAMERA_PHI_LIMITS.min,
      Math.min(CAMERA_PHI_LIMITS.max, cameraState.spherical.phi));

    // Apply target limits
    cameraState.target.x = Math.max(-CAMERA_PAN_LIMITS.x, 
      Math.min(CAMERA_PAN_LIMITS.x, cameraState.target.x));
    cameraState.target.y = Math.max(CAMERA_DEFAULT_TARGET.y - CAMERA_PAN_LIMITS.y,
      Math.min(CAMERA_DEFAULT_TARGET.y + CAMERA_PAN_LIMITS.y, cameraState.target.y)); 
    cameraState.target.z = Math.max(-CAMERA_PAN_LIMITS.z,
      Math.min(CAMERA_PAN_LIMITS.z, cameraState.target.z));

    // Update camera position from spherical coordinates
    const offset = new threeInstance.Vector3().setFromSpherical(cameraState.spherical);
    cameraInstance.position.copy(new threeInstance.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z)).add(offset);
    cameraInstance.lookAt(new threeInstance.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z));
    cameraInstance.updateMatrix();
    cameraInstance.updateMatrixWorld(true);
    cameraState.needsUpdate = false;
  }, [CAMERA_RADIUS_LIMITS, CAMERA_PHI_LIMITS, CAMERA_PAN_LIMITS, CAMERA_DEFAULT_TARGET]);

  const applyPan = useCallback((deltaX: number, deltaY: number, three?: any, camera?: any, renderer?: any) => {
    const threeInstance = three || threeRef.current;
    const cameraInstance = camera || cameraRef.current;
    const rendererInstance = renderer || rendererRef.current;
    const cameraState = cameraStateRef.current;
    
    if (!threeInstance || !cameraInstance || !rendererInstance || !cameraState) return;

    const element = rendererInstance.domElement;
    if (!element || element.clientHeight === 0) return;

    cameraInstance.updateMatrix();
    const offset = new threeInstance.Vector3().copy(cameraInstance.position).sub(new threeInstance.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z));
    let targetDistance = offset.length();
    targetDistance *= Math.tan((cameraInstance.fov / 2) * (Math.PI / 180));

    if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
      targetDistance = 0.01;
    }

    const moveX = (2 * deltaX * targetDistance) / element.clientHeight;
    const moveY = (2 * deltaY * targetDistance) / element.clientHeight;

    const panOffset = new threeInstance.Vector3();
    const panVector = new threeInstance.Vector3();

    panVector.setFromMatrixColumn(cameraInstance.matrix, 0);
    panVector.multiplyScalar(-moveX * cameraState.panSpeed);
    panOffset.add(panVector);

    panVector.setFromMatrixColumn(cameraInstance.matrix, 1);
    panVector.multiplyScalar(moveY * cameraState.panSpeed);
    panOffset.add(panVector);

    cameraState.target.x += panOffset.x;
    cameraState.target.y += panOffset.y;
    cameraState.target.z += panOffset.z;
    cameraState.needsUpdate = true;
  }, []);

  const resetCameraControl = useCallback(() => {
    const three = threeRef.current;
    const cameraState = cameraStateRef.current;
    
    if (!three || !cameraState) return;

    cameraState.target = { ...CAMERA_DEFAULT_TARGET };
    const offset = new three.Vector3(CAMERA_DEFAULT_POSITION.x - CAMERA_DEFAULT_TARGET.x, 
                                   CAMERA_DEFAULT_POSITION.y - CAMERA_DEFAULT_TARGET.y,
                                   CAMERA_DEFAULT_POSITION.z - CAMERA_DEFAULT_TARGET.z);
    cameraState.spherical.setFromVector3(offset);
    normalizeAzimuth();
    cameraState.needsUpdate = true;
    activePointersRef.current.clear();
    multiTouchStateRef.current.active = false;
    multiTouchStateRef.current.lastDistance = 0;
    multiTouchStateRef.current.lastMidpoint = { x: 0, y: 0 };
    updateCamera(true);
  }, [CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET, normalizeAzimuth, updateCamera]);

  const rebuildSceneContent = useCallback(() => {
    const three = threeRef.current;
    const scene = sceneRef.current;
    if (!three || !scene) {
      return;
    }

    const tagWithElementId = (root: any, elementId: string) => {
      if (!root || typeof root.traverse !== "function") {
        return;
      }
      root.traverse((child: any) => {
        child.userData = { ...(child.userData || {}), elementId };
      });
    };

    if (componentGroupRef.current) {
      scene.remove(componentGroupRef.current);
      disposeThreeObject(componentGroupRef.current);
      componentGroupRef.current = null;
    }

    if (nodeGroupRef.current) {
      scene.remove(nodeGroupRef.current);
      disposeThreeObject(nodeGroupRef.current);
      nodeGroupRef.current = null;
    }

    if (previewGroupRef.current) {
      scene.remove(previewGroupRef.current);
      disposeThreeObject(previewGroupRef.current);
      previewGroupRef.current = null;
    }

    if (anchorGroupRef.current) {
      scene.remove(anchorGroupRef.current);
      disposeThreeObject(anchorGroupRef.current);
      anchorGroupRef.current = null;
    }

    if (hoverMarkerRef.current) {
      scene.remove(hoverMarkerRef.current);
      disposeThreeObject(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }

    const elementGroup = new three.Group();
    const terminalKeys = new Set<string>();
    const terminalPoints: Vec2[] = [];

      elements.forEach((element) => {
        const { group, terminals } = buildElement(three, element, {
          highlight: element.id === selectedElementId,
          standard: symbolStandard,
        });
      tagWithElementId(group, element.id);
      elementGroup.add(group);
      terminals.forEach((point) => {
        const key = pointKey(point);
        if (!terminalKeys.has(key)) {
          terminalKeys.add(key);
          terminalPoints.push(point);
        }
      });
    });

    scene.add(elementGroup);
    componentGroupRef.current = elementGroup;

    const nodesGroup = new three.Group();
      terminalPoints.forEach((point) => {
        const mesh = buildNodeMesh(three, point, { standard: symbolStandard });
      nodesGroup.add(mesh);
    });
    scene.add(nodesGroup);
    nodeGroupRef.current = nodesGroup;

    if (previewElement) {
        const { group, terminals } = buildElement(three, previewElement, {
          preview: true,
          standard: symbolStandard,
        });
      tagWithElementId(group, previewElement.id);
      if (terminals.length) {
        terminals.forEach((point) => {
            const mesh = buildNodeMesh(three, point, { preview: true, standard: symbolStandard });
          group.add(mesh);
        });
      }
      scene.add(group);
      previewGroupRef.current = group;
    }

    if (draftAnchor) {
      const anchorGroup = new three.Group();
        const anchorMesh = buildNodeMesh(three, draftAnchor, {
          preview: true,
          highlight: true,
          standard: symbolStandard,
        });
      anchorGroup.add(anchorMesh);
      scene.add(anchorGroup);
      anchorGroupRef.current = anchorGroup;
    }

    if (hoverPoint) {
      const geometry = new three.RingGeometry(0.18, 0.26, 36);
      const material = new three.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.65,
        side: three.DoubleSide,
      });
      const hoverMesh = new three.Mesh(geometry, material);
      hoverMesh.rotation.x = -Math.PI / 2;
      hoverMesh.position.set(hoverPoint.x, 0.02, hoverPoint.z);
      scene.add(hoverMesh);
      hoverMarkerRef.current = hoverMesh;
    }
  }, [elements, previewElement, selectedElementId, draftAnchor, hoverPoint, symbolStandard]);

  useEffect(() => {
    rebuildSceneContent();
  }, [rebuildSceneContent]);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    loadThree()
      .then((three) => {
        if (!isMounted) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        setLoading(false);

        const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0xfdfdfd, 1);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = three.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();
        scene.background = new three.Color(0xfdfdfd);

        const camera = new three.PerspectiveCamera(
          44,
          container.clientWidth / container.clientHeight,
          0.1,
          200
        );
        camera.position.set(9.5, 7.8, 12.4);
        camera.lookAt(new three.Vector3(0, 0, 0));

        const ambient = new three.AmbientLight(0xffffff, 0.75);
        scene.add(ambient);

        const hemi = new three.HemisphereLight(0x98c7ff, 0x0a1326, 0.55);
        hemi.position.set(0, 6, 0);
        scene.add(hemi);

        const key = new three.DirectionalLight(0x6bb7ff, 0.7);
        key.position.set(8, 12, 6);
        key.castShadow = true;
        key.shadow.mapSize.width = 1024;
        key.shadow.mapSize.height = 1024;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 30;
        key.shadow.camera.left = -10;
        key.shadow.camera.right = 10;
        key.shadow.camera.top = 10;
        key.shadow.camera.bottom = -10;
        scene.add(key);

        const fill = new three.DirectionalLight(0xf4c163, 0.4);
        fill.position.set(-6, 7, -4);
        scene.add(fill);

        const boardGeometry = new three.PlaneGeometry(16, 12, 1, 1);
        const boardMaterial = new three.MeshStandardMaterial({
          color: 0xf3f4f6,
          metalness: 0,
          roughness: 0.95,
          transparent: true,
          opacity: 0.98,
          side: three.DoubleSide,
        });
        const board = new three.Mesh(boardGeometry, boardMaterial);
        board.rotation.x = -Math.PI / 2;
        board.position.y = -0.05;
        board.name = "schematic-board";
        board.userData.isBoard = true;
        board.receiveShadow = true;
        scene.add(board);

        const grid = new three.GridHelper(12, 12, 0xcbd5f5, 0xe2e8f0);
        grid.position.y = 0.02;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.22;
        }
        scene.add(grid);

        threeRef.current = three;
        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        boardMeshRef.current = board;

        raycasterRef.current = new three.Raycaster();
        pointerRef.current = new three.Vector2();

        // Initialize camera state
        cameraStateRef.current = {
          target: { ...CAMERA_DEFAULT_TARGET },
          spherical: new three.Spherical(),
          needsUpdate: false,
          rotateSpeed: 0.0055,
          rotateVerticalSpeed: 0.0045,
          panSpeed: 0.9,
          zoomSpeed: 1.5,
          wheelZoomSpeed: 0.008
        };

        const offset = new three.Vector3(CAMERA_DEFAULT_POSITION.x - CAMERA_DEFAULT_TARGET.x,
                                       CAMERA_DEFAULT_POSITION.y - CAMERA_DEFAULT_TARGET.y, 
                                       CAMERA_DEFAULT_POSITION.z - CAMERA_DEFAULT_TARGET.z);
        cameraStateRef.current.spherical.setFromVector3(offset);
        normalizeAzimuth();
        cameraStateRef.current.needsUpdate = true;
        
        // Set touch-action: none for proper touch handling
        renderer.domElement.style.touchAction = "none";
        renderer.domElement.style.cursor = "grab";

        // Camera control helper functions
        const getPrimaryPointers = () => {
          return Array.from(activePointersRef.current.values())
            .sort((a, b) => a.id - b.id)
            .slice(0, 2);
        };

        // Camera control pointer event handlers
        const handleCameraPointerDown = (event: PointerEvent) => {
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          const pointer = {
            id: event.pointerId,
            current: { x: event.clientX, y: event.clientY },
            last: { x: event.clientX, y: event.clientY }
          };

          activePointersRef.current.set(event.pointerId, pointer);
          
          try {
            renderer.domElement.setPointerCapture(event.pointerId);
          } catch (error) {
            // Some platforms do not support pointer capture
          }

          if (event.pointerType !== "touch") {
            renderer.domElement.style.cursor = "grabbing";
          }

          if (activePointersRef.current.size >= 2) {
            const [first, second] = getPrimaryPointers();
            multiTouchStateRef.current.active = true;
            multiTouchStateRef.current.lastDistance = Math.sqrt(
              Math.pow(first.current.x - second.current.x, 2) + 
              Math.pow(first.current.y - second.current.y, 2)
            );
            multiTouchStateRef.current.lastMidpoint = {
              x: (first.current.x + second.current.x) * 0.5,
              y: (first.current.y + second.current.y) * 0.5
            };
          } else {
            multiTouchStateRef.current.active = false;
            multiTouchStateRef.current.lastDistance = 0;
          }
        };

        const handleCameraPointerMove = (event: PointerEvent) => {
          if (!activePointersRef.current.has(event.pointerId)) {
            return;
          }
          
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          const pointer = activePointersRef.current.get(event.pointerId);
          pointer.last.x = pointer.current.x;
          pointer.last.y = pointer.current.y;
          pointer.current.x = event.clientX;
          pointer.current.y = event.clientY;

          const cameraState = cameraStateRef.current;
          if (!cameraState) return;

          if (activePointersRef.current.size === 1) {
            const deltaX = pointer.current.x - pointer.last.x;
            const deltaY = pointer.current.y - pointer.last.y;
            const buttons = event.buttons;
            const isTouch = event.pointerType === "touch";
            const isPen = event.pointerType === "pen";
            const leftButtonDown = (buttons & 1) !== 0;
            const rightButtonDown = (buttons & 2) !== 0;
            const middleButtonDown = (buttons & 4) !== 0;
            const modifierPan = event.shiftKey || event.altKey || event.metaKey;
            const panGesture = (!isTouch && !isPen && (rightButtonDown || middleButtonDown)) || modifierPan;
            const rotateGesture = !panGesture && (isTouch || isPen || leftButtonDown);

            if (panGesture) {
              if (deltaX !== 0 || deltaY !== 0) {
                applyPan(deltaX, deltaY, three, camera, renderer);
              }
            } else if (rotateGesture) {
              if (deltaX !== 0) {
                cameraState.spherical.theta -= deltaX * cameraState.rotateSpeed;
                normalizeAzimuth();
                cameraState.needsUpdate = true;
              }
              if (deltaY !== 0) {
                const verticalSpeed = cameraState.rotateVerticalSpeed ?? cameraState.rotateSpeed;
                cameraState.spherical.phi -= deltaY * verticalSpeed;
                cameraState.spherical.phi = Math.max(CAMERA_PHI_LIMITS.min,
                  Math.min(CAMERA_PHI_LIMITS.max, cameraState.spherical.phi));
                cameraState.needsUpdate = true;
              }
            }
          } else if (activePointersRef.current.size >= 2) {
            const [first, second] = getPrimaryPointers();
            const midpoint = {
              x: (first.current.x + second.current.x) * 0.5,
              y: (first.current.y + second.current.y) * 0.5
            };

            if (multiTouchStateRef.current.active) {
              const deltaMidX = midpoint.x - multiTouchStateRef.current.lastMidpoint.x;
              const deltaMidY = midpoint.y - multiTouchStateRef.current.lastMidpoint.y;
              if (deltaMidX !== 0 || deltaMidY !== 0) {
                applyPan(deltaMidX, deltaMidY, three, camera, renderer);
              }

              const distance = Math.sqrt(
                Math.pow(first.current.x - second.current.x, 2) + 
                Math.pow(first.current.y - second.current.y, 2)
              );
              const distanceDelta = distance - multiTouchStateRef.current.lastDistance;
              const element = renderer.domElement;
              if (element && Math.abs(distanceDelta) > 0.3) {
                if (element.clientWidth !== 0) {
                  const normalized = distanceDelta / element.clientWidth;
                  const scale = Math.max(0.7, Math.min(1.3, 1 - normalized * cameraState.zoomSpeed));
                  if (!Number.isNaN(scale) && Number.isFinite(scale)) {
                    cameraState.spherical.radius *= scale;
                    cameraState.needsUpdate = true;
                  }
                }
                multiTouchStateRef.current.lastDistance = distance;
              } else {
                multiTouchStateRef.current.lastDistance = distance;
              }
            } else {
              multiTouchStateRef.current.active = true;
              multiTouchStateRef.current.lastDistance = Math.sqrt(
                Math.pow(first.current.x - second.current.x, 2) + 
                Math.pow(first.current.y - second.current.y, 2)
              );
            }

            multiTouchStateRef.current.lastMidpoint = midpoint;
          }
        };

        const handleCameraPointerUp = (event: PointerEvent) => {
          if (!activePointersRef.current.has(event.pointerId)) {
            return;
          }
          
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          try {
            renderer.domElement.releasePointerCapture(event.pointerId);
          } catch (error) {
            // Ignore release errors
          }
          
          activePointersRef.current.delete(event.pointerId);

          if (activePointersRef.current.size === 0) {
            renderer.domElement.style.cursor = "grab";
          }

          if (activePointersRef.current.size < 2) {
            multiTouchStateRef.current.active = false;
            multiTouchStateRef.current.lastDistance = 0;
            multiTouchStateRef.current.lastMidpoint = { x: 0, y: 0 };
          }
        };

        const handleWheel = (event: WheelEvent) => {
          const cameraState = cameraStateRef.current;
          if (!cameraState) return;

          event.preventDefault();
          const isPinchGesture = event.ctrlKey || event.metaKey || (event as any).deltaZ !== 0;
          const isLineDelta = event.deltaMode === DOM_DELTA_LINE;
          const isPanModifier = event.shiftKey;

          // Shift+scroll to pan, otherwise scroll to zoom
          if (isPanModifier) {
            const panScale = isLineDelta ? 40 : 1;
            if (event.deltaX !== 0 || event.deltaY !== 0) {
              applyPan(event.deltaX * panScale, event.deltaY * panScale, three, camera, renderer);
            }
            return;
          }

          // Default: scroll wheel zooms
          const zoomFactor = isLineDelta ? cameraState.wheelZoomSpeed * 40 :
                            isPinchGesture ? cameraState.wheelZoomSpeed :
                            cameraState.wheelZoomSpeed * 12;
          cameraState.spherical.radius += event.deltaY * zoomFactor;
          cameraState.needsUpdate = true;
        };

        const handleResize = () => {
          if (!container) {
            return;
          }
          renderer.setSize(container.clientWidth, container.clientHeight);
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
        };

        const updateRaycasterFromEvent = (event: PointerEvent) => {
          const pointer = pointerRef.current;
          const raycaster = raycasterRef.current;
          if (!pointer || !raycaster) {
            return;
          }
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
        };

        const intersectBoard = () => {
          const raycaster = raycasterRef.current;
          const boardMesh = boardMeshRef.current;
          if (!raycaster || !boardMesh) {
            return null;
          }
          const hits = raycaster.intersectObject(boardMesh, false);
          return hits.length > 0 ? hits[0] : null;
        };

        const pickComponent = () => {
          const raycaster = raycasterRef.current;
          const group = componentGroupRef.current;
          if (!raycaster || !group) {
            return null;
          }
          const hits = raycaster.intersectObjects(group.children, true);
          for (const hit of hits) {
            if (hit.object && hit.object.userData && hit.object.userData.elementId) {
              return hit.object.userData.elementId as string;
            }
          }
          return null;
        };

        const handlePointerMove = (event: PointerEvent) => {
          // First handle camera controls
          handleCameraPointerMove(event);
          
          // Only handle board/component interaction if not actively doing camera controls
          if (activePointersRef.current.size === 0) {
            updateRaycasterFromEvent(event);
            const boardHit = intersectBoard();
            if (boardHit) {
              onBoardPointMove({ x: boardHit.point.x, z: boardHit.point.z });
            } else {
              onBoardPointMove(null);
            }
          }
        };

        const handlePointerDown = (event: PointerEvent) => {
          // Always handle camera controls first
          handleCameraPointerDown(event);
          
          // Only handle component selection for left-clicks and if no camera interaction
          if (event.button === 0 && activePointersRef.current.size <= 1) {
            const isTouch = event.pointerType === "touch";
            const isPen = event.pointerType === "pen";
            const modifierPan = event.shiftKey || event.altKey || event.metaKey;
            const rightButtonDown = (event.buttons & 2) !== 0;
            const middleButtonDown = (event.buttons & 4) !== 0;
            const panGesture = (!isTouch && !isPen && (rightButtonDown || middleButtonDown)) || modifierPan;
            
            // Only do component interaction if this is not a camera gesture
            if (!panGesture) {
              updateRaycasterFromEvent(event);
              const elementId = pickComponent();
              if (elementId) {
                onElementClick(elementId, event);
                return;
              }
              const boardHit = intersectBoard();
              if (boardHit) {
                onBoardPointClick({ x: boardHit.point.x, z: boardHit.point.z }, event);
              }
            }
          }
        };

        const handlePointerUp = (event: PointerEvent) => {
          handleCameraPointerUp(event);
        };

        const handlePointerLeave = () => {
          // Clear all active pointers for camera controls
          activePointersRef.current.clear();
          multiTouchStateRef.current.active = false;
          renderer.domElement.style.cursor = "grab";
          onBoardPointMove(null);
        };

        // Register all pointer events including camera controls
        renderer.domElement.addEventListener("pointermove", handlePointerMove, { passive: false });
        renderer.domElement.addEventListener("pointerdown", handlePointerDown, { passive: false });
        renderer.domElement.addEventListener("pointerup", handlePointerUp, { passive: false });
        renderer.domElement.addEventListener("pointercancel", handlePointerUp, { passive: false });
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave, { passive: false });
        renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
        renderer.domElement.addEventListener("contextmenu", (event) => {
          event.preventDefault();
        });

        rebuildSceneContent();

        const animate = () => {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          updateCamera(false, three, camera);
          renderer.render(scene, camera);
        };

        animate();

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrameRef.current);
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
          renderer.domElement.removeEventListener("pointerup", handlePointerUp);
          renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
          renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
          renderer.domElement.removeEventListener("wheel", handleWheel);
          renderer.domElement.removeEventListener("contextmenu", () => {});
          if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          disposeThreeObject(scene);
          renderer.dispose();
          threeRef.current = null;
          rendererRef.current = null;
          sceneRef.current = null;
          cameraRef.current = null;
          boardMeshRef.current = null;
          componentGroupRef.current = null;
          nodeGroupRef.current = null;
          previewGroupRef.current = null;
          anchorGroupRef.current = null;
          hoverMarkerRef.current = null;
        };
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        console.error("Failed to initialise schematic viewport", err);
        setError("Unable to load the WebGL renderer. Please ensure WebGL is supported and try again.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [onBoardPointClick, onBoardPointMove, onElementClick, rebuildSceneContent]);

  return (
    <div className="schematic-viewport">
      <div ref={containerRef} className="schematic-canvas" />
      {loading && !error && <div className="schematic-status">Loading 3D engine…</div>}
      {error && <div className="schematic-status schematic-error">{error}</div>}
    </div>
  );
}

type PracticeViewportProps = {
  problem: PracticeProblem;
  symbolStandard: SymbolStandard;
};

export function PracticeViewport({ problem, symbolStandard }: PracticeViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera control constants
  const CAMERA_DEFAULT_POSITION = useMemo(() => ({ x: 9.5, y: 7.8, z: 12.4 }), []);
  const CAMERA_DEFAULT_TARGET = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const CAMERA_RADIUS_LIMITS = useMemo(() => ({ min: 2.5, max: 50 }), []);
  const CAMERA_PAN_LIMITS = useMemo(() => ({ x: 12, y: 5, z: 12 }), []);
  const CAMERA_PHI_LIMITS = useMemo(() => ({ min: Math.PI * 0.05, max: Math.PI * 0.48 }), []);
  const TWO_PI = Math.PI * 2;
  const DOM_DELTA_LINE = typeof WheelEvent !== "undefined" ? WheelEvent.DOM_DELTA_LINE : 1;

  // Camera control state refs
  const cameraStateRef = useRef<any>(null);
  const activePointersRef = useRef<Map<number, any>>(new Map());
  const multiTouchStateRef = useRef<any>({
    active: false,
    lastDistance: 0,
    lastMidpoint: { x: 0, y: 0 }
  });

  const problemRef = useRef<PracticeProblem>(problem);
  problemRef.current = problem;

  const standardRef = useRef<SymbolStandard>(symbolStandard);
  standardRef.current = symbolStandard;

  const applyProblemRef = useRef<((nextProblem: PracticeProblem, activeStandard: SymbolStandard) => void) | null>(null);

  // Camera control utility functions
  const normalizeAzimuth = useCallback(() => {
    const cameraState = cameraStateRef.current;
    if (!cameraState) return;
    cameraState.spherical.theta = ((cameraState.spherical.theta + Math.PI) % TWO_PI) - Math.PI;
  }, []);

  const updateCamera = useCallback((force = false, three?: any, camera?: any) => {
    const cameraState = cameraStateRef.current;
    
    if (!three || !camera || !cameraState) return;
    if (!force && !cameraState.needsUpdate) return;

    // Apply radius limits
    cameraState.spherical.radius = Math.max(CAMERA_RADIUS_LIMITS.min, 
      Math.min(CAMERA_RADIUS_LIMITS.max, cameraState.spherical.radius));
    
    // Apply phi (vertical angle) limits  
    cameraState.spherical.phi = Math.max(CAMERA_PHI_LIMITS.min,
      Math.min(CAMERA_PHI_LIMITS.max, cameraState.spherical.phi));

    // Apply target limits
    cameraState.target.x = Math.max(-CAMERA_PAN_LIMITS.x, 
      Math.min(CAMERA_PAN_LIMITS.x, cameraState.target.x));
    cameraState.target.y = Math.max(CAMERA_DEFAULT_TARGET.y - CAMERA_PAN_LIMITS.y,
      Math.min(CAMERA_DEFAULT_TARGET.y + CAMERA_PAN_LIMITS.y, cameraState.target.y)); 
    cameraState.target.z = Math.max(-CAMERA_PAN_LIMITS.z,
      Math.min(CAMERA_PAN_LIMITS.z, cameraState.target.z));

    // Update camera position from spherical coordinates
    const offset = new three.Vector3().setFromSpherical(cameraState.spherical);
    camera.position.copy(new three.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z)).add(offset);
    camera.lookAt(new three.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z));
    camera.updateMatrix();
    camera.updateMatrixWorld(true);
    cameraState.needsUpdate = false;
  }, [CAMERA_RADIUS_LIMITS, CAMERA_PHI_LIMITS, CAMERA_PAN_LIMITS, CAMERA_DEFAULT_TARGET]);

  const applyPan = useCallback((deltaX: number, deltaY: number, three?: any, camera?: any, renderer?: any) => {
    const cameraState = cameraStateRef.current;
    
    if (!three || !camera || !renderer || !cameraState) return;

    const element = renderer.domElement;
    if (!element || element.clientHeight === 0) return;

    camera.updateMatrix();
    const offset = new three.Vector3().copy(camera.position).sub(new three.Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z));
    let targetDistance = offset.length();
    targetDistance *= Math.tan((camera.fov / 2) * (Math.PI / 180));

    if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
      targetDistance = 0.01;
    }

    const moveX = (2 * deltaX * targetDistance) / element.clientHeight;
    const moveY = (2 * deltaY * targetDistance) / element.clientHeight;

    const panOffset = new three.Vector3();
    const panVector = new three.Vector3();

    panVector.setFromMatrixColumn(camera.matrix, 0);
    panVector.multiplyScalar(-moveX * cameraState.panSpeed);
    panOffset.add(panVector);

    panVector.setFromMatrixColumn(camera.matrix, 1);
    panVector.multiplyScalar(moveY * cameraState.panSpeed);
    panOffset.add(panVector);

    cameraState.target.x += panOffset.x;
    cameraState.target.y += panOffset.y;
    cameraState.target.z += panOffset.z;
    cameraState.needsUpdate = true;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    loadThree()
      .then((three) => {
        if (!isMounted) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        setLoading(false);

        const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0xfdfdfd, 1);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = three.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();
        scene.background = new three.Color(0xfdfdfd);

        const camera = new three.PerspectiveCamera(
          44,
          container.clientWidth / container.clientHeight,
          0.1,
          200
        );
        camera.position.set(9.5, 7.8, 12.4);
        camera.lookAt(new three.Vector3(0, 0, 0));

        const ambient = new three.AmbientLight(0xffffff, 0.75);
        scene.add(ambient);

        const hemi = new three.HemisphereLight(0x98c7ff, 0x0a1326, 0.55);
        hemi.position.set(0, 6, 0);
        scene.add(hemi);

        const key = new three.DirectionalLight(0x6bb7ff, 0.7);
        key.position.set(8, 12, 6);
        key.castShadow = true;
        key.shadow.mapSize.width = 1024;
        key.shadow.mapSize.height = 1024;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 30;
        key.shadow.camera.left = -10;
        key.shadow.camera.right = 10;
        key.shadow.camera.top = 10;
        key.shadow.camera.bottom = -10;
        scene.add(key);

        const fill = new three.DirectionalLight(0xf4c163, 0.4);
        fill.position.set(-6, 7, -4);
        scene.add(fill);

        const boardGeometry = new three.PlaneGeometry(16, 12, 1, 1);
        const boardMaterial = new three.MeshStandardMaterial({
          color: 0xf3f4f6,
          metalness: 0,
          roughness: 0.95,
          transparent: true,
          opacity: 0.98,
          side: three.DoubleSide,
        });
        const board = new three.Mesh(boardGeometry, boardMaterial);
        board.rotation.x = -Math.PI / 2;
        board.position.y = -0.05;
        board.receiveShadow = true;
        scene.add(board);

        const grid = new three.GridHelper(12, 12, 0xcbd5f5, 0xe2e8f0);
        grid.position.y = 0.02;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.22;
        }
        scene.add(grid);

        // Initialize camera state
        cameraStateRef.current = {
          target: { ...CAMERA_DEFAULT_TARGET },
          spherical: new three.Spherical(),
          needsUpdate: false,
          rotateSpeed: 0.0055,
          rotateVerticalSpeed: 0.0045,
          panSpeed: 0.9,
          zoomSpeed: 1.5,
          wheelZoomSpeed: 0.008
        };

        const offset = new three.Vector3(CAMERA_DEFAULT_POSITION.x - CAMERA_DEFAULT_TARGET.x,
                                       CAMERA_DEFAULT_POSITION.y - CAMERA_DEFAULT_TARGET.y, 
                                       CAMERA_DEFAULT_POSITION.z - CAMERA_DEFAULT_TARGET.z);
        cameraStateRef.current.spherical.setFromVector3(offset);
        normalizeAzimuth();
        cameraStateRef.current.needsUpdate = true;
        
        // Set touch-action: none for proper touch handling
        renderer.domElement.style.touchAction = "none";
        renderer.domElement.style.cursor = "grab";

        // Camera control helper functions
        const getPrimaryPointers = () => {
          return Array.from(activePointersRef.current.values())
            .sort((a, b) => a.id - b.id)
            .slice(0, 2);
        };

        // Camera control pointer event handlers
        const handleCameraPointerDown = (event: PointerEvent) => {
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          const pointer = {
            id: event.pointerId,
            current: { x: event.clientX, y: event.clientY },
            last: { x: event.clientX, y: event.clientY }
          };

          activePointersRef.current.set(event.pointerId, pointer);
          
          try {
            renderer.domElement.setPointerCapture(event.pointerId);
          } catch (error) {
            // Some platforms do not support pointer capture
          }

          if (event.pointerType !== "touch") {
            renderer.domElement.style.cursor = "grabbing";
          }

          if (activePointersRef.current.size >= 2) {
            const [first, second] = getPrimaryPointers();
            multiTouchStateRef.current.active = true;
            multiTouchStateRef.current.lastDistance = Math.sqrt(
              Math.pow(first.current.x - second.current.x, 2) + 
              Math.pow(first.current.y - second.current.y, 2)
            );
            multiTouchStateRef.current.lastMidpoint = {
              x: (first.current.x + second.current.x) * 0.5,
              y: (first.current.y + second.current.y) * 0.5
            };
          } else {
            multiTouchStateRef.current.active = false;
            multiTouchStateRef.current.lastDistance = 0;
          }
        };

        const handleCameraPointerMove = (event: PointerEvent) => {
          if (!activePointersRef.current.has(event.pointerId)) {
            return;
          }
          
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          const pointer = activePointersRef.current.get(event.pointerId);
          pointer.last.x = pointer.current.x;
          pointer.last.y = pointer.current.y;
          pointer.current.x = event.clientX;
          pointer.current.y = event.clientY;

          const cameraState = cameraStateRef.current;
          if (!cameraState) return;

          if (activePointersRef.current.size === 1) {
            const deltaX = pointer.current.x - pointer.last.x;
            const deltaY = pointer.current.y - pointer.last.y;
            const buttons = event.buttons;
            const isTouch = event.pointerType === "touch";
            const isPen = event.pointerType === "pen";
            const leftButtonDown = (buttons & 1) !== 0;
            const rightButtonDown = (buttons & 2) !== 0;
            const middleButtonDown = (buttons & 4) !== 0;
            const modifierPan = event.shiftKey || event.altKey || event.metaKey;
            const panGesture = (!isTouch && !isPen && (rightButtonDown || middleButtonDown)) || modifierPan;
            const rotateGesture = !panGesture && (isTouch || isPen || leftButtonDown);

            if (panGesture) {
              if (deltaX !== 0 || deltaY !== 0) {
                applyPan(deltaX, deltaY, three, camera, renderer);
              }
            } else if (rotateGesture) {
              if (deltaX !== 0) {
                cameraState.spherical.theta -= deltaX * cameraState.rotateSpeed;
                normalizeAzimuth();
                cameraState.needsUpdate = true;
              }
              if (deltaY !== 0) {
                const verticalSpeed = cameraState.rotateVerticalSpeed ?? cameraState.rotateSpeed;
                cameraState.spherical.phi -= deltaY * verticalSpeed;
                cameraState.spherical.phi = Math.max(CAMERA_PHI_LIMITS.min,
                  Math.min(CAMERA_PHI_LIMITS.max, cameraState.spherical.phi));
                cameraState.needsUpdate = true;
              }
            }
          } else if (activePointersRef.current.size >= 2) {
            const [first, second] = getPrimaryPointers();
            const midpoint = {
              x: (first.current.x + second.current.x) * 0.5,
              y: (first.current.y + second.current.y) * 0.5
            };

            if (multiTouchStateRef.current.active) {
              const deltaMidX = midpoint.x - multiTouchStateRef.current.lastMidpoint.x;
              const deltaMidY = midpoint.y - multiTouchStateRef.current.lastMidpoint.y;
              if (deltaMidX !== 0 || deltaMidY !== 0) {
                applyPan(deltaMidX, deltaMidY, three, camera, renderer);
              }

              const distance = Math.sqrt(
                Math.pow(first.current.x - second.current.x, 2) + 
                Math.pow(first.current.y - second.current.y, 2)
              );
              const distanceDelta = distance - multiTouchStateRef.current.lastDistance;
              const element = renderer.domElement;
              if (element && Math.abs(distanceDelta) > 0.3) {
                if (element.clientWidth !== 0) {
                  const normalized = distanceDelta / element.clientWidth;
                  const scale = Math.max(0.7, Math.min(1.3, 1 - normalized * cameraState.zoomSpeed));
                  if (!Number.isNaN(scale) && Number.isFinite(scale)) {
                    cameraState.spherical.radius *= scale;
                    cameraState.needsUpdate = true;
                  }
                }
                multiTouchStateRef.current.lastDistance = distance;
              } else {
                multiTouchStateRef.current.lastDistance = distance;
              }
            } else {
              multiTouchStateRef.current.active = true;
              multiTouchStateRef.current.lastDistance = Math.sqrt(
                Math.pow(first.current.x - second.current.x, 2) + 
                Math.pow(first.current.y - second.current.y, 2)
              );
            }

            multiTouchStateRef.current.lastMidpoint = midpoint;
          }
        };

        const handleCameraPointerUp = (event: PointerEvent) => {
          if (!activePointersRef.current.has(event.pointerId)) {
            return;
          }
          
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          try {
            renderer.domElement.releasePointerCapture(event.pointerId);
          } catch (error) {
            // Ignore release errors
          }
          
          activePointersRef.current.delete(event.pointerId);

          if (activePointersRef.current.size === 0) {
            renderer.domElement.style.cursor = "grab";
          }

          if (activePointersRef.current.size < 2) {
            multiTouchStateRef.current.active = false;
            multiTouchStateRef.current.lastDistance = 0;
            multiTouchStateRef.current.lastMidpoint = { x: 0, y: 0 };
          }
        };

        const handleWheel = (event: WheelEvent) => {
          const cameraState = cameraStateRef.current;
          if (!cameraState) return;

          event.preventDefault();
          const isPinchGesture = event.ctrlKey || event.metaKey || (event as any).deltaZ !== 0;
          const isLineDelta = event.deltaMode === DOM_DELTA_LINE;
          const isPanModifier = event.shiftKey;

          // Shift+scroll to pan, otherwise scroll to zoom
          if (isPanModifier) {
            const panScale = isLineDelta ? 40 : 1;
            if (event.deltaX !== 0 || event.deltaY !== 0) {
              applyPan(event.deltaX * panScale, event.deltaY * panScale, three, camera, renderer);
            }
            return;
          }

          // Default: scroll wheel zooms
          const zoomFactor = isLineDelta ? cameraState.wheelZoomSpeed * 40 :
                            isPinchGesture ? cameraState.wheelZoomSpeed :
                            cameraState.wheelZoomSpeed * 12;
          cameraState.spherical.radius += event.deltaY * zoomFactor;
          cameraState.needsUpdate = true;
        };

        const handlePointerLeave = () => {
          // Clear all active pointers for camera controls
          activePointersRef.current.clear();
          multiTouchStateRef.current.active = false;
          multiTouchStateRef.current.lastDistance = 0;
          multiTouchStateRef.current.lastMidpoint = { x: 0, y: 0 };
          renderer.domElement.style.cursor = "grab";
        };

        // Register all pointer events including camera controls
        renderer.domElement.addEventListener("pointermove", handleCameraPointerMove, { passive: false });
        renderer.domElement.addEventListener("pointerdown", handleCameraPointerDown, { passive: false });
        renderer.domElement.addEventListener("pointerup", handleCameraPointerUp, { passive: false });
        renderer.domElement.addEventListener("pointercancel", handleCameraPointerUp, { passive: false });
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave, { passive: false });
        renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
        renderer.domElement.addEventListener("contextmenu", (event) => {
          event.preventDefault();
        });

        let circuitGroup: any = null;
        let flowAnimationSystem: CurrentFlowAnimationSystem | null = null;

          const setCircuit = (practiceProblem: PracticeProblem, activeStandard: SymbolStandard) => {
          if (circuitGroup) {
            scene.remove(circuitGroup);
            disposeThreeObject(circuitGroup);
            circuitGroup = null;
          }
          if (flowAnimationSystem) {
            flowAnimationSystem.dispose();
            flowAnimationSystem = null;
          }
            circuitGroup = buildPracticeCircuit(three, practiceProblem, activeStandard);
          scene.add(circuitGroup);

          // Initialize current flow animation - add particles to circuitGroup so they move with the circuit
          flowAnimationSystem = new CurrentFlowAnimationSystem(three, circuitGroup);

          // Solve the circuit to get current values
          const solution = solvePracticeProblem(practiceProblem);

          // Set the circuit as closed (practice problems are complete circuits)
          flowAnimationSystem.setCircuitClosed(true);

          // Set current intensity based on solved circuit current
          if (solution.totals.current !== undefined) {
            flowAnimationSystem.setCurrentIntensity(solution.totals.current);
          }

          // Build flow paths based on circuit topology
          // These paths represent the complete circuit loop for animation
          const flowPaths = buildFlowPathsForTopology(practiceProblem);
          flowPaths.forEach(path => {
            flowAnimationSystem?.addFlowPath({
              path,
              particleCount: 3,
              baseSpeed: 0.35,
              currentAmps: solution.totals.current
            });
          });
        };

        // Helper function to build flow paths based on topology
        const buildFlowPathsForTopology = (problem: PracticeProblem): Vec2[][] => {
          const paths: Vec2[][] = [];

          // Define standard circuit layouts matching presets.ts
          if (problem.topology === "series") {
            // Series: single loop path from battery negative through components back to positive
            const left = -4.4;
            const right = 4.4;
            const top = 2.7;
            const bottom = -2.7;

            // Complete loop: battery (-) -> bottom left -> bottom right -> top right -> top left -> battery (+)
            // This is the electron flow direction (negative to positive)
            paths.push([
              { x: left, z: bottom },           // Start at battery negative
              { x: right, z: bottom },          // Bottom right
              { x: right, z: top },             // Top right
              { x: left, z: top },              // Top left
              { x: left, z: bottom + 0.9 }      // Back to battery positive terminal area
            ]);
          } else if (problem.topology === "parallel") {
            // Parallel: main loop with branch points
            const left = -2.6;
            const right = 3.8;
            const top = 2.5;
            const bottom = -2.5;

            // Main path along the sides
            paths.push([
              { x: left, z: bottom },
              { x: right, z: bottom },
              { x: right, z: top },
              { x: left, z: top },
              { x: left, z: bottom + 0.9 }
            ]);

            // Add paths for parallel branches if there are components
            const branchCount = Math.max(problem.components.length, 1);
            const spacing = (right - left) / (branchCount + 1);

            for (let i = 0; i < branchCount; i++) {
              const x = left + spacing * (i + 1);
              paths.push([
                { x, z: top },
                { x, z: bottom }
              ]);
            }
          } else if (problem.topology === "combination") {
            // Combination: main series path with parallel section
            paths.push([
              { x: -4.2, z: -2.3 },   // Start
              { x: -4.2, z: 2.3 },    // Top left
              { x: 1.4, z: 2.3 },     // Branch top
              { x: 1.4, z: -2.3 },    // Drop node
              { x: -2.0, z: -2.3 },   // Bottom left
              { x: -4.2, z: -2.3 }    // Back to start
            ]);

            // Parallel branch path
            paths.push([
              { x: 1.4, z: 2.3 },
              { x: 3.2, z: 2.3 },
              { x: 3.2, z: -0.3 },
              { x: 1.4, z: -0.3 }
            ]);
          }

          return paths;
        };

        applyProblemRef.current = setCircuit;
          setCircuit(problemRef.current, standardRef.current);

        const clock = new three.Clock();
        let animationFrame = 0;

        const animate = () => {
          animationFrame = window.requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const deltaTime = clock.getDelta();
          updateCamera(false, three, camera);
          if (circuitGroup) {
            const wobble = Math.sin(elapsed * 0.35) * 0.12;
            circuitGroup.rotation.y = wobble;
            circuitGroup.position.y = Math.sin(elapsed * 0.45) * 0.04;
          }
          if (flowAnimationSystem) {
            flowAnimationSystem.update(deltaTime);
          }
          renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
          if (!container) {
            return;
          }
          renderer.setSize(container.clientWidth, container.clientHeight);
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("pointermove", handleCameraPointerMove);
          renderer.domElement.removeEventListener("pointerdown", handleCameraPointerDown);
          renderer.domElement.removeEventListener("pointerup", handleCameraPointerUp);
          renderer.domElement.removeEventListener("pointercancel", handleCameraPointerUp);
          renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
          renderer.domElement.removeEventListener("wheel", handleWheel);
          renderer.domElement.removeEventListener("contextmenu", () => {});
          if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          disposeThreeObject(scene);
          renderer.dispose();
        };
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        console.error("Failed to initialise schematic viewport", err);
        setError("Unable to load the WebGL renderer. Please ensure WebGL is supported and try again.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
    }, [CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET, CAMERA_RADIUS_LIMITS, CAMERA_PAN_LIMITS, CAMERA_PHI_LIMITS, normalizeAzimuth, updateCamera, applyPan]);

    useEffect(() => {
      if (applyProblemRef.current) {
        applyProblemRef.current(problem, symbolStandard);
      }
    }, [problem, symbolStandard]);

  return (
    <div className="schematic-viewport">
      <div ref={containerRef} className="schematic-canvas" />
      {loading && !error && <div className="schematic-status">Loading 3D engine…</div>}
      {error && <div className="schematic-status schematic-error">{error}</div>}
    </div>
  );
}
function loadThree(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("three.js can only be loaded in a browser environment"));
  }

  if (window.THREE) {
    return Promise.resolve(window.THREE);
  }

  if (threeLoaderPromise) {
    return threeLoaderPromise;
  }

  threeLoaderPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.THREE) {
        resolve(window.THREE);
      } else {
        reject(new Error("three.js failed to initialise"));
      }
    };

    const script = document.createElement("script");
    script.src = THREE_CDN;
    script.async = true;

    let attemptedFallback = false;

    script.addEventListener("load", finish);
    script.addEventListener("error", () => {
      if (attemptedFallback) {
        reject(new Error("Failed to load three.js from CDN and local fallback."));
        return;
      }
      attemptedFallback = true;
      const fallback = document.createElement("script");
      const base =
        typeof import.meta !== "undefined" && import.meta && import.meta.env && import.meta.env.BASE_URL
          ? import.meta.env.BASE_URL
          : "/";
      const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
      fallback.src = `${normalizedBase}/vendor/three.min.js`;
      fallback.async = true;
      fallback.addEventListener("load", finish);
      fallback.addEventListener("error", () =>
        reject(new Error("Failed to load three.js from both CDN and packaged fallback."))
      );
      document.body.appendChild(fallback);
    });

    document.body.appendChild(script);
  });

  return threeLoaderPromise;
}
