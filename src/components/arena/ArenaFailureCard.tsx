import { failureHeadline, limitSourceFor } from "./breakIt";
import type { ArenaBattleAgent } from "./types";

type ArenaFailureCardProps = {
  agent: ArenaBattleAgent;
  onDismiss: () => void;
  onReset: () => void;
  /**
   * Height of whatever console is taking the bottom edge, px.
   *
   * The card sits ON that edge, not on the screen: the camera has just put the
   * failing part in the middle third of the frame, and a report that covers the
   * part it is reporting on is the toast bug with better typography.
   */
  bottomOffsetPx?: number;
};

function numericLimit(agent: ArenaBattleAgent): string | null {
  const thresholds = agent.ratedThresholds ?? {};
  if (typeof thresholds.maxCurrentA === "number") {
    return thresholds.maxCurrentA >= 1
      ? `${thresholds.maxCurrentA.toFixed(2)} A`
      : `${Math.round(thresholds.maxCurrentA * 1000)} mA`;
  }
  if (typeof thresholds.maxPowerW === "number") {
    return thresholds.maxPowerW >= 1
      ? `${thresholds.maxPowerW.toFixed(2)} W`
      : `${Math.round(thresholds.maxPowerW * 1000)} mW`;
  }
  if (typeof thresholds.maxTempC === "number") {
    return `${Math.round(thresholds.maxTempC)} °C`;
  }
  return null;
}

/**
 * THE FAILURE CARD — what the toast should always have been.
 *
 * A notification strip can say "F1 failed". It cannot say which part that was,
 * who rated it, what number it crossed, or what it was actually doing when it
 * went — and it sits over the toolbar and the readout row while saying it. This
 * is a report, anchored to the edge, that leaves the part it is talking about
 * in the middle of the frame where the camera has just put it.
 *
 * It stays until dismissed: a failure you can miss is a failure you did not see.
 */
export function ArenaFailureCard({
  agent,
  onDismiss,
  onReset,
  bottomOffsetPx = 0,
}: ArenaFailureCardProps) {
  const maker = agent.manufacturer?.trim();
  const number = agent.partNumber?.trim();
  const title = maker && number ? `${maker} ${number}` : agent.name;
  const source = limitSourceFor(agent);
  const limit = numericLimit(agent);
  const owner = source === "maker" ? `${maker ?? "the maker"}'s rating` : "this app's model";

  return (
    <section
      className="arena-fail"
      role="status"
      aria-live="assertive"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${bottomOffsetPx + 8}px)` }}
    >
      <header className="arena-fail__head">
        <span className="arena-fail__tag">FAILED</span>
        <span className="arena-fail__title">{title}</span>
        {agent.componentNumber && agent.componentNumber !== title ? (
          <span className="arena-fail__designator">{agent.name}</span>
        ) : null}
      </header>

      <p className="arena-fail__what">
        <strong>{failureHeadline(agent)}</strong>
        <span className="arena-fail__reading">
          {agent.failedAtLoad != null
            ? `${agent.failedAtLoad.toFixed(2)}× rated load`
            : "at its limit"}
          {" · "}peaked {Math.round(agent.peakTempC)} °C
          {agent.peakLoadPercent > 0
            ? ` · ${Math.round(agent.peakLoadPercent)}% of rating`
            : ""}
        </span>
      </p>

      {limit ? (
        <p className="arena-fail__limit">
          Limit crossed: <b>{limit}</b> — {owner}.
        </p>
      ) : null}

      {agent.failureDescription ? (
        <p className="arena-fail__desc">{agent.failureDescription}</p>
      ) : null}

      <div className="arena-fail__actions">
        <button type="button" className="arena-fail__btn" onClick={onReset}>
          Reset the bench
        </button>
        <button
          type="button"
          className="arena-fail__btn arena-fail__btn--ghost"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
