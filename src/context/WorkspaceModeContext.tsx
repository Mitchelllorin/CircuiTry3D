import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { WorkspaceMode } from "../components/builder/types";

/**
 * High-level UI mode flag that distinguishes Arena mode from all normal
 * workspace modes.  Consumers that only need to know "am I in the arena?"
 * should prefer this over inspecting `workspaceMode` directly.
 *
 *   "arena"     – the Component Arena is active (workspaceMode === "arena")
 *   "workspace" – any other normal workspace mode (build, practice, …)
 */
export type UIMode = "workspace" | "arena";

type WorkspaceModeContextValue = {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  /** Derived two-state flag: "arena" when in arena mode, "workspace" otherwise. */
  uiMode: UIMode;
  /** Track if currently in the /app workspace route */
  isInWorkspace: boolean;
  setIsInWorkspace: (inWorkspace: boolean) => void;
  /** Callback for when mode changes - used by Builder to sync state */
  onModeChange: ((mode: WorkspaceMode, source: "global" | "builder") => void) | null;
  setOnModeChange: (callback: ((mode: WorkspaceMode, source: "global" | "builder") => void) | null) => void;
};

const WorkspaceModeContext = createContext<WorkspaceModeContextValue | undefined>(undefined);

export function WorkspaceModeProvider({ children }: { children: ReactNode }) {
  const [workspaceMode, setWorkspaceModeInternal] = useState<WorkspaceMode>("build");
  const [isInWorkspace, setIsInWorkspace] = useState(false);
  const [onModeChange, setOnModeChangeInternal] = useState<((mode: WorkspaceMode, source: "global" | "builder") => void) | null>(null);

  const setWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setWorkspaceModeInternal(mode);
    if (onModeChange) {
      onModeChange(mode, "global");
    }
  }, [onModeChange]);

  const setOnModeChange = useCallback((callback: ((mode: WorkspaceMode, source: "global" | "builder") => void) | null) => {
    setOnModeChangeInternal(() => callback);
  }, []);

  const uiMode: UIMode = workspaceMode === "arena" ? "arena" : "workspace";

  const value = useMemo<WorkspaceModeContextValue>(
    () => ({
      workspaceMode,
      setWorkspaceMode,
      uiMode,
      isInWorkspace,
      setIsInWorkspace,
      onModeChange,
      setOnModeChange,
    }),
    [workspaceMode, setWorkspaceMode, uiMode, isInWorkspace, onModeChange, setOnModeChange]
  );

  return <WorkspaceModeContext.Provider value={value}>{children}</WorkspaceModeContext.Provider>;
}

export const useWorkspaceMode = () => {
  const context = useContext(WorkspaceModeContext);
  if (!context) {
    throw new Error("useWorkspaceMode must be used within a WorkspaceModeProvider");
  }
  return context;
};
