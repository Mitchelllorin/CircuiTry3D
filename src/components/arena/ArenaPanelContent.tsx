import WordMark from "../WordMark";
import type { ComponentAction } from "../builder/types";
import { ArenaFuseForecast } from "./ArenaFuseForecast";
import { ArenaRosterPicker } from "./ArenaRosterPicker";
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
  scenario: ArenaScenario;
  summary: ArenaBattleSummary | null;
  onSelectScenario: (id: string) => void;
  onStartTest: () => void;
  onResetTest: () => void;
  onReturnToWorkspace: () => void;
  onOpenBuilder?: () => void;
  /** Switch to the solo single-component bench. */
  onSwitchToBench?: () => void;
  /** True once the panel has collapsed and the camera owns the workspace. */
  immersive: boolean;
  /** The part the user tapped — shared with the 3D scene's selection ring. */
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  /** Add a library part to the bench, or swap it for the selected one. */
  onAddComponent: (action: ComponentAction) => void;
  onRemoveAgent: (id: string) => void;
  onEditAgent: (id: string) => void;
  /** The bench holds as many parts as the board has rungs. */
  rosterFull: boolean;
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
  scenario,
  summary,
  onSelectScenario,
  onStartTest,
  onResetTest,
  onReturnToWorkspace,
  onOpenBuilder,
  onSwitchToBench,
  immersive,
  selectedAgentId,
  onSelectAgent,
  onAddComponent,
  onRemoveAgent,
  onEditAgent,
  rosterFull,
}: ArenaPanelContentProps) {
  return (
    <div className="arena-panel">
      <div className="arena-panel__controls">
        <div className="arena-panel__meta">
          <div className="arena-overlay__brand">
            <WordMark size="sm" decorative />
            <span className="arena-eyebrow">Stress Test</span>
          </div>
          <div className="arena-panel__meta-pills">
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
            <span>{immersive ? "Immersive view" : "Collapse panel to enter 3D"}</span>
          </div>
        </div>
        <div className="arena-panel__actions">
          {typeof onSwitchToBench === "function" ? (
            <button
              type="button"
              className="arena-button arena-button--secondary"
              onClick={onSwitchToBench}
            >
              Solo bench
            </button>
          ) : null}
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
          <button
            type="button"
            className="arena-button arena-button--ghost"
            onClick={onReturnToWorkspace}
          >
            Return to Workspace
          </button>
        </div>
      </div>

      {/* What is being tested comes before the conditions it is tested under —
          you pick the parts, then the environment you cook them in. */}
      <ArenaRosterPicker
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
        onAddComponent={onAddComponent}
        onRemoveAgent={onRemoveAgent}
        onEditAgent={onEditAgent}
        disabled={status === "battling"}
        full={rosterFull}
      />

      <ArenaScenarioSelect
        scenario={scenario}
        onSelect={onSelectScenario}
        disabled={status === "battling"}
      />

      {/* After the scenario, because the reading only means anything once you
          know which conditions it was taken in. */}
      <ArenaFuseForecast
        agents={agents}
        scenario={scenario}
        status={status}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
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

      <ArenaTestCards agents={agents} mostStressedId={mostStressedId} />

      {status === "complete" && summary ? (
        <ArenaPodium agents={agents} summary={summary} />
      ) : null}

      <ArenaTestLog log={log} winnerName={winnerName} heading="Test Log" />
    </div>
  );
}
