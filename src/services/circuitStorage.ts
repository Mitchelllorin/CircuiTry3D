/**
 * Circuit Storage Service
 * Handles persistence of circuits to localStorage with optional file export/import.
 *
 * Features:
 * - Save/load circuits to localStorage
 * - Auto-save with debouncing
 * - Export/import as .circuit3d or .json files
 * - Storage quota management
 * - Recovery of unsaved work
 */

import type { SavedCircuit, CircuitState, CircuitMetadata } from "./circuitSerializer";
import {
  CIRCUIT_SCHEMA_VERSION,
  createSavedCircuit,
  validateCircuitDocument,
  migrateCircuitDocument,
  getCircuitSummary,
} from "./circuitSerializer";

// Storage keys
const STORAGE_PREFIX = "circuiTry3d.circuit.";
const CIRCUITS_INDEX_KEY = "circuiTry3d.circuits.index.v1";
const AUTO_SAVE_KEY = "circuiTry3d.circuit.autosave.v1";
const RECOVERY_KEY = "circuiTry3d.circuit.recovery.v1";

// Configuration
const MAX_CIRCUITS = 50;
const AUTO_SAVE_DEBOUNCE_MS = 30000; // 30 seconds
const STORAGE_WARNING_THRESHOLD = 0.8; // 80% of quota

// Index entry for quick circuit listing
export interface CircuitIndexEntry {
  id: string;
  name: string;
  updatedAt: number;
  componentCount: number;
  wireCount: number;
}

// Recovery data for unsaved work
export interface RecoveryData {
  timestamp: number;
  sessionId: string;
  state: CircuitState;
  name?: string;
}

// Storage result types
export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Read the circuits index from localStorage
 */
function readCircuitsIndex(): CircuitIndexEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(CIRCUITS_INDEX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is CircuitIndexEntry =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.updatedAt === "number"
    );
  } catch (error) {
    console.warn("Failed to read circuits index:", error);
    return [];
  }
}

/**
 * Write the circuits index to localStorage
 */
function writeCircuitsIndex(index: CircuitIndexEntry[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(CIRCUITS_INDEX_KEY, JSON.stringify(index));
    return true;
  } catch (error) {
    console.warn("Failed to write circuits index:", error);
    return false;
  }
}

/**
 * Get storage key for a circuit
 */
function getCircuitStorageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

/**
 * Save a circuit to localStorage
 */
export function saveCircuit(
  name: string,
  state: CircuitState,
  options?: {
    id?: string;
    description?: string;
    tags?: string[];
    settings?: SavedCircuit["settings"];
  }
): StorageResult<SavedCircuit> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Storage not available" };
  }

  try {
    const index = readCircuitsIndex();

    // Check if updating existing circuit
    let circuit: SavedCircuit;
    if (options?.id) {
      const existingKey = getCircuitStorageKey(options.id);
      const existingRaw = localStorage.getItem(existingKey);

      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as SavedCircuit;
        circuit = {
          ...existing,
          version: CIRCUIT_SCHEMA_VERSION,
          metadata: {
            ...existing.metadata,
            name,
            description: options.description ?? existing.metadata.description,
            updatedAt: Date.now(),
            tags: options.tags ?? existing.metadata.tags,
          },
          state,
          settings: options.settings ?? existing.settings,
        };
      } else {
        circuit = createSavedCircuit(name, state, options);
        circuit.metadata.id = options.id;
      }
    } else {
      // Check quota before creating new
      if (index.length >= MAX_CIRCUITS) {
        return {
          ok: false,
          error: `Maximum circuit limit (${MAX_CIRCUITS}) reached. Please delete some circuits first.`,
        };
      }
      circuit = createSavedCircuit(name, state, options);
    }

    // Save the circuit
    const key = getCircuitStorageKey(circuit.metadata.id);
    const circuitJson = JSON.stringify(circuit);

    try {
      localStorage.setItem(key, circuitJson);
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        return {
          ok: false,
          error: "Storage quota exceeded. Please delete some circuits or export them to files.",
        };
      }
      throw error;
    }

    // Update index
    const summary = getCircuitSummary(circuit);
    const indexEntry: CircuitIndexEntry = {
      id: circuit.metadata.id,
      name: circuit.metadata.name,
      updatedAt: circuit.metadata.updatedAt,
      componentCount: summary.componentCount,
      wireCount: summary.wireCount,
    };

    const existingIndex = index.findIndex((e) => e.id === circuit.metadata.id);
    if (existingIndex >= 0) {
      index[existingIndex] = indexEntry;
    } else {
      index.unshift(indexEntry);
    }

    // Sort by most recently updated
    index.sort((a, b) => b.updatedAt - a.updatedAt);
    writeCircuitsIndex(index);

    // Clear recovery data on successful save
    clearRecoveryData();

    return { ok: true, data: circuit };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to save circuit: ${message}` };
  }
}

/**
 * Load a circuit from localStorage
 */
export function loadCircuit(id: string): StorageResult<SavedCircuit> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Storage not available" };
  }

  try {
    const key = getCircuitStorageKey(id);
    const raw = localStorage.getItem(key);

    if (!raw) {
      return { ok: false, error: "Circuit not found" };
    }

    const parsed = JSON.parse(raw);

    if (!validateCircuitDocument(parsed)) {
      return { ok: false, error: "Invalid circuit document format" };
    }

    const migrated = migrateCircuitDocument(parsed);
    return { ok: true, data: migrated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to load circuit: ${message}` };
  }
}

/**
 * Delete a circuit from localStorage
 */
export function deleteCircuit(id: string): StorageResult<void> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Storage not available" };
  }

  try {
    const key = getCircuitStorageKey(id);
    localStorage.removeItem(key);

    const index = readCircuitsIndex();
    const filteredIndex = index.filter((e) => e.id !== id);
    writeCircuitsIndex(filteredIndex);

    return { ok: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to delete circuit: ${message}` };
  }
}

/**
 * List all saved circuits
 */
export function listCircuits(): CircuitIndexEntry[] {
  return readCircuitsIndex();
}

/**
 * Export a circuit to a downloadable file
 */
export function exportCircuitToFile(circuit: SavedCircuit, format: "circuit3d" | "json" = "circuit3d"): void {
  const content = JSON.stringify(circuit, null, 2);
  const filename = `${circuit.metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
  const mimeType = format === "json" ? "application/json" : "application/x-circuit3d";

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Import a circuit from a file
 */
export async function importCircuitFromFile(file: File): Promise<StorageResult<SavedCircuit>> {
  try {
    const content = await file.text();
    const parsed = JSON.parse(content);

    if (!validateCircuitDocument(parsed)) {
      return { ok: false, error: "Invalid circuit file format" };
    }

    const migrated = migrateCircuitDocument(parsed);

    // Generate new ID for imported circuit to avoid conflicts
    const now = Date.now();
    migrated.metadata.id = `circuit_${now}_${Math.random().toString(36).substring(2, 11)}`;
    migrated.metadata.createdAt = now;
    migrated.metadata.updatedAt = now;
    migrated.metadata.name = `${migrated.metadata.name} (imported)`;

    // Save to localStorage
    const result = saveCircuit(
      migrated.metadata.name,
      migrated.state,
      {
        id: migrated.metadata.id,
        description: migrated.metadata.description,
        tags: migrated.metadata.tags,
        settings: migrated.settings,
      }
    );

    if (!result.ok) {
      return result;
    }

    return { ok: true, data: migrated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to import circuit: ${message}` };
  }
}

/**
 * Save recovery data for unsaved work
 */
export function saveRecoveryData(state: CircuitState, sessionId: string, name?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const recoveryData: RecoveryData = {
      timestamp: Date.now(),
      sessionId,
      state,
      name,
    };
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryData));
  } catch (error) {
    console.warn("Failed to save recovery data:", error);
  }
}

/**
 * Load recovery data
 */
export function loadRecoveryData(): RecoveryData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RecoveryData;
    if (
      !parsed ||
      typeof parsed.timestamp !== "number" ||
      typeof parsed.sessionId !== "string" ||
      !parsed.state
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Failed to load recovery data:", error);
    return null;
  }
}

/**
 * Clear recovery data
 */
export function clearRecoveryData(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch (error) {
    console.warn("Failed to clear recovery data:", error);
  }
}

/**
 * Check if there is recovery data available
 */
export function hasRecoveryData(): boolean {
  return loadRecoveryData() !== null;
}

/**
 * Get estimated storage usage
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } | null {
  if (typeof window === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  // Rough estimate based on localStorage
  let used = 0;
  for (const key in localStorage) {
    if (key.startsWith(STORAGE_PREFIX) || key.startsWith("circuiTry3d.")) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    }
  }

  // Approximate total (5MB is common localStorage limit)
  const total = 5 * 1024 * 1024;
  const percentage = used / total;

  return { used, total, percentage };
}

/**
 * Check if storage is running low
 */
export function isStorageLow(): boolean {
  const usage = getStorageUsage();
  return usage !== null && usage.percentage >= STORAGE_WARNING_THRESHOLD;
}

// Auto-save debounce timer
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule an auto-save (debounced)
 */
export function scheduleAutoSave(state: CircuitState, sessionId: string, name?: string): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveRecoveryData(state, sessionId, name);
    autoSaveTimer = null;
  }, AUTO_SAVE_DEBOUNCE_MS);
}

/**
 * Cancel any pending auto-save
 */
export function cancelAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * Duplicate an existing circuit
 */
export function duplicateCircuit(id: string): StorageResult<SavedCircuit> {
  const loadResult = loadCircuit(id);
  if (!loadResult.ok) {
    return loadResult;
  }

  const original = loadResult.data;
  const newName = `${original.metadata.name} (copy)`;

  return saveCircuit(newName, original.state, {
    description: original.metadata.description,
    tags: original.metadata.tags,
    settings: original.settings,
  });
}

/**
 * Rename an existing circuit
 */
export function renameCircuit(id: string, newName: string): StorageResult<SavedCircuit> {
  const loadResult = loadCircuit(id);
  if (!loadResult.ok) {
    return loadResult;
  }

  const circuit = loadResult.data;
  return saveCircuit(newName, circuit.state, {
    id: circuit.metadata.id,
    description: circuit.metadata.description,
    tags: circuit.metadata.tags,
    settings: circuit.settings,
  });
}
