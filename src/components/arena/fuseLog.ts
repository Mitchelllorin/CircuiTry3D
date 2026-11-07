import {
  appendRecord,
  loadLog,
  makeRecord,
  saveLog,
  type FuseLevel,
  type FuseRecord,
} from "../../lib/fuseRecord";
import type { ArenaRunPart, ArenaRunRecord } from "./runHistory";

/**
 * The arena's end of the family record.
 *
 * The run history in this app answers "what happened on this bench". The family
 * record is the other half: the same verdict, written to the one schema every
 * app in the line writes, so a capacitor that died here can be counted beside a
 * wall that failed in ThePrints3D and an alternator that cooked in AutoMotive3D.
 *
 * Nothing about the bench changes. This is a reader on the side of it — one row
 * per part on a finished run, appended to a log that outlives the run.
 *
 * Both axes are recorded, because both are what the arena actually knows:
 *
 *   power        peak watts against the part's rated watts
 *   temperature  peak junction temperature against its junction limit
 *
 * `basis` is `model`, always. The rated figures came from the maker and the
 * datasheet; the judgement that this part is "critical" is F.U.S.E.'s, and the
 * record must not blur the two.
 */

export const ARENA_FUSE_APP = "circuitry3d";
export const ARENA_FUSE_DOMAIN = "electrical";

/**
 * Where a part sits on the family's five levels after a finished run.
 *
 * Derived from the worst of its two utilizations — like the board's "power at
 * peak" and "temp margin" columns, which are the evidence for it. A part that
 * failed is `failed` whatever the arithmetic says: it broke, and that outranks
 * any margin.
 *
 * Bands start BELOW the limit on purpose, per the family's nameplate rule: a
 * part at 0.8 of its rating is a warning, not a safe part that might be fine.
 * 0.6 is where a thermal design starts spending margin rather than holding it.
 */
export function fuseLevelForPart(part: ArenaRunPart): FuseLevel {
  if (!part.survived) return "failed";
  const powerFraction =
    part.ratedW > 0 ? part.peakW / part.ratedW : Number.POSITIVE_INFINITY;
  const tempFraction =
    part.limitC > 0 ? part.peakTempC / part.limitC : Number.POSITIVE_INFINITY;
  const worst = Math.max(powerFraction, tempFraction);
  if (worst > 1) return "critical";
  if (worst >= 0.8) return "warning";
  if (worst >= 0.6) return "stressed";
  return "safe";
}

/**
 * One part on one run, as a family record.
 *
 * The id is DERIVED from the run and the part's position, not generated, so
 * filing the same run twice is a no-op instead of two rows about one death. That
 * matters more than it looks: run filing is triggered from an effect, and an
 * effect that fires twice must not invent a second failure.
 */
export function recordFromPart(
  part: ArenaRunPart,
  run: ArenaRunRecord,
  index: number,
): FuseRecord {
  const held = part.heldToLoad.toFixed(1);
  return makeRecord({
    id: `${run.id}:p${index}`,
    app: ARENA_FUSE_APP,
    domain: ARENA_FUSE_DOMAIN,
    at: run.at,
    subject: part.name,
    family: part.family,
    level: fuseLevelForPart(part),
    failure: part.failureName,
    metrics: [
      { key: "power", rated: part.ratedW, actual: part.peakW, unit: "W" },
      {
        key: "temperature",
        rated: part.limitC,
        actual: part.peakTempC,
        unit: "°C",
      },
    ],
    basis: "model",
    note: part.survived
      ? `held ${held}× rated load`
      : `failed at ${held}× rated load`,
    runId: run.id,
  });
}

/**
 * Append a finished run's parts to the family log.
 *
 * Read-modify-write through the module's own helpers rather than writing the key
 * directly, so the cap and the newest-first ordering are the same here as in
 * every other app. Returns the resulting log for a caller that wants to show it.
 */
export function fileRunToFuseLog(
  run: ArenaRunRecord,
  storage?: Storage | null,
): FuseRecord[] {
  const store =
    storage === undefined
      ? typeof window === "undefined"
        ? null
        : window.localStorage
      : storage;

  let log = loadLog(store);
  for (const [index, part] of run.parts.entries()) {
    log = appendRecord(log, recordFromPart(part, run, index));
  }
  saveLog(store, log);
  return log;
}
