import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Unified, persisted application settings.
 *
 * One JSON blob in localStorage under APP_SETTINGS_STORAGE_KEY. The static
 * landing page (public/landing.html) reads the same key to drive the WebGL 3D
 * logo, so the shape of `logo3d` is a cross-boundary contract — keep it stable.
 */
export const APP_SETTINGS_STORAGE_KEY = "circuitry:app-settings";

export type AppSettings = {
  logo3d: {
    visible: boolean;
    opacity: number; // 0-100
    rotationSpeed: number; // 0-100 → animation speed
    swingAngle: number; // 0-100 → max yaw (deg)
    depth: number; // 0-100 → extrusion depth
    glow: number; // 0-100 → emissive intensity
  };
  graphics: {
    quality: number; // 0-100
    pixelRatioCap: number; // 100-300 (÷100 = DPR cap)
    targetFps: number; // 30-120
    antialias: boolean;
    geometryDetail: number; // 0-100
  };
  workspace: {
    bgBrightness: number; // 0-100 → 3D scene background lightness
    bgHue: number; // 0-360 → 3D scene background tint
    gridBrightness: number; // 0-100
    gridLineWidth: number; // 1-5
    gridHue: number; // 0-360
    snapToGrid: boolean;
    cameraSensitivity: number; // 0-100
  };
  simulation: {
    currentFlowSpeed: number; // 0-100
    animationsEnabled: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    uiScale: number; // 80-140 (%)
    highContrast: boolean;
    soundVolume: number; // 0-100
  };
};

export type SettingsCategory = keyof AppSettings;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  logo3d: {
    visible: true,
    opacity: 100,
    rotationSpeed: 50,
    swingAngle: 55,
    depth: 50,
    glow: 60,
  },
  graphics: {
    quality: 75,
    pixelRatioCap: 200,
    targetFps: 60,
    antialias: true,
    geometryDetail: 70,
  },
  workspace: {
    bgBrightness: 35,
    bgHue: 222,
    gridBrightness: 50,
    gridLineWidth: 1,
    gridHue: 210,
    snapToGrid: true,
    cameraSensitivity: 50,
  },
  simulation: {
    currentFlowSpeed: 50,
    animationsEnabled: true,
  },
  accessibility: {
    reducedMotion: false,
    uiScale: 100,
    highContrast: false,
    soundVolume: 70,
  },
};

const clamp = (value: number, min: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

// Per-key numeric bounds so a corrupt/old stored value can't break the UI.
const BOUNDS: Record<string, [number, number]> = {
  "logo3d.opacity": [0, 100],
  "logo3d.rotationSpeed": [0, 100],
  "logo3d.swingAngle": [0, 100],
  "logo3d.depth": [0, 100],
  "logo3d.glow": [0, 100],
  "graphics.quality": [0, 100],
  "graphics.pixelRatioCap": [100, 300],
  "graphics.targetFps": [30, 120],
  "graphics.geometryDetail": [0, 100],
  "workspace.bgBrightness": [0, 100],
  "workspace.bgHue": [0, 360],
  "workspace.gridBrightness": [0, 100],
  "workspace.gridLineWidth": [1, 5],
  "workspace.gridHue": [0, 360],
  "workspace.cameraSensitivity": [0, 100],
  "simulation.currentFlowSpeed": [0, 100],
  "accessibility.uiScale": [80, 140],
  "accessibility.soundVolume": [0, 100],
};

function mergeWithDefaults(stored: unknown): AppSettings {
  const base: AppSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  if (!stored || typeof stored !== "object") return base;
  const parsed = stored as Record<string, Record<string, unknown>>;

  (Object.keys(base) as SettingsCategory[]).forEach((cat) => {
    const group = parsed[cat];
    if (!group || typeof group !== "object") return;
    const target = base[cat] as Record<string, unknown>;
    Object.keys(target).forEach((key) => {
      const incoming = (group as Record<string, unknown>)[key];
      if (incoming === undefined) return;
      if (typeof target[key] === "boolean") {
        if (typeof incoming === "boolean") target[key] = incoming;
      } else if (typeof target[key] === "number" && typeof incoming === "number") {
        const bound = BOUNDS[`${cat}.${key}`];
        target[key] = bound ? clamp(incoming, bound[0], bound[1]) : incoming;
      }
    });
  });
  return base;
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    return mergeWithDefaults(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

type AppSettingsContextValue = {
  settings: AppSettings;
  setSetting: <C extends SettingsCategory, K extends keyof AppSettings[C]>(
    category: C,
    key: K,
    value: AppSettings[C][K],
  ) => void;
  resetCategory: (category: SettingsCategory) => void;
  resetAll: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Persist on every change. The 'storage' event this triggers in OTHER tabs/
  // frames (e.g. the landing iframe) is how the 3D logo updates live.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        APP_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
      // Same-document listeners don't get the native 'storage' event, so also
      // emit a custom event for in-app consumers.
      window.dispatchEvent(
        new CustomEvent("circuitry:settings-changed", { detail: settings }),
      );
    } catch {
      // ignore quota / privacy-mode failures
    }
  }, [settings]);

  // Apply the global, document-level effects so a few settings visibly "work".
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty(
      "--app-ui-scale",
      `${settings.accessibility.uiScale / 100}`,
    );
    root.classList.toggle("app-reduced-motion", settings.accessibility.reducedMotion);
    root.classList.toggle("app-high-contrast", settings.accessibility.highContrast);
  }, [settings.accessibility.uiScale, settings.accessibility.reducedMotion, settings.accessibility.highContrast]);

  const setSetting = useCallback<AppSettingsContextValue["setSetting"]>(
    (category, key, value) => {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...prev[category], [key]: value },
      }));
    },
    [],
  );

  const resetCategory = useCallback((category: SettingsCategory) => {
    setSettings((prev) => ({
      ...prev,
      [category]: JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS[category])),
    }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS)));
  }, []);

  const value = useMemo(
    () => ({ settings, setSetting, resetCategory, resetAll }),
    [settings, setSetting, resetCategory, resetAll],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return ctx;
}
