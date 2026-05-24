import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import "../../styles/arena.css";
import { ArenaOverlay } from "./ArenaOverlay";
import { ArenaScene } from "./ArenaScene";
import { buildArenaRoster } from "./arenaData";
import { loadArenaSessionPayload } from "./arenaStorage";
import type { ArenaViewProps, ArenaViewTransitionPhase } from "./types";
import { useArenaBattle } from "./useArenaBattle";

const ENTER_TRANSITION_MS = 1800;

export default function ArenaView({
  variant = "page",
  onNavigateBack,
  onOpenBuilder,
}: ArenaViewProps) {
  const { setWorkspaceMode } = useWorkspaceMode();
  const [sessionPayload, setSessionPayload] = useState(() => loadArenaSessionPayload());
  const [transitionPhase, setTransitionPhase] =
    useState<ArenaViewTransitionPhase>("entering");

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
    resetBattle,
  } = useArenaBattle({
    initialAgents: arenaAgents,
    autoStart: transitionPhase === "active",
  });

  const handleExitComplete = useCallback(() => {
    if (typeof onNavigateBack === "function") {
      onNavigateBack();
      return;
    }

    setWorkspaceMode("build");
  }, [onNavigateBack, setWorkspaceMode]);

  const handleReturnToWorkspace = useCallback(() => {
    if (transitionPhase === "exiting") {
      return;
    }
    setTransitionPhase("exiting");
  }, [transitionPhase]);

  const winnerName = useMemo(
    () => agents.find((agent) => agent.id === winnerId)?.name ?? null,
    [agents, winnerId],
  );

  const containerClassName = `arena-view arena-view--${variant} arena-view--${transitionPhase}`;
  const showOpenBuilderButton =
    typeof onOpenBuilder === "function" && variant !== "workspace";

  return (
    <section className={containerClassName}>
      <ArenaScene
        agents={agents}
        activeAgentId={currentTurnAgentId}
        highlight={highlight}
        transitionPhase={transitionPhase}
        onExitTransitionComplete={handleExitComplete}
      />
      <ArenaOverlay
        agents={agents}
        battleLog={battleLog}
        currentTurnAgentId={currentTurnAgentId}
        onResetBattle={resetBattle}
        onReturnToWorkspace={handleReturnToWorkspace}
        onOpenBuilder={showOpenBuilderButton ? onOpenBuilder : undefined}
        round={round}
        sessionLabel={sessionPayload?.sessionName ?? "CircuiTry3D Arena"}
        status={status}
        transitionPhase={transitionPhase}
        winnerName={winnerName}
      />
    </section>
  );
}
