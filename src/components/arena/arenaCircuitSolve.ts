/**
 * Solve the arena bench as a real circuit.
 *
 * Until now the arena told each part what current it was carrying
 * (`agent.metrics.current × load`), which meant the parallel wiring was
 * decoration: a 100 Ω part and a 10 kΩ part on the same rails drew whatever
 * their datasheet said rather than what Ohm's law says they must. The flow
 * looked right and was wrong.
 *
 * This builds the board's ACTUAL geometry as schematic elements and hands it to
 * `solveDCCircuit` — the same MNA solver the rest of the app uses. Branch
 * currents then come out of the solve, so a low-resistance part visibly pulls
 * harder *because the solver says so*, a failed part is genuinely an open branch
 * whose neighbours are unaffected, and the dial's rheostat resistance actually
 * throttles the whole bench.
 *
 * Coordinates are the 3D board's own X/Z, so the schematic and the geometry
 * cannot drift apart — the solver's nodes are literally where the beads are.
 */

import { solveDCCircuit } from "../../sim/dcSolver";
import type { DCSolveStatus } from "../../sim/dcSolver";
import type { SchematicElement, Vec2 } from "../../schematic/types";

export type ArenaBranchInput = {
  id: string;
  /** The part's resistance in ohms. */
  ohms: number;
  /** A failed part is an open branch — no resistor is emitted for it at all. */
  open: boolean;
};

export type ArenaCircuitGeometry = {
  halfX: number;
  halfZ: number;
  batteryHalf: number;
  seats: { x: number; halfZ: number }[];
};

export type ArenaSolveResult = {
  status: DCSolveStatus;
  /** Amps per branch, aligned with the `branches` input. */
  branchAmps: number[];
  /** Total supply current — what the battery and the dial carry. */
  totalAmps: number;
  /** Equivalent resistance the supply sees, Ω (Infinity when open). */
  equivalentOhms: number;
};

const EMPTY = (count: number): ArenaSolveResult => ({
  status: "unsolved",
  branchAmps: new Array(count).fill(0),
  totalAmps: 0,
  equivalentOhms: Number.POSITIVE_INFINITY,
});

const at = (x: number, z: number): Vec2 => ({ x, z });

/**
 * How close two terminals must be to count as the same node. Small because this
 * board's coordinates are generated rather than drawn — see the note at the
 * solveDCCircuit call.
 */
const NODE_TOLERANCE = 0.05;

export function solveArenaCircuit(params: {
  geometry: ArenaCircuitGeometry;
  branches: ArenaBranchInput[];
  /** Supply voltage across the rails — what the load dial sets. */
  railVolts: number;
  /**
   * The cell's internal + wiring resistance, Ω. Inside the battery, so it has no
   * geometry. Non-zero on purpose: an ideal source with zero internal resistance
   * lets a low-resistance part draw an unbounded current, and the solver would be
   * right to say so. Real cells droop.
   */
  sourceOhms: number;
  /** An open switch is an open circuit — nothing flows anywhere. */
  switchClosed: boolean;
}): ArenaSolveResult {
  const { geometry, branches, railVolts, sourceOhms, switchClosed } = params;
  const { halfX, halfZ, batteryHalf, seats } = geometry;

  if (!switchClosed || !branches.length || !(railVolts > 0)) {
    return EMPTY(branches.length);
  }

  const elements: SchematicElement[] = [];
  const common = { rotation: 0 } as unknown as Record<string, never>;

  // ── The cell ──────────────────────────────────────────────────────────────
  // The solver's drawing convention is start = negative, end = positive. The
  // positive terminal faces the top rail (the one the switch gates); the return
  // is the bottom rail.
  elements.push({
    ...common,
    id: "arena-battery",
    kind: "battery",
    label: `${railVolts}V`,
    start: at(-halfX, batteryHalf),
    end: at(-halfX, -batteryHalf),
    orientation: "vertical",
  } as SchematicElement);

  // The cell's internal resistance, in series with its + terminal. No geometry —
  // it is inside the battery — so it lives on a short spur just off the terminal.
  const sourceEnd = -batteryHalf - 0.25;
  elements.push({
    ...common,
    id: "arena-source-r",
    kind: "resistor",
    label: `${Math.max(sourceOhms, 0.0001)}Ω`,
    start: at(-halfX, -batteryHalf),
    end: at(-halfX, sourceEnd),
    orientation: "vertical",
  } as SchematicElement);

  // Left edge, closing onto the ends of the cell.
  elements.push({
    ...common,
    id: "arena-lead-top",
    kind: "wire",
    path: [at(-halfX, sourceEnd), at(-halfX, -halfZ)],
  } as SchematicElement);
  elements.push({
    ...common,
    id: "arena-lead-bottom",
    kind: "wire",
    path: [at(-halfX, batteryHalf), at(-halfX, halfZ)],
  } as SchematicElement);

  // ── The rails ─────────────────────────────────────────────────────────────
  // Each rail is ONE polyline whose path includes every tap point, because the
  // solver makes a node out of each path point. A rail drawn as a bare
  // start→end pair would leave every branch stub dangling in mid-span with
  // nothing to connect to.
  const seatXs = seats.map((seat) => seat.x).sort((a, b) => a - b);

  // Top rail — one unbroken polyline through every tap. The switch is no longer
  // wired into it: it moved onto the supply's front panel, where it gates the
  // whole bench rather than one rail. An open switch was handled above by
  // returning a dead board, so there is nothing to model here.
  elements.push({
    ...common,
    id: "arena-rail-top",
    kind: "wire",
    path: [at(-halfX, -halfZ), ...seatXs.map((x) => at(x, -halfZ)), at(halfX, -halfZ)],
  } as SchematicElement);

  // Bottom rail — the return, one unbroken polyline through every tap. The
  // space between the rails is reserved for the competing parts.
  elements.push({
    ...common,
    id: "arena-rail-bottom",
    kind: "wire",
    path: [at(-halfX, halfZ), ...seatXs.map((x) => at(x, halfZ)), at(halfX, halfZ)],
  } as SchematicElement);

  // NOTE — the board's visible right edge is deliberately NOT modelled here.
  // On the board it reads as the far end of the rectangle, which is how every
  // schematic is drawn. Electrically a bare conductor across the two rails would
  // be a short in parallel with every part, collapsing both rails to one node and
  // giving a meaningless solve. The rails are the battery's two terminals; the
  // parts are what bridge them. Same for the load dial: it sits outside the
  // circuit as the cell's output control, so it carries no branch current and has
  // no element here — its effect arrives through `railVolts`.

  // ── The parts under test, as rungs between the rails ──────────────────────
  const branchElementIds: (string | null)[] = [];
  branches.forEach((branch, index) => {
    const seat = seats[index];
    if (!seat) {
      branchElementIds.push(null);
      return;
    }
    // Stubs from each rail in to the part's real ends, always — they are the
    // wires you can see, failed part or not.
    elements.push({
      ...common,
      id: `arena-stub-top-${index}`,
      kind: "wire",
      path: [at(seat.x, -halfZ), at(seat.x, -seat.halfZ)],
    } as SchematicElement);
    elements.push({
      ...common,
      id: `arena-stub-bottom-${index}`,
      kind: "wire",
      path: [at(seat.x, seat.halfZ), at(seat.x, halfZ)],
    } as SchematicElement);

    if (branch.open || !(branch.ohms > 0)) {
      // No resistor emitted: the branch is genuinely open in the solve, so its
      // neighbours carry on. That is the whole reason the bench is parallel.
      branchElementIds.push(null);
      return;
    }

    const elementId = `arena-part-${index}`;
    elements.push({
      ...common,
      id: elementId,
      kind: "resistor",
      label: `${branch.ohms}Ω`,
      start: at(seat.x, -seat.halfZ),
      end: at(seat.x, seat.halfZ),
      orientation: "vertical",
    } as SchematicElement);
    branchElementIds.push(elementId);
  });

  // A TIGHT tolerance matters here. The solver's default is 0.6 world units,
  // sized for hand-drawn schematics where terminals only roughly coincide. Our
  // coordinates are generated, so junctions are exact — and at 0.6 any element
  // whose two ends are closer than that gets merged into a single node and
  // silently dropped from the solve. That would short out the cell's internal
  // resistance and any part whose body is under ~0.6 long.
  const solution = solveDCCircuit(elements, { tolerance: NODE_TOLERANCE });
  if (solution.status !== "solved") {
    return { ...EMPTY(branches.length), status: solution.status };
  }

  const branchAmps = branchElementIds.map((elementId) => {
    if (!elementId) return 0;
    const solved = solution.elementCurrents.get(elementId);
    return solved ? Math.abs(solved.amps) : 0;
  });

  // Total is the sum of the branch currents by KCL — read off the solve rather
  // than re-derived, so it cannot disagree with the parts.
  const totalAmps = branchAmps.reduce((sum, amps) => sum + amps, 0);
  const equivalentOhms =
    totalAmps > 1e-9 ? railVolts / totalAmps : Number.POSITIVE_INFINITY;

  return { status: "solved", branchAmps, totalAmps, equivalentOhms };
}
