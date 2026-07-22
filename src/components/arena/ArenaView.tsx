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
import ArenaBenchView from "./ArenaBenchView";

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
  // Arena entry: solo bench first ("playable datasheet"), then head-to-head battle.
  const [arenaMode, setArenaMode] = useState<"bench" | "battle">("bench");

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
    log,
    status,
    winnerId,
    stressFactor,
    progress,
    highlight,
    mostStressedId,
    scenario,
    summary,
    startTest,
    resetTest,
    selectScenario,
  } = useArenaBattle({ initialAgents: arenaAgents });

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

  // Starting the test from the params panel also collapses the panel, which
  // triggers the cinematic camera sweep down into the arena — so hitting BATTLE
  // drops you straight into the 3D scene to watch the run unfold.
  const handleStartTestFromPanel = useCallback(() => {
    startTest();
    if (panelOpen && typeof onTogglePanel === "function") {
      onTogglePanel();
    }
  }, [startTest, panelOpen, onTogglePanel]);

  const winner = useMemo(
    () => agents.find((agent) => agent.id === winnerId) ?? null,
    [agents, winnerId],
  );
  const winnerName = winner?.name ?? null;
  const survivorCount = useMemo(
    () => agents.filter((agent) => agent.phase !== "failed").length,
    [agents],
  );

  const sessionLabel = sessionPayload?.sessionName ?? "CircuiTry3D Arena";

  if (isWorkspace) {
    if (arenaMode === "bench") {
      return (
        <ArenaBenchView
          roster={arenaAgents}
          panelOpen={panelOpen}
          onTogglePanel={onTogglePanel ?? (() => undefined)}
          onNavigateBack={handleReturnToWorkspace}
          onSwitchToBattle={() => setArenaMode("battle")}
        />
      );
    }
    return (
      <div className={`arena-view arena-view--workspace${isExiting ? " arena-view--exiting" : ""}`}>
        <ArenaScene
          agents={agents}
          activeAgentId={mostStressedId}
          highlight={highlight}
          transitionPhase={isExiting ? "exiting" : "active"}
          status={status}
          stressFactor={stressFactor}
          stressMax={scenario.stressMax}
          progress={progress}
          onStartTest={startTest}
          winnerName={winnerName}
          survivorCount={survivorCount}
          workspaceMode
          panelOpen={panelOpen}
          onExitTransitionComplete={handleExitComplete}
        />
        {status === "complete" && winner ? (
          <div className="arena-winner-banner arena-winner-banner--workspace" role="status">
            <span className="arena-winner-banner__trophy" aria-hidden>
              🏆
            </span>
            <div>
              <p>
                {scenario.icon} {scenario.name} ·{" "}
                {survivorCount > 0 ? "Most robust under load" : "Last to fail"}
              </p>
              <strong>{winner.name}</strong>
              <span className="arena-winner-banner__score">
                Toughness {winner.score.toFixed(0)}/100 ·{" "}
                {survivorCount > 0
                  ? `${survivorCount}/${agents.length} survived`
                  : `held ${(winner.failedAtLoad ?? 0).toFixed(1)}×`}
              </span>
            </div>
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
            log={log}
            mostStressedId={mostStressedId}
            status={status}
            stressFactor={stressFactor}
            progress={progress}
            winnerName={winnerName}
            survivorCount={survivorCount}
            scenario={scenario}
            summary={summary}
            onSelectScenario={selectScenario}
            onStartTest={handleStartTestFromPanel}
            onResetTest={resetTest}
            onReturnToWorkspace={handleReturnToWorkspace}
            onOpenBuilder={onOpenBuilder}
            onSwitchToBench={() => setArenaMode("bench")}
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
        activeAgentId={mostStressedId}
        highlight={highlight}
        transitionPhase={transitionPhase}
        status={status}
        stressFactor={stressFactor}
        stressMax={scenario.stressMax}
        onExitTransitionComplete={handleExitComplete}
      />
      <ArenaOverlay
        agents={agents}
        log={log}
        mostStressedId={mostStressedId}
        status={status}
        stressFactor={stressFactor}
        progress={progress}
        sessionLabel={sessionLabel}
        transitionPhase={transitionPhase}
        winnerName={winnerName}
        survivorCount={survivorCount}
        scenario={scenario}
        summary={summary}
        onSelectScenario={selectScenario}
        onStartTest={startTest}
        onResetTest={resetTest}
        onReturnToWorkspace={handleReturnToWorkspace}
        onOpenBuilder={showOpenBuilderButton ? onOpenBuilder : undefined}
      />
    </section>
  );
}
