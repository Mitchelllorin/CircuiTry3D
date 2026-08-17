import { useState } from "react";
import { ScrollerMenu } from "../builder/ScrollerMenu";
import { UNIFIED_COMPONENT_ACTIONS } from "../builder/componentLibrary";
import type { ComponentAction } from "../builder/types";
import "../../styles/scroller-menu.css";
import type { ArenaBattleAgent } from "./types";

type ArenaRosterPickerProps = {
  agents: ArenaBattleAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAddComponent: (action: ComponentAction) => void;
  onRemoveAgent: (id: string) => void;
  /** Open the value/ratings editor for a part. */
  onEditAgent: (id: string) => void;
  /** A running bench cannot be re-stocked mid-test. */
  disabled: boolean;
  /** True once the bench holds as many parts as the board has rungs. */
  full: boolean;
};

/**
 * What is on the bench, and how to change it.
 *
 * The arena used to have no say in this at all: its roster was derived from
 * whatever circuit the builder last had open, so "test a different component"
 * meant leaving the arena, building a circuit around that part, and coming
 * back. The parts were also the only things on the 3D board that could not be
 * tapped — the switch and the faders both took taps, so the board taught you
 * that things on it are touchable and then ignored you on the components.
 *
 * This is deliberately NOT a new picker. It mounts the workspace's own
 * `ScrollerMenu` over the workspace's own unified library, so a part is
 * presented, described, categorised and searched identically on both surfaces.
 * Building a second picker would have meant two answers to "where do
 * components come from", and they would have drifted.
 */
export function ArenaRosterPicker({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAddComponent,
  onRemoveAgent,
  onEditAgent,
  disabled,
  full,
}: ArenaRosterPickerProps) {
  // The reel loads 3D thumbnails while open, so it stays shut until asked for
  // rather than rendering a component library nobody opened.
  const [libraryOpen, setLibraryOpen] = useState(false);
  const selected = agents.find((agent) => agent.id === selectedAgentId) ?? null;

  return (
    <section className="arena-roster">
      <header className="arena-roster__head">
        <h3 className="arena-roster__title">On the bench</h3>
        <span className="arena-roster__count">
          {agents.length}/6 parts
        </span>
      </header>

      {/* Selection is shared with the 3D scene: tapping a chip here and tapping
          the part on the board are the same act, and both put the camera on it. */}
      <div className="arena-roster__chips">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <span
              key={agent.id}
              className={`arena-roster__chip${isSelected ? " arena-roster__chip--selected" : ""}`}
            >
              <button
                type="button"
                className="arena-roster__chip-pick"
                onClick={() => onSelectAgent(isSelected ? null : agent.id)}
                aria-pressed={isSelected}
              >
                {agent.name}
              </button>
              {/* Edit sits between select and remove because that is the order
                  you use them in, and it is a separate target from both — on a
                  phone, "look at this part", "change this part" and "delete
                  this part" must never share a tap. */}
              <button
                type="button"
                className="arena-roster__chip-edit"
                onClick={() => onEditAgent(agent.id)}
                disabled={disabled}
                aria-label={`Edit ${agent.name}'s values and ratings`}
                title={`Edit ${agent.name}`}
              >
                ✎
              </button>
              <button
                type="button"
                className="arena-roster__chip-drop"
                onClick={() => onRemoveAgent(agent.id)}
                disabled={disabled || agents.length <= 1}
                aria-label={`Remove ${agent.name} from the bench`}
                title={
                  agents.length <= 1
                    ? "The bench needs at least one part"
                    : `Remove ${agent.name}`
                }
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="arena-button arena-button--secondary arena-roster__toggle"
        onClick={() => setLibraryOpen((open) => !open)}
        disabled={disabled}
      >
        {libraryOpen ? "Close library" : selected ? `Swap ${selected.name}` : "Add a part"}
      </button>

      {libraryOpen ? (
        <>
          {/* Says what the pick will DO, because the same reel both adds and
              swaps and the difference is entirely down to what is selected. */}
          <p className="arena-roster__hint">
            {selected
              ? `Choosing a part replaces ${selected.name}.`
              : full
                ? "The bench is full — select a part to swap it."
                : "Choosing a part adds it to the bench."}
          </p>
          <ScrollerMenu
            components={UNIFIED_COMPONENT_ACTIONS}
            onSelect={onAddComponent}
            disabled={disabled || (full && !selected)}
            isOpen={libraryOpen}
          />
        </>
      ) : null}
    </section>
  );
}
