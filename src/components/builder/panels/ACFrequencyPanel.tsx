import { useState, useCallback, useMemo } from "react";
import { useACMetricsSync } from "../../../hooks/useMetricsSync";
import {
  COMMON_AC_FREQUENCIES,
  DEFAULT_AC_FREQUENCY,
  type ACCircuitInput,
  type CircuitMode,
} from "../../../utils/electrical";
import "./ACFrequencyPanel.css";

type BaseMetrics = {
  watts: number;
  current: number;
  resistance: number;
  voltage: number;
};

type ACFrequencyPanelProps = {
  baseMetrics?: BaseMetrics;
  inductance?: number;
  capacitance?: number;
  onModeChange?: (mode: CircuitMode) => void;
  onFrequencyChange?: (frequency: number) => void;
  isCompact?: boolean;
};

const FREQUENCY_PRESETS = [
  { label: "50 Hz", value: COMMON_AC_FREQUENCIES.europe, region: "Europe/Asia" },
  { label: "60 Hz", value: COMMON_AC_FREQUENCIES.northAmerica, region: "Americas" },
  { label: "400 Hz", value: COMMON_AC_FREQUENCIES.aircraft400Hz, region: "Aircraft" },
  { label: "1 kHz", value: COMMON_AC_FREQUENCIES.audio1kHz, region: "Audio" },
];

export function ACFrequencyPanel({
  baseMetrics = { watts: 0, current: 0, resistance: 0, voltage: 0 },
  inductance = 0,
  capacitance = 0,
  onModeChange,
  onFrequencyChange,
  isCompact = false,
}: ACFrequencyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [customFrequency, setCustomFrequency] = useState<string>("");

  const {
    circuitMode,
    acMetrics,
    frequency,
    error,
    isACMode,
    updateACMetrics,
    updateFrequency: _updateFrequency,
    toggleCircuitMode,
    formatACMetrics,
  } = useACMetricsSync();

  const handleModeToggle = useCallback(() => {
    toggleCircuitMode();
    onModeChange?.(circuitMode === "dc" ? "ac" : "dc");
  }, [circuitMode, toggleCircuitMode, onModeChange]);

  const handleFrequencyPreset = useCallback(
    (presetFrequency: number) => {
      const input: ACCircuitInput = {
        voltage: baseMetrics.voltage,
        frequencyHz: presetFrequency,
        resistance: baseMetrics.resistance,
        inductance,
        capacitance,
      };
      updateACMetrics(input);
      onFrequencyChange?.(presetFrequency);
    },
    [baseMetrics, inductance, capacitance, updateACMetrics, onFrequencyChange]
  );

  const handleCustomFrequency = useCallback(() => {
    const parsed = parseFloat(customFrequency);
    if (!isNaN(parsed) && parsed > 0) {
      handleFrequencyPreset(parsed);
      setCustomFrequency("");
    }
  }, [customFrequency, handleFrequencyPreset]);

  const handleRecalculate = useCallback(() => {
    const input: ACCircuitInput = {
      voltage: baseMetrics.voltage,
      frequencyHz: frequency || DEFAULT_AC_FREQUENCY,
      resistance: baseMetrics.resistance,
      inductance,
      capacitance,
    };
    updateACMetrics(input);
  }, [baseMetrics, frequency, inductance, capacitance, updateACMetrics]);

  const formattedMetrics = formatACMetrics();

  const reactanceDisplay = useMemo(() => {
    if (!acMetrics) return null;

    return [
      {
        id: "xl",
        label: "Inductive Reactance",
        symbol: "XL",
        value: formattedMetrics.inductiveReactance,
        formula: "XL = 2πfL",
        description: "Opposition to current from inductors",
      },
      {
        id: "xc",
        label: "Capacitive Reactance",
        symbol: "XC",
        value: formattedMetrics.capacitiveReactance,
        formula: "XC = 1/(2πfC)",
        description: "Opposition to current from capacitors",
      },
      {
        id: "x",
        label: "Net Reactance",
        symbol: "X",
        value: formattedMetrics.netReactance,
        formula: "X = XL - XC",
        description: "Combined reactive opposition",
      },
      {
        id: "z",
        label: "Impedance",
        symbol: "Z",
        value: formattedMetrics.impedance,
        formula: "Z = √(R² + X²)",
        description: "Total opposition to AC current",
      },
    ];
  }, [acMetrics, formattedMetrics]);

  const phaseDisplay = useMemo(() => {
    if (!acMetrics) return null;

    const characteristic = formattedMetrics.phaseCharacteristic;
    const characteristicLabel =
      characteristic === "leading"
        ? "Leading (Capacitive)"
        : characteristic === "lagging"
        ? "Lagging (Inductive)"
        : "Unity (Resistive)";

    return {
      angle: formattedMetrics.phaseAngle,
      characteristic: characteristicLabel,
      powerFactor: formattedMetrics.powerFactor,
    };
  }, [acMetrics, formattedMetrics]);

  const powerDisplay = useMemo(() => {
    if (!acMetrics) return null;

    return [
      {
        id: "real",
        label: "Real Power",
        symbol: "P",
        value: formattedMetrics.realPower,
        unit: "W",
        description: "Actual power consumed",
      },
      {
        id: "reactive",
        label: "Reactive Power",
        symbol: "Q",
        value: formattedMetrics.reactivePower,
        unit: "VAR",
        description: "Power stored in reactive elements",
      },
      {
        id: "apparent",
        label: "Apparent Power",
        symbol: "S",
        value: formattedMetrics.apparentPower,
        unit: "VA",
        description: "Total power from source",
      },
    ];
  }, [acMetrics, formattedMetrics]);

  return (
    <div className={`ac-panel ${isCompact ? "ac-panel--compact" : ""}`}>
      <div className="ac-panel__header">
        <div className="ac-panel__title-group">
          <span className="ac-panel__icon">〜</span>
          <div className="ac-panel__title-text">
            <h3 className="ac-panel__title">AC Circuit Analysis</h3>
            <span className="ac-panel__frequency">{formattedMetrics.frequency}</span>
          </div>
        </div>
        <div className="ac-panel__controls">
          <button
            type="button"
            className={`ac-panel__mode-toggle ${isACMode ? "ac-panel__mode-toggle--ac" : ""}`}
            onClick={handleModeToggle}
            aria-pressed={isACMode}
            title={isACMode ? "Switch to DC mode" : "Switch to AC mode"}
          >
            {isACMode ? "AC" : "DC"}
          </button>
          {isCompact && (
            <button
              type="button"
              className="ac-panel__toggle"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
            >
              {isExpanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="ac-panel__body">
          {/* Mode indicator */}
          <div className="ac-panel__mode-indicator">
            <span className={`ac-panel__mode-badge ${isACMode ? "ac-panel__mode-badge--ac" : "ac-panel__mode-badge--dc"}`}>
              {isACMode ? "Alternating Current Mode" : "Direct Current Mode"}
            </span>
            {!isACMode && (
              <p className="ac-panel__mode-hint">
                Switch to AC mode to analyze frequency-dependent behavior
              </p>
            )}
          </div>

          {isACMode && (
            <>
              {/* Frequency Selection */}
              <div className="ac-panel__section">
                <span className="ac-panel__section-label">Frequency Selection</span>
                <div className="ac-panel__frequency-presets">
                  {FREQUENCY_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`ac-panel__preset-btn ${
                        frequency === preset.value ? "ac-panel__preset-btn--active" : ""
                      }`}
                      onClick={() => handleFrequencyPreset(preset.value)}
                      title={preset.region}
                    >
                      <span className="ac-panel__preset-label">{preset.label}</span>
                      <span className="ac-panel__preset-region">{preset.region}</span>
                    </button>
                  ))}
                </div>
                <div className="ac-panel__custom-frequency">
                  <input
                    type="number"
                    className="ac-panel__frequency-input"
                    placeholder="Custom Hz"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomFrequency()}
                    min="0.1"
                    step="any"
                  />
                  <button
                    type="button"
                    className="ac-panel__apply-btn"
                    onClick={handleCustomFrequency}
                    disabled={!customFrequency}
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Reactance Display */}
              {reactanceDisplay && (
                <div className="ac-panel__section">
                  <span className="ac-panel__section-label">Reactance &amp; Impedance</span>
                  <div className="ac-panel__reactance-grid">
                    {reactanceDisplay.map((item) => (
                      <div key={item.id} className="ac-panel__reactance-item">
                        <div className="ac-panel__reactance-header">
                          <span className="ac-panel__reactance-symbol">{item.symbol}</span>
                          <span className="ac-panel__reactance-label">{item.label}</span>
                        </div>
                        <span className="ac-panel__reactance-value">{item.value}</span>
                        <span className="ac-panel__reactance-formula">{item.formula}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase Angle */}
              {phaseDisplay && (
                <div className="ac-panel__section">
                  <span className="ac-panel__section-label">Phase Relationship</span>
                  <div className="ac-panel__phase-display">
                    <div className="ac-panel__phase-angle">
                      <span className="ac-panel__phase-symbol">φ</span>
                      <span className="ac-panel__phase-value">{phaseDisplay.angle}</span>
                    </div>
                    <div className="ac-panel__phase-info">
                      <span className="ac-panel__phase-characteristic">
                        {phaseDisplay.characteristic}
                      </span>
                      <span className="ac-panel__power-factor">
                        Power Factor: {phaseDisplay.powerFactor}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Power Triangle */}
              {powerDisplay && (
                <div className="ac-panel__section">
                  <span className="ac-panel__section-label">Power Analysis</span>
                  <div className="ac-panel__power-grid">
                    {powerDisplay.map((item) => (
                      <div key={item.id} className="ac-panel__power-item">
                        <div className="ac-panel__power-header">
                          <span className="ac-panel__power-symbol">{item.symbol}</span>
                          <span className="ac-panel__power-label">{item.label}</span>
                        </div>
                        <span className="ac-panel__power-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recalculate button */}
              <div className="ac-panel__actions">
                <button
                  type="button"
                  className="ac-panel__recalc-btn"
                  onClick={handleRecalculate}
                >
                  Recalculate with Current Values
                </button>
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="ac-panel__error">
              <span className="ac-panel__error-icon">⚠</span>
              <span className="ac-panel__error-text">{error}</span>
            </div>
          )}

          {/* Educational footer */}
          <div className="ac-panel__footer">
            <p className="ac-panel__description">
              {isACMode
                ? "AC circuits exhibit frequency-dependent behavior. Capacitors and inductors create reactance that affects current flow and phase relationships."
                : "DC circuits have constant voltage and current. Switch to AC mode to analyze time-varying signals."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ACFrequencyPanel;
