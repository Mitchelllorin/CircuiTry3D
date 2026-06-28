import WordMark from "../WordMark";
import {
  ArenaPodium,
  ArenaScenarioSelect,
  ArenaTestCards,
  ArenaTestControls,
  ArenaTestLog,
} from "./ArenaInstrumentation";
import type { ArenaScenario } from "./scenarios";
import { overdriveCeiling } from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaBattleSummary,
  ArenaViewTransitionPhase,
} from "./types";

type ArenaOverlayProps = {
  agents: ArenaBattleAgent[];
  log: ArenaBattleLogEntry[];
  mostStressedId: string | null;
  status: ArenaBattleStatus;
  stressFactor: number;
  progress: number;
  sessionLabel: string;
  transitionPhase: ArenaViewTransitionPhase;
  winnerName: string | null;
  survivorCount: number;
  scenario: ArenaScenario;
  summary: ArenaBattleSummary | null;
  onSelectScenario: (id: string) => void;
  onStartTest: () => void;
  onResetTest: () => void;
  onReturnToWorkspace: () => void;
  onOpenBuilder?: () => void;
};

export function ArenaOverlay({
  agents,
  log,
  mostStressedId,
  status,
  stressFactor,
  progress,
  sessionLabel,
  transitionPhase,
  winnerName,
  survivorCount,
  scenario,
  summary,
  onSelectScenario,
  onStartTest,
  onResetTest,
  onReturnToWorkspace,
  onOpenBuilder,
}: ArenaOverlayProps) {
  return (
    <div className="arena-overlay">
      <div className="arena-overlay__topbar">
        <button
          type="button"
          className="arena-button arena-button--ghost"
          onClick={onReturnToWorkspace}
        >
          Return to Workspace
        </button>
        <div className="arena-overlay__hero">
          <div className="arena-overlay__brand">
            <WordMark size="md" decorative />
            <span className="arena-eyebrow">Stress Test</span>
          </div>
          <h1>{sessionLabel}</h1>
          <div className="arena-overlay__meta">
            <span>{transitionPhase === "entering" ? "Cinematic entry" : "Test running"}</span>
            <span>
              {scenario.icon} {scenario.name}
            </span>
            <span>{stressFactor.toFixed(1)}× load</span>
            <span>
              {status === "complete"
                ? "Test complete"
                : status === "battling"
                  ? "Stress test running"
                  : "Ready to test"}
            </span>
          </div>
        </div>
        <div className="arena-overlay__actions">
          {typeof onOpenBuilder === "function" ? (
            <button
              type="button"
              className="arena-button arena-button--secondary"
              onClick={onOpenBuilder}
            >
              Open Builder
            </button>
          ) : null}
          <button
            type="button"
            className="arena-button arena-button--secondary"
            onClick={onResetTest}
          >
            Reset test
          </button>
        </div>
      </div>

      <div className="arena-overlay__console">
        <ArenaScenarioSelect
          scenario={scenario}
          onSelect={onSelectScenario}
          disabled={status === "battling"}
        />
        <ArenaTestControls
          status={status}
          stressFactor={stressFactor}
          progress={progress}
          winnerName={winnerName}
          survivorCount={survivorCount}
          totalCount={agents.length}
          stressMax={overdriveCeiling(scenario)}
          onStartTest={onStartTest}
        />
      </div>

      <ArenaTestLog log={log} winnerName={winnerName} heading="Test Log" />

      {status === "complete" && summary ? (
        <ArenaPodium agents={agents} summary={summary} />
      ) : null}

      <ArenaTestCards agents={agents} mostStressedId={mostStressedId} />
    </div>
  );
}
