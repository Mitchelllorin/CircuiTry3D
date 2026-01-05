import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { WorkspaceMode } from "../components/builder/types";

type WorkspaceModeContextValue = {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  isWireLibraryPanelOpen: boolean;
  setWireLibraryPanelOpen: (open: boolean) => void;
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
  const [isWireLibraryPanelOpen, setWireLibraryPanelOpen] = useState(false);
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

  const value = useMemo<WorkspaceModeContextValue>(
    () => ({
      workspaceMode,
      setWorkspaceMode,
      isWireLibraryPanelOpen,
      setWireLibraryPanelOpen,
      isInWorkspace,
      setIsInWorkspace,
      onModeChange,
      setOnModeChange,
    }),
    [workspaceMode, setWorkspaceMode, isWireLibraryPanelOpen, isInWorkspace, onModeChange, setOnModeChange]
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
