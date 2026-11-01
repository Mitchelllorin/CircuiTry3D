import type { LeaderboardEntry } from "./leaderboardModel";
import type { ArenaSessionPayload } from "./types";

const LEGACY_IMPORT_STORAGE_KEY = "circuiTry3d.arena.import";
const SESSION_STORAGE_PREFIX = "circuitry:arena-session:";
const LAST_SESSION_KEY = `${SESSION_STORAGE_PREFIX}last`;
const BOARD_KEY = "circuitry:arena-board:v1";
/** A board past this is a session, not a comparison. Oldest results fall off. */
const BOARD_MAX = 80;

type ArenaSessionEnvelope = {
  payload?: ArenaSessionPayload;
};

type LegacyImportPayload = {
  state?: {
    components?: ArenaSessionPayload["components"];
  };
  metrics?: NonNullable<ArenaSessionPayload["analysis"]>["basic"];
  label?: string;
};

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function coerceArenaPayload(
  input: ArenaSessionEnvelope | ArenaSessionPayload | LegacyImportPayload | null,
): ArenaSessionPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  if ("payload" in input && input.payload && typeof input.payload === "object") {
    return input.payload;
  }

  if ("components" in input || "analysis" in input || "sessionName" in input) {
    return input as ArenaSessionPayload;
  }

  if ("state" in input || "metrics" in input || "label" in input) {
    const legacy = input as LegacyImportPayload;
    return {
      sessionName: legacy.label ?? "Legacy Arena Import",
      components: legacy.state?.components ?? [],
      analysis: {
        basic: {
          voltage: isFiniteNumber(legacy.metrics?.voltage)
            ? legacy.metrics?.voltage
            : null,
          current: isFiniteNumber(legacy.metrics?.current)
            ? legacy.metrics?.current
            : null,
          resistance: isFiniteNumber(legacy.metrics?.resistance)
            ? legacy.metrics?.resistance
            : null,
          power: isFiniteNumber(legacy.metrics?.power)
            ? legacy.metrics?.power
            : null,
        },
      },
    };
  }

  return null;
}

function readSessionFromStorage(storage: Storage): ArenaSessionPayload | null {
  const sessionId = storage.getItem(LAST_SESSION_KEY);
  if (!sessionId) {
    return null;
  }

  const envelope = parseJson<ArenaSessionEnvelope>(
    storage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`),
  );
  return coerceArenaPayload(envelope);
}

export function loadArenaSessionPayload(): ArenaSessionPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storages: Storage[] = [];
  if (window.localStorage) {
    storages.push(window.localStorage);
  }
  if (window.sessionStorage) {
    storages.push(window.sessionStorage);
  }

  for (const storage of storages) {
    const sessionPayload = readSessionFromStorage(storage);
    if (sessionPayload) {
      return sessionPayload;
    }
  }

  for (const storage of storages) {
    const fallbackPayload = coerceArenaPayload(
      parseJson<LegacyImportPayload | ArenaSessionPayload>(
        storage.getItem(LEGACY_IMPORT_STORAGE_KEY),
      ),
    );
    if (fallbackPayload) {
      return fallbackPayload;
    }
  }

  return null;
}

/**
 * The results board, and how many runs have gone into it.
 *
 * THE board is the reason the solo bench exists — change a part's rating, run
 * it again, see the two side by side — and it used to be in memory only. Walk
 * back to the builder, or let Android reclaim the tab, and every run you had
 * compared was gone; the comparison you had just built was the thing you lost.
 *
 * Stored beside the session rather than inside it: the session describes the
 * CIRCUIT, the board describes what this bench has LEARNED about it, and the
 * two have different lifetimes.
 */
export type ArenaBoardState = {
  entries: LeaderboardEntry[];
  /** Runs filed so far, so the next one is numbered correctly across launches. */
  runs: number;
};

function isBoardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<LeaderboardEntry>;
  return (
    typeof entry.key === "string" &&
    typeof entry.name === "string" &&
    typeof entry.family === "string" &&
    typeof entry.survived === "boolean" &&
    isFiniteNumber(entry.heldToLoad) &&
    isFiniteNumber(entry.peakW) &&
    isFiniteNumber(entry.ratedW) &&
    isFiniteNumber(entry.peakTempC) &&
    isFiniteNumber(entry.limitC) &&
    typeof entry.scenarioName === "string" &&
    isFiniteNumber(entry.runIndex) &&
    !!entry.partQuery
  );
}

export function loadArenaBoard(): ArenaBoardState {
  if (typeof window === "undefined") {
    return { entries: [], runs: 0 };
  }
  try {
    const parsed = parseJson<{ entries?: unknown; runs?: unknown }>(
      window.localStorage.getItem(BOARD_KEY),
    );
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: [], runs: 0 };
    }
    const entries = parsed.entries.filter(isBoardEntry).slice(0, BOARD_MAX);
    return {
      entries,
      runs: isFiniteNumber(parsed.runs) ? Math.max(0, parsed.runs) : entries.length,
    };
  } catch {
    return { entries: [], runs: 0 };
  }
}

export function saveArenaBoard(state: ArenaBoardState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({
        entries: state.entries.slice(0, BOARD_MAX),
        runs: state.runs,
      }),
    );
  } catch {
    // A full quota must never take the bench down with it: the board it could
    // not write is still on screen and still being compared.
  }
}

export function saveArenaSessionPayload(payload: ArenaSessionPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const envelope: ArenaSessionEnvelope = { payload };
    window.localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(envelope));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}
