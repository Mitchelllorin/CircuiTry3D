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
 * Pick a component. That is the whole job.
 *
 * It is the workspace's own `ScrollerMenu` over the workspace's own unified
 * library — the same cards, the same 3D thumbnails, the same categories, the
 * same scroll. Not a second picker: a part should be presented identically
 * wherever you meet it, and two pickers would drift.
 *
 * That was already true, and it did not matter, because the reel was hidden
 * behind a button reading "Swap Champion Resistor". Three problems in one
 * control. It gated the only thing anyone opens this for behind an extra tap.
 * Its label was a sentence where a picture belongs — you cannot know what a
 * part is from its name, which is exactly why the workspace shows thumbnails.
 * And the name in it was an invented one, so the button asked you to swap
 * something you had never heard of.
 *
 * So the reel is simply here, open, scrolling, thumbnails and all. What is on
 * the bench is a line of small text underneath it, because that is a status
 * with two small actions on it, not a panel.
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
  const selected = agents.find((agent) => agent.id === selectedAgentId) ?? null;

  return (
    <section className="arena-roster">
      {/* Says what the pick will DO, because the same reel both adds and swaps
          and the difference is entirely down to what is selected. One dim line
          above the thing it qualifies. */}
      <p className="arena-roster__hint">
        {selected
          ? `Picking a part replaces ${selected.name}`
          : full
            ? "Bench full — tap a part below to swap it"
            : `Picking a part adds it · ${agents.length}/6 on the bench`}
      </p>

      <ScrollerMenu
        components={UNIFIED_COMPONENT_ACTIONS}
        onSelect={onAddComponent}
        disabled={disabled || (full && !selected)}
        // The sheet only mounts this while it is open, so the reel is always
        // "open" from its own point of view — which is what tells it to build
        // its 3D thumbnails.
        isOpen
      />

      {/* Selection is shared with the 3D scene: tapping a name here and tapping
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
    </section>
  );
}
