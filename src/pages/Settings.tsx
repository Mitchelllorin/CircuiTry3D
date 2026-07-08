import { useMemo, useState } from "react";
import BrandSignature from "../components/BrandSignature";
import {
  useAppSettings,
  type AppSettings,
  type SettingsCategory,
} from "../context/AppSettingsContext";
import "../styles/settings.css";

type SliderControl = {
  kind: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  hint?: string;
};

type ToggleControl = {
  kind: "toggle";
  key: string;
  label: string;
  hint?: string;
};

type Control = SliderControl | ToggleControl;

type CategoryConfig = {
  id: SettingsCategory;
  title: string;
  blurb: string;
  controls: Control[];
};

const pct = (v: number) => `${Math.round(v)}%`;

const CONFIG: CategoryConfig[] = [
  {
    id: "logo3d",
    title: "Logo & Branding",
    blurb: "The real WebGL 3D CircuiTry3D logo on the landing page and in-app branding.",
    controls: [
      { kind: "toggle", key: "visible", label: "Show 3D logo" },
      { kind: "slider", key: "opacity", label: "Opacity", min: 0, max: 100, step: 1, format: pct },
      { kind: "slider", key: "rotationSpeed", label: "Rotation speed", min: 0, max: 100, step: 1, format: pct },
      { kind: "slider", key: "swingAngle", label: "Swing angle", min: 0, max: 100, step: 1, format: pct, hint: "How far the logo turns left/right" },
      { kind: "slider", key: "depth", label: "Extrusion depth", min: 0, max: 100, step: 1, format: pct },
    ],
  },
  {
    id: "graphics",
    title: "Graphics & Performance",
    blurb: "Rendering quality vs. battery/CPU. Lower these on slower devices. Applies to 3D views opened after the change (reload to apply everywhere).",
    controls: [
      { kind: "slider", key: "quality", label: "Render quality", min: 0, max: 100, step: 1, format: pct, hint: "Master quality — scales resolution and detail" },
      { kind: "slider", key: "pixelRatioCap", label: "Pixel ratio cap", min: 100, max: 300, step: 25, format: (v) => `${(v / 100).toFixed(2)}×` },
      { kind: "slider", key: "targetFps", label: "Target frame rate", min: 30, max: 120, step: 5, format: (v) => `${v} fps` },
      { kind: "slider", key: "geometryDetail", label: "Geometry detail", min: 0, max: 100, step: 1, format: pct },
      { kind: "toggle", key: "antialias", label: "Anti-aliasing" },
    ],
  },
  {
    id: "workspace",
    title: "Workspace & Scene",
    blurb: "The 3D builder background, grid, snapping and camera feel. Background, grid and current-flow speed update the scene live.",
    controls: [
      { kind: "slider", key: "bgBrightness", label: "Background brightness", min: 0, max: 100, step: 1, format: pct, hint: "Lightness of the 3D void behind the circuit" },
      { kind: "slider", key: "bgHue", label: "Background colour (hue)", min: 0, max: 360, step: 1, format: (v) => `${v}°` },
      { kind: "slider", key: "gridBrightness", label: "Grid brightness", min: 0, max: 100, step: 1, format: pct },
      { kind: "slider", key: "gridLineWidth", label: "Grid line width", min: 1, max: 5, step: 1, format: (v) => `${v}px` },
      { kind: "slider", key: "gridHue", label: "Grid color (hue)", min: 0, max: 360, step: 1, format: (v) => `${v}°` },
      { kind: "slider", key: "cameraSensitivity", label: "Camera sensitivity", min: 0, max: 100, step: 1, format: pct },
      { kind: "toggle", key: "snapToGrid", label: "Snap components to grid" },
      { kind: "toggle", key: "centerInView", label: "Center circuit in available space", hint: "Keep the circuit centered in the area left visible by open panels" },
      { kind: "toggle", key: "translucentMenus", label: "See-through menus", hint: "Make menus and coach cards translucent so you can still see the workspace behind them" },
    ],
  },
  {
    id: "simulation",
    title: "Simulation",
    blurb: "How circuit simulation and current-flow animation behave.",
    controls: [
      { kind: "slider", key: "currentFlowSpeed", label: "Current flow speed", min: 0, max: 100, step: 1, format: pct },
      { kind: "toggle", key: "animationsEnabled", label: "Enable flow animations" },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    blurb: "Comfort and inclusivity options. These apply across the whole app.",
    controls: [
      { kind: "slider", key: "uiScale", label: "UI scale", min: 80, max: 140, step: 5, format: pct },
      { kind: "slider", key: "soundVolume", label: "Sound volume", min: 0, max: 100, step: 1, format: pct },
      { kind: "toggle", key: "reducedMotion", label: "Reduce motion" },
      { kind: "toggle", key: "highContrast", label: "High contrast" },
    ],
  },
];

export default function Settings({ embedded = false }: { embedded?: boolean }) {
  const { settings, setSetting, resetCategory, resetAll } = useAppSettings();
  const [activeId, setActiveId] = useState<SettingsCategory>(CONFIG[0].id);

  const active = useMemo(
    () => CONFIG.find((c) => c.id === activeId) ?? CONFIG[0],
    [activeId],
  );

  const group = settings[active.id] as Record<string, number | boolean>;

  return (
    <div className={`settings-page${embedded ? " settings-page--embedded" : ""}`}>
      {!embedded && (
        <header className="settings-page__header">
          <BrandSignature size="md" />
          <div>
            <h1>Settings</h1>
            <p>Tune every part of CircuiTry3D. Changes save automatically.</p>
          </div>
          <button type="button" className="settings-reset settings-reset--all" onClick={resetAll}>
            Reset everything
          </button>
        </header>
      )}

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {CONFIG.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`settings-nav__item${c.id === activeId ? " is-active" : ""}`}
              onClick={() => setActiveId(c.id)}
              aria-current={c.id === activeId}
            >
              {c.title}
            </button>
          ))}
        </nav>

        <section className="settings-panel" aria-label={active.title}>
          <div className="settings-panel__head">
            <div>
              <h2>{active.title}</h2>
              <p>{active.blurb}</p>
            </div>
            <button
              type="button"
              className="settings-reset"
              onClick={() => resetCategory(active.id)}
            >
              Reset section
            </button>
          </div>

          <div className="settings-controls">
            {active.controls.map((ctrl) => {
              if (ctrl.kind === "toggle") {
                const checked = Boolean(group[ctrl.key]);
                return (
                  <label key={ctrl.key} className="settings-row settings-row--toggle">
                    <span className="settings-row__label">
                      {ctrl.label}
                      {ctrl.hint ? <small>{ctrl.hint}</small> : null}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      className={`settings-switch${checked ? " is-on" : ""}`}
                      onClick={() =>
                        setSetting(
                          active.id,
                          ctrl.key as keyof AppSettings[typeof active.id],
                          !checked as never,
                        )
                      }
                    >
                      <span className="settings-switch__thumb" />
                    </button>
                  </label>
                );
              }

              const value = Number(group[ctrl.key]);
              return (
                <div key={ctrl.key} className="settings-row settings-row--slider">
                  <div className="settings-row__top">
                    <span className="settings-row__label">
                      {ctrl.label}
                      {ctrl.hint ? <small>{ctrl.hint}</small> : null}
                    </span>
                    <span className="settings-row__value">
                      {ctrl.format ? ctrl.format(value) : value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={value}
                    onChange={(e) =>
                      setSetting(
                        active.id,
                        ctrl.key as keyof AppSettings[typeof active.id],
                        Number(e.target.value) as never,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
