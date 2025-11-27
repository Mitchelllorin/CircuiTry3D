import type {
  ComponentAction,
  QuickAction,
  BuilderToolId,
  LegacyModeState,
} from "../types";
import {
  COMPONENT_ACTIONS,
  QUICK_ACTIONS,
  WIRE_TOOL_ACTIONS,
} from "../constants";

interface LeftToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onComponentAction: (component: ComponentAction) => void;
  onQuickAction: (action: QuickAction) => void;
  onBuilderAction: (action: string, data?: unknown) => void;
  activeQuickTool: BuilderToolId | null;
  isSimulatePulsing: boolean;
  modeState: LegacyModeState;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
}

export function LeftToolbar({
  isOpen,
  onToggle,
  onComponentAction,
  onQuickAction,
  onBuilderAction,
  activeQuickTool,
  isSimulatePulsing,
  modeState,
  controlsDisabled,
  controlDisabledTitle,
}: LeftToolbarProps) {
  return (
    <div
      className={`builder-menu-stage builder-menu-stage-left${isOpen ? " open" : ""}`}
    >
      <button
        type="button"
        className="builder-menu-toggle builder-menu-toggle-left"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen ? "Collapse component library" : "Expand component library"
        }
        title={
          isOpen ? "Collapse component library" : "Expand component library"
        }
      >
        <span className="toggle-icon">{isOpen ? "◀" : "▶"}</span>
        <span className="toggle-text">Library</span>
      </button>
      <nav
        className="builder-menu builder-menu-left"
        role="navigation"
        aria-label="Component and wiring controls"
      >
        <div className="builder-menu-scroll">
          <div className="slider-section">
            <span className="slider-heading">Components Library</span>
            <div className="slider-stack">
              {COMPONENT_ACTIONS.map((component) => (
                <button
                  key={component.id}
                  type="button"
                  className="slider-btn slider-btn-stacked"
                  onClick={() => onComponentAction(component)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={
                    controlsDisabled
                      ? controlDisabledTitle
                      : component.description || component.label
                  }
                  data-component-action={component.action}
                >
                  <span className="slider-icon-label">
                    <span className="slider-icon" aria-hidden="true">
                      {component.icon}
                    </span>
                    <span className="slider-label">{component.label}</span>
                  </span>
                  {component.description && (
                    <span className="slider-description">
                      {component.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Quick Actions</span>
            <div className="slider-stack">
              {QUICK_ACTIONS.map((action) => {
                const isActive =
                  action.kind === "tool" && action.tool === activeQuickTool;
                const isSimulation = action.id === "simulate";
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => onQuickAction(action)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    aria-pressed={action.kind === "tool" ? isActive : undefined}
                    data-active={
                      action.kind === "tool" && isActive ? "true" : undefined
                    }
                    data-pulse={
                      isSimulation && isSimulatePulsing ? "true" : undefined
                    }
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : action.description
                    }
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">
                      {action.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Wire Modes</span>
            <div className="slider-stack">
              {WIRE_TOOL_ACTIONS.map((action) => {
                const isWireToggle = action.action === "toggle-wire-mode";
                const isRotateToggle = action.action === "toggle-rotate-mode";
                const isActionActive =
                  (isWireToggle && modeState.isWireMode) ||
                  (isRotateToggle && modeState.isRotateMode);
                const description = (() => {
                  if (isWireToggle) {
                    return modeState.isWireMode
                      ? "Wire tool active"
                      : "Activate wire mode to sketch connections";
                  }
                  if (isRotateToggle) {
                    return modeState.isRotateMode
                      ? "Rotate mode active"
                      : "Rotate the active component";
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
                      isWireToggle || isRotateToggle
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
        </div>
      </nav>
    </div>
  );
}
