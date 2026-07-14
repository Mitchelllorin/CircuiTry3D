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


