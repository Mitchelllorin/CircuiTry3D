import { useState } from "react";
import "../../styles/arena.css";
import { WorkspaceModePanel } from "../builder/panels/WorkspaceModePanel";
import { ArenaOverlay } from "./ArenaOverlay";
import { ArenaScene } from "./ArenaScene";
import { useArenaSession } from "./useArenaSession";

type ArenaWorkspaceMountProps = {
  /** Exit the arena and return the workspace to build mode. */
  onClose: () => void;
};

/**
 * Renders the Component Arena directly inside the main 3D workspace.
 *
 * The battle owns the full-bleed workspace layer (free-orbit 3D), while the
 * controls live in the translucent bottom-sheet panel that floats over it —
 * the same pattern as the practice worksheet. Both surfaces are siblings here
 * and read one `useArenaSession`, so the live battle stays in sync without any
 * context plumbing, and the scene keeps running whether the panel is open or
 * collapsed to its tab.
 */
export default function ArenaWorkspaceMount({ onClose }: ArenaWorkspaceMountProps) {
  const session = useArenaSession({ onNavigateBack: onClose });
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <>
      <div className="arena-workspace-scene">
        <ArenaScene
          agents={session.agents}
          activeAgentId={session.currentTurnAgentId}
          highlight={session.highlight}
          transitionPhase={session.transitionPhase}
          onExitTransitionComplete={session.handleExitComplete}
        />
      </div>

      <WorkspaceModePanel
        title="Component Arena"
        subtitle={session.sessionLabel}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen((open) => !open)}
        className="workspace-mode-panel--arena"
      >
        <div className="arena-panel-controls">
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
            round={session.round}
            sessionLabel={session.sessionLabel}
            status={session.status}
            transitionPhase={session.transitionPhase}
            winnerName={session.winnerName}
          />
        </div>
      </WorkspaceModePanel>
    </>
  );
}
