import { useRef } from "react";
import type {
  WorkspaceSkinId,
  WorkspaceSkinOption,
} from "../../../hooks/builder/useWorkspaceBackground";

interface WorkspaceSkinModalProps {
  isOpen: boolean;
  skinOptions: WorkspaceSkinOption[];
  activeSkinId: WorkspaceSkinId;
  hasCustomSkin: boolean;
  customSkinName: string | null;
  customSkinOpacity: number;
  error: string | null;
  onSelectSkin: (skinId: WorkspaceSkinId) => void;
  onImportCustomSkin: (file: File) => Promise<void>;
  onCustomSkinOpacityChange: (nextOpacity: number) => void;
  onClearCustomSkin: () => void;
  onResetWorkspaceSkin: () => void;
}

export function WorkspaceSkinModal({
  isOpen,
  skinOptions,
  activeSkinId,
  hasCustomSkin,
  customSkinName,
  customSkinOpacity,
  error,
  onSelectSkin,
  onImportCustomSkin,
  onCustomSkinOpacityChange,
  onClearCustomSkin,
  onResetWorkspaceSkin,
}: WorkspaceSkinModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="workspace-skin-modal-content">
      <h3>Workspace Skins</h3>
      <p className="builder-logo-settings-description">
        Pick a skin for the main workspace or import your own image.
      </p>

      <div className="workspace-skin-grid" role="listbox" aria-label="Skin presets">
        {skinOptions.map((skin) => {
          const isActive = activeSkinId === skin.id;
          return (
            <button
              key={skin.id}
              type="button"
              className="workspace-skin-card"
              onClick={() => onSelectSkin(skin.id)}
              aria-pressed={isActive}
              data-active={isActive ? "true" : undefined}
              role="option"
              aria-selected={isActive}
              tabIndex={isOpen ? 0 : -1}
              title={skin.description}
            >
              <span
                className="workspace-skin-preview"
                aria-hidden="true"
                style={{ backgroundImage: skin.preview }}
              />
              <span className="workspace-skin-label">{skin.label}</span>
              <span className="workspace-skin-description">{skin.description}</span>
            </button>
          );
        })}
      </div>

      <div className="workspace-skin-custom-block">
        <div className="workspace-skin-custom-header">
          <strong>Custom image</strong>
          <span>
            {customSkinName ? `Loaded: ${customSkinName}` : "No image imported yet"}
          </span>
        </div>
        <div className="workspace-skin-custom-actions">
          <button
            type="button"
            className="workspace-skin-custom-btn"
            onClick={() => fileInputRef.current?.click()}
            tabIndex={isOpen ? 0 : -1}
          >
            Import image
          </button>
          <button
            type="button"
            className="workspace-skin-custom-btn"
            onClick={() => onSelectSkin("custom")}
            disabled={!hasCustomSkin}
            aria-disabled={!hasCustomSkin}
            tabIndex={isOpen ? 0 : -1}
            title={hasCustomSkin ? "Use imported image skin" : "Import an image first"}
          >
            Use imported image
          </button>
          <button
            type="button"
            className="workspace-skin-custom-btn"
            onClick={onClearCustomSkin}
            disabled={!hasCustomSkin}
            aria-disabled={!hasCustomSkin}
            tabIndex={isOpen ? 0 : -1}
            title="Remove imported custom image"
          >
            Remove image
          </button>
          <input
            ref={fileInputRef}
            className="workspace-skin-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onImportCustomSkin(file);
              }
              event.target.value = "";
            }}
          />
        </div>
        <div className="builder-logo-setting">
          <label htmlFor="workspace-skin-opacity">Custom image strength</label>
          <div className="setting-input">
            <input
              id="workspace-skin-opacity"
              type="range"
              min={20}
              max={100}
              step={1}
              value={customSkinOpacity}
              disabled={!hasCustomSkin}
              onChange={(event) =>
                onCustomSkinOpacityChange(Number(event.target.value))
              }
              tabIndex={isOpen ? 0 : -1}
              aria-valuetext={`${Math.round(customSkinOpacity)} percent`}
            />
            <span className="setting-value">{Math.round(customSkinOpacity)}%</span>
          </div>
        </div>
        {error ? <p className="workspace-skin-error">{error}</p> : null}
      </div>

      <div className="builder-logo-settings-actions">
        <button
          type="button"
          className="logo-settings-reset"
          onClick={onResetWorkspaceSkin}
          tabIndex={isOpen ? 0 : -1}
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
}
