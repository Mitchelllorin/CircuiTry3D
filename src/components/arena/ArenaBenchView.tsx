import { useMemo, useState } from "react";
import { WorkspaceModePanel } from "../builder/panels/WorkspaceModePanel";
import { ArenaScene } from "./ArenaScene";
import {
  ArenaScenarioSelect,
  ArenaTestCard,
  ArenaTestLog,
} from "./ArenaInstrumentation";
import type { BenchStressor } from "./useBenchSession";
import { useBenchSession } from "./useBenchSession";
import type { ArenaBattleAgent } from "./types";

type ArenaBenchViewProps = {
  /** Components available to bench-test (the same roster battle mode uses). */
  roster: ArenaBattleAgent[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  onNavigateBack: () => void;
  /** Switch to head-to-head battle mode. */
  onSwitchToBattle: () => void;
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
}: ArenaBenchViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    roster[0]?.id ?? null,
  );
  const [stressor] = useState<BenchStressor>("current");

  const component = useMemo(
    () => roster.find((a) => a.id === selectedId) ?? roster[0] ?? null,
    [roster, selectedId],
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
  } = useBenchSession({ component, stressor });

  const running = status === "battling";
  const complete = status === "complete";

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
    <div className="arena-view arena-view--workspace arena-view--bench">
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
        winnerName={null}
        survivorCount={agent && agent.phase !== "failed" ? 1 : 0}
        workspaceMode
        panelOpen={panelOpen}
        solo
        onExitTransitionComplete={() => undefined}
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
              <div className="arena-panel__meta-pills">
                <span>{component ? component.name : "No part selected"}</span>
                <span>Ramping {stressor}</span>
                <span>
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

          {/* ── Component picker ── */}
          <div className="arena-bench-picker" aria-label="Choose a component to test">
            <span className="arena-bench-picker__label">Part under test</span>
            <div className="arena-bench-picker__chips">
              {roster.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`arena-bench-chip${
                    a.id === component?.id ? " is-active" : ""
                  }`}
                  onClick={() => setSelectedId(a.id)}
                  disabled={running}
                >
                  <span className="arena-bench-chip__name">{a.name}</span>
                  <span className="arena-bench-chip__rating">
                    {Math.round(a.ratings.junctionLimitC)}°C ·{" "}
                    {fmtAmps(a.ratings.maxCurrent)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Stressor picker (v1: current) ── */}
          <div className="arena-bench-picker" aria-label="Choose the stressor to ramp">
            <span className="arena-bench-picker__label">Ramp this</span>
            <div className="arena-bench-picker__chips">
              {STRESSORS.map((s) => (
                <button
                  key={s.id}
                  type="button"
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

          <button
            type="button"
            className="arena-bench-run"
            onClick={startTest}
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

          {agent ? (
            <ArenaTestCard agent={agent} isMostStressed={running} />
          ) : null}

          <ArenaTestLog log={log} winnerName={null} heading="Test Log" />
        </div>
      </WorkspaceModePanel>
    </div>
  );
}
