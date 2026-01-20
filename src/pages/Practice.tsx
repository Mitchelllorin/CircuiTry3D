import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
  getRandomPracticeProblem,
} from "../data/practiceProblems";
import {
  CLEAN_SOLVE_BONUS,
  SPRINT_BONUS_BY_DIFFICULTY,
  SPRINT_TARGET_MS_BY_DIFFICULTY,
} from "../data/gamification";
import type { PracticeProblem } from "../model/practice";
import type { PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue, formatNumber } from "../utils/electrical";
import {
  trySolvePracticeProblem,
  type SolveAttempt,
  type SolveResult,
} from "../utils/practiceSolver";
import WireTable, {
  METRIC_ORDER,
  METRIC_PRECISION,
  type WireTableRow,
  type WorksheetEntry,
  type WorksheetEntryStatus,
} from "../components/practice/WireTable";
import SolutionSteps from "../components/practice/SolutionSteps";
import TriangleDeck from "../components/practice/TriangleDeck";
import OhmsLawWheel from "../components/practice/OhmsLawWheel";
import KirchhoffLaws from "../components/practice/KirchhoffLaws";
import CircuitDiagram from "../components/practice/CircuitDiagram";
import ResistorColorCode from "../components/practice/ResistorColorCode";
import { ProgressDashboard } from "../components/gamification/ProgressDashboard";
import CircuitGamesPanel from "../components/gamification/CircuitGamesPanel";
import { useGamification } from "../context/GamificationContext";
import { PracticeViewport } from "./SchematicMode";
import { useAdaptivePractice } from "../hooks/practice/useAdaptivePractice";
import {
  DEFAULT_SYMBOL_STANDARD,
  SYMBOL_STANDARD_OPTIONS,
  type SymbolStandard,
} from "../schematic/standards";
import WireLibrary from "../components/practice/WireLibrary";
import "../styles/practice.css";
import "../styles/schematic.css";

type ElectricalFormula = {
  id: string;
  category: "ohms-law" | "power" | "derived";
  formula: string;
  description: string;
  variables: { symbol: string; name: string }[];
};

const ELECTRICAL_FORMULAS: ElectricalFormula[] = [
  {
    id: "ohms-v",
    category: "ohms-law",
    formula: "E = I × R",
    description: "Voltage equals current times resistance",
    variables: [
      { symbol: "E", name: "Voltage (V)" },
      { symbol: "I", name: "Current (A)" },
      { symbol: "R", name: "Resistance (Ω)" },
    ],
  },
  {
    id: "ohms-i",
    category: "ohms-law",
    formula: "I = E / R",
    description: "Current equals voltage divided by resistance",
    variables: [
      { symbol: "I", name: "Current (A)" },
      { symbol: "E", name: "Voltage (V)" },
      { symbol: "R", name: "Resistance (Ω)" },
    ],
  },
  {
    id: "ohms-r",
    category: "ohms-law",
    formula: "R = E / I",
    description: "Resistance equals voltage divided by current",
    variables: [
      { symbol: "R", name: "Resistance (Ω)" },
      { symbol: "E", name: "Voltage (V)" },
      { symbol: "I", name: "Current (A)" },
    ],
  },
  {
    id: "power-ei",
    category: "power",
    formula: "P = E × I",
    description: "Power equals voltage times current",
    variables: [
      { symbol: "P", name: "Power (W)" },
      { symbol: "E", name: "Voltage (V)" },
      { symbol: "I", name: "Current (A)" },
    ],
  },
  {
    id: "power-i2r",
    category: "power",
    formula: "P = I² × R",
    description: "Power equals current squared times resistance",
    variables: [
      { symbol: "P", name: "Power (W)" },
      { symbol: "I", name: "Current (A)" },
      { symbol: "R", name: "Resistance (Ω)" },
    ],
  },
  {
    id: "power-e2r",
    category: "power",
    formula: "P = E² / R",
    description: "Power equals voltage squared divided by resistance",
    variables: [
      { symbol: "P", name: "Power (W)" },
      { symbol: "E", name: "Voltage (V)" },
      { symbol: "R", name: "Resistance (Ω)" },
    ],
  },
];

const TOPOLOGY_ORDER: PracticeTopology[] = [
  "series",
  "parallel",
  "combination",
];
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

type PracticeProps = {
  selectedProblemId?: string | null;
  onProblemChange?: (problem: PracticeProblem) => void;
  onWorksheetStatusChange?: (update: {
    problem: PracticeProblem;
    complete: boolean;
  }) => void;
};

const groupProblems = (problems: PracticeProblem[]): GroupedProblems =>
  problems.reduce<GroupedProblems>(
    (acc, problem) => {
      acc[problem.topology] = acc[problem.topology] || [];
      acc[problem.topology].push(problem);
      return acc;
    },
    { series: [], parallel: [], combination: [] },
  );

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

const shouldIncludeSource = (problem: PracticeProblem): boolean => {
  const { componentId } = problem.targetMetric;
  // Include source column only if the problem targets the source specifically
  return componentId === "source" || componentId === problem.source.id;
};

const buildTableRows = (
  problem: PracticeProblem,
  solution: SolveResult,
): WireTableRow[] => {
  const componentRows = problem.components.map((component) => ({
    id: component.id,
    label: component.label,
    role: "load" as const,
    givens: component.givens,
    metrics: solution.components[component.id],
  }));

  const includeSource = shouldIncludeSource(problem);

  const rows: WireTableRow[] = [];

  if (includeSource) {
    rows.push({
      id: problem.source.id,
      label: problem.source.label,
      role: "source" as const,
      givens: problem.source.givens,
      metrics: solution.source,
    });
  }

  rows.push(...componentRows);

  rows.push({
    id: "totals",
    label: "Circuit Totals",
    role: "total" as const,
    givens: problem.totalsGivens,
    metrics: solution.totals,
  });

  return rows;
};

const buildStepPresentations = (
  problem: PracticeProblem,
  solution: SolveResult,
) => problem.steps.map((step) => step(solution.stepContext));

const ensureProblem = (problem: PracticeProblem | null): PracticeProblem | null => {
  const fallback = DEFAULT_PRACTICE_PROBLEM;
  if (problem) {
    return problem;
  }
  if (!fallback) {
    return null;
  }
  return fallback;
};

const findProblem = (id: string | null): PracticeProblem | null =>
  ensureProblem(findPracticeProblemById(id));

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

const withinTolerance = (
  expected: number,
  actual: number,
  tolerance = 0.01,
): boolean => {
  const absoluteExpected = Math.abs(expected);
  const absoluteDiff = Math.abs(expected - actual);

  if (absoluteExpected < 1e-4) {
    return absoluteDiff <= 1e-3;
  }

  return absoluteDiff / absoluteExpected <= tolerance;
};

const formatSeedValue = (value: number, key: WireMetricKey) =>
  formatNumber(value, METRIC_PRECISION[key]);

type PracticeHintDialogProps = {
  open: boolean;
  id: string;
  title: string;
  onClose(): void;
  children: ReactNode;
};

function PracticeHintDialog({
  open,
  id,
  title,
  onClose,
  children,
}: PracticeHintDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="practice-hint-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        id={id}
        ref={dialogRef}
        className="practice-hint-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="practice-hint-close"
          onClick={onClose}
          aria-label="Close practice hint"
        >
          X
        </button>
        <h3 id={`${id}-title`}>{title}</h3>
        <div id={`${id}-body`} className="practice-hint-body">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Practice({
  selectedProblemId,
  onProblemChange,
  onWorksheetStatusChange,
}: PracticeProps = {}) {
  const fallbackProblemId = DEFAULT_PRACTICE_PROBLEM?.id ?? null;
  const [internalProblemId, setInternalProblemId] = useState<string | null>(
    () => {
      if (selectedProblemId !== undefined && selectedProblemId !== null) {
        return findProblem(selectedProblemId).id;
      }
      return fallbackProblemId;
    },
  );
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>({});
  const [worksheetComplete, setWorksheetComplete] = useState(false);
  const [assistUsed, setAssistUsed] = useState(false);
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintElapsedMs, setSprintElapsedMs] = useState(0);
  const [sprintLastMs, setSprintLastMs] = useState<number | null>(null);
  const [activeHint, setActiveHint] = useState<"target" | "worksheet" | null>(
    null,
  );
  const [symbolStandard, setSymbolStandard] = useState<SymbolStandard>(
    DEFAULT_SYMBOL_STANDARD,
  );
  const { recordCompletion, state: gamificationState } = useGamification();
  const lastControlledProblemId = useRef<string | null | undefined>(
    selectedProblemId,
  );
  const lastReportedProblemId = useRef<string | null>(null);
  const lastWorksheetReport = useRef<{
    problemId: string;
    complete: boolean;
  } | null>(null);
  const lastChallengeReport = useRef<{
    problemId: string;
    complete: boolean;
  } | null>(null);
  const diagramAnchorRef = useRef<HTMLDivElement | null>(null);
  const ohmsWheelRef = useRef<HTMLDivElement | null>(null);
  const sprintStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedProblemId === undefined) {
      lastControlledProblemId.current = undefined;
      return;
    }

    if (lastControlledProblemId.current === selectedProblemId) {
      return;
    }

    lastControlledProblemId.current = selectedProblemId;

    const resolved = findProblem(selectedProblemId);
    if (resolved.id !== internalProblemId) {
      setInternalProblemId(resolved.id);
      setTableRevealed(false);
      setStepsVisible(false);
      setAnswerRevealed(false);
      setActiveHint(null);
      resetArcade();
    }
  }, [internalProblemId, resetArcade, selectedProblemId]);

  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const selectedProblem = useMemo(
    () => findProblem(internalProblemId),
    [internalProblemId],
  );

  const solutionResult = useMemo((): SolveAttempt => {
    if (!selectedProblem) {
      return { ok: false, error: "No practice problems available" };
    }
    return trySolvePracticeProblem(selectedProblem);
  }, [selectedProblem]);
  const solution = solutionResult.ok ? solutionResult.data : null;
  const tableRows = useMemo(
    () => (selectedProblem && solution ? buildTableRows(selectedProblem, solution) : []),
    [selectedProblem, solution],
  );
  const stepPresentations = useMemo(
    () => (selectedProblem && solution ? buildStepPresentations(selectedProblem, solution) : []),
    [selectedProblem, solution],
  );

  const {
    recordAttempt: registerAdaptiveAttempt,
    insights: adaptiveInsights,
    recommendations: adaptiveRecommendations,
    helperTargets: adaptiveHelperTargets,
  } = useAdaptivePractice({
    problems: practiceProblems,
    selectedProblem,
    worksheetComplete,
  });

  const scrollToDiagram = useCallback(() => {
    diagramAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const scrollToOhmsWheel = useCallback(() => {
    ohmsWheelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const formatAdaptiveValue = useCallback((value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "—";
    }
    const rounded = value >= 1 ? value.toFixed(1) : value.toFixed(2);
    return rounded.replace(/\.0$/, "");
  }, []);

  const toConceptLabel = useCallback((tag?: string) => {
    if (!tag) {
      return undefined;
    }
    return tag
      .split(/[-_]/g)
      .map((segment) =>
        segment ? segment[0]?.toUpperCase() + segment.slice(1) : segment,
      )
      .join(" ")
      .trim();
  }, []);

  const toggleHint = useCallback((hint: "target" | "worksheet") => {
    setActiveHint((previous) => (previous === hint ? null : hint));
  }, []);

  const resetSprint = useCallback(() => {
    sprintStartRef.current = null;
    setSprintActive(false);
    setSprintElapsedMs(0);
    setSprintLastMs(null);
  }, []);

  const resetArcade = useCallback(() => {
    setAssistUsed(false);
    resetSprint();
  }, [resetSprint]);

  const handleStartSprint = useCallback(() => {
    sprintStartRef.current = Date.now();
    setSprintElapsedMs(0);
    setSprintLastMs(null);
    setSprintActive(true);
  }, []);

  const handleResetSprint = useCallback(() => {
    resetSprint();
  }, [resetSprint]);

  const selectProblemById = useCallback((problemId: string) => {
    const next = findProblem(problemId);
    setInternalProblemId(next.id);
    setTableRevealed(false);
    setStepsVisible(false);
    setAnswerRevealed(false);
    setActiveHint(null);
    resetArcade();
  }, [resetArcade]);

  const handleToggleTable = useCallback(() => {
    setTableRevealed((value) => {
      const next = !value;
      if (next && !worksheetComplete) {
        setAssistUsed(true);
      }
      return next;
    });
  }, [worksheetComplete]);

  const handleToggleSteps = useCallback(() => {
    setStepsVisible((value) => {
      const next = !value;
      if (next && !worksheetComplete) {
        setAssistUsed(true);
      }
      return next;
    });
  }, [worksheetComplete]);

  const handleToggleAnswer = useCallback(() => {
    setAnswerRevealed((value) => {
      const next = !value;
      if (next && !worksheetComplete) {
        setAssistUsed(true);
      }
      return next;
    });
  }, [worksheetComplete]);

  const targetHintOpen = activeHint === "target";
  const worksheetHintOpen = activeHint === "worksheet";

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

  useEffect(() => {
    if (!selectedProblem) {
      return;
    }

    if (lastReportedProblemId.current === selectedProblem.id) {
      return;
    }

    onProblemChange?.(selectedProblem);
    lastReportedProblemId.current = selectedProblem.id;
  }, [onProblemChange, selectedProblem]);

  const baselineWorksheet = useMemo(() => {
    const baseline: WorksheetState = {};

    tableRows.forEach((row) => {
      baseline[row.id] = {} as Record<WireMetricKey, WorksheetEntry>;

      METRIC_ORDER.forEach((key) => {
        const given =
          typeof row.givens?.[key] === "number" &&
          Number.isFinite(row.givens[key]);
        const expected = expectedValues[row.id]?.[key];
        baseline[row.id][key] = {
          raw:
            given && Number.isFinite(expected)
              ? formatSeedValue(expected!, key)
              : "",
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
  }, [baselineWorksheet, selectedProblem?.id]);

  useEffect(() => {
    if (!sprintActive || worksheetComplete || !sprintStartRef.current) {
      return;
    }
    const interval = window.setInterval(() => {
      if (sprintStartRef.current) {
        setSprintElapsedMs(Date.now() - sprintStartRef.current);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sprintActive, worksheetComplete]);

  useEffect(() => {
    if (!selectedProblem) {
      return;
    }
    const currentProblemId = selectedProblem.id;
    const previous = lastChallengeReport.current;

    if (!worksheetComplete) {
      if (!previous || previous.problemId !== currentProblemId || previous.complete) {
        lastChallengeReport.current = {
          problemId: currentProblemId,
          complete: false,
        };
      }
      return;
    }

    if (previous && previous.problemId === currentProblemId && previous.complete) {
      return;
    }

    let elapsedMs: number | undefined;
    if (sprintStartRef.current) {
      elapsedMs = Date.now() - sprintStartRef.current;
      sprintStartRef.current = null;
      setSprintActive(false);
      setSprintElapsedMs(elapsedMs);
      setSprintLastMs(elapsedMs);
    }

    recordCompletion(selectedProblem, {
      usedAssist: assistUsed,
      elapsedMs,
    });
    lastChallengeReport.current = {
      problemId: currentProblemId,
      complete: true,
    };
  }, [assistUsed, recordCompletion, selectedProblem, worksheetComplete]);

  useEffect(() => {
    if (worksheetComplete && !answerRevealed) {
      setAnswerRevealed(true);
    }
  }, [worksheetComplete, answerRevealed]);

  useEffect(() => {
    if (!selectedProblem) {
      return;
    }

    const nextStatus = {
      problemId: selectedProblem.id,
      complete: worksheetComplete,
    };
    const previous = lastWorksheetReport.current;

    if (
      previous &&
      previous.problemId === nextStatus.problemId &&
      previous.complete === nextStatus.complete
    ) {
      return;
    }

    onWorksheetStatusChange?.({
      problem: selectedProblem,
      complete: worksheetComplete,
    });
    lastWorksheetReport.current = nextStatus;
  }, [onWorksheetStatusChange, selectedProblem, worksheetComplete]);

  useEffect(() => {
    if (!activeHint) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveHint(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeHint]);

  useEffect(() => {
    setActiveHint(null);
  }, [selectedProblem?.id]);

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

  const sprintTargetMs = selectedProblem
    ? SPRINT_TARGET_MS_BY_DIFFICULTY[selectedProblem.difficulty]
    : SPRINT_TARGET_MS_BY_DIFFICULTY.intro;
  const sprintBonusXp = selectedProblem
    ? SPRINT_BONUS_BY_DIFFICULTY[selectedProblem.difficulty]
    : 0;
  const sprintBestMs = selectedProblem ? gamificationState.bestTimes[selectedProblem.id] : undefined;

  const activeStandardLabel = useMemo(
    () =>
      SYMBOL_STANDARD_OPTIONS.find((option) => option.key === symbolStandard)
        ?.label ?? "",
    [symbolStandard],
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

  const handleWorksheetChange = (
    rowId: string,
    key: WireMetricKey,
    raw: string,
  ) => {
    setWorksheetEntries((prev) => {
      const next: WorksheetState = { ...prev };
      const previousRow = prev[rowId] ?? {};
      const row: Record<WireMetricKey, WorksheetEntry> = {
        ...previousRow,
      } as Record<WireMetricKey, WorksheetEntry>;

      const matchingRow = tableRows.find((entry) => entry.id === rowId);
      const givenFromRow =
        typeof matchingRow?.givens?.[key] === "number" &&
        Number.isFinite(matchingRow.givens[key]);

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

      if (status !== baseCell.status) {
        registerAdaptiveAttempt({
          metric: key,
          status,
          previousStatus: baseCell.status,
        });
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
    const currentIndex = bucket.findIndex(
      (problem) => problem.id === selectedProblem.id,
    );
    const nextProblem =
      (currentIndex >= 0 && bucket[(currentIndex + 1) % bucket.length]) ||
      practiceProblems[0] ||
      null;

    if (nextProblem) {
      selectProblemById(nextProblem.id);
    }
  };

  const handleShuffleProblem = useCallback(() => {
    if (!practiceProblems.length) {
      return;
    }
    let next = getRandomPracticeProblem();
    if (!next) {
      return;
    }
    if (selectedProblem && practiceProblems.length > 1) {
      let attempts = 0;
      while (next && next.id === selectedProblem.id && attempts < 5) {
        next = getRandomPracticeProblem();
        attempts += 1;
      }
    }
    if (next) {
      selectProblemById(next.id);
    }
  }, [selectedProblem, selectProblemById]);

  if (!selectedProblem || !solution) {
    return (
      <div className="practice-page">
        <aside className="practice-sidebar">
          <h2>Practice</h2>
          <p className="schematic-empty">
            {solutionResult.ok ? "No practice problems are available." : solutionResult.error}
          </p>
        </aside>
        <main className="practice-main">
          <header className="practice-header">
            <h1>Practice Lab</h1>
            <p>Practice presets are unavailable right now.</p>
          </header>
        </main>
      </div>
    );
  }

  return (
    <>
      <PracticeHintDialog
        open={targetHintOpen}
        id="practice-target-hint"
        title="Target Value Guide"
        onClose={() => setActiveHint(null)}
      >
        <p>
          The question mark flags the metric that the prompt expects you to
          solve.
        </p>
        <ul>
          <li>
            Use the worksheet and circuit diagram to capture every given before
            you calculate the unknowns.
          </li>
          <li>
            Lean on the formula deck and solving steps to choose the right
            Ohm&apos;s Law or power identity.
          </li>
          <li>
            Once your entries are green, reveal the answer to compare your work
            with the solved circuit.
          </li>
        </ul>
        <button
          type="button"
          className="practice-hint-dismiss"
          onClick={() => setActiveHint(null)}
        >
          Back to worksheet
        </button>
      </PracticeHintDialog>

      <PracticeHintDialog
        open={worksheetHintOpen}
        id="practice-worksheet-hint"
        title="Worksheet Walkthrough"
        onClose={() => setActiveHint(null)}
      >
        <p>
          The plus icon opens the worksheet playbook so you always know how to
          progress:
        </p>
        <ul>
          <li>
            Lock in the givens first - they populate the worksheet automatically
            when you load a problem.
          </li>
          <li>
            Fill each blank W.I.R.E. cell by pairing a known value with the
            correct formula; the cell turns green when it matches the solved
            circuit.
          </li>
          <li>
            Every unknown must be correct to unlock the next challenge, so take
            your time and check totals against the circuit diagram.
          </li>
        </ul>
        <button
          type="button"
          className="practice-hint-dismiss"
          onClick={() => setActiveHint(null)}
        >
          Back to worksheet
        </button>
      </PracticeHintDialog>

      <div className="practice-page">
        <aside className="practice-sidebar">
          {TOPOLOGY_ORDER.map((topology) => {
            const bucket = grouped[topology];
            if (!bucket.length) {
              return null;
            }
            return (
              <div key={topology}>
                <h2>{TOPOLOGY_LABEL[topology]}</h2>
                <div className="problem-list">
                  {bucket.map((problem) => (
                    <button
                      key={problem.id}
                      type="button"
                      className="problem-button"
                      data-active={
                        problem.id === selectedProblem.id ? "true" : undefined
                      }
                      onClick={() => selectProblemById(problem.id)}
                    >
                      <strong>{problem.title}</strong>
                      <small>
                        {TOPOLOGY_LABEL[problem.topology]} ·{" "}
                        {DIFFICULTY_LABEL[problem.difficulty]}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>
        <main className="practice-main">
          <header className="practice-header">
            <h1>{selectedProblem.title}</h1>
            <span className="difficulty-pill">
              {DIFFICULTY_LABEL[selectedProblem.difficulty]}
            </span>
            <div className="tag-group" aria-label="Concept tags">
              {selectedProblem.conceptTags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <section className="problem-overview">
            <div className="problem-overview-content">
              <div className="prompt-card">
                <strong>Practice Prompt</strong>
                <p>{selectedProblem.prompt}</p>
              </div>

              <section className="target-card" aria-live="polite">
                <div className="target-icon-wrapper">
                  <button
                    type="button"
                    className="target-icon"
                    onClick={() => toggleHint("target")}
                    aria-label="Explain the question mark icon"
                    aria-haspopup="dialog"
                    aria-expanded={targetHintOpen}
                    aria-controls="practice-target-hint"
                  >
                    ?
                  </button>
                </div>
                <div>
                  <div className="target-question">
                    {selectedProblem.targetQuestion}
                  </div>
                  <div className="target-answer">
                    {answerRevealed && Number.isFinite(targetValue) ? (
                      formatMetricValue(
                        targetValue as number,
                        selectedProblem.targetMetric.key,
                      )
                    ) : (
                      <span>Reveal the answer when you&apos;re ready.</span>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="problem-overview-diagram" ref={diagramAnchorRef}>
              <div className="practice-diagram-inline">
                <CircuitDiagram problem={selectedProblem} />
              </div>
              <div className="practice-schematic-controls">
                <div
                  className="practice-standard-control-compact"
                  role="group"
                  aria-label="Schematic symbol standard"
                >
                  <span className="practice-standard-label">3D Standard</span>
                  <div className="practice-standard-buttons">
                    {SYMBOL_STANDARD_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        data-active={
                          symbolStandard === option.key ? "true" : undefined
                        }
                        onClick={() => setSymbolStandard(option.key)}
                        title={option.description}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="practice-visual-caption">
                Rendering {activeStandardLabel} symbols in the 3D workspace.
              </p>
            </div>
          </section>

          <ProgressDashboard />

          <CircuitGamesPanel
            problem={selectedProblem}
            worksheetComplete={worksheetComplete}
            assistUsed={assistUsed}
            sprintActive={sprintActive}
            sprintElapsedMs={sprintElapsedMs}
            sprintTargetMs={sprintTargetMs}
            sprintBonusXp={sprintBonusXp}
            cleanBonusXp={CLEAN_SOLVE_BONUS}
            sprintBestMs={sprintBestMs}
            sprintLastMs={sprintLastMs}
            cleanSolves={gamificationState.cleanSolves}
            speedSolves={gamificationState.speedSolves}
            onStartSprint={handleStartSprint}
            onResetSprint={handleResetSprint}
            onShuffleProblem={handleShuffleProblem}
          />

          <section className="adaptive-card" aria-live="polite">
            <div className="adaptive-card-header">
              <div>
                <h2>Adaptive Practice Path</h2>
                <p>
                  {adaptiveInsights.hasMistakes
                    ? "We’re queuing challenges that reinforce the concepts you’ve missed recently."
                    : "Solve a few worksheet cells and we’ll personalize the next wave of circuits."}
                </p>
              </div>
              <span className="adaptive-pill">
                {adaptiveInsights.hasMistakes ? "Focus Mode" : "Warm-Up"}
              </span>
            </div>
            <div className="adaptive-card-stats">
              <div className="adaptive-stat">
                <span className="adaptive-stat-label">Concept focus</span>
                <strong>
                  {adaptiveInsights.focusConceptLabel ??
                    toConceptLabel(selectedProblem.conceptTags[0]) ??
                    "Dialing in concepts"}
                </strong>
                <small>
                  {adaptiveInsights.focusConceptCount > 0
                    ? `${formatAdaptiveValue(adaptiveInsights.focusConceptCount)} recent misses`
                    : "Tracking your first entries"}
                </small>
              </div>
              <div className="adaptive-stat">
                <span className="adaptive-stat-label">Metric focus</span>
                <strong>
                  {adaptiveInsights.focusMetricLabel ?? "W.I.R.E. overview"}
                </strong>
                <small>
                  {adaptiveInsights.focusMetricCount > 0
                    ? `${formatAdaptiveValue(adaptiveInsights.focusMetricCount)} misses`
                    : "Watching watts, amps, ohms, volts"}
                </small>
              </div>
            </div>
            {adaptiveHelperTargets.length ? (
              <div className="adaptive-helpers">
                <span className="adaptive-helpers-label">Jump to helper</span>
                <div className="adaptive-helper-buttons">
                  {adaptiveHelperTargets.map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={target === "diagram" ? scrollToDiagram : scrollToOhmsWheel}
                    >
                      {target === "diagram"
                        ? "View Circuit Diagram"
                        : "Open Ohm's Law Wheel"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="adaptive-queue">
              <div className="adaptive-queue-header">
                <h3>Next up</h3>
                <span>Prioritized by recent performance</span>
              </div>
              {adaptiveRecommendations.length ? (
                <div className="adaptive-queue-list">
                  {adaptiveRecommendations.map((item) => (
                    <button
                      key={item.problem.id}
                      type="button"
                      className="adaptive-queue-item"
                      onClick={() => selectProblemById(item.problem.id)}
                    >
                      <div className="adaptive-queue-copy">
                        <strong>{item.problem.title}</strong>
                        <small>{item.reason}</small>
                      </div>
                      <span className="adaptive-queue-meta">
                        {`${TOPOLOGY_LABEL[item.problem.topology]} · ${
                          DIFFICULTY_LABEL[item.problem.difficulty]
                        }`}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="adaptive-queue-empty">
                  Complete a W.I.R.E. table to unlock personalized sequencing.
                </p>
              )}
            </div>
          </section>

          <section className="practice-grid">
            <div className="worksheet-controls">
              <button
                type="button"
                onClick={handleToggleTable}
              >
                {tableRevealed ? "Hide Worksheet Answers" : "Reveal Worksheet"}
              </button>
              <button
                type="button"
                onClick={handleToggleSteps}
              >
                {stepsVisible ? "Hide Steps" : "Show Solving Steps"}
              </button>
              <button
                type="button"
                onClick={handleToggleAnswer}
              >
                {answerRevealed ? "Hide Final Answer" : "Reveal Final Answer"}
              </button>
              <button
                type="button"
                onClick={advanceToNextProblem}
                className="next-problem"
              >
                Next Problem
              </button>
            </div>

            <div
              className="worksheet-status-banner"
              role="status"
              aria-live="polite"
              data-complete={worksheetComplete ? "true" : undefined}
            >
              <div className="worksheet-status-header">
                <strong>
                  {worksheetComplete
                    ? "Worksheet Complete"
                    : "Fill the W.I.R.E. table"}
                </strong>
                <button
                  type="button"
                  className="worksheet-icon-button"
                  onClick={() => toggleHint("worksheet")}
                  aria-label="Show worksheet help"
                  aria-haspopup="dialog"
                  aria-expanded={worksheetHintOpen}
                  aria-controls="practice-worksheet-hint"
                >
                  +
                </button>
              </div>
              <span>
                {worksheetComplete
                  ? "Every unknown matches the solved circuit. Advance when you're ready."
                  : "Enter the missing watts, amps, ohms, and volts using the circuit diagram and formula helpers."}
              </span>
            </div>

            <div className="worksheet-sync" role="status" aria-live="polite">
              <strong>Synced to schematic</strong>
              <span>
                {`Givens from ${selectedProblem.title} are locked in. Update only the unknowns and compare against the circuit diagram as you go.`}
              </span>
            </div>

            <div className="practice-table-wrapper">
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

            <div className="practice-wire-metrics">
              <div className="practice-wire-metrics-header">
                <h3>W.I.R.E. Overall Metrics</h3>
                <p>Circuit totals based on your current problem</p>
              </div>
              <div className="practice-wire-metrics-grid">
                <div className="practice-wire-metric metric-w">
                  <div className="wire-metric-letter">W</div>
                  <div className="wire-metric-value">
                    {answerRevealed || tableRevealed
                      ? formatMetricValue(solution.totals.watts, "watts")
                      : "—"}
                  </div>
                  <div className="wire-metric-label">Watts</div>
                </div>
                <div className="practice-wire-metric metric-i">
                  <div className="wire-metric-letter">I</div>
                  <div className="wire-metric-value">
                    {answerRevealed || tableRevealed
                      ? formatMetricValue(solution.totals.current, "current")
                      : "—"}
                  </div>
                  <div className="wire-metric-label">Current</div>
                </div>
                <div className="practice-wire-metric metric-r">
                  <div className="wire-metric-letter">R</div>
                  <div className="wire-metric-value">
                    {answerRevealed || tableRevealed
                      ? formatMetricValue(solution.totals.resistance, "resistance")
                      : "—"}
                  </div>
                  <div className="wire-metric-label">Resistance</div>
                </div>
                <div className="practice-wire-metric metric-e">
                  <div className="wire-metric-letter">E</div>
                  <div className="wire-metric-value">
                    {answerRevealed || tableRevealed
                      ? formatMetricValue(solution.totals.voltage, "voltage")
                      : "—"}
                  </div>
                  <div className="wire-metric-label">Voltage</div>
                </div>
              </div>
            </div>

            <div className="practice-formula-reference">
              <div className="practice-formula-reference-header">
                <h3>W.I.R.E. Formula Reference</h3>
                <p>Essential electrical calculations for circuit analysis</p>
              </div>
              <div className="practice-formula-reference-grid">
                {ELECTRICAL_FORMULAS.map((formula) => (
                  <div key={formula.id} className="practice-formula-card">
                    <div className="formula-expression">{formula.formula}</div>
                    <div className="formula-description">
                      {formula.description}
                    </div>
                    <div className="formula-variables">
                      {formula.variables.map((v, idx) => (
                        <div
                          key={v.symbol}
                          className={
                            idx < formula.variables.length - 1
                              ? "formula-variable"
                              : "formula-variable formula-variable-last"
                          }
                        >
                          <span className="variable-symbol">{v.symbol}</span>
                          {" = "}
                          {v.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <WireLibrary />

            <SolutionSteps steps={stepPresentations} visible={stepsVisible} />

            {/* Learning Objectives, Hints, Tips & Facts */}
            {(selectedProblem.learningObjective || selectedProblem.hints?.length || selectedProblem.tips?.length || selectedProblem.facts?.length) && (
              <section className="practice-learning">
                <div className="practice-learning-header">
                  <div className="practice-learning-icon" aria-hidden="true">
                    <span role="img" aria-label="lightbulb">&#128161;</span>
                  </div>
                  <h3>Learning Guide</h3>
                </div>

                {selectedProblem.learningObjective && (
                  <p className="learning-objective">
                    <strong>Objective:</strong> {selectedProblem.learningObjective}
                  </p>
                )}

                {selectedProblem.hints && selectedProblem.hints.length > 0 && (
                  <ul className="practice-hints-list">
                    {selectedProblem.hints.map((hint, index) => (
                      <li key={index} className="practice-hint-item">
                        <span className="hint-number">{index + 1}</span>
                        <div className="hint-content">
                          <p className="hint-text">{hint.text}</p>
                          {hint.formula && (
                            <code className="hint-formula">{hint.formula}</code>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {(selectedProblem.tips?.length || selectedProblem.facts?.length) && (
                  <div className="practice-tips-facts">
                    {selectedProblem.tips && selectedProblem.tips.length > 0 && (
                      <div className="practice-tips">
                        <h4>Quick Tips</h4>
                        <ul>
                          {selectedProblem.tips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedProblem.facts && selectedProblem.facts.length > 0 && (
                      <div className="practice-facts">
                        <h4>Did You Know?</h4>
                        <ul>
                          {selectedProblem.facts.map((fact, index) => (
                            <li key={index}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedProblem.realWorldExample && (
                  <div className="practice-real-world">
                    <h4>Real-World Application</h4>
                    <p>{selectedProblem.realWorldExample}</p>
                  </div>
                )}
              </section>
            )}
          </section>

          <section className="practice-supplement">
            <KirchhoffLaws />
            <TriangleDeck />
            <div ref={ohmsWheelRef} id="practice-ohms-wheel" className="practice-helper-anchor">
              <OhmsLawWheel />
            </div>
            <ResistorColorCode />
          </section>
        </main>
      </div>
    </>
  );
}
