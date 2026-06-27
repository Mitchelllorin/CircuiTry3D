import type { ArenaSessionPayload } from "./types";

const LEGACY_IMPORT_STORAGE_KEY = "circuiTry3d.arena.import";
const SESSION_STORAGE_PREFIX = "circuitry:arena-session:";
const LAST_SESSION_KEY = `${SESSION_STORAGE_PREFIX}last`;

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
