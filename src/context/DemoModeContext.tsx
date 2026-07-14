/**
 * Demo Mode Context
 *
 * Global feature flag system that gates premium features behind a Demo/Full mode toggle.
 * - Demo Mode (isDemoMode = true): Limited components, locked features, upgrade prompts
 * - Full Mode (isDemoMode = false): All features unlocked
 *
 * The mode is persisted in localStorage so an in-app upgrade survives page reloads.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "circuitry3d:isDemoMode";

/** Component IDs available in Demo Mode */
export const DEMO_COMPONENT_IDS = new Set([
  "battery",
  "resistor",
  "led",
  "switch",
  "junction",
  "ground",
]);

/** Component IDs that require Full Mode */
export const PREMIUM_COMPONENT_IDS = new Set([
  "ac_source",
  "capacitor",
  "capacitor-ceramic",
  "inductor",
  "diode",
  "zener-diode",
  "photodiode",
  "thermistor",
  "crystal",
  "bjt",
  "bjt-npn",
  "bjt-pnp",
  "darlington",
  "mosfet",
  "fuse",
  "potentiometer",
  "lamp",
  "motor",
  "speaker",
  "opamp",
  "transformer",
]);

/** Practice problem difficulties available in Demo Mode */
export const DEMO_PRACTICE_DIFFICULTIES = new Set(["intro"]);

/** Practice topologies available in Demo Mode */
export const DEMO_PRACTICE_TOPOLOGIES = new Set(["series"]);

/** Maximum number of example circuits in Demo Mode */
export const DEMO_MAX_EXAMPLE_CIRCUITS = 2;

/** Workspace modes available in Demo Mode */
export const DEMO_WORKSPACE_MODES = new Set(["build", "practice", "arena", "learn"]);

/** Features gated in Demo Mode */
export type GatedFeature =
  | "save"
  | "load"
  | "export"
  | "import"
  | "multi-layer"
  | "advanced-components"
  | "advanced-modules"
  | "simulation-speed"
  | "troubleshoot-mode"
  | "classroom"
  | "community"
  | "arcade"
  | "advanced-practice"
  | "environmental-panel"
  | "ac-frequency-panel";

/** Human-readable labels for gated features */
export const GATED_FEATURE_LABELS: Record<GatedFeature, string> = {
  save: "Save Circuits",
  load: "Load Circuits",
  export: "Export Circuits",
  import: "Import Circuits",
  "multi-layer": "Multi-Layer Circuits",
  "advanced-components": "Advanced Components",
  "advanced-modules": "Advanced Modules",
  "simulation-speed": "Simulation Speed Controls",
  "troubleshoot-mode": "Troubleshoot Mode",
  classroom: "Classroom Features",
  community: "Community Features",
  arcade: "Arcade Mode",
  "advanced-practice": "Advanced Practice Problems",
  "environmental-panel": "Environmental Conditions Panel",
  "ac-frequency-panel": "AC Frequency Panel",
};

interface DemoModeContextValue {
  /** Whether the app is running in Demo Mode */
  isDemoMode: boolean;
  /** Upgrade from Demo to Full Mode */
  upgradeToPremium: () => void;
  /** Check if a specific feature is locked */
  isFeatureLocked: (feature: GatedFeature) => boolean;
  /** Check if a component ID is available */
  isComponentAvailable: (componentId: string) => boolean;
  /** Show the upgrade modal for a specific feature */
  showUpgradePrompt: (feature: GatedFeature) => void;
  /** Close the upgrade modal */
  closeUpgradePrompt: () => void;
  /** Currently prompted feature (null when modal is closed) */
  promptedFeature: GatedFeature | null;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

function getInitialDemoMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "false") return false;
  } catch {
    // localStorage unavailable
  }
  // Default to Demo Mode (true) for all builds
  return true;
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(getInitialDemoMode);
  const [promptedFeature, setPromptedFeature] = useState<GatedFeature | null>(null);

  const upgradeToPremium = useCallback(() => {
    setIsDemoMode(false);
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // localStorage unavailable
    }
    setPromptedFeature(null);
  }, []);

  const isFeatureLocked = useCallback(
    (_feature: GatedFeature) => isDemoMode,
    [isDemoMode],
  );

  const isComponentAvailable = useCallback(
    (componentId: string) => {
      if (!isDemoMode) return true;
      return DEMO_COMPONENT_IDS.has(componentId);
    },
    [isDemoMode],
  );

  const showUpgradePrompt = useCallback((feature: GatedFeature) => {
    setPromptedFeature(feature);
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setPromptedFeature(null);
  }, []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      upgradeToPremium,
      isFeatureLocked,
      isComponentAvailable,
      showUpgradePrompt,
      closeUpgradePrompt,
      promptedFeature,
    }),
    [isDemoMode, upgradeToPremium, isFeatureLocked, isComponentAvailable, showUpgradePrompt, closeUpgradePrompt, promptedFeature],
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
