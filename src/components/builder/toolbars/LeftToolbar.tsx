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
import { getSchematicSymbol } from "../../circuit/SchematicSymbols";
import { useComponent3DThumbnail } from "./useComponent3DThumbnail";

interface LeftToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onComponentAction: (component: ComponentAction) => void;
  onQuickAction: (action: QuickAction) => void;
  onSchematicPanelOpen: () => void;
  onBuilderAction: (action: string, data?: unknown) => void;
  activeQuickTool: BuilderToolId | null;
  isSimulatePulsing: boolean;
  modeState: LegacyModeState;
  controlsDisabled: boolean;
  controlDisabledTitle?: string;
}

/**
 * Renders the component icon/schematic symbol for the library
 * Vertical layout: name at top, schematic symbol, 3D thumbnail at bottom
 */
function ComponentIcon({ component }: { component: ComponentAction }) {
  const thumbSrc = useComponent3DThumbnail(component.builderType ?? component.id);

  const symbolKey = (() => {
    const type = component.builderType ?? component.id;
    switch (type) {
      case "bjt-npn":
        return "transistor-npn";
      case "bjt-pnp":
        return "transistor-pnp";
      case "bjt":
        return "transistor-npn";
      default:
        return type;
    }
  })();

  const Symbol = getSchematicSymbol(symbolKey as any);

  return (
    <span className="slider-component-card">
      {/* Component name at top */}
      <span className="slider-component-name">{component.label}</span>

      {/* Schematic symbol */}
      <span className="slider-component-symbol" aria-hidden="true">
        {Symbol ? (
          <svg
            className="slider-component-symbol-svg"
            viewBox="-40 -40 80 80"
            width="100%"
            height="100%"
            focusable="false"
          >
            <Symbol x={0} y={0} scale={1} showLabel={false} />
          </svg>
        ) : (
          <span className="slider-component-symbol-text">{component.icon}</span>
        )}
      </span>

      {/* 3D thumbnail */}
      <span className="slider-component-thumbnail" aria-hidden="true">
        {thumbSrc ? (
          <img src={thumbSrc} alt="" loading="lazy" />
        ) : (
          <span className="slider-component-thumbnail-placeholder" />
        )}
      </span>
    </span>
  );
}

export function LeftToolbar({
  isOpen,
  onToggle,
  onComponentAction,
  onQuickAction,
  onSchematicPanelOpen,
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
      <nav
        className="builder-menu builder-menu-left"
        role="navigation"
        aria-label="Component and wiring controls"
      >
        <div className="builder-menu-scroll">
          <div className="slider-section">
            <span className="slider-heading">Components</span>
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
                  data-category={component.metadata?.category}
                >
                  <ComponentIcon component={component} />
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
                  </button>
                );
              })}
            </div>
          </div>
          <div className="slider-section">
            <span className="slider-heading">Schematic</span>
            <div className="slider-stack">
              <button
                type="button"
                className="slider-btn slider-btn-stacked"
                onClick={onSchematicPanelOpen}
                title="Open the 3D schematic workspace"
              >
                <span className="slider-label">Launch Builder</span>
              </button>
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
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
    </div>
  );
}
