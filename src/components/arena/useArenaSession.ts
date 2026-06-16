import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import { buildArenaRoster } from "./arenaData";
import { loadArenaSessionPayload, saveArenaSessionPayload } from "./arenaStorage";
import type {
  ArenaEnvironment,
  ArenaViewTransitionPhase,
  CatalogComponent,
} from "./types";
import { DEFAULT_ENVIRONMENT } from "./types";
import { useArenaBattle } from "./useArenaBattle";

const ENTER_TRANSITION_MS = 1800;

type UseArenaSessionOptions = {
  /** Called once the exit transition has fully played out. */
  onNavigateBack?: () => void;
};

/**
 * Owns the full arena battle lifecycle — session payload, the cinematic
 * entry/exit transition, the active environment, and the running battle.
 *
 * Extracted from ArenaView so the same live state can drive two render
 * surfaces at once: the full-bleed 3D scene that fills the workspace and the
 * translucent control panel that floats over it. Calling this hook in a single
 * parent lets both surfaces share one battle without any context plumbing.
 */
export function useArenaSession({ onNavigateBack }: UseArenaSessionOptions = {}) {
  const { setWorkspaceMode } = useWorkspaceMode();
  const [sessionPayload, setSessionPayload] = useState(() =>
    loadArenaSessionPayload(),
  );
  const [transitionPhase, setTransitionPhase] =
    useState<ArenaViewTransitionPhase>("entering");
  const [environment, setEnvironment] =
    useState<ArenaEnvironment>(DEFAULT_ENVIRONMENT);

  useEffect(() => {
    const refreshPayload = () => setSessionPayload(loadArenaSessionPayload());

    refreshPayload();
    window.addEventListener("storage", refreshPayload);
    window.addEventListener("focus", refreshPayload);

    return () => {
      window.removeEventListener("storage", refreshPayload);
      window.removeEventListener("focus", refreshPayload);
    };
  }, []);

  useEffect(() => {
    setTransitionPhase("entering");
    const timerId = window.setTimeout(() => {
      setTransitionPhase("active");
    }, ENTER_TRANSITION_MS);

    return () => window.clearTimeout(timerId);
  }, [sessionPayload]);

  const arenaAgents = useMemo(
    () => buildArenaRoster(sessionPayload),
    [sessionPayload],
  );

  const {
    agents,
    battleLog,
    currentTurnAgentId,
    winnerId,
    round,
    status,
    highlight,
    fuseResults,
    resetBattle,
  } = useArenaBattle({
    initialAgents: arenaAgents,
    autoStart: transitionPhase === "active",
    environment,
  });

  const handleExitComplete = useCallback(() => {
    if (typeof onNavigateBack === "function") {
      onNavigateBack();
      return;
    }

    setWorkspaceMode("build");
  }, [onNavigateBack, setWorkspaceMode]);

  const handleReturnToWorkspace = useCallback(() => {
    setTransitionPhase((phase) => (phase === "exiting" ? phase : "exiting"));
  }, []);

  const handleLoadCatalogComponent = useCallback((component: CatalogComponent) => {
    const existing = loadArenaSessionPayload();
    const currentComponents = existing?.components ?? [];

    // Keep at most 1 existing combatant then append the new one (max 2 combatants)
    const updatedComponents = [
      ...currentComponents.slice(-1),
      {
        id: component.id,
        name: component.name,
        type: component.type,
        manufacturer: component.manufacturer,
        properties: {
          voltage: component.ratedThresholds?.maxVoltageV,
          current: component.ratedThresholds?.maxCurrentA,
          power: component.ratedThresholds?.maxPowerW,
          resistance: component.properties.resistance,
          capacitance: component.properties.capacitance,
          inductance: component.properties.inductance,
        },
      },
    ];

    saveArenaSessionPayload({
      ...(existing ?? { sessionName: "Arena Battle" }),
      components: updatedComponents,
    });
    setSessionPayload(loadArenaSessionPayload());
  }, []);

  const winnerName = useMemo(
    () => agents.find((agent) => agent.id === winnerId)?.name ?? null,
    [agents, winnerId],
  );

  const sessionLabel = sessionPayload?.sessionName ?? "CircuiTry3D Arena";

  return {
    agents,
    battleLog,
    currentTurnAgentId,
    environment,
    fuseResults,
    handleExitComplete,
    handleLoadCatalogComponent,
    handleReturnToWorkspace,
    highlight,
    resetBattle,
    round,
    sessionLabel,
    setEnvironment,
    status,
    transitionPhase,
    winnerName,
  };
}

export type ArenaSession = ReturnType<typeof useArenaSession>;
