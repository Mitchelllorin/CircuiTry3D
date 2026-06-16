import "../../styles/arena.css";
import { ArenaOverlay } from "./ArenaOverlay";
import { ArenaScene } from "./ArenaScene";
import type { ArenaViewProps } from "./types";
import { useArenaSession } from "./useArenaSession";

export default function ArenaView({
  variant = "page",
  onNavigateBack,
  onOpenBuilder,
}: ArenaViewProps) {
  const session = useArenaSession({ onNavigateBack });

  const containerClassName = `arena-view arena-view--${variant} arena-view--${session.transitionPhase}`;
  const showOpenBuilderButton =
    typeof onOpenBuilder === "function" && variant !== "workspace";

  return (
    <section className={containerClassName}>
      <ArenaScene
        agents={session.agents}
        activeAgentId={session.currentTurnAgentId}
        highlight={session.highlight}
        transitionPhase={session.transitionPhase}
        onExitTransitionComplete={session.handleExitComplete}
      />
      <ArenaOverlay
        agents={session.agents}
        battleLog={session.battleLog}
        currentTurnAgentId={session.currentTurnAgentId}
        environment={session.environment}
        fuseResults={session.fuseResults}
        onEnvironmentChange={session.setEnvironment}
        onLoadCatalogComponent={session.handleLoadCatalogComponent}
        onResetBattle={session.resetBattle}
        onReturnToWorkspace={session.handleReturnToWorkspace}
        onOpenBuilder={showOpenBuilderButton ? onOpenBuilder : undefined}
        round={session.round}
        sessionLabel={session.sessionLabel}
        status={session.status}
        transitionPhase={session.transitionPhase}
        winnerName={session.winnerName}
      />
    </section>
  );
}
