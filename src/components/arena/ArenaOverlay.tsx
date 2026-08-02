import WordMark from "../WordMark";
import {
  ArenaPodium,
  ArenaScenarioSelect,
  ArenaTestLog,
} from "./ArenaInstrumentation";
import type { ArenaScenario } from "./scenarios";
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

// `mostStressedId`, `progress`, `survivorCount` and `onStartTest` stay in the
// props type (callers still pass them) but are no longer read here: the cards
// that used them are gone, and starting the test is the switch's job now.
export function ArenaOverlay({
  agents,
  log,
  status,
  stressFactor,
  sessionLabel,
  transitionPhase,
  winnerName,
  scenario,
  summary,
  onSelectScenario,
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

      {/* Scenario chips only. The BATTLE console that used to sit beside them is
          gone: the switch on the board starts the test now, and the load ramp it
          carried reads out on the stage without a container around it. */}
      <div className="arena-overlay__console">
        <ArenaScenarioSelect
          scenario={scenario}
          onSelect={onSelectScenario}
          disabled={status === "battling"}
        />
      </div>

      <ArenaTestLog log={log} winnerName={winnerName} heading="Test Log" />

      {status === "complete" && summary ? (
        <ArenaPodium agents={agents} summary={summary} />
      ) : null}

      {/* The per-component cards are gone. Every number they carried — temp
          against its limit, load, live current — already floats on the part
          itself in the scene, where you can see WHICH part it belongs to. A grid
          of boxed duplicates below the stage just ate the screen. */}
    </div>
  );
}
