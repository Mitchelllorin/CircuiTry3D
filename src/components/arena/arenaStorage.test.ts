import { beforeEach, describe, expect, it } from "vitest";
import {
  loadArenaSessionPayload,
  saveArenaSessionPayload,
} from "./arenaStorage";
import type { ArenaSessionPayload } from "./types";

/**
 * The bench is supposed to survive a reload: the Arena reads the last exported
 * session from storage on mount. That only works if what `saveArenaSessionPayload`
 * writes is what `loadArenaSessionPayload` reads, and those two disagreed — the
 * reader wants `last` to be a session id, the writer put the whole envelope
 * there. Nothing threw; the bench just came back on its fallback parts.
 */
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};

beforeEach(() => {
  store.clear();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: fakeStorage,
    sessionStorage: fakeStorage,
  };
});

const payload: ArenaSessionPayload = {
  sessionName: "Eaton S505-5-R",
  components: [
    { id: "eaton-s505-5-r", type: "fuse", name: "S505-5-R · Eaton 5 A" },
    { type: "resistor", name: "470 Ω · ¼ W", properties: { resistance: 470 } },
  ],
};

describe("arena session storage", () => {
  it("reads back exactly the session it saved", () => {
    saveArenaSessionPayload(payload);

    const loaded = loadArenaSessionPayload();
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionName).toBe("Eaton S505-5-R");
    expect(loaded?.components?.length).toBe(2);
    expect(loaded?.components?.[0]?.id).toBe("eaton-s505-5-r");
  });

  it("points `last` at a session key, not at a JSON blob", () => {
    saveArenaSessionPayload(payload);

    const marker = store.get("circuitry:arena-session:last");
    expect(marker).toBeTruthy();
    expect(marker).not.toContain("{");
    expect(store.has(`circuitry:arena-session:${marker}`)).toBe(true);
  });
});
