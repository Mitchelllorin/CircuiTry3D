import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
} from "./types";

type ArenaPanelContentProps = {
  agents: ArenaBattleAgent[];
  battleLog: ArenaBattleLogEntry[];
  currentTurnAgentId: string | null;
  onResetBattle: () => void;
  onReturnToWorkspace: () => void;
  onOpenBuilder?: () => void;
  round: number;
  status: ArenaBattleStatus;
  winnerName: string | null;
  /** True once the panel has collapsed and the camera owns the workspace. */
  immersive: boolean;
};

function getHealthPercent(agent: ArenaBattleAgent): number {
  return Math.max(0, Math.min(100, (agent.health / agent.maxHealth) * 100));
}

/**
 * The 2D parameters/metrics surface for the workspace arena. Lives inside the
 * collapsible WorkspaceModePanel; the 3D scene renders behind it. Collapsing
 * the panel sweeps the camera into the full interactive arena.
 */
export function ArenaPanelContent({
  agents,
  battleLog,
  currentTurnAgentId,
  onResetBattle,
  onReturnToWorkspace,
  onOpenBuilder,
  round,
  status,
  winnerName,
  immersive,
}: ArenaPanelContentProps) {
  return (
    <div className="arena-panel">
      <div className="arena-panel__controls">
        <div className="arena-panel__meta">
          <span className="arena-eyebrow">CircuiTry3D Battle Arena</span>
          <div className="arena-panel__meta-pills">
            <span>Round {Math.max(round, 1)}</span>
            <span>{status === "complete" ? "Battle complete" : "Battle in progress"}</span>
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
            onClick={onResetBattle}
          >
            Restart Battle
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

      <div className="arena-cards" aria-label="Combatant stats">
        {agents.map((agent) => {
          const isActive = agent.id === currentTurnAgentId;
          const isDefeated = agent.health <= 0;

          return (
            <article
              key={agent.id}
              className={`arena-card${isActive ? " is-active" : ""}${isDefeated ? " is-defeated" : ""}`}
            >
              <div className="arena-card__header">
                <div>
                  <p>{agent.componentNumber ?? agent.componentType.toUpperCase()}</p>
                  <h3>{agent.name}</h3>
                </div>
                <span className="arena-card__badge">{agent.abilityName}</span>
              </div>
              <div className="arena-card__health">
                <div className="arena-card__health-bar">
                  <span style={{ width: `${getHealthPercent(agent)}%` }} />
                </div>
                <strong>
                  {agent.health}/{agent.maxHealth} HP
                </strong>
              </div>
              <dl className="arena-card__stats">
                <div>
                  <dt>ATK</dt>
                  <dd>{agent.attack}</dd>
                </div>
                <div>
                  <dt>DEF</dt>
                  <dd>{agent.defense}</dd>
                </div>
                <div>
                  <dt>V</dt>
                  <dd>{agent.metrics.voltage.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Ω</dt>
                  <dd>{agent.metrics.resistance.toFixed(1)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <aside className="arena-log-panel arena-log-panel--flow" aria-label="Battle log">
        <div className="arena-log-panel__header">
          <h2>Battle Log</h2>
          {winnerName ? <span className="arena-status-pill">{winnerName} wins</span> : null}
        </div>
        <ol className="arena-log-panel__list">
          {battleLog.map((entry) => (
            <li key={entry.id} className={`arena-log-entry arena-log-entry--${entry.kind}`}>
              <span className="arena-log-entry__round">
                {entry.round === 0 ? "INIT" : `R${entry.round}`}
              </span>
              <span>{entry.message}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
