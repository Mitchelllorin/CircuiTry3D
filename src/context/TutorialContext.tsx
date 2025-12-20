import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * Tutorial step configuration for the helpful tip system.
 * Each step targets a specific UI element with positioning and content.
 */
export type TutorialStep = {
  id: string;
  /** CSS selector or data attribute to target the element */
  target: string;
  /** Title displayed in the tip bubble */
  title: string;
  /** Main content/explanation */
  content: string;
  /** Optional secondary hint */
  hint?: string;
  /** Position relative to target element */
  position: "top" | "bottom" | "left" | "right" | "center";
  /** Delay before showing this step (ms) */
  delay?: number;
  /** Category for grouping related tips */
  category: "workspace" | "components" | "tools" | "analysis" | "navigation";
};

/**
 * Specifies which menu should be opened before showing this step.
 * 'none' means no menu needs to be opened.
 */
export type MenuRequirement = "left" | "right" | "bottom" | "none";

/** All available tutorial steps */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Welcome step (center)
  {
    id: "welcome",
    target: ".builder-workspace",
    title: "Welcome to CircuiTry3D",
    content:
      "This interactive tutorial will guide you through the circuit builder. Follow along to learn the basics!",
    hint: "Click 'Next' to continue or 'Skip' to explore on your own.",
    position: "center",
    category: "workspace",
  },
  // Mode bar
  {
    id: "mode-bar",
    target: ".workspace-mode-bar",
    title: "Workspace Modes",
    content:
      "Switch between Build, Practice, and Arena modes here. Each mode offers different tools for your learning journey.",
    hint: "Build mode is active by default - perfect for creating circuits.",
    position: "bottom",
    category: "navigation",
  },
  // Left toolbar toggle (opens the menu to show users what's inside)
  {
    id: "left-toolbar",
    target: ".builder-menu-toggle-left",
    title: "Component Library Panel",
    content:
      "This button toggles the component library. The panel is now open so you can see the tools inside!",
    hint: "Explore components, quick actions, and wiring tools.",
    position: "right",
    category: "components",
  },
  // Components section (requires left menu open)
  {
    id: "components-library",
    target: "[data-tutorial-target='components-library']",
    title: "Electronic Components",
    content:
      "Here's your component toolkit! Each button represents a different electronic part. Tap one to add it to your workspace.",
    hint: "Try Battery (B), Resistor (R), or LED (L) to get started.",
    position: "right",
    category: "components",
  },
  // Quick actions (requires left menu open)
  {
    id: "quick-actions",
    target: "[data-tutorial-target='quick-actions']",
    title: "Quick Actions",
    content:
      "These tools let you interact with your circuit. Select mode picks components, Wire mode connects them, and Simulate runs the circuit.",
    hint: "The active tool is highlighted in green.",
    position: "right",
    category: "tools",
  },
  // Wire modes (requires left menu open)
  {
    id: "wire-modes",
    target: "[data-tutorial-target='wire-modes']",
    title: "Wiring Tools",
    content:
      "Wire Mode lets you draw connections between components. Cycle through routing styles for different wire layouts.",
    hint: "Hold Shift in schematic mode to flip elbow direction.",
    position: "right",
    category: "tools",
  },
  // Right toolbar toggle (opens the right panel)
  {
    id: "right-toolbar",
    target: ".builder-menu-toggle-right",
    title: "View Controls Panel",
    content:
      "This panel contains visualization settings. The panel is now open - you can adjust current flow direction, polarity indicators, and layout modes.",
    hint: "Toggle between Electron Flow and Current Flow to see particles move differently.",
    position: "left",
    category: "navigation",
  },
  // Bottom toolbar toggle (opens the bottom panel)
  {
    id: "bottom-toolbar",
    target: ".builder-menu-toggle-bottom",
    title: "Analysis & Guides Panel",
    content:
      "This panel is now open! Here you'll find W.I.R.E. metrics (Watts, Current, Resistance, Voltage), practice problems, and helpful guides.",
    hint: "Watch the metrics update in real-time as you build!",
    position: "top",
    category: "analysis",
  },
  // Floating actions - Clear (target the button directly)
  {
    id: "floating-clear",
    target: ".builder-floating-action--left .builder-floating-button",
    title: "Clear Workspace",
    content:
      "The red button clears all components and wires from your workspace. Use it to start fresh.",
    hint: "Don't worry - you can undo with Ctrl+Z!",
    position: "right",
    category: "tools",
  },
  // Floating actions - Simulate (target the button directly)
  {
    id: "floating-simulate",
    target: ".builder-floating-action--right .builder-floating-button",
    title: "Run Simulation",
    content:
      "The green play button runs your circuit simulation. Watch current flow through your connections!",
    hint: "Make sure your circuit is complete with a closed loop.",
    position: "left",
    category: "tools",
  },
  // 3D workspace
  {
    id: "workspace-canvas",
    target: ".builder-iframe",
    title: "3D Canvas",
    content:
      "This is your building space. Drag to orbit the view, scroll to zoom, and click components to select them.",
    hint: "Double-tap a component to focus the camera on it.",
    position: "center",
    category: "workspace",
  },
  // Completion
  {
    id: "tutorial-complete",
    target: ".builder-workspace",
    title: "You're Ready!",
    content:
      "That covers the basics! Start by adding a battery and resistor, then wire them together. Click the ? button anytime to restart this tutorial.",
    hint: "Press 'B' for battery, 'R' for resistor, 'W' for wire mode.",
    position: "center",
    category: "workspace",
  },
];

/**
 * Maps step IDs to the menu that needs to be opened for that step.
 * Steps not in this map don't require any menu to be open.
 *
 * IMPORTANT: Menus should be opened AT the step that introduces them,
 * not after. This allows users to see the content being described.
 */
export const STEP_MENU_REQUIREMENTS: Record<string, MenuRequirement> = {
  // Open left menu when we introduce the toggle AND for content inside
  "left-toolbar": "left",
  "components-library": "left",
  "quick-actions": "left",
  "wire-modes": "left",
  // Open right menu when we introduce the right toggle
  "right-toolbar": "right",
  // Open bottom menu when we introduce the bottom toggle
  "bottom-toolbar": "bottom",
};

type TutorialState = {
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Whether the tutorial has been completed before */
  hasCompletedOnce: boolean;
  /** Whether user has dismissed the tutorial permanently */
  isDismissed: boolean;
  /** Timestamp of last completion */
  lastCompletedAt?: number;
  /** Steps that have been viewed */
  viewedSteps: string[];
};

type TutorialContextValue = {
  /** Current tutorial state */
  state: TutorialState;
  /** Current active step or null if not active */
  currentStep: TutorialStep | null;
  /** Total number of steps */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Start the tutorial from the beginning */
  startTutorial: () => void;
  /** Advance to the next step */
  nextStep: () => void;
  /** Go back to previous step */
  previousStep: () => void;
  /** Jump to a specific step by ID */
  goToStep: (stepId: string) => void;
  /** Skip/end the tutorial */
  skipTutorial: () => void;
  /** Dismiss the tutorial permanently (don't show on load) */
  dismissTutorial: () => void;
  /** Reset tutorial (clear all progress) */
  resetTutorial: () => void;
  /** Check if a specific step has been viewed */
  hasViewedStep: (stepId: string) => boolean;
};

const STORAGE_KEY = "circuiTry3d.tutorial.v1";

const defaultState: TutorialState = {
  isActive: false,
  currentStepIndex: 0,
  hasCompletedOnce: false,
  isDismissed: false,
  viewedSteps: [],
};

function loadState(): TutorialState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<TutorialState>;
      return {
        ...defaultState,
        ...parsed,
        // Always start inactive on page load
        isActive: false,
        currentStepIndex: 0,
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { ...defaultState };
}

function saveState(state: TutorialState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hasCompletedOnce: state.hasCompletedOnce,
        isDismissed: state.isDismissed,
        lastCompletedAt: state.lastCompletedAt,
        viewedSteps: state.viewedSteps,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TutorialState>(loadState);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-start tutorial for first-time users after a delay
  useEffect(() => {
    if (!state.hasCompletedOnce && !state.isDismissed && !state.isActive) {
      const timer = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isActive: true,
          currentStepIndex: 0,
        }));
      }, 2000); // 2 second delay to let the UI load
      return () => clearTimeout(timer);
    }
  }, [state.hasCompletedOnce, state.isDismissed, state.isActive]);

  const currentStep = useMemo(() => {
    if (!state.isActive) return null;
    return TUTORIAL_STEPS[state.currentStepIndex] ?? null;
  }, [state.isActive, state.currentStepIndex]);

  const totalSteps = TUTORIAL_STEPS.length;

  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round((state.currentStepIndex / (totalSteps - 1)) * 100);
  }, [state.currentStepIndex, totalSteps]);

  const startTutorial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0,
      viewedSteps: [],
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const currentId = TUTORIAL_STEPS[prev.currentStepIndex]?.id;
      const newViewedSteps = currentId && !prev.viewedSteps.includes(currentId)
        ? [...prev.viewedSteps, currentId]
        : prev.viewedSteps;

      if (prev.currentStepIndex >= totalSteps - 1) {
        // Tutorial complete
        return {
          ...prev,
          isActive: false,
          hasCompletedOnce: true,
          lastCompletedAt: Date.now(),
          viewedSteps: newViewedSteps,
        };
      }

      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        viewedSteps: newViewedSteps,
      };
    });
  }, [totalSteps]);

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  const goToStep = useCallback((stepId: string) => {
    const index = TUTORIAL_STEPS.findIndex((s) => s.id === stepId);
    if (index !== -1) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentStepIndex: index,
      }));
    }
  }, []);

  const skipTutorial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  const dismissTutorial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isDismissed: true,
    }));
  }, []);

  const resetTutorial = useCallback(() => {
    setState({ ...defaultState });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const hasViewedStep = useCallback(
    (stepId: string) => state.viewedSteps.includes(stepId),
    [state.viewedSteps]
  );

  const value: TutorialContextValue = useMemo(
    () => ({
      state,
      currentStep,
      totalSteps,
      progress,
      startTutorial,
      nextStep,
      previousStep,
      goToStep,
      skipTutorial,
      dismissTutorial,
      resetTutorial,
      hasViewedStep,
    }),
    [
      state,
      currentStep,
      totalSteps,
      progress,
      startTutorial,
      nextStep,
      previousStep,
      goToStep,
      skipTutorial,
      dismissTutorial,
      resetTutorial,
      hasViewedStep,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
