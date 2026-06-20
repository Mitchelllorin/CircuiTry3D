import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import "../../styles/arena.css";
import { WorkspaceModePanel } from "../builder/panels/WorkspaceModePanel";
import { ArenaOverlay } from "./ArenaOverlay";
import { ArenaPanelContent } from "./ArenaPanelContent";
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
  panelOpen = true,
  onTogglePanel,
}: ArenaViewProps) {
  const { setWorkspaceMode } = useWorkspaceMode();
  const isWorkspace = variant === "workspace";
  const [sessionPayload, setSessionPayload] = useState(() => loadArenaSessionPayload());
  const [transitionPhase, setTransitionPhase] =
    useState<ArenaViewTransitionPhase>("entering");
  // Workspace variant: terminal exit sweep, distinct from the panel-driven camera.
  const [isExiting, setIsExiting] = useState(false);

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
    if (isWorkspace) {
      return;
    }
    setTransitionPhase("entering");
    const timerId = window.setTimeout(() => {
      setTransitionPhase("active");
    }, ENTER_TRANSITION_MS);

    return () => window.clearTimeout(timerId);
  }, [isWorkspace, sessionPayload]);

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
    autoStart: isWorkspace ? !isExiting : transitionPhase === "active",
  });

  const handleExitComplete = useCallback(() => {
    if (typeof onNavigateBack === "function") {
      onNavigateBack();
      return;
    }

    setWorkspaceMode("build");
  }, [onNavigateBack, setWorkspaceMode]);

  const handleReturnToWorkspace = useCallback(() => {
    if (isWorkspace) {
      setIsExiting(true);
      return;
    }
    setTransitionPhase((phase) => (phase === "exiting" ? phase : "exiting"));
  }, [isWorkspace]);

  const winnerName = useMemo(
    () => agents.find((agent) => agent.id === winnerId)?.name ?? null,
    [agents, winnerId],
  );

  const sessionLabel = sessionPayload?.sessionName ?? "CircuiTry3D Arena";

  if (isWorkspace) {
    return (
      <div className={`arena-view arena-view--workspace${isExiting ? " arena-view--exiting" : ""}`}>
        <ArenaScene
          agents={agents}
          activeAgentId={currentTurnAgentId}
          highlight={highlight}
          transitionPhase={isExiting ? "exiting" : "active"}
          workspaceMode
          panelOpen={panelOpen}
          onExitTransitionComplete={handleExitComplete}
        />
        {winnerName ? (
          <div className="arena-winner-banner arena-winner-banner--workspace" role="status">
            <p>Last agent standing</p>
            <strong>{winnerName}</strong>
          </div>
        ) : null}
        <WorkspaceModePanel
          title="Component Arena"
          subtitle={sessionLabel}
          isOpen={panelOpen}
          onToggle={onTogglePanel ?? (() => undefined)}
          className="workspace-mode-panel--arena"
        >
          <ArenaPanelContent
            agents={agents}
            battleLog={battleLog}
            currentTurnAgentId={currentTurnAgentId}
            onResetBattle={resetBattle}
            onReturnToWorkspace={handleReturnToWorkspace}
            onOpenBuilder={onOpenBuilder}
            round={round}
            status={status}
            winnerName={winnerName}
            immersive={!panelOpen}
          />
        </WorkspaceModePanel>
      </div>
    );
  }

  const containerClassName = `arena-view arena-view--${variant} arena-view--${transitionPhase}`;
  const showOpenBuilderButton = typeof onOpenBuilder === "function";

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
        sessionLabel={sessionLabel}
        status={status}
        transitionPhase={transitionPhase}
        winnerName={winnerName}
      />
    </section>
  );
}
