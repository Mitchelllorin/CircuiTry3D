import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  SymbolStandard,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../schematic/threeFactory";
import { DEFAULT_SYMBOL_STANDARD, SYMBOL_STANDARD_OPTIONS, isSymbolStandard } from "../schematic/standards";

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

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Mode</h1>
          <p>{MODE_SUMMARY[viewMode]}</p>
        </div>
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
      </header>

      {viewMode === "practice" ? <PracticeModeView /> : <BuilderModeView />}
    </div>
  );
}

function PracticeModeView() {
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
            <SchematicViewport problem={selectedProblem} />
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

function BuilderModeView() {
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
  symbolStandard: SymbolStandard;
  onBoardPointClick: (point: Vec2, event: PointerEvent) => void;
  onBoardPointMove: (point: Vec2 | null) => void;
  onElementClick: (elementId: string, event: PointerEvent) => void;
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
}: BuilderViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          updateRaycasterFromEvent(event);
          const boardHit = intersectBoard();
          if (boardHit) {
            onBoardPointMove({ x: boardHit.point.x, z: boardHit.point.z });
          } else {
            onBoardPointMove(null);
          }
        };

        const handlePointerDown = (event: PointerEvent) => {
          if (event.button !== 0) {
            return;
          }
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
        };

        const handlePointerLeave = () => {
          onBoardPointMove(null);
        };

        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

        rebuildSceneContent();

        const animate = () => {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };

        animate();

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrameRef.current);
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
          renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
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
};

function PracticeViewport({ problem }: PracticeViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const problemRef = useRef<PracticeProblem>(problem);
  problemRef.current = problem;

  const applyProblemRef = useRef<((nextProblem: PracticeProblem) => void) | null>(null);

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
        scene.add(board);

        const grid = new three.GridHelper(12, 12, 0xcbd5f5, 0xe2e8f0);
        grid.position.y = 0.02;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.22;
        }
        scene.add(grid);

        let circuitGroup: any = null;

        const setCircuit = (practiceProblem: PracticeProblem) => {
          if (circuitGroup) {
            scene.remove(circuitGroup);
            disposeThreeObject(circuitGroup);
            circuitGroup = null;
          }
          circuitGroup = buildCircuit(three, practiceProblem);
          scene.add(circuitGroup);
        };

        applyProblemRef.current = setCircuit;
        setCircuit(problemRef.current);

        const clock = new three.Clock();
        let animationFrame = 0;

        const animate = () => {
          animationFrame = window.requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          if (circuitGroup) {
            const wobble = Math.sin(elapsed * 0.35) * 0.12;
            circuitGroup.rotation.y = wobble;
            circuitGroup.position.y = Math.sin(elapsed * 0.45) * 0.04;
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
  }, []);

  useEffect(() => {
    if (applyProblemRef.current) {
      applyProblemRef.current(problem);
    }
  }, [problem]);

  return (
    <div className="schematic-viewport">
      <div ref={containerRef} className="schematic-canvas" />
      {loading && !error && <div className="schematic-status">Loading 3D engine…</div>}
      {error && <div className="schematic-status schematic-error">{error}</div>}
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
