import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WorkspaceModePanel } from "../builder/panels/WorkspaceModePanel";
import { ArenaScene } from "./ArenaScene";
import { ArenaScenarioSelect, ArenaTestLog } from "./ArenaInstrumentation";
import { ArenaFuseForecast } from "./ArenaFuseForecast";
import { ArenaDashboard } from "./ArenaDashboard";
import { ArenaQuickBar } from "./ArenaQuickBar";
import { ArenaRosterPicker } from "./ArenaRosterPicker";
import type { ComponentAction } from "../builder/types";
import type { BenchStressor } from "./useBenchSession";
import { useBenchSession } from "./useBenchSession";
import { loadFromSupply, supplyDivider } from "./supplyLoad";
import { overdriveCeiling } from "./stressTest";
import type { ArenaBattleAgent } from "./types";

type ArenaBenchViewProps = {
  /** Components available to bench-test (the same roster battle mode uses). */
  roster: ArenaBattleAgent[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  onNavigateBack: () => void;
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

/** v1 wires "current"; the rest are shown disabled so the path is visible. */
const STRESSORS: { id: BenchStressor; label: string; ready: boolean }[] = [
  { id: "current", label: "Current", ready: true },
  { id: "voltage", label: "Voltage", ready: false },
  { id: "temperature", label: "Temperature", ready: false },
  { id: "time", label: "Time @ load", ready: false },
];

function fmtAmps(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value >= 1 ? `${value.toFixed(2)} A` : `${Math.round(value * 1000)} mA`;
}

export default function ArenaBenchView({
  roster,
  panelOpen,
  onTogglePanel,
  onNavigateBack,
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
  const [stressor] = useState<BenchStressor>("current");

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
  } = useBenchSession({ component, stressor });

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

  /**
   * Starting a run closes the params panel — the camera is inert until it is.
   *
   * With the panel open the scene holds a locked preview pose and gives the
   * camera to nobody, so the push-in onto the part, the walk across the bench
   * and the cut to a failure all sit out the entire run. Same trap as battle
   * mode: it was guaranteed only while the panel's own button was the sole way
   * to start, and the console switch quietly broke that.
   */
  const handleStartRun = useCallback(() => {
    startTest();
    if (panelOpen) {
      onTogglePanel();
    }
  }, [startTest, panelOpen, onTogglePanel]);

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
        onStartTest={handleStartRun}
        onLoadChange={setLoad}
        winnerName={null}
        // A solo bench has one part, so surviving IS winning — it gets the
        // victor's ring for the same reason a battle winner does. A part that
        // died gets nothing, which is the whole distinction.
        winnerId={agent && agent.phase !== "failed" ? agent.id : null}
        survivorCount={agent && agent.phase !== "failed" ? 1 : 0}
        workspaceMode
        panelOpen={panelOpen}
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
        board={board}
        extra={
          /* The way to the other bench, without going through the panel.
             It names its DESTINATION, not the current state — every other
             entry in this strip shows what is loaded (Parts, Conditions), but
             a control that announces where you already are does not read as a
             way out. An exit is named for the other side of the door. */
          <button
            type="button"
            className="arena-quickbar__btn"
            onClick={onSwitchToBattle}
            disabled={running}
          >
            <span className="arena-quickbar__label">Switch to</span>
            <span className="arena-quickbar__value">Head-to-head</span>
          </button>
        }
      />

      {/* The console: fixed at the bottom, carrying only the live-run controls. */}
      <ArenaDashboard
        status={status}
        voltsMultiple={liveVolts}
        voltsMax={overdriveCeiling(scenario)}
        onVoltsChange={(volts) => applySupply(volts, seriesOhms)}
        seriesOhms={seriesOhms}
        onSeriesOhmsChange={(ohms) => applySupply(voltsMultiple, ohms)}
        onHeightChange={setDashHeight}
        onThrowSwitch={running ? resetTest : handleStartRun}
      />
      <WorkspaceModePanel
        title="Solo Bench"
        subtitle="Stress one part to find where it breaks"
        isOpen={panelOpen}
        onToggle={onTogglePanel}
        className="workspace-mode-panel--arena"
      >
        <div className="arena-panel arena-bench-panel">
          <div className="arena-panel__controls">
            <div className="arena-panel__meta">
              <span className="arena-eyebrow">Solo Stress Bench · Playable Datasheet</span>
              {/* Status read-out, not controls — styled as flat badges (see
                  arena.css .arena-panel__meta-pills--status) so they don't read
                  as clickable chips. The live phase is a polite live region. */}
              <div className="arena-panel__meta-pills arena-panel__meta-pills--status">
                <span>{component ? component.name : "No part selected"}</span>
                <span>Ramping {stressor}</span>
                <span role="status" aria-live="polite">
                  {complete
                    ? envelope?.survived
                      ? "Survived the ramp"
                      : "Failure point found"
                    : running
                      ? "Test running"
                      : "Ready to test"}
                </span>
              </div>
            </div>
            <div className="arena-panel__actions">
              <button
                type="button"
                className="arena-button arena-button--secondary"
                onClick={onSwitchToBattle}
              >
                Battle mode
              </button>
              <button
                type="button"
                className="arena-button arena-button--secondary"
                onClick={resetTest}
              >
                Reset
              </button>
              <button
                type="button"
                className="arena-button arena-button--ghost"
                onClick={onNavigateBack}
              >
                Return to Workspace
              </button>
            </div>
          </div>

          {/* ── Component picker ──
              The SAME picker the battle arena uses, over the same library the
              workspace builds from. This used to be a bespoke chip row that
              could only offer whatever the builder had last exported, so the
              bench — the screen the arena actually opens on — was the one place
              you could not choose what to test. */}
          <ArenaRosterPicker
            agents={roster}
            selectedAgentId={component?.id ?? null}
            onSelectAgent={onSelectAgent}
            onAddComponent={onAddComponent}
            onRemoveAgent={onRemoveAgent}
            onEditAgent={onEditAgent}
            disabled={running}
            full={rosterFull}
          />

          {/* ── Stressor picker (v1: current) ── */}
          <div className="arena-bench-picker" role="group" aria-label="Choose the stressor to ramp">
            <span className="arena-bench-picker__label">Ramp this</span>
            <div className="arena-bench-picker__chips">
              {STRESSORS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === stressor}
                  className={`arena-bench-chip arena-bench-chip--stressor${
                    s.id === stressor ? " is-active" : ""
                  }`}
                  disabled={!s.ready || running}
                  title={s.ready ? undefined : "Coming soon"}
                >
                  <span className="arena-bench-chip__name">{s.label}</span>
                  {!s.ready ? (
                    <span className="arena-bench-chip__rating">soon</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <ArenaScenarioSelect
            scenario={scenario}
            onSelect={selectScenario}
            disabled={running}
          />

          {/* Same reading as battle mode, against this bench's own scenario —
              which on a bench is also how you choose WHICH part is worth
              testing before you spend a run on it. */}
          <ArenaFuseForecast
            agents={roster}
            scenario={scenario}
            status={status}
            selectedAgentId={component?.id ?? null}
            onSelectAgent={onSelectAgent}
          />

          <button
            type="button"
            className="arena-bench-run"
            onClick={handleStartRun}
            disabled={running || !component}
          >
            {running
              ? `Ramping… ${fmtAmps(
                  component ? component.metrics.current * stressFactor : null,
                )}`
              : complete
                ? `↻ Re-run test`
                : `▶ Test`}
          </button>

          {/* ── The envelope the user discovered ── */}
          {envelope && (complete || running) ? (
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
          ) : null}

          {/* The per-part test card is gone. It was the last survivor of the
              old card grid, and on the solo bench it restated what the scene
              already says better: the floating nameplate carries the part's
              live W.I.R.E. figures and its temperature against its own limit,
              and the F.U.S.E. readout carries WHY it died. A panel repeating
              all of that is just a second place to look. */}

          <ArenaTestLog log={log} winnerName={null} heading="Test Log" />
        </div>
      </WorkspaceModePanel>
    </div>
  );
}
