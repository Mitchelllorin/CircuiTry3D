/**
 * How each family of component actually dies.
 *
 * This table and its one lookup used to live at the top of ArenaScene.tsx,
 * between the number formatters and the orbit-control typedef, where nothing
 * could reach them: a family with a failure mode in F.U.S.E. and no entry here
 * fell through to `generic` and died like nothing in particular, and no test
 * could see that. It is a pure lookup over strings — no three.js, no DOM — so
 * it belongs in its own module where the coverage can be asserted (see
 * deathSignatures.test.ts) instead of discovered by looking at a part on a
 * bench and wondering why nothing happened to it.
 */
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
export type FailMotion = "burst" | "vent" | "smoulder" | "flashOut" | "arc" | "sag";

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
export type FailSmoke = {
  rate: number;
  forMs: number;
  rise: number;
  spread: number;
  tint: string;
  opacity: number;
};

export type FailSignature = {
  motion: FailMotion;
  popMs: number;
  flash: number;
  ember: number;
  hot?: boolean;
  char?: number;
  smoke?: FailSmoke;
};

export const FAIL_SIGNATURE_BY_FAMILY: Record<string, FailSignature> = {
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
  // ── The rest of the engine's families ──────────────────────────────────────
  // Everything F.U.S.E. can resolve needs a death here, and every entry below
  // was missing one. That mattered most for the transformer: it is the largest
  // piece of iron on the bench, its composition has modelled windings on a
  // ferrite core (see componentInternals.ts), and it used to inherit `generic`
  // — so a part with fifty watts of varnish and copper in it cooked like an
  // anonymous 5 mm blob and read, at a glance, as "nothing happened".
  //
  // Nothing below is invented: each one is the shape of the event its own
  // failure mode names (see the engine's mode table in
  // public/js/component-failure-engine.js), so the motion, the smoke and how
  // far it blackens all follow from what the part is made of.

  // Saturates, hums louder, varnish cooks off the windings, and the
  // laminations let go of each other. Iron carries heat for a long time, so
  // this is the slowest smoulder on the bench and it stays hot for minutes.
  transformer: {
    motion: "smoulder",
    popMs: 2100,
    flash: 2.2,
    ember: 0.7,
    hot: true,
    char: 0.78,
    smoke: {
      rate: 30,
      forMs: 7000,
      rise: 1.0,
      spread: 0.5,
      // Burnt winding enamel and varnish: an oily, heavy plume rather than a
      // clean carbon one.
      tint: "#a89e93",
      opacity: 0.72,
    },
  },
  // Winding burnout or a seized bearing. A motor does not crack open — it
  // slumps on its mount and keeps smouldering, which is what `sag` is for.
  motor: {
    motion: "sag",
    popMs: 2400,
    flash: 1.8,
    ember: 0.6,
    hot: true,
    char: 0.62,
    smoke: {
      rate: 26,
      forMs: 8000,
      rise: 0.95,
      spread: 0.55,
      tint: "#a79d92",
      opacity: 0.7,
    },
  },
  // A 5 mm bead with almost no mass: it self-heats, its own reading drifts away
  // from the truth, and then its doping profile is gone. Small, quick, and it
  // never throws anything.
  thermistor: {
    motion: "smoulder",
    popMs: 900,
    flash: 1.6,
    ember: 0.4,
    hot: true,
    char: 0.7,
    smoke: {
      rate: 12,
      forMs: 2400,
      rise: 0.7,
      spread: 0.3,
      tint: "#a49a90",
      opacity: 0.55,
    },
  },
  // Avalanche in the other direction: a zener dies the diode's death, one
  // junction at a time, because that is the same junction.
  zener_diode: {
    motion: "burst",
    popMs: 380,
    flash: 3.0,
    ember: 0.12,
    char: 0.6,
    smoke: {
      rate: 15,
      forMs: 1700,
      rise: 0.85,
      spread: 0.32,
      tint: "#a49a90",
      opacity: 0.6,
    },
  },
  // An op-amp is a little die in a big epoxy body: latch-up or an output stage
  // letting go puts a hole in the top and the magic smoke follows it out.
  opamp: {
    motion: "burst",
    popMs: 460,
    flash: 3.2,
    ember: 0.15,
    char: 0.82,
    smoke: {
      rate: 22,
      forMs: 2400,
      rise: 1.15,
      spread: 0.26,
      tint: "#9c948a",
      opacity: 0.74,
    },
  },
  // A regulator in thermal shutdown does not shatter — it melts, sags on its
  // own leads and weeps. Same event as any melting failure, in a TO-220.
  voltage_regulator: {
    motion: "sag",
    popMs: 1500,
    flash: 2.4,
    ember: 0.7,
    hot: true,
    char: 0.66,
    smoke: {
      rate: 24,
      forMs: 4200,
      rise: 0.9,
      spread: 0.3,
      tint: "#9d948a",
      opacity: 0.7,
    },
  },
  // The DIP: a bond wire fails inside, the die heats, and the package splits
  // along the top. Densest, straightest jet of the three silicon families,
  // because a larger cavity is emptying at once.
  ic: {
    motion: "burst",
    popMs: 560,
    flash: 3.6,
    ember: 0.22,
    char: 0.88,
    smoke: {
      rate: 30,
      forMs: 3400,
      rise: 1.4,
      spread: 0.28,
      tint: "#9c948a",
      opacity: 0.78,
    },
  },
  // A heatsink is not a load and has nothing to burn: it saturates, the
  // anodising cooks off it, and it stays hot. So — no smoke at all, and only a
  // thin char, because a sooty black plume here would be a lie about what the
  // part is made of.
  heatsink: {
    motion: "smoulder",
    popMs: 2200,
    flash: 1.2,
    ember: 0.55,
    hot: true,
    char: 0.18,
  },
  // Hermetically sealed. Overdriving the drive level delaminates the electrode
  // and microfractures the blank, and the can cracks — with NO smoke, because
  // there is no oxygen and nothing volatile in there to make any.
  crystal: {
    motion: "burst",
    popMs: 300,
    flash: 2.6,
    ember: 0,
    char: 0.3,
  },
  // The insulation burns off the conductor, which is the whole failure: an
  // exposed copper run that is now a short waiting to happen. Long, thin,
  // climbing plume — the geometry of the part, not a plume chosen here.
  wire: {
    motion: "smoulder",
    popMs: 1600,
    flash: 2.0,
    ember: 0.45,
    hot: true,
    char: 0.85,
    smoke: {
      rate: 30,
      forMs: 5000,
      rise: 0.8,
      spread: 0.5,
      tint: "#9a9188",
      opacity: 0.7,
    },
  },
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
export function failSignatureFor(family: string, visual: string | null): FailSignature {
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
