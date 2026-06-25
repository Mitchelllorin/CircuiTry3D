import WordMark from "../WordMark";
import {
  ArenaTestCards,
  ArenaTestControls,
  ArenaTestLog,
} from "./ArenaInstrumentation";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
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
            <span className="arena-eyebrow">Performance Test Bench</span>
          </div>
          <h1>{sessionLabel}</h1>
          <div className="arena-overlay__meta">
            <span>{transitionPhase === "entering" ? "Cinematic entry" : "Bench live"}</span>
            <span>{stressFactor.toFixed(1)}× load</span>
            <span>
              {status === "complete"
                ? "Test complete"
                : status === "battling"
                  ? "Stress test running"
                  : "Bench ready"}
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
            Reset Bench
          </button>
        </div>
      </div>

      <div className="arena-overlay__console">
        <ArenaTestControls
          status={status}
          stressFactor={stressFactor}
          progress={progress}
          winnerName={winnerName}
          survivorCount={survivorCount}
          totalCount={agents.length}
          onStartTest={onStartTest}
        />
      </div>

      <ArenaTestLog log={log} winnerName={winnerName} heading="Test Log" />

      <ArenaTestCards agents={agents} mostStressedId={mostStressedId} />

      {status === "complete" && winnerName ? (
        <div className="arena-winner-banner" role="status">
          <p>{survivorCount > 0 ? "Most robust under load" : "Last to fail"}</p>
          <strong>{winnerName}</strong>
        </div>
      ) : null}
    </div>
  );
}
