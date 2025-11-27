import { useState, useCallback, useMemo } from "react";
import {
  type EnvironmentalScenario,
  ENVIRONMENTAL_SCENARIOS,
  getDefaultScenario,
  applyScenarioModifiers,
  formatMetricValue,
  getMetricStatus,
} from "../../../data/environmentalScenarios";
import "./EnvironmentalPanel.css";

type BaseMetrics = {
  watts: number;
  current: number;
  resistance: number;
  voltage: number;
};

type EnvironmentalPanelProps = {
  baseMetrics?: BaseMetrics;
  onScenarioChange?: (scenario: EnvironmentalScenario) => void;
  isCompact?: boolean;
};

export function EnvironmentalPanel({
  baseMetrics = { watts: 0, current: 0, resistance: 0, voltage: 0 },
  onScenarioChange,
  isCompact = false,
}: EnvironmentalPanelProps) {
  const [activeScenario, setActiveScenario] = useState<EnvironmentalScenario>(
    getDefaultScenario()
  );
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  const handleScenarioSelect = useCallback(
    (scenario: EnvironmentalScenario) => {
      setActiveScenario(scenario);
      onScenarioChange?.(scenario);
    },
    [onScenarioChange]
  );

  const adjustedMetrics = useMemo(() => {
    return applyScenarioModifiers(baseMetrics, activeScenario);
  }, [baseMetrics, activeScenario]);

  const metricsDisplay = useMemo(() => {
    return [
      {
        id: "watts",
        letter: "W",
        label: "Power",
        baseValue: formatMetricValue(baseMetrics.watts, "watts"),
        adjustedValue: formatMetricValue(adjustedMetrics.watts, "watts"),
        status: getMetricStatus(adjustedMetrics.watts, "watts"),
        modifier: activeScenario.modifiers.power ?? 1,
      },
      {
        id: "current",
        letter: "I",
        label: "Current",
        baseValue: formatMetricValue(baseMetrics.current, "current"),
        adjustedValue: formatMetricValue(adjustedMetrics.current, "current"),
        status: getMetricStatus(adjustedMetrics.current, "current"),
        modifier: activeScenario.modifiers.current ?? 1,
      },
      {
        id: "resistance",
        letter: "R",
        label: "Resistance",
        baseValue: formatMetricValue(baseMetrics.resistance, "resistance"),
        adjustedValue: formatMetricValue(adjustedMetrics.resistance, "resistance"),
        status: getMetricStatus(adjustedMetrics.resistance, "resistance"),
        modifier: activeScenario.modifiers.resistance ?? 1,
      },
      {
        id: "voltage",
        letter: "E",
        label: "Voltage",
        baseValue: formatMetricValue(baseMetrics.voltage, "voltage"),
        adjustedValue: formatMetricValue(adjustedMetrics.voltage, "voltage"),
        status: getMetricStatus(adjustedMetrics.voltage, "voltage"),
        modifier: activeScenario.modifiers.voltage ?? 1,
      },
    ];
  }, [baseMetrics, adjustedMetrics, activeScenario]);

  const conditionsDisplay = useMemo(() => {
    const conditions = activeScenario.conditions;
    return [
      { label: "Temperature", value: `${conditions.temperature ?? 25}°C`, icon: "🌡️" },
      { label: "Humidity", value: `${conditions.humidity ?? 50}%`, icon: "💧" },
      { label: "Voltage", value: `${conditions.voltage ?? 100}%`, icon: "⚡" },
      { label: "Load", value: `${conditions.load ?? 100}%`, icon: "📊" },
    ];
  }, [activeScenario]);

  const performanceIndicators = useMemo(() => {
    return [
      {
        label: "Efficiency",
        value: formatMetricValue(adjustedMetrics.efficiency, "efficiency"),
        status: getMetricStatus(adjustedMetrics.efficiency, "efficiency"),
      },
      {
        label: "Thermal Rise",
        value: formatMetricValue(adjustedMetrics.thermalRise, "thermal"),
        status: getMetricStatus(adjustedMetrics.thermalRise, "thermal"),
      },
    ];
  }, [adjustedMetrics]);

  return (
    <div className={`env-panel ${isCompact ? "env-panel--compact" : ""}`}>
      <div className="env-panel__header">
        <div className="env-panel__title-group">
          <span className="env-panel__icon">{activeScenario.icon}</span>
          <div className="env-panel__title-text">
            <h3 className="env-panel__title">Environmental Conditions</h3>
            <span className="env-panel__scenario-name">{activeScenario.name}</span>
          </div>
        </div>
        {isCompact && (
          <button
            type="button"
            className="env-panel__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="env-panel__body">
          <div className="env-panel__section">
            <span className="env-panel__section-label">Select Environment</span>
            <div className="env-panel__scenarios">
              {ENVIRONMENTAL_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className={`env-panel__scenario-btn ${
                    activeScenario.id === scenario.id ? "env-panel__scenario-btn--active" : ""
                  }`}
                  onClick={() => handleScenarioSelect(scenario)}
                  title={scenario.description}
                  aria-pressed={activeScenario.id === scenario.id}
                >
                  <span className="env-panel__scenario-icon">{scenario.icon}</span>
                  <span className="env-panel__scenario-label">{scenario.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="env-panel__section">
            <span className="env-panel__section-label">Current Conditions</span>
            <div className="env-panel__conditions">
              {conditionsDisplay.map((condition) => (
                <div key={condition.label} className="env-panel__condition">
                  <span className="env-panel__condition-icon">{condition.icon}</span>
                  <span className="env-panel__condition-label">{condition.label}</span>
                  <span className="env-panel__condition-value">{condition.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="env-panel__section">
            <span className="env-panel__section-label">Adjusted Circuit Metrics</span>
            <p className="env-panel__section-hint">
              W.I.R.E. values reflect environmental impact on your circuit
            </p>
            <div className="env-panel__metrics">
              {metricsDisplay.map((metric) => (
                <div
                  key={metric.id}
                  className={`env-panel__metric env-panel__metric--${metric.status}`}
                >
                  <div className="env-panel__metric-header">
                    <span className={`env-panel__metric-letter env-panel__metric-letter--${metric.id}`}>
                      {metric.letter}
                    </span>
                    <span className="env-panel__metric-name">{metric.label}</span>
                    {metric.modifier !== 1 && (
                      <span className={`env-panel__metric-modifier ${metric.modifier > 1 ? "env-panel__metric-modifier--up" : "env-panel__metric-modifier--down"}`}>
                        {metric.modifier > 1 ? "↑" : "↓"} {Math.abs((metric.modifier - 1) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="env-panel__metric-values">
                    <div className="env-panel__metric-base">
                      <span className="env-panel__metric-label">Base</span>
                      <span className="env-panel__metric-value">{metric.baseValue}</span>
                    </div>
                    <span className="env-panel__metric-arrow">→</span>
                    <div className="env-panel__metric-adjusted">
                      <span className="env-panel__metric-label">Adjusted</span>
                      <span className="env-panel__metric-value env-panel__metric-value--primary">
                        {metric.adjustedValue}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="env-panel__section">
            <span className="env-panel__section-label">Performance Indicators</span>
            <div className="env-panel__performance">
              {performanceIndicators.map((indicator) => (
                <div
                  key={indicator.label}
                  className={`env-panel__indicator env-panel__indicator--${indicator.status}`}
                >
                  <span className="env-panel__indicator-label">{indicator.label}</span>
                  <span className="env-panel__indicator-value">{indicator.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="env-panel__footer">
            <p className="env-panel__description">{activeScenario.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnvironmentalPanel;
