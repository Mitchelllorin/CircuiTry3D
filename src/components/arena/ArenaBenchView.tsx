import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArenaScene } from "./ArenaScene";
import { ArenaTestLog } from "./ArenaInstrumentation";
import { ArenaFuseForecast } from "./ArenaFuseForecast";
import { ArenaDashboard } from "./ArenaDashboard";
import { ArenaQuickBar } from "./ArenaQuickBar";
import type { ComponentAction } from "../builder/types";
import type { BenchStressor } from "./useBenchSession";
import { useBenchSession } from "./useBenchSession";
import { loadFromSupply, supplyDivider } from "./supplyLoad";
import { overdriveCeiling } from "./stressTest";
import type { ArenaBattleAgent } from "./types";

type ArenaBenchViewProps = {
  /** Components available to bench-test (the same roster battle mode uses). */
  roster: ArenaBattleAgent[];
  /** Switch to head-to-head battle mode. */
  onSwitchToBattle: () => void;
  /**
   * Selection is OWNED BY THE ARENA, not by this view.
   *
   * The bench used to keep its own `selectedId`, which made it a third
   * selection model on top of the workspace's and the battle arena's — and
   * because it was local, walking from the bench to battle mode lost track of
   * the part you were looking at. Here "selected" and "the part under test"
   * are the same thing, which is exactly what selection should mean on a bench
   * that tests one part at a time.
   */
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  /** Add a library part to the bench, or swap it for the selected one. */
  onAddComponent: (action: ComponentAction) => void;
  onRemoveAgent: (id: string) => void;
  onEditAgent: (id: string) => void;
  rosterFull: boolean;
  /** The shared board element, shown in the quick bar's Results sheet. */
  board: ReactNode;
  /**
   * Files this bench's finished runs into that same board.
   *
   * The bench must report too, not just battle mode: comparing ONE part across
   * ratings is the primary thing a solo bench is for, so a board that only
   * heard about battles would miss the comparison it exists to show.
   */
  onRunComplete: (agents: ArenaBattleAgent[], scenarioName: string) => void;
};

/**
 * v1 ramps current only. The Voltage / Temperature / Time chips that used to
 * advertise the rest were never wired ("soon"), and went with the panel.
 */
const STRESSOR: BenchStressor = "current";

function fmtAmps(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value >= 1 ? `${value.toFixed(2)} A` : `${Math.round(value * 1000)} mA`;
}

/**
 * The solo bench: one part, ramped until it breaks.
 *
 * There is no params panel any more. It covered y208–757 of a 915px phone —
 * the 3D bench was a strip along the top — and nearly everything in it was a
 * second copy of something already on the arena: the part picker and the
 * conditions are on the quick bar, the Test button is the console's switch,
 * Battle mode and Reset are on the console's bench row. The three things only
 * the panel carried moved to where they are used: the F.U.S.E. forecast into
 * the Parts sheet (it is how you choose a part), the envelope and the test log
 * into Results (they are what a run found).
 */
export default function ArenaBenchView({
  roster,
  onSwitchToBattle,
  selectedAgentId,
  onSelectAgent,
  onAddComponent,
  onRemoveAgent,
  onEditAgent,
  rosterFull,
  board,
  onRunComplete,
}: ArenaBenchViewProps) {
  // Nothing selected still has to bench SOMETHING, so it falls back to the
  // first part rather than showing an empty bench.
  const component = useMemo(
    () => roster.find((a) => a.id === selectedAgentId) ?? roster[0] ?? null,
    [roster, selectedAgentId],
  );

  const {
    agent,
    agents,
    status,
    stressFactor,
    progress,
    scenario,
    envelope,
    log,
    startTest,
    resetTest,
    selectScenario,
    setLoad,
  } = useBenchSession({ component, stressor: STRESSOR });

  // The supply, mirroring battle mode: the controls are DOM, so their values
  // are React state and the load maths comes from the one shared module.
  const [voltsMultiple, setVoltsMultiple] = useState(1);
  const [seriesOhms, setSeriesOhms] = useState(0);
  const applySupply = useCallback(
    (volts: number, ohms: number) => {
      setVoltsMultiple(volts);
      setSeriesOhms(ohms);
      setLoad(loadFromSupply(agents, volts, ohms));
    },
    [agents, setLoad],
  );

  // Same as battle mode: the ramp owns the load while running, so the handle
  // is driven from the live load rather than from where it was last dropped.
  const liveVolts = useMemo(() => {
    if (status !== "battling") return voltsMultiple;
    const divider = supplyDivider(agents, seriesOhms);
    return divider > 0 ? stressFactor / divider : voltsMultiple;
  }, [status, agents, seriesOhms, stressFactor, voltsMultiple]);

  // How much of the canvas the console covers, measured live, so the circuit
  // composes into the space actually left for it.
  const [dashHeight, setDashHeight] = useState(0);

  const running = status === "battling";
  const complete = status === "complete";

  // File this run once, on the transition INTO "complete" — same guard as
  // battle mode, and for the same reason: watching the value rather than the
  // transition re-files the identical result on every later render.
  const lastStatusRef = useRef<string>(status);
  useEffect(() => {
    const previous = lastStatusRef.current;
    lastStatusRef.current = status;
    if (status === "complete" && previous !== "complete") {
      onRunComplete(agents, scenario.name);
    }
  }, [status, agents, scenario.name, onRunComplete]);

  // ── Safe-operating-area bar: zones the user discovered by ramping the part ──
  const soa = useMemo(() => {
    if (!envelope || envelope.rampMax <= 0) return null;
    const span = envelope.rampMax;
    const pct = (v: number | null) =>
      v == null ? null : Math.max(0, Math.min(100, (v / span) * 100));
    return {
      safe: pct(envelope.safeMax ?? envelope.degradeAt),
      fail: pct(envelope.failAt),
      now: pct(
        agent ? agent.metrics.current * stressFactor : null,
      ),
    };
  }, [envelope, agent, stressFactor]);

  // ── The envelope the user discovered ──
  const envelopeReadout =
    envelope && (complete || running) ? (
      <div className="arena-bench-envelope" aria-label="Operating envelope">
        <div className="arena-bench-envelope__row">
          <span className="arena-bench-envelope__k arena-bench-envelope__k--safe">
            Safe to
          </span>
          <strong>{fmtAmps(envelope.safeMax)}</strong>
        </div>
        <div className="arena-bench-envelope__row">
          <span className="arena-bench-envelope__k arena-bench-envelope__k--degrade">
            Leaves safe zone
          </span>
          <strong>{fmtAmps(envelope.degradeAt)}</strong>
        </div>
        <div className="arena-bench-envelope__row">
          <span className="arena-bench-envelope__k arena-bench-envelope__k--fail">
            {envelope.survived ? "Survived ramp" : "Fails"}
          </span>
          <strong>
            {envelope.survived
              ? `≥ ${fmtAmps(envelope.rampMax)}`
              : `${fmtAmps(envelope.failAt)}${
                  envelope.failureName ? ` · ${envelope.failureName}` : ""
                }`}
          </strong>
        </div>

        {/* Safe-operating-area bar (current axis 0 → ramp max) */}
        {soa ? (
          <div
            className="arena-bench-soa"
            aria-label="Safe operating area along the current axis"
          >
            <div
              className="arena-bench-soa__safe"
              style={{ width: `${soa.safe ?? 0}%` }}
            />
            {soa.fail != null ? (
              <div
                className="arena-bench-soa__fail-marker"
                style={{ left: `${soa.fail}%` }}
              />
            ) : null}
            {soa.now != null && running ? (
              <div
                className="arena-bench-soa__now"
                style={{ left: `${soa.now}%` }}
              />
            ) : null}
            <span className="arena-bench-soa__axis">
              0 — {fmtAmps(envelope.rampMax)}
            </span>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className="arena-view arena-view--workspace arena-view--bench"
      style={{ "--arena-dash-height": `${dashHeight}px` } as React.CSSProperties}
    >
      <ArenaScene
        agents={agents}
        activeAgentId={agent?.id ?? null}
        highlight={null}
        transitionPhase="active"
        status={status}
        stressFactor={stressFactor}
        stressMax={scenario.stressMax}
        progress={progress}
        onStartTest={startTest}
        onLoadChange={setLoad}
        winnerName={null}
        // A solo bench has one part, so surviving IS winning — it gets the
        // victor's ring for the same reason a battle winner does. A part that
        // died gets nothing, which is the whole distinction.
        winnerId={agent && agent.phase !== "failed" ? agent.id : null}
        survivorCount={agent && agent.phase !== "failed" ? 1 : 0}
        workspaceMode
        // No panel, so never "open": the scene only hands the camera to the
        // user (push-in, cut to a failure, orbit) once this is false.
        panelOpen={false}
        // The solo bench already had a selected part — it just had no way to
        // pick one by touching it. Handing the scene the arena's selection
        // means tapping the part on the board, tapping its chip, and tapping
        // its forecast row are all the same act, here and in battle mode.
        selectedAgentId={component?.id ?? null}
        onSelectAgent={onSelectAgent}
        onLongPressAgent={onEditAgent}
        solo
        bottomInsetPx={dashHeight}
        onExitTransitionComplete={() => undefined}
      />

      {/* Parts / Conditions / Results, on the arena. Same surface as battle
          mode, because the bench and the battle are one instrument with a
          different experiment in it. */}
      <ArenaQuickBar
        agents={roster}
        selectedAgentId={component?.id ?? null}
        onSelectAgent={onSelectAgent}
        onAddComponent={onAddComponent}
        onRemoveAgent={onRemoveAgent}
        onEditAgent={onEditAgent}
        rosterFull={rosterFull}
        scenario={scenario}
        onSelectScenario={selectScenario}
        status={status}
        // Same reading as battle mode, against this bench's own scenario —
        // which on a bench is also how you choose WHICH part is worth testing
        // before you spend a run on it.
        partsFooter={
          <ArenaFuseForecast
            agents={roster}
            scenario={scenario}
            status={status}
            selectedAgentId={component?.id ?? null}
            onSelectAgent={onSelectAgent}
          />
        }
        board={
          <>
            {envelopeReadout}
            {board}
            <ArenaTestLog log={log} winnerName={null} heading="Test Log" />
          </>
        }
      />

      {/* The console: fixed at the bottom — the live-run controls, and which
          bench you are at. */}
      <ArenaDashboard
        status={status}
        voltsMultiple={liveVolts}
        voltsMax={overdriveCeiling(scenario)}
        onVoltsChange={(volts) => applySupply(volts, seriesOhms)}
        seriesOhms={seriesOhms}
        onSeriesOhmsChange={(ohms) => applySupply(voltsMultiple, ohms)}
        onHeightChange={setDashHeight}
        onThrowSwitch={running ? resetTest : startTest}
        mode="bench"
        onSwitchMode={(next) => {
          if (next === "battle") onSwitchToBattle();
        }}
        onReset={resetTest}
      />
    </div>
  );
}
