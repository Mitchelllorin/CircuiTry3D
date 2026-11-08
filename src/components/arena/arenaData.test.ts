import { describe, expect, it } from "vitest";
import { CATALOG_COMPONENTS, builderTypeFor, findCatalogComponent } from "../../data/componentCatalog";
import { UNIFIED_COMPONENT_ACTIONS } from "../builder/componentLibrary";
import { arenaSourceFromLibrary } from "./arenaData";

/**
 * A branded part has to be reachable from the Arena, not just present in the
 * catalog file.
 *
 * The two halves live in different places — `componentLibrary` turns a catalog
 * entry into a pickable card, `arenaData` turns a card into a bench part — and
 * either one can quietly stop serving a family. When that happens nothing
 * throws: the part simply isn't in the reel, or it lands on the bench with its
 * maker and ratings dropped, and the Arena tests a generic fuse while the card
 * said Eaton. These assertions are the only place that says so out loud.
 */
describe("branded catalog parts reach the arena bench", () => {
  it("gives every modelable catalog part a pickable card", () => {
    const modelable = CATALOG_COMPONENTS.filter((part) => builderTypeFor(part));
    expect(modelable.length).toBeGreaterThan(0);

    const pickable = new Set(UNIFIED_COMPONENT_ACTIONS.map((action) => action.id));
    const missing = modelable.filter((part) => !pickable.has(part.id)).map((part) => part.id);

    expect(missing).toEqual([]);
  });

  it("lands the maker and its datasheet values on the bench, not a generic part", () => {
    // Eaton S505-5-R: 5 A, 250 VAC, sourced from Eaton's own S505 data sheet.
    const action = UNIFIED_COMPONENT_ACTIONS.find((a) => a.id === "eaton-s505-5-r");
    expect(action).toBeDefined();

    const source = arenaSourceFromLibrary(action!, 0);
    expect(source.manufacturer).toBe("Eaton");
    expect(source.type).toBe("fuse");
    expect(Object.keys(source.properties).length).toBeGreaterThan(0);

    // The bench keeps the maker's figure, so F.U.S.E. compares against 5 A.
    const entry = findCatalogComponent("eaton-s505-5-r");
    expect(entry?.properties.ratedCurrentA).toBe(5);

    // Two of one part is a real experiment: the bench id must not collide.
    const second = arenaSourceFromLibrary(action!, 1);
    expect(second.id).not.toBe(source.id);
  });
});
