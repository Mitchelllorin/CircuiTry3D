import {
  exportBundle,
  loadLog,
  mergeLogs,
  parseBundle,
  saveLog,
  type FuseLevel,
  type FuseRecord,
} from "../../lib/fuseRecord";

/**
 * The family record, read and moved.
 *
 * The arena writes rows into the shared log as runs finish (`fuseLog.ts`). This
 * is the other direction: reading what is in it, and getting it out as a file so
 * a second app — or a second person — can take it in.
 *
 * Nothing here owns a schema. `parseBundle`, `mergeLogs` and `saveLog` come
 * straight from the copied module, so an import behaves identically here and in
 * ThePrints3D, and a bundle is the same file whichever app wrote it. The one
 * rule that makes merging safe lives in the module as well: ids carry the app
 * that made them, so two apps' rows union rather than overwrite.
 */

/** The app this bundle is being written FROM. Recorded, never trusted on read. */
export const FUSE_HISTORY_APP = "circuitry3d";

function storageFor(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

/** Every verdict on this device, newest first. Corrupt storage reads as empty. */
export function loadFamilyLog(storage?: Storage | null): FuseRecord[] {
  return loadLog(storageFor(storage));
}

export type FamilyImportResult = {
  /** Rows this import actually added. Zero means it was all already here. */
  added: number;
  /** Rows in the bundle that were not valid records. */
  rejected: number;
  /** Size of the log after the merge. */
  total: number;
  /** Which apps the incoming rows came from, so the panel can say whose they are. */
  apps: string[];
};

/**
 * Merge a bundle into the record.
 *
 * Repeating an import is safe and says so: the return value carries how many
 * rows were actually new, so a second drop of the same file reports `added: 0`
 * rather than pretending to have doubled the history.
 */
export function importFamilyBundle(
  storage: Storage | null | undefined,
  text: string,
): FamilyImportResult {
  const store = storageFor(storage);
  const parsed = parseBundle(text);
  const before = loadLog(store);
  const merged = mergeLogs(before, parsed.records);
  saveLog(store, merged);

  const known = new Set(before.map((record) => record.id));
  const added = merged.filter((record) => !known.has(record.id)).length;
  const apps = [...new Set(parsed.records.map((record) => record.app))].sort();

  return { added, rejected: parsed.rejected, total: merged.length, apps };
}

/** The portable form, and the text a file gets. */
export function buildFamilyBundle(
  records: FuseRecord[],
  at: number = Date.now(),
): { json: string; count: number } {
  const bundle = exportBundle(records, { app: FUSE_HISTORY_APP, at });
  return { json: JSON.stringify(bundle, null, 2), count: bundle.count };
}

export function bundleFilename(at: number = Date.now()): string {
  const day = new Date(at).toISOString().slice(0, 10);
  return `fuse-log-${FUSE_HISTORY_APP}-${day}.json`;
}

/**
 * Write the record to a file the user can move.
 *
 * A download rather than a share sheet: a bundle is a document, and a document
 * the user can put in a folder, mail, or drop into another app's import is worth
 * more than one the platform decides where to send.
 */
export function downloadFamilyBundle(
  records: FuseRecord[],
): { count: number; filename: string } {
  const at = Date.now();
  const { json, count } = buildFamilyBundle(records, at);
  const filename = bundleFilename(at);

  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return { count, filename };
  }

  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking in the same tick cancels the download in some Android webviews;
  // a second is enough for the file to be handed to the downloader.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { count, filename };
}

const LEVELS: FuseLevel[] = ["safe", "stressed", "warning", "critical", "failed"];

/** How many verdicts sit at each level — the one-line summary of a history. */
export function countByLevel(records: FuseRecord[]): Record<FuseLevel, number> {
  const counts = { safe: 0, stressed: 0, warning: 0, critical: 0, failed: 0 };
  for (const record of records) {
    if (LEVELS.includes(record.level)) {
      counts[record.level] += 1;
    }
  }
  return counts;
}
