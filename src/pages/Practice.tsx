import { useCallback, useEffect, useMemo, useState } from "react";
import practiceProblems from "../data/practiceProblems";
import type { PracticeProblem } from "../model/practice";
import type { PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue, formatNumber } from "../utils/electrical";
import { solvePracticeProblem, type SolveResult } from "../utils/practiceSolver";
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
import CircuitDiagram from "../components/practice/CircuitDiagram";
import "../styles/practice.css";

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
      label: "Totals",
      role: "total" as const,
      givens: problem.totalsGivens,
      metrics: solution.totals,
    },
  ];
};

const buildStepPresentations = (problem: PracticeProblem, solution: SolveResult) =>
  problem.steps.map((step) => step(solution.stepContext));

const findProblem = (id: string | null): PracticeProblem => {
  const fallback = practiceProblems[0];
  if (!id) {
    return fallback;
  }
  return practiceProblems.find((problem) => problem.id === id) ?? fallback;
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

export default function Practice() {
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(practiceProblems[0]?.id ?? null);
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>({});
  const [worksheetComplete, setWorksheetComplete] = useState(false);
  const [activeHint, setActiveHint] = useState<"target" | "worksheet" | null>(null);

  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const selectedProblem = useMemo(() => findProblem(selectedProblemId), [selectedProblemId]);

  const solution = useMemo(() => solvePracticeProblem(selectedProblem), [selectedProblem]);
  const tableRows = useMemo(() => buildTableRows(selectedProblem, solution), [selectedProblem, solution]);
  const stepPresentations = useMemo(
    () => buildStepPresentations(selectedProblem, solution),
    [selectedProblem, solution]
  );

  const toggleHint = useCallback((hint: "target" | "worksheet") => {
    setActiveHint((previous) => (previous === hint ? null : hint));
  }, []);

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
  }, [baselineWorksheet, selectedProblem.id]);

  useEffect(() => {
    if (worksheetComplete && !answerRevealed) {
      setAnswerRevealed(true);
    }
  }, [worksheetComplete, answerRevealed]);

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
  }, [selectedProblem.id]);

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
      const row: Record<WireMetricKey, WorksheetEntry> = { ...previousRow } as Record<WireMetricKey, WorksheetEntry>;

      const matchingRow = tableRows.find((entry) => entry.id === rowId);
      const givenFromRow = typeof matchingRow?.givens?.[key] === "number" && Number.isFinite(matchingRow.givens[key]);

      if (givenFromRow) {
        return prev;
      }

      const baseCell: WorksheetEntry = row[key] ?? { raw: "", value: null, status: "blank", given: false };

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
      setTableRevealed(false);
      setStepsVisible(false);
      setAnswerRevealed(false);
    }
  };

  return (
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
                    data-active={problem.id === selectedProblem.id ? "true" : undefined}
                    onClick={() => {
                      setSelectedProblemId(problem.id);
                      setTableRevealed(false);
                      setStepsVisible(false);
                      setAnswerRevealed(false);
                    }}
                  >
                    <strong>{problem.title}</strong>
                    <small>
                      {TOPOLOGY_LABEL[problem.topology]} ? {DIFFICULTY_LABEL[problem.difficulty]}
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
          <span className="difficulty-pill">{DIFFICULTY_LABEL[selectedProblem.difficulty]}</span>
          <div className="tag-group" aria-label="Concept tags">
            {selectedProblem.conceptTags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </header>

        <section className="prompt-card">
          <strong>Practice Prompt</strong>
          <p>{selectedProblem.prompt}</p>
        </section>

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
            {targetHintOpen ? (
              <div className="practice-popover" role="dialog" id="practice-target-hint" aria-modal="false">
                <strong>Question Mark</strong>
                <p>This marks the value the prompt wants you to solve.</p>
                <ul>
                  <li>Fill in each unknown W.I.R.E. cell using the givens and formulas.</li>
                  <li>Compare with the circuit diagram to keep the totals consistent.</li>
                  <li>Reveal the answer once you are confident in your work.</li>
                </ul>
                <button
                  type="button"
                  className="practice-popover-close"
                  onClick={() => setActiveHint(null)}
                >
                  Got it
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <div className="target-question">{selectedProblem.targetQuestion}</div>
            <div className="target-answer">
              {answerRevealed && Number.isFinite(targetValue) ? (
                formatMetricValue(targetValue as number, selectedProblem.targetMetric.key)
              ) : (
                <span>Reveal the answer when you&apos;re ready.</span>
              )}
            </div>
          </div>
        </section>

        <section className="practice-grid">
          <div className="worksheet-controls">
            <button type="button" onClick={() => setTableRevealed((value) => !value)}>
              {tableRevealed ? "Hide Worksheet Answers" : "Reveal Worksheet"}
            </button>
            <button type="button" onClick={() => setStepsVisible((value) => !value)}>
              {stepsVisible ? "Hide Steps" : "Show Solving Steps"}
            </button>
            <button type="button" onClick={() => setAnswerRevealed((value) => !value)}>
              {answerRevealed ? "Hide Final Answer" : "Reveal Final Answer"}
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

          <CircuitDiagram problem={selectedProblem} />

          <div
            className="worksheet-status-banner"
            role="status"
            aria-live="polite"
            data-complete={worksheetComplete ? "true" : undefined}
          >
            <div className="worksheet-status-header">
              <strong>{worksheetComplete ? "Worksheet Complete" : "Fill the W.I.R.E. table"}</strong>
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
            {worksheetHintOpen ? (
              <div
                className="practice-popover practice-popover--right"
                role="dialog"
                id="practice-worksheet-hint"
                aria-modal="false"
              >
                <strong>Plus Sign</strong>
                <p>Use the worksheet to add each missing value:</p>
                <ul>
                  <li>Start by copying the givens from the prompt into the locked cells.</li>
                  <li>Pick the Ohm's law or power identity that matches the known values for each row.</li>
                  <li>Cells turn green when the entry is correct, and once every unknown is solved the next problem unlocks.</li>
                </ul>
                <button
                  type="button"
                  className="practice-popover-close"
                  onClick={() => setActiveHint(null)}
                >
                  Got it
                </button>
              </div>
            ) : null}
          </div>

          <div className="worksheet-sync" role="status" aria-live="polite">
            <strong>Synced to schematic</strong>
            <span>
              {`Givens from ${selectedProblem.title} are locked in. Update only the unknowns and compare against the circuit diagram as you go.`}
            </span>
          </div>

          <WireTable
            rows={tableRows}
            revealAll={tableRevealed}
            highlight={{ rowId: highlightRowId, key: highlightKey }}
            entries={worksheetEntries}
            onChange={handleWorksheetChange}
          />

          <SolutionSteps steps={stepPresentations} visible={stepsVisible} />
        </section>

        <section className="practice-supplement">
          <TriangleDeck />
          <OhmsLawWheel />
        </section>
      </main>
    </div>
  );
}

