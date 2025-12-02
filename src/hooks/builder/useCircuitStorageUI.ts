/**
 * useCircuitStorageUI Hook
 * Provides UI state and handlers for circuit save/load functionality.
 */

import { useState, useCallback, useMemo } from "react";
import { useCircuitStorage } from "../../context/CircuitStorageContext";
import type { CircuitState, SavedCircuit } from "../../services/circuitSerializer";
import type { StorageResult } from "../../services/circuitStorage";

export interface CircuitStorageUIState {
  isSaveModalOpen: boolean;
  isLoadModalOpen: boolean;
}

export interface CircuitStorageUIHandlers {
  // Modal controls
  openSaveModal: () => void;
  closeSaveModal: () => void;
  openLoadModal: () => void;
  closeLoadModal: () => void;

  // Save operations
  handleSave: (name: string, description?: string, tags?: string[]) => StorageResult<SavedCircuit>;
  handleQuickSave: () => StorageResult<SavedCircuit> | null;

  // Load operations
  handleLoad: (id: string) => StorageResult<SavedCircuit>;
  handleDelete: (id: string) => StorageResult<void>;
  handleDuplicate: (id: string) => StorageResult<SavedCircuit>;
  handleRename: (id: string, newName: string) => StorageResult<SavedCircuit>;
  handleExport: (format: "circuit3d" | "json") => void;
  handleImport: (file: File) => Promise<StorageResult<SavedCircuit>>;
  handleNewCircuit: () => void;

  // Recovery
  handleRecover: () => void;
  handleDismissRecovery: () => void;

  // Auto-save trigger
  handleCircuitChange: (state: CircuitState) => void;
}

export interface UseCircuitStorageUIResult {
  state: CircuitStorageUIState;
  handlers: CircuitStorageUIHandlers;
  context: ReturnType<typeof useCircuitStorage>;
}

interface UseCircuitStorageUIOptions {
  currentCircuitState: CircuitState | null;
  onCircuitLoaded?: (circuit: SavedCircuit) => void;
  onNewCircuit?: () => void;
}

export function useCircuitStorageUI({
  currentCircuitState,
  onCircuitLoaded,
  onNewCircuit,
}: UseCircuitStorageUIOptions): UseCircuitStorageUIResult {
  const context = useCircuitStorage();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  // Modal controls
  const openSaveModal = useCallback(() => setIsSaveModalOpen(true), []);
  const closeSaveModal = useCallback(() => setIsSaveModalOpen(false), []);
  const openLoadModal = useCallback(() => setIsLoadModalOpen(true), []);
  const closeLoadModal = useCallback(() => setIsLoadModalOpen(false), []);

  // Save handler
  const handleSave = useCallback(
    (name: string, description?: string, tags?: string[]) => {
      if (!currentCircuitState) {
        return { ok: false as const, error: "No circuit state to save" };
      }

      const result = context.saveCurrentCircuit(name, currentCircuitState, {
        description,
        tags,
      });

      if (result.ok) {
        closeSaveModal();
      }

      return result;
    },
    [currentCircuitState, context, closeSaveModal]
  );

  // Quick save (for Ctrl+S shortcut)
  const handleQuickSave = useCallback(() => {
    if (!currentCircuitState) {
      return null;
    }

    if (context.currentCircuit) {
      return context.updateCurrentCircuit(currentCircuitState);
    } else {
      // Open save modal for first-time save
      openSaveModal();
      return null;
    }
  }, [currentCircuitState, context, openSaveModal]);

  // Load handler
  const handleLoad = useCallback(
    (id: string) => {
      const result = context.loadCircuitById(id);

      if (result.ok) {
        closeLoadModal();
        onCircuitLoaded?.(result.data);
      }

      return result;
    },
    [context, closeLoadModal, onCircuitLoaded]
  );

  // Delete handler
  const handleDelete = useCallback(
    (id: string) => {
      return context.deleteCircuitById(id);
    },
    [context]
  );

  // Duplicate handler
  const handleDuplicate = useCallback(
    (id: string) => {
      return context.duplicateCircuitById(id);
    },
    [context]
  );

  // Rename handler
  const handleRename = useCallback(
    (id: string, newName: string) => {
      return context.renameCircuitById(id, newName);
    },
    [context]
  );

  // Export handler
  const handleExport = useCallback(
    (format: "circuit3d" | "json") => {
      context.exportCurrentCircuit(format);
    },
    [context]
  );

  // Import handler
  const handleImport = useCallback(
    async (file: File) => {
      const result = await context.importCircuitFile(file);

      if (result.ok) {
        closeLoadModal();
        onCircuitLoaded?.(result.data);
      }

      return result;
    },
    [context, closeLoadModal, onCircuitLoaded]
  );

  // New circuit handler
  const handleNewCircuit = useCallback(() => {
    context.clearCurrentCircuit();
    onNewCircuit?.();
  }, [context, onNewCircuit]);

  // Recovery handlers
  const handleRecover = useCallback(() => {
    const result = context.recoverCircuit();
    if (result?.ok) {
      onCircuitLoaded?.(result.data);
    }
  }, [context, onCircuitLoaded]);

  const handleDismissRecovery = useCallback(() => {
    context.dismissRecovery();
  }, [context]);

  // Auto-save trigger
  const handleCircuitChange = useCallback(
    (state: CircuitState) => {
      context.triggerAutoSave(state);
    },
    [context]
  );

  const state = useMemo<CircuitStorageUIState>(
    () => ({
      isSaveModalOpen,
      isLoadModalOpen,
    }),
    [isSaveModalOpen, isLoadModalOpen]
  );

  const handlers = useMemo<CircuitStorageUIHandlers>(
    () => ({
      openSaveModal,
      closeSaveModal,
      openLoadModal,
      closeLoadModal,
      handleSave,
      handleQuickSave,
      handleLoad,
      handleDelete,
      handleDuplicate,
      handleRename,
      handleExport,
      handleImport,
      handleNewCircuit,
      handleRecover,
      handleDismissRecovery,
      handleCircuitChange,
    }),
    [
      openSaveModal,
      closeSaveModal,
      openLoadModal,
      closeLoadModal,
      handleSave,
      handleQuickSave,
      handleLoad,
      handleDelete,
      handleDuplicate,
      handleRename,
      handleExport,
      handleImport,
      handleNewCircuit,
      handleRecover,
      handleDismissRecovery,
      handleCircuitChange,
    ]
  );

  return { state, handlers, context };
}
