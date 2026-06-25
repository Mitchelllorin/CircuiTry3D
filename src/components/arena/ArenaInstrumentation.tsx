import { isFuseAvailable } from "./fuse";
import { STRESS_MAX } from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaTestPhase,
} from "./types";

const PHASE_LABEL: Record<ArenaTestPhase, string> = {
  nominal: "NOMINAL",
  stressed: "STRESSED",
  critical: "CRITICAL",
  failed: "FAILED",
};

function formatCurrent(amps: number): string {
  if (!Number.isFinite(amps)) return "—";
  return amps >= 1 ? `${amps.toFixed(2)} A` : `${Math.round(amps * 1000)} mA`;
}

function formatPower(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  return watts >= 1 ? `${watts.toFixed(2)} W` : `${Math.round(watts * 1000)} mW`;
}

/** One component's live instrumentation card. */
export function ArenaTestCard({
  agent,
  isMostStressed,
}: {
  agent: ArenaBattleAgent;
  isMostStressed: boolean;
}) {
  const isFailed = agent.phase === "failed";
  const integrityPercent = Math.max(0, Math.min(100, agent.integrity));
  const overTemp = agent.tempC > agent.ratings.junctionLimitC;

  return (
    <article
      className={`arena-card arena-card--phase-${agent.phase}${
        isMostStressed && !isFailed ? " is-active" : ""
      }${isFailed ? " is-defeated" : ""}`}
    >
      <div className="arena-card__header">
        <div>
          <p>{agent.componentNumber ?? agent.componentType.toUpperCase()}</p>
          <h3>{agent.name}</h3>
        </div>
        <span className={`arena-card__status arena-card__status--${agent.phase}`}>
          {PHASE_LABEL[agent.phase]}
        </span>
      </div>

      <div className="arena-card__integrity">
        <div className="arena-card__integrity-bar">
          <span style={{ width: `${integrityPercent}%` }} />
        </div>
        <strong>{Math.round(integrityPercent)}%</strong>
      </div>

      <dl className="arena-card__stats">
        <div className={overTemp ? "is-hot" : undefined}>
          <dt>TEMP</dt>
          <dd>
            {Math.round(agent.tempC)}°C
            <span className="arena-card__limit">/{Math.round(agent.ratings.junctionLimitC)}</span>
          </dd>
        </div>
        <div className={agent.loadPercent > 100 ? "is-hot" : undefined}>
          <dt>LOAD</dt>
          <dd>{Math.round(agent.loadPercent)}%</dd>
        </div>
        <div>
          <dt>RATING</dt>
          <dd>{formatPower(agent.ratings.powerRating)}</dd>
        </div>
        <div>
          <dt>Imax</dt>
          <dd>{formatCurrent(agent.ratings.maxCurrent)}</dd>
        </div>
      </dl>

      <p className="arena-card__signature">
        {isFailed && agent.failureName ? `✸ ${agent.failureName}` : agent.stressSignature}
      </p>
    </article>
  );
}

/** Grid of all component cards. */
export function ArenaTestCards({
  agents,
  mostStressedId,
}: {
  agents: ArenaBattleAgent[];
  mostStressedId: string | null;
}) {
  return (
    <div className="arena-cards" aria-label="Component test stations">
      {agents.map((agent) => (
        <ArenaTestCard
          key={agent.id}
          agent={agent}
          isMostStressed={agent.id === mostStressedId}
        />
      ))}
    </div>
  );
}

/** The BATTLE / RE-RUN control plus the live load-ramp gauge. */
export function ArenaTestControls({
  status,
  stressFactor,
  progress,
  winnerName,
  survivorCount,
  totalCount,
  onStartTest,
}: {
  status: ArenaBattleStatus;
  stressFactor: number;
  progress: number;
  winnerName: string | null;
  survivorCount: number;
  totalCount: number;
  onStartTest: () => void;
}) {
  const isBattling = status === "battling";
  const isComplete = status === "complete";

  return (
    <div className="arena-test-console">
      <button
        type="button"
        className={`arena-battle-button${isBattling ? " is-running" : ""}`}
        onClick={onStartTest}
        disabled={isBattling}
      >
        {isBattling ? "TESTING…" : isComplete ? "↻ RE-RUN TEST" : "⚔ BATTLE"}
      </button>

      <div className="arena-test-gauge" aria-hidden={!isBattling && !isComplete}>
        <div className="arena-test-gauge__head">
          <span>LOAD RAMP</span>
          <strong>
            {stressFactor.toFixed(1)}× <em>/ {STRESS_MAX}×</em>
          </strong>
        </div>
        <div className="arena-test-gauge__track">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="arena-test-gauge__note">
          {isComplete
            ? survivorCount > 0
              ? `${survivorCount}/${totalCount} survived · winner ${winnerName ?? "—"}`
              : `All ${totalCount} failed · most robust ${winnerName ?? "—"}`
            : isBattling
              ? "Driving every component past its rating…"
              : isFuseAvailable()
                ? "F.U.S.E.™ armed · real failure physics"
                : "Bench ready"}
        </p>
      </div>
    </div>
  );
}

/** The live test log (stress / warning / failure / verdict events). */
export function ArenaTestLog({
  log,
  winnerName,
  heading = "Test Log",
}: {
  log: ArenaBattleLogEntry[];
  winnerName: string | null;
  heading?: string;
}) {
  return (
    <aside className="arena-log-panel" aria-label="Test log">
      <div className="arena-log-panel__header">
        <h2>{heading}</h2>
        {winnerName ? (
          <span className="arena-status-pill">{winnerName} holds</span>
        ) : null}
      </div>
      <ol className="arena-log-panel__list">
        {log.map((entry) => (
          <li key={entry.id} className={`arena-log-entry arena-log-entry--${entry.kind}`}>
            <span className="arena-log-entry__round">
              {entry.kind === "system" ? "SYS" : `${entry.round.toFixed(1)}×`}
            </span>
            <span>{entry.message}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
