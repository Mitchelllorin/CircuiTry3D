import { useCallback, useRef, useState } from "react";
import { CATALOG_COMPONENTS, searchCatalog } from "./catalogData";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaEnvironment,
  ArenaEnvironmentPreset,
  ArenaViewTransitionPhase,
  CatalogComponent,
  FuseAnalysisResult,
} from "./types";
import { ENVIRONMENT_PRESETS } from "./types";

type ArenaOverlayTab = "log" | "fuse" | "metrics" | "catalog";

type ArenaOverlayProps = {
  agents: ArenaBattleAgent[];
  battleLog: ArenaBattleLogEntry[];
  currentTurnAgentId: string | null;
  environment: ArenaEnvironment;
  fuseResults: FuseAnalysisResult[];
  onEnvironmentChange: (env: ArenaEnvironment) => void;
  onLoadCatalogComponent: (component: CatalogComponent) => void;
  onResetBattle: () => void;
  onReturnToWorkspace: () => void;
  onOpenBuilder?: () => void;
  round: number;
  sessionLabel: string;
  status: ArenaBattleStatus;
  transitionPhase: ArenaViewTransitionPhase;
  winnerName: string | null;
};

const RISK_LABEL: Record<string, string> = {
  safe: "Safe",
  stressed: "Stressed",
  warning: "Warning",
  critical: "Critical",
  failed: "FAILED",
};

function getHealthPercent(agent: ArenaBattleAgent): number {
  return Math.max(0, Math.min(100, (agent.health / agent.maxHealth) * 100));
}

function FuseRiskMeter({ score, level }: { score: number; level: string }) {
  // score is 0–100
  const pct = Math.min(100, Math.round(score));
  return (
    <div className="fuse-risk-meter" aria-label={`Risk ${pct}%`}>
      <div className="fuse-risk-meter__track">
        <div
          className={`fuse-risk-meter__fill fuse-risk-meter__fill--${level}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`fuse-risk-badge fuse-risk-badge--${level}`}>
        {RISK_LABEL[level] ?? level}
      </span>
    </div>
  );
}

function FuseTab({
  agents,
  fuseResults,
}: {
  agents: ArenaBattleAgent[];
  fuseResults: FuseAnalysisResult[];
}) {
  if (!fuseResults.length) {
    return (
      <div className="arena-tab-empty">
        <p>FUSE™ analysis starts when the battle is live.</p>
      </div>
    );
  }

  return (
    <div className="fuse-panel">
      {fuseResults.map((result, index) => {
        const agent = agents.find((a) => a.id === result.agentId) ?? agents[index];
        if (!agent) return null;
        return (
          <section key={result.agentId} className="fuse-agent-section">
            <h3 className="fuse-agent-name">{agent.name}</h3>
            {agent.manufacturer ? (
              <p className="fuse-agent-manufacturer">{agent.manufacturer}</p>
            ) : null}
            <FuseRiskMeter score={result.riskScore} level={result.riskLevel} />
            <dl className="fuse-metrics-grid">
              <div>
                <dt>Junction Temp</dt>
                <dd>{result.junctionTemperature.toFixed(1)} °C</dd>
              </div>
              <div>
                <dt>Voltage Derating</dt>
                <dd>{(result.voltageDerating * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt>Power Load</dt>
                <dd>{(result.powerUtilization * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt>Risk Score</dt>
                <dd>{result.riskScore.toFixed(0)}/100</dd>
              </div>
            </dl>
            {result.failureModes.length > 0 ? (
              <div className="fuse-failure-modes">
                <h4>Active Failure Modes</h4>
                <ul>
                  {result.failureModes.map((mode) => (
                    <li key={mode.id} className={`fuse-failure-mode fuse-failure-mode--${mode.severity}`}>
                      <strong>{mode.name}</strong>
                      <span>{mode.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.recommendation ? (
              <p className="fuse-recommendation">{result.recommendation}</p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function MetricsTab({ agents }: { agents: ArenaBattleAgent[] }) {
  if (!agents.length) {
    return (
      <div className="arena-tab-empty">
        <p>Load components to compare metrics.</p>
      </div>
    );
  }

  return (
    <div className="metrics-panel">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            {agents.map((a) => <th key={a.id}>{a.name}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Voltage (V)</td>
            {agents.map((a) => <td key={a.id}>{a.metrics.voltage.toFixed(2)}</td>)}
          </tr>
          <tr>
            <td>Current (A)</td>
            {agents.map((a) => <td key={a.id}>{a.metrics.current.toFixed(3)}</td>)}
          </tr>
          <tr>
            <td>Resistance (Ω)</td>
            {agents.map((a) => <td key={a.id}>{a.metrics.resistance.toFixed(2)}</td>)}
          </tr>
          <tr>
            <td>Power (W)</td>
            {agents.map((a) => <td key={a.id}>{a.metrics.power.toFixed(3)}</td>)}
          </tr>
          <tr>
            <td>Health</td>
            {agents.map((a) => (
              <td key={a.id}>
                {a.health}/{a.maxHealth} HP
              </td>
            ))}
          </tr>
          <tr>
            <td>ATK / DEF</td>
            {agents.map((a) => <td key={a.id}>{a.attack} / {a.defense}</td>)}
          </tr>
          {agents.some((a) => a.manufacturer) ? (
            <tr>
              <td>Manufacturer</td>
              {agents.map((a) => <td key={a.id}>{a.manufacturer ?? "—"}</td>)}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function CatalogTab({
  onLoadComponent,
}: {
  onLoadComponent: (component: CatalogComponent) => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim() || typeFilter
    ? searchCatalog(query.trim(), typeFilter || undefined)
    : CATALOG_COMPONENTS.slice(0, 24);

  const types = Array.from(new Set(CATALOG_COMPONENTS.map((c) => c.type))).sort();

  return (
    <div className="catalog-panel">
      <div className="catalog-search">
        <input
          ref={inputRef}
          type="search"
          className="catalog-search__input"
          placeholder="Search branded components…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search components"
        />
        <select
          className="catalog-search__filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="catalog-grid">
        {results.map((component) => (
          <button
            key={component.id}
            type="button"
            className="catalog-card"
            onClick={() => onLoadComponent(component)}
            title={`Load ${component.name} as combatant`}
          >
            <div className="catalog-card__header">
              <span className="catalog-card__type">{component.type}</span>
              {component.featured ? (
                <span className="catalog-card__featured">★</span>
              ) : null}
            </div>
            <strong className="catalog-card__name">{component.name}</strong>
            <span className="catalog-card__manufacturer">{component.manufacturer}</span>
            <dl className="catalog-card__specs">
              {(component.ratedThresholds?.maxVoltageV ?? 0) > 0 ? (
                <div>
                  <dt>V</dt>
                  <dd>{component.ratedThresholds?.maxVoltageV}V</dd>
                </div>
              ) : null}
              {(component.ratedThresholds?.maxCurrentA ?? 0) > 0 ? (
                <div>
                  <dt>A</dt>
                  <dd>{component.ratedThresholds?.maxCurrentA}A</dd>
                </div>
              ) : null}
              {(component.ratedThresholds?.maxPowerW ?? 0) > 0 ? (
                <div>
                  <dt>W</dt>
                  <dd>{component.ratedThresholds?.maxPowerW}W</dd>
                </div>
              ) : null}
            </dl>
          </button>
        ))}
        {results.length === 0 ? (
          <p className="catalog-empty">No components match your search.</p>
        ) : null}
      </div>
    </div>
  );
}

function EnvironmentControls({
  environment,
  onEnvironmentChange,
}: {
  environment: ArenaEnvironment;
  onEnvironmentChange: (env: ArenaEnvironment) => void;
}) {
  const handlePreset = useCallback(
    (preset: ArenaEnvironmentPreset) => onEnvironmentChange({ name: preset.label, ...preset.env }),
    [onEnvironmentChange],
  );

  return (
    <div className="env-controls">
      <div className="env-controls__presets">
        {ENVIRONMENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`env-preset-pill${environment.name === preset.label ? " is-active" : ""}`}
            onClick={() => handlePreset(preset)}
          >
            {preset.icon} {preset.label}
          </button>
        ))}
      </div>
      <div className="env-controls__sliders">
        <label className="env-slider-label">
          <span>Temp: {environment.temperatureC}°C</span>
          <input
            type="range"
            min={-40}
            max={125}
            value={environment.temperatureC}
            onChange={(e) =>
              onEnvironmentChange({ ...environment, temperatureC: Number(e.target.value), name: "Custom" })
            }
          />
        </label>
        <label className="env-slider-label">
          <span>Humidity: {environment.humidityPercent}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={environment.humidityPercent}
            onChange={(e) =>
              onEnvironmentChange({ ...environment, humidityPercent: Number(e.target.value), name: "Custom" })
            }
          />
        </label>
        <label className="env-slider-label">
          <span>Voltage stress: {environment.voltageStressMultiplier.toFixed(2)}×</span>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={environment.voltageStressMultiplier}
            onChange={(e) =>
              onEnvironmentChange({ ...environment, voltageStressMultiplier: Number(e.target.value), name: "Custom" })
            }
          />
        </label>
      </div>
    </div>
  );
}

export function ArenaOverlay({
  agents,
  battleLog,
  currentTurnAgentId,
  environment,
  fuseResults,
  onEnvironmentChange,
  onLoadCatalogComponent,
  onResetBattle,
  onReturnToWorkspace,
  onOpenBuilder,
  round,
  sessionLabel,
  status,
  transitionPhase,
  winnerName,
}: ArenaOverlayProps) {
  const [activeTab, setActiveTab] = useState<ArenaOverlayTab>("log");

  return (
    <div className="arena-overlay">
      <div className="arena-overlay__topbar">
        <button
          type="button"
          className="arena-button arena-button--ghost"
          onClick={onReturnToWorkspace}
        >
          ← Workspace
        </button>
        <div className="arena-overlay__hero">
          <p className="arena-eyebrow">CircuiTry3D Battle Arena</p>
          <h1>{sessionLabel}</h1>
          <div className="arena-overlay__meta">
            <span>{transitionPhase === "entering" ? "Cinematic entry" : "Arena live"}</span>
            <span>Round {Math.max(round, 1)}</span>
            <span>{status === "complete" ? "Battle complete" : "In progress"}</span>
          </div>
        </div>
        <div className="arena-overlay__actions">
          {typeof onOpenBuilder === "function" ? (
            <button
              type="button"
              className="arena-button arena-button--secondary"
              onClick={onOpenBuilder}
            >
              Builder
            </button>
          ) : null}
          <button
            type="button"
            className="arena-button arena-button--secondary"
            onClick={onResetBattle}
          >
            Restart
          </button>
        </div>
      </div>

      {/* Combatant health cards */}
      <div className="arena-cards" aria-label="Combatant stats">
        {agents.map((agent, index) => {
          const isActive = agent.id === currentTurnAgentId;
          const isDefeated = agent.health <= 0;
          const fuseResult = fuseResults[index];

          return (
            <article
              key={agent.id}
              className={`arena-card${isActive ? " is-active" : ""}${isDefeated ? " is-defeated" : ""}`}
            >
              <div className="arena-card__header">
                <div>
                  <p>{agent.manufacturer ?? (agent.componentNumber ?? agent.componentType.toUpperCase())}</p>
                  <h3>{agent.name}</h3>
                </div>
                <span className="arena-card__badge">{agent.abilityName}</span>
              </div>
              <div className="arena-card__health">
                <div className="arena-card__health-bar">
                  <span style={{ width: `${getHealthPercent(agent)}%` }} />
                </div>
                <strong>{agent.health}/{agent.maxHealth} HP</strong>
              </div>
              {fuseResult ? (
                <div className="arena-card__fuse-inline">
                  <FuseRiskMeter score={fuseResult.riskScore} level={fuseResult.riskLevel} />
                </div>
              ) : null}
              <dl className="arena-card__stats">
                <div><dt>ATK</dt><dd>{agent.attack}</dd></div>
                <div><dt>DEF</dt><dd>{agent.defense}</dd></div>
                <div><dt>V</dt><dd>{agent.metrics.voltage.toFixed(1)}</dd></div>
                <div><dt>Ω</dt><dd>{agent.metrics.resistance.toFixed(1)}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>

      {/* Environment controls */}
      <EnvironmentControls
        environment={environment}
        onEnvironmentChange={onEnvironmentChange}
      />

      {/* Tabbed info panel */}
      <div className="arena-info-panel">
        <nav className="arena-tab-nav" role="tablist" aria-label="Arena information">
          {(["log", "fuse", "metrics", "catalog"] as ArenaOverlayTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`arena-tab-btn${activeTab === tab ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "log" ? "Battle Log" : tab === "fuse" ? "FUSE™" : tab === "metrics" ? "Metrics" : "Catalog"}
            </button>
          ))}
        </nav>

        <div className="arena-tab-content" role="tabpanel">
          {activeTab === "log" ? (
            <aside className="arena-log-panel" aria-label="Battle log">
              {winnerName ? (
                <div className="arena-log-panel__header">
                  <span className="arena-status-pill">{winnerName} wins</span>
                </div>
              ) : null}
              <ol className="arena-log-panel__list">
                {battleLog.map((entry) => (
                  <li key={entry.id} className={`arena-log-entry arena-log-entry--${entry.kind}`}>
                    <span className="arena-log-entry__round">
                      {entry.round === 0 ? "INIT" : `R${entry.round}`}
                    </span>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ol>
            </aside>
          ) : activeTab === "fuse" ? (
            <FuseTab agents={agents} fuseResults={fuseResults} />
          ) : activeTab === "metrics" ? (
            <MetricsTab agents={agents} />
          ) : (
            <CatalogTab onLoadComponent={onLoadCatalogComponent} />
          )}
        </div>
      </div>

      {winnerName ? (
        <div className="arena-winner-banner" role="status">
          <p>Last agent standing</p>
          <strong>{winnerName}</strong>
        </div>
      ) : null}
    </div>
  );
}
