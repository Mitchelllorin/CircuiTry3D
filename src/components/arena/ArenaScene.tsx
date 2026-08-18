import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SURFACE_FINISHES, getComponent3D } from "../circuit/Component3DLibrary";
import { useAppSettings } from "../../context/AppSettingsContext";
import { CurrentFlowAnimationSystem } from "../../schematic/currentFlowAnimation";
import { LightningFlowSystem } from "../../schematic/lightningFlow";
import { solveArenaCircuit } from "./arenaCircuitSolve";
import {
  blowoutFor,
  createBlowoutKit,
  createBlowoutTextures,
  type BlowoutKit,
  type BlowoutTextures,
} from "./failureFx";
import { isMobile } from "../../utils/mobilePerformance";
import type { Vec2 } from "../../schematic/types";
import { STRESS_MAX } from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaBattleStatus,
  ArenaViewTransitionPhase,
} from "./types";

type ArenaSceneProps = {
  agents: ArenaBattleAgent[];
  /** The component currently under the most stress (subtle ring highlight). */
  activeAgentId: string | null;
  highlight: ArenaBattleHighlight | null;
  transitionPhase: ArenaViewTransitionPhase;
  /** Bench status — drives the global heat tint of the arena ring. */
  status?: ArenaBattleStatus;
  /** Current load multiple (1 → stressMax) — drives global heat. */
  stressFactor?: number;
  /** Peak of the active scenario's load ramp (× nominal). */
  stressMax?: number;
  /** Test progress 0→1 — feeds the in-scene load-ramp gauge. */
  progress?: number;
  /** Start/re-run the stress test (the in-scene BATTLE button). */
  onStartTest?: () => void;
  /** Set the load — driven by dragging the in-scene load dial. */
  onLoadChange?: (factor: number) => void;
  /** Name of the most-robust component, shown in the verdict. */
  winnerName?: string | null;
  /**
   * Which part won. Distinct from `winnerName` because the scene needs to
   * FIND it, not label it: the end of a run is the one moment the bench has a
   * subject chosen for it, and without an id the camera has nothing to end on.
   */
  winnerId?: string | null;
  /** How many components survived — shown in the verdict. */
  survivorCount?: number;
  onExitTransitionComplete: () => void;
  /**
   * When true the camera follows the workspace flow: it holds a framed preview
   * pose while the params panel is open, then cinematically sweeps into the
   * interactive pose (full orbit + zoom) once the panel collapses.
   */
  workspaceMode?: boolean;
  /** Workspace mode only: whether the params panel is currently expanded. */
  panelOpen?: boolean;
  /** Solo bench mode — the in-scene control reads "TEST" instead of "BATTLE". */
  solo?: boolean;
  /**
   * The part the user has tapped, if any — same model as selecting a component
   * in the workspace. Selection is lifted out of the scene because it is not a
   * rendering detail: the panel shows what is selected, and swapping a part
   * acts on it.
   */
  selectedAgentId?: string | null;
  /**
   * How many pixels at the BOTTOM of the canvas are covered by the fixed
   * console. The scene composes the circuit into the space above it — see
   * applyViewFrame.
   */
  bottomInsetPx?: number;
  /** Tapping a part reports it here; tapping empty board reports null. */
  onSelectAgent?: (id: string | null) => void;
  /**
   * Long-pressing a part — the workspace's own gesture for "edit this
   * component", same 500ms, so the muscle memory carries across.
   */
  onLongPressAgent?: (id: string) => void;
};

const PHASE_LABEL: Record<string, string> = {
  nominal: "OK",
  stressed: "STRESS",
  critical: "CRIT",
  failed: "FAILED",
};

function fmtAmps(amps: number): string {
  if (!Number.isFinite(amps)) return "—";
  return amps >= 1 ? `${amps.toFixed(2)}A` : `${Math.round(amps * 1000)}mA`;
}

function fmtVolts(volts: number): string {
  if (!Number.isFinite(volts)) return "—";
  return volts >= 1 ? `${volts.toFixed(1)}V` : `${Math.round(volts * 1000)}mV`;
}

function fmtOhms(ohms: number): string {
  if (!Number.isFinite(ohms)) return "—";
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(1)}MΩ`;
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(1)}kΩ`;
  return `${Math.round(ohms)}Ω`;
}

function fmtWatts(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  if (watts >= 1) return `${watts.toFixed(2)}W`;
  return `${Math.round(watts * 1000)}mW`;
}

/** Duration (ms) of the violent flash-punch when a component fails. */
const FAIL_POP_MS = 900;

/**
 * How each family of component actually dies.
 *
 * F.U.S.E. already names the characteristic failure per family (see
 * STRESS_SIGNATURE_BY_FAMILY in arenaData.ts) — this is what that failure LOOKS
 * like, so a vented electrolytic never reads like a burnt-out LED.
 *
 *   motion  how the body behaves as it lets go
 *   popMs   how long the letting-go moment lasts
 *   flash   peak emissive at the moment it fails
 *   ember   residual glow once it has settled (0 = stone cold)
 *   hot     afterglow is molten orange rather than charcoal
 *   char    how far the body blackens (0 = unmarked, 1 = carbonised)
 *   smoke   the plume it gives off, if it gives off one at all
 */
type FailMotion = "burst" | "vent" | "smoulder" | "flashOut" | "arc" | "sag";

/**
 * A failure plume. Deliberately optional: an LED or a fuse produces NO smoke,
 * and that absence is as diagnostic as a resistor's black cloud — you can tell
 * a cooked resistor from a blown lamp across a workshop by the smoke alone.
 *
 *   rate      puffs per second at the peak of the event
 *   forMs     how long it keeps smoking after it fails (0 = only during the pop)
 *   rise      how fast a puff climbs (units/sec)
 *   spread    lateral drift + how much a puff swells as it disperses
 *   tint      smoke colour — resistor carbon black vs electrolyte white
 *   opacity   peak opacity of a single puff
 */
type FailSmoke = {
  rate: number;
  forMs: number;
  rise: number;
  spread: number;
  tint: string;
  opacity: number;
};

type FailSignature = {
  motion: FailMotion;
  popMs: number;
  flash: number;
  ember: number;
  hot?: boolean;
  char?: number;
  smoke?: FailSmoke;
};

const FAIL_SIGNATURE_BY_FAMILY: Record<string, FailSignature> = {
  // Blackens, blisters and cracks open. Smokes, but nothing flies apart.
  // An overloaded carbon/metal-film resistor doesn't explode — it cooks. The
  // body carbonises almost fully and gives off a thin, dark, lazy plume that
  // outlasts the failure itself by several seconds.
  resistor: {
    motion: "smoulder",
    popMs: 1400,
    flash: 2.2,
    ember: 0.5,
    char: 0.92,
    smoke: {
      rate: 26,
      forMs: 6500,
      rise: 0.75,
      spread: 0.46,
      // Sprites are unlit, so the tint IS the final pixel colour. Carbon smoke
      // is dark in daylight but the arena is a dark dome — a near-black plume
      // (this was #2b2926) is literally invisible against it. Real smoke reads
      // PALE because it scatters the light falling on it, so this is the lit
      // appearance of a sooty plume, not a lightened cartoon of it.
      tint: "#b0a79d",
      opacity: 0.72,
    },
  },
  // Electrolytics bulge, split the scored top and vent hot electrolyte.
  // Scorched around the vent rather than blackened through.
  capacitor: {
    motion: "vent",
    popMs: 1100,
    flash: 3.4,
    ember: 0.35,
    hot: true,
    char: 0.5,
    // Vented electrolyte flashes off as a WHITE cloud — the one smoke on this
    // bench that is genuinely pale rather than pale-because-it-is-lit, and it
    // leaves fast and straight up out of the split vent.
    smoke: {
      rate: 40,
      forMs: 2600,
      rise: 1.5,
      spread: 0.3,
      tint: "#e8e4dc",
      opacity: 0.66,
    },
  },
  // Junction opens: one over-bright flash, then dark. Package stays intact,
  // but the epoxy clouds and darkens over the dead die.
  led: { motion: "flashOut", popMs: 260, flash: 4.2, ember: 0, char: 0.38 },
  diode: {
    motion: "burst",
    popMs: 420,
    flash: 3.2,
    ember: 0.1,
    char: 0.62,
    smoke: {
      rate: 16,
      forMs: 1800,
      rise: 0.9,
      spread: 0.34,
      tint: "#a49a90",
      opacity: 0.6,
    },
  },
  // Insulation cooks off the windings — slow, heavy smoke and a sagging coil.
  inductor: {
    motion: "smoulder",
    popMs: 1800,
    flash: 1.8,
    ember: 0.6,
    hot: true,
    char: 0.72,
  },
  // Swells and vents hot gas, then stays dangerously hot long afterwards.
  battery: {
    motion: "vent",
    popMs: 2000,
    flash: 2.6,
    ember: 0.85,
    hot: true,
    char: 0.45,
    // The heaviest, longest-lasting cloud on the bench, because a cell that
    // lets go keeps reacting long after the bang.
    smoke: {
      rate: 34,
      forMs: 9000,
      rise: 1.1,
      spread: 0.6,
      tint: "#c9c2b6",
      opacity: 0.74,
    },
  },
  // Doing exactly its job: the element melts quietly, the glass darkens with
  // vaporised metal — a blown fuse is sooted on the inside.
  fuse: { motion: "flashOut", popMs: 340, flash: 2.8, ember: 0.05, char: 0.66 },
  // Filament flashes white and opens; the envelope blackens where it deposited.
  lamp: { motion: "flashOut", popMs: 300, flash: 4.5, ember: 0, char: 0.44 },
  // Silicon lets go hard enough to split the package — magic smoke escapes.
  // The smoke is the whole folklore of this failure, so it had better be there:
  // a single dense jet straight out of the hole in the top of the package.
  mosfet: {
    motion: "burst",
    popMs: 500,
    flash: 3.8,
    ember: 0.2,
    char: 0.85,
    smoke: {
      rate: 30,
      forMs: 3200,
      rise: 1.35,
      spread: 0.28,
      tint: "#9c948a",
      opacity: 0.78,
    },
  },
  bjt: {
    motion: "burst",
    popMs: 500,
    flash: 3.6,
    ember: 0.2,
    char: 0.85,
    smoke: {
      rate: 28,
      forMs: 3000,
      rise: 1.3,
      spread: 0.28,
      tint: "#9c948a",
      opacity: 0.76,
    },
  },
  // Contacts arc: a stuttering train of sparks, the body itself undamaged —
  // so it must NOT blacken. Only the contacts are pitted, and you can't see them.
  switch: { motion: "arc", popMs: 1500, flash: 3, ember: 0, char: 0.08 },
  relay: { motion: "arc", popMs: 1200, flash: 2.4, ember: 0.15, char: 0.15 },
  generic: {
    motion: "smoulder",
    popMs: FAIL_POP_MS,
    flash: 2.4,
    ember: 0.3,
    char: 0.6,
    smoke: {
      rate: 20,
      forMs: 4200,
      rise: 0.85,
      spread: 0.42,
      tint: "#aaa298",
      opacity: 0.68,
    },
  },
};

/**
 * The family decides HOW a part dies; the F.U.S.E. failure mode then modulates
 * it — something that melted stays molten and slumps, something that blew out
 * goes faster and harder than it otherwise would.
 */
function failSignatureFor(family: string, visual: string | null): FailSignature {
  const base = FAIL_SIGNATURE_BY_FAMILY[family] ?? FAIL_SIGNATURE_BY_FAMILY.generic;
  if (visual === "melt") {
    return {
      ...base,
      motion: base.motion === "burst" ? "sag" : base.motion,
      ember: Math.max(base.ember, 0.7),
      hot: true,
    };
  }
  if (visual === "blowout" && base.motion === "smoulder") {
    return { ...base, motion: "burst", popMs: Math.min(base.popMs, 600) };
  }
  return base;
}

type OrbitControlsInstance = {
  enabled: boolean;
  enablePan: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  target: import("three").Vector3;
  update: () => void;
  dispose: () => void;
  addEventListener: (type: string, listener: () => void) => void;
};

/* ── The bench circuit ────────────────────────────────────────────────────────
 *
 * The parts under test are no longer scattered around a ring on separate
 * pedestals. They are wired into an actual circuit, because the ring never
 * showed one: parts sat in seats being abstractly "stressed" with no visible
 * reason, which is why the arena always felt like it was missing something.
 *
 * Classic schematic layout, laid flat on the floor and orbitable from anywhere:
 *
 *        ┌──────── top rail (one node) ────────┐
 *   battery                                  switch
 *        └──────── bottom rail (one node) ─────┘
 *                 with the parts as rungs between the two rails
 *
 * The rails are the two nodes. Every part bridges between them, so they are all
 * in PARALLEL: each sees the same voltage, draws its own current, and — the
 * reason this beats a series loop for a battle — one part failing open does not
 * cut current to the others. They genuinely race to failure.
 *
 * Battery is centred on the left edge and switch centred on the right edge,
 * always, because that is the convention every schematic is drawn in.
 */

/** Spacing between adjacent parallel branches along the rails. */
const CIRCUIT_RUNG_SPACING = 2.7;
/** Half the rail separation — i.e. how long each branch is. */
const CIRCUIT_HALF_Z = 2.8;
/** Clearance between the outermost part and the battery/switch edge. */
const CIRCUIT_EDGE_MARGIN = 2.4;
/**
 * Height of the rails — and of every part's centreline, so a wire arriving at a
 * part meets its body instead of passing under it. One number drives both on
 * purpose: the moment they drift apart, nothing looks connected.
 */
const CIRCUIT_RAIL_Y = 0.4;
const CIRCUIT_WIRE_RADIUS = 0.075;

/**
 * The loop one branch's current takes: out of the battery's + terminal, right
 * along the top rail, down through that part, and back along the bottom rail to
 * the − terminal.
 *
 * Every branch's loop overlaps on the shared rail near the battery, so where the
 * whole circuit's current runs together you see every branch's carriers at once
 * and the rail is visibly busier — total current drawn by the geometry rather
 * than faked with a thicker line.
 */
function buildFlowPath(halfX: number, seatX: number, batteryHalf: number): Vec2[] {
  return [
    // Out of the battery's + terminal and up the left edge. This leg was
    // missing, which is why no current appeared to leave the battery: the path
    // started at the corner, so the whole left edge — the battery's own leads —
    // carried nothing.
    { x: -halfX, z: -batteryHalf },
    { x: -halfX, z: -CIRCUIT_HALF_Z }, // top-left corner
    { x: seatX, z: -CIRCUIT_HALF_Z }, // along the top rail to this branch
    { x: seatX, z: CIRCUIT_HALF_Z }, // down through the part
    { x: -halfX, z: CIRCUIT_HALF_Z }, // back along the bottom rail
    { x: -halfX, z: batteryHalf }, // up the left edge to the − terminal
  ];
}

/** Half-width of the board — grows with the part count so rungs never crowd. */
function circuitHalfX(count: number): number {
  return (Math.max(count - 1, 1) * CIRCUIT_RUNG_SPACING) / 2 + CIRCUIT_EDGE_MARGIN;
}

/**
 * Where part `index` of `count` stands. Parts are spread evenly along the rails
 * and centred on the board, so the layout stays symmetric at any roster size —
 * and a solo part lands dead centre without a special case.
 */
function circuitSeat(index: number, count: number): { x: number; z: number } {
  if (count <= 1) {
    return { x: 0, z: 0 };
  }
  const span = (count - 1) * CIRCUIT_RUNG_SPACING;
  return { x: -span / 2 + index * CIRCUIT_RUNG_SPACING, z: 0 };
}

function createCanvasTexture(
  THREE: typeof import("three"),
  fillStyle: string,
): import("three").CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, fillStyle);
    gradient.addColorStop(0.35, "rgba(255,255,255,0.75)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(64, 64, 64, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/** How many puffs a single plume can have in the air at once. */
const SMOKE_PUFFS = 36;

type SmokePlume = {
  object: import("three").Object3D;
  /**
   * @param dt        ms since the previous frame
   * @param sinceFail ms since the part failed (drives emission + taper)
   */
  update: (dt: number, sinceFail: number) => void;
  dispose: () => void;
};

/**
 * A puff-sprite plume that hangs off a failed part.
 *
 * Sprites rather than a Points cloud on purpose: each puff needs its OWN
 * opacity and size so it can swell and thin out as it rises, which a shared
 * PointsMaterial cannot express. Twenty of them per failed part is cheap, and
 * only failed parts ever have one.
 */
function createSmokePlume(
  THREE: typeof import("three"),
  spec: FailSmoke,
  texture: import("three").Texture,
): SmokePlume {
  const object = new THREE.Group();
  const tint = new THREE.Color(spec.tint);
  const puffs = Array.from({ length: SMOKE_PUFFS }, () => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: tint,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    object.add(sprite);
    return {
      sprite,
      material,
      // age > life means "dead and available to respawn".
      age: 1,
      life: 1,
      vx: 0,
      vy: 0,
      vz: 0,
      sway: 0,
      spin: 0,
    };
  });

  let emitCredit = 0;

  const spawn = (puff: (typeof puffs)[number]) => {
    // Smoke leaves from the top face of the body, not from a single point —
    // scatter the origin across the package so the column has width.
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.18;
    puff.sprite.position.set(
      Math.cos(angle) * radius,
      0.05 + Math.random() * 0.08,
      Math.sin(angle) * radius,
    );
    puff.age = 0;
    puff.life = 1400 + Math.random() * 1400;
    puff.vx = (Math.random() - 0.5) * spec.spread * 0.35;
    puff.vy = spec.rise * (0.7 + Math.random() * 0.6);
    puff.vz = (Math.random() - 0.5) * spec.spread * 0.35;
    puff.sway = Math.random() * Math.PI * 2;
    puff.spin = (Math.random() - 0.5) * 0.0012;
    puff.sprite.material.rotation = Math.random() * Math.PI * 2;
    puff.sprite.visible = true;
  };

  return {
    object,
    update(dt, sinceFail) {
      const seconds = dt / 1000;
      // Emission is heaviest as it lets go, then thins to nothing — a cooked
      // resistor stops smoking once the hot spot has burnt itself out.
      const taper =
        spec.forMs > 0 ? Math.max(0, 1 - sinceFail / spec.forMs) : 0;
      // Gentle taper (not squared) — a squared falloff killed the column within
      // a second of the pop, so the plume was over before you could look at it.
      emitCredit += spec.rate * taper ** 1.3 * seconds;
      while (emitCredit >= 1) {
        emitCredit -= 1;
        const free = puffs.find((candidate) => candidate.age >= candidate.life);
        if (!free) {
          emitCredit = 0;
          break;
        }
        spawn(free);
      }

      for (const puff of puffs) {
        if (puff.age >= puff.life) {
          if (puff.sprite.visible) {
            puff.sprite.visible = false;
            puff.material.opacity = 0;
          }
          continue;
        }
        puff.age += dt;
        const t = Math.min(puff.age / puff.life, 1);
        // Rising smoke slows and fans out as it cools and mixes with the air.
        const drag = 1 - t * 0.55;
        puff.sway += dt * 0.0016;
        puff.sprite.position.x += (puff.vx + Math.sin(puff.sway) * 0.06) * seconds * drag;
        puff.sprite.position.y += puff.vy * seconds * drag;
        puff.sprite.position.z += (puff.vz + Math.cos(puff.sway) * 0.06) * seconds * drag;
        // Swell as it disperses, and thin out with it: quick to appear,
        // slow to fade, which is what reads as "smoke" rather than "sparks".
        const size = 0.34 + t * (0.95 + spec.spread);
        puff.sprite.scale.set(size, size, 1);
        puff.material.rotation += puff.spin * dt;
        const fadeIn = Math.min(t / 0.12, 1);
        const fadeOut = (1 - t) ** 1.5;
        puff.material.opacity = spec.opacity * fadeIn * fadeOut;
      }
    },
    dispose() {
      for (const puff of puffs) {
        puff.material.dispose();
      }
    },
  };
}

/**
 * Parts whose entire job is to make light.
 *
 * Everything else in the arena is lit only by the rig — that is the whole point
 * of the lighting pass, and it is why parts finally show their own colour. But
 * applying that rule to an LED makes it a bead of dull pink plastic, and a lamp
 * a grey-white marble. Those two are supposed to be the brightest, most
 * colourful things on the floor.
 *
 * The glow COLOUR is not listed here on purpose: it is taken from the lens's
 * own albedo, so a green LED glows green and a yellow one glows yellow without
 * a table to maintain. Only the intensities live here.
 *
 * `emissive` is how hard the lens self-illuminates (what you see looking at
 * it); `light` is a real PointLight inside the envelope, which is what spills
 * colour onto the dais and sells it as a source rather than a sticker.
 * `lightColor` overrides the cast colour where the envelope is not the colour
 * of the light — a clear tungsten bulb has a near-white glass and a warm beam.
 */
const EMITTERS: Record<
  string,
  { emissive: number; light: number; lightColor?: string }
> = {
  led: { emissive: 2.1, light: 2.8 },
  lamp: { emissive: 2.4, light: 5.0, lightColor: "#ffcf8a" },
};

function createComponentGroup(
  THREE: typeof import("three"),
  componentType: string,
  accent: string,
  // The battery and the switch are circuit FURNITURE, not contenders — they are
  // never on trial, never identified by a team colour, and never charred, so
  // they get no accent ring.
  //
  // `axis` is which way the part's two terminals should end up pointing: "z" for
  // a part sitting in a branch between the rails (the default), "x" for one
  // wired INTO a rail, like the switch.
  options: { ring?: boolean; axis?: "x" | "z" } = {},
): import("three").Group {
  const { ring: wantRing = true, axis: targetAxis = "z" } = options;
  const componentDef = getComponent3D(componentType) ?? getComponent3D("resistor");
  const group = new THREE.Group();

  // No pedestal any more. A dais under every part was dome furniture — parts
  // standing on plinths waiting to be judged. Now they are wired INTO a circuit,
  // and components in a circuit sit on the board, not on a podium. The accent
  // survives as a flat ring painted on the floor under the part, which still
  // says "this seat is that contender" without lifting anything off the board.
  if (!componentDef) {
    return group;
  }

  const core = new THREE.Group();
  const emitter = EMITTERS[componentType];
  // The lens/envelope of an emitter is the shape that is DELIBERATELY
  // translucent (LED lens 0.7, lamp envelope 0.85) — its opaque neighbours are
  // the metal base and the black collar, which must stay dark. Keying off
  // opacity rather than shape index means the library can gain a shape without
  // silently making the wrong piece glow.
  let lensColor: string | null = null;
  let lensPosition: [number, number, number] | null = null;
  componentDef.geometry.shapes.forEach((shape) => {
    let geometry: import("three").BufferGeometry | null = null;
    switch (shape.type) {
      case "box":
        geometry = new THREE.BoxGeometry(
          shape.scale?.[0] ?? 1,
          shape.scale?.[1] ?? 1,
          shape.scale?.[2] ?? 1,
        );
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[1] ?? 1,
          24,
        );
        break;
      case "sphere":
        geometry = new THREE.SphereGeometry(shape.scale?.[0] ?? 0.5, 24, 18);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[1] ?? 1,
          24,
        );
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[1] ?? 0.2,
          14,
          36,
        );
        break;
    }

    if (!geometry) {
      return;
    }

    // Component bodies are PLASTIC, ceramic, epoxy, painted metal-film — not
    // chrome. At the old metalness 0.62 three.js throws away ~62% of the
    // diffuse albedo and reflects the environment instead, and there is no
    // environment map here — so a red LED and a beige resistor both came out
    // as the same dark grey mirror. Dropping metalness is the single biggest
    // reason parts now show their actual colour.
    //
    // The accent emissive is gone entirely: a standing self-glow in the
    // scenario's team colour on every body is exactly what a selection
    // highlight looks like. Parts are lit by the arena now, not by themselves.
    // Every shape on a part used to share ONE surface: metalness 0.08,
    // roughness 0.44, whatever it was. That is why the parts read as toys --
    // because it is literally how a toy is made. A moulded toy is one plastic
    // at one finish in different colours, and an object whose every surface
    // catches the light identically is exactly what the eye reads as moulded.
    //
    // Real hardware is the opposite: chalky ceramic against glossy lacquer
    // against dull tinned lead, three different specular responses inside
    // 10mm. The CONTRAST is what sells it, not the quality of any one surface
    // -- so a shape now declares what it is made of, and gets that.
    const finish = SURFACE_FINISHES[shape.finish ?? "plastic"];
    const material = new THREE.MeshStandardMaterial({
      color: shape.color ?? "#94a3b8",
      metalness: finish.metalness,
      roughness: finish.roughness,
      transparent: typeof shape.opacity === "number",
      opacity: shape.opacity ?? 1,
      emissive: new THREE.Color("#000000"),
    });

    if (emitter && typeof shape.opacity === "number") {
      const glow = new THREE.Color(shape.color ?? "#ffffff");
      material.emissive.copy(glow);
      material.emissiveIntensity = emitter.emissive;
      // Remembered on the material so the per-frame thermal loop can return
      // this lens to its OWN light instead of the near-black rest value every
      // other body settles to. Without it the animate loop would blank the
      // glow on the very first frame.
      material.userData.restEmissive = glow.clone();
      material.userData.restEmissiveIntensity = emitter.emissive;
      if (!lensPosition) {
        lensColor = shape.color ?? "#ffffff";
        lensPosition = shape.position;
      }
    }

    const mesh = new THREE.Mesh(geometry, material);
    // Mesh positions are the library's own local coordinates now. The mount
    // height used to be baked in here (+1.05 per mesh), which quietly made the
    // part impossible to rotate: tipping the group on its side swung that
    // vertical offset out sideways and threw the part off its seat. The height
    // belongs on the core as a whole, applied below.
    mesh.position.set(shape.position[0], shape.position[1], shape.position[2]);

    if (shape.rotation) {
      mesh.rotation.set(shape.rotation[0], shape.rotation[1], shape.rotation[2]);
    }

    core.add(mesh);
  });

  componentDef.geometry.leads.forEach((lead) => {
    const geometry = new THREE.CylinderGeometry(lead.radius, lead.radius, lead.length, 12);
    const material = new THREE.MeshStandardMaterial({
      // Leads genuinely ARE metal, so they keep their metalness — they should
      // be the only shiny thing on the part, which is what sells the body as
      // plastic by contrast. Roughness up a little so they read as tinned
      // copper rather than a mirror with nothing to reflect.
      color: lead.color ?? "#e2e8f0",
      metalness: 0.88,
      roughness: 0.3,
      emissive: new THREE.Color("#000000"),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(lead.position[0], lead.position[1], lead.position[2]);
    core.add(mesh);
  });

  // A real light in the envelope. Short range and steep decay on purpose: it
  // should pool on the part's own dais and the floor just around it, not light
  // the neighbouring seat and undo the rig's separation between parts.
  if (emitter && lensPosition) {
    const emitterLight = new THREE.PointLight(
      emitter.lightColor ?? lensColor ?? "#ffffff",
      emitter.light,
      3.6,
      2,
    );
    emitterLight.position.set(lensPosition[0], lensPosition[1], lensPosition[2]);
    // Read back by the animate loop, which dims it as the bench cools and kills
    // it outright when the part dies.
    emitterLight.userData.baseIntensity = emitter.light;
    core.add(emitterLight);
  }

  const outlineRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.045, 12, 48),
    new THREE.MeshStandardMaterial({
      // The ONE place the team accent belongs: a painted marker ring around the
      // dais. It identifies the seat, not the part. Real colour under real light
      // (the accent is the ring's actual albedo now) with only a whisper of
      // emissive — a lit halo here is what made every part look pre-selected.
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(0.1),
      metalness: 0.15,
      roughness: 0.45,
    }),
  );
  outlineRing.rotation.x = Math.PI / 2;
  // Flat on the board now — a painted marking, not a rim around a plinth.
  outlineRing.position.y = 0.02;

  // ── Turn the part to face its branch ──────────────────────────────────────
  // Every part runs between the two rails, so the axis its two TERMINALS sit on
  // has to point along Z. The terminals are the thing that matters — not which
  // way the part is longest.
  //
  // Bounding-box-longest was the first rule here and it laid the toggle switch
  // on its back: a switch's lever sticks up, so it measures taller than it is
  // wide even though its contacts are side by side. Reading the lead positions
  // instead gets the switch, the battery and the resistor all right, and stands
  // the LED and lamp up on the board where they belong.
  const leadSpread = (axis: 0 | 1 | 2) => {
    const values = componentDef.geometry.leads.map((lead) => lead.position[axis]);
    return values.length >= 2 ? Math.max(...values) - Math.min(...values) : 0;
  };
  let terminalAxis: "x" | "y" | "z" | null = null;
  const spreads = [leadSpread(0), leadSpread(1), leadSpread(2)];
  const widest = Math.max(...spreads);
  if (widest > 1e-6) {
    terminalAxis = (["x", "y", "z"] as const)[spreads.indexOf(widest)];
  } else {
    // No usable leads — the resistor and the battery model their terminals as
    // shapes, so `leads` is empty for both. Fall back to the longest extent,
    // which for an axial part IS its terminal axis.
    const rawSize = new THREE.Box3()
      .setFromObject(core)
      .getSize(new THREE.Vector3());
    terminalAxis = rawSize.x >= rawSize.y ? "x" : "y";
  }
  if (targetAxis === "z") {
    if (terminalAxis === "x") {
      core.rotation.y = Math.PI / 2; // yaw X onto Z — keeps the part upright
    } else if (terminalAxis === "y") {
      core.rotation.x = Math.PI / 2; // tip Y onto Z — lays the part on its side
    }
  } else if (terminalAxis === "y") {
    core.rotation.z = Math.PI / 2; // tip Y onto X
  } else if (terminalAxis === "z") {
    core.rotation.y = Math.PI / 2; // yaw Z onto X
  }

  core.scale.setScalar(1.15);
  // Centreline at rail height so the wires arrive at the body, not under it.
  core.position.y = CIRCUIT_RAIL_Y;
  // Tag the component body so the stress animation can shake ONLY this — never
  // the accent ring or the floating metrics anchored to the seat.
  core.name = "core";
  group.add(core);
  if (wantRing) {
    group.add(outlineRing);
  }

  // How far the part reaches along its own axis, measured after it has been
  // turned and scaled. The board reads this to stop each wire exactly at the
  // part's end — the difference between a circuit and parts near some wires.
  core.updateMatrixWorld(true);
  const laidBounds = new THREE.Box3().setFromObject(core);
  group.userData.halfSpan =
    targetAxis === "z"
      ? Math.max(laidBounds.max.z, -laidBounds.min.z)
      : Math.max(laidBounds.max.x, -laidBounds.min.x);

  return group;
}

/**
 * A straight run of wire between two points on the board, at rail height.
 * Cylinders rather than lines so the wire has real thickness and catches the
 * arena lighting — a LineSegments rail is one pixel wide and vanishes the
 * moment you orbit away from head-on.
 */
function createWire(
  THREE: typeof import("three"),
  material: import("three").Material,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): import("three").Mesh {
  const length = Math.hypot(bx - ax, bz - az);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CIRCUIT_WIRE_RADIUS,
      CIRCUIT_WIRE_RADIUS,
      length,
      10,
    ),
    material,
  );
  mesh.position.set((ax + bx) / 2, CIRCUIT_RAIL_Y, (az + bz) / 2);
  // Cylinders are born along +Y; lay it down and spin it to face the far end.
  mesh.rotation.z = Math.PI / 2;
  mesh.rotation.y = Math.atan2(bz - az, bx - ax);
  return mesh;
}

/**
 * The dashboard is four COLUMNS, one per W.I.R.E. quantity, each with its
 * readout at the bottom and a vertical control or gauge standing above it.
 *
 * The two faders replaced the old rotary load dial: a knob and a thumb disagree,
 * because turning a circle twenty units from the camera is not a gesture a phone
 * can do precisely. They run up and down rather than side to side so each one
 * sits directly above the metric it moves — the E fader over the E display, the
 * series-R fader over R — and W and I get gauges of the same shape, because they
 * are the two quantities you cannot set, only watch. The panel reads as one
 * instrument rather than as controls in one place and numbers in another.
 */
/** Half the X span across which the four columns are spread. */
const PANEL_SPAN_HALF = 1.5;
/** Half the Z travel of each vertical track. */
const FADER_TRACK_HALF = 0.6;
/** Centre of the column band, in the panel's Z. */
const COLUMN_CENTER_Z = -0.15;
/** Where the row of lit displays sits — the panel's front edge, facing you. */
const TILE_ROW_Z = 0.92;

/**
 * Width of the bay on the right of the faceplate that carries the switch.
 *
 * The switch used to be wired into the top rail. It is a CONTROL, not a part
 * under test, and standing it in the circuit meant the one thing you operate was
 * buried among the things you are watching. On the dashboard next to the faders
 * it reads as what it is: the supply's on/off, alongside the supply's volts and
 * its series resistance. Electrically nothing is lost — it still gates the whole
 * bench, because an open supply switch means no current anywhere.
 */
const SWITCH_BAY = 1.5;

/** Lever angle with the switch open (off) and thrown closed (running). */
const SWITCH_ROT_OPEN = 0.42;
const SWITCH_ROT_CLOSED = -0.72;
/**
 * How long one throw takes, ms.
 *
 * 420, not the 240 this started at. The heaviness of a toggle is carried by the
 * CONTRAST between a slow wind-up and a fast snap — and at 240ms the wind-up was
 * about six frames, which the eye reads as an instant jump with no weight at
 * all. Stretching the resist while keeping the snap short is what makes it a
 * throw rather than a state change.
 */
const SWITCH_THROW_MS = 420;

/**
 * The "ka-chunk" curve: progress along the throw, 0 → 1, given normalised time.
 *
 * Three acts, because that is what a heavy over-centre toggle actually does:
 *  1. **Resist** — over half the DURATION covering a sixth of the TRAVEL. This
 *     lopsidedness is the whole trick: it is what apparent mass looks like.
 *  2. **Go over** — past the tipping point the spring takes it, and it crosses
 *     the remaining five sixths in a quarter of the time, OVERSHOOTING its stop
 *     rather than creeping up to it.
 *  3. **Land** — a damped bounce as it rings down onto the stop.
 *
 * A symmetric ease would read as a servo. The asymmetry IS the mechanism.
 */
function kaChunk(t: number): number {
  if (t < 0.52) {
    const u = t / 0.52;
    return 0.16 * u * u * u;
  }
  if (t < 0.8) {
    const u = (t - 0.52) / 0.28;
    // Decelerating into the stop, overshooting past it to 1.10.
    return 0.16 + (1.1 - 0.16) * (1 - (1 - u) * (1 - u));
  }
  const u = (t - 0.8) / 0.2;
  // Rings down onto 1. Starts at exactly 1.10, so it joins act 2 seamlessly.
  return 1 + 0.1 * Math.cos(u * Math.PI * 2.4) * (1 - u);
}

type SupplyFaderKey = "volts" | "ohms";

/**
 * One dashboard column, declared once and read by the builder, the drag handler
 * AND the render loop. Two copies of these numbers would let the handle you see
 * and the value you set drift apart.
 *
 * `fader` marks the two you can drag. The other two are gauges: same silhouette,
 * but their indicator is driven by the solve rather than by your thumb, so the
 * panel never implies you can set a quantity that the circuit decides.
 */
type PanelColumn = {
  key: "w" | "i" | "r" | "e";
  letter: string;
  /** W.I.R.E. coding (`ct-term-*`), so colour identifies the quantity. */
  color: string;
  fader?: SupplyFaderKey;
};

/** Left to right: W I R E, the mnemonic the whole app teaches. */
const PANEL_COLUMNS: PanelColumn[] = [
  { key: "w", letter: "W", color: "#4a90ff" },
  { key: "i", letter: "I", color: "#ffd633" },
  { key: "r", letter: "R", color: "#00cc66", fader: "ohms" },
  { key: "e", letter: "E", color: "#ff4444", fader: "volts" },
];

/** X centre of column `index`, in the panel's own space. */
function columnX(index: number): number {
  const step = (PANEL_SPAN_HALF * 2) / PANEL_COLUMNS.length;
  return -PANEL_SPAN_HALF + step * (index + 0.5);
}

/**
 * The CT3D wordmark's per-letter colours, matching `.circuitry-wordmark__*` in
 * layout.css: C blue, T orange, 3D green.
 */
const BRAND_BLUE = "#88ccff";
const BRAND_ORANGE = "#ff9966";
const BRAND_GREEN = "#00ff88";

/**
 * The top of the series-resistance fader, Ω. Chosen against the roster: the
 * parts on the rails are hundreds of ohms, so a kilohm of series resistance is
 * enough to starve the whole bench, and anything beyond that just reads as off.
 */
const SERIES_OHMS_MAX = 1000;

/**
 * Source + wiring resistance the supply sees, Ω. Small and non-zero on purpose:
 * an ideal source with zero internal resistance makes a low-resistance part draw
 * an unbounded current, and the solver is right to. Real supplies droop.
 */
const ARENA_SOURCE_OHMS = 0.5;

/**
 * Metric nameplate anchoring, copied from the main workspace's floating
 * component labels (legacy.html, `.component-label-floating` +
 * `updateLabelPosition`): anchor 2.5 world units above the part, offset 4 px up
 * in screen space, and hang the plate UP from that point via
 * `translate(-50%, -100%)`.
 *
 * The workspace's own comment on that transform is the rule: "Anchor point is
 * bottom-centre of label so it always floats completely above the 3D component
 * — never on top of it." Centring the plate on the anchor is what buried the
 * parts under their own readouts.
 */
/**
 * Ambient motes drifting in the air of the dome.
 *
 * The count the arena has always shipped is 240, and that is what the default
 * density of 50 produces — so the setting arrives without changing how the scene
 * looks for anyone. The scale is deliberately linear in COUNT rather than in
 * anything perceptual: this is a "how much stuff is in the air" dial, and users
 * reach for it to clear the air (0) or thicken it, not to hit a target number.
 */
const ATMOSPHERE_MAX_MOTES = 480;

function atmosphereCountFor(density: number): number {
  const clamped = Math.max(0, Math.min(100, density));
  return Math.round((clamped / 100) * ATMOSPHERE_MAX_MOTES);
}

/**
 * (Re)fill a geometry with `count` motes in the dome's air column. Replaces the
 * position attribute outright, so it doubles as the rebuild path for the slider.
 */
function fillAtmosphere(
  THREE: typeof import("three"),
  geometry: import("three").BufferGeometry,
  count: number,
): void {
  const positions = new Float32Array(Math.max(0, count) * 3);
  for (let index = 0; index < count; index += 1) {
    const stride = index * 3;
    const radius = 5 + Math.random() * 11;
    const angle = Math.random() * Math.PI * 2;
    positions[stride] = Math.cos(angle) * radius;
    positions[stride + 1] = 1.5 + Math.random() * 8;
    positions[stride + 2] = Math.sin(angle) * radius;
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setDrawRange(0, count);
}

/**
 * How high above the rail a plate anchors, in WORLD units.
 *
 * 1.5, down from 2.5. A label belongs to the thing it labels, and floating it
 * two and a half units up left the plates reading as a row of captions across
 * the middle of the dome rather than as this part's numbers. Closer is also
 * what makes the pair legible together: you can take in the part and its
 * figures in one look instead of glancing between them.
 */
const NAMEPLATE_ANCHOR_Y = CIRCUIT_RAIL_Y + 1.5;
const NAMEPLATE_GAP_PX = 3;

/**
 * Minimum clear space between two stacked nameplates, px.
 *
 * Plates used to be separated by lifting each part's anchor in WORLD space. That
 * could not work: a fixed world offset projects to a different number of pixels
 * at every camera distance and angle, so it was either invisible (plates still
 * overlapping) or enormous (plates floating so far above the board they no
 * longer read as belonging to any particular part). It also lifted plates that
 * were never in danger of colliding.
 *
 * Overlap is a SCREEN problem, so it is solved in screen space: every plate
 * anchors directly over its own part, and only the ones that actually collide
 * get stepped up, by exactly the amount needed to clear. The pass is stateless —
 * it re-derives the whole stack from the current projection each frame, so the
 * same camera always yields the same layout and there is nothing to oscillate.
 */
const NAMEPLATE_STACK_GAP_PX = 3;

/** Horizontal slack before two plates count as sharing a column. */
const NAMEPLATE_COLUMN_PAD_PX = 4;

/**
 * How much overlap is simply tolerated before a plate is stepped at all.
 *
 * Deliberately non-zero. Resolving every last pixel of collision means plates
 * jumping around constantly as the bench turns — the cure reads worse than the
 * disease, because motion draws the eye far harder than a few shared pixels do.
 * A touch of overlap on a rotating scene is nothing; a stack that reshuffles
 * every frame is a distraction sitting on top of the thing you are watching.
 * So: step only when they genuinely obscure each other, and step by the least
 * that clears it.
 */
const NAMEPLATE_OVERLAP_SLACK_PX = 7;

/**
 * Height to keep clear at the bottom of the scene, px. The collapsed bench bar
 * ("SOLO BENCH" / the load readout) is drawn OVER the canvas rather than beside
 * it, so anything anchored near the bottom edge disappears underneath it.
 */
const BENCH_BAR_CLEARANCE_PX = 52;

/**
 * How long a failure card sits on screen before clearing itself, ms.
 *
 * Long enough to read one line, short enough that a six-part run does not end
 * with a wall of text over the dome. Opening the card cancels the countdown.
 */
const FUSE_CARD_DWELL_MS = 7000;

/**
 * How far in FRONT of the bottom rail the supply panel sits.
 *
 * In front, not out to the left. The opening shot looks down the +Z axis at the
 * board's centre, so anything parked outboard of the left edge starts outside
 * the frame — and the panel is wide enough that framing it by backing the camera
 * off would shrink the whole bench on a portrait phone. Across the front it
 * lands in the foreground of the opening shot, runs parallel to the rails, and
 * faces the operator, which is where the controls on real gear live.
 */
const SUPPLY_PANEL_OUTBOARD = 1.95;
/**
 * The two controls are deliberately bigger than any component on the board.
 * They are the only things on the bench the user operates, and on a phone a
 * part-sized control seen from twenty units out is not a control — it is a
 * speck. Size is the first thing that says "this one is yours to touch".
 */
/**
 * Sized against the board, not by eye. A solo bench is 7.5 units wide
 * (`circuitHalfX(1) * 2`), and the panel's own width is
 * `2 * plateHalfX + SWITCH_BAY` = 5.1 before scaling — so at 1.28 the dashboard
 * was 6.5 units, 87% of the circuit it serves, and read as the main event.
 *
 * 0.75 fixed that but overshot in the other direction: at half the board's
 * width, seen from twenty units out on a phone, the fader travel was short
 * enough that setting a value precisely with a thumb was fiddly — you could
 * grab a handle but you could not really OPERATE it, which makes the one
 * genuinely interactive thing on the bench feel decorative.
 *
 * 0.95 is the compromise: ~4.85 units, about 65% of a solo bench, so it is
 * still plainly a control panel attached to the bench rather than a second
 * bench — but every track is 27% longer, which is 27% more resolution under
 * the thumb.
 */
const SUPPLY_PANEL_SCALE = 0.95;
/**
 * The switch has to FIT its bay, and the bay is `SWITCH_BAY * SUPPLY_PANEL_SCALE`
 * — so this is expressed as a RATIO of the panel scale rather than as a fixed
 * number. Hard-coded, it stayed the same size whenever the panel grew and ended
 * up a small toggle rattling around in a large bay.
 */
const SWITCH_SCALE = SUPPLY_PANEL_SCALE * 1.467;

/**
 * A glowing ring on the floor under each control. This is what carries "this is
 * interactive" without writing it on the board: components are lit by the scene,
 * controls emit their own light. It breathes while the bench is idle and waiting
 * for you, and goes steady once the test is running.
 */
function createControlHalo(
  THREE: typeof import("three"),
  radius: number,
  color: string,
): import("three").Mesh {
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  // Flat on the board, a hair above it so it never z-fights the floor.
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.03;
  halo.name = "controlHalo";
  return halo;
}
/**
 * One lit readout tile on the dashboard: a small self-illuminated display
 * showing a single W.I.R.E. figure, the way a bench instrument carries its own
 * little screen rather than reporting into a caption somewhere off to the side.
 *
 * Unlit material on purpose — a display EMITS, so the scene's lighting must not
 * be able to dim it. The canvas is only redrawn when the text actually changes,
 * so a steady bench costs nothing per frame.
 */
function createReadoutTile(
  THREE: typeof import("three"),
  letter: string,
  color: string,
): { mesh: import("three").Group; update: (value: string) => void } {
  const group = new THREE.Group();

  // Bezel — the recess the display sits in, so it reads as inset hardware
  // rather than a decal printed on the faceplate.
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.07, 0.44),
    new THREE.MeshStandardMaterial({
      color: "#0b0f16",
      metalness: 0.35,
      roughness: 0.75,
    }),
  );
  group.add(bezel);

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  // The display face is a decal sitting on the bezel, so it must never fight
  // the bezel for depth. It used to sit 0.003 units above a 0.07-tall bezel
  // (top at y=0.035) while still writing depth — far inside a phone GPU's
  // depth resolution, so the tile flickered between its texture and the
  // near-black bezel underneath: the black squares that flashed on device.
  // Three defences: a real gap, no depth writing, and a polygon offset that
  // biases the decal toward the camera.
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.38),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.048;
  face.renderOrder = 2;
  group.add(face);

  // A pinch of light spilling out of the display, tinted to its own metric.
  // This is what sells "lit up" rather than "printed".
  const spill = new THREE.PointLight(color, 0.5, 1.1, 2);
  spill.position.y = 0.22;
  group.add(spill);

  let lastValue: string | null = null;
  const update = (value: string) => {
    if (!ctx || value === lastValue) {
      return;
    }
    lastValue = value;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Display glass.
    ctx.fillStyle = "#05080d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // The metric's letter, small and top-left the way a panel legend sits.
    ctx.font = "bold 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillText(letter, 10, 4);
    ctx.globalAlpha = 1;
    // The value, as big as the glass allows — this is the thing being read, and
    // the tile is only a few dozen pixels across on a phone. Condensed to fit
    // rather than clipped, so "172 mW" and "1.24 kΩ" both stay whole.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    let size = 74;
    do {
      ctx.font = `bold ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      size -= 4;
    } while (size > 34 && ctx.measureText(value).width > canvas.width - 16);
    ctx.fillText(value, canvas.width / 2, canvas.height / 2 + 26);
    ctx.shadowBlur = 0;
    texture.needsUpdate = true;
  };
  update("--");

  return { mesh: group, update };
}

/**
 * The bench's power toggle: a heavy panel switch, built rather than borrowed.
 *
 * The library's switch is a small part meant to sit in a circuit among other
 * parts. This one is the single control that starts the test, and it has to LOOK
 * like something you throw — no motion curve fully compensates for a lever that
 * reads as weightless. Old-style mechanism, modern build: a machined bezel, a
 * long lever on a visible pivot pin, and a knurled grip.
 *
 * The lever is a child group named "switchLever" pivoting about X, which is the
 * contract the render loop's `kaChunk` throw drives.
 */
function createPanelToggle(THREE: typeof import("three")): import("three").Group {
  const group = new THREE.Group();

  const steel = new THREE.MeshStandardMaterial({
    color: "#9aa7b8",
    metalness: 0.85,
    roughness: 0.28,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: "#5c6879",
    metalness: 0.8,
    roughness: 0.34,
  });
  const housing = new THREE.MeshStandardMaterial({
    color: "#1b222d",
    metalness: 0.35,
    roughness: 0.7,
  });

  // Machined bezel — a chamfered collar sunk into the panel. This is most of
  // what says "modern hardware" rather than "period prop".
  const bezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.46, 0.1, 28),
    steel,
  );
  bezel.position.y = CIRCUIT_RAIL_Y + 0.02;
  group.add(bezel);

  // The body below it, matte and dark so the bezel reads as the machined face.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 0.16, 24),
    housing,
  );
  body.position.y = CIRCUIT_RAIL_Y - 0.05;
  group.add(body);

  // The pivot pin, lying along X — the axis the lever actually turns about.
  // Visible on purpose: a hinge you can see is what makes the throw legible.
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.42, 14),
    darkSteel,
  );
  pin.rotation.z = Math.PI / 2;
  pin.position.y = CIRCUIT_RAIL_Y + 0.14;
  group.add(pin);

  // ── The lever ─────────────────────────────────────────────────────────────
  const lever = new THREE.Group();
  lever.name = "switchLever";
  lever.position.y = CIRCUIT_RAIL_Y + 0.14;

  // Yoke: the fork that grips the pin, so the lever is attached to something.
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.16), darkSteel);
    cheek.position.set(side * 0.11, 0.07, 0);
    lever.add(cheek);
  }

  // Shaft — LONG. This is the single biggest reason the old one felt light:
  // there was barely any lever to throw. Tapered, because a real lever is
  // thicker where the load is.
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.075, 0.62, 16),
    steel,
  );
  shaft.position.y = 0.44;
  lever.add(shaft);

  // Collar where the shaft meets the grip — a machined step, not a blend.
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 18),
    darkSteel,
  );
  collar.position.y = 0.75;
  lever.add(collar);

  // Knurled grip: the part your thumb actually meets.
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.125, 0.24, 20),
    darkSteel,
  );
  grip.position.y = 0.89;
  lever.add(grip);
  // The knurl itself — ridges standing proud around the grip. Modelled rather
  // than textured so it catches the scene's light and reads at a glance from
  // twenty units out, which a normal map at this size would not.
  const knurlMaterial = new THREE.MeshStandardMaterial({
    color: "#8590a1",
    metalness: 0.75,
    roughness: 0.42,
  });
  const KNURLS = 16;
  for (let i = 0; i < KNURLS; i++) {
    const angle = (i / KNURLS) * Math.PI * 2;
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.22, 0.03),
      knurlMaterial,
    );
    ridge.position.set(Math.sin(angle) * 0.126, 0.89, Math.cos(angle) * 0.126);
    ridge.rotation.y = angle;
    lever.add(ridge);
  }

  // Domed cap, so the lever ends deliberately instead of being cut off.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    steel,
  );
  cap.position.y = 1.01;
  lever.add(cap);

  group.add(lever);

  // A generous invisible target. The lever is a few millimetres of geometry
  // seen from twenty units out — on a phone that is not a tappable thing, and
  // this is the control that starts the whole test.
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = CIRCUIT_RAIL_Y + 0.3;
  hit.name = "switchHit";
  group.add(hit);

  group.userData.halfSpan = 0.46;
  return group;
}

/**
 * Silkscreen a CT3D mark onto a canvas texture — C blue, T orange, 3D green,
 * the same per-letter split the app's wordmark uses. Drawn on a canvas rather
 * than modelled because three has no text geometry without loading a font, and
 * a canvas keeps the three brand colours exact.
 */
function createBrandMarkTexture(
  THREE: typeof import("three"),
): import("three").CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 104px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const parts: [string, string][] = [
      ["C", BRAND_BLUE],
      ["T", BRAND_ORANGE],
      ["3D", BRAND_GREEN],
    ];
    // Measure first, so the mark lands centred whatever the font resolves to on
    // this device — the letters are drawn one at a time to colour them
    // separately, which means nothing else is centring them.
    const total = parts.reduce((sum, [text]) => sum + ctx.measureText(text).width, 0);
    let x = (canvas.width - total) / 2;
    for (const [text, color] of parts) {
      // The glow is the 2D wordmark's text-shadow in canvas form. Without it the
      // mark reads as flat print; with it the panel looks lit from its own
      // silkscreen, which is the point of the brand appearing here at all.
      ctx.shadowColor = color;
      ctx.shadowBlur = 26;
      ctx.fillStyle = color;
      ctx.fillText(text, x, canvas.height / 2);
      x += ctx.measureText(text).width;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * The supply panel: a faceplate carrying two linear faders — supply voltage and
 * series resistance — with the CT3D mark silkscreened between them.
 *
 * Each fader gets a recessed track, a scale of ticks, and a handle. The ticks
 * are not decoration: a handle sitting somewhere along a bare groove is not a
 * reading, and a control you cannot read a value off is a control you cannot
 * set deliberately.
 *
 * Named children are the contract with the render loop and the drag handler:
 * `supplyTrack-<key>` carries the track's span in userData, `supplyHandle-<key>`
 * is the thing that slides, and `supplyHit-<key>` is an oversized invisible
 * target because a handle a few millimetres wide seen from twenty units out is
 * not something a thumb can find.
 */
function createSupplyPanel(
  THREE: typeof import("three"),
  // The panel sits outboard where nothing competes with it for space, so it can
  // afford to be the size of a control you actually reach for.
  scale = 1,
): import("three").Group {
  const group = new THREE.Group();

  // Tight margins on purpose: this is a compact instrument panel, not a tray
  // with the controls floating in the middle of it.
  const plateHalfX = PANEL_SPAN_HALF + 0.3;
  const plateHalfZ = TILE_ROW_Z + 0.38;

  // Faceplate — the chassis the controls are mounted in. Sitting proud of the
  // floor is what makes it read as equipment rather than paint on the board.
  // Extended to the RIGHT by the switch bay, and offset by half that, so the
  // fader tracks stay centred on the group's origin: the drag handler turns a
  // world X straight into a fader position, and an off-centre origin would put
  // every value it reads out of step with the handle you can see.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(plateHalfX * 2 + SWITCH_BAY, 0.18, plateHalfZ * 2),
    new THREE.MeshStandardMaterial({
      color: "#232b38",
      metalness: 0.5,
      roughness: 0.52,
    }),
  );
  plate.position.x = SWITCH_BAY / 2;
  plate.position.y = CIRCUIT_RAIL_Y - 0.02;
  group.add(plate);

  // The CT3D mark along the panel's BACK edge. It used to sit between the two
  // faders; now that the faders stand as columns there is no gap between them to
  // live in, and the strip behind the columns is the one part of the plate that
  // is neither control nor readout — which is exactly where a brand goes on real
  // gear.
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.3),
    new THREE.MeshBasicMaterial({
      map: createBrandMarkTexture(THREE),
      transparent: true,
      // Unlit and drawn over the plate: a silkscreen is ink on the surface, and
      // shading it would let the scene's lighting dim the brand colours.
      depthWrite: false,
    }),
  );
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0, CIRCUIT_RAIL_Y + 0.08, -plateHalfZ + 0.24);
  mark.name = "supplyBrandMark";
  group.add(mark);

  const trackY = CIRCUIT_RAIL_Y + 0.07;
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: "#10151d",
    metalness: 0.3,
    roughness: 0.85,
  });
  const tickMaterial = new THREE.MeshBasicMaterial({ color: "#7c8798" });
  const majorMaterial = new THREE.MeshBasicMaterial({ color: "#e8eef7" });

  PANEL_COLUMNS.forEach((column, index) => {
    const x = columnX(index);

    // Track — a recessed groove running FRONT-TO-BACK, so the control travels
    // the way the eye reads a level: up is more. Identical for gauges and
    // faders, because the user asked for one shape across all four columns.
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.06, FADER_TRACK_HALF * 2 + 0.14),
      trackMaterial,
    );
    track.position.set(x, trackY, COLUMN_CENTER_Z);
    track.name = `supplyTrack-${column.key}`;
    group.add(track);

    // The scale. Seven ticks with the ends and the middle called out, so a
    // handle's position is a value and not a vibe — and so a gauge's indicator
    // is being read against something.
    const TICKS = 7;
    for (let i = 0; i < TICKS; i++) {
      const t = i / (TICKS - 1);
      const major = i === 0 || i === TICKS - 1 || i === (TICKS - 1) / 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(major ? 0.15 : 0.09, 0.012, 0.03),
        major ? majorMaterial : tickMaterial,
      );
      tick.position.set(
        // Ticks sit beside the track, so the indicator never covers the scale
        // it is being read against.
        x + 0.21,
        trackY + 0.04,
        COLUMN_CENTER_Z - FADER_TRACK_HALF + t * FADER_TRACK_HALF * 2,
      );
      group.add(tick);
    }

    // The indicator. Emissive in the column's own W.I.R.E. colour: on a dim
    // board the brightest object is the one that reads as grabbable, and the
    // colour says which quantity it belongs to. A gauge gets the same body so
    // the four columns match, but a dimmer cap — it is a needle, not a grip.
    const handle = new THREE.Group();
    handle.name = `supplyHandle-${column.key}`;
    handle.position.set(x, trackY, COLUMN_CENTER_Z);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.24),
      new THREE.MeshStandardMaterial({
        color: column.fader ? "#414d5e" : "#2a3341",
        metalness: 0.55,
        roughness: 0.38,
      }),
    );
    cap.position.y = 0.11;
    handle.add(cap);
    const index2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.05, 0.06),
      new THREE.MeshStandardMaterial({
        color: column.color,
        emissive: new THREE.Color(column.color),
        emissiveIntensity: column.fader ? 0.9 : 0.55,
        metalness: 0.3,
        roughness: 0.35,
      }),
    );
    index2.position.y = 0.21;
    handle.add(index2);
    group.add(handle);

    // Only the faders take a grab target. A gauge that responded to a drag
    // would be lying about what you control.
    if (column.fader) {
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.9, FADER_TRACK_HALF * 2 + 0.5),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(x, trackY + 0.2, COLUMN_CENTER_Z);
      hit.name = `supplyHit-${column.fader}`;
      group.add(hit);
    }
  });

  // Scale everything but the mount height, so a bigger panel still sits ON the
  // board instead of floating above it.
  if (scale !== 1) {
    for (const child of group.children) {
      child.scale.multiplyScalar(scale);
      child.position.x *= scale;
      child.position.z *= scale;
      child.position.y = CIRCUIT_RAIL_Y + (child.position.y - CIRCUIT_RAIL_Y) * scale;
    }
  }

  // What the drag handler needs to turn a world position into a value, recorded
  // once here so the handle you see and the number you set cannot disagree.
  // ── The four lit W.I.R.E. displays ────────────────────────────────────────
  // Built INTO the dashboard next to the controls, rather than reported in a
  // caption floating somewhere else on screen. Ordered W I R E left to right so
  // the row spells the mnemonic the whole app teaches, and each one is tinted
  // to the same ct-term-* colour that quantity carries everywhere else.
  const updaters: Record<string, (value: string) => void> = {};
  // The tile MESHES are published too, not just their update functions.
  //
  // A tile's face is 0.6 units wide and the column pitch is 0.75, so it cannot
  // be made meaningfully bigger without columns colliding — and at the arena's
  // camera distance that works out to roughly thirty pixels on a phone. No
  // canvas resolution fixes thirty pixels. So the lit tiles stay as HARDWARE
  // (they are what makes the panel read as an instrument) and the numbers you
  // actually read are drawn as crisp DOM text pinned over them at a fixed size,
  // which needs their world positions every frame.
  const tileMeshes: Record<string, import("three").Object3D> = {};
  PANEL_COLUMNS.forEach((column, index) => {
    const tile = createReadoutTile(THREE, column.letter, column.color);
    // Directly BELOW its own column, so each control or gauge stands over the
    // number it belongs to and the panel reads column by column.
    tile.mesh.position.set(columnX(index), CIRCUIT_RAIL_Y + 0.07, TILE_ROW_Z);
    group.add(tile.mesh);
    updaters[column.key] = tile.update;
    tileMeshes[column.key] = tile.mesh;
  });
  group.userData.readoutUpdaters = updaters;
  group.userData.readoutTiles = tileMeshes;

  group.userData.trackHalfZ = FADER_TRACK_HALF * scale;
  group.userData.columnCenterZ = COLUMN_CENTER_Z * scale;
  group.userData.trackY = trackY;
  // Half-spans describe the WHOLE faceplate, switch bay included, so the halo
  // that rings it and the readout that clears it both cover the real object.
  // The plate is NOT centred on the group origin — the origin stays on the
  // fader tracks so the drag maths is honest — so its centre and its left edge
  // are published separately rather than inferred from the half-span.
  group.userData.halfSpan = (plateHalfX + SWITCH_BAY / 2) * scale;
  group.userData.halfSpanZ = plateHalfZ * scale;
  group.userData.plateCenterX = (SWITCH_BAY / 2) * scale;
  group.userData.leftEdgeX = -plateHalfX * scale;
  return group;
}

/**
 * The board itself: two rails, the branch stubs that run out to each part, the
 * junction nodes where they meet, and the battery and switch closing the ends.
 *
 * Static geometry only — nothing here animates. Current flow, the switch
 * throwing, and the flow dial are separate passes that drive this.
 */
function createCircuitBoard(
  THREE: typeof import("three"),
  // One entry per part, already built and measured, so each stub can stop at
  // the real end of the real component rather than at a guessed radius.
  seats: { x: number; halfZ: number }[],
  /**
   * Whether to build the 3D supply console — the faceplate, its two faders,
   * its lit tiles, the switch and the lead that feeds the cell.
   *
   * Off by default now, because the dashboard is fixed DOM at the bottom of
   * the screen instead. Keeping the object here as well would put two of every
   * control on screen, and the 3D pair are the ones you have to chase.
   *
   * What is left is the circuit: cell, rails, rungs, junction beads. Which is
   * the point — the board is for the experiment, the console is for you.
   */
  withConsole = false,
): import("three").Group {
  const count = seats.length;
  const board = new THREE.Group();
  const halfX = circuitHalfX(count);

  // Tinned copper. Warm enough to separate from the cool floor and read as
  // wire rather than as another piece of the dome's structure.
  const wireMaterial = new THREE.MeshStandardMaterial({
    color: "#c9884a",
    metalness: 0.72,
    roughness: 0.34,
  });
  // Junction nodes: a solder bead wherever conductors meet — every corner of
  // the loop and every branch tap. They were there before and invisible, at a
  // radius barely thicker than the wire itself and from a camera 25 units out.
  // Now they are unmistakably beads, paler and shinier than the wire, because
  // marking every junction is what makes the topology readable at a glance.
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: "#f4e9d6",
    metalness: 0.7,
    roughness: 0.18,
    emissive: new THREE.Color("#4a3a24"),
  });
  const nodeGeometry = new THREE.SphereGeometry(0.2, 18, 12);
  const addNode = (x: number, z: number) => {
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.set(x, CIRCUIT_RAIL_Y, z);
    board.add(node);
  };

  // ── The switch lives on the dashboard, not in the circuit ─────────────────
  // It used to interrupt the top rail. That was electrically sound but it put
  // the one thing you OPERATE in among the things you are watching fail. It is
  // the supply's on/off, so it belongs on the supply's front panel beside the
  // volts and series-resistance faders. Gating is unchanged: an open supply
  // switch means no current anywhere on the bench.
  const panelX = 0;
  const panelZ = CIRCUIT_HALF_Z + SUPPLY_PANEL_OUTBOARD;
  const switchX =
    panelX + (FADER_TRACK_HALF + 0.5 + SWITCH_BAY / 2) * SUPPLY_PANEL_SCALE;

  if (withConsole) {
    const switchPart = createPanelToggle(THREE);
    switchPart.position.set(switchX, 0, panelZ);
    switchPart.name = "switch";
    // The switch IS the test button, so it is sized like a control rather than
    // like the parts it gates.
    switchPart.scale.setScalar(SWITCH_SCALE);
    board.add(switchPart);
    const switchHalf =
      ((switchPart.userData.halfSpan as number) ?? 0.45) * SWITCH_SCALE;
    // Its own lit ring, so it still reads as the control that starts the test
    // even sitting on a panel with two others.
    const switchHalo = createControlHalo(THREE, switchHalf * 1.5, "#7dd3fc");
    switchHalo.position.set(switchX, 0.03, panelZ);
    board.add(switchHalo);
    // A light of its own — controls emit, components are lit.
    const switchGlow = new THREE.PointLight("#7dd3fc", 2.2, 5.5, 2);
    switchGlow.position.set(switchX, CIRCUIT_RAIL_Y + 0.5, panelZ);
    switchGlow.name = "switchGlow";
    board.add(switchGlow);
    board.userData.switchX = switchX;
    board.userData.switchHalf = switchHalf;
  }

  // The rails stop at the OUTERMOST RUNG, not at the board edge.
  //
  // They used to run the full ±halfX and be closed by a right-hand vertical.
  // Past the last rung that is dead copper — no current flows through it — and
  // a bare vertical with a solder bead at each end reads as an empty bay. On a
  // solo bench it was blatant: one part in the middle and a second, permanently
  // vacant slot 3.75 units to its right.
  //
  // The last rung closes the loop by itself, so it needs no help: battery, top
  // rail, part, bottom rail, back to the battery. Nothing beyond it is drawn,
  // which removes the phantom bay at every roster size while leaving the board
  // width — and therefore the tuned supply-panel proportion — untouched.
  const railEndX = seats.length
    ? Math.max(...seats.map((seat) => seat.x))
    : halfX;

  // Top rail — unbroken, because nothing is wired into it any more.
  board.add(
    createWire(THREE, wireMaterial, -halfX, -CIRCUIT_HALF_Z, railEndX, -CIRCUIT_HALF_Z),
  );
  // Bottom rail — the return, unbroken.
  board.add(createWire(THREE, wireMaterial, -halfX, CIRCUIT_HALF_Z, railEndX, CIRCUIT_HALF_Z));
  if (!seats.length) {
    // No parts at all: close the loop so the bench still reads as a circuit
    // rather than two dangling rails.
    board.add(createWire(THREE, wireMaterial, railEndX, -CIRCUIT_HALF_Z, railEndX, CIRCUIT_HALF_Z));
    addNode(railEndX, -CIRCUIT_HALF_Z);
    addNode(railEndX, CIRCUIT_HALF_Z);
  }

  // The battery end of the loop. The far end's beads belong to the last rung
  // and are added with the rest of the branch taps below, so adding them here
  // too would double them up.
  for (const cornerZ of [-CIRCUIT_HALF_Z, CIRCUIT_HALF_Z]) {
    addNode(-halfX, cornerZ);
  }

  // Each part's branch: a stub from each rail in to where the part actually
  // ends, and a bead on the rail at the tap.
  for (const seat of seats) {
    board.add(createWire(THREE, wireMaterial, seat.x, -CIRCUIT_HALF_Z, seat.x, -seat.halfZ));
    board.add(createWire(THREE, wireMaterial, seat.x, seat.halfZ, seat.x, CIRCUIT_HALF_Z));
    addNode(seat.x, -CIRCUIT_HALF_Z);
    addNode(seat.x, CIRCUIT_HALF_Z);
  }

  // Battery centred on the left edge, on its side — how a cell actually sits in
  // a holder. It gets no accent ring: it is the circuit, not a contender in it.
  const battery = createComponentGroup(THREE, "battery", "#ffffff", { ring: false });
  battery.position.set(-halfX, 0, 0);
  board.add(battery);

  const batteryHalf = (battery.userData.halfSpan as number) ?? 0.9;
  // Published so the flow paths can start and end at the cell's real terminals
  // rather than at the corners.
  board.userData.batteryHalf = batteryHalf;
  // Left edge, closing onto the ends of the cell.
  board.add(createWire(THREE, wireMaterial, -halfX, -CIRCUIT_HALF_Z, -halfX, -batteryHalf));
  board.add(createWire(THREE, wireMaterial, -halfX, batteryHalf, -halfX, CIRCUIT_HALF_Z));

  if (withConsole) {
    // ── The supply panel ──────────────────────────────────────────────────────
    // OUTSIDE the circuit, connected straight to the battery: this is the cell's
    // output control, the front panel of the supply. The circuit itself is
    // untouched — the space between the rails belongs to the competing parts, and
    // nothing else takes a rung. The volts fader sets what the battery delivers
    // and the series-resistance fader sets what it delivers it through, which is
    // why every branch's current moves with them.
    // panelX / panelZ were resolved up with the switch, which is mounted in this
    // same panel's right-hand bay.
    const panel = createSupplyPanel(THREE, SUPPLY_PANEL_SCALE);
    panel.position.set(panelX, 0, panelZ);
    panel.name = "supplyPanel";
    board.add(panel);
    const panelHalf = (panel.userData.halfSpan as number) ?? 2.2;
    const panelHalfZ = (panel.userData.halfSpanZ as number) ?? 2.2;
    const plateCenterX = panelX + ((panel.userData.plateCenterX as number) ?? 0);
    board.userData.panelX = panelX;
    board.userData.panelZ = panelZ;
    board.userData.panelHalf = panelHalf;
    // Where the faceplate actually sits, as opposed to where its origin is — the
    // halo and the readout both key off this so they stay centred on the panel
    // now that the switch bay has pushed it to the right.
    board.userData.plateCenterX = plateCenterX;
    // Matching lit ring + light, so the whole dashboard reads as the one control
    // surface. Oval rather than round: the panel is much wider than it is deep,
    // and a circle big enough to contain it would swamp the board.
    const panelHalo = createControlHalo(THREE, panelHalf * 1.12, "#ffd166");
    panelHalo.position.set(plateCenterX, 0.03, panelZ);
    panelHalo.scale.set(1, panelHalfZ / panelHalf, 1);
    panelHalo.name = "panelHalo";
    board.add(panelHalo);
    const panelGlow = new THREE.PointLight("#ffd166", 2.4, 7, 2);
    panelGlow.position.set(plateCenterX, CIRCUIT_RAIL_Y + 0.7, panelZ);
    panelGlow.name = "panelGlow";
    board.add(panelGlow);
  
    // The lead from the panel in to the cell. Routed AROUND the outside of the
    // board — along the front, then up the left edge — because a straight run to
    // the battery would cut across the bottom rail and read as a connection to it.
    // The supply is wired to the cell and nothing else.
    const panelLeadX = panelX + ((panel.userData.leftEdgeX as number) ?? -panelHalf);
    board.add(createWire(THREE, wireMaterial, panelLeadX, panelZ, -halfX - 1.1, panelZ));
    addNode(panelLeadX, panelZ);
    board.add(createWire(THREE, wireMaterial, -halfX - 1.1, panelZ, -halfX - 1.1, 0));
    addNode(-halfX - 1.1, panelZ);
    board.add(createWire(THREE, wireMaterial, -halfX - 1.1, 0, -halfX, 0));
    addNode(-halfX - 1.1, 0);
  }

  // The lever, its pivot and its grab target are all built into
  // `createPanelToggle` now — there is no library part left to adapt.
  //
  // No beads either side of the switch any more — it no longer taps into a
  // rail, so there is no junction there to mark.

  return board;
}

export function ArenaScene({
  agents,
  activeAgentId,
  highlight,
  transitionPhase,
  status = "ready",
  stressFactor = 1,
  stressMax = STRESS_MAX,
  onStartTest,
  onLoadChange,
  winnerName = null,
  winnerId = null,
  survivorCount = 0,
  onExitTransitionComplete,
  workspaceMode = false,
  panelOpen = false,
  bottomInsetPx = 0,
  selectedAgentId = null,
  onSelectAgent,
  onLongPressAgent,
  // `solo` is still part of the props contract and callers pass it, but nothing
  // in here reads it any more: the only thing that varied on it was the switch
  // caption ("throw to test" vs "throw to battle"), and that caption is gone.
}: ArenaSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const healthBarsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const agentsRef = useRef<ArenaBattleAgent[]>(agents);
  const phaseRef = useRef<ArenaViewTransitionPhase>(transitionPhase);
  const activeAgentIdRef = useRef<string | null>(activeAgentId);
  const highlightRef = useRef<ArenaBattleHighlight | null>(highlight);
  const lastHighlightTokenRef = useRef<number | null>(highlight?.token ?? null);
  const onExitCompleteRef = useRef(onExitTransitionComplete);
  const workspaceModeRef = useRef(workspaceMode);
  const panelOpenRef = useRef(panelOpen);
  const statusRef = useRef<ArenaBattleStatus>(status);
  const stressFactorRef = useRef(stressFactor);
  const stressMaxRef = useRef(stressMax);
  stressMaxRef.current = stressMax;
  // The switch in the scene IS the test control, so the scene needs a live
  // handle on the callback without tearing down and rebuilding the whole 3D
  // world every time the parent re-renders.
  const onStartTestRef = useRef(onStartTest);
  onStartTestRef.current = onStartTest;
  const onLoadChangeRef = useRef(onLoadChange);
  onLoadChangeRef.current = onLoadChange;
  // Same treatment: the tap handler lives inside the scene-init effect and must
  // see the current selection and callback without the scene being rebuilt.
  const selectedAgentIdRef = useRef<string | null>(selectedAgentId);
  selectedAgentIdRef.current = selectedAgentId;
  const onSelectAgentRef = useRef(onSelectAgent);
  onSelectAgentRef.current = onSelectAgent;
  const onLongPressAgentRef = useRef(onLongPressAgent);
  onLongPressAgentRef.current = onLongPressAgent;
  /** Read by the scene's framing pass — see bottomInsetPx. */
  const bottomInsetRef = useRef(bottomInsetPx);
  /** Published by the scene once it is up, so a height change can re-frame it. */
  const reframeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    bottomInsetRef.current = bottomInsetPx;
    reframeRef.current?.();
  }, [bottomInsetPx]);
  /** Who won — read by the closing camera move and the victor's ring. */
  const winnerIdRef = useRef<string | null>(winnerId);
  winnerIdRef.current = winnerId;
  /** The supply faders' floating readout — a handle position needs a number. */
  const dialLabelRef = useRef<HTMLDivElement | null>(null);

  /**
   * The F.U.S.E. card: what the engine says about a part that just died.
   *
   * Snapshotted at the moment of failure rather than read live, because the
   * agent keeps updating afterwards (it cools) — the card has to report the
   * conditions that KILLED it, not the conditions once it is dead.
   */
  const [fuseCard, setFuseCard] = useState<ArenaBattleAgent | null>(null);
  /** Compact by default; the full post-mortem is one tap away. */
  const [fuseExpanded, setFuseExpanded] = useState(false);
  const reportedFailuresRef = useRef<Set<string>>(new Set());
  const previousStatusRef = useRef<ArenaBattleStatus>(status);
  // The drifting motes in the air of the dome. Held out here so the density
  // slider can rebuild just this buffer — rebuilding the whole scene on a slider
  // drag would tear down the circuit and the running test with it.
  const atmosphereRef = useRef<import("three").Points | null>(null);
  const threeRef = useRef<typeof import("three") | null>(null);
  // The live renderer, so the unmount-only effect below can hand its WebGL
  // context back. Deliberately NOT cleared by the main effect's cleanup: that
  // cleanup also runs on a plain sceneAgentSignature re-run, and the context
  // must survive those (the canvas element is stable, so the next renderer
  // reuses it).
  const liveRendererRef = useRef<import("three").WebGLRenderer | null>(null);
  const { settings: appSettings } = useAppSettings();
  const atmosphereDensity = appSettings.workspace.atmosphereDensity;
  // Whether stressed parts tremble. Reduce-motion turns it off regardless of
  // the simulation setting — a user who has asked the whole app to stop moving
  // things has already answered this question.
  const componentShake =
    appSettings.simulation.componentShake &&
    !appSettings.accessibility.reducedMotion;
  // Read inside the animate loop, so toggling it takes effect on the next
  // frame without tearing down the dome and the running test with it.
  const componentShakeRef = useRef(componentShake);
  useEffect(() => {
    componentShakeRef.current = componentShake;
  }, [componentShake]);
  // Read by the scene-init effect, which must NOT list the density as a
  // dependency — doing so would rebuild the entire dome on every slider tick.
  const atmosphereDensityRef = useRef(atmosphereDensity);
  useEffect(() => {
    atmosphereDensityRef.current = atmosphereDensity;
  }, [atmosphereDensity]);

  // Rebuild just the mote buffer when the slider moves. The scene, the circuit
  // and any running test are untouched.
  useEffect(() => {
    const THREE = threeRef.current;
    const points = atmosphereRef.current;
    if (!THREE || !points) {
      return;
    }
    fillAtmosphere(THREE, points.geometry, atmosphereCountFor(atmosphereDensity));
    points.visible = atmosphereDensity > 0;
  }, [atmosphereDensity]);

  useEffect(() => {
    // A fresh run gets a clean slate, so re-running the bench explains its
    // failures again instead of staying silent because it already did once.
    //
    // Testing only for "ready" was not enough: a re-run goes straight from
    // "complete" to "battling" and never passes through "ready", so every
    // failure was already in reportedFailures and no card was ever shown on a
    // second run. Catch the entry INTO a run as well.
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    if (status === "ready" || (status === "battling" && previousStatus !== "battling")) {
      reportedFailuresRef.current.clear();
      setFuseCard(null);
      setFuseExpanded(false);
      return;
    }
    for (const agent of agents) {
      if (agent.phase !== "failed") continue;
      if (reportedFailuresRef.current.has(agent.id)) continue;
      reportedFailuresRef.current.add(agent.id);
      setFuseCard(agent);
      setFuseExpanded(false); // each new death arrives compact
    }
  }, [agents, status]);

  // The card used to sit there until dismissed, so the last failure of a run
  // stayed parked over the scene indefinitely. It now clears itself — unless
  // it has been opened for reading, in which case it waits for the user.
  useEffect(() => {
    if (!fuseCard || fuseExpanded) {
      return;
    }
    const timerId = window.setTimeout(() => setFuseCard(null), FUSE_CARD_DWELL_MS);
    return () => window.clearTimeout(timerId);
  }, [fuseCard, fuseExpanded]);

  const dismissFuseCard = useCallback(() => {
    setFuseCard(null);
    setFuseExpanded(false);
  }, []);

  const healthBarAgents = useMemo(() => agents, [agents]);
  const sceneAgentSignature = useMemo(
    () => agents.map((agent) => `${agent.id}:${agent.renderType}`).join("|"),
    [agents],
  );

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    phaseRef.current = transitionPhase;
  }, [transitionPhase]);

  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  useEffect(() => {
    highlightRef.current = highlight;
    if (!highlight) {
      lastHighlightTokenRef.current = null;
    }
  }, [highlight]);

  useEffect(() => {
    onExitCompleteRef.current = onExitTransitionComplete;
  }, [onExitTransitionComplete]);

  useEffect(() => {
    workspaceModeRef.current = workspaceMode;
  }, [workspaceMode]);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    stressFactorRef.current = stressFactor;
  }, [stressFactor]);

  useEffect(() => {
    if (!rootRef.current || !canvasRef.current) {
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let exitCompleteFired = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let controls: OrbitControlsInstance | null = null;
    let particleTexture: import("three").CanvasTexture | null = null;
    let smokeTextureRef: import("three").CanvasTexture | null = null;
    let blowoutTexturesRef: BlowoutTextures | null = null;
    let flowSystemRef: CurrentFlowAnimationSystem | null = null;
    let lightningRef: LightningFlowSystem | null = null;
    let cleanupPointer: (() => void) | null = null;
    let reframe: (() => void) | null = null;

    const agentObjects = new Map<
      string,
      {
        group: import("three").Group;
        core: import("three").Object3D | null;
        materials: import("three").MeshStandardMaterial[];
        // Each material's ORIGINAL colour and finish, so charring can work from
        // a fixed reference every frame instead of lerping cumulatively.
        materialColors: import("three").Color[];
        materialFinish: {
          metalness: number;
          roughness: number;
          opacity: number;
        }[];
        baseColor: import("three").Color;
        smoke: SmokePlume | null;
        /**
         * Casing fragments, flame, sparks and the scorch mark left on the
         * bench. Built LAZILY at the moment the part dies rather than up front:
         * a bench that finishes with no casualties should not have paid for
         * six sets of debris, and a phone should not be carrying flame sprites
         * for parts that are doing fine.
         */
        blowout: BlowoutKit | null;
        /** Invisible, generous tap target — the only thing selection raycasts. */
        pick: import("three").Mesh;
        /**
         * Half the body's smallest cross-section. The wound is sized against
         * this so a torn signal diode and a torn battery each look torn, rather
         * than one being swallowed by its own hole.
         */
        bodyRadius: number;
        // The failure flash is a real LIGHT at the failure site plus a small
        // glare core — not a uniform emissive wash over the whole body. See
        // the failed-branch comment for why that distinction is the whole
        // difference between "it blew up" and "it got selected".
        flashLight: import("three").PointLight;
        flashCore: import("three").Sprite;
        /**
         * The expanding shell of the event — what actually reads at arena
         * distance. The glare core is under a unit across on a board twenty
         * units wide, so on a phone it was a speck however bright it got:
         * brightness does not carry across a wide shot, SIZE and MOTION do.
         * This blows out past the part, thins as it goes, and is gone.
         */
        flashHalo: import("three").Sprite;
        /**
         * Lights the part makes ITSELF (LED lens, lamp envelope) — empty for
         * every part that isn't an emitter. Distinct from flashLight, which is
         * the part being destroyed rather than the part working.
         */
        emitterLights: import("three").PointLight[];
      }
    >();

    void Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("three/examples/jsm/environments/RoomEnvironment.js"),
    ]).then(([THREE, controlsModule, roomModule]) => {
      if (isDisposed || !rootRef.current || !canvasRef.current) {
        return;
      }

      // Kept so the dust-mote slider can rebuild its buffer without re-entering
      // this effect (and tearing down the scene) just to get at the module.
      threeRef.current = THREE;

      const { OrbitControls } = controlsModule;
      const { RoomEnvironment } = roomModule;
      const root = rootRef.current;
      const canvas = canvasRef.current;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#020617");
      scene.fog = new THREE.FogExp2("#020617", 0.032);

      // The arena used to render at desktop settings on a phone: MSAA on, and
      // up to 2x device pixel ratio. On a Pixel that is roughly 4x the pixels
      // of the panel plus multisampling, which is most of the choppiness.
      // Dropping to 1.5x cuts the fragment load ~44%, and at that density MSAA
      // buys little on a ~400 ppi screen.
      const onPhone = isMobile();
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !onPhone,
        alpha: false,
        powerPreference: "high-performance",
      });
      liveRendererRef.current = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, onPhone ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Without tone mapping, everything above 1.0 clips flat and everything
      // below sits crushed and grey — which is most of why the dome read as
      // dim and dull. Neutral (not ACES) on purpose: ACES desaturates bright
      // colour hard, and the whole point of this pass is that a red LED looks
      // RED. Neutral rolls off the highlights and leaves the hue alone.
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.18;

      const isWorkspace = workspaceModeRef.current;

      // near=1 rather than 0.1. Depth precision is governed by the near/far
      // ratio, and OrbitControls clamps the camera to minDistance 4, so 0.1
      // bought nothing and cost an order of magnitude of depth resolution —
      // which is what let coplanar surfaces z-fight on mobile in the first place.
      const camera = new THREE.PerspectiveCamera(45, 1, 1, 200);
      // The board is as wide as the roster is long, so every pose backs off in
      // step with it — otherwise a six-part bench runs off both edges of a
      // portrait phone while a two-part bench sits lost in the middle.
      const frameScale = Math.min(
        Math.max(circuitHalfX(agentsRef.current.length) / circuitHalfX(2), 1),
        1.85,
      );
      const entryPosition = new THREE.Vector3(0, 17, 24).multiplyScalar(frameScale);
      // Pulled back so the WHOLE dome + all gladiators frame in by default; the
      // user can zoom in freely once they take control.
      const arenaPosition = new THREE.Vector3(14, 11, 14).multiplyScalar(frameScale);
      // Workspace flow poses: a framed cinematic preview held behind the open
      // panel, and a pulled-back pose used for the exit sweep.
      const previewPosition = new THREE.Vector3(0, 17, 24).multiplyScalar(frameScale);
      const exitPosition = new THREE.Vector3(0, 22, 32).multiplyScalar(frameScale);
      // Aimed slightly IN FRONT of the board's centre, because the bench is no
      // longer symmetric about z = 0: the supply panel hangs off the front edge.
      // Splitting the difference keeps the parts near the middle of the frame
      // while pulling the panel up off the bottom edge, so both faders are in
      // the opening shot without backing the camera off and shrinking everything.
      const cameraTarget = new THREE.Vector3(0, 1.8, SUPPLY_PANEL_OUTBOARD * 0.6);
      camera.position.copy(isWorkspace ? previewPosition : entryPosition);

      controls = new OrbitControls(
        camera,
        renderer.domElement,
      ) as OrbitControlsInstance;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.copy(cameraTarget);
      if (isWorkspace) {
        // Flagship "full 3D 360°" control — the works: free orbit, deep zoom, pan.
        controls.enablePan = true;
        controls.minDistance = 4;
        controls.maxDistance = 42;
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = Math.PI * 0.88;
      } else {
        controls.enablePan = false;
        controls.minDistance = 8;
        controls.maxDistance = 26;
        controls.minPolarAngle = Math.PI / 5;
        controls.maxPolarAngle = Math.PI / 2.05;
      }

      // ── Cinematic idle sweep ──────────────────────────────────────────────
      // When nobody is touching the camera, the dome slowly orbits itself so the
      // scene is never a frozen still. The instant the user grabs it (OrbitControls
      // fires 'start'), the sweep cuts out and they get full manual 360°; it resumes
      // a couple of seconds after they let go. autoRotate is toggled per-frame in
      // the animate loop (only while the user actually holds control).
      const IDLE_RESUME_MS = 2600;
      let lastCameraInteract = Number.NEGATIVE_INFINITY;
      const orbit = controls; // non-null here; stable ref for the deferred listener
      orbit.autoRotate = false;
      orbit.autoRotateSpeed = 1.4;
      orbit.addEventListener("start", () => {
        lastCameraInteract = performance.now();
        orbit.autoRotate = false;
      });


      // ── Lighting ──────────────────────────────────────────────────────────
      // The rig used to be a strong BLUE ambient plus a blue key and an orange
      // key of near-equal power. An ambient light multiplies every material's
      // colour, so a blue one tints literally everything blue; the two coloured
      // keys then painted one side of every part blue and the other orange.
      // That is the "everything pulses orange/blue and looks selected" problem
      // at its source — no part could ever show its own colour.
      //
      // Now: the light that SHADES the parts is white, and the colour in the
      // scene comes from the parts themselves. The blue/orange stay only as
      // low, behind-the-parts rim accents, so the dome still feels like an
      // arena instead of a photo studio.
      const skyFill = new THREE.HemisphereLight("#e8f0ff", "#2a1c12", 1.5);
      scene.add(skyFill);

      // ── Image-based lighting ──────────────────────────────────────────────
      // The single biggest thing standing between this bench and looking real.
      //
      // A MeshStandardMaterial is physically based, which means a metal takes
      // almost none of its appearance from diffuse colour — it is defined by
      // what it REFLECTS. With no environment there was nothing to reflect, so
      // every metal surface fell back on flat speculars from three point lights
      // and read as painted plastic: the tinned copper rails, the battery can,
      // the component leads. (The comment on the emitter materials already said
      // as much; this is that gap closed.)
      //
      // A prefiltered room gives every metal and every glossy body something to
      // pick up — soft gradients across a curve, a bright edge where it turns
      // away from the light. Held at a low intensity because the arena is a dark
      // dome: the point is reflection DETAIL, not lifting the blacks, and a
      // bright room would flatten the deliberately theatrical key/rim rig.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      scene.environmentIntensity = 0.34;
      pmrem.dispose();

      // ── Shadows ───────────────────────────────────────────────────────────
      // The other half of it. Nothing here cast a shadow, so every part sat ON
      // the board without being ON it — the eye reads contact from the shadow
      // under an object, and with none, parts float however well they are lit.
      //
      // One caster only: the key. Multiple shadow-casting lights on a phone is
      // a real cost for a muddle of crossing shadows, and a single strong
      // source is how a bench or a lab bay is actually lit anyway.
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Just enough neutral lift that nothing falls to pure black.
      const ambientLight = new THREE.AmbientLight("#ffffff", 0.45);
      scene.add(ambientLight);

      // Key: warm white, high and front-left. This is what actually reveals
      // material colour, so it carries most of the exposure.
      const keyLight = new THREE.DirectionalLight("#fff4e6", 3.4);
      keyLight.position.set(-6, 14, 9);
      keyLight.castShadow = true;
      // Sized to the BOARD, not to the dome. A directional shadow camera spread
      // over the whole 30-unit floor would spend its whole resolution on empty
      // ground and give the parts a handful of texels each — soft to the point
      // of being a smudge.
      const shadowSpan = circuitHalfX(agentsRef.current.length) + 4;
      keyLight.shadow.camera.left = -shadowSpan;
      keyLight.shadow.camera.right = shadowSpan;
      keyLight.shadow.camera.top = shadowSpan;
      keyLight.shadow.camera.bottom = -shadowSpan;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 40;
      keyLight.shadow.mapSize.set(onPhone ? 1024 : 2048, onPhone ? 1024 : 2048);
      // Bias against the acne that a low-angle key produces on near-flat
      // surfaces (the floor, the faceplate) — normalBias handles the sloped
      // cases the constant bias cannot.
      keyLight.shadow.bias = -0.0008;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      // Fill: cooler, opposite side, well under the key so it shapes the far
      // face without recolouring it.
      const fillLight = new THREE.DirectionalLight("#dbe6ff", 1.1);
      fillLight.position.set(8, 6, 7);
      scene.add(fillLight);

      // Coloured rims live BEHIND the parts: they draw an edge, they don't wash
      // a face. A tenth of their old intensity, and out past the ring.
      const blueRim = new THREE.PointLight("#60a5fa", 26, 44, 2);
      blueRim.position.set(-13, 5, -12);
      scene.add(blueRim);

      const orangeRim = new THREE.PointLight("#fb923c", 22, 40, 2);
      orangeRim.position.set(13, 5, -11);
      scene.add(orangeRim);

      // Top-down spot so the part under test is the brightest thing in frame —
      // the dome should read as lit for a match, not evenly flooded.
      const centreSpot = new THREE.SpotLight("#ffffff", 90, 26, Math.PI / 5, 0.55, 2);
      centreSpot.position.set(0, 15, 0);
      centreSpot.target.position.set(0, 1, 0);
      scene.add(centreSpot);
      scene.add(centreSpot.target);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(15, 72),
        new THREE.MeshStandardMaterial({
          color: "#020617",
          emissive: new THREE.Color("#0f172a"),
          metalness: 0.5,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      scene.add(floor);

      // ── Selection ring ────────────────────────────────────────────────────
      // Deliberately the SAME ring the workspace draws under a selected
      // component, down to the numbers: legacy.html's `createSelectionRing()`
      // is RingGeometry(0.62, 0.82, 40) in #9fd8ff at 0.38 opacity, laid flat
      // at y = 0.03 with depthTest off and renderOrder 999, breathing on
      // 1 + sin(t * 0.004) * 0.06.
      //
      // Matching it exactly is the point rather than an economy: "selected"
      // has to mean one thing everywhere in the app, and a second, prettier
      // ring invented for the arena would teach the user that the arena's
      // selection is a different kind of thing from the workspace's. It is not.
      //
      // One ring, moved — not one per part — same as the workspace.
      const selectionRing = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.82, 40),
        new THREE.MeshBasicMaterial({
          color: 0x9fd8ff,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      selectionRing.rotation.x = -Math.PI / 2;
      selectionRing.renderOrder = 999;
      selectionRing.visible = false;
      scene.add(selectionRing);

      // ── The victor's mark ─────────────────────────────────────────────────
      // The end of a run had no moment in it. A part was declared "most robust"
      // in a line of text at the bottom of the screen while the bench sat there
      // looking exactly as it had a second earlier — so the thing the entire
      // test exists to determine was the least visible event on the board.
      //
      // ONE ring and ONE light, created up front and moved to whoever wins,
      // rather than a set per part. The light especially has to exist from the
      // start: three recompiles every material in the scene when the light
      // COUNT changes, and doing that at the final beat would stutter the
      // payoff shot. (Same rule the failure flash and the flame follow.)
      const victorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.16, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffc24d,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      victorRing.rotation.x = -Math.PI / 2;
      victorRing.renderOrder = 998;
      victorRing.visible = false;
      scene.add(victorRing);

      // A warm key from above, so the survivor is physically lit apart from a
      // board full of corpses — the one part still worth looking at.
      const victorLight = new THREE.PointLight("#ffca63", 0, 9, 2);
      victorLight.position.set(0, 3.4, 0);
      scene.add(victorLight);

      const grid = new THREE.GridHelper(30, 30, "#60a5fa", "#f97316");
      const gridMaterial = grid.material as import("three").Material & {
        opacity?: number;
        transparent?: boolean;
      };
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.34;
      scene.add(grid);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(11, 0.09, 16, 96),
        new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          emissive: new THREE.Color("#38bdf8").multiplyScalar(2.1),
          roughness: 0.22,
          metalness: 0.28,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      scene.add(ring);

      const particleGeometry = new THREE.BufferGeometry();
      fillAtmosphere(
        THREE,
        particleGeometry,
        atmosphereCountFor(atmosphereDensityRef.current),
      );
      particleTexture = createCanvasTexture(THREE, "rgba(96, 165, 250, 0.95)");
      const particleMaterial = new THREE.PointsMaterial({
        color: "#bfdbfe",
        size: 0.3,
        transparent: true,
        opacity: 0.8,
        map: particleTexture,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);
      atmosphereRef.current = particles;

      // One soft round puff, shared by every plume and tinted per family.
      const smokeTexture = createCanvasTexture(THREE, "rgba(255,255,255,0.85)");
      smokeTextureRef = smokeTexture;

      // Ember and scorch, built once for the whole bench. Every blowout kit
      // borrows these rather than baking its own — a canvas texture is uploaded
      // to the GPU on first render, and paying for that upload on the frame a
      // part explodes is the one place a hitch would be seen.
      const blowoutTextures = createBlowoutTextures(THREE);
      blowoutTexturesRef = blowoutTextures;

      // The parts are wired into a circuit now rather than ringed around the
      // dome, so their seats come from the board layout. A solo bench still
      // lands dead centre — circuitSeat handles that without a special case.
      const seatCount = agentsRef.current.length;
      // Measured as each part is built, then handed to the board so every stub
      // wire stops at the real end of the real component.
      const boardSeats: { x: number; halfZ: number }[] = [];

      agentsRef.current.forEach((agent, seatIndex) => {
        const group = createComponentGroup(THREE, agent.renderType, agent.accent);
        const seat = circuitSeat(seatIndex, seatCount);
        group.position.set(seat.x, 0, seat.z);
        // Every part faces the same way now: they are rungs in a shared circuit,
        // not gladiators turned to face a centre point.
        group.rotation.y = 0;
        boardSeats.push({
          x: seat.x,
          halfZ: (group.userData.halfSpan as number) ?? 0.75,
        });
        scene.add(group);
        // Collect the materials that HEAT and CHAR — the component body and its
        // leads, and nothing else.
        //
        // This used to traverse the whole group, which swept in the dais and the
        // marker ring: a resistor cooking to failure took its pedestal down with
        // it, so the finished effect was a dark brown blob sitting on an equally
        // dark brown pedestal and you could not tell where the part ended. The
        // dais is furniture — it never gets hot and it never burns. It still
        // catches the failure flash, because that flash is a real light.
        // Every solid in the part casts. Receiving too, so a lead throws a
        // shadow onto the body it comes out of — self-shadowing is most of
        // what makes a small object read as a real object rather than a decal.
        group.traverse((object) => {
          const mesh = object as import("three").Mesh;
          if ((mesh as { isMesh?: boolean }).isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        const heatBody = group.getObjectByName("core") ?? group;
        const materials: import("three").MeshStandardMaterial[] = [];
        const emitterLights: import("three").PointLight[] = [];
        heatBody.traverse((object) => {
          // Only an emitter ever puts a light inside the core, so anything
          // found here is one — the failure flash hangs off the group instead.
          if ((object as { isPointLight?: boolean }).isPointLight) {
            emitterLights.push(object as import("three").PointLight);
            return;
          }
          const mesh = object as import("three").Mesh;
          const material = mesh.material as
            | import("three").MeshStandardMaterial
            | undefined;
          if (material && (material as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) {
            materials.push(material);
          }
        });

        // Only families that actually smoke get a plume, and it hangs off the
        // GROUP rather than the body — so the smoke keeps rising straight while
        // the part beneath it convulses and slumps.
        const agentSmokeSpec = failSignatureFor(
          agent.family,
          agent.failureVisual,
        ).smoke;
        let agentPlume: SmokePlume | null = null;
        if (agentSmokeSpec) {
          agentPlume = createSmokePlume(THREE, agentSmokeSpec, smokeTexture);
          // Leaves from the top of the part, which now sits at rail height
          // rather than up on a plinth.
          agentPlume.object.position.y = CIRCUIT_RAIL_Y + 0.25;
          agentPlume.object.visible = false;
          group.add(agentPlume.object);
        }

        // ── Selection hit box ─────────────────────────────────────────────
        // The same device the workspace uses (legacy.html raycasts a per-part
        // `selectionBox`, not the mesh), and it is not an optimisation — it is
        // the difference between selection working and not working on a phone.
        // A resistor body is a couple of millimetres of screen from twenty
        // units out, and a thumb cannot reliably hit it; a tap that misses by
        // three pixels reads as "tapped the empty board" and deselects.
        //
        // Raycasting a dedicated box also EXCLUDES the rest of the group. That
        // matters more than it looks: three's raycaster does not skip objects
        // with `visible = false`, so the failure flash sprites — which sit at
        // the part's centre and are camera-facing quads — were live hit
        // targets the whole time, and so was the debris once a part had blown
        // up. Picking would have quietly meant "somewhere near this part".
        //
        // Invisible via the MATERIAL, not `mesh.visible`, for that same reason:
        // the mesh must stay raycastable while drawing nothing.
        const pickBounds = new THREE.Box3().setFromObject(heatBody);
        const pickSize = pickBounds.getSize(new THREE.Vector3());
        const pickCenter = pickBounds.getCenter(new THREE.Vector3());
        const pickBox = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        // Floors and padding, so a small part gets a target a thumb can land
        // on while a big one is not wrapped in a box far larger than itself.
        pickBox.scale.set(
          Math.max(pickSize.x, 0.8) + 0.45,
          Math.max(pickSize.y, 0.6) + 0.4,
          Math.max(pickSize.z, 0.8) + 0.45,
        );
        // The group carries no rotation or scale (rungs all face the same way),
        // so world → local is a plain subtraction of the seat.
        pickBox.position.copy(pickCenter).sub(group.position);
        pickBox.name = "pickBox";
        group.add(pickBox);

        // A real light at the failure site. Created up front (intensity 0) so
        // three.js never has to recompile shaders mid-battle.
        //
        // Reach is 16, not the 6 it was: at 6 the light died before it got off
        // the part, so a part could blow up without the rails, the floor or the
        // parts either side of it registering anything. A failure has to light
        // the ROOM — that is what makes the other parts look like bystanders to
        // it instead of unrelated objects that happen to be nearby.
        const flashLight = new THREE.PointLight("#ffe2b0", 0, 16, 2);
        flashLight.position.set(0, CIRCUIT_RAIL_Y, 0);
        group.add(flashLight);

        // The expanding shell. Additive and unlit, so it reads as light in the
        // air rather than as an object, and it is added BEFORE the core so the
        // core stays the brightest thing at the centre of it.
        const flashHalo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: smokeTexture,
            color: "#ffffff",
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        flashHalo.position.set(0, CIRCUIT_RAIL_Y, 0);
        flashHalo.scale.setScalar(0.6);
        flashHalo.visible = false;
        group.add(flashHalo);

        // The glare core — the bit of the event too bright to resolve.
        const flashCore = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: smokeTexture,
            color: "#ffffff",
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        flashCore.position.set(0, CIRCUIT_RAIL_Y, 0);
        flashCore.scale.setScalar(0.4);
        flashCore.visible = false;
        group.add(flashCore);

        agentObjects.set(agent.id, {
          group,
          core: group.getObjectByName("core") ?? null,
          flashLight,
          flashCore,
          flashHalo,
          emitterLights,
          materials,
          materialColors: materials.map((material) => material.color.clone()),
          materialFinish: materials.map((material) => ({
            metalness: material.metalness,
            roughness: material.roughness,
            opacity: material.opacity,
          })),
          smoke: agentPlume,
          blowout: null,
          pick: pickBox,
          // Smallest cross-section, because that is the dimension a casing
          // splits ACROSS — a resistor is long and thin, and a wound scaled to
          // its length would be a crater running the whole body.
          bodyRadius: Math.max(
            Math.min(pickSize.x, pickSize.y, pickSize.z) * 0.5,
            0.07,
          ),
          // Resting emissive is a NEUTRAL near-black, NOT the accent — otherwise the
          // heat loop bathes the whole part in its team colour at rest (one all
          // orange, one all blue), which read as a permanent "highlighted" state.
          // Parts now show their real materials and only glow HOT (orange→white) as
          // they're actually stressed.
          //
          // Genuinely HUELESS on purpose. This used to be #141821, a navy — which
          // left every part faintly glowing blue, and on a metallic body under the
          // arena's blue key light that stacked up into a violet sheen that
          // pulsed with temperature. Cold parts must add no colour at all.
          baseColor: new THREE.Color("#121212"),
        });
      });

      // Built last, because it wires itself to the parts' measured ends.
      const board = createCircuitBoard(THREE, boardSeats);
      scene.add(board);
      const switchObject = board.getObjectByName("switch") ?? null;
      const panelObject = board.getObjectByName("supplyPanel") ?? null;
      const switchLever = board.getObjectByName("switchLever") ?? null;
      const switchHaloMesh = board.getObjectByName("controlHalo") ?? null;
      const panelHaloMesh = board.getObjectByName("panelHalo") ?? null;
      const switchGlowLight = board.getObjectByName("switchGlow") ?? null;
      const panelGlowLight = board.getObjectByName("panelGlow") ?? null;

      // ── The two faders ────────────────────────────────────────────────────
      // Each one's handle, its grab target, and the span the handle slides
      // along, resolved once. The span comes off the panel rather than being
      // recomputed here, so the geometry stays the single source of truth.
      const readoutUpdaters = panelObject?.userData.readoutUpdaters as
        | Record<string, (value: string) => void>
        | undefined;
      const panelTrackHalfZ = (panelObject?.userData.trackHalfZ as number) ?? 0.6;
      const panelColumnCenterZ =
        (panelObject?.userData.columnCenterZ as number) ?? 0;
      const panelTrackY = (panelObject?.userData.trackY as number) ?? CIRCUIT_RAIL_Y;
      /** Every column's indicator, plus the grab target on the two that drag. */
      const columns = PANEL_COLUMNS.map((column) => ({
        ...column,
        handle: board.getObjectByName(`supplyHandle-${column.key}`) ?? null,
        hit: column.fader
          ? (board.getObjectByName(`supplyHit-${column.fader}`) ?? null)
          : null,
      }));

      /**
       * Where each fader sits, 0 → 1. `volts` mirrors the load ramp, so it is
       * derived every frame rather than stored — the ramp moves it while a test
       * runs. `ohms` has no other driver, so this IS its value.
       */
      let seriesOhms = 0;

      /**
       * The bench's live W.I.R.E. figures, refreshed by every solve and read by
       * the dashboard readout. Held here rather than recomputed in the render
       * loop so the panel shows exactly what the solver produced.
       */
      let benchVolts = 0;
      let benchAmps = 0;
      let benchOhms = Number.POSITIVE_INFINITY;
      let benchWatts = 0;

      // ── The throw ────────────────────────────────────────────────────────
      // The lever used to ease between its two positions on an exponential
      // lerp, which is the motion of something weightless — it arrived
      // apologetically and read as nothing happening. A real panel toggle has
      // mass and an over-centre spring: it RESISTS, tips, then goes on its own
      // and slams into the stop. That shape is the whole feel of the control,
      // so it is spelled out as a curve rather than left to a damping factor.
      let leverFrom = SWITCH_ROT_OPEN;
      let leverTo = SWITCH_ROT_OPEN;
      let leverStartedAt = -Infinity;
      let leverWasClosed = false;

      /**
       * The bench's nominal supply, V — the highest voltage any part on the
       * rails is rated at. The volts fader reads in real volts against this,
       * because "2.4×" is a multiplier, not a supply setting, and a bench supply
       * is a thing you set in volts.
       */
      const nominalVoltsFor = () =>
        agentsRef.current.reduce(
          (highest, agent) => Math.max(highest, agent.metrics.voltage),
          0,
        ) || 9;

      // ── Throwing the switch starts the test ───────────────────────────────
      // The control is the circuit itself. A tap that lands on the switch runs
      // the bench; a tap that was really a camera drag must not, so the gesture
      // has to have stayed put and been short.
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      let pressX = 0;
      let pressY = 0;
      let pressAt = 0;
      /** Where the pointer has got to, so a long press can tell it has wandered. */
      let lastMoveX = 0;
      let lastMoveY = 0;
      /** legacy.html's LONG_PRESS_DURATION / LONG_PRESS_MOVEMENT_THRESHOLD. */
      const LONG_PRESS_MS = 500;
      const LONG_PRESS_SLOP = 15;
      let longPressTimer = 0;
      /** Set when a long press fires, so the release does not ALSO select. */
      let longPressFired = false;
      // ── Fader drag ──────────────────────────────────────────────────────────
      // Sliding a fader is a drag, not a tap, so it takes the gesture away from
      // OrbitControls for its duration — otherwise the camera orbits while you
      // are trying to set a value.
      //
      // The handle follows the finger absolutely rather than by accumulated
      // delta: the pointer ray is intersected with the panel's own plane and the
      // hit's X along the track IS the value. That is how every slider behaves,
      // it survives any camera angle, and it means tapping a spot on the track
      // jumps there instead of requiring a drag from wherever the handle sits.
      let draggingFader: SupplyFaderKey | null = null;
      /**
       * The load the volts fader started this drag at, with no series
       * resistance in the way. The reported load is this times the divider, so
       * repeated move events during one drag cannot compound.
       */
      let dragBaseLoad = 1;
      const panelPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -(panelTrackY + 0.12),
      );
      const planeHit = new THREE.Vector3();

      const ndcFor = (event: PointerEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect();
        pointerNdc.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        return pointerNdc;
      };

      /**
       * Total resistance of the live branches in parallel — the load the supply
       * is actually driving. Needed to turn the two fader positions into the one
       * "× nominal" load the stress engine still speaks, because the series
       * fader's effect depends entirely on what it is dividing against.
       */
      const parallelOhms = (): number => {
        let conductance = 0;
        for (const agent of agentsRef.current) {
          if (agent.phase === "failed") continue;
          const ohms = agent.metrics.resistance;
          if (ohms > 0) conductance += 1 / ohms;
        }
        return conductance > 0 ? 1 / conductance : Number.POSITIVE_INFINITY;
      };

      /**
       * Report the load the two faders jointly produce. Series resistance forms
       * a divider with the parallel bank, so turning it up genuinely starves the
       * parts — the same answer the solver gets, computed here because the
       * stress engine needs it before the next solve.
       */
      const reportLoad = (openCircuitLoad: number) => {
        const bank = parallelOhms();
        const divider = Number.isFinite(bank)
          ? bank / (bank + seriesOhms + ARENA_SOURCE_OHMS)
          : 1;
        onLoadChangeRef.current?.(openCircuitLoad * divider);
      };

      /** The fader position (0 → 1) the pointer is currently over. */
      const faderTFor = (event: PointerEvent): number | null => {
        raycaster.setFromCamera(ndcFor(event), camera);
        if (!raycaster.ray.intersectPlane(panelPlane, planeHit)) {
          return null;
        }
        // Into the panel's own space, then along the column. The tracks run
        // front-to-back now, so this reads Z, and it is INVERTED: -Z is away
        // from the camera, which is up the screen, which has to mean more.
        const localZ = planeHit.z - ((board.userData.panelZ as number) ?? 0);
        const top = panelColumnCenterZ - panelTrackHalfZ;
        return clampNum((localZ - top) / (panelTrackHalfZ * 2), 0, 1) * -1 + 1;
      };

      const applyFader = (event: PointerEvent) => {
        const t = faderTFor(event);
        if (t === null) {
          return;
        }
        if (draggingFader === "volts") {
          // The fader spans NOMINAL → the scenario's rated peak. Its bottom end
          // is 1× nominal, not zero: turning the bench off is the switch's job,
          // and it now sits right beside this fader on the same panel. A fader
          // whose bottom half is all "off" wastes the travel that matters.
          const ratedMax = stressMaxRef.current ?? 3;
          reportLoad(1 + t * (ratedMax - 1));
        } else {
          // Squared, so the low end — where a few tens of ohms actually matter
          // against a bank of hundreds — gets most of the travel. A linear kilohm
          // would put every useful value in the first millimetre.
          seriesOhms = t * t * SERIES_OHMS_MAX;
          reportLoad(dragBaseLoad);
        }
      };

      /**
       * Which part is under a given pointer event, if any. Raycasts only the
       * dedicated hit boxes — see the pickBox comment for why the rest of the
       * group must be excluded.
       */
      const agentUnderPointer = (event: PointerEvent): string | null => {
        raycaster.setFromCamera(ndcFor(event), camera);
        let hit: string | null = null;
        let nearest = Number.POSITIVE_INFINITY;
        agentObjects.forEach((entry, id) => {
          const hits = raycaster.intersectObject(entry.pick, false);
          if (hits.length > 0 && hits[0].distance < nearest) {
            nearest = hits[0].distance;
            hit = id;
          }
        });
        return hit;
      };

      const clearLongPress = () => {
        if (longPressTimer !== 0) {
          window.clearTimeout(longPressTimer);
          longPressTimer = 0;
        }
      };

      const handlePointerDown = (event: PointerEvent) => {
        pressX = event.clientX;
        pressY = event.clientY;
        pressAt = performance.now();
        longPressFired = false;

        if (!renderer) {
          return;
        }

        // ── Long-press to edit ──────────────────────────────────────────────
        // The workspace's gesture, its timing (LONG_PRESS_DURATION = 500ms in
        // legacy.html) and its haptic. Selecting a part in the arena told you
        // what it was; this is how you CHANGE it, which is the question a
        // stress bench is for: "would a half-watt part have survived that?"
        const pressedAgent = agentUnderPointer(event);
        if (pressedAgent && onLongPressAgentRef.current) {
          clearLongPress();
          longPressTimer = window.setTimeout(() => {
            longPressTimer = 0;
            // A drag that wandered is a camera move, not a press.
            if (Math.hypot(lastMoveX - pressX, lastMoveY - pressY) > LONG_PRESS_SLOP) {
              return;
            }
            longPressFired = true;
            navigator.vibrate?.(50);
            onLongPressAgentRef.current?.(pressedAgent);
          }, LONG_PRESS_MS);
        }
        raycaster.setFromCamera(ndcFor(event), camera);
        for (const column of columns) {
          if (!column.hit || !column.fader) continue;
          if (raycaster.intersectObject(column.hit, true).length === 0) continue;
          draggingFader = column.fader;
          // Undo the divider currently in force, so the drag's base is the load
          // the volts fader alone is asking for.
          const bank = parallelOhms();
          const divider = Number.isFinite(bank)
            ? bank / (bank + seriesOhms + ARENA_SOURCE_OHMS)
            : 1;
          dragBaseLoad = divider > 0 ? stressFactorRef.current / divider : 1;
          if (controls) {
            controls.enabled = false;
          }
          applyFader(event);
          break;
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        lastMoveX = event.clientX;
        lastMoveY = event.clientY;
        // Moving far enough is an orbit, so the pending edit is abandoned
        // rather than firing under a finger that has clearly changed its mind.
        if (
          longPressTimer !== 0 &&
          Math.hypot(event.clientX - pressX, event.clientY - pressY) > LONG_PRESS_SLOP
        ) {
          clearLongPress();
        }
        if (!draggingFader || !root) {
          return;
        }
        applyFader(event);
        // Count moving a fader as touching the camera, so the idle orbit does
        // not snap back into motion the instant it is released.
        lastCameraInteract = performance.now();
        // Stop the page itself scrolling under the drag on a phone.
        event.preventDefault();
      };

      const endDialDrag = () => {
        if (!draggingFader) {
          return;
        }
        draggingFader = null;
        if (controls) {
          controls.enabled = true;
        }
      };
      const handlePointerUp = (event: PointerEvent) => {
        const wasFaderDrag = draggingFader !== null;
        clearLongPress();
        endDialDrag();
        // A long press already did something. Letting the release fall through
        // would open the editor and toggle the selection off underneath it.
        if (longPressFired) {
          longPressFired = false;
          return;
        }
        if (wasFaderDrag || !renderer) {
          return;
        }
        // 14px, not 10: a thumb on glass always slides a little, and the old
        // threshold was tight enough that a deliberate tap often registered as
        // a camera drag and did nothing at all. Legacy allows 15px of travel
        // before it stops calling something a press.
        const drift = Math.hypot(event.clientX - pressX, event.clientY - pressY);
        if (drift > 14 || performance.now() - pressAt > 700) {
          return;
        }
        raycaster.setFromCamera(ndcFor(event), camera);
        if (
          switchObject &&
          raycaster.intersectObject(switchObject, true).length > 0
        ) {
          onStartTestRef.current?.();
          return;
        }

        // ── Tap a part to select it ─────────────────────────────────────────
        // The same model as selecting a component in the workspace, and the
        // reason it had to exist: the parts were the only things on this board
        // you could not touch. The switch and the faders both took taps, so the
        // board taught you that things on it are tappable and then did nothing
        // when you tapped the components — which is the one thing the whole
        // bench is about.
        //
        // Selecting also aims the camera: a part you have chosen to watch beats
        // whichever part the ramp currently thinks is worst-off, so you can
        // stay on the component you came to see even while another one is
        // closer to failing. Tapping the empty board clears it and hands the
        // camera back to the action.
        // Nearest first, so a part in front is not selected through by one
        // behind it. Same resolver the long press uses, so a tap and a hold
        // can never disagree about which part is under the finger.
        const hitAgentId = agentUnderPointer(event);
        // Re-tapping the selected part deselects it, so the gesture is its own
        // undo and there is no "how do I get out of this" state.
        onSelectAgentRef.current?.(
          hitAgentId && hitAgentId === selectedAgentIdRef.current
            ? null
            : hitAgentId,
        );
      };
      canvas.addEventListener("pointerdown", handlePointerDown);
      // Non-passive: the dial drag calls preventDefault to stop the page
      // scrolling out from under a thumb that is turning the knob.
      canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
      canvas.addEventListener("pointerup", handlePointerUp);
      // Releasing outside the canvas must still end the drag, or the camera
      // stays locked out.
      window.addEventListener("pointercancel", endDialDrag);
      window.addEventListener("pointerup", endDialDrag);
      cleanupPointer = () => {
        clearLongPress();
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", endDialDrag);
        window.removeEventListener("pointerup", endDialDrag);
      };

      // ── Current flow ──────────────────────────────────────────────────────
      // The SAME system the rest of the app animates current with, not a second
      // one written for the arena. It already works in the ground plane (its
      // Vec2 is {x, z} and it renders carriers at y = 0.2), so the only thing it
      // needs is lifting to rail height.
      const boardHalfX = circuitHalfX(seatCount);
      const flowGroup = new THREE.Group();
      flowGroup.position.y = CIRCUIT_RAIL_Y - 0.2;
      scene.add(flowGroup);
      flowSystemRef = new CurrentFlowAnimationSystem(THREE, flowGroup);

      // The lightning bolt IS the current — the builder runs
      // FLOW_STREAM_DOT_RATIO = 0 ("lightning only"), so the carrier dots above
      // stay off and this is what the user sees. Its own group at y = 0 because
      // the bolt paths carry real rail-height y values.
      const lightningGroup = new THREE.Group();
      scene.add(lightningGroup);
      lightningRef = new LightningFlowSystem(THREE, lightningGroup);
      // Backed off from the app-wide standard on purpose. The bench runs a rung
      // per part between two rails and you see every one of them at once, so
      // full-strength bolts stack into a curtain of light that the components
      // fail behind — and watching the part fail IS the arena. The builder has
      // no such problem, which is why this is set here and the standard's own
      // constants are left alone. See setIntensity.
      lightningRef.setIntensity(0.72);

      // Per-branch paths are rebuilt when the currents move enough to matter:
      // the system bakes each path's current in at creation, and the whole point
      // here is that the streams track the load ramp and go dead when a part
      // fails. Throttled by a signature so a steady bench rebuilds nothing.
      let flowSignature = "";
      const rebuildFlow = () => {
        const system = flowSystemRef;
        if (!system) {
          return;
        }
        // Board geometry, read once — the solver and the flow paths must both
        // use the SAME numbers the visible wiring was built from.
        const batteryHalf = (board.userData.batteryHalf as number) ?? 0.9;

        // ── Solve the board, don't assert it ──────────────────────────────
        // Branch currents come out of the app's MNA solver run over the board's
        // real topology, so a low-resistance part pulls harder because Ohm's law
        // says it must — not because its datasheet said so. The load ramp turns
        // the supply up, which is what a bench supply does: E and I scale
        // linearly, P as the square.
        //
        // `load` is the RAIL voltage as a multiple of nominal, i.e. the series
        // fader's divider is already in it (see `reportLoad`). So the series
        // resistance must NOT be added to `sourceOhms` as well — that would
        // charge the bench for it twice.
        const load = stressFactorRef.current;
        const agents = agentsRef.current;
        const railVolts =
          agents.reduce(
            (highest, agent) => Math.max(highest, agent.metrics.voltage),
            0,
          ) * load;
        const solution = solveArenaCircuit({
          geometry: {
            halfX: boardHalfX,
            halfZ: CIRCUIT_HALF_Z,
            batteryHalf,
            seats: boardSeats,
          },
          branches: agents.map((agent) => ({
            id: agent.id,
            ohms: agent.metrics.resistance,
            open: agent.phase === "failed",
          })),
          railVolts,
          sourceOhms: ARENA_SOURCE_OHMS,
          switchClosed: true,
        });
        // If the solve fails, fall back to the old per-part figure rather than
        // killing the current entirely — a dead board reads as a bug, and the
        // ramp is still meaningful even without the exact distribution.
        // ── The bench's live W.I.R.E. figures ─────────────────────────────
        // Published for the dashboard readout BEFORE the throttle below, so the
        // four metrics keep updating even on frames where the flow paths are
        // unchanged and do not need rebuilding. Every one of them comes off the
        // solve rather than being recomputed here, so the numbers on the panel
        // and the current in the wires cannot disagree.
        //
        // E is the rail voltage, I the total the supply delivers, R what it
        // sees, and W the product. NOT the sum of the parts' rated draws.
        benchVolts = railVolts;
        benchAmps = solution.status === "solved" ? solution.totalAmps : 0;
        benchOhms =
          solution.status === "solved"
            ? solution.equivalentOhms
            : Number.POSITIVE_INFINITY;
        benchWatts = benchVolts * benchAmps;

        const branchAmps =
          solution.status === "solved"
            ? solution.branchAmps
            : agents.map((agent) =>
                agent.phase === "failed" ? 0 : Math.abs(agent.metrics.current) * load,
              );
        const signature = branchAmps
          .map((amps) => amps.toFixed(3))
          .join("|");
        if (signature === flowSignature) {
          return;
        }
        flowSignature = signature;
        system.clear();
        lightningRef?.clear();
        let total = 0;
        boardSeats.forEach((seat, index) => {
          const amps = branchAmps[index] ?? 0;
          total += amps;
          // A failed part is an open branch — no path, so no current at all,
          // while its neighbours keep running. That is what parallel buys us.
          if (!Number.isFinite(amps) || amps <= 0) {
            return;
          }
          // Lay the bolt at rail height so it rides inside the conductor.
          const path = buildFlowPath(boardHalfX, seat.x, batteryHalf).map((point) => ({
            ...point,
            y: CIRCUIT_RAIL_Y,
          }));
          // speedFactor 1: this branch's real current is known, so energy comes
          // from the current itself rather than a cosmetic resistance damper —
          // the same "Track A" rule the builder follows.
          lightningRef?.addBolt(path, amps, 1, 1);

          // The same current, through the part's body. The loop bolt above
          // already passes through this span geometrically, but the component
          // shell is opaque, so it vanishes at the part — which reads as
          // current going AROUND the resistor instead of through it. This is
          // that span again, drawn regardless of depth so it glows through the
          // body: a thinner filament, since it is inside a solid.
          const through = [
            { x: seat.x, y: CIRCUIT_RAIL_Y, z: -seat.halfZ },
            { x: seat.x, y: CIRCUIT_RAIL_Y, z: 0 },
            { x: seat.x, y: CIRCUIT_RAIL_Y, z: seat.halfZ },
          ];
          // Tagged per seat so the render loop can pull it back as this part
          // reacts. Current arriving at a cool part is worth seeing; current
          // painted over a part that is scorching and glowing is competing with
          // the very thing it is causing.
          lightningRef?.addBolt(through, amps, 1, 1, {
            drawThrough: true,
            radiusScale: 0.7,
            tag: `part-${index}`,
          });
        });

        // ── Through the battery ─────────────────────────────────────────────
        // Inside the cell, current runs between the terminals — that is the
        // source, not a gap in the circuit. Same treatment as the parts: drawn
        // regardless of depth so it reads through the cell's opaque body. It
        // carries the TOTAL current, since every branch's return passes through
        // here, so on a multi-part bench this is the brightest, fattest bolt on
        // the board — which is exactly what "total current" should look like.
        if (Number.isFinite(total) && total > 0) {
          lightningRef?.addBolt(
            [
              { x: -boardHalfX, y: CIRCUIT_RAIL_Y, z: batteryHalf },
              { x: -boardHalfX, y: CIRCUIT_RAIL_Y, z: 0 },
              { x: -boardHalfX, y: CIRCUIT_RAIL_Y, z: -batteryHalf },
            ],
            total,
            1,
            1,
            { drawThrough: true, radiusScale: 0.7 },
          );
        }

        system.setCurrentIntensity(Number.isFinite(total) ? total : 0);
      };
      rebuildFlow();

      /**
       * Keep the circuit centred in the space actually LEFT for it.
       *
       * The canvas is full-bleed, but the bottom of it is covered by the fixed
       * console — so composing to the canvas centre put the board's middle
       * behind the dashboard, and the bench sat low no matter what the camera
       * did. Panning the camera down would "fix" it only for one pose and
       * would fight the orbit; this fixes the FRAME instead, so it holds while
       * the scene is being orbited, auto-rotated or driven by the camera work.
       *
       * `setViewOffset` is exactly the tool: it renders a window of a larger
       * virtual image. Declaring the virtual frame taller by the console's
       * height and displaying the window BELOW that extra band lifts the
       * composed centre into the visible band, without touching the camera,
       * the target, or the projection anywhere else.
       */
      const applyViewFrame = (width: number, height: number) => {
        const inset = Math.max(0, Math.min(bottomInsetRef.current, height * 0.5));
        camera.aspect = width / Math.max(height, 1);
        if (inset < 1) {
          camera.clearViewOffset();
        } else {
          camera.setViewOffset(width, height + inset, 0, inset, width, height);
        }
        camera.updateProjectionMatrix();
      };

      const resize = () => {
        if (!rootRef.current || !renderer) {
          return;
        }
        const width = rootRef.current.clientWidth;
        const height = rootRef.current.clientHeight;
        renderer.setSize(width, height, false);
        applyViewFrame(width, height);
      };
      // Re-framed when the console's height changes too, not only when the
      // window does — opening a sheet on the dashboard makes it taller, and the
      // circuit should recentre into what is left rather than hide behind it.
      reframe = () => {
        if (!rootRef.current) return;
        applyViewFrame(rootRef.current.clientWidth, rootRef.current.clientHeight);
      };

      resize();
      // Hand the re-frame out, so a console that grows (a sheet opening) can
      // recentre the circuit without waiting for the canvas itself to resize —
      // it never does, since the canvas is full-bleed underneath.
      reframeRef.current = reframe;
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);

      const tempVector = new THREE.Vector3();
      /**
       * Scratch list for the nameplate stacking pass. Declared out here and
       * emptied at the end of each frame rather than allocated inside the
       * animate loop — this runs 60 times a second.
       */
      /** Lazily-cached W.I.R.E. value nodes — see the readout block below. */
      let wireEls: Record<"w" | "i" | "r" | "e", HTMLElement | null> | null =
        null;
      const plateLayout: {
        element: HTMLElement;
        x: number;
        bottom: number;
        width: number;
        height: number;
        visible: boolean;
      }[] = [];
      // Reusable target for the panel-open preview: a slow cinematic sway that
      // keeps the framed hero shot feeling alive without handing over control.
      const previewDrift = new THREE.Vector3();
      const previewRadius = Math.hypot(previewPosition.x, previewPosition.z);
      const attackFlashUntil = new Map<string, number>();
      // When each part first entered "failed", so the plume and the charring
      // can run on their own clock from the moment of failure.
      const failedAt = new Map<string, number>();
      let lastFrameTime = 0;
      // When the bench finished, so the survivor can cool down from that moment.
      let completedAt = 0;
      /**
       * When the current run started.
       *
       * The camera cuts to a part that just failed, and `failedAt` survives the
       * end of a run — so re-running within a few seconds of a death made the
       * camera snap onto LAST run's corpse the instant the new run began. That
       * is the stray sweep right at the start of a battle: it was reacting to
       * an event from the previous run. Deaths older than the current run do
       * not count.
       */
      let battleStartedAt = 0;
      let lastStatus = statusRef.current;
      // Reusable colours for the per-frame thermal glow (avoid per-agent allocs).
      const heatHot = new THREE.Color("#ff5512");
      const heatWhite = new THREE.Color("#ffe2b0");
      const charColor = new THREE.Color("#140d06");
      // Overheating discolouration, BEFORE anything is hot enough to glow: the
      // scorched-toast brown a cooking resistor or a baked epoxy body goes.
      const scorchColor = new THREE.Color("#4a2a11");
      // Dull cherry red — the FIRST visible light any material gives off (~600°C).
      const heatDullRed = new THREE.Color("#8c1400");
      const tmpHeatColor = new THREE.Color();
      const ringMaterial = ring.material as import("three").MeshStandardMaterial;
      const clampNum = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      let phaseStartTime = 0;
      let lastPhase = phaseRef.current;
      // Workspace flow: latches true once the cinematic sweep into the arena
      // finishes, after which the user holds full orbit control until the panel
      // re-opens (which resets it) or the arena exits.
      let workspaceSweepDone = false;

      // ── Camera-in on the part under test ──────────────────────────────────
      // A run used to play out entirely in the wide establishing shot, where a
      // resistor is a few dozen pixels on a phone: the death was loud but the
      // COOKING that led to it was invisible.
      //
      // The camera now pushes in — but only on things that give nothing away.
      // The first attempt rode whichever part was currently worst-off, and
      // that had to go: it made the camera a LEADING indicator, sitting on the
      // part about to die and announcing the result before the bench did. See
      // the target selection below for what it is allowed to look at instead.
      //
      // So the ramp still has no subject unless you pick one. That is a live
      // tension, not a settled design: "watch it cook" and "don't spoil it"
      // cannot both be had from a camera that follows the loser.
      //
      // Three rules keep it from being a nuisance:
      //  - it never fights the user. Touching the camera hands control straight
      //    back (same idle gate as the auto-orbit) and abandons the push-in.
      //  - it keeps the user's own AZIMUTH and only changes what it is looking
      //    at and from how far. Whipping around to a canned angle would throw
      //    away the side of the bench they chose to watch from.
      //  - it puts back what it took: the pose it pushed in FROM is restored
      //    when the run ends, so the bench is framed again for the result.
      /** How far out from the part the close pose sits, horizontally. */
      const CHASE_RADIUS = 6.6;
      /** And how far above it — a low ringside angle, not the map view. */
      const CHASE_HEIGHT = 3.2;
      /**
       * How long the camera stays on a part after it dies.
       *
       * Long enough for the casing to tear, the flame to take and the debris
       * to land — the blowout's own longest act is the burn, and cutting away
       * mid-flame wastes the one shot the run is built around.
       */
      const FAILURE_HOLD_MS = 4200;
      /**
       * How long the winner's shot holds before the camera gives the bench
       * back.
       *
       * It used to hold forever, and that broke the thing you do next: the
       * switch lives on the supply panel at the front edge, so a camera parked
       * on the winner put the control you need to run again off-screen and you
       * had to drag your way back to it every single time. A payoff shot that
       * costs you the next run is not a payoff.
       */
      const VICTOR_HOLD_MS = 3600;
      /**
       * How long the camera has to deliver you to a part you selected before it
       * gives up and lets go anyway.
       */
      const SELECTION_DELIVER_MS = 2200;
      /**
       * The wide beat at the top of a run, before the camera goes anywhere.
       *
       * You have to be shown the whole bench before being shown one part of
       * it, or the close-up has no context: a resistor filling the frame means
       * nothing if you never saw it was one of four. It also covers the throw
       * itself, which is a bench-wide event — the flow lighting up along both
       * rails is the shot there, not any single component.
       */
      const ESTABLISH_MS = 1600;
      /**
       * How long the camera dwells on each part when it is walking the field.
       *
       * Long enough to actually watch something cook — a part visibly browns
       * and swells over seconds, not frames — and short enough that with a
       * full bench of six you come back around before the ramp has moved on.
       */
      const ROTATE_DWELL_MS = 3400;
      const chaseLook = new THREE.Vector3();
      const chaseDesired = new THREE.Vector3();
      const chaseDir = new THREE.Vector3();
      /** The pose to hand back when the run ends. Null while not pushed in. */
      let chaseHandoff: import("three").Vector3 | null = null;
      /** Last selection the camera reacted to — see the gate in the driver. */
      let chaseSelection: string | null = selectedAgentIdRef.current;
      /** When that selection changed, so the move can time out. */
      let chaseSelectionAt = 0;
      /**
       * True once a selection's push-in has arrived. Selecting a part SHOWS it
       * to you; it does not impound the camera. Holding it forever meant that
       * after tapping a part you had to deselect before you could look at
       * anything else — including the switch.
       */
      let chaseDelivered = false;
      // ── The field walk ────────────────────────────────────────────────────
      // With nothing selected the camera visits every part in turn, and the
      // ORDER is shuffled once per pass rather than taken at random each time.
      //
      // The distinction matters more than it sounds. Drawing a part at random
      // every dwell repeats and starves: the same resistor three times running
      // while another is never visited at all, which does not read as variety,
      // it reads as broken. A shuffled pass gives both halves — every part is
      // seen exactly once per cycle, and no two runs play in the same sequence,
      // so a re-run of the same bench is not the same film.
      //
      // What it must never be is an order derived from stress, temperature or
      // remaining life. That would leak the standings through the edit, which
      // is the spoiler the worst-off chase was deleted for. Shuffled order
      // carries no information at all, which is exactly what is wanted.
      let walkOrder: string[] = [];
      let walkCursor = 0;
      let rotateAt = 0;

      /** Every part still alive, in roster order. */
      const livingAgents = (): string[] => {
        const ids: string[] = [];
        agentObjects.forEach((_entry, id) => {
          const failed = failedAt.get(id);
          // A corpse has nothing left to show and its death has already had
          // its own cut. Dropping it reveals nothing — a failed part is
          // visibly, loudly failed from any angle on the board.
          if (failed != null && failed >= battleStartedAt) {
            return;
          }
          ids.push(id);
        });
        return ids;
      };

      /** Fisher-Yates, so every ordering is equally likely. */
      const reshuffleWalk = (time: number): void => {
        const ids = livingAgents();
        for (let i = ids.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        walkOrder = ids;
        walkCursor = 0;
        rotateAt = time;
      };

      /**
       * The part the walk is on this frame, or null if there is nobody left.
       *
       * Re-shuffles at the end of a pass and whenever a death has emptied the
       * remaining order, so the walk never stalls on a part that is gone.
       */
      const walkTarget = (time: number): string | null => {
        if (time - rotateAt > ROTATE_DWELL_MS) {
          walkCursor += 1;
          rotateAt = time;
        }
        // Prune first: a part that died mid-pass must not hold a slot.
        if (walkOrder.length > 0) {
          const living = new Set(livingAgents());
          const pruned = walkOrder.filter((id) => living.has(id));
          if (pruned.length !== walkOrder.length) {
            // Keep the cursor pointing at the same part where possible, so one
            // death elsewhere on the bench does not cut away from the part you
            // are currently watching.
            const current = walkOrder[walkCursor];
            walkOrder = pruned;
            const kept = current ? pruned.indexOf(current) : -1;
            walkCursor = kept >= 0 ? kept : walkCursor;
          }
        }
        if (walkOrder.length === 0 || walkCursor >= walkOrder.length) {
          reshuffleWalk(time);
        }
        return walkOrder[walkCursor] ?? null;
      };

      /**
       * Drives the close-up. Returns true when it has the camera this frame,
       * so the caller knows to leave the idle auto-orbit alone.
       */
      const driveActionCamera = (time: number, frameDelta: number): boolean => {
        if (!controls) {
          return false;
        }
        // Time-based, so the move damps identically at 60 and 120fps.
        const k = 1 - Math.exp(-frameDelta / 420);

        // Tapping a part necessarily touches the canvas, which trips the "user
        // is driving, hands off" gate below — so a fresh selection would sit
        // there doing nothing for the length of the idle window. A tap on a
        // part is not the user taking the camera, it is the user AIMING it, so
        // a changed selection clears that gate outright.
        const selection = selectedAgentIdRef.current;
        if (selection !== chaseSelection) {
          chaseSelection = selection;
          chaseSelectionAt = time;
          chaseDelivered = false;
          lastCameraInteract = Number.NEGATIVE_INFINITY;
        }

        const userHasIt =
          draggingFader !== null || time - lastCameraInteract < IDLE_RESUME_MS;

        if (userHasIt) {
          // They took the wheel: drop the push-in AND the debt. Restoring a
          // pose over a framing they chose themselves is the same rudeness as
          // moving the camera under their thumb.
          chaseHandoff = null;
          return false;
        }

        // A part the user has TAPPED outranks everything: they asked to watch
        // that one, and the camera arguing with them about which component is
        // more interesting is the whole reason this needed a manual override.
        // It also works when the bench is idle, which is what makes selection
        // useful for lining up a shot before a run rather than only during one.
        //
        // Deliver-and-release is IDLE behaviour only. During a run a selected
        // part is ridden for the whole ramp (see the target block below) —
        // letting go after arriving would be right for "show me that one" and
        // wrong for "watch that one cook", and the difference between those two
        // is entirely whether a test is running.
        if (selection && !chaseDelivered && statusRef.current !== "battling") {
          const picked = agentObjects.get(selection);
          if (picked) {
            chaseLook.set(
              picked.group.position.x,
              CIRCUIT_RAIL_Y + 0.35,
              picked.group.position.z,
            );
            chaseDir.subVectors(camera.position, controls.target);
            chaseDir.y = 0;
            if (chaseDir.lengthSq() < 1e-4) {
              chaseDir.set(0, 0, 1);
            }
            chaseDir.normalize();
            chaseDesired.copy(chaseLook).addScaledVector(chaseDir, CHASE_RADIUS);
            chaseDesired.y = chaseLook.y + CHASE_HEIGHT;
            camera.position.lerp(chaseDesired, k);
            controls.target.lerp(chaseLook, k);
            // Once you are there, the camera is YOURS again — and it owes
            // nothing back, because you asked to be here. Holding on instead
            // meant that after tapping a part you had to deselect before you
            // could reach anything else, the switch included.
            if (
              camera.position.distanceToSquared(chaseDesired) < 0.3 ||
              time - chaseSelectionAt > SELECTION_DELIVER_MS
            ) {
              chaseDelivered = true;
              chaseHandoff = null;
            }
            return true;
          }
        }

        // ── What the camera is allowed to look at ───────────────────────────
        // It must never be a LEADING indicator. This used to ride whichever
        // part `activeAgentId` said was worst-off, which meant the camera sat
        // on the part that was about to die — so it announced the result
        // before the bench did and gave the whole run away. A camera that
        // knows the answer is worse than no camera.
        //
        // So it only ever REACTS:
        //   the part the user picked   — their call, and no spoiler in it
        //   the winner, once complete  — the run is over, nothing left to give
        //   a part that JUST failed    — the reveal happens as it happens
        // and otherwise it stays out of the way and leaves the wide shot up,
        // which is also where you can watch every part cook at once.
        let target: string | null = null;

        if (statusRef.current === "complete") {
          // The victor's shot — held, then handed back. This is the one moment
          // the bench genuinely has a subject, but it is also the moment right
          // before you want to run again, and the switch is on the panel at
          // the front edge. Holding the close-up indefinitely meant every
          // re-run started with the user dragging the camera off the winner to
          // find the control. Let the shot land, then release.
          target =
            time - completedAt < VICTOR_HOLD_MS ? winnerIdRef.current : null;
        } else if (statusRef.current === "battling") {
          // The most recent death, while it is still worth looking at. Newest
          // wins outright — if two parts go within a second of each other the
          // camera should be on the second one, not still admiring the first.
          let newest = -Infinity;
          failedAt.forEach((failedTime, id) => {
            if (
              failedTime > newest &&
              failedTime >= battleStartedAt &&
              time - failedTime < FAILURE_HOLD_MS
            ) {
              newest = failedTime;
              target = id;
            }
          });

          // Nothing has just died, so the ramp gets a subject rather than the
          // wide shot it used to play out in. Two ways in, and which one is
          // right is the user's call, made simply by whether they tapped a
          // part:
          //
          //   selected — ride THAT part for the whole ramp. They asked to
          //     watch it cook, and cutting away from it to be even-handed
          //     would be the camera overruling an explicit instruction.
          //   nothing selected — walk the field, shuffled (see above), so
          //     every part is watched and none is singled out.
          //
          // Both wait out the establishing beat: the throw is a bench-wide
          // event, and a close-up before you have seen the whole board has
          // nothing to be close to.
          if (!target && time - battleStartedAt > ESTABLISH_MS) {
            target = selection && agentObjects.has(selection)
              ? selection
              : walkTarget(time);
          }
        }

        if (!target) {
          if (!chaseHandoff) {
            return false;
          }
          // Nothing to look at: hand the shot back where it was taken from,
          // then let go for good.
          camera.position.lerp(chaseHandoff, k);
          controls.target.lerp(cameraTarget, k);
          if (
            camera.position.distanceToSquared(chaseHandoff) < 0.09 &&
            controls.target.distanceToSquared(cameraTarget) < 0.01
          ) {
            chaseHandoff = null;
          }
          return true;
        }

        const entry = agentObjects.get(target);
        if (!entry) {
          return false;
        }

        if (!chaseHandoff) {
          chaseHandoff = camera.position.clone();
        }

        // The seat, not the mesh: the part itself is shaking, and a camera
        // that tracked the shake would cancel it out on screen.
        chaseLook.set(
          entry.group.position.x,
          CIRCUIT_RAIL_Y + 0.35,
          entry.group.position.z,
        );
        // Keep the user's viewing side — only close the distance.
        chaseDir.subVectors(camera.position, controls.target);
        chaseDir.y = 0;
        if (chaseDir.lengthSq() < 1e-4) {
          chaseDir.set(0, 0, 1);
        }
        chaseDir.normalize();
        chaseDesired
          .copy(chaseLook)
          .addScaledVector(chaseDir, CHASE_RADIUS);
        chaseDesired.y = chaseLook.y + CHASE_HEIGHT;

        camera.position.lerp(chaseDesired, k);
        controls.target.lerp(chaseLook, k);
        return true;
      };

      const animate = (time: number) => {
        if (isDisposed) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(animate);

        if (!controls || !renderer) {
          return;
        }

        // Clamped so a backgrounded tab doesn't fast-forward a whole plume in
        // one frame when the user comes back to it.
        const frameDelta = lastFrameTime
          ? Math.min(time - lastFrameTime, 64)
          : 16;
        lastFrameTime = time;

        const phase = phaseRef.current;
        if (phase !== lastPhase) {
          lastPhase = phase;
          phaseStartTime = time;
          if (phase === "exiting") {
            exitCompleteFired = false;
          }
        }
        if (phaseStartTime === 0) {
          phaseStartTime = time;
        }
        const phaseElapsed = time - phaseStartTime;

        if (workspaceModeRef.current) {
          // Workspace flow — the camera is driven entirely by panel state.
          if (phase === "exiting") {
            controls.enabled = false;
            workspaceSweepDone = false;
            camera.position.lerp(exitPosition, 0.07);
            camera.lookAt(cameraTarget);
            if (!exitCompleteFired && camera.position.distanceTo(exitPosition) < 0.8) {
              exitCompleteFired = true;
              onExitCompleteRef.current();
            }
          } else if (panelOpenRef.current) {
            // Panel open: hold a slowly swaying cinematic preview, no user
            // control. The camera arcs ±18° around the arena and gently bobs so
            // the framed hero shot reads as alive rather than a frozen still.
            controls.enabled = false;
            workspaceSweepDone = false;
            const swayAngle = Math.sin(time * 0.00018) * 0.32;
            previewDrift.set(
              Math.sin(swayAngle) * previewRadius,
              previewPosition.y + Math.sin(time * 0.0003) * 0.6,
              Math.cos(swayAngle) * previewRadius,
            );
            camera.position.lerp(previewDrift, 0.04);
            camera.lookAt(cameraTarget);
          } else if (!workspaceSweepDone) {
            // Panel just collapsed: cinematic sweep into the interactive pose.
            controls.enabled = false;
            camera.position.lerp(arenaPosition, 0.06);
            camera.lookAt(cameraTarget);
            if (camera.position.distanceTo(arenaPosition) < 0.4) {
              workspaceSweepDone = true;
              controls.enabled = true;
              controls.update();
            }
          } else {
            // Sweep complete: full orbit + zoom in the user's hands, with the
            // cinematic idle sweep resuming whenever they haven't touched it.
            //
            // Dragging a fader LOCKS the camera. This is re-asserted every frame
            // on purpose: the pointerdown handler disabling `controls` was not
            // enough, because this line used to run right behind it and switch
            // control straight back on — so the world orbited under the thumb
            // that was trying to set a value.
            controls.enabled = !draggingFader;
            // The close-up outranks the idle orbit: both only run when nobody
            // is touching anything, and orbiting the board while pushed in on
            // one part would swing that part straight out of frame.
            const chasing = driveActionCamera(time, frameDelta);
            controls.autoRotate =
              !chasing &&
              !draggingFader &&
              time - lastCameraInteract > IDLE_RESUME_MS;
            controls.update();
          }
        } else {
          // Non-workspace (full-screen) flow: drive the camera along the fixed
          // cinematic entry/exit path, then hand control to OrbitControls once
          // the battle is active so free-orbit can take hold.
          const cinematicT =
            phase === "entering"
              ? Math.min(phaseElapsed / 1800, 1)
              : phase === "exiting"
                ? 1 - Math.min(phaseElapsed / 900, 1)
                : 1;
          if (phase !== "active") {
            camera.position.lerpVectors(entryPosition, arenaPosition, cinematicT);
          }
          controls.enabled = phase === "active" && !draggingFader;
          const chasing =
            phase === "active" && driveActionCamera(time, frameDelta);
          controls.autoRotate =
            controls.enabled &&
            !chasing &&
            time - lastCameraInteract > IDLE_RESUME_MS;
          controls.update();
        }


        if (statusRef.current !== lastStatus) {
          lastStatus = statusRef.current;
          if (statusRef.current === "complete") {
            completedAt = time;
          }
          if (statusRef.current === "battling") {
            battleStartedAt = time;
            // A fresh shuffle per run — that is what stops a re-run of the
            // same bench from being the same film. Cleared rather than
            // reshuffled here so the order is drawn when the walk actually
            // starts, by which time the roster is settled.
            walkOrder = [];
            walkCursor = 0;
            rotateAt = time;
          }
        }

        ring.rotation.z += 0.0015;
        particles.rotation.y += 0.0011;

        // ── The victor's moment ─────────────────────────────────────────────
        // Swells in over the second after the bench calls it, rather than
        // snapping on: the result should ARRIVE. Held from `completedAt`, the
        // same clock the survivor cools down on, so the light comes up as the
        // last part stops straining.
        {
          const winner = winnerIdRef.current
            ? agentObjects.get(winnerIdRef.current)
            : null;
          const crowning =
            statusRef.current === "complete" && winner ? true : false;
          const crownT = crowning
            ? clampNum((time - completedAt) / 900, 0, 1)
            : 0;
          victorRing.visible = crownT > 0.01;
          victorLight.intensity = crownT * 5.2;
          if (winner && crownT > 0) {
            victorRing.position.set(
              winner.group.position.x,
              0.028,
              winner.group.position.z,
            );
            victorLight.position.set(
              winner.group.position.x,
              3.4,
              winner.group.position.z,
            );
            // Overshoots and settles, then breathes — a ring that simply
            // appeared at its final size would read as another readout rather
            // than as something being awarded.
            const settle =
              crownT < 1
                ? Math.sin(crownT * Math.PI * 0.5) * 1.18
                : 1 + Math.sin(time * 0.0026) * 0.035;
            victorRing.scale.setScalar(settle);
            (victorRing.material as import("three").MeshBasicMaterial).opacity =
              crownT * 0.85;
          }
        }

        // Park the selection ring under whatever is selected, breathing on the
        // workspace's own curve. Follows the part's SEAT, not its body: the
        // body trembles and convulses, and a ring that chased it would read as
        // part of the failure rather than as the thing you picked.
        {
          const picked = selectedAgentIdRef.current
            ? agentObjects.get(selectedAgentIdRef.current)
            : null;
          selectionRing.visible = Boolean(picked);
          if (picked) {
            selectionRing.position.set(
              picked.group.position.x,
              0.03,
              picked.group.position.z,
            );
            selectionRing.scale.setScalar(1 + Math.sin(time * 0.004) * 0.06);
          }
        }

        // ── Throwing the switch ─────────────────────────────────────────────
        // The bench's state, and the moment the circuit comes alive. Driven by
        // `kaChunk` rather than a lerp so the lever has mass: it resists, goes
        // over centre, and slams into its stop.
        const switchClosed = statusRef.current === "battling";
        if (switchClosed !== leverWasClosed) {
          leverWasClosed = switchClosed;
          // Start from wherever the lever actually IS, so a throw reversed
          // mid-swing picks up from there instead of snapping to an end stop.
          leverFrom = switchLever ? switchLever.rotation.x : SWITCH_ROT_OPEN;
          leverTo = switchClosed ? SWITCH_ROT_CLOSED : SWITCH_ROT_OPEN;
          leverStartedAt = time;
        }
        const throwT = clampNum((time - leverStartedAt) / SWITCH_THROW_MS, 0, 1);
        if (switchLever) {
          switchLever.rotation.x = leverFrom + (leverTo - leverFrom) * kaChunk(throwT);
        }
        // The impact: everything that says the lever hit something solid. Peaks
        // the instant it lands — act 3 of the curve, at t = 0.8 — and decays
        // fast. A jolt you register rather than an animation you watch.
        const impact = throwT > 0.8 && throwT < 1 ? 1 - (throwT - 0.8) / 0.2 : 0;
        const jolt = impact * impact;
        if (switchObject) {
          // Recoil into the panel. Always ASSIGNED, never accumulated, so it
          // cannot drift the switch off its mount over repeated throws.
          switchObject.position.y = -jolt * 0.11;
        }
        if (panelObject && jolt > 0) {
          // The whole dashboard takes the hit, because a switch heavy enough to
          // clunk is bolted to something. Rebuilt from the panel's recorded base
          // position every frame rather than nudged, for the same reason.
          const basePanelX = (board.userData.panelX as number) ?? 0;
          const basePanelZ = (board.userData.panelZ as number) ?? 0;
          panelObject.position.x = basePanelX + Math.sin(time * 0.09) * jolt * 0.045;
          panelObject.position.z = basePanelZ + Math.cos(time * 0.075) * jolt * 0.03;
        }

        // ── Control affordance ──────────────────────────────────────────────
        // The switch is the test button and the dial is the load control, and
        // neither is labelled as such on the board — writing "BATTLE" on a
        // toggle explains the joke. Instead they BREATHE while the bench is
        // waiting for you and go steady once it is running, which is how a
        // physical control tells you it is armed. The switch breathes harder:
        // it is the one that actually starts the thing.
        {
          const idle = statusRef.current === "ready";
          const breath = 0.5 + Math.sin(time * 0.0032) * 0.5;
          const switchPulse = idle ? 0.42 + breath * 0.58 : 0.30;
          const dialPulse = idle ? 0.34 + breath * 0.30 : 0.26;
          if (switchHaloMesh) {
            const material = (switchHaloMesh as unknown as { material: { opacity: number } })
              .material;
            material.opacity = switchPulse;
            switchHaloMesh.scale.setScalar(idle ? 1 + breath * 0.06 : 1);
          }
          if (panelHaloMesh) {
            const material = (panelHaloMesh as unknown as { material: { opacity: number } })
              .material;
            material.opacity = draggingFader ? 0.72 : dialPulse;
          }
          if (switchGlowLight) {
            // The contacts closing. A hard spike on impact — the flash IS the
            // "chunk", since the switch makes no sound: light doing the job the
            // audio would. Sits on top of the idle breathing rather than
            // replacing it, so it reads as an event, not a state change.
            (switchGlowLight as unknown as { intensity: number }).intensity =
              1.4 + switchPulse * 2.4 + jolt * 14;
          }
          if (panelGlowLight) {
            (panelGlowLight as unknown as { intensity: number }).intensity =
              1.5 + dialPulse * 2.2;
          }
        }

        // ── The supply panel ────────────────────────────────────────────────
        // Each handle tracks its live value across the whole track, so "how hard
        // is the bench pushing, and through what" is readable off the geometry
        // without looking at any panel. Eased rather than snapped: a handle that
        // jumps reads as a glitch, one that slides reads as a load ramping.
        //
        // The volts fader has no state of its own — it IS the load, so the ramp
        // drives it while a test runs, exactly as the old dial's pointer worked.
        // ── The dashboard's four lit displays ───────────────────────────────
        // Auto-ranged: a bench reading "0.019 A" then "0.000 A" tells you
        // nothing, where "19 mA" then "0 mA" reads at a glance. Each tile skips
        // its redraw when the text is unchanged, so a steady bench is free.
        //
        // Formatted ONCE and fed to both readouts. The lit tiles on the panel
        // and the text strip under it are the same four circuit totals, so a
        // second copy of this auto-ranging would eventually drift and show the
        // bench two different currents.
        const wireText = {
          w:
            benchWatts >= 1
              ? `${benchWatts.toFixed(2)} W`
              : `${(benchWatts * 1000).toFixed(0)} mW`,
          i:
            benchAmps >= 1
              ? `${benchAmps.toFixed(2)} A`
              : `${(benchAmps * 1000).toFixed(0)} mA`,
          r: !Number.isFinite(benchOhms)
            ? "∞ Ω"
            : benchOhms >= 1000
              ? `${(benchOhms / 1000).toFixed(1)} kΩ`
              : `${benchOhms.toFixed(0)} Ω`,
          e: `${benchVolts.toFixed(1)} V`,
        };
        if (readoutUpdaters) {
          readoutUpdaters.w?.(wireText.w);
          readoutUpdaters.i?.(wireText.i);
          readoutUpdaters.r?.(wireText.r);
          readoutUpdaters.e?.(wireText.e);
        }

        // ── The dashboard's displays ────────────────────────────────────────
        // Written unconditionally, OUTSIDE the 3D-panel block that used to
        // contain them. That block only runs when a supply console exists in
        // the scene, and there usually isn't one any more — the dashboard is
        // fixed DOM at the bottom of the screen. Left where they were, the
        // bench's totals silently stopped updating the moment the 3D console
        // was retired, with nothing to indicate why.
        //
        // Cached but re-queried until found: the dashboard is a sibling
        // component and can mount after the scene's first frame, and caching a
        // null would freeze every total at its placeholder.
        if (!wireEls || !wireEls.w) {
          wireEls = {
            w: document.querySelector<HTMLElement>("[data-wire='w']"),
            i: document.querySelector<HTMLElement>("[data-wire='i']"),
            r: document.querySelector<HTMLElement>("[data-wire='r']"),
            e: document.querySelector<HTMLElement>("[data-wire='e']"),
          };
        }
        for (const key of ["w", "i", "r", "e"] as const) {
          const element = wireEls[key];
          // Only touch the DOM when the string actually changed — a steady
          // bench should cost nothing.
          if (element && element.textContent !== wireText[key]) {
            element.textContent = wireText[key];
          }
        }

        const ratedMax = stressMaxRef.current ?? 3;
        // Matches the drag mapping above: the track runs nominal → rated peak.
        const voltsT = clampNum(
          (stressFactorRef.current - 1) / Math.max(ratedMax - 1, 0.001),
          0,
          1,
        );
        const ohmsT = clampNum(Math.sqrt(seriesOhms / SERIES_OHMS_MAX), 0, 1);
        // The two GAUGES track what the circuit is doing, not what you set.
        // Referenced against the bench's own ceiling — the supply at full rated
        // load into the present resistance — so "full scale" means something
        // rather than being an arbitrary number the needle is divided by.
        const ceilingVolts = nominalVoltsFor() * ratedMax;
        const ceilingAmps =
          Number.isFinite(benchOhms) && benchOhms > 0 ? ceilingVolts / benchOhms : 0;
        const ampsT = ceilingAmps > 0 ? clampNum(benchAmps / ceilingAmps, 0, 1) : 0;
        const ceilingWatts = ceilingVolts * ceilingAmps;
        const wattsT = ceilingWatts > 0 ? clampNum(benchWatts / ceilingWatts, 0, 1) : 0;

        for (const column of columns) {
          if (!column.handle) continue;
          const t =
            column.fader === "volts"
              ? voltsT
              : column.fader === "ohms"
                ? ohmsT
                : column.key === "i"
                  ? ampsT
                  : wattsT;
          // Inverted: t = 1 is the top of the column, which is -Z. Uses the
          // SCALED centre, because the panel's scale pass has already moved
          // every child — mixing the raw constant in here would offset every
          // indicator by (1 - scale) × the centre.
          const target = panelColumnCenterZ + (1 - t * 2) * panelTrackHalfZ;

          // The handle under your finger is NOT smoothed. Easing a control you
          // are physically touching is the thing that makes it feel unresponsive
          // — the cap visibly trails the finger, and on a phone that reads as
          // the app being slow rather than as weight. A real fader is a solid
          // object: it is exactly where you are holding it.
          if (column.fader && column.fader === draggingFader) {
            column.handle.position.z = target;
            continue;
          }

          // Everything else still eases: the two GAUGES are solver output, which
          // steps whenever a branch opens, and an instrument needle that
          // teleports reads as a glitch. Time-based rather than per-frame, so
          // the damping feels identical at 60 and 120 fps instead of being
          // twice as fast on a better phone.
          const ease = 1 - Math.exp(-frameDelta * 0.014);
          column.handle.position.z +=
            (target - column.handle.position.z) * ease;
        }

        // The readout. Both values in ONE floating block anchored above the
        // panel, never on it — two labels chasing their own handles would sit on
        // the faders the moment the camera looked down the board's axis, which
        // is the exact bug this replaces. Bottom-anchored via
        // translate(-50%, -100%) and pushed clear of the panel's own projected
        // size, so it clears the control at any camera angle.
        const dialLabel = dialLabelRef.current;
        if (dialLabel && panelObject) {
          // Anchored on the FADERS, not the whole faceplate. This readout
          // describes the two faders, and keeping it off the plate's true centre
          // leaves the right-hand end — the switch bay — free for the switch's
          // own hint, so the two labels sit side by side instead of on top of
          // each other.
          const panelX = (board.userData.panelX as number) ?? 0;
          const panelZ = (board.userData.panelZ as number) ?? 0;
          tempVector.set(panelX, CIRCUIT_RAIL_Y, panelZ);
          tempVector.project(camera);
          const lx = (tempVector.x * 0.5 + 0.5) * root.clientWidth;
          const ly = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
          const onScreen = tempVector.z < 1.2 && tempVector.z > -1;

          // How big the panel actually is on screen right now. A fixed world-Y
          // offset is not enough: looking down at the board it projects to a few
          // pixels and the text lands back on the geometry.
          const panelHalfSpan = (board.userData.panelHalf as number) ?? 2.2;
          tempVector.set(panelX, CIRCUIT_RAIL_Y + panelHalfSpan, panelZ);
          tempVector.project(camera);
          const topY = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
          const clearance = Math.max(Math.abs(ly - topY), 26) + 12;

          // BELOW the panel, not above it. The panel sits at the front of the
          // board, so "above" in screen space points straight back INTO the
          // circuit — which buried this readout under the part nameplates and
          // the switch hint. Downward is the empty foreground, where nothing
          // else is competing for the pixels.
          //
          // Clamped to the viewport, because the panel is the nearest thing to
          // the camera: at the default pose "below it" runs off the bottom of
          // the scene and under the collapsed bench bar, which cost us the
          // "drag a fader" line entirely. Riding up onto the panel is a far
          // smaller sin than being invisible.
          const labelHeight = dialLabel.offsetHeight || 54;
          const maxLabelY = root.clientHeight - labelHeight - BENCH_BAR_CLEARANCE_PX;
          const labelY = Math.min(ly + clearance, maxLabelY);
          dialLabel.style.opacity = onScreen ? "1" : "0";
          dialLabel.style.transform =
            `translate3d(${lx}px, ${labelY}px, 0) translate(-50%, 0)`;

          const ohmsEl = dialLabel.querySelector<HTMLElement>("[data-fader='ohms']");
          if (ohmsEl) {
            ohmsEl.textContent =
              seriesOhms >= 1000
                ? `${(seriesOhms / 1000).toFixed(2)} kΩ`
                : `${seriesOhms.toFixed(0)} Ω`;
          }

          // The four totals are written further up, outside this block — the
          // dashboard is fixed DOM now, so its displays must update whether or
          // not a 3D console exists in the scene.
        }

        // No caption on the switch. It is a lit, breathing toggle sitting on the
        // supply panel next to two faders — it already reads as the thing you
        // operate, and narrating the gesture ("throw to test") said out loud
        // what the geometry was already saying.

        // ── Current flow ────────────────────────────────────────────────────
        // The switch is literally the circuit-closed flag: open switch, no
        // current. Carriers only exist while it is thrown.
        if (flowSystemRef) {
          flowSystemRef.setCircuitClosed(switchClosed);
          lightningRef?.setVisible(switchClosed);
          if (switchClosed) {
            rebuildFlow();
            flowSystemRef.update(frameDelta / 1000);

            // ── The flow gets out of the way as the camera closes in ────────
            // A bolt is sized for the wide shot, where it reads as current
            // running through a circuit. Pushed in on one component it is a
            // white polygon the size of the frame, and it buries the very part
            // the camera went in to watch — the component dies somewhere
            // underneath it and you see none of it.
            //
            // This only became possible today: the close-up and the lightning
            // had never been on screen together before the ramp got a subject.
            //
            // Distance, not status, drives it. Tying it to "a test is running"
            // would blink the flow the moment the camera moved, and orbiting in
            // by hand would leave the same wall of light. What matters is how
            // close you are to what you are looking at, which is exactly what
            // the fade reads. Full standard strength from 16 units out, easing
            // to a quarter at 6 — the flow never vanishes, because a dead-looking
            // circuit is its own kind of lie.
            const viewDistance = camera.position.distanceTo(controls.target);
            const closeT = Math.max(0, Math.min(1, (16 - viewDistance) / 10));
            // Down to ~12% of standard at the closest pose. The first pass
            // stopped at 28% and that was still too much: at arm's length from
            // the part, current is no longer information — you already know it
            // is flowing, that is why the thing is glowing — and every bolt is
            // just brightness competing with the scorch, the swelling and the
            // incandescence, which ARE the information.
            let flow = 0.72 * (1 - closeT * 0.88);

            // ── No artificial duck at the moment of failure ────────────────
            // There was one here, board-wide, and it had to go: the lightning
            // is a REPRESENTATION OF THE CURRENT and it follows the rules. It
            // is not a lighting effect to be mixed.
            //
            // Dimming every bolt on the board for a second and a half said
            // something false — that current everywhere fell when one part let
            // go. In a parallel bank it does not. Each surviving branch sits
            // across the same two rails at the same voltage and carries exactly
            // what it carried before; nothing about them changed.
            //
            // What DOES change is already handled, honestly, by the solve:
            //   - the failed branch opens, so its own current goes to zero and
            //     its bolt goes with it (that is setFade, and it is true);
            //   - the RAILS carry the sum of the branches, so they genuinely
            //     dim by the share the dead part was drawing.
            // Letting the solver say that is both more truthful and better
            // looking than a blanket fade, because the drop is proportional to
            // what the part was actually taking.
            //
            // The distance fade above stays, and it is a different kind of
            // thing entirely: it scales every bolt equally, so it changes how
            // much light is in the frame without touching what the flow says
            // about any branch relative to another. That is exposure, not a
            // claim about current.
            lightningRef?.setIntensity(flow);

            // _updateLightning takes absolute milliseconds, not a delta — the
            // undulation and crackle are both functions of wall-clock time.
            lightningRef?.update(time);
          }
        }

        // The arena ring heats up with the global load ramp — a calm cyan at
        // rest, glowing hot amber as the bench drives the components hard.
        const loadT =
          statusRef.current === "ready"
            ? 0
            : clampNum(
                (stressFactorRef.current - 1) /
                  Math.max(stressMaxRef.current - 1, 0.001),
                0,
                1,
              );
        ringMaterial.emissiveIntensity = 1.6 + loadT * 2.4;

        const highlightState = highlightRef.current;
        if (highlightState && highlightState.token !== lastHighlightTokenRef.current) {
          lastHighlightTokenRef.current = highlightState.token;
          let flashMs = 320;
          if (highlightState.kind === "fail") {
            // A capacitor venting takes far longer to let go than an LED
            // popping — each family dies on its own clock.
            const failing = agentsRef.current.find(
              (candidate) => candidate.id === highlightState.agentId,
            );
            const failSig = failSignatureFor(
              failing?.family ?? "generic",
              failing?.failureVisual ?? null,
            );
            flashMs = failSig.popMs;
          }
          attackFlashUntil.set(highlightState.agentId, time + flashMs);
        }

        // ── How high a nameplate may climb ─────────────────────────────────
        // The stack used to stop 6px from the top of the canvas, which put it
        // straight through the HUD strip (Parts / Conditions / Results) and up
        // under the nav. Two unrelated sets of small white text on top of each
        // other, and neither readable — and it happened wherever a part sat,
        // because a plate only has to collide with ONE neighbour to start
        // climbing.
        //
        // Measured from the strip itself rather than assumed: it wraps to two
        // rows on a narrow phone, and a hard-coded number would be wrong on
        // exactly the screens where the space is tightest. Converted into the
        // canvas's own coordinates because the strip is fixed to the viewport
        // and the plates are positioned within the scene root.
        // document, NOT root. The strip is a SIBLING of the scene, rendered by
        // the view alongside it — so root.querySelector never found it, the
        // ceiling silently stayed at its 8px default, and the clamp shipped
        // doing nothing at all. It looked correct in the diff and was inert in
        // the app, which is the worst way for a fix to be wrong.
        const hudElement = document.querySelector<HTMLElement>(".arena-quickbar");
        let plateCeiling = 8;
        if (hudElement) {
          const hudRect = hudElement.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          plateCeiling = Math.max(8, hudRect.bottom - rootRect.top + 8);
        }

        agentsRef.current.forEach((agent, seatIndex) => {
          const objectEntry = agentObjects.get(agent.id);
          if (!objectEntry) {
            return;
          }

          const { group, core, materials, materialColors, materialFinish, baseColor } =
            objectEntry;
          // Only the component body (core) ever moves under stress — the dais,
          // ring and the metrics nameplate stay rock-steady at the seat.
          const shaker = core ?? group;
          const isFailed = agent.phase === "failed";
          const isMostStressed = activeAgentIdRef.current === agent.id && !isFailed;
          const isFlashing = (attackFlashUntil.get(agent.id) ?? 0) > time;
          const severity = agent.severity;
          const seat = circuitSeat(seatIndex, agentsRef.current.length);
          const seatX = seat.x;
          const seatZ = seat.z;
          // spawnAngle no longer places anything, but it is still a stable
          // per-part number — it stays the phase offset so the shake and the
          // ember breathing don't run in lockstep across the board.
          const ph = agent.spawnAngle * 7;

          // How hot the part is running (also drives the glow). Beyond 1 = over
          // the junction limit.
          const heatT = clampNum(
            (agent.tempC - 40) / Math.max(agent.ratings.junctionLimitC - 40, 30),
            0,
            1.4,
          );

          if (isFailed) {
            // ── Death throes ── driven by the part's own family, so each
            // component dies the way that component actually dies.
            const sig = failSignatureFor(agent.family, agent.failureVisual);
            if (!failedAt.has(agent.id)) {
              failedAt.set(agent.id, time);
            }
            const sinceFail = time - (failedAt.get(agent.id) ?? time);
            const flashEnd = attackFlashUntil.get(agent.id) ?? 0;
            const popping = flashEnd > time;
            const popT = popping
              ? clampNum((flashEnd - time) / sig.popMs, 0, 1)
              : 0; // 1 → 0
            // Seat stays put; the body alone reacts, then settles.
            group.position.set(seatX, 0, seatZ);
            const coreBase = core ? 1.15 : 1;
            let flashT = 0;

            switch (sig.motion) {
              case "vent": {
                // Swells hard, splits, and jets — it puffs up before it goes.
                const swell = Math.sin((1 - popT) * Math.PI); // 0 → 1 → 0
                shaker.position.set(0, popping ? swell * 0.12 : 0, 0);
                shaker.rotation.z = 0;
                shaker.scale.set(
                  coreBase * (1 + swell * 0.22),
                  coreBase * (1 + swell * 0.45),
                  coreBase * (1 + swell * 0.22),
                );
                flashT = popping ? swell : 0;
                break;
              }
              case "burst": {
                // Splits the package: one hard punch, left small and crooked.
                const shake = popping ? 0.3 * popT : 0;
                shaker.position.x = (Math.random() - 0.5) * shake;
                shaker.position.z = (Math.random() - 0.5) * shake;
                shaker.position.y = popping ? 0.1 + popT * 0.5 : 0;
                shaker.rotation.z = popping
                  ? (Math.random() - 0.5) * 0.7 * popT
                  : 0.3;
                shaker.scale.setScalar(
                  coreBase *
                    (popping ? 0.7 + Math.sin(popT * Math.PI) * 0.85 : 0.66),
                );
                flashT = popT;
                break;
              }
              case "arc": {
                // Contacts arcing — a stuttering spark train, body unharmed.
                const striking = Math.sin(time * 0.05 + ph) > 0.2;
                shaker.position.set(0, 0, 0);
                shaker.rotation.z = 0;
                shaker.scale.setScalar(coreBase);
                flashT =
                  popping && striking ? popT * (0.5 + Math.random() * 0.5) : 0;
                break;
              }
              case "flashOut": {
                // One bright flash and it is simply, cleanly, open circuit.
                // Nothing deforms — this is how a filament or junction goes.
                shaker.position.set(0, 0, 0);
                shaker.rotation.z = 0;
                shaker.scale.setScalar(coreBase);
                flashT = popT * popT;
                break;
              }
              case "sag":
              case "smoulder":
              default: {
                // Cooks and slumps: a brief convulsion, then settles charred.
                const shake = popping ? 0.1 * popT : 0;
                const slump = 1 - popT;
                const squash = sig.motion === "sag" ? 0.4 : 0.12;
                shaker.position.x = (Math.random() - 0.5) * shake;
                shaker.position.z = (Math.random() - 0.5) * shake;
                shaker.position.y = popping ? 0.04 * popT : 0;
                shaker.rotation.z = popping
                  ? (Math.random() - 0.5) * 0.18 * popT
                  : 0;
                shaker.scale.set(
                  coreBase * (1 + slump * 0.08),
                  coreBase * (1 - slump * squash),
                  coreBase * (1 + slump * 0.08),
                );
                flashT = popT;
                break;
              }
            }
            // Every death throe above writes its vertical motion as an offset
            // from the part's seat, so the mount height is added once here
            // rather than threaded through five separate motion cases. Without
            // it a failing part drops through the board the instant it pops.
            shaker.position.y += CIRCUIT_RAIL_Y;

            // Colour + afterglow: parts that melted or vented stay molten,
            // charred ones settle to a breathing ember, cleanly-open ones
            // (LED, lamp, fuse) go stone cold and dark.
            //
            // The flash is LIGHT AT A PLACE, not a property of the object.
            // Making every material on the part emit the same bright colour at
            // once is exactly what a selection highlight does: no direction, no
            // falloff, no shading variation, leads glowing as hard as the body.
            // That also flattens the part into a single flat luminous shape,
            // which is why it looked washed-out and half-transparent. A real
            // failure lights the part FROM the failure site, so the near face
            // blows out, the far face stays dark, and the dais catches it.
            const flashLight = objectEntry.flashLight;
            const flashCore = objectEntry.flashCore;
            const flashHalo = objectEntry.flashHalo;
            if (popping && flashT > 0) {
              flashLight.color.copy(sig.hot ? heatHot : heatWhite);
              flashLight.intensity = flashT * sig.flash * 7;
              flashCore.visible = true;
              flashCore.material.color.copy(sig.hot ? heatHot : heatWhite);
              flashCore.material.opacity = Math.min(flashT * 1.2, 1);
              // Scaled by the family's own violence: a vented battery's core is
              // not the same size as a fuse quietly opening. Was a flat 0.95 max
              // for every part on the board.
              flashCore.scale.setScalar(
                0.3 + flashT * (0.5 + sig.flash * 0.42),
              );

              // The shell runs on the INVERSE of the flash: flashT counts 1 → 0
              // over the pop, so (1 - flashT) is time-since-detonation, and the
              // shell grows the whole way out while the core is collapsing.
              // Growing it WITH the core would just be a bigger core.
              const shellT = 1 - flashT;
              flashHalo.visible = true;
              flashHalo.material.color.copy(sig.hot ? heatHot : heatWhite);
              // Thins as it expands — the same light spread over more area. It
              // has to be gone by the end or it reads as a lingering bubble
              // sitting on the part rather than as a blast passing through.
              flashHalo.material.opacity =
                Math.min(flashT * 0.85, 0.6) * (1 - shellT * shellT);
              flashHalo.scale.setScalar(
                0.5 + shellT * (2.2 + sig.flash * 1.3),
              );
            } else {
              flashLight.intensity = 0;
              flashCore.visible = false;
              flashHalo.visible = false;
            }

            let failEmissive: number;
            if (popping && flashT > 0) {
              // The body itself only self-illuminates a LITTLE — it is being lit
              // by the flash, not made of flash.
              tmpHeatColor.copy(sig.hot ? heatHot : heatWhite);
              failEmissive = flashT * Math.min(sig.flash, 3) * 0.22;
            } else if (sig.ember > 0) {
              const breathe = 0.72 + Math.sin(time * 0.004 + ph) * 0.28;
              tmpHeatColor.copy(charColor).lerp(heatHot, sig.ember * 0.7 * breathe);
              failEmissive = sig.ember * breathe * 0.6;
            } else {
              tmpHeatColor.copy(charColor);
              failEmissive = 0.04;
            }
            for (const material of materials) {
              material.emissive.copy(tmpHeatColor);
              material.emissiveIntensity = failEmissive;
            }
            // A dead LED makes no light. Killing the emitter here (rather than
            // letting it fade) is the point of the moment: the thing that was
            // lighting its own dais goes out, and the seat goes dark.
            for (const light of objectEntry.emitterLights) {
              light.intensity = 0;
            }

            // ── Charring ── the body itself blackens. Without this a "burnt"
            // resistor keeps its factory beige and only the glow changes, which
            // reads as a lighting effect rather than a destroyed part. Always
            // lerped from the ORIGINAL colour so it can't creep frame to frame.
            if (sig.char) {
              const charT =
                clampNum(sinceFail / Math.max(sig.popMs, 1), 0, 1) * sig.char;
              materials.forEach((material, index) => {
                const original = materialColors[index];
                if (original) {
                  material.color.copy(original).lerp(charColor, charT);
                }
                // Soot scatters light. A burnt part must also go MATTE — left
                // glossy, a darkened body just mirrors the arena's blue key
                // light and reads as a cold purple sheen rather than as carbon.
                const finish = materialFinish[index];
                if (finish) {
                  material.metalness = finish.metalness * (1 - charT * 0.95);
                  material.roughness =
                    finish.roughness + (0.96 - finish.roughness) * charT;
                  // Soot is deposited ON the inside of the glass. A blown fuse,
                  // a burnt-out lamp and a dead LED all go from see-through to
                  // clouded — so the parts that are DELIBERATELY translucent
                  // (fuse glass 0.6, lamp envelope 0.85, LED lens 0.7) must lose
                  // that translucency as they blacken. Left transparent, a
                  // failed part keeps showing the arena through its own corpse.
                  if (finish.opacity < 1) {
                    material.opacity =
                      finish.opacity + (1 - finish.opacity) * charT;
                  }
                }
              });
            }

            // ── Plume ── only for families that actually smoke.
            const plume = objectEntry.smoke;
            if (plume) {
              plume.object.visible = true;
              plume.update(frameDelta, sinceFail);
            }

            // ── Blowout ── the part physically coming apart: casing fragments
            // thrown and left lying on the bench, a flame that lights its
            // neighbours, molten ejecta, and a scorch mark that stays.
            //
            // Built on the first frame the part is dead. Hanging it off the
            // GROUP and not the body is deliberate, the same reasoning as the
            // plume: debris that has left the package must not keep following
            // the package as it convulses and slumps. Once it is off, it is
            // off — it obeys the bench, not the part it came from.
            if (!objectEntry.blowout) {
              objectEntry.blowout = createBlowoutKit(
                THREE,
                blowoutFor(agent.family, agent.failureVisual),
                {
                  railY: CIRCUIT_RAIL_Y,
                  // Debris is made of the part it came off. materialColors[0]
                  // is the body's ORIGINAL colour — reading the live material
                  // would hand the shards whatever charring had reached by the
                  // frame the part died, so they would come out already black.
                  bodyColor: materialColors[0] ?? baseColor,
                  popMs: sig.popMs,
                  textures: blowoutTextures,
                  // The flame takes over the part's existing failure light
                  // rather than adding one — see BlowoutOptions.light.
                  light: objectEntry.flashLight,
                  bodyRadius: objectEntry.bodyRadius,
                  bodyQuaternion: core?.quaternion ?? null,
                },
              );
              group.add(objectEntry.blowout.object);
              // The wound rides the BODY so it convulses and slumps with it;
              // everything else hangs off the seat so debris that has left the
              // package stops obeying the package. See BlowoutKit.bodyObject.
              (core ?? group).add(objectEntry.blowout.bodyObject);
            }
            objectEntry.blowout.update(frameDelta, sinceFail);
          } else {
            // ── Live stress ── shake + heat ramp with how hard the part is being
            // driven (severity, temperature, OR percent-of-rating), so even a
            // robust part that never fails visibly strains as the load climbs.
            // Once the test is OVER, nothing is driving the survivor any more —
            // it cools off and settles instead of straining and glowing forever.
            // Without this the winner keeps breathing its heat glow on a dead
            // bench, which reads as "still under test".
            const coolT =
              statusRef.current === "complete"
                ? clampNum(1 - (time - completedAt) / 2600, 0, 1)
                : 1;
            const stressLevel =
              clampNum(
                Math.max(severity / 2, heatT * 0.9, agent.loadPercent / 130),
                0,
                1.3,
              ) * coolT;

            // Hand the part's body back to the part. The current running THROUGH
            // this component fades out as the component starts reacting, so what
            // you watch at the part is the scorch, the glow and the failure —
            // not a bolt drawn over the top of them. The current in the rails
            // and leads is untouched; it is only the span inside the body that
            // gives way. A failed part is an open branch and has no bolt at all.
            lightningRef?.setFade(
              `part-${seatIndex}`,
              clampNum(stressLevel * 1.15, 0, 0.92),
            );
            // A small, quick tremor on the BODY only — reads as "straining" in
            // place. The dais and the metrics nameplate never move; the heat
            // glow (below) does the heavy lifting of showing stress.
            //
            // Optional, and off is a legitimate look rather than a degraded
            // one: the tremor is the one cue here that is theatre rather than
            // instrumentation, and on a lab bench a resistor being cooked does
            // not visibly vibrate. With it off the part sits dead still and
            // discolours, glows, smokes and dies exactly as before — which
            // reads as measurement equipment instead of a video game.
            const shakeOn = componentShakeRef.current;
            const coreBase = core ? 1.15 : 1;
            const jitterAmp = shakeOn ? 0.006 + stressLevel * 0.03 : 0;
            const freq = 0.02 + stressLevel * 0.06;
            group.position.set(seatX, 0, seatZ);
            shaker.position.x = Math.sin(time * freq * 1.3 + ph) * jitterAmp;
            shaker.position.z = Math.cos(time * freq + ph) * jitterAmp;
            // Tremor ABOUT the mount height, not from zero — the part's
            // centreline has to stay level with the rails it is wired to, or it
            // sinks into the board the first frame the bench runs.
            shaker.position.y =
              CIRCUIT_RAIL_Y +
              (shakeOn
                ? Math.abs(Math.sin(time * freq)) * stressLevel * 0.02
                : 0);
            shaker.rotation.z = shakeOn
              ? Math.sin(time * freq * 1.7 + ph) * stressLevel * 0.03
              : 0;
            shaker.scale.setScalar(
              coreBase * ((isMostStressed ? 1.04 : 1.0) + stressLevel * 0.04),
            );

            const heatShown = heatT * coolT;
            // ── Thermal appearance ── nothing in a circuit GLOWS because it is
            // warm. A resistor at 150°C, well past its rating and on its way to
            // failing, emits no visible light whatsoever — it discolours, and
            // that discolouration is the only thing you can see. Glow before
            // incandescence is what made a merely-loaded part read as
            // "highlighted": a flat self-lit wash over the whole body, leads
            // included, at a temperature where nothing can emit light.
            //
            // So heat is shown in two physically-separate stages:
            //   1. SCORCH  — the body browns as it bakes. No light at all.
            //   2. GLOW    — only past the junction limit does it incandesce,
            //                and it starts at dull cherry red, not orange.
            const scorchT = clampNum((heatShown - 0.5) / 0.5, 0, 1) * 0.6;
            materials.forEach((material, index) => {
              const original = materialColors[index];
              if (original) {
                material.color.copy(original).lerp(scorchColor, scorchT);
              }
              // Baked surfaces go matte as the finish breaks down.
              const finish = materialFinish[index];
              if (finish) {
                material.roughness =
                  finish.roughness + (0.9 - finish.roughness) * scorchT;
              }
            });

            // Incandescence: 0 at the junction limit, full by ~40% over it.
            const glowT = clampNum((heatShown - 1) / 0.4, 0, 1);
            if (glowT > 0) {
              // Dull red first, THEN orange, and only white when it is truly
              // about to let go — the real colour-temperature sequence.
              tmpHeatColor
                .copy(heatDullRed)
                .lerp(heatHot, clampNum(glowT / 0.6, 0, 1))
                .lerp(heatWhite, clampNum((glowT - 0.75) / 0.25, 0, 1));
            } else {
              tmpHeatColor.copy(baseColor);
            }
            // The attack flash is the ONLY non-thermal light, and it is a brief
            // event rather than a state. Nothing gets a standing glow for being
            // the most-stressed part — that is a selection highlight, not physics;
            // the floating nameplate is what identifies it.
            const emissiveIntensity = glowT * 2.2 + (isFlashing ? 0.5 : 0);
            for (const material of materials) {
              // An emitter's lens keeps making its own light while the part is
              // working, and only surrenders its colour once the part is hot
              // enough to actually incandesce — at which point what you are
              // looking at is no longer an LED lighting up, it's an LED dying.
              const rest = material.userData.restEmissive as
                | import("three").Color
                | undefined;
              if (rest && glowT <= 0) {
                material.emissive.copy(rest);
                material.emissiveIntensity =
                  (material.userData.restEmissiveIntensity as number) * coolT +
                  (isFlashing ? 0.5 : 0);
              } else {
                material.emissive.copy(tmpHeatColor);
                material.emissiveIntensity = emissiveIntensity;
              }
            }
            // Nothing drives the survivor once the bench is over, so its light
            // fades out with the same cooldown that stops the heat glow.
            for (const light of objectEntry.emitterLights) {
              light.intensity =
                (light.userData.baseIntensity as number) * coolT;
            }

            // A part that is live again (a re-run, or a fresh test) is an
            // undamaged part: clear the char, the plume and the failure clock.
            // (Body colour/roughness are already rewritten from the originals
            // every frame above; metalness is only touched by charring.)
            if (failedAt.has(agent.id)) {
              failedAt.delete(agent.id);
              materials.forEach((material, index) => {
                const finish = materialFinish[index];
                if (finish) {
                  material.metalness = finish.metalness;
                  material.opacity = finish.opacity;
                }
              });
              objectEntry.flashLight.intensity = 0;
              objectEntry.flashCore.visible = false;
              objectEntry.flashHalo.visible = false;
              if (objectEntry.smoke) {
                objectEntry.smoke.object.visible = false;
              }
              // The wreckage goes with it. Disposed rather than hidden: the
              // debris has already landed and a re-run must throw NEW pieces
              // from the new failure, not resurrect the last run's — and the
              // scorch mark is meant to be permanent for exactly one run.
              objectEntry.blowout?.dispose();
              objectEntry.blowout = null;
            }
          }

          const healthBar = healthBarsRef.current[agent.id];
          if (!healthBar) {
            return;
          }

          // Anchor the floating metric nameplate to the part's STABLE seat, not its
          // live (jittering) group position — so the component shakes under stress
          // but its readout stays put and legible.
          // Every plate anchors over its OWN part; separation is resolved in
          // screen space once all of them have been projected, below.
          tempVector.set(seatX, NAMEPLATE_ANCHOR_Y, seatZ);
          tempVector.project(camera);

          const rawX = (tempVector.x * 0.5 + 0.5) * root.clientWidth;
          const rawY = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
          const isVisible = tempVector.z < 1.2 && tempVector.z > -1;

          // Sit the plate's BOTTOM edge on the anchor and let it grow upward,
          // instead of centring it there. Centred, the plate straddled the
          // anchor — so half of it always covered the very component whose
          // numbers it was reporting, and you could not see the part at all.
          // Bottom-aligned, it floats clear above the part with the whole model
          // visible underneath.
          const plateW = healthBar.offsetWidth || 140;
          const plateH = healthBar.offsetHeight || 44;
          const halfW = plateW / 2 + 6;
          const x = Math.min(Math.max(rawX, halfW), root.clientWidth - halfW);
          // Clamp on the plate's real extent: it occupies from (y - height - gap)
          // up to y, so the TOP is what can clip off-frame.
          const lowest = root.clientHeight - 6;
          const highest = plateH + NAMEPLATE_GAP_PX + plateCeiling;
          const y = Math.min(Math.max(rawY, highest), lowest);
          healthBar.style.opacity = isVisible ? "1" : "0";
          // Collected rather than written: a plate cannot know whether it
          // overlaps another until every plate has been projected. The stack is
          // resolved once, after this loop.
          plateLayout.push({
            element: healthBar,
            x,
            bottom: y - NAMEPLATE_GAP_PX,
            width: plateW,
            height: plateH,
            visible: isVisible,
          });
        });

        // ── Step overlapping nameplates apart ──────────────────────────────
        // Lowest plate on screen keeps its place and everything that collides
        // with it climbs, so the stack grows AWAY from the board and no plate
        // is pushed down over the parts. Only plates sharing a column move:
        // two plates side by side are already readable and lifting them would
        // just break the link between a readout and the part it belongs to.
        plateLayout.sort((a, b) => b.bottom - a.bottom);
        for (let i = 1; i < plateLayout.length; i += 1) {
          const plate = plateLayout[i]!;
          if (!plate.visible) {
            continue;
          }
          for (let j = 0; j < i; j += 1) {
            const placed = plateLayout[j]!;
            if (!placed.visible) {
              continue;
            }
            const columnGap =
              (plate.width + placed.width) / 2 + NAMEPLATE_COLUMN_PAD_PX;
            if (Math.abs(plate.x - placed.x) >= columnGap) {
              continue; // side by side — no collision to resolve
            }
            const placedTop = placed.bottom - placed.height;
            // Measured overlap, not merely "do these touch" — see
            // NAMEPLATE_OVERLAP_SLACK_PX. A few shared pixels while the bench
            // turns are fine and cost nothing; plates that hop every frame to
            // avoid them are not.
            const shared =
              Math.min(plate.bottom, placed.bottom) -
              Math.max(plate.bottom - plate.height, placedTop);
            if (shared > NAMEPLATE_OVERLAP_SLACK_PX) {
              plate.bottom = placedTop - NAMEPLATE_STACK_GAP_PX;
            }
          }
          // Never let the stack climb into the HUD: the topmost plate stops
          // below the strip rather than mixing its numbers with it.
          plate.bottom = Math.max(plate.bottom, plate.height + plateCeiling);
        }

        for (const plate of plateLayout) {
          plate.element.style.transform =
            `translate3d(${plate.x}px, ${plate.bottom}px, 0) translate(-50%, -100%)`;
        }
        plateLayout.length = 0;

        if (
          !workspaceModeRef.current &&
          phase === "exiting" &&
          phaseElapsed > 950 &&
          !exitCompleteFired
        ) {
          exitCompleteFired = true;
          onExitCompleteRef.current();
        }

        renderer.render(scene, camera);
      };

      animationFrameId = window.requestAnimationFrame(animate);
    });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);
      cleanupPointer?.();
      resizeObserver?.disconnect();
      controls?.dispose();
      particleTexture?.dispose();
      smokeTextureRef?.dispose();
      blowoutTexturesRef?.dispose();
      flowSystemRef?.dispose();
      lightningRef?.dispose();
      agentObjects.forEach((entry) => {
        entry.smoke?.dispose();
        entry.blowout?.dispose();
        entry.flashCore.material.dispose();
        entry.flashHalo.material.dispose();
      });
      renderer?.dispose();
    };
  }, [sceneAgentSignature]);

  // Hand the WebGL context back on unmount. dispose() alone does NOT release it
  // — it frees programs and render targets, but the context lives until GC, and
  // Android WebView allows only a handful at once. Leaking one per arena visit
  // eventually pushes the browser over its cap, and Chrome's response is to
  // silently kill the OLDEST live context: the builder's. That surfaces as a
  // blank workspace (no grid, no circuit) with no error anywhere, because
  // legacy.html's init() already succeeded — it just lost its canvas underneath.
  // Same reasoning, same call as Logo3D/FloatingLogo3D.
  //
  // Unmount-only on purpose. The main effect's cleanup also runs on a
  // sceneAgentSignature change, and forcing the loss there would poison the
  // shared canvas: the replacement renderer would bind an already-lost context.
  useEffect(() => {
    return () => {
      const renderer = liveRendererRef.current;
      liveRendererRef.current = null;
      renderer?.forceContextLoss?.();
    };
  }, []);

  return (
    <div ref={rootRef} className="arena-scene">
      <canvas ref={canvasRef} className="arena-scene__canvas" />
      {/* F.U.S.E.™ mark — the engine powering the failure physics, same little
          corner watermark the main builder UI carries. */}
      <div
        className="arena-fuse-watermark"
        role="img"
        aria-label="Powered by F.U.S.E.™ — Failure Understanding Simulation Engine"
      >
        ⚡ F.U.S.E.™
        <span className="arena-fuse-watermark__sub">
          Failure Understanding Simulation Engine
        </span>
      </div>
      {/* No test console. The switch on the board IS the control now — you throw
          it in 3D and the bench runs. A slab of UI parked in the middle of the
          stage was covering the very thing it was controlling. What survives is
          a single containerless readout of the load, bottom-left, out of the way. */}
      {workspaceMode && !panelOpen ? (
        <div className="arena-load-readout" aria-live="polite">
          <b>{stressFactor.toFixed(1)}×</b>
          <em>
            of {stressMax}× load
            {status === "complete"
              ? ` · ${survivorCount}/${agents.length} survived${
                  winnerName ? ` · 🏆 ${winnerName}` : ""
                }`
              : status === "battling"
                ? " · running"
                : " · throw the switch"}
          </em>
        </div>
      ) : null}
      {/*
        F.U.S.E.™ corner watermark — the same mark as the main workspace's
        bottom-left (legacy.html #fuse-watermark), same copy, same styling.
        The arena is where F.U.S.E. actually does its work, so it belongs here.
      */}
      <div
        className="fuse-watermark"
        role="img"
        aria-label="Powered by FUSE™ — Failure Understanding Simulation Engine"
      >
        ⚡ F.U.S.E.™
        <span className="fuse-watermark__sub">Failure Understanding Simulation Engine</span>
      </div>
      {/*
        The load dial's readout. Deliberately a bare floating label — the value,
        its units, and what it is a multiple OF, with no background slab. It has
        to say "of what" or "2.40×" means nothing.
      */}
      {/*
        The bench's own instrument block: what the circuit IS doing on top, what
        the controls are SET to underneath.

        The four live figures used to live only as lit displays on the dashboard
        itself. That is the right place for them on a real instrument, and they
        are still there — but they are canvas textures on a small object twenty
        units from the camera, so on a phone they read as "this thing has
        screens" rather than as numbers. The totals are the whole point of a
        bench, so they also get crisp DOM text here.
      */}
      <div ref={dialLabelRef} className="arena-dial-label">
        {/* Colour IS the label — the same ct-term-* coding used everywhere else
            in the app — so the letter can stay tiny and the value gets the
            weight. These are CIRCUIT TOTALS, not any one part's numbers. */}
        {/* The W.I.R.E. totals live on the fixed dashboard now (ArenaDashboard),
            not here and not in the scene. This label is left with the one thing
            that genuinely belongs to the 3D board. */}
        {/* Only the series resistance. The supply's volts used to be here too,
            but that is the SAME number the E tile on the panel already shows
            (both are nominal × load) — printing it twice just gave the scene
            one more label to collide with. Series R has no tile of its own:
            the R tile reads the whole circuit's resistance, which is a
            different quantity from what this fader is dialling in. */}
        <span className="arena-supply-row">
          <span className="arena-supply-row__name ct-term-resistance">series R</span>
          <b className="arena-supply-row__value ct-term-resistance" data-fader="ohms">
            0 Ω
          </b>
          <em className="arena-supply-row__ref">
            of {(SERIES_OHMS_MAX / 1000).toFixed(1)} kΩ
          </em>
        </span>
      </div>
      {/*
        The F.U.S.E. card. A part dying on screen used to be the end of the
        story; this is the engine saying WHY. Every line of it comes from
        F.U.S.E. itself — the failure mode it identified, its own narrative of
        what happened inside the part, and the conditions at the moment it let
        go — rather than from copy written here.

        A bottom sheet, not a modal: it explains the thing you are watching, so
        it must not cover it. Sits above the collapsed bench bar.
      */}
      {fuseCard && !fuseExpanded ? (
        /* Compact form: one line, tappable. A death announces itself without
           burying the thing that just died. */
        <button
          type="button"
          className="arena-fuse-card arena-fuse-card--compact"
          onClick={() => setFuseExpanded(true)}
          aria-label={`${fuseCard.name} failed — open failure report`}
        >
          <span className="arena-fuse-card__mark">⚡</span>
          <b>{fuseCard.name}</b>
          <span className="arena-fuse-card__mode">
            {fuseCard.failureName ?? "Destroyed"}
          </span>
          <span className="arena-fuse-card__peek">
            {Math.round(fuseCard.peakTempC)}°C / {Math.round(fuseCard.ratings.junctionLimitC)}°C rated
          </span>
          <span className="arena-fuse-card__more" aria-hidden>
            why ›
          </span>
        </button>
      ) : null}
      {fuseCard && fuseExpanded ? (
        <div className="arena-fuse-card" role="status" aria-live="polite">
          <div className="arena-fuse-card__head">
            <span className="arena-fuse-card__mark">⚡ F.U.S.E.™</span>
            <button
              type="button"
              className="arena-fuse-card__close"
              onClick={dismissFuseCard}
              aria-label="Dismiss failure report"
            >
              ×
            </button>
          </div>
          <div className="arena-fuse-card__title">
            <b>{fuseCard.name}</b>
            <span className="arena-fuse-card__mode">
              {fuseCard.failureName ?? "Destroyed"}
            </span>
          </div>
          {fuseCard.failureDescription ? (
            <p className="arena-fuse-card__why">{fuseCard.failureDescription}</p>
          ) : null}
          {/* The conditions that killed it — each against what it was rated for,
              because "187°C" alone is not a finding. */}
          <div className="arena-fuse-card__facts">
            <span>
              <i className="ct-term-power">peak</i>
              <b>{Math.round(fuseCard.peakTempC)}°C</b>
              <em>/ {Math.round(fuseCard.ratings.junctionLimitC)}°C rated</em>
            </span>
            <span>
              <i className="ct-term-current">load</i>
              <b>{Math.round(fuseCard.peakLoadPercent)}%</b>
              <em>of rating</em>
            </span>
            {fuseCard.failedAtLoad != null ? (
              <span>
                <i className="ct-term-voltage">failed at</i>
                <b>{fuseCard.failedAtLoad.toFixed(1)}×</b>
                <em>nominal</em>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="arena-scene__healthbars">
        {healthBarAgents.map((agent) => {
          const isFailed = agent.phase === "failed";
          // Live current at the present load — a failed (open) part carries none.
          const liveAmps = isFailed ? 0 : agent.metrics.current * stressFactor;
          const overTemp = agent.tempC > agent.ratings.junctionLimitC;
          // ── Label decluttering ────────────────────────────────────────────
          // Six full plates on a portrait phone is a traffic jam that no
          // amount of stacking solves: the previous pass pushed colliders
          // upward, which on a narrow screen just built a tower that ran off
          // the top. Every mapping and charting tool answers this the same
          // way — PRIORITY plus DETAIL ON DEMAND. One label carries the full
          // read; the rest shrink to a marker and get out of the way.
          //
          // The focused one is the part you SELECTED, or, if you have not
          // chosen, the one under the most stress — i.e. the label you would
          // have gone looking for anyway.
          const isFocus = agent.id === (selectedAgentId ?? activeAgentId);
          // What the compact form keeps is the number that decides the
          // outcome: how much of its rated power the part is being asked to
          // take. Always against its rating, never bare.
          const ratedPct =
            agent.ratings.powerRating > 0
              ? ((agent.metrics.power * stressFactor * stressFactor) /
                  agent.ratings.powerRating) *
                100
              : 0;
          return (
            <div
              key={agent.id}
              ref={(element) => {
                healthBarsRef.current[agent.id] = element;
              }}
              className={`arena-nameplate arena-nameplate--${agent.phase}${
                isFailed ? " is-defeated" : ""
              }${isFocus ? " arena-nameplate--focus" : " arena-nameplate--compact"}`}
            >
              {/* Compact form's single line. Rendered always and hidden by CSS
                  in the focused state, so switching focus costs no re-render
                  of the metrics themselves. */}
              <div className="arena-nameplate__brief">
                <span className="arena-nameplate__brief-name">
                  {agent.componentNumber || (agent.componentType || "part").toUpperCase()}
                </span>
                <span
                  className={`arena-nameplate__brief-load${
                    ratedPct > 100 ? " is-over" : ""
                  }`}
                >
                  {isFailed ? "FAILED" : `${Math.round(ratedPct)}% of rated W`}
                </span>
              </div>
              <div className="arena-nameplate__head">
                <span className="arena-nameplate__name">
                  {(agent.componentType || "part").toUpperCase()}
                </span>
                <span className="arena-nameplate__status">{PHASE_LABEL[agent.phase]}</span>
              </div>
              <div className="arena-nameplate__ident">
                {agent.componentNumber ?? ""}
                {agent.name && agent.name !== agent.componentNumber
                  ? `${agent.componentNumber ? " · " : ""}${agent.name}`
                  : ""}
              </div>
              {/* W.I.R.E. metrics, live, in their own colours — the same coding
                  the rest of the app uses for voltage / current / resistance /
                  power, so the eye can track one quantity across surfaces.
                  Ramping the load raises E and I together (R is fixed), and
                  power goes as the SQUARE of that — which is exactly why parts
                  cook long before the load number looks alarming. A failed part
                  is an open branch: no current, no power. */}
              {/* Ordered W I R E, and power is labelled W — not P. The app
                  teaches this mnemonic everywhere else (the term highlighting,
                  the builder's readout, the dashboard's lit tiles), so calling
                  the same quantity P here taught a second name for no reason.
                  Both letters are of course real notation; W.I.R.E. is the one
                  this app committed to. */}
              <div className="arena-nameplate__wire">
                <span className="ct-term ct-term-power">
                  <em>W</em>
                  <b>
                    {isFailed
                      ? "—"
                      : fmtWatts(agent.metrics.power * stressFactor * stressFactor)}
                  </b>
                </span>
                <span className="ct-term ct-term-current">
                  <em>I</em>
                  <b>{isFailed ? "OPEN" : fmtAmps(liveAmps)}</b>
                </span>
                <span className="ct-term ct-term-resistance">
                  <em>R</em>
                  <b>{fmtOhms(agent.metrics.resistance)}</b>
                </span>
                <span className="ct-term ct-term-voltage">
                  <em>E</em>
                  <b>{isFailed ? "—" : fmtVolts(agent.metrics.voltage * stressFactor)}</b>
                </span>
              </div>
              {/* Temperature is not a W.I.R.E. quantity, but it is what actually
                  kills the part, so it stays — always against its rated limit,
                  never as a bare number. */}
              <div
                className={`arena-nameplate__temp${overTemp ? " is-hot" : ""}`}
              >
                {Math.round(agent.tempC)}°C
                <i>/{Math.round(agent.ratings.junctionLimitC)}°C rated</i>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
