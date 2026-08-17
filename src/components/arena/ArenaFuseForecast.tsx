import { useMemo } from "react";
import { runFuseAnalysis } from "./fuseEngine";
import { environmentFor } from "./scenarios";
import type { ArenaScenario } from "./scenarios";
import type { ArenaBattleAgent, ArenaBattleStatus, FuseRiskLevel } from "./types";

type ArenaFuseForecastProps = {
  agents: ArenaBattleAgent[];
  scenario: ArenaScenario;
  status: ArenaBattleStatus;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
};

const RISK_LABEL: Record<FuseRiskLevel, string> = {
  safe: "Safe",
  stressed: "Reduced margin",
  warning: "Outside derating",
  critical: "Critical",
  failed: "Beyond ratings",
};

/**
 * The pre-run reading: what F.U.S.E. makes of each part in these conditions,
 * BEFORE anything is driven past its rating.
 *
 * Two deliberate decisions about what this is and isn't:
 *
 * 1. It is analysed at NOMINAL load, not at the scenario's peak. Analysed at
 *    peak it would simply report which part the ramp is going to kill, which
 *    is the answer the run exists to produce — the same mistake the camera was
 *    making when it followed the most-stressed part and announced the winner
 *    early. At nominal it answers a different and fair question: with no
 *    overload at all, how much margin does this part have LEFT once this
 *    environment has taken its share? An engine bay eats most of a resistor's
 *    thermal headroom before the test begins, and that is worth knowing up
 *    front precisely because it is not the same as who wins.
 *
 * 2. It hides itself while a test is running. A forecast displayed alongside
 *    the event it forecasts stops being a forecast.
 *
 * This is F.U.S.E.'s risk model (`runFuseAnalysis`), which is a separate thing
 * from the failure detection the bench already runs every tick: detection asks
 * "has this part failed", this asks "how close to the edge is it standing".
 * The module existed complete and was wired to nothing.
 */
export function ArenaFuseForecast({
  agents,
  scenario,
  status,
  selectedAgentId,
  onSelectAgent,
}: ArenaFuseForecastProps) {
  const environment = useMemo(
    () => environmentFor(scenario, 1),
    [scenario],
  );
  const readings = useMemo(
    () =>
      agents.map((agent) => ({
        agent,
        fuse: runFuseAnalysis(agent, environment),
      })),
    [agents, environment],
  );

  const selected =
    readings.find((reading) => reading.agent.id === selectedAgentId) ?? null;

  if (status === "battling") {
    return null;
  }

  return (
    <section className="arena-forecast">
      <header className="arena-forecast__head">
        <h3 className="arena-forecast__title">F.U.S.E.™ pre-run risk</h3>
        {/* Every number carries its reference: the conditions it was computed
            under, and the fact that it is at nominal load rather than at the
            load the run is about to apply. */}
        <span className="arena-forecast__ref">
          at 1× load · {scenario.ambientC}°C · {scenario.humidityPercent}% RH
        </span>
      </header>

      <div className="arena-forecast__rows">
        {readings.map(({ agent, fuse }) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              type="button"
              className={`arena-forecast__row arena-forecast__row--${fuse.riskLevel}${
                isSelected ? " arena-forecast__row--selected" : ""
              }`}
              onClick={() => onSelectAgent(isSelected ? null : agent.id)}
              aria-pressed={isSelected}
            >
              <span className="arena-forecast__name">{agent.name}</span>
              <span className="arena-forecast__level">
                {RISK_LABEL[fuse.riskLevel]}
              </span>
              <span className="arena-forecast__score">
                {fuse.riskScore.toFixed(0)}/100 risk
              </span>
            </button>
          );
        })}
      </div>

      {/* The detail is for ONE part at a time, because the recommendation is a
          sentence and six sentences is a wall. Selecting a part here is the
          same selection as tapping it on the board. */}
      {selected ? (
        <div className="arena-forecast__detail">
          <p className="arena-forecast__recommend">
            {selected.fuse.recommendation}
          </p>
          <p className="arena-forecast__vitals">
            Junction {selected.fuse.junctionTemperature.toFixed(0)}°C · ΔT{" "}
            {selected.fuse.thermalRise.toFixed(0)}°C · using{" "}
            {(selected.fuse.powerUtilization * 100).toFixed(0)}% of rated power
          </p>
          {selected.fuse.failureModes.length > 0 ? (
            <ul className="arena-forecast__modes">
              {selected.fuse.failureModes.map((mode) => (
                <li key={mode.id} className={`arena-forecast__mode arena-forecast__mode--${mode.severity}`}>
                  <b>{mode.name}</b> — {mode.description}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="arena-forecast__hint">
          Tap a part — here or on the bench — for its failure modes.
        </p>
      )}
    </section>
  );
}
