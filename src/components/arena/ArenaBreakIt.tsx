import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArenaFailureCard } from "./ArenaFailureCard";
import { ArenaScene } from "./ArenaScene";
import {
  STRESS_BANDS,
  breakingLoadFor,
  gaugeFor,
  limitLabelFor,
  limitSourceFor,
  presetsFor,
  stressBandFor,
  stressBandLabel,
} from "./breakIt";
import { overdriveCeiling } from "./stressTest";
import { useBenchSession, type BenchStressor } from "./useBenchSession";
import type { ArenaBattleAgent, FuseRiskLevel } from "./types";

type ArenaBreakItProps = {
  roster: ArenaBattleAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  /** Walk to the ordinary bench or the battle. The Ramp is the front door. */
  onSwitchMode: (mode: "bench" | "battle") => void;
};

const BAND_FILL: Record<FuseRiskLevel, number> = {
  safe: 1,
  stressed: 2,
  warning: 3,
  critical: 4,
  failed: 5,
};

/** How many stress bars the strip shows before it has to be asked for more. */
const BARS_SHOWN = 3;

/**
 * THE RAMP — the arena's front door.
 *
 * The other two modes are experiments: the bench finds an envelope, the battle
 * finds a winner. This one is a demonstration with a number on it — park a part
 * at a load, hold it there, and watch it fail for the reason its datasheet says
 * it would. The gauges are the factor being ramped and the part's own margin;
 * the bars are the worst three parts in play, each limit labelled with its
 * owner; the presets are loads proven to break a part.
 *
 * The 3D workspace is the show, so this is a strip and not a panel: temptingly
 * tall — up to a third of the screen at 360×640 — glass, on the bottom edge,
 * gone at the break. Readouts first, the ramp, the switch, the parts closest to
 * failing, the presets. Nothing else.
 *
 * No maker names in here. A preset says what happens ("Overload the fuse"), and
 * the maker's name and ordering code stay on the part and on its failure card.
 */
export function ArenaBreakIt({
  roster,
  selectedAgentId,
  onSelectAgent,
  onSwitchMode,
}: ArenaBreakItProps) {
  const component = useMemo(
    () => roster.find((agent) => agent.id === selectedAgentId) ?? roster[0] ?? null,
    [roster, selectedAgentId],
  );

  const [stressor, setStressor] = useState<BenchStressor>("current");
  const {
    agent,
    agents,
    status,
    stressFactor,
    scenario,
    startTest,
    resetTest,
    setLoad,
    heldFactor,
    holdAt,
    releaseHold,
  } = useBenchSession({ component, stressor });

  const [factor, setFactor] = useState(1);
  const [cardDismissed, setCardDismissed] = useState(false);
  const [showAllBars, setShowAllBars] = useState(false);
  const consoleRef = useRef<HTMLElement | null>(null);
  const [consoleHeight, setConsoleHeight] = useState(0);
  const pendingPresetRef = useRef<number | null>(null);

  const running = status === "battling";
  const ceiling = overdriveCeiling(scenario);

  // The console is the floor the scene composes against — measured, not assumed.
  useEffect(() => {
    const element = consoleRef.current;
    if (!element) return;
    const report = () => setConsoleHeight(element.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A new run is a new failure to show; nothing stays dismissed across runs.
  useEffect(() => {
    setCardDismissed(false);
  }, [status, component?.id]);

  // The full bar list is a look, not a mode: a run starting closes it, so the
  // strip is back to the three parts that matter while something is cooking.
  useEffect(() => {
    if (running) setShowAllBars(false);
  }, [running]);

  const selectedGauge = useMemo(
    () => gaugeFor(component, running ? stressFactor : factor, scenario),
    [component, running, stressFactor, factor, scenario],
  );

  // Every part in play, not just the one selected: the bar answers "what will
  // this load do to the whole bench", which is the question a comparison asks.
  const bars = useMemo(
    () =>
      roster.map((part) => {
        const live = part.id === component?.id && agent ? agent : null;
        const gauge = gaugeFor(part, running ? stressFactor : factor, scenario);
        const band = live
          ? stressBandFor(live.severity, live.phase)
          : (gauge?.band ?? "safe");
        return {
          id: part.id,
          name: part.name,
          band,
          loadPercent: live ? live.loadPercent : gauge?.loadPercent ?? 0,
          limit: limitLabelFor(part),
          source: limitSourceFor(part),
        };
      }),
    [roster, component?.id, agent, running, stressFactor, factor, scenario],
  );

  // Worst first, so the three on show are the three about to go. Ties break on
  // load, which is stable, so the strip does not reshuffle as the model turns.
  const rankedBars = useMemo(
    () =>
      [...bars].sort(
        (a, b) =>
          BAND_FILL[b.band] - BAND_FILL[a.band] || b.loadPercent - a.loadPercent,
      ),
    [bars],
  );
  const visibleBars = showAllBars ? rankedBars : rankedBars.slice(0, BARS_SHOWN);

  const presets = useMemo(() => presetsFor(roster, scenario), [roster, scenario]);

  const handleRamp = useCallback(
    (next: number) => {
      setFactor(next);
      if (running) setLoad(next);
    },
    [running, setLoad],
  );

  const handleStart = useCallback(() => {
    setFactor(1);
    startTest();
  }, [startTest]);

  const handleHold = useCallback(() => {
    if (heldFactor != null) {
      releaseHold();
      return;
    }
    if (!running) {
      startTest();
    }
    holdAt(factor);
  }, [heldFactor, releaseHold, running, startTest, holdAt, factor]);

  const handleReset = useCallback(() => {
    resetTest();
    setFactor(1);
    setCardDismissed(false);
  }, [resetTest]);

  const handlePreset = useCallback(
    (agentId: string, loadFactor: number) => {
      pendingPresetRef.current = loadFactor;
      setFactor(loadFactor);
      onSelectAgent(agentId);
      if (component?.id === agentId) {
        pendingPresetRef.current = null;
        startTest();
        holdAt(loadFactor);
      }
    },
    [component?.id, onSelectAgent, startTest, holdAt],
  );

  // A preset tapped on a part that was not selected lands here, once the bench
  // has re-armed around that part.
  useEffect(() => {
    const pending = pendingPresetRef.current;
    if (pending == null || !component) return;
    pendingPresetRef.current = null;
    startTest();
    holdAt(pending);
  }, [component?.id, startTest, holdAt]);

  const failed = agent?.phase === "failed" ? agent : null;

  return (
    <div className="arena-view arena-view--workspace arena-view--break">
      <ArenaScene
        agents={agents}
        activeAgentId={component?.id ?? null}
        highlight={null}
        transitionPhase="active"
        status={status}
        stressFactor={stressFactor}
        stressMax={scenario.stressMax}
        progress={Math.min((stressFactor - 1) / Math.max(ceiling - 1, 0.001), 1)}
        onStartTest={handleStart}
        onLoadChange={setLoad}
        winnerName={null}
        winnerId={null}
        survivorCount={0}
        nameplates={false}
        workspaceMode
        panelOpen={false}
        selectedAgentId={component?.id ?? null}
        onSelectAgent={onSelectAgent}
        solo
        bottomInsetPx={consoleHeight}
        onExitTransitionComplete={() => undefined}
      />

      {failed && !cardDismissed ? (
        <ArenaFailureCard
          agent={failed}
          onDismiss={() => setCardDismissed(true)}
          onReset={handleReset}
          bottomOffsetPx={consoleHeight}
        />
      ) : null}

      <section
        ref={consoleRef}
        className={`arena-breakit${failed ? " is-broken" : ""}`}
        aria-label="The Ramp dashboard"
      >
        {/* One readout strip with the mode switch at its end — the same shape
            as every sibling app's dashboard. Numbers, not cards. */}
        <div className="arena-breakit__dash">
          <div className="arena-breakit__gauges">
            <div className="arena-breakit__gauge">
              <span>Load</span>
              <b>{(running ? stressFactor : factor).toFixed(2)}×</b>
            </div>
            <div
              className={`arena-breakit__gauge arena-breakit__gauge--${selectedGauge?.band ?? "safe"}`}
            >
              <span>Temp</span>
              {/* A failed part says FAILED, never the 25 °C it started at. */}
              <b>
                {agent?.phase === "failed"
                  ? "FAILED"
                  : `${Math.round(agent ? agent.tempC : selectedGauge?.tempC ?? 0)}°C`}
              </b>
            </div>
            <div className="arena-breakit__gauge">
              <span>At limit</span>
              <b>
                {Math.round(
                  agent ? agent.loadPercent : selectedGauge?.loadPercent ?? 0,
                )}
                %
              </b>
            </div>
          </div>
          <div role="group" aria-label="Arena mode" className="arena-breakit__modes">
            <button
              type="button"
              className="arena-breakit__mode is-on"
              aria-pressed
              disabled
            >
              The Ramp
            </button>
            <button
              type="button"
              className="arena-breakit__mode"
              onClick={() => onSwitchMode("bench")}
            >
              Solo
            </button>
            <button
              type="button"
              className="arena-breakit__mode"
              onClick={() => onSwitchMode("battle")}
            >
              Battle
            </button>
          </div>
        </div>

        <label className="arena-breakit__ramp">
          <input
            type="range"
            min={1}
            max={ceiling}
            step={0.01}
            value={Math.min(Math.max(running ? stressFactor : factor, 1), ceiling)}
            onChange={(event) => handleRamp(Number(event.target.value))}
            aria-label={`Ramp ${stressor} past the part's limit`}
          />
        </label>

        <div className="arena-breakit__row">
          {(["current", "voltage"] as BenchStressor[]).map((axis) => (
            <button
              key={axis}
              type="button"
              className={`arena-breakit__chip${stressor === axis ? " is-on" : ""}`}
              aria-pressed={stressor === axis}
              disabled={running}
              onClick={() => setStressor(axis)}
            >
              {axis === "current" ? "Current" : "Voltage"}
            </button>
          ))}
          <button
            type="button"
            className={`arena-breakit__hold${heldFactor != null ? " is-held" : ""}`}
            aria-pressed={heldFactor != null}
            onClick={handleHold}
          >
            {heldFactor != null ? "Release" : "Hold"}
          </button>
          <button
            type="button"
            className="arena-breakit__act"
            onClick={running ? handleReset : handleStart}
          >
            {running ? "Stop" : "Run"}
          </button>
          <button type="button" className="arena-breakit__act" onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* The three parts closest to failing, each in F.U.S.E.'s five levels
            with its limit and whose number it is. The rest are one tap away and
            the list closes itself when a run starts. */}
        <div className="arena-breakit__bars">
          <ul className="arena-breakit__bars-list">
            {visibleBars.map((bar) => (
              <li
                key={bar.id}
                className={`arena-breakit__bar arena-breakit__bar--${bar.band}`}
              >
                <button
                  type="button"
                  className="arena-breakit__bar-name"
                  onClick={() => onSelectAgent(bar.id)}
                  aria-pressed={bar.id === component?.id}
                >
                  {bar.name}
                </button>
                <span className="arena-breakit__bar-state">
                  {stressBandLabel(bar.band)}
                </span>
                <span
                  className="arena-breakit__bar-track"
                  aria-label={`${stressBandLabel(bar.band)}, ${Math.round(
                    bar.loadPercent,
                  )} percent of rating`}
                >
                  {STRESS_BANDS.map((band) => (
                    <i
                      key={band}
                      className={
                        BAND_FILL[band] <= BAND_FILL[bar.band] ? "is-filled" : ""
                      }
                    />
                  ))}
                </span>
                <span className="arena-breakit__bar-limit" title={bar.limit}>
                  {bar.limit}
                </span>
              </li>
            ))}
          </ul>
          {bars.length > BARS_SHOWN ? (
            <button
              type="button"
              className="arena-breakit__bars-more"
              onClick={() => setShowAllBars((all) => !all)}
              aria-expanded={showAllBars}
            >
              {showAllBars ? `Top ${BARS_SHOWN}` : `All ${bars.length}`}
            </button>
          ) : null}
        </div>

        {presets.length > 0 ? (
          <div className="arena-breakit__presets">
            <span className="arena-breakit__presets-label">Breaks</span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="arena-breakit__preset"
                onClick={() => handlePreset(preset.agentId, preset.loadFactor)}
              >
                {preset.label}
                <em>
                  {preset.loadFactor.toFixed(2)}× ·{" "}
                  {preset.safeFactor != null
                    ? `holds to ${preset.safeFactor.toFixed(2)}×`
                    : "over limit at 1×"}
                </em>
              </button>
            ))}
          </div>
        ) : (
          <p className="arena-breakit__none">
            No part here can be broken by this ramp — add one with a rating.
          </p>
        )}
      </section>
    </div>
  );
}

/** Re-exported so the tests and any bench preset can ask the same question. */
export { breakingLoadFor };
