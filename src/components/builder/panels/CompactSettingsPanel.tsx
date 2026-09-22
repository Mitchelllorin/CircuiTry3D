import type { ReactNode } from "react";
import type {
  WorkspaceSkinId,
  WorkspaceSkinOption,
} from "../../../hooks/builder/useWorkspaceBackground";
import { WorkspaceSkinModal } from "../modals/WorkspaceSkinModal";
import WordMark from "../../WordMark";
import "../../../styles/compact-settings.css";

// Only one section remains, but the type is kept so callers that track which
// settings section is showing keep compiling and can grow again later.
export type SettingsPanelTab = "workspace-skins";

/** One display toggle: what the workspace shows, not what the circuit does. */
export type DisplaySetting = {
  id: string;
  label: string;
  description: string;
  isActive: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type CompactSettingsPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  skinOptions: WorkspaceSkinOption[];
  activeSkinId: WorkspaceSkinId;
  hasCustomSkin: boolean;
  customSkinName: string | null;
  customSkinOpacity: number;
  workspaceSkinError: string | null;
  onSelectSkin: (skinId: WorkspaceSkinId) => void;
  onImportCustomSkin: (file: File) => Promise<void>;
  onCustomSkinOpacityChange: (nextOpacity: number) => void;
  onClearCustomSkin: () => void;
  onResetWorkspaceSkin: () => void;
  /** Flow, polarity, grid, nameplates, descriptors — moved here off the
      Insights tab, which cost the bottom edge of the workspace. */
  displaySettings: DisplaySetting[];
  environment: { icon: string; name: string; onConfigure: () => void };
  /** The grid brightness / width / colour sliders, off the old CONTROLS tab. */
  gridStyle?: ReactNode;
};

export function CompactSettingsPanel({
  isOpen,
  onToggle,
  skinOptions,
  activeSkinId,
  hasCustomSkin,
  customSkinName,
  customSkinOpacity,
  workspaceSkinError,
  onSelectSkin,
  onImportCustomSkin,
  onCustomSkinOpacityChange,
  onClearCustomSkin,
  onResetWorkspaceSkin,
  displaySettings,
  environment,
  gridStyle,
}: CompactSettingsPanelProps) {
  return (
    <div className={`compact-settings-panel${isOpen ? " open" : ""}`}>
      <div className="compact-settings-header">
        <div className="compact-settings-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="compact-settings-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">Workspace Settings</span>
        </button>
        {/* The tablist is gone with the "Logo Motion" tab it used to sit beside.
            One section left means no tabs to choose between — a row of one tab is
            chrome that costs a line of screen and decides nothing. */}
      </div>
      {isOpen && (
        <div className="compact-settings-body">
          <section className="compact-settings-section">
            <h3 className="compact-settings-heading">Display</h3>
            <div className="compact-settings-stack">
              {displaySettings.map((setting) => (
                <button
                  key={setting.id}
                  type="button"
                  className="compact-settings-row"
                  onClick={setting.onSelect}
                  disabled={setting.disabled}
                  aria-pressed={setting.isActive}
                  data-active={setting.isActive ? "true" : undefined}
                >
                  <span className="compact-settings-row-label">{setting.label}</span>
                  <span className="compact-settings-row-value">{setting.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="compact-settings-section">
            <h3 className="compact-settings-heading">Environment</h3>
            <button
              type="button"
              className="compact-settings-row"
              onClick={environment.onConfigure}
              data-active={environment.name !== "Standard Conditions" ? "true" : undefined}
            >
              <span className="compact-settings-row-label">
                <span aria-hidden="true">{environment.icon}</span> {environment.name}
              </span>
              <span className="compact-settings-row-value">Heat, cold, supply and load</span>
            </button>
          </section>

          {gridStyle && (
            <section className="compact-settings-section">
              <h3 className="compact-settings-heading">Grid style</h3>
              {gridStyle}
            </section>
          )}

          <section className="compact-settings-section">
            <h3 className="compact-settings-heading">Workspace skin</h3>
          </section>
          <WorkspaceSkinModal
            isOpen={isOpen}
            skinOptions={skinOptions}
            activeSkinId={activeSkinId}
            hasCustomSkin={hasCustomSkin}
            customSkinName={customSkinName}
            customSkinOpacity={customSkinOpacity}
            error={workspaceSkinError}
            onSelectSkin={onSelectSkin}
            onImportCustomSkin={onImportCustomSkin}
            onCustomSkinOpacityChange={onCustomSkinOpacityChange}
            onClearCustomSkin={onClearCustomSkin}
            onResetWorkspaceSkin={onResetWorkspaceSkin}
          />
        </div>
      )}
    </div>
  );
}
