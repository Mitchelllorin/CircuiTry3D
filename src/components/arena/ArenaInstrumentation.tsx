import {
  AMAZON_AFFILIATE_ENABLED,
  AMAZON_DISCLOSURE,
  AMAZON_LINK_REL,
  buildAmazonSearchUrl,
} from "./amazonLink";
import { isFuseAvailable } from "./fuse";
import type { ArenaScenario } from "./scenarios";
import { ARENA_SCENARIOS } from "./scenarios";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaBattleSummary,
  ArenaTestPhase,
} from "./types";

const PHASE_LABEL: Record<ArenaTestPhase, string> = {
  nominal: "NOMINAL",
  stressed: "STRESSED",
  critical: "CRITICAL",
  failed: "FAILED",
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatEnergy(joules: number): string {
  if (!Number.isFinite(joules)) return "—";
  if (joules >= 1000) return `${(joules / 1000).toFixed(1)} kJ`;
  if (joules >= 1) return `${joules.toFixed(1)} J`;
  return `${Math.round(joules * 1000)} mJ`;
}

/** Pick how a part is doing in two words for the summary line. */
function rankLabel(rank: number): string {
  if (rank === 1) return "WINNER";
  if (rank > 0) return `#${rank}`;
  return "";
}

/**
 * Affiliate "buy the real part" link. The Arena tests real branded components,
 * so a search by part number / spec is a natural, high-intent placement. Renders
 * nothing when affiliate links are disabled.
 */
export function ArenaBuyLink({
  agent,
  variant = "card",
}: {
  agent: ArenaBattleAgent;
  variant?: "winner" | "card";
}) {
  if (!AMAZON_AFFILIATE_ENABLED) return null;
  return (
    <a
      className={`arena-buy-link arena-buy-link--${variant}`}
      href={buildAmazonSearchUrl(agent)}
      target="_blank"
      rel={AMAZON_LINK_REL}
      title={`Find ${agent.name} on Amazon`}
    >
      <span aria-hidden>🛒</span>
      {variant === "winner" ? "Get the real part on Amazon" : "Get the part"}
    </a>
  );
}

/** One-line affiliate disclosure (required by the Amazon Operating Agreement). */
export function ArenaAffiliateDisclosure() {
  if (!AMAZON_AFFILIATE_ENABLED) return null;
  return <p className="arena-affiliate-disclosure">{AMAZON_DISCLOSURE}</p>;
}

/** Environmental scenario picker — re-tunes the whole bench physics. */
export function ArenaScenarioSelect({
  scenario,
  onSelect,
  disabled,
}: {
  scenario: ArenaScenario;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="arena-scenario" aria-label="Environmental scenario">
      <div className="arena-scenario__head">
        <span className="arena-scenario__eyebrow">Environment</span>
        <p className="arena-scenario__tagline">{scenario.tagline}</p>
      </div>
      <div className="arena-scenario__chips" role="radiogroup" aria-label="Scenario">
        {ARENA_SCENARIOS.map((option) => {
          const active = option.id === scenario.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`arena-scenario__chip${active ? " is-active" : ""}`}
              style={active ? { borderColor: option.accent, color: option.accent } : undefined}
              disabled={disabled}
              onClick={() => onSelect(option.id)}
            >
              <span className="arena-scenario__icon" aria-hidden>
                {option.icon}
              </span>
              <span className="arena-scenario__name">{option.name}</span>
              <span className="arena-scenario__amb">{Math.round(option.ambientC)}°C</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One component's live instrumentation card. */
/**
 * F.U.S.E.'s plain-English verdict — WHY a part won or failed, in terms a
 * newcomer can follow (what it hit, what its rated limit was, how hard it was
 * pushed). This is the human readout that earns the failure simulation its name.
 */
function explainOutcome(agent: ArenaBattleAgent): string {
  const limit = Math.round(agent.ratings.junctionLimitC);
  const peak = Math.round(agent.peakTempC);
  const ranTooHot = peak >= limit;
  if (agent.phase === "failed") {
    const cause = agent.failureName || "Overstressed";
    const at = agent.failedAtLoad ? ` at ${agent.failedAtLoad.toFixed(1)}× load` : "";
    return ranTooHot
      ? `${cause}${at} — ran too hot, peaking ${peak}°C past its ${limit}°C rating.`
      : `${cause}${at} — pushed past what it's rated to take.`;
  }
  if (agent.rank === 1) {
    return `Toughest part on the bench — held the full ${agent.survivedLoad.toFixed(
      1,
    )}× load and stayed coolest (peaked ${peak}°C against a ${limit}°C limit).`;
  }
  if (agent.rank > 0) {
    return `Survived ${agent.survivedLoad.toFixed(
      1,
    )}× load — peaked ${peak}°C against its ${limit}°C rating.`;
  }
  return "";
}

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
  const ranked = agent.rank > 0;
  const isWinner = agent.rank === 1;

  return (
    <article
      className={`arena-card arena-card--phase-${agent.phase}${
        isMostStressed && !isFailed ? " is-active" : ""
      }${isFailed ? " is-defeated" : ""}${isWinner ? " is-winner" : ""}`}
    >
      {ranked ? (
        <span className={`arena-card__rank${isWinner ? " is-winner" : ""}`}>
          {RANK_MEDAL[agent.rank] ?? `#${agent.rank}`}
        </span>
      ) : null}

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
          <dt>PEAK</dt>
          <dd>
            {Math.round(agent.peakTempC)}°C
            <span className="arena-card__limit"> · {Math.round(agent.peakLoadPercent)}%</span>
          </dd>
        </div>
        <div>
          <dt>ENERGY</dt>
          <dd>{formatEnergy(agent.energyJ)}</dd>
        </div>
      </dl>

      {isFailed || ranked ? (
        <p className="arena-card__why">{explainOutcome(agent)}</p>
      ) : (
        <p className="arena-card__signature">{agent.stressSignature}</p>
      )}

      {ranked ? (
        <div className={`arena-card__verdict${isWinner ? " is-winner" : ""}`}>
          <span className="arena-card__verdict-rank">{rankLabel(agent.rank)}</span>
          <span className="arena-card__verdict-score">
            <strong>{agent.score.toFixed(1)}</strong>
            <em>score</em>
          </span>
          <span className="arena-card__verdict-held">
            {isFailed
              ? `held ${(agent.failedAtLoad ?? 0).toFixed(1)}×`
              : `survived ${agent.survivedLoad.toFixed(1)}×`}
          </span>
          {/* Affiliate "get the real part" link lives here per card. */}
          <ArenaBuyLink agent={agent} variant="card" />
        </div>
      ) : null}
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

/** Winner podium — the top three finishers, crowned, with their scores. */
export function ArenaPodium({
  agents,
  summary,
}: {
  agents: ArenaBattleAgent[];
  summary: ArenaBattleSummary;
}) {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const top = summary.ranking
    .slice(0, 3)
    .map((id) => byId.get(id))
    .filter((agent): agent is ArenaBattleAgent => Boolean(agent));
  const winner = top[0];
  if (!winner) return null;

  // Visual podium order: 2nd · 1st · 3rd so the champion stands centre and tall.
  const order = [top[1], top[0], top[2]].filter(Boolean) as ArenaBattleAgent[];

  return (
    <section className="arena-podium" aria-label="Results">
      <header className="arena-podium__head">
        <span className="arena-podium__trophy" aria-hidden>
          🏆
        </span>
        <div>
          <p className="arena-podium__eyebrow">
            {summary.scenarioName} · {summary.survivorCount}/{summary.totalCount} survived
          </p>
          <h3 className="arena-podium__winner">{winner.name}</h3>
          <p className="arena-podium__score">
            Robustness {winner.score.toFixed(1)} · peak {summary.peakLoad.toFixed(1)}× ·{" "}
            {formatEnergy(summary.totalEnergyJ)} dissipated
          </p>
          <ArenaBuyLink agent={winner} variant="winner" />
        </div>
      </header>

      <ol className="arena-podium__steps">
        {order.map((agent) => (
          <li
            key={agent.id}
            className={`arena-podium__step arena-podium__step--rank-${agent.rank}`}
          >
            <span className="arena-podium__medal" aria-hidden>
              {RANK_MEDAL[agent.rank] ?? `#${agent.rank}`}
            </span>
            <strong className="arena-podium__name">{agent.name}</strong>
            <span className="arena-podium__step-score">{agent.score.toFixed(1)}</span>
            <span
              className={`arena-podium__pill arena-podium__pill--${agent.phase}`}
            >
              {agent.phase === "failed"
                ? `held ${(agent.failedAtLoad ?? 0).toFixed(1)}×`
                : "survived"}
            </span>
          </li>
        ))}
      </ol>
      <ArenaAffiliateDisclosure />
    </section>
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
  stressMax,
  solo = false,
  onStartTest,
}: {
  status: ArenaBattleStatus;
  stressFactor: number;
  progress: number;
  winnerName: string | null;
  survivorCount: number;
  totalCount: number;
  stressMax: number;
  solo?: boolean;
  onStartTest: () => void;
}) {
  const isBattling = status === "battling";
  const isComplete = status === "complete";
  const startLabel = solo ? "▶ TEST" : "⚔ BATTLE";

  return (
    <div className="arena-test-console">
      <button
        type="button"
        className={`arena-battle-button${isBattling ? " is-running" : ""}`}
        onClick={onStartTest}
        disabled={isBattling}
      >
        {isBattling ? "TESTING…" : isComplete ? "↻ RE-RUN TEST" : startLabel}
      </button>

      <div className="arena-test-gauge" aria-hidden={!isBattling && !isComplete}>
        <div className="arena-test-gauge__head">
          <span>LOAD RAMP</span>
          <strong>
            {stressFactor.toFixed(1)}× <em>/ {stressMax}×</em>
          </strong>
        </div>
        <div className="arena-test-gauge__track">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="arena-test-gauge__note">
          {isComplete
            ? survivorCount > 0
              ? `${survivorCount}/${totalCount} survived · 🏆 ${winnerName ?? "—"}`
              : `All ${totalCount} failed · most robust ${winnerName ?? "—"}`
            : isBattling
              ? "Driving every component past its rating…"
              : isFuseAvailable()
                ? "F.U.S.E.™ armed · real failure physics"
                : "Ready to test"}
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
          <span className="arena-status-pill">🏆 {winnerName}</span>
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
