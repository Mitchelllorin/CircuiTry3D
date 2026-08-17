import { COMPONENT_ACTIONS } from "./constants";
import type { ComponentAction } from "./types";
import {
  CATALOG_COMPONENTS,
  builderTypeFor,
  toWorkspaceProperties,
} from "../../data/componentCatalog";

/**
 * The one component library the whole app picks from.
 *
 * This lived inside `Builder.tsx` as a module-local const, which was fine while
 * the Builder was the only surface with a picker. It is hoisted here because
 * the Arena needs the SAME list: a part the user can build with and a part the
 * user can stress-test have to be the same part, or the two surfaces drift and
 * "add a MOSFET" means something different depending on which screen you are
 * standing on.
 *
 * Every branded real-world part becomes a first-class card alongside the
 * generic components, inheriting that type's icon and category tab and carrying
 * its preset spec values — there is one library and one layer, fully
 * filterable, not a generic list with a "Real Parts" annexe stacked under it.
 *
 * Derived from the shared catalog rather than a second hand-written list, so a
 * branded part is defined once. Families the 3D workspace cannot draw (ICs)
 * yield no `builderType` and are skipped; they used to spawn an unhandled
 * component type.
 */
export const REAL_PART_LIBRARY_ACTIONS: ComponentAction[] =
  CATALOG_COMPONENTS.flatMap((part) => {
    const builderType = builderTypeFor(part);
    if (!builderType) {
      return [];
    }
    const base = COMPONENT_ACTIONS.find((c) => c.builderType === builderType);
    const properties = toWorkspaceProperties(part);
    return [
      {
        id: part.id,
        icon: base?.icon ?? "🔩",
        label: part.name,
        action: "component" as const,
        builderType: builderType as ComponentAction["builderType"],
        // Manufacturer + datasheet spec, shown on the centered card / tooltip.
        description: `${part.manufacturer} · ${part.spec}`,
        initialProperties:
          Object.keys(properties).length > 0 ? properties : undefined,
        // Inherit the base type's metadata so the branded part filters under
        // the same category tab (Power / Passive / Semi / …) as its generic
        // sibling.
        metadata: base?.metadata ? { ...base.metadata } : undefined,
      },
    ];
  });

export const UNIFIED_COMPONENT_ACTIONS: ComponentAction[] = [
  ...COMPONENT_ACTIONS,
  ...REAL_PART_LIBRARY_ACTIONS,
];
