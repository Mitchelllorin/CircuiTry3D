import type { LogoNumericSettingKey } from "../types";

interface LogoSettingsModalProps {
  isOpen: boolean;
  onToggle: () => void;
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
}

export function LogoSettingsModal({
  isOpen,
  onToggle: _onToggle,
  logoSettings,
  prefersReducedMotion,
  onLogoSettingChange,
  onToggleLogoVisibility,
  onResetLogoSettings,
}: LogoSettingsModalProps) {
  return (
    <div className="logo-settings-modal-content">
      <h3>Logo Motion</h3>
      <p className="builder-logo-settings-description">
        Fine-tune how the logo drifts across the workspace.
      </p>
      <div className="builder-logo-setting">
        <label id="builder-logo-visible-label" htmlFor="builder-logo-visible">
          Display logo
        </label>
        <div className="setting-input">
          <button
            type="button"
            id="builder-logo-visible"
            className={`setting-switch${logoSettings.isVisible ? " on" : ""}`}
            role="switch"
            aria-checked={logoSettings.isVisible}
            aria-labelledby="builder-logo-visible-label"
            onClick={onToggleLogoVisibility}
            tabIndex={isOpen ? 0 : -1}
          >
            <span className="setting-switch-handle" aria-hidden="true" />
          </button>
          <span className="setting-value">
            {logoSettings.isVisible ? "On" : "Off"}
          </span>
        </div>
      </div>
      <div className="builder-logo-setting">
        <label htmlFor="builder-logo-opacity">Opacity</label>
        <div className="setting-input">
          <input
            id="builder-logo-opacity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={logoSettings.opacity}
            onChange={(event) =>
              onLogoSettingChange("opacity", Number(event.target.value))
            }
            disabled={prefersReducedMotion}
            tabIndex={isOpen ? 0 : -1}
            aria-valuetext={`${Math.round(logoSettings.opacity)} percent opacity`}
          />
          <span className="setting-value">
            {Math.round(logoSettings.opacity)}%
          </span>
        </div>
      </div>
      <div className="builder-logo-setting">
        <label htmlFor="builder-logo-speed">Orbit duration</label>
        <div className="setting-input">
          <input
            id="builder-logo-speed"
            type="range"
            min={6}
            max={60}
            step={1}
            value={logoSettings.speed}
            onChange={(event) =>
              onLogoSettingChange("speed", Number(event.target.value))
            }
            disabled={prefersReducedMotion}
            tabIndex={isOpen ? 0 : -1}
            aria-valuetext={`${Math.round(logoSettings.speed)} second cycle`}
          />
          <span className="setting-value">
            {Math.round(logoSettings.speed)}s
          </span>
        </div>
      </div>
      <div className="builder-logo-setting">
        <label htmlFor="builder-logo-travel-x">Horizontal travel</label>
        <div className="setting-input">
          <input
            id="builder-logo-travel-x"
            type="range"
            min={10}
            max={100}
            step={1}
            value={logoSettings.travelX}
            onChange={(event) =>
              onLogoSettingChange("travelX", Number(event.target.value))
            }
            disabled={prefersReducedMotion}
            tabIndex={isOpen ? 0 : -1}
            aria-valuetext={`${Math.round(logoSettings.travelX)} percent width`}
          />
          <span className="setting-value">
            {Math.round(logoSettings.travelX)}%
          </span>
        </div>
      </div>
      <div className="builder-logo-setting">
        <label htmlFor="builder-logo-travel-y">Vertical travel</label>
        <div className="setting-input">
          <input
            id="builder-logo-travel-y"
            type="range"
            min={10}
            max={100}
            step={1}
            value={logoSettings.travelY}
            onChange={(event) =>
              onLogoSettingChange("travelY", Number(event.target.value))
            }
            disabled={prefersReducedMotion}
            tabIndex={isOpen ? 0 : -1}
            aria-valuetext={`${Math.round(logoSettings.travelY)} percent height`}
          />
          <span className="setting-value">
            {Math.round(logoSettings.travelY)}%
          </span>
        </div>
      </div>
      <div className="builder-logo-setting">
        <label htmlFor="builder-logo-bounce">Bounce intensity</label>
        <div className="setting-input">
          <input
            id="builder-logo-bounce"
            type="range"
            min={0}
            max={120}
            step={1}
            value={logoSettings.bounce}
            onChange={(event) =>
              onLogoSettingChange("bounce", Number(event.target.value))
            }
            disabled={prefersReducedMotion}
            tabIndex={isOpen ? 0 : -1}
            aria-valuetext={`${Math.round(logoSettings.bounce)} pixel bounce`}
          />
          <span className="setting-value">
            {Math.round(logoSettings.bounce)}px
          </span>
        </div>
      </div>
      {prefersReducedMotion ? (
        <p className="builder-logo-settings-note">
          Motion is paused because your system prefers reduced motion.
        </p>
      ) : null}
      <div className="builder-logo-settings-actions">
        <button
          type="button"
          className="logo-settings-reset"
          onClick={onResetLogoSettings}
          tabIndex={isOpen ? 0 : -1}
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
}
