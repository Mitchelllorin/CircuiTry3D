import { useEffect, useCallback, useState } from "react";
import type { WireMetrics, PartialWireMetrics, ACMetrics, ACCircuitInput, CircuitMode } from "../utils/electrical";
import {
  solveWireMetrics,
  formatMetricValue,
  solveACCircuit,
  formatACMetricValue,
  emptyACMetrics,
  validateACInput,
  DEFAULT_AC_FREQUENCY,
  getPhaseCharacteristic,
  formatFrequency,
} from "../utils/electrical";

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

/**
 * Hook to manage AC circuit metrics with frequency-dependent calculations
 * Provides reactance, impedance, and phase angle computations
 */
export function useACMetricsSync(initialInput?: Partial<ACCircuitInput>) {
  const [circuitMode, setCircuitMode] = useState<CircuitMode>("dc");
  const [acMetrics, setACMetrics] = useState<ACMetrics | null>(null);
  const [frequency, setFrequency] = useState<number>(initialInput?.frequencyHz ?? DEFAULT_AC_FREQUENCY);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  /**
   * Update AC circuit metrics based on input parameters
   */
  const updateACMetrics = useCallback((input: ACCircuitInput) => {
    try {
      // Validate input first
      const validation = validateACInput(input);
      if (!validation.valid) {
        setError(validation.errors.join(", "));
        return null;
      }

      const solved = solveACCircuit(input);
      setACMetrics(solved);
      setFrequency(input.frequencyHz);
      setError(null);
      setLastUpdate(Date.now());
      return solved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to solve AC circuit");
      return null;
    }
  }, []);

  /**
   * Update just the frequency and recalculate if we have existing metrics
   */
  const updateFrequency = useCallback((newFrequency: number, currentInput?: Omit<ACCircuitInput, "frequencyHz">) => {
    if (newFrequency <= 0) {
      setError("Frequency must be positive");
      return null;
    }

    setFrequency(newFrequency);

    if (currentInput) {
      return updateACMetrics({
        ...currentInput,
        frequencyHz: newFrequency,
      });
    }

    return null;
  }, [updateACMetrics]);

  /**
   * Toggle between DC and AC circuit modes
   */
  const toggleCircuitMode = useCallback(() => {
    setCircuitMode((prev) => (prev === "dc" ? "ac" : "dc"));
  }, []);

  /**
   * Format all AC metrics for display
   */
  const formatACMetrics = useCallback(() => {
    if (!acMetrics) {
      return {
        frequency: formatFrequency(frequency),
        inductiveReactance: "—",
        capacitiveReactance: "—",
        netReactance: "—",
        impedance: "—",
        phaseAngle: "—",
        current: "—",
        apparentPower: "—",
        reactivePower: "—",
        realPower: "—",
        powerFactor: "—",
        phaseCharacteristic: "unity" as const,
      };
    }

    return {
      frequency: formatFrequency(acMetrics.frequencyHz),
      inductiveReactance: formatACMetricValue(acMetrics.inductiveReactance, "inductiveReactance"),
      capacitiveReactance: formatACMetricValue(acMetrics.capacitiveReactance, "capacitiveReactance"),
      netReactance: formatACMetricValue(acMetrics.netReactance, "netReactance"),
      impedance: formatACMetricValue(acMetrics.impedance, "impedance"),
      phaseAngle: formatACMetricValue(acMetrics.phaseAngle, "phaseAngle"),
      current: `${acMetrics.current.toFixed(3)} A`,
      apparentPower: formatACMetricValue(acMetrics.apparentPower, "apparentPower"),
      reactivePower: formatACMetricValue(acMetrics.reactivePower, "reactivePower"),
      realPower: `${acMetrics.realPower.toFixed(2)} W`,
      powerFactor: formatACMetricValue(acMetrics.powerFactor, "powerFactor"),
      phaseCharacteristic: getPhaseCharacteristic(acMetrics.phaseAngle),
    };
  }, [acMetrics, frequency]);

  /**
   * Reset AC metrics to initial state
   */
  const reset = useCallback(() => {
    setACMetrics(null);
    setError(null);
    setFrequency(DEFAULT_AC_FREQUENCY);
  }, []);

  /**
   * Get empty AC metrics with current frequency
   */
  const getEmptyMetrics = useCallback(() => {
    return emptyACMetrics(frequency);
  }, [frequency]);

  // Initialize with provided input
  useEffect(() => {
    if (initialInput && initialInput.voltage !== undefined && initialInput.resistance !== undefined) {
      updateACMetrics({
        voltage: initialInput.voltage,
        frequencyHz: initialInput.frequencyHz ?? DEFAULT_AC_FREQUENCY,
        resistance: initialInput.resistance,
        inductance: initialInput.inductance,
        capacitance: initialInput.capacitance,
      });
    }
  }, [initialInput, updateACMetrics]);

  return {
    // State
    circuitMode,
    acMetrics,
    frequency,
    error,
    lastUpdate,
    isACMode: circuitMode === "ac",

    // Actions
    updateACMetrics,
    updateFrequency,
    toggleCircuitMode,
    setCircuitMode,
    formatACMetrics,
    reset,
    getEmptyMetrics,
  };
}
