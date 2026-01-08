/**
 * Circuit Storage Context
 * React context provider for circuit save/load functionality.
 *
 * Provides:
 * - Save/load/delete operations
 * - Auto-save with recovery
 * - File export/import
 * - Unsaved changes detection
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { SavedCircuit, CircuitState } from "../services/circuitSerializer";
import {
  saveCircuit,
  loadCircuit,
  deleteCircuit,
  listCircuits,
  exportCircuitToFile,
  importCircuitFromFile,
  saveRecoveryData,
  loadRecoveryData,
  clearRecoveryData,
  hasRecoveryData,
  scheduleAutoSave,
  cancelAutoSave,
  duplicateCircuit,
  renameCircuit,
  isStorageLow,
  getStorageUsage,
} from "../services/circuitStorage";
import type { CircuitIndexEntry, RecoveryData, StorageResult } from "../services/circuitStorage";
import { createId } from "../utils/id";

// Session ID for tracking recovery
const SESSION_ID = createId("session");

// Context value type
interface CircuitStorageContextValue {
  // Current circuit state
  currentCircuit: SavedCircuit | null;
  hasUnsavedChanges: boolean;
  isStorageLow: boolean;

  // Circuit operations
  saveCurrentCircuit: (name: string, state: CircuitState, options?: {
    description?: string;
    tags?: string[];
    settings?: SavedCircuit["settings"];
  }) => StorageResult<SavedCircuit>;
  updateCurrentCircuit: (state: CircuitState) => StorageResult<SavedCircuit>;
  loadCircuitById: (id: string) => StorageResult<SavedCircuit>;
  deleteCircuitById: (id: string) => StorageResult<void>;
  duplicateCircuitById: (id: string) => StorageResult<SavedCircuit>;
  renameCircuitById: (id: string, newName: string) => StorageResult<SavedCircuit>;
  clearCurrentCircuit: () => void;

  // Circuit list
  savedCircuits: CircuitIndexEntry[];
  refreshCircuitList: () => void;

  // File operations
  exportCurrentCircuit: (format?: "circuit3d" | "json") => void;
  importCircuitFile: (file: File) => Promise<StorageResult<SavedCircuit>>;

  // Recovery
  recoveryData: RecoveryData | null;
  recoverCircuit: () => StorageResult<SavedCircuit> | null;
  dismissRecovery: () => void;

  // Auto-save
  triggerAutoSave: (state: CircuitState) => void;

  // Storage info
  storageUsage: { used: number; total: number; percentage: number } | null;
}

const CircuitStorageContext = createContext<CircuitStorageContextValue | undefined>(undefined);

export function CircuitStorageProvider({ children }: { children: ReactNode }) {
  const [currentCircuit, setCurrentCircuit] = useState<SavedCircuit | null>(null);
  const [savedCircuits, setSavedCircuits] = useState<CircuitIndexEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ used: number; total: number; percentage: number } | null>(null);

  const initializedRef = useRef(false);
  const lastSavedStateRef = useRef<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    // Load circuits list
    setSavedCircuits(listCircuits());

    // Check for recovery data
    if (hasRecoveryData()) {
      const recovery = loadRecoveryData();
      if (recovery) {
        setRecoveryData(recovery);
      }
    }

    // Check storage status
    setStorageWarning(isStorageLow());
    setStorageUsage(getStorageUsage());
  }, []);

  // Refresh circuit list
  const refreshCircuitList = useCallback(() => {
    setSavedCircuits(listCircuits());
    setStorageWarning(isStorageLow());
    setStorageUsage(getStorageUsage());
  }, []);

  // Save current circuit
  const saveCurrentCircuit = useCallback((
    name: string,
    state: CircuitState,
    options?: {
      description?: string;
      tags?: string[];
      settings?: SavedCircuit["settings"];
    }
  ): StorageResult<SavedCircuit> => {
    const result = saveCircuit(name, state, {
      id: currentCircuit?.metadata.id,
      ...options,
    });

    if (result.ok) {
      setCurrentCircuit(result.data);
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = JSON.stringify(state);
      refreshCircuitList();
    }

    return result;
  }, [currentCircuit, refreshCircuitList]);

  // Update current circuit (assumes already saved once)
  const updateCurrentCircuit = useCallback((state: CircuitState): StorageResult<SavedCircuit> => {
    if (!currentCircuit) {
      return { ok: false, error: "No circuit is currently loaded" };
    }

    return saveCurrentCircuit(currentCircuit.metadata.name, state, {
      description: currentCircuit.metadata.description,
      tags: currentCircuit.metadata.tags,
      settings: currentCircuit.settings,
    });
  }, [currentCircuit, saveCurrentCircuit]);

  // Load a circuit
  const loadCircuitById = useCallback((id: string): StorageResult<SavedCircuit> => {
    const result = loadCircuit(id);

    if (result.ok) {
      setCurrentCircuit(result.data);
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = JSON.stringify(result.data.state);
      clearRecoveryData();
      setRecoveryData(null);
    }

    return result;
  }, []);

  // Delete a circuit
  const deleteCircuitById = useCallback((id: string): StorageResult<void> => {
    const result = deleteCircuit(id);

    if (result.ok) {
      if (currentCircuit?.metadata.id === id) {
        setCurrentCircuit(null);
        setHasUnsavedChanges(false);
        lastSavedStateRef.current = null;
      }
      refreshCircuitList();
    }

    return result;
  }, [currentCircuit, refreshCircuitList]);

  // Duplicate a circuit
  const duplicateCircuitById = useCallback((id: string): StorageResult<SavedCircuit> => {
    const result = duplicateCircuit(id);

    if (result.ok) {
      refreshCircuitList();
    }

    return result;
  }, [refreshCircuitList]);

  // Rename a circuit
  const renameCircuitById = useCallback((id: string, newName: string): StorageResult<SavedCircuit> => {
    const result = renameCircuit(id, newName);

    if (result.ok) {
      if (currentCircuit?.metadata.id === id) {
        setCurrentCircuit(result.data);
      }
      refreshCircuitList();
    }

    return result;
  }, [currentCircuit, refreshCircuitList]);

  // Clear current circuit
  const clearCurrentCircuit = useCallback(() => {
    setCurrentCircuit(null);
    setHasUnsavedChanges(false);
    lastSavedStateRef.current = null;
  }, []);

  // Export current circuit
  const exportCurrentCircuit = useCallback((format: "circuit3d" | "json" = "circuit3d") => {
    if (!currentCircuit) {
      console.warn("No circuit to export");
      return;
    }
    exportCircuitToFile(currentCircuit, format);
  }, [currentCircuit]);

  // Import circuit file
  const importCircuitFile = useCallback(async (file: File): Promise<StorageResult<SavedCircuit>> => {
    const result = await importCircuitFromFile(file);

    if (result.ok) {
      setCurrentCircuit(result.data);
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = JSON.stringify(result.data.state);
      refreshCircuitList();
    }

    return result;
  }, [refreshCircuitList]);

  // Recover circuit from recovery data
  const recoverCircuit = useCallback((): StorageResult<SavedCircuit> | null => {
    if (!recoveryData) {
      return null;
    }

    const name = recoveryData.name || `Recovered Circuit (${new Date(recoveryData.timestamp).toLocaleString()})`;
    const result = saveCircuit(name, recoveryData.state);

    if (result.ok) {
      setCurrentCircuit(result.data);
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = JSON.stringify(result.data.state);
      clearRecoveryData();
      setRecoveryData(null);
      refreshCircuitList();
    }

    return result;
  }, [recoveryData, refreshCircuitList]);

  // Dismiss recovery prompt
  const dismissRecovery = useCallback(() => {
    clearRecoveryData();
    setRecoveryData(null);
  }, []);

  // Trigger auto-save
  const triggerAutoSave = useCallback((state: CircuitState) => {
    const stateJson = JSON.stringify(state);

    // Check if state has changed
    if (lastSavedStateRef.current !== stateJson) {
      setHasUnsavedChanges(true);
      scheduleAutoSave(state, SESSION_ID, currentCircuit?.metadata.name);
    }
  }, [currentCircuit]);

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, []);

  // Warn user about unsaved changes on page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const value = useMemo<CircuitStorageContextValue>(
    () => ({
      currentCircuit,
      hasUnsavedChanges,
      isStorageLow: storageWarning,
      saveCurrentCircuit,
      updateCurrentCircuit,
      loadCircuitById,
      deleteCircuitById,
      duplicateCircuitById,
      renameCircuitById,
      clearCurrentCircuit,
      savedCircuits,
      refreshCircuitList,
      exportCurrentCircuit,
      importCircuitFile,
      recoveryData,
      recoverCircuit,
      dismissRecovery,
      triggerAutoSave,
      storageUsage,
    }),
    [
      currentCircuit,
      hasUnsavedChanges,
      storageWarning,
      saveCurrentCircuit,
      updateCurrentCircuit,
      loadCircuitById,
      deleteCircuitById,
      duplicateCircuitById,
      renameCircuitById,
      clearCurrentCircuit,
      savedCircuits,
      refreshCircuitList,
      exportCurrentCircuit,
      importCircuitFile,
      recoveryData,
      recoverCircuit,
      dismissRecovery,
      triggerAutoSave,
      storageUsage,
    ]
  );

  return (
    <CircuitStorageContext.Provider value={value}>
      {children}
    </CircuitStorageContext.Provider>
  );
}

export function useCircuitStorage() {
  const context = useContext(CircuitStorageContext);
  if (!context) {
    throw new Error("useCircuitStorage must be used within a CircuitStorageProvider");
  }
  return context;
}
