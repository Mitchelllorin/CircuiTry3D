import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PracticeDifficulty,
  PracticeProblem,
  PracticeTopology,
} from "../../model/practice";
import type { WireMetricKey } from "../../utils/electrical";
import type { WorksheetEntryStatus } from "../../components/practice/WireTable";
import { createId } from "../../utils/id";

const NEGATIVE_STATUSES: WorksheetEntryStatus[] = ["incorrect", "invalid"];
const MAX_LOG_ENTRIES = 20;
const DIFFICULTY_ORDER: PracticeDifficulty[] = [
  "intro",
  "standard",
  "challenge",
];

const METRIC_LABELS: Record<WireMetricKey, string> = {
  watts: "Power (W)",
  current: "Current (A)",
  resistance: "Resistance (Ω)",
  voltage: "Voltage (V)",
};

const TOPOLOGY_LABELS: Record<PracticeTopology, string> = {
  series: "Series",
  parallel: "Parallel",
  combination: "Combination",
};

type HelperTarget = "diagram" | "ohms";

type MistakeRecord = {
  id: string;
  timestamp: number;
  metric: WireMetricKey;
  problemId: string;
  conceptTags: string[];
  status: WorksheetEntryStatus;
};

type AdaptiveInsights = {
  hasMistakes: boolean;
  conceptCounts: Record<string, number>;
  metricCounts: Record<WireMetricKey, number>;
  focusConcept?: string;
  focusConceptLabel?: string;
  focusConceptCount: number;
  focusMetric?: WireMetricKey;
  focusMetricLabel?: string;
  focusMetricCount: number;
};

export type AdaptiveRecommendation = {
  problem: PracticeProblem;
  reason: string;
};

export type UseAdaptivePracticeOptions = {
  problems: PracticeProblem[];
  selectedProblem: PracticeProblem | null;
  worksheetComplete: boolean;
};

export type AdaptivePracticeApi = {
  recordAttempt(input: {
    metric: WireMetricKey;
    status: WorksheetEntryStatus;
    previousStatus?: WorksheetEntryStatus;
  }): void;
  insights: AdaptiveInsights;
  recommendations: AdaptiveRecommendation[];
  helperTargets: HelperTarget[];
};

const isStruggleStatus = (status?: WorksheetEntryStatus) =>
  !!status && NEGATIVE_STATUSES.includes(status);

const formatConceptTag = (tag: string) =>
  tag
    .split(/[-_]/g)
    .map((segment) =>
      segment ? segment[0]?.toUpperCase() + segment.slice(1) : segment,
    )
    .join(" ")
    .trim();

const getDifficultyRank = (difficulty: PracticeDifficulty) => {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  return index === -1 ? DIFFICULTY_ORDER.length : index;
};

const buildMetricBaseline = (): Record<WireMetricKey, number> => ({
  watts: 0,
  current: 0,
  resistance: 0,
  voltage: 0,
});

export function useAdaptivePractice({
  problems,
  selectedProblem,
  worksheetComplete,
}: UseAdaptivePracticeOptions): AdaptivePracticeApi {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const prevCompleteRef = useRef(false);
  const activeProblem = selectedProblem;

  useEffect(() => {
    if (!activeProblem) {
      prevCompleteRef.current = worksheetComplete;
      return;
    }
    if (worksheetComplete && !prevCompleteRef.current) {
      setCompletions((prev) => {
        if (prev[activeProblem.id]) {
          return prev;
        }
        return {
          ...prev,
          [activeProblem.id]: Date.now(),
        };
      });
    }
    prevCompleteRef.current = worksheetComplete;
  }, [activeProblem, worksheetComplete]);

  const recordAttempt = useCallback(
    ({
      metric,
      status,
      previousStatus,
    }: {
      metric: WireMetricKey;
      status: WorksheetEntryStatus;
      previousStatus?: WorksheetEntryStatus;
    }) => {
      if (!isStruggleStatus(status) || isStruggleStatus(previousStatus)) {
        return;
      }
      if (!activeProblem) {
        return;
      }

      setMistakes((prev) => {
        const next: MistakeRecord[] = [
          ...prev,
          {
            id: createId("mistake"),
            timestamp: Date.now(),
            metric,
            problemId: activeProblem.id,
            conceptTags: [...activeProblem.conceptTags],
            status,
          },
        ];
        return next.slice(-MAX_LOG_ENTRIES);
      });
    },
    [activeProblem],
  );

  const conceptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mistakes.forEach((entry, index) => {
      const weight = Math.max(1 - (mistakes.length - index - 1) * 0.08, 0.35);
      entry.conceptTags.forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + weight;
      });
    });
    return counts;
  }, [mistakes]);

  const metricCounts = useMemo(() => {
    const counts = buildMetricBaseline();
    mistakes.forEach((entry, index) => {
      const weight = Math.max(1 - (mistakes.length - index - 1) * 0.1, 0.4);
      counts[entry.metric] += weight;
    });
    return counts;
  }, [mistakes]);

  const focusConceptEntry = useMemo(() => {
    const entries = Object.entries(conceptCounts)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      return null;
    }
    const [key, value] = entries[0];
    return { key, value };
  }, [conceptCounts]);

  const focusMetricEntry = useMemo(() => {
    const entries = (Object.keys(metricCounts) as WireMetricKey[])
      .map((key) => ({ key, value: metricCounts[key] }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
    return entries[0] ?? null;
  }, [metricCounts]);

  const prioritizedConcepts = useMemo(() => {
    if (focusConceptEntry) {
      return Object.entries(conceptCounts)
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key);
    }
    return activeProblem?.conceptTags ?? [];
  }, [activeProblem?.conceptTags, conceptCounts, focusConceptEntry]);

  const helperTargets = useMemo(() => {
    const targets: HelperTarget[] = [];

    const concept = focusConceptEntry?.key ?? "";
    const metric = focusMetricEntry?.key;

    const conceptSuggestsDiagram = /(series|parallel|combination|diagram|wire)/i.test(
      concept,
    );
    const conceptSuggestsOhms = /(ohms|power|kvl|kcl|current|voltage)/i.test(
      concept,
    );

    if (conceptSuggestsDiagram || metric === "resistance") {
      targets.push("diagram");
    }

    if (conceptSuggestsOhms || metric === "watts" || metric === "current" || metric === "voltage") {
      targets.push("ohms");
    }

    return Array.from(new Set(targets));
  }, [focusConceptEntry?.key, focusMetricEntry?.key]);

  const recommendations = useMemo<AdaptiveRecommendation[]>(() => {
    if (!activeProblem) {
      return [];
    }
    const completedIds = new Set(Object.keys(completions));

    const scored = problems
      .filter((problem) => problem.id !== activeProblem.id)
      .map((problem) => {
        const conceptScore = prioritizedConcepts.reduce((score, tag, index) => {
          if (problem.conceptTags.includes(tag)) {
            return score + (prioritizedConcepts.length - index) * 2;
          }
          return score;
        }, 0);

        const metricScore =
          focusMetricEntry && problem.targetMetric.key === focusMetricEntry.key
            ? 2
            : 0;

        const completionScore = completedIds.has(problem.id) ? 0 : 3;
        const difficultyDelta = Math.abs(
          getDifficultyRank(problem.difficulty) -
            getDifficultyRank(activeProblem.difficulty),
        );
        const difficultyScore = Math.max(0, 2 - difficultyDelta);
        const topologyScore =
          problem.topology === activeProblem.topology ? 1 : 0;

        const totalScore =
          conceptScore +
          metricScore +
          completionScore +
          difficultyScore +
          topologyScore;

        const reason = (() => {
          if (focusConceptEntry && problem.conceptTags.includes(focusConceptEntry.key)) {
            return `Reinforces ${formatConceptTag(focusConceptEntry.key)}`;
          }
          if (focusMetricEntry && problem.targetMetric.key === focusMetricEntry.key) {
            return `Targets ${METRIC_LABELS[focusMetricEntry.key]}`;
          }
          if (!completedIds.has(problem.id)) {
            return "Fresh problem";
          }
          return `Continue ${TOPOLOGY_LABELS[problem.topology]} reps`;
        })();

        return { problem, score: totalScore, reason };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (
          getDifficultyRank(a.problem.difficulty) -
          getDifficultyRank(b.problem.difficulty)
        );
      });

    return scored.slice(0, 3).map(({ problem, reason }) => ({ problem, reason }));
  }, [
    activeProblem,
    completions,
    focusConceptEntry,
    focusMetricEntry,
    prioritizedConcepts,
    problems,
  ]);

  const insights: AdaptiveInsights = useMemo(
    () => ({
      hasMistakes: mistakes.length > 0,
      conceptCounts,
      metricCounts,
      focusConcept: focusConceptEntry?.key,
      focusConceptLabel: focusConceptEntry
        ? formatConceptTag(focusConceptEntry.key)
        : undefined,
      focusConceptCount: focusConceptEntry?.value ?? 0,
      focusMetric: focusMetricEntry?.key,
      focusMetricLabel: focusMetricEntry
        ? METRIC_LABELS[focusMetricEntry.key]
        : undefined,
      focusMetricCount: focusMetricEntry?.value ?? 0,
    }),
    [conceptCounts, focusConceptEntry, focusMetricEntry, mistakes.length, metricCounts],
  );

  return {
    recordAttempt: recordAttempt,
    insights,
    recommendations,
    helperTargets,
  };
}

