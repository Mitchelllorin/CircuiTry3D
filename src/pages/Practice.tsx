import { useMemo, useState } from "react";
import practiceProblems from "../data/practiceProblems";
import type { PracticeProblem } from "../model/practice";
import type { PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue } from "../utils/electrical";
import { solvePracticeProblem, type SolveResult } from "../utils/practiceSolver";
import WireTable, { type WireTableRow } from "../components/practice/WireTable";
import SolutionSteps from "../components/practice/SolutionSteps";
import TriangleDeck from "../components/practice/TriangleDeck";
import OhmsLawWheel from "../components/practice/OhmsLawWheel";
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

export default function Practice() {
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(practiceProblems[0]?.id ?? null);
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const selectedProblem = useMemo(() => findProblem(selectedProblemId), [selectedProblemId]);

  const solution = useMemo(() => solvePracticeProblem(selectedProblem), [selectedProblem]);
  const tableRows = useMemo(() => buildTableRows(selectedProblem, solution), [selectedProblem, solution]);
  const stepPresentations = useMemo(
    () => buildStepPresentations(selectedProblem, solution),
    [selectedProblem, solution]
  );

  const targetValue = resolveTarget(selectedProblem, solution);

  const highlightRowId = (() => {
    const id = selectedProblem.targetMetric.componentId;
    if (id === "source") {
      return selectedProblem.source.id;
    }
    return id;
  })();

  const highlightKey = selectedProblem.targetMetric.key as WireMetricKey;

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
                      {TOPOLOGY_LABEL[problem.topology]} · {DIFFICULTY_LABEL[problem.difficulty]}
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
          <div className="target-icon" aria-hidden="true">
            ?
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
          </div>

          <WireTable
            rows={tableRows}
            revealAll={tableRevealed}
            highlight={{ rowId: highlightRowId, key: highlightKey }}
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

