import type { LegacyModeState, SettingsItem } from "../types";
import {
  CURRENT_MODE_ACTIONS,
  VIEW_CONTROL_ACTIONS,
  SETTINGS_ITEMS,
} from "../constants";

interface RightToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onBuilderAction: (action: string, data?: unknown) => void;
  modeState: LegacyModeState;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
  layoutModeLabel: string;
  wireRoutingLabel: string;
  currentFlowLabel: string;
  onOpenLogoSettings?: () => void;
  isLogoSettingsOpen?: boolean;
}

export function RightToolbar({
  isOpen,
  onToggle,
  onBuilderAction,
  modeState,
  controlsDisabled,
  controlDisabledTitle,
  layoutModeLabel,
  currentFlowLabel,
  onOpenLogoSettings,
  isLogoSettingsOpen,
}: RightToolbarProps) {
  return (
    <div
      className={`builder-menu-stage builder-menu-stage-right${isOpen ? " open" : ""}`}
    >
      <button
        type="button"
        className="builder-menu-toggle builder-menu-toggle-right"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? "Collapse settings"
            : "Expand settings"
        }
        title={
          isOpen
            ? "Collapse settings"
            : "Expand settings"
        }
      >
        <span className="toggle-icon">{isOpen ? "▶" : "◀"}</span>
        <span className="toggle-text">Settings</span>
      </button>
      <nav
        className="builder-menu builder-menu-right"
        role="complementary"
        aria-label="Settings"
      >
        <div className="builder-menu-scroll">
          <div className="slider-section">
            <span className="slider-heading">Modes</span>
            <div className="slider-stack">
              {CURRENT_MODE_ACTIONS.map((action) => {
                const isFlowToggle = action.action === "toggle-current-flow";
                const isPolarityToggle = action.action === "toggle-polarity";
                const isLayoutCycle = action.action === "cycle-layout";
                const isActionActive = isFlowToggle
                  ? modeState.currentFlowStyle === "solid"
                  : isPolarityToggle
                    ? modeState.showPolarityIndicators
                    : false;

                const description = (() => {
                  if (isFlowToggle) {
                    return `${currentFlowLabel} visualisation active`;
                  }
                  if (isPolarityToggle) {
                    return modeState.showPolarityIndicators
                      ? "Polarity markers visible"
                      : "Polarity markers hidden";
                  }
                  if (isLayoutCycle) {
                    return `Current layout: ${layoutModeLabel}`;
                  }
                  return action.description;
                })();

                return (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => onBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : action.description
                    }
                    data-active={isActionActive ? "true" : undefined}
                    aria-pressed={
                      isFlowToggle || isPolarityToggle
                        ? isActionActive
                        : undefined
                    }
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">View</span>
            <div className="slider-stack">
              {VIEW_CONTROL_ACTIONS.map((action) => {
                const isGridToggle = action.action === "toggle-grid";
                const isLabelToggle = action.action === "toggle-labels";
                const isActionActive =
                  (isGridToggle && modeState.showGrid) ||
                  (isLabelToggle && modeState.showLabels);
                const description = (() => {
                  if (isGridToggle) {
                    return modeState.showGrid ? "Grid visible" : "Grid hidden";
                  }
                  if (isLabelToggle) {
                    return modeState.showLabels
                      ? "Labels shown"
                      : "Labels hidden";
                  }
                  return action.description;
                })();

                return (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => onBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : action.description
                    }
                    data-active={isActionActive ? "true" : undefined}
                    aria-pressed={
                      isGridToggle || isLabelToggle ? isActionActive : undefined
                    }
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">{description}</span>
                  </button>
                );
              })}
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
                    onClick={() => {
                      if (setting.action === "open-logo-settings" && onOpenLogoSettings) {
                        onOpenLogoSettings();
                      } else {
                        onBuilderAction(setting.action, setting.data);
                      }
                    }}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    aria-pressed={setting.isActive ? isActive : undefined}
                    data-active={
                      setting.isActive && isActive ? "true" : undefined
                    }
                    title={
                      controlsDisabled ? controlDisabledTitle : description
                    }
                    data-intent="settings"
                  >
                    <span className="slider-label">{setting.label}</span>
                    <span className="slider-description">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
