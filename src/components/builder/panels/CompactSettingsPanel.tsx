import type { LogoNumericSettingKey } from "../types";
import type {
  WorkspaceSkinId,
  WorkspaceSkinOption,
} from "../../../hooks/builder/useWorkspaceBackground";
import { LogoSettingsModal } from "../modals/LogoSettingsModal";
import { WorkspaceSkinModal } from "../modals/WorkspaceSkinModal";
import WordMark from "../../WordMark";
import "../../../styles/compact-settings.css";

export type SettingsPanelTab = "workspace-skins" | "logo-motion";

type CompactSettingsPanelProps = {
  isOpen: boolean;
  activeTab: SettingsPanelTab;
  onToggle: () => void;
  onChangeTab: (tab: SettingsPanelTab) => void;
  logoSettings: {
    isVisible: boolean;
    speed: number;
    travelX: number;
    travelY: number;
    bounce: number;
    opacity: number;
  };
  prefersReducedMotion: boolean;
  onLogoSettingChange: (key: LogoNumericSettingKey, value: number) => void;
  onToggleLogoVisibility: () => void;
  onResetLogoSettings: () => void;
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
};

export function CompactSettingsPanel({
  isOpen,
  activeTab,
  onToggle,
  onChangeTab,
  logoSettings,
  prefersReducedMotion,
  onLogoSettingChange,
  onToggleLogoVisibility,
  onResetLogoSettings,
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
        {isOpen && (
          <div
            className="compact-settings-tablist"
            role="tablist"
            aria-label="Workspace settings sections"
          >
            <button
              type="button"
              className={`compact-settings-tab${activeTab === "workspace-skins" ? " active" : ""}`}
              onClick={() => onChangeTab("workspace-skins")}
              role="tab"
              aria-selected={activeTab === "workspace-skins"}
            >
              Skins
            </button>
            <button
              type="button"
              className={`compact-settings-tab${activeTab === "logo-motion" ? " active" : ""}`}
              onClick={() => onChangeTab("logo-motion")}
              role="tab"
              aria-selected={activeTab === "logo-motion"}
            >
              Logo Motion
            </button>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="compact-settings-body">
          {activeTab === "workspace-skins" ? (
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
          ) : (
            <LogoSettingsModal
              isOpen={isOpen}
              logoSettings={logoSettings}
              prefersReducedMotion={prefersReducedMotion}
              onLogoSettingChange={onLogoSettingChange}
              onToggleLogoVisibility={onToggleLogoVisibility}
              onResetLogoSettings={onResetLogoSettings}
            />
          )}
        </div>
      )}
    </div>
  );
}
