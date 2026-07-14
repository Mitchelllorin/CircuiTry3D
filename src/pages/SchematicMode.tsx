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
import RenderCatalogDrawer, { RenderCatalogSection } from "../components/schematic/RenderCatalogDrawer";
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

declare global {
  interface Window {
    THREE?: any;
  }
}

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

type SchematicRenderDrawerProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (mode: ViewMode) => void;
  onSelectProblem: (problemId: string) => void;
  onSelectCatalog: (entry: CatalogEntry) => void;
  selectedProblemId: string | null;
  selectedCatalogId: string;
  problems: PracticeProblem[];
  catalog: CatalogEntry[];
};

function SchematicRenderDrawer({
  open,
  onClose,
  onNavigate,
  onSelectProblem,
  onSelectCatalog,
  selectedProblemId,
  selectedCatalogId,
  problems,
  catalog,
}: SchematicRenderDrawerProps) {
  const [activeTab, setActiveTab] = useState<"scenes" | "components">("scenes");

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const groupedProblems = useMemo(() => groupProblems(problems), [problems]);

  const truncate = useCallback((text: string, limit = 140) => {
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit - 1)}…`;
  }, []);

  const handleProblemClick = useCallback(
    (problem: PracticeProblem) => {
      onSelectProblem(problem.id);
      onNavigate("practice");
      onClose();
    },
    [onClose, onNavigate, onSelectProblem]
  );

  const handleCatalogClick = useCallback(
    (entry: CatalogEntry) => {
      onSelectCatalog(entry);
      onNavigate("builder");
      onClose();
    },
    [onClose, onNavigate, onSelectCatalog]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="schematic-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="schematic-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schematic-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="schematic-drawer-header">
          <div>
            <h2 id="schematic-drawer-title">3D Render Catalog</h2>
            <p>
              Flip through every preset scene and component symbol without losing your place. Pick an item to jump
              directly into the matching view.
            </p>
          </div>
          <button
            type="button"
            className="schematic-drawer-close"
            aria-label="Close 3D render catalog"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <nav className="schematic-drawer-tabs" role="tablist" aria-label="Render catalog sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "scenes"}
            className={activeTab === "scenes" ? "drawer-tab is-active" : "drawer-tab"}
            onClick={() => setActiveTab("scenes")}
          >
            Practice Scenes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "components"}
            className={activeTab === "components" ? "drawer-tab is-active" : "drawer-tab"}
            onClick={() => setActiveTab("components")}
          >
            Component Symbols
          </button>
        </nav>

        <div className="schematic-drawer-body">
          {activeTab === "scenes" ? (
            problems.length ? (
              TOPOLOGY_ORDER.map((topology) => {
                const bucket = groupedProblems[topology];
                if (!bucket || !bucket.length) {
                  return null;
                }
                return (
                  <section key={topology} className="drawer-section">
                    <header className="drawer-section-header">
                      <h3>{TOPOLOGY_LABEL[topology]}</h3>
                      <span>{bucket.length} preset{bucket.length === 1 ? "" : "s"}</span>
                    </header>
                    <div className="drawer-card-list">
                      {bucket.map((problem) => (
                        <button
                          key={problem.id}
                          type="button"
                          className={
                            problem.id === selectedProblemId ? "drawer-card is-active" : "drawer-card"
                          }
                          onClick={() => handleProblemClick(problem)}
                        >
                          <span className="drawer-card-title">{problem.title}</span>
                          <span className="drawer-card-meta">
                            {DIFFICULTY_LABEL[problem.difficulty]} · {TOPOLOGY_LABEL[problem.topology]}
                          </span>
                          <p className="drawer-card-desc">{truncate(problem.prompt)}</p>
                          {problem.conceptTags.length > 0 && (
                            <ul className="drawer-card-tags">
                              {problem.conceptTags.map((tag) => (
                                <li key={tag}>{tag}</li>
                              ))}
                            </ul>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="drawer-empty">No practice presets available yet.</div>
            )
          ) : catalog.length ? (
            <section className="drawer-section">
              <header className="drawer-section-header">
                <h3>Component Symbols</h3>
                <span>{catalog.length} items</span>
              </header>
              <div className="drawer-component-grid">
                {catalog.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={
                      entry.id === selectedCatalogId ? "drawer-component is-active" : "drawer-component"
                    }
                    onClick={() => handleCatalogClick(entry)}
                  >
                    <span className="drawer-component-icon" aria-hidden="true">
                      {entry.icon}
                    </span>
                    <span className="drawer-component-name">{entry.name}</span>
                    <p className="drawer-component-desc">{entry.description}</p>
                    {entry.tags?.length ? (
                      <ul className="drawer-component-tags">
                        {entry.tags.map((tag) => (
                          <li key={tag}>{tag}</li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="drawer-empty">Component catalog is empty.</div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function SchematicMode() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialId, setDrawerInitialId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("practice");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    practiceProblems[0]?.id ?? DEFAULT_PRACTICE_PROBLEM?.id ?? null
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(COMPONENT_CATALOG[0]?.id ?? "");

  const handleProblemSelect = useCallback((problemId: string) => {
    setSelectedProblemId(problemId);
  }, []);

  const handleCatalogSelect = useCallback((entry: CatalogEntry) => {
    setSelectedCatalogId(entry.id);
  }, []);

  return (
    <div className="schematic-shell">
      <ComponentRenderDrawer open={drawerOpen} onClose={handleCloseCatalog} initialComponentId={drawerInitialId} />
      <header className="schematic-header">
        <div>
          <h1>Schematic Mode</h1>
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
          <button
            type="button"
            className="schematic-drawer-trigger"
            onClick={() => setDrawerOpen(true)}
          >
            Browse 3D Catalog
          </button>
        </div>
      </header>

      {viewMode === "practice" ? (
        <PracticeModeView selectedProblemId={selectedProblemId} onSelectProblem={handleProblemSelect} />
      ) : (
        <BuilderModeView selectedCatalogId={selectedCatalogId} onSelectCatalog={handleCatalogSelect} />
      )}

      <SchematicRenderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(mode) => setViewMode(mode)}
        onSelectProblem={handleProblemSelect}
        onSelectCatalog={handleCatalogSelect}
        selectedProblemId={selectedProblemId}
        selectedCatalogId={selectedCatalogId}
        problems={practiceProblems}
        catalog={COMPONENT_CATALOG}
      />
    </div>
  );
}

type PracticeModeViewProps = {
  selectedProblemId: string | null;
  onSelectProblem: (problemId: string) => void;
};

function PracticeModeView({ selectedProblemId, onSelectProblem }: PracticeModeViewProps) {
  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>({});
  const [worksheetComplete, setWorksheetComplete] = useState(false);
  const [renderDrawerOpen, setRenderDrawerOpen] = useState(false);
  const [renderDrawerDesktop, setRenderDrawerDesktop] = useState(false);

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
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const applyMatches = (matches: boolean) => {
      setRenderDrawerDesktop(matches);
      setRenderDrawerOpen(matches);
    };

    applyMatches(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyMatches(event.matches);
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (renderDrawerDesktop || !renderDrawerOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRenderDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renderDrawerDesktop, renderDrawerOpen]);

  useEffect(() => {
    setWorksheetEntries(baselineWorksheet);
    setWorksheetComplete(false);
    setTableRevealed(false);
    setStepsVisible(false);
    setAnswerRevealed(false);
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

  const renderCatalogSections = useMemo<RenderCatalogSection[]>(() => {
    return TOPOLOGY_ORDER.map((topology) => {
      const problems = grouped[topology] ?? [];
      if (!problems.length) {
        return null;
      }
      return {
        key: topology,
        label: TOPOLOGY_LABEL[topology],
        items: problems.map((problem) => ({
          id: problem.id,
          title: problem.title,
          topologyLabel: TOPOLOGY_LABEL[problem.topology],
          difficultyLabel: DIFFICULTY_LABEL[problem.difficulty],
          tags: problem.conceptTags,
          summary: problem.prompt,
          target: problem.targetQuestion,
        })),
      };
    }).filter((section): section is RenderCatalogSection => Boolean(section));
  }, [grouped]);

  const handleOpenRenderDrawer = useCallback(() => {
    setRenderDrawerOpen(true);
  }, []);

  const handleCloseRenderDrawer = useCallback(() => {
    if (!renderDrawerDesktop) {
      setRenderDrawerOpen(false);
    }
  }, [renderDrawerDesktop]);

  const handleSelectProblem = useCallback(
    (problemId: string) => {
      setSelectedProblemId(problemId);
      if (!renderDrawerDesktop) {
        setRenderDrawerOpen(false);
      }
    },
    [renderDrawerDesktop]
  );

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
      onSelectProblem(nextProblem.id);
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
                      onClick={() => onSelectProblem(problem.id)}
                    >
                      <strong>{problem.title}</strong>
                      <small>
                        {TOPOLOGY_LABEL[problem.topology]} · {DIFFICULTY_LABEL[problem.difficulty]}
                      </small>
                    </button>
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

        {!renderDrawerDesktop && (
          <div
            className="render-drawer-backdrop"
            data-open={renderDrawerOpen ? "true" : undefined}
            onClick={handleCloseRenderDrawer}
            aria-hidden="true"
          />
        )}
      </div>
    );
}

type BuilderModeViewProps = {
  selectedCatalogId: string;
  onSelectCatalog: (entry: CatalogEntry) => void;
};

function BuilderModeView({ selectedCatalogId, onSelectCatalog }: BuilderModeViewProps) {
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

  const handleCatalogSelect = useCallback(
    (entry: CatalogEntry) => {
      onSelectCatalog(entry);
      setDraft(null);
      setSelectedElementId(null);
      setFeedbackMessage(`${entry.name} ready for placement.`);
    },
    [onSelectCatalog]
  );

  useEffect(() => {
    if (!catalogSelectionRequest) {
      return;
    }
    const entry = COMPONENT_CATALOG.find((item) => item.id === catalogSelectionRequest);
    if (entry) {
      handleCatalogSelect(entry);
    }
    onCatalogSelectionHandled();
  }, [catalogSelectionRequest, handleCatalogSelect, onCatalogSelectionHandled]);

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
          circuitGroup = buildCircuitElements(three, practiceProblem);
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

function buildCircuitElements(three: any, problem: PracticeProblem) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

  const elements: SchematicElement[] = [];
  const nodeMap = new Map<string, Vec2>();

  const clonePoint = (point: Vec2): Vec2 => ({ x: point.x, z: point.z });
  const nextId = (() => {
    let counter = 0;
    return (prefix: string) => `${problem.id}-${prefix}-${counter++}`;
  })();

  const recordNode = (point: Vec2) => {
    nodeMap.set(pointKey(point), clonePoint(point));
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

  const strokeBetween = (startVec: any, endVec: any, radius: number, material: any) => {
    const direction = new three.Vector3().subVectors(endVec, startVec);
    const length = direction.length();
    if (length <= 1e-6) {
      return null;
    }

    const thickness = radius * 2;
    const geometry = new three.BoxGeometry(length, thickness, thickness);
    const mesh = new three.Mesh(geometry, material);
    const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    const quaternion = new three.Quaternion().setFromUnitVectors(
      new three.Vector3(1, 0, 0),
      direction.clone().normalize()
    );
    mesh.setRotationFromQuaternion(quaternion);
    return mesh;
  };

  const addWireSegment = (start: Vec2, end: Vec2) => {
    const startVec = toVec3(start, WIRE_HEIGHT);
    const endVec = toVec3(end, WIRE_HEIGHT);
    const mesh = strokeBetween(startVec, endVec, WIRE_RADIUS, wireMaterial);
    if (mesh) {
      group.add(mesh);
    }
    compressed.forEach(recordNode);
    elements.push({
      id: nextId("wire"),
      kind: "wire",
      path: compressed,
    });
  };

  const addTwoTerminal = (kind: TwoTerminalElement["kind"], start: Vec2, end: Vec2, label: string) => {
    const orientation: Orientation =
      Math.abs(end.x - start.x) >= Math.abs(end.z - start.z) ? "horizontal" : "vertical";
    recordNode(start);
    recordNode(end);
    elements.push({
      id: nextId(kind),
      kind,
      label,
      start: clonePoint(start),
      end: clonePoint(end),
      orientation,
    });
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
      const mesh = strokeBetween(segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
      if (mesh) {
        resistorGroup.add(mesh);
      }
    }

    const startVec = toVec3(start, COMPONENT_HEIGHT);
    const endVec = toVec3(end, COMPONENT_HEIGHT);
    const leadStart = strokeBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = strokeBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
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

    const leadStart = strokeBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = strokeBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
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
  const componentLabels = new Map(problem.components.map((component) => [component.id, component.label ?? component.id]));
  const labelFor = (id: string) => componentLabels.get(id) ?? id;

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

    addWire([start, batteryStart]);
    addBattery(batteryStart, batteryEnd, sourceLabel);
    addWire([batteryEnd, topLeft]);

    const componentCount = Math.max(problem.components.length, 1);
    const segmentWidth = (topRight.x - topLeft.x) / componentCount;
    const margin = Math.min(segmentWidth * 0.2, 0.5);

    let previousPoint: Vec2 = clonePoint(topLeft);
    problem.components.forEach((component, index) => {
      const startX = topLeft.x + index * segmentWidth + margin;
      const endX = topLeft.x + (index + 1) * segmentWidth - margin;
      const resistorStart: Vec2 = { x: startX, z: top };
      const resistorEnd: Vec2 = { x: endX, z: top };
      addWire([previousPoint, resistorStart]);
      addResistor(resistorStart, resistorEnd, component.label ?? component.id);
      previousPoint = resistorEnd;
    });

    addWire([previousPoint, topRight]);
    addWire([topRight, bottomRight]);
    addWire([bottomRight, start]);
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

    addWire([leftBottom, batteryStart]);
    addBattery(batteryStart, batteryEnd, sourceLabel);
    addWire([batteryEnd, leftTop]);
    addWire([leftTop, rightTop]);
    addWire([leftBottom, rightBottom]);

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

      addWire([topNode, resistorStart]);
      addResistor(resistorStart, resistorEnd, component.label ?? component.id);
      addWire([resistorEnd, bottomNode]);
    });
  };

  const buildCombination = () => {
    const start: Vec2 = { x: -4.2, z: -2.3 };
    const batteryStart: Vec2 = { x: -4.2, z: -1.5 };
    const batteryEnd: Vec2 = { x: -4.2, z: 1.5 };
    const topLeft: Vec2 = { x: -4.2, z: 2.3 };
    const topMid: Vec2 = { x: -1.2, z: 2.3 };
    const seriesTop: Vec2 = { x: 0.4, z: 2.3 };
    const branchTop: Vec2 = { x: 1.4, z: 2.3 };
    const branchRightTop: Vec2 = { x: 3.2, z: 2.3 };
    const branchBottom: Vec2 = { x: 1.4, z: -0.3 };
    const branchRightBottom: Vec2 = { x: 3.2, z: -0.3 };
    const dropNode: Vec2 = { x: 1.4, z: -2.3 };
    const bottomLeft: Vec2 = { x: -2.0, z: -2.3 };

    addWire([start, batteryStart]);
    addBattery(batteryStart, batteryEnd, sourceLabel);
    addWire([batteryEnd, topLeft]);
    addWire([topLeft, topMid]);

    addResistor(topMid, seriesTop, labelFor("R1"));
    addWire([seriesTop, branchTop]);

    addResistor(branchTop, branchBottom, labelFor("R2"));
    addWire([branchTop, branchRightTop]);

    addResistor(branchRightTop, branchRightBottom, labelFor("R3"));
    addWire([branchRightBottom, branchBottom]);
    addWire([branchBottom, dropNode]);

    addResistor(dropNode, bottomLeft, labelFor("R4"));
    addWire([bottomLeft, start]);
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

  elements.forEach((element) => {
    const { group: elementGroup, terminals } = buildElement(three, element, {});
    group.add(elementGroup);
    terminals.forEach((point) => {
      recordNode(point);
    });
  });

  nodeMap.forEach((point) => {
    const mesh = buildNodeMesh(three, point, {});
    group.add(mesh);
  });

  return group;
}

function buildCircuit(three: any, problem: PracticeProblem) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

  

  let idCounter = 0;
  const nextId = (prefix: string) => `${problem.id}-${prefix}-${idCounter++}`;

  const elements: SchematicElement[] = [];
  const nodeCandidates: Vec2[] = [];

  const addWire = (points: Vec2[]) => {
    if (points.length < 2) {
      return;
    }
    elements.push({
      id: nextId("wire"),
      kind: "wire",
      path: points.map((point) => ({ ...point })),
    });
    nodeCandidates.push(...points);
  };

  const addComponent = (kind: TwoTerminalElement["kind"], label: string, start: Vec2, end: Vec2) => {
    const orientation: Orientation = Math.abs(end.x - start.x) >= Math.abs(end.z - start.z) ? "horizontal" : "vertical";
    elements.push({
      id: nextId(kind),
      kind,
      label,
      start: { ...start },
      end: { ...end },
      orientation,
    });
    nodeCandidates.push(start, end);
  };

  const labelFor = (id: string) => componentLabels.get(id) ?? id;

  const buildSeriesElements = () => {
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

    addWire([start, batteryStart]);
    addComponent("battery", sourceLabel, batteryStart, batteryEnd);
    addWire([batteryEnd, topLeft]);

    const componentCount = Math.max(problem.components.length, 1);
    const segmentWidth = (topRight.x - topLeft.x) / componentCount;
    const margin = Math.min(segmentWidth * 0.2, 0.5);

    let previousPoint: Vec2 = topLeft;
    problem.components.forEach((component, index) => {
      const startX = topLeft.x + index * segmentWidth + margin;
      const endX = topLeft.x + (index + 1) * segmentWidth - margin;
      const resistorStart: Vec2 = { x: startX, z: top };
      const resistorEnd: Vec2 = { x: endX, z: top };
      addWire([previousPoint, resistorStart]);
      addComponent("resistor", labelFor(component.id), resistorStart, resistorEnd);
      previousPoint = resistorEnd;
    });

    addWire([previousPoint, topRight]);
    addWire([topRight, bottomRight]);
    addWire([bottomRight, start]);

    nodeCandidates.push(start, batteryStart, batteryEnd, topLeft, topRight, bottomRight);
  };

  const buildParallelElements = () => {
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

    addWire([leftBottom, batteryStart]);
    addComponent("battery", sourceLabel, batteryStart, batteryEnd);
    addWire([batteryEnd, leftTop]);

    const branchCount = Math.max(problem.components.length, 1);
    const spacing = (right - left) / (branchCount + 1);
    const branchSpan = Math.min(Math.abs(top - bottom) - 1, 4.2);
    const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, 0.6);

    const topRail: Vec2[] = [leftTop];
    const bottomRail: Vec2[] = [leftBottom];

    problem.components.forEach((component, index) => {
      const x = left + spacing * (index + 1);
      const topNode: Vec2 = { x, z: top };
      const bottomNode: Vec2 = { x, z: bottom };
      const resistorStart: Vec2 = { x, z: top - offset };
      const resistorEnd: Vec2 = { x, z: bottom + offset };

      topRail.push(topNode);
      bottomRail.push(bottomNode);

      addWire([topNode, resistorStart]);
      addComponent("resistor", labelFor(component.id), resistorStart, resistorEnd);
      addWire([resistorEnd, bottomNode]);

      nodeCandidates.push(topNode, bottomNode, resistorStart, resistorEnd);
    });

    topRail.push(rightTop);
    bottomRail.push(rightBottom);

    addWire(topRail);
    addWire(bottomRail);
    addWire([rightTop, rightBottom]);

    nodeCandidates.push(leftTop, rightTop, leftBottom, rightBottom, batteryStart, batteryEnd);
  };

  const buildCombinationElements = () => {
    const start: Vec2 = { x: -4.2, z: -2.3 };
    const batteryStart: Vec2 = { x: -4.2, z: -1.5 };
    const batteryEnd: Vec2 = { x: -4.2, z: 1.5 };
    const topLeft: Vec2 = { x: -4.2, z: 2.3 };
    const topMid: Vec2 = { x: -1.2, z: 2.3 };
    const seriesTop: Vec2 = { x: 0.4, z: 2.3 };
    const branchTop: Vec2 = { x: 1.4, z: 2.3 };
    const branchRightTop: Vec2 = { x: 3.2, z: 2.3 };
    const branchBottom: Vec2 = { x: 1.4, z: -0.3 };
    const branchRightBottom: Vec2 = { x: 3.2, z: -0.3 };
    const dropNode: Vec2 = { x: 1.4, z: -2.3 };
    const bottomLeft: Vec2 = { x: -2.0, z: -2.3 };

    addWire([start, batteryStart]);
    addComponent("battery", sourceLabel, batteryStart, batteryEnd);
    addWire([batteryEnd, topLeft]);
    addWire([topLeft, topMid]);

    addComponent("resistor", labelFor("R1"), topMid, seriesTop);
    addWire([seriesTop, branchTop]);
    addComponent("resistor", labelFor("R2"), branchTop, branchBottom);
    addWire([branchTop, branchRightTop]);
    addComponent("resistor", labelFor("R3"), branchRightTop, branchRightBottom);
    addWire([branchRightBottom, branchBottom]);
    addWire([branchBottom, dropNode]);
    addComponent("resistor", labelFor("R4"), dropNode, bottomLeft);
    addWire([bottomLeft, start]);

    nodeCandidates.push(
      start,
      batteryStart,
      batteryEnd,
      topLeft,
      topMid,
      seriesTop,
      branchTop,
      branchRightTop,
      branchBottom,
      branchRightBottom,
      dropNode,
      bottomLeft
    );
  };

  const presetKey = problem.presetHint ?? problem.topology;
  switch (presetKey) {
    case "parallel_basic":
      buildParallelElements();
      break;
    case "mixed_circuit":
      buildCombinationElements();
      break;
    case "series_basic":
    default:
      if (problem.topology === "parallel") {
        buildParallelElements();
      } else if (problem.topology === "combination") {
        buildCombinationElements();
      } else {
        buildSeriesElements();
      }
      break;
  }

  const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;
  const terminalKeys = new Set<string>();
  const terminalPoints: Vec2[] = [];

  const registerPoints = (points: Vec2[]) => {
    points.forEach((point) => {
      const key = pointKey(point);
      if (!terminalKeys.has(key)) {
        terminalKeys.add(key);
        terminalPoints.push(point);
      }
    });
  };

  elements.forEach((element) => {
    const { group: elementGroup, terminals } = buildElement(three, element, {});
    group.add(elementGroup);
    registerPoints(terminals);
  });

  nodeCandidates.forEach((point) => registerPoints([point]));

  terminalPoints.forEach((point) => {
    const mesh = buildNodeMesh(three, point, {});
    group.add(mesh);
  });

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
