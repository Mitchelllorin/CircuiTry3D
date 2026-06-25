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
} from "./types";

type ArenaPanelContentProps = {
  agents: ArenaBattleAgent[];
  log: ArenaBattleLogEntry[];
  mostStressedId: string | null;
  status: ArenaBattleStatus;
  stressFactor: number;
  progress: number;
  winnerName: string | null;
  survivorCount: number;
  onStartTest: () => void;
  onResetTest: () => void;
  onReturnToWorkspace: () => void;
  onOpenBuilder?: () => void;
  /** True once the panel has collapsed and the camera owns the workspace. */
  immersive: boolean;
};

/**
 * The 2D instrumentation surface for the workspace arena — a real-time test
 * bench. Lives inside the collapsible WorkspaceModePanel; the 3D scene renders
 * behind it. Collapsing the panel sweeps the camera into the full arena.
 */
export function ArenaPanelContent({
  agents,
  log,
  mostStressedId,
  status,
  stressFactor,
  progress,
  winnerName,
  survivorCount,
  onStartTest,
  onResetTest,
  onReturnToWorkspace,
  onOpenBuilder,
  immersive,
}: ArenaPanelContentProps) {
  return (
    <div className="arena-panel">
      <div className="arena-panel__controls">
        <div className="arena-panel__meta">
          <div className="arena-overlay__brand">
            <WordMark size="sm" decorative />
            <span className="arena-eyebrow">Performance Test Bench</span>
          </div>
          <div className="arena-panel__meta-pills">
            <span>{stressFactor.toFixed(1)}× load</span>
            <span>
              {status === "complete"
                ? "Test complete"
                : status === "battling"
                  ? "Stress test running"
                  : "Bench ready"}
            </span>
            <span>{immersive ? "Immersive view" : "Collapse panel to enter 3D"}</span>
          </div>
        </div>
        <div className="arena-panel__actions">
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
          <button
            type="button"
            className="arena-button arena-button--ghost"
            onClick={onReturnToWorkspace}
          >
            Return to Workspace
          </button>
        </div>
      </div>

      <ArenaTestControls
        status={status}
        stressFactor={stressFactor}
        progress={progress}
        winnerName={winnerName}
        survivorCount={survivorCount}
        totalCount={agents.length}
        onStartTest={onStartTest}
      />

      <ArenaTestCards agents={agents} mostStressedId={mostStressedId} />

      <ArenaTestLog log={log} winnerName={winnerName} heading="Test Log" />
    </div>
  );
}
