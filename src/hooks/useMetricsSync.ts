import { useEffect, useCallback, useState } from "react";
import type { WireMetrics, PartialWireMetrics } from "../utils/electrical";
import { solveWireMetrics, formatMetricValue } from "../utils/electrical";

/**
 * Hook to synchronize W.I.R.E. metrics between Builder and Arena
 * Provides real-time calculation and bidirectional sync
 */
export function useMetricsSync(initialMetrics?: PartialWireMetrics) {
  const [metrics, setMetrics] = useState<WireMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const updateMetrics = useCallback((newMetrics: PartialWireMetrics) => {
    try {
      const solved = solveWireMetrics(newMetrics);
      setMetrics(solved);
      setError(null);
      setLastUpdate(Date.now());
      return solved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to solve metrics");
      return null;
    }
  }, []);

  const formatMetrics = useCallback(() => {
    if (!metrics) {
      return {
        watts: "—",
        current: "—",
        resistance: "—",
        voltage: "—",
      };
    }

    return {
      watts: formatMetricValue(metrics.watts, "watts"),
      current: formatMetricValue(metrics.current, "current"),
      resistance: formatMetricValue(metrics.resistance, "resistance"),
      voltage: formatMetricValue(metrics.voltage, "voltage"),
    };
  }, [metrics]);

  const reset = useCallback(() => {
    setMetrics(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (initialMetrics) {
      updateMetrics(initialMetrics);
    }
  }, [initialMetrics, updateMetrics]);

  return {
    metrics,
    error,
    lastUpdate,
    updateMetrics,
    formatMetrics,
    reset,
  };
}

/**
 * Storage key for Arena imports
 */
export const ARENA_STORAGE_KEY = "circuiTry3d.arena.import";

/**
 * Hook to manage Arena import/export synchronization
 */
export function useArenaSync() {
  const [lastSync, setLastSync] = useState<number | null>(null);

  const exportToArena = useCallback((payload: unknown) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }

      window.localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(payload));
      setLastSync(Date.now());

      // Trigger storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: ARENA_STORAGE_KEY,
          newValue: JSON.stringify(payload),
          url: window.location.href,
        })
      );

      return true;
    } catch (error) {
      console.error("Arena export failed:", error);
      return false;
    }
  }, []);

  const importFromArena = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return null;
      }

      const stored = window.localStorage.getItem(ARENA_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      return JSON.parse(stored);
    } catch (error) {
      console.error("Arena import failed:", error);
      return null;
    }
  }, []);

  const clearArenaSync = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }

      window.localStorage.removeItem(ARENA_STORAGE_KEY);
      setLastSync(null);
      return true;
    } catch (error) {
      console.error("Arena clear failed:", error);
      return false;
    }
  }, []);

  return {
    lastSync,
    exportToArena,
    importFromArena,
    clearArenaSync,
  };
}
