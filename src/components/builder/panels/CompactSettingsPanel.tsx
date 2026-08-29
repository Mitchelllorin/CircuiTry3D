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
