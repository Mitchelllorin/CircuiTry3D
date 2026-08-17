import { useState, type ReactNode } from "react";
import { ArenaScenarioSelect } from "./ArenaInstrumentation";
import { ArenaRosterPicker } from "./ArenaRosterPicker";
import type { ArenaScenario } from "./scenarios";
import type { ComponentAction } from "../builder/types";
import type { ArenaBattleAgent, ArenaBattleStatus } from "./types";

type ArenaQuickBarProps = {
  agents: ArenaBattleAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAddComponent: (action: ComponentAction) => void;
  onRemoveAgent: (id: string) => void;
  onEditAgent: (id: string) => void;
  rosterFull: boolean;
  scenario: ArenaScenario;
  onSelectScenario: (id: string) => void;
  status: ArenaBattleStatus;
  /** Rendered inside the third sheet — see the Results button. */
  board: ReactNode;
  /**
   * One more control on the end of the strip — battle mode puts Ramp/Free run
   * here. It belongs with these and not on the console: like Parts and
   * Conditions it says what the next run IS, where the console's faders and
   * switch are what you do to a run once it is going.
   */
  extra?: ReactNode;
};

/**
 * What is on the bench, in what conditions, and where the results went —
 * written straight onto the arena as text, at the top of the view.
 *
 * It has moved twice and each move was for the same reason: this reads what
 * the next run WILL be, so it wants to be visible without costing anything.
 * It began in the params panel, which collapses the moment a run starts, so
 * swapping a part meant re-opening the panel over the bench, changing it, and
 * closing it again — every time. It then became a row of chips inside the
 * bottom console, which put it in reach but charged a whole band of the screen
 * for three words: pill borders, blurred backgrounds and padding, stacked
 * under the faders, in the one place where height is fought over.
 *
 * Now it is a HUD, in the sky above the circuit: no containers, no borders, no
 * backgrounds — dim label, bright value, a text-shadow to hold it against the
 * scene, the same treatment as the nameplates floating on the parts. It costs
 * space nothing was using. Tapping one still drops a short translucent sheet
 * beneath it, and those sheets mount the same `ArenaRosterPicker` and
 * `ArenaScenarioSelect` the panel uses — one component picker in the app.
 */
export function ArenaQuickBar({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAddComponent,
  onRemoveAgent,
  onEditAgent,
  rosterFull,
  scenario,
  onSelectScenario,
  status,
  board,
  extra,
}: ArenaQuickBarProps) {
  const [sheet, setSheet] = useState<"parts" | "scenario" | "board" | null>(null);
  const running = status === "battling";
  const selected = agents.find((agent) => agent.id === selectedAgentId) ?? null;

  // A running bench is not re-stocked mid-test, and a picker open over a run
  // hides the thing you started it to watch. The BOARD is exempt: reading last
  // run's results changes nothing, and comparing against them while the next
  // run plays out is the point of having them.
  const openSheet = running && sheet !== "board" ? null : sheet;

  return (
    <div className="arena-quickbar">
      {/* The strip comes FIRST in the DOM now, and the sheet after it, because
          the whole thing hangs from the top of the arena and a sheet opens
          downward from what you tapped. */}
      <div className="arena-quickbar__bar">
        <button
          type="button"
          className={`arena-quickbar__btn${openSheet === "parts" ? " is-open" : ""}`}
          onClick={() => setSheet(sheet === "parts" ? null : "parts")}
          disabled={running}
          aria-expanded={openSheet === "parts"}
        >
          <span className="arena-quickbar__label">Parts</span>
          <span className="arena-quickbar__value">
            {selected ? selected.name : `${agents.length} on bench`}
          </span>
        </button>
        <button
          type="button"
          className={`arena-quickbar__btn${openSheet === "scenario" ? " is-open" : ""}`}
          onClick={() => setSheet(sheet === "scenario" ? null : "scenario")}
          disabled={running}
          aria-expanded={openSheet === "scenario"}
        >
          <span className="arena-quickbar__label">Conditions</span>
          <span className="arena-quickbar__value">
            {scenario.icon} {scenario.name}
          </span>
        </button>
        {/* Results stays enabled DURING a run, unlike the other two: reading
            what happened last time is not a change to the bench, and it is
            exactly what you want while the next run is going. */}
        <button
          type="button"
          className={`arena-quickbar__btn${openSheet === "board" ? " is-open" : ""}`}
          onClick={() => setSheet(sheet === "board" ? null : "board")}
          aria-expanded={openSheet === "board"}
        >
          <span className="arena-quickbar__label">Results</span>
          <span className="arena-quickbar__value">Board</span>
        </button>
        {extra}
      </div>

      {openSheet === "parts" ? (
        <div className="arena-quickbar__sheet">
          <ArenaRosterPicker
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
            onAddComponent={onAddComponent}
            onRemoveAgent={onRemoveAgent}
            onEditAgent={onEditAgent}
            disabled={running}
            full={rosterFull}
          />
        </div>
      ) : null}

      {openSheet === "scenario" ? (
        <div className="arena-quickbar__sheet">
          <ArenaScenarioSelect
            scenario={scenario}
            onSelect={(id) => {
              onSelectScenario(id);
              setSheet(null);
            }}
            disabled={running}
          />
        </div>
      ) : null}

      {openSheet === "board" ? (
        <div className="arena-quickbar__sheet">{board}</div>
      ) : null}
    </div>
  );
}
