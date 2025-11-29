import type { LegacyModeState, HelpModalView } from "../types";
import {
  WIRE_METRICS,
  SETTINGS_ITEMS,
  HELP_ENTRIES,
} from "../constants";

interface BottomToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onBuilderAction: (action: string, data?: unknown) => void;
  onOpenHelpCenter: (view: HelpModalView) => void;
  modeState: LegacyModeState;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
  currentFlowLabel: string;
}

export function BottomToolbar({
  isOpen,
  onToggle,
  onBuilderAction,
  onOpenHelpCenter,
  modeState,
  controlsDisabled,
  controlDisabledTitle,
  currentFlowLabel,
}: BottomToolbarProps) {
  return (
    <div
      className={`builder-menu-stage builder-menu-stage-bottom${isOpen ? " open" : ""}`}
    >
      <button
        type="button"
        className="builder-menu-toggle builder-menu-toggle-bottom"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? "Collapse analysis and guidance"
            : "Expand analysis and guidance"
        }
        title={
          isOpen
            ? "Collapse analysis and guidance"
            : "Expand analysis and guidance"
        }
      >
        <span className="toggle-icon">{isOpen ? "v" : "^"}</span>
        <span className="toggle-text">Insights</span>
      </button>
      <nav
        className="builder-menu builder-menu-bottom"
        role="navigation"
        aria-label="Analysis, practice, and guides"
      >
        <div className="builder-menu-scroll builder-menu-scroll-bottom">
          <div className="slider-section">
            <span className="slider-heading">Analysis</span>
            <div className="menu-track menu-track-metrics">
              {WIRE_METRICS.map((metric) => (
                <div
                  key={metric.id}
                  className="slider-metric"
                  title={`${metric.label}: ${metric.value} - Click to view calculation details`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenHelpCenter("wire-guide")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenHelpCenter("wire-guide");
                    }
                  }}
                >
                  <span className="metric-letter">{metric.letter}</span>
                  <span className="metric-value">{metric.value}</span>
                  <span className="metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Settings</span>
            <div className="slider-stack">
              {SETTINGS_ITEMS.map((setting) => {
                const description = setting.getDescription(modeState, {
                  currentFlowLabel,
                });
                const isActive = setting.isActive?.(modeState) ?? false;
                return (
                  <button
                    key={setting.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => onBuilderAction(setting.action, setting.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    aria-pressed={setting.isActive ? isActive : undefined}
                    data-active={
                      setting.isActive && isActive ? "true" : undefined
                    }
                    title={controlsDisabled ? controlDisabledTitle : description}
                    data-intent="settings"
                  >
                    <span className="slider-label">{setting.label}</span>
                    <span className="slider-description">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Guides</span>
            <div className="menu-track menu-track-chips">
              {HELP_ENTRIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="slider-chip"
                  onClick={() => onOpenHelpCenter(entry.view)}
                  title={entry.description}
                >
                  <span className="slider-chip-label">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
