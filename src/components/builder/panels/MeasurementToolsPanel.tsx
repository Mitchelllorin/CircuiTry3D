import { useEffect, useMemo, useRef } from "react";
import type { LegacyMeterState, MeterMode } from "../types";
import "./MeasurementToolsPanel.css";

type MeasurementToolsPanelProps = {
  meterState: LegacyMeterState | null;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
  onSetMode: (mode: MeterMode) => void;
  onToggleArmed: () => void;
  onClear: () => void;
};

const MODE_OPTIONS: Array<{ id: MeterMode; label: string; hint: string }> = [
  { id: "voltage", label: "Volts (V)", hint: "Measure voltage across two terminals" },
  { id: "current", label: "Amps (A)", hint: "Measure current through a component" },
  { id: "resistance", label: "Ohms (Ω)", hint: "Estimate resistance between terminals" },
  { id: "scope", label: "Scope", hint: "Probe a terminal over time" },
];

export function MeasurementToolsPanel({
  meterState,
  controlsDisabled,
  controlDisabledTitle,
  onSetMode,
  onToggleArmed,
  onClear,
}: MeasurementToolsPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const meterMode = meterState?.mode ?? "voltage";
  const meterArmed = meterState?.armed ?? false;
  const instructions =
    meterState?.instructions ??
    (controlsDisabled ? controlDisabledTitle ?? "Workspace is still loading." : "Enable probes to begin.");
  const probeA = meterState?.probeA ?? "—";
  const probeB = meterState?.probeB ?? "—";
  const reading = meterState?.reading ?? "—";
  const subreading = meterState?.subreading ?? "";
  const scopeBuffer = meterState?.scope?.buffer ?? [];
  const scopeReadout = meterState?.scope?.readout ?? "—";

  const statusLabel = meterArmed ? "Probes enabled" : "Probes disabled";
  const statusClass = meterArmed
    ? "measurement-panel__status measurement-panel__status--armed"
    : "measurement-panel__status measurement-panel__status--disarmed";

  const scopeSeries = useMemo(() => scopeBuffer.filter((value) => Number.isFinite(value)), [scopeBuffer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (meterMode !== "scope" || scopeSeries.length === 0) {
      return;
    }

    let minV = Math.min(...scopeSeries);
    let maxV = Math.max(...scopeSeries);
    if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return;
    if (Math.abs(maxV - minV) < 1e-6) {
      minV -= 1;
      maxV += 1;
    } else {
      const pad = (maxV - minV) * 0.2;
      minV -= pad;
      maxV += pad;
    }

    const toX = (i: number) => (width * i) / Math.max(scopeSeries.length - 1, 1);
    const toY = (v: number) => {
      const t = (v - minV) / (maxV - minV);
      return height - t * height;
    };

    ctx.strokeStyle = "rgba(0, 255, 136, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    scopeSeries.forEach((value, index) => {
      const x = toX(index);
      const y = toY(value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [meterMode, scopeSeries]);

  return (
    <div className="measurement-panel">
      <header className="measurement-panel__header">
        <div>
          <h2 className="measurement-panel__title">Measurement Tools</h2>
          <p className="measurement-panel__subtitle">
            Multimeter + scope tools for live circuit reads.
          </p>
        </div>
        <span className={statusClass}>{statusLabel}</span>
      </header>

      <section className="measurement-panel__section">
        <span className="measurement-panel__section-title">Modes</span>
        <div className="measurement-panel__mode-grid">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="measurement-panel__mode-btn"
              onClick={() => onSetMode(option.id)}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-pressed={meterMode === option.id}
              data-active={meterMode === option.id ? "true" : undefined}
              title={controlsDisabled ? controlDisabledTitle : option.hint}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="measurement-panel__section measurement-panel__actions">
        <button
          type="button"
          className="measurement-panel__action-btn"
          onClick={onToggleArmed}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          title={controlsDisabled ? controlDisabledTitle : "Toggle probe arming"}
        >
          {meterArmed ? "Disable probes" : "Enable probes"}
        </button>
        <button
          type="button"
          className="measurement-panel__action-btn measurement-panel__action-btn--secondary"
          onClick={onClear}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          title={controlsDisabled ? controlDisabledTitle : "Clear probe selections"}
        >
          Clear
        </button>
      </section>

      <section className="measurement-panel__section">
        <div className="measurement-panel__instructions">{instructions}</div>
      </section>

      <section className="measurement-panel__section measurement-panel__probe-grid">
        <div className="measurement-panel__probe">
          <span className="measurement-panel__probe-title measurement-panel__probe-title--red">
            Red probe
          </span>
          <span className="measurement-panel__probe-value">{probeA}</span>
        </div>
        <div className="measurement-panel__probe">
          <span className="measurement-panel__probe-title measurement-panel__probe-title--black">
            Black probe
          </span>
          <span className="measurement-panel__probe-value">{probeB}</span>
        </div>
      </section>

      <section className="measurement-panel__section measurement-panel__reading">
        <div className="measurement-panel__reading-header">
          <span className="measurement-panel__reading-label">Reading</span>
          <span className="measurement-panel__reading-value">{reading}</span>
        </div>
        {subreading && (
          <div className="measurement-panel__subreading">{subreading}</div>
        )}
      </section>

      {meterMode === "scope" && (
        <section className="measurement-panel__section measurement-panel__scope">
          <div className="measurement-panel__scope-header">
            <span className="measurement-panel__scope-title">Oscilloscope (DC)</span>
            <span className="measurement-panel__scope-readout">{scopeReadout}</span>
          </div>
          <canvas ref={canvasRef} className="measurement-panel__scope-canvas" />
          <p className="measurement-panel__scope-hint">
            Pick a terminal for the scope probe. Black probe is the reference if set.
          </p>
        </section>
      )}
    </div>
  );
}
