import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import "../../styles/arena.css";
import { WorkspaceModePanel } from "../builder/panels/WorkspaceModePanel";
import { ArenaOverlay } from "./ArenaOverlay";
import { ArenaPanelContent } from "./ArenaPanelContent";
import { ArenaLeaderboard } from "./ArenaLeaderboard";
import { ArenaPartEditor } from "./ArenaPartEditor";
import { ArenaDashboard } from "./ArenaDashboard";
import { ArenaQuickBar } from "./ArenaQuickBar";
import { ArenaScene } from "./ArenaScene";
import {
  ARENA_ROSTER_MAX,
  arenaSourceFromLibrary,
  arenaSourcesFrom,
  buildArenaAgents,
} from "./arenaData";
import { entriesFromRun, mergeEntries, type LeaderboardEntry } from "./leaderboardModel";
import { overdriveCeiling } from "./stressTest";
import { loadFromSupply, supplyDivider } from "./supplyLoad";
import { loadArenaSessionPayload } from "./arenaStorage";
import type { ComponentAction } from "../builder/types";
import type {
  ArenaSourceComponent,
  ArenaViewProps,
  ArenaViewTransitionPhase,
} from "./types";
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

  // The bench roster is EDITABLE, and that is the whole point of holding it as
  // state rather than deriving it. It seeds from the last builder session — the
  // arena should still open showing the circuit you just built — but from then
  // on the arena's own picker owns it, so testing a different component no
  // longer means leaving for the builder and coming back.
  const [rosterSources, setRosterSources] = useState<ArenaSourceComponent[]>(
    () => arenaSourcesFrom(sessionPayload),
  );
  // A newly-exported session replaces the bench: that export IS the user
  // saying "test this circuit", so it outranks whatever they had assembled.
  useEffect(() => {
    setRosterSources(arenaSourcesFrom(sessionPayload));
  }, [sessionPayload]);

  const arenaAgents = useMemo(
    () => buildArenaAgents(rosterSources, sessionPayload),
    [rosterSources, sessionPayload],
  );

  // Which part the user has tapped — shared by the 3D scene (selection ring +
  // camera) and the panel (chip highlight + what a library pick replaces).
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleAddComponent = useCallback(
    (action: ComponentAction) => {
      setRosterSources((previous) => {
        const part = arenaSourceFromLibrary(action, previous.length);
        // With a part selected the pick is a SWAP, not an addition — which is
        // also the only way to change anything once the bench is full.
        const selectedIndex = selectedAgentId
          ? arenaAgents.findIndex((agent) => agent.id === selectedAgentId)
          : -1;
        if (selectedIndex >= 0) {
          const next = [...previous];
          next[selectedIndex] = part;
          return next;
        }
        if (previous.length >= ARENA_ROSTER_MAX) {
          return previous;
        }
        return [...previous, part];
      });
      // The agent ids are rebuilt with the roster, so the old selection would
      // dangle and leave a ring under nothing.
      setSelectedAgentId(null);
    },
    [arenaAgents, selectedAgentId],
  );

  // ── Leaderboard ───────────────────────────────────────────────────────
  // Accumulated across runs for the session, not per run: the comparison this
  // bench exists for is BETWEEN runs — change a part's rating, run it again,
  // see the two side by side. Kept in memory here; when save/load lands this
  // is the shape that gets persisted.
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const runCountRef = useRef(0);
  // Recorded on the transition INTO "complete" rather than while complete, or
  // every re-render of a finished bench would file the same run again.
  const lastRecordedStatus = useRef<string>("ready");

  /** Which part's editor is open, if any. */
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  // Resolved from the LIVE roster, so an editor left open across a roster
  // change closes itself rather than editing a part that no longer exists.
  const editingAgent = useMemo(
    () => arenaAgents.find((agent) => agent.id === editingAgentId) ?? null,
    [arenaAgents, editingAgentId],
  );

  /**
   * Write edited values back into the ROSTER, not into the live agent.
   *
   * `buildArenaAgents` then rebuilds the part from its properties — deriving
   * metrics and re-reading ratings through F.U.S.E. exactly as it does for a
   * part picked from the library. An edited part is therefore the same kind of
   * object as a fresh one, and `useArenaBattle` re-arms the bench off the new
   * roster identity, so the change takes effect on the next run rather than
   * half-applying to the current one.
   */
  const handleEditProperties = useCallback(
    (agentId: string, patch: Record<string, number | null>) => {
      const index = arenaAgents.findIndex((agent) => agent.id === agentId);
      if (index < 0) {
        return;
      }
      setRosterSources((previous) =>
        previous.map((source, position) => {
          if (position !== index) {
            return source;
          }
          const properties = { ...(source.properties ?? {}) };
          for (const [key, value] of Object.entries(patch)) {
            // null clears the property — which is how you hand `current` back
            // to Ohm's law after having pinned it to a number.
            if (value === null) {
              delete properties[key];
            } else {
              properties[key] = value;
            }
          }
          return { ...source, properties };
        }),
      );
      setEditingAgentId(null);
    },
    [arenaAgents],
  );

  const handleRemoveAgent = useCallback(
    (id: string) => {
      const index = arenaAgents.findIndex((agent) => agent.id === id);
      if (index < 0) {
        return;
      }
      setRosterSources((previous) =>
        previous.length <= 1
          ? previous // a bench with nothing on it is not a bench
          : previous.filter((_, position) => position !== index),
      );
      setSelectedAgentId(null);
    },
    [arenaAgents],
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
    startFreeRun,
    freeRun,
    resetTest,
    selectScenario,
    setLoad,
  } = useArenaBattle({ initialAgents: arenaAgents });

  // ── The supply, now that the dashboard is DOM ─────────────────────────
  // These two used to live inside ArenaScene's closure, because the faders
  // were 3D objects it owned. The controls are React now, so the values are
  // too — and the maths that turns them into a load lives in one shared module
  // (supplyLoad) rather than being reimplemented on each side, which would
  // drift and leave the bench disagreeing with itself about what it is doing.
  const [voltsMultiple, setVoltsMultiple] = useState(1);
  const [seriesOhms, setSeriesOhms] = useState(0);

  const applySupply = useCallback(
    (volts: number, ohms: number) => {
      setVoltsMultiple(volts);
      setSeriesOhms(ohms);
      // The series resistance forms a divider with the parallel bank, so
      // turning it up genuinely starves the parts — the stress engine is told
      // the load that actually reaches them, not the one the fader asks for.
      setLoad(loadFromSupply(agents, volts, ohms));
    },
    [agents, setLoad],
  );

  // While a test runs the RAMP owns the load, so the volts handle is driven
  // from what the bench is actually delivering rather than from what was last
  // dropped there — it climbs with the ramp, and dragging it scrubs the ramp
  // to that point. Undoing the divider recovers the supply's own multiple,
  // which is what the fader is scaled in.
  const liveVolts = useMemo(() => {
    if (status !== "battling") {
      return voltsMultiple;
    }
    const divider = supplyDivider(agents, seriesOhms);
    return divider > 0 ? stressFactor / divider : voltsMultiple;
  }, [status, agents, seriesOhms, stressFactor, voltsMultiple]);

  // How much of the canvas the console covers, measured live, so the circuit
  // composes into the space actually left for it.
  const [dashHeight, setDashHeight] = useState(0);

  // File the run once, on the transition INTO "complete". Watching the value
  // rather than the transition would re-file the same result on every
  // subsequent render of a finished bench.
  useEffect(() => {
    if (status === lastRecordedStatus.current) {
      return;
    }
    const previous = lastRecordedStatus.current;
    lastRecordedStatus.current = status;
    if (status !== "complete" || previous === "complete") {
      return;
    }
    runCountRef.current += 1;
    setBoard((current) =>
      mergeEntries(current, entriesFromRun(agents, scenario.name, runCountRef.current)),
    );
  }, [status, agents, scenario.name]);

  const handleClearBoard = useCallback(() => {
    setBoard([]);
    runCountRef.current = 0;
  }, []);

  /** Shared by both modes, so one board holds every run on this bench. */
  const handleRunComplete = useCallback(
    (finished: typeof agents, scenarioName: string) => {
      runCountRef.current += 1;
      setBoard((current) =>
        mergeEntries(current, entriesFromRun(finished, scenarioName, runCountRef.current)),
      );
    },
    [],
  );

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
        <>
          <ArenaBenchView
            roster={arenaAgents}
            panelOpen={panelOpen}
            onTogglePanel={onTogglePanel ?? (() => undefined)}
            onNavigateBack={handleReturnToWorkspace}
            onSwitchToBattle={() => setArenaMode("battle")}
            // One selection and one roster across both arena modes, so walking
            // from the bench into a battle keeps the part you were looking at.
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAddComponent={handleAddComponent}
            onRemoveAgent={handleRemoveAgent}
            onEditAgent={setEditingAgentId}
            rosterFull={rosterSources.length >= ARENA_ROSTER_MAX}
            board={<ArenaLeaderboard entries={board} onClear={handleClearBoard} />}
            onRunComplete={handleRunComplete}
          />
          {/* The editor is owned by the arena, not by either mode, so the same
              part opens the same editor whichever bench you are standing on. */}
          {editingAgent ? (
            <ArenaPartEditor
              agent={editingAgent}
              onApply={handleEditProperties}
              onClose={() => setEditingAgentId(null)}
              disabled={status === "battling"}
            />
          ) : null}
        </>
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
          onLoadChange={setLoad}
          winnerName={winnerName}
          winnerId={winnerId}
          survivorCount={survivorCount}
          workspaceMode
          panelOpen={panelOpen}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onLongPressAgent={setEditingAgentId}
          bottomInsetPx={dashHeight}
          onExitTransitionComplete={handleExitComplete}
        />
        {editingAgent ? (
          <ArenaPartEditor
            agent={editingAgent}
            onApply={handleEditProperties}
            onClose={() => setEditingAgentId(null)}
            disabled={status === "battling"}
          />
        ) : null}
        {status === "complete" && winner ? (
          <div className="arena-result arena-result--workspace" role="status">
            <span className="arena-result__trophy" aria-hidden>
              🏆
            </span>
            {/* The verdict was the one thing a run never actually said. It
                reported "most robust" in the same weight as everything else,
                so the result of the test read like another readout. Naming the
                outcome — WINNER, or LAST TO FAIL when the bench killed them
                all — is the difference between a number and a result. */}
            {/* Always "Winner". The ramp is a DESTRUCTIVE test — it climbs into
                overdrive until the field is down — so "all failed" is the normal
                outcome, not a washout, and the part that outlasted the rest won.
                Labelling that "Last to fail" made every single run read as a
                consolation prize. The qualifier belongs in the stat line below,
                where it says what was actually achieved. */}
            <span className="arena-result__title">Winner</span>
            <span className="arena-result__name">{winner.name}</span>
            {/* Every number carries its reference. The old banner showed a bare
                "Toughness 87/100" — a score against nothing, on a slab covering
                the middle of the arena. Load multiples are what the ramp
                actually does, so that is what gets reported. */}
            <span className="arena-result__stat">
              {survivorCount > 0
                ? `survived the full ramp — ${stressFactor.toFixed(1)}× rated load`
                : `outlasted the field — held to ${(winner.failedAtLoad ?? 0).toFixed(
                    1,
                  )}× rated load`}
            </span>
            <span className="arena-result__actions">
              <button type="button" className="arena-result__btn" onClick={startTest}>
                ↻ Re-run
              </button>
              <button
                type="button"
                className="arena-result__btn arena-result__btn--ghost"
                onClick={resetTest}
              >
                Reset
              </button>
            </span>
          </div>
        ) : null}
        {/* What the next run IS — written on the arena, at the top, over sky
            nothing was using. Not in the panel below (it collapses the moment a
            run starts, so changing the part meant re-opening it over the bench)
            and no longer inside the console either, where three words were
            costing a whole band of the screen. */}
        <ArenaQuickBar
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onAddComponent={handleAddComponent}
          onRemoveAgent={handleRemoveAgent}
          onEditAgent={setEditingAgentId}
          rosterFull={rosterSources.length >= ARENA_ROSTER_MAX}
          scenario={scenario}
          onSelectScenario={selectScenario}
          status={status}
          board={<ArenaLeaderboard entries={board} onClear={handleClearBoard} />}
          extra={
            <button
              type="button"
              className={`arena-quickbar__btn${freeRun ? " is-open" : ""}`}
              onClick={freeRun ? resetTest : startFreeRun}
              aria-pressed={freeRun}
            >
              <span className="arena-quickbar__label">Mode</span>
              <span className="arena-quickbar__value">{freeRun ? "Free run" : "Ramp"}</span>
            </button>
          }
        />

        {/* The console. Fixed at the bottom, and now only what you operate a
            LIVE run with: the circuit totals, the two faders, the switch. */}
        <ArenaDashboard
          status={status}
          voltsMultiple={liveVolts}
          voltsMax={overdriveCeiling(scenario)}
          onVoltsChange={(volts) => applySupply(volts, seriesOhms)}
          seriesOhms={seriesOhms}
          onSeriesOhmsChange={(ohms) => applySupply(voltsMultiple, ohms)}
          onHeightChange={setDashHeight}
          onThrowSwitch={status === "battling" ? resetTest : startTest}
        />
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
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAddComponent={handleAddComponent}
            onRemoveAgent={handleRemoveAgent}
            onEditAgent={setEditingAgentId}
            rosterFull={rosterSources.length >= ARENA_ROSTER_MAX}
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
        onStartTest={startTest}
        onLoadChange={setLoad}
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
