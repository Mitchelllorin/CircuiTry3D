import { useEffect, useMemo, useState } from "react";
import type { ArenaBattleAgent } from "./types";

/**
 * A field the bench actually reads.
 *
 * The list is deliberately short, and the rule for being on it is strict: the
 * property must be one `deriveMetrics` or `deriveRatings` in `arenaData.ts`
 * genuinely consumes. Capacitance is the instructive omission — the arena
 * stores it, but nothing in the stress path looks at it, so a capacitance box
 * would be a control that changes a number on screen and nothing about the
 * test. A dial that isn't wired to anything is worse than no dial.
 *
 *   key    the property name written back (must match arenaData's readNumeric)
 *   group  "operating" = what the part is asked to do
 *          "rating"    = what it can take, i.e. what F.U.S.E. tests against
 */
type EditableField = {
  key: string;
  label: string;
  unit: string;
  group: "operating" | "rating";
  min: number;
  max: number;
  step: number;
  hint?: string;
};

const FIELDS: EditableField[] = [
  {
    key: "voltage",
    label: "Voltage across it",
    unit: "V",
    group: "operating",
    min: 0.1,
    max: 600,
    step: 0.1,
  },
  {
    key: "resistance",
    label: "Resistance",
    unit: "Ω",
    group: "operating",
    min: 0.01,
    max: 10_000_000,
    step: 1,
    hint: "Also sets the starting current, via I = E / R.",
  },
  {
    key: "current",
    label: "Current through it",
    unit: "A",
    group: "operating",
    min: 0.0001,
    max: 100,
    step: 0.001,
    hint: "Leave blank to let Ohm's law derive it from E and R.",
  },
  {
    key: "powerRating",
    label: "Rated power",
    unit: "W",
    group: "rating",
    min: 0.01,
    max: 1000,
    step: 0.01,
  },
  {
    key: "maxCurrent",
    label: "Max current",
    unit: "A",
    group: "rating",
    min: 0.001,
    max: 500,
    step: 0.001,
  },
  {
    key: "maxVoltage",
    label: "Max voltage",
    unit: "V",
    group: "rating",
    min: 0.1,
    max: 2000,
    step: 0.1,
  },
  {
    key: "thermalResistance",
    label: "Thermal resistance",
    unit: "°C/W",
    group: "rating",
    min: 0.1,
    max: 1000,
    step: 1,
    hint: "How hot it gets per watt dissipated. Higher = cooks faster.",
  },
];

type ArenaPartEditorProps = {
  agent: ArenaBattleAgent;
  onApply: (agentId: string, patch: Record<string, number | null>) => void;
  onClose: () => void;
  /** A test in progress must not have its part swapped out underneath it. */
  disabled: boolean;
};

function readNumber(properties: Record<string, unknown>, key: string): string {
  const value = properties[key];
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

/**
 * Edit the part under test.
 *
 * The arena could add a component and destroy it, but not CHANGE it — so the
 * one question a stress bench exists to answer ("would a 0.5 W part have
 * survived that?") could not be asked without going back to the builder,
 * rebuilding the circuit and re-exporting. Ratings are the interesting half:
 * they are exactly what F.U.S.E. tests against, so editing them is editing the
 * pass/fail line itself.
 *
 * Values are written back into the roster's own `properties`, which means the
 * agent is REBUILT through `buildArenaAgents` — the same path a part from the
 * library takes. Nothing here reaches into a live agent and mutates it, so an
 * edited part and a freshly-added part are the same kind of thing.
 */
export function ArenaPartEditor({
  agent,
  onApply,
  onClose,
  disabled,
}: ArenaPartEditorProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Re-seed whenever a different part is opened, so the form always shows the
  // part named in its own header.
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of FIELDS) {
      next[field.key] = readNumber(agent.properties, field.key);
    }
    setDraft(next);
  }, [agent.id, agent.properties]);

  const errors = useMemo(() => {
    const found: Record<string, string> = {};
    for (const field of FIELDS) {
      const raw = (draft[field.key] ?? "").trim();
      if (raw === "") continue; // blank means "unset", which is legitimate
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        found[field.key] = "Not a number";
      } else if (value < field.min) {
        found[field.key] = `Min ${field.min}${field.unit}`;
      } else if (value > field.max) {
        found[field.key] = `Max ${field.max}${field.unit}`;
      }
    }
    return found;
  }, [draft]);

  const hasErrors = Object.keys(errors).length > 0;

  const apply = () => {
    if (hasErrors) return;
    const patch: Record<string, number | null> = {};
    for (const field of FIELDS) {
      const raw = (draft[field.key] ?? "").trim();
      // null means "remove this property" — that is how you hand `current`
      // back to Ohm's law after having pinned it.
      patch[field.key] = raw === "" ? null : Number(raw);
    }
    onApply(agent.id, patch);
    onClose();
  };

  const renderField = (field: EditableField) => (
    <label key={field.key} className="arena-editor__field">
      <span className="arena-editor__field-label">
        {field.label} <span className="arena-editor__unit">({field.unit})</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={field.min}
        max={field.max}
        step={field.step}
        value={draft[field.key] ?? ""}
        disabled={disabled}
        onChange={(event) =>
          setDraft((previous) => ({
            ...previous,
            [field.key]: event.target.value,
          }))
        }
        className={errors[field.key] ? "has-error" : ""}
        aria-invalid={errors[field.key] ? "true" : "false"}
      />
      {errors[field.key] ? (
        <span className="arena-editor__error">{errors[field.key]}</span>
      ) : field.hint ? (
        <span className="arena-editor__hint">{field.hint}</span>
      ) : null}
    </label>
  );

  return (
    <div className="arena-editor" role="dialog" aria-label={`Edit ${agent.name}`}>
      <header className="arena-editor__head">
        <h3 className="arena-editor__title">{agent.name}</h3>
        <button
          type="button"
          className="arena-editor__close"
          onClick={onClose}
          aria-label="Close editor"
        >
          ×
        </button>
      </header>

      <p className="arena-editor__group-label">Operating point</p>
      {FIELDS.filter((f) => f.group === "operating").map(renderField)}

      <p className="arena-editor__group-label">
        Ratings <span className="arena-editor__group-note">— what F.U.S.E. tests against</span>
      </p>
      {FIELDS.filter((f) => f.group === "rating").map(renderField)}

      {/* The junction limit is NOT here on purpose: it comes from F.U.S.E.'s own
          per-family physical spec, not from the part's properties, so offering
          a box for it would be offering a setting the engine ignores. */}
      <p className="arena-editor__note">
        Junction limit {Math.round(agent.ratings.junctionLimitC)}°C comes from
        F.U.S.E.'s profile for this family and is not editable here.
      </p>

      <div className="arena-editor__actions">
        <button
          type="button"
          className="arena-button arena-button--secondary"
          onClick={apply}
          disabled={disabled || hasErrors}
        >
          Apply &amp; re-arm
        </button>
        <button
          type="button"
          className="arena-button arena-button--ghost"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
