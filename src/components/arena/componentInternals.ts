/**
 * What is INSIDE a component — modelled, not implied.
 *
 * The blowout kit's wound (see failureFx.ts) does the right thing for a part
 * whose insides nobody has specified: it tears a cavity in the casing and lights
 * the inside of that cavity, which reads as "this thing came apart". What it
 * cannot do is survive the camera pushing in. At close range that cavity is a
 * dark faceted hole, because that is all it is — there is nothing in there to
 * see. An isolated failure shot of a resistor that is a black gaping hole in a
 * beige tube shows the DAMAGE and hides the SUBJECT.
 *
 * So the three families the roster actually fights are built from the inside out
 * and killed from the inside out:
 *
 *   resistor   carbon film spiral cut on an alumina rod with nickel end caps;
 *              the overload OPENS the film at one spot — a break in the helix,
 *              with the ceramic scorched where it arced
 *   capacitor  etched foil wound with kraft paper, soaked in ethylene-glycol
 *              electrolyte, closed by a scored rubber vent; the overload BOILS
 *              the electrolyte, the winding swells, the vent splits
 *   led        die in a copper lead-frame cup with a gold bond wire; the
 *              overload CRACKS the die and the wire sags
 *
 * Three rules make this honest rather than decorative:
 *
 *   1. It is driven by the SPEC, not by hand. Component construction lives in
 *      src/data/componentCompositions.ts — every layer's material, size, colour
 *      and label, plus which sub-component is CRITICAL and the temperature it is
 *      rated to. This module reads that same data, so correcting a composition
 *      corrects the model of the inside of the part and the line on the failure
 *      card together, in one place.
 *   2. Nothing is revealed that was not built. The casing is not made
 *      translucent and the interior is not faded in through solid material: on
 *      the frame the part dies the outer shell is REPLACED by the same shell cut
 *      into panels, hinged at their edges. Until they move they are the shell,
 *      so the swap is invisible — what you see is the package itself opening.
 *   3. It is a failure, not an X-ray. The interior is built at the moment the
 *      part dies and never before, so a healthy bench shows nothing, and the
 *      reveal is one-way: a blown resistor does not close up again.
 *
 * Geometry is authored along +Y in SPEC UNITS and then fitted to the casing that
 * was actually rendered. The two sources do not share a scale — the library's
 * models and the composition's layers were authored independently (a capacitor
 * can is r0.4 in one and r0.55 in the other) — so fitting to the real casing is
 * what keeps this correct if either is re-tuned. The fit is ISOTROPIC: the
 * spec's proportions are the informational content here, and a spiral scaled
 * 8% differently along its own axis is a lie about the part.
 */

import {
  getComponentComposition,
  type ComponentComposition,
  type InternalLayer,
} from "../../data/componentCompositions";
import { SURFACE_FINISHES } from "../circuit/Component3DLibrary";

type Three = typeof import("three");
type Obj3D = import("three").Object3D;
type Mesh = import("three").Mesh;
type StandardMaterial = import("three").MeshStandardMaterial;
type Color = import("three").Color;
type Vector3 = import("three").Vector3;

/** What a caller gets back. Created at failure, disposed with the blowout kit. */
export type InternalsReveal = {
  /** The interior and the peeled casing, already parented to the body. */
  root: Obj3D;
  /**
   * @param dt        ms since the previous frame
   * @param sinceFail ms since the part failed
   * @param split     how far the package has opened, 0 → ~1 (from the blowout)
   */
  update: (dt: number, sinceFail: number, split: number) => void;
  dispose: () => void;
};

/** The sub-component that actually let go — what the failure card names. */
export type FailedInternal = {
  /** e.g. "Carbon Film" */
  name: string;
  /** Role in the part, e.g. "Resistive element". */
  role: string;
  /** Operating limit in °C, where the spec states one. */
  limitC: number | null;
};

/**
 * Families with a modelled interior.
 *
 * Anything else keeps the generic wound, deliberately: a generic tear is better
 * than a wrong cutaway, and there are a dozen other families on this bench whose
 * insides nobody has specified yet. Adding one is a builder plus an entry here.
 */
const BUILDERS: Record<
  string,
  { build: (three: Three, comp: ComponentComposition | null) => FamilyBuilt; align: "center" | "base" }
> = {};

/** How far the package itself opens, per family. */
const PEEL: Record<string, { panels: number; angle: number }> = {
  // The coating splits and flakes back along the body — the widest opening here,
  // because for a film resistor the coating giving way IS the failure.
  resistor: { panels: 3, angle: 1.15 },
  // A can does not shatter: it splits along one seam and hinges open.
  capacitor: { panels: 2, angle: 0.9 },
  // Epoxy cracks. It does not unfold like a flower — a few degrees of parting
  // is the whole difference between a cracked lens and a banana peel.
  led: { panels: 3, angle: 0.3 },
};

type FamilyBuilt = {
  /** The interior, authored along +Y in spec units. */
  interior: Obj3D;
  /** Largest radial extent in spec units. Sets the fit. */
  specRadius: number;
  /** Axial extent in spec units [min, max] along +Y. Sets the placement. */
  specSpan: [number, number];
  /** Advance the death. `sinceFail` and `dt` in ms. */
  animate: (sinceFail: number, dt: number) => void;
  disposables: { dispose: () => void }[];
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Soot. Everything near a failure ends up somewhere on this line. */
const SOOT = "#140d06";

type MaterialOptions = {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  side?: import("three").Side;
};

function standard(three: Three, options: MaterialOptions): StandardMaterial {
  const material = new three.MeshStandardMaterial({
    color: new three.Color(options.color),
    metalness: options.metalness ?? 0.1,
    roughness: options.roughness ?? 0.6,
    emissive: new three.Color(options.emissive ?? "#000000"),
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: typeof options.opacity === "number",
    opacity: options.opacity ?? 1,
  });
  // Assigned rather than passed: three's setValues warns on an undefined value
  // for a key that exists, and `side: undefined` every part would fill the
  // console with exactly that.
  if (options.side !== undefined) {
    material.side = options.side;
  }
  return material;
}

/** A cylinder standing on the part's axis (+Y). */
function tubeMesh(
  three: Three,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: import("three").Material,
  radialSegments = 20,
): Mesh {
  return new three.Mesh(
    new three.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      1,
      false,
    ),
    material,
  );
}

/**
 * A tube swept along a centreline of sample points.
 *
 * Used for everything a primitive cannot make: the resistance spiral, the wind
 * visible on the end of a wound capacitor, a bond wire with a real arc.
 * CatmullRom through the samples rather than a hand-rolled Curve subclass — the
 * samples ARE the shape, so subdividing between them adds verts and no detail.
 */
function sweptTube(
  three: Three,
  points: Vector3[],
  radius: number,
  material: import("three").Material,
  tubularSegments: number,
  radialSegments = 5,
): Mesh {
  return new three.Mesh(
    new three.TubeGeometry(
      new three.CatmullRomCurve3(points),
      tubularSegments,
      radius,
      radialSegments,
      false,
    ),
    material,
  );
}

/** Sampled points on a helix about +Y. */
function helixPoints(
  three: Three,
  from: number,
  to: number,
  radius: number,
  turns: number,
  samples: number,
): Vector3[] {
  const points: Vector3[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const angle = t * Math.PI * 2 * turns;
    points.push(
      new three.Vector3(
        Math.cos(angle) * radius,
        from + (to - from) * t,
        Math.sin(angle) * radius,
      ),
    );
  }
  return points;
}

/**
 * The composition's layer for a material, so sizes come from the spec.
 *
 * Falls back to the caller's numbers rather than throwing: the composition data
 * is editable content (manufacturer specs can even be imported at runtime — see
 * ManufacturerComponentSpec), and a bench that dies because a layer was renamed
 * is worse than one that models that layer slightly off.
 */
function layerOf(
  comp: ComponentComposition | null,
  materialKey: string,
  labelIncludes?: string,
): InternalLayer | undefined {
  return comp?.internalLayers.find(
    (layer) =>
      layer.materialKey === materialKey &&
      (!labelIncludes || layer.label.toLowerCase().includes(labelIncludes)),
  );
}

/** The composition's critical sub-component, i.e. what is going to fail. */
export function failedInternal(typeOrFamily: string): FailedInternal | null {
  const comp = getComponentComposition(typeOrFamily);
  const critical =
    comp?.subComponents.find((sub) => sub.isCritical) ??
    comp?.subComponents[0];
  if (!comp || !critical) {
    return null;
  }
  return {
    name: critical.name,
    role: critical.role,
    limitC: critical.operatingLimitC ?? null,
  };
}

/** True when this family has a modelled interior. */
export function hasModelledInternals(family: string): boolean {
  return Boolean(BUILDERS[family]);
}

/**
 * A soft round glow.
 *
 * Needed because a light is not allowed here: three recompiles every material in
 * the scene when the light COUNT changes, and doing that on the frame a part
 * dies stalls the one frame that has to be smooth (the same reason the blowout
 * borrows the existing flash light). An arc across a break a few tenths of a
 * millimetre wide is a point source, and a small additive sprite is the only way
 * to lay that colour onto the material around it.
 */
function makeGlowTexture(three: Three): import("three").CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new three.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// Resistor — the film opens
// ---------------------------------------------------------------------------

/**
 * Carbon film on an alumina rod.
 *
 * The film's failure is an OPEN — a break in the spiral, not a fireball. So the
 * model is built the way the film is made: a spiral trimmed into a resistive
 * coating deposited on a ceramic rod, with nickel caps pressed onto its ends. At
 * failure the spiral does not vanish: ONE short section vaporises, the two live
 * ends char back from the break, and the ceramic under it takes the arc.
 */
function buildResistor(
  three: Three,
  comp: ComponentComposition | null,
): FamilyBuilt {
  const interior = new three.Group();
  const disposables: { dispose: () => void }[] = [];

  // Sizes from the spec; fallbacks are the library's own resistor model.
  const rod = layerOf(comp, "alumina");
  const rodRadius = (rod?.scale[0] ?? 0.11) * 0.95;
  const rodLength = rod?.scale[1] ?? 0.9;
  const film = layerOf(comp, "carbon_film");
  const filmRadius = film?.scale[0] ?? 0.125;
  const caps = (comp?.internalLayers ?? []).filter(
    (layer) => layer.materialKey === "nickel",
  );
  const capRadius = caps[0]?.scale[0] ?? 0.155;
  const capHeight = caps[0]?.scale[1] ?? 0.07;
  const capOffset = Math.abs(caps[0]?.position[0] ?? 0.45);
  const filmSpan = ((film?.scale[1] ?? 0.88) / 2) * 0.94;

  // ── The rod ───────────────────────────────────────────────────────────────
  const rodMaterial = standard(three, {
    color: rod?.color ?? "#f5f0dc",
    metalness: 0.02,
    roughness: 0.86,
    // Takes the arc at the break, then cools for good.
    emissive: "#ff4a08",
  });
  disposables.push(rodMaterial);
  interior.add(
    tubeMesh(three, rodRadius, rodRadius, rodLength, rodMaterial, 24),
  );

  // ── The film ──────────────────────────────────────────────────────────────
  // Not a cylinder. A deposited film is trimmed into a spiral, and that spiral
  // is the whole reason the part has a value — so it is what should be visible
  // when the package is open. Built in three pieces, because the failure IS the
  // gap between them: two live ends and the link that goes.
  const filmMaterial = standard(three, {
    color: film?.color ?? "#1a1a1a",
    metalness: 0.24,
    roughness: 0.68,
    emissive: "#ff3d00",
  });
  disposables.push(filmMaterial);
  const FILM_TURNS = 26;
  const gapHalf = (filmSpan * 2) * 0.035;
  const liveTop = helixPoints(three, gapHalf, filmSpan, filmRadius, FILM_TURNS * 0.48, 84);
  const liveBottom = helixPoints(
    three,
    -filmSpan,
    -gapHalf,
    filmRadius,
    FILM_TURNS * 0.48,
    84,
  );
  interior.add(
    sweptTube(three, liveTop, 0.012, filmMaterial, 120),
    sweptTube(three, liveBottom, 0.012, filmMaterial, 120),
  );

  // The link that burns out. Its own material, because it is the only thing in
  // the part allowed to go white-hot.
  const linkMaterial = standard(three, {
    color: "#2a2a2a",
    metalness: 0.3,
    roughness: 0.5,
    emissive: "#fff3d0",
  });
  disposables.push(linkMaterial);
  const link = sweptTube(
    three,
    helixPoints(three, -gapHalf * 1.6, gapHalf * 1.6, filmRadius, 1.1, 20),
    0.013,
    linkMaterial,
    36,
  );
  interior.add(link);

  // ── The end caps ──────────────────────────────────────────────────────────
  // Nickel, pressed on and tinned: where the film's ends become terminals, and
  // the reason current can get in at all.
  const capMaterial = standard(three, {
    color: caps[0]?.color ?? "#9a9a9a",
    metalness: 0.85,
    roughness: 0.42,
    emissive: "#ff4a08",
  });
  disposables.push(capMaterial);
  for (const sign of [-1, 1]) {
    const cap = tubeMesh(three, capRadius, capRadius, capHeight, capMaterial, 22);
    cap.position.y = sign * capOffset;
    interior.add(cap);
  }

  // ── The break, as a light ─────────────────────────────────────────────────
  const breakTexture = makeGlowTexture(three);
  disposables.push(breakTexture);
  const breakMaterial = new three.SpriteMaterial({
    map: breakTexture,
    color: "#ffd9a0",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: three.AdditiveBlending,
  });
  disposables.push(breakMaterial);
  const breakGlow = new three.Sprite(breakMaterial);
  // Sized to sit just inside the package: a glare sprite is soft-edged, but one
  // larger than the casing spills light out of a part that has not opened yet.
  breakGlow.scale.setScalar(rodRadius * 3.0);
  interior.add(breakGlow);

  const soot = new three.Color(SOOT);
  const filmBase = new three.Color(film?.color ?? "#1a1a1a");
  const rodBase = new three.Color(rod?.color ?? "#f5f0dc");
  const capBase = new three.Color(caps[0]?.color ?? "#9a9a9a");

  return {
    interior,
    specRadius: Math.max(capRadius, filmRadius + 0.012),
    specSpan: [-(capOffset + capHeight / 2), capOffset + capHeight / 2],
    animate(sinceFail) {
      // ── The break ── an open is FAST. The film does not fade, it goes.
      const arc = Math.max(0, 1 - sinceFail / 420);
      linkMaterial.emissiveIntensity = Math.min(1, sinceFail / 90) * 5.4 * arc;
      breakMaterial.opacity = Math.min(1, sinceFail / 80) * 0.95 * arc;
      breakGlow.scale.setScalar(rodRadius * (3.0 + (1 - arc) * 2.4));

      // The link is gone within a quarter of a second and the two live ends
      // char back from it — heat leaves along the conductor, not all at once.
      const gone = Math.min(1, Math.max(0, (sinceFail - 180) / 260));
      link.visible = gone < 1;
      link.scale.y = Math.max(0.001, 1 - gone);
      linkMaterial.emissiveIntensity *= 1 - gone;

      // Discolouration runs out from the break, so the coating blackens in the
      // order the heat arrived. Deliberately a function of ELAPSED TIME and not
      // of accumulated frames: every stage of this death then stays in step
      // when a frame runs long, which on a phone it will.
      const char = Math.min(1, Math.max(0, (sinceFail - 120) / 1600));
      filmMaterial.color.copy(filmBase).lerp(soot, char * 0.9);
      filmMaterial.emissiveIntensity = Math.max(0, 1 - sinceFail / 2400) * 1.6;

      // The arc scorches the ceramic under it and not much else.
      rodMaterial.emissiveIntensity = Math.max(0, 1 - sinceFail / 3000) * 2.6;
      rodMaterial.color.copy(rodBase).lerp(soot, char * 0.55);

      // Caps warm LAST and least: the film is a poor conductor and the caps are
      // heat-sunk by the leads. Getting this order right is most of what makes a
      // failure read as thermal rather than as scripted.
      capMaterial.emissiveIntensity =
        Math.max(0, 1 - Math.max(0, sinceFail - 400) / 2600) * 0.7;
      capMaterial.color.copy(capBase).lerp(soot, char * 0.3);
    },
    disposables,
  };
}

// ---------------------------------------------------------------------------
// Capacitor — the electrolyte boils and the vent lets go
// ---------------------------------------------------------------------------

/**
 * Wound aluminium electrolytic.
 *
 * An electrolytic that is overloaded does not explode from nowhere: the
 * electrolyte boils, the pressure has nowhere to go, and the scored rubber vent
 * in the base is the piece that saves the part. So the failure starts in the
 * middle of the winding and works outward — the boil, then the swell, then the
 * seal.
 */
function buildCapacitor(
  three: Three,
  comp: ComponentComposition | null,
): FamilyBuilt {
  const interior = new three.Group();
  const disposables: { dispose: () => void }[] = [];

  const can = layerOf(comp, "aluminum");
  const winding = layerOf(comp, "aluminum", "wound");
  const electrolyte = layerOf(comp, "electrolyte_etg");
  const seal = layerOf(comp, "rubber");

  const windRadius = winding?.scale[0] ?? 0.46;
  const windHeight = winding?.scale[1] ?? 1.05;
  const windOffset = winding?.position[1] ?? -0.05;

  // ── The winding ───────────────────────────────────────────────────────────
  // Foil and paper are wound together, so this is a stack of layers with barely
  // a gap between them: four thin cylinders at stepped radii rather than one
  // solid block, because the LAYERS are the thing — the failure runs between
  // them, and the internal layers are the ones that run hottest.
  const foilMaterials: StandardMaterial[] = [];
  const foilBase: Color[] = [];
  const foilMeshes: Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const isPaper = index % 2 === 1;
    const material = standard(three, {
      color: isPaper ? "#c9bda4" : (winding?.color ?? "#c8a020"),
      metalness: isPaper ? 0.02 : 0.72,
      roughness: isPaper ? 0.92 : 0.38,
      emissive: "#ff4a08",
    });
    disposables.push(material);
    foilMaterials.push(material);
    foilBase.push(material.color.clone());
    const sandwhich = tubeMesh(
      three,
      windRadius - index * 0.055,
      windRadius - index * 0.055,
      windHeight - index * 0.012,
      material,
      26,
    );
    sandwhich.position.y = windOffset;
    interior.add(sandwhich);
    foilMeshes.push(sandwhich);
  }

  // The wind you see on the end of a real can: the spiral the foils make as they
  // roll up. A swept line rather than a texture — at the distance this is ever
  // seen, a swept line reads as a wound edge and a decal reads as a decal.
  const spiralMaterial = standard(three, {
    color: "#6b5a1a",
    metalness: 0.5,
    roughness: 0.6,
  });
  disposables.push(spiralMaterial);
  const spiralPoints: Vector3[] = [];
  for (let index = 0; index <= 90; index += 1) {
    const t = index / 90;
    const angle = t * Math.PI * 2 * 5;
    const radius = 0.04 + t * (windRadius - 0.07);
    spiralPoints.push(
      new three.Vector3(
        Math.cos(angle) * radius,
        windOffset + windHeight / 2 + 0.006,
        Math.sin(angle) * radius,
      ),
    );
  }
  interior.add(sweptTube(three, spiralPoints, 0.009, spiralMaterial, 120, 4));

  // ── The electrolyte ───────────────────────────────────────────────────────
  // What is actually failing, and what boils first — so it is the deepest part
  // of the model and the hottest thing in it.
  const electrolyteMaterial = standard(three, {
    color: electrolyte?.color ?? "#8b6914",
    metalness: 0.05,
    roughness: 0.5,
    emissive: "#ff6a14",
  });
  disposables.push(electrolyteMaterial);
  const electrolyteMesh = tubeMesh(
    three,
    0.22,
    0.22,
    electrolyte?.scale[1] ?? 1.0,
    electrolyteMaterial,
    18,
  );
  electrolyteMesh.position.y = electrolyte?.position[1] ?? -0.05;
  interior.add(electrolyteMesh);

  // ── The vent seal ─────────────────────────────────────────────────────────
  // Scored rubber in the base, and the event of this failure: it bulges, then
  // parts along its score. Two halves, each already hinged on the line through
  // the middle of the seal, so rotating them is opening the score.
  const sealMaterial = standard(three, {
    color: seal?.color ?? "#111111",
    metalness: 0.05,
    roughness: 0.75,
    emissive: "#ff4a08",
  });
  disposables.push(sealMaterial);
  const sealRadius = seal?.scale[0] ?? 0.52;
  const sealHeight = seal?.scale[1] ?? 0.06;
  const sealY = seal?.position[1] ?? -0.58;
  const sealHalves: Mesh[] = [];
  for (let index = 0; index < 2; index += 1) {
    // thetaStart/thetaLength of half a turn each, so the flat edge of each half
    // lies exactly on the x=0 plane — the score line, and the hinge.
    const half = new three.Mesh(
      new three.CylinderGeometry(
        sealRadius,
        sealRadius,
        sealHeight,
        16,
        1,
        false,
        index * Math.PI,
        Math.PI,
      ),
      sealMaterial,
    );
    half.position.y = sealY;
    interior.add(half);
    sealHalves.push(half);
  }

  const soot = new three.Color(SOOT);
  const electrolyteBase = new three.Color(electrolyte?.color ?? "#8b6914");

  return {
    interior,
    specRadius: can?.scale[0] ?? 0.55,
    specSpan: [
      can ? can.position[1] - can.scale[1] / 2 : -0.6,
      can ? can.position[1] + can.scale[1] / 2 : 0.6,
    ],
    animate(sinceFail) {
      // ── The boil ── it comes up through the winding, not from the terminals.
      const boil = Math.min(1, sinceFail / 700);
      const cool = Math.max(0, 1 - sinceFail / 4200);
      electrolyteMaterial.emissiveIntensity = boil * 2.8 * cool;
      electrolyteMaterial.color
        .copy(electrolyteBase)
        .lerp(soot, Math.min(1, sinceFail / 1800));
      // Boiling electrolyte expands: the core pushes against its own winding,
      // and that pressure is what eventually reaches the seal.
      const swell = 1 + Math.min(1, sinceFail / 1400) * 0.05;
      electrolyteMesh.scale.set(swell, 1 + (swell - 1) * 0.6, swell);

      // ── The winding ── swells with the pressure, then chars from the inside.
      const windSwell = 1 + Math.min(1, sinceFail / 1800) * 0.04;
      const char = Math.min(1, Math.max(0, (sinceFail - 300) / 2000));
      foilMaterials.forEach((material, index) => {
        material.color.copy(foilBase[index]).lerp(soot, char * 0.85);
        // Inner layers are buried under the outer ones, so they discolour last
        // — but they are where this started, so they also stop glowing last.
        material.emissiveIntensity =
          Math.max(0, 1 - sinceFail / (2600 + index * 700)) * 1.1;
        foilMeshes[index].scale.set(windSwell, 1, windSwell);
      });

      // ── The seal ── bulges down for a moment, then parts along the score.
      //
      // Kept to a few degrees on purpose. The seal sits ON the base of the can,
      // so a half-disc swinging about its own middle edge drops its rim by
      // radius·sin(angle) — at 45° that is a third of a can-length of black
      // rubber hanging out of the bottom of the part, which reads as damage to
      // the BENCH rather than a vent letting go.
      const bulge = Math.min(1, sinceFail / 900);
      const split = Math.min(1, Math.max(0, (sinceFail - 260) / 420));
      sealHalves.forEach((half, index) => {
        half.position.y = sealY - bulge * 0.03;
        // Opposite directions about their own hinges, which is what a score
        // line does when the pressure finally wins.
        half.rotation.z = split * (index === 0 ? -0.34 : 0.34);
      });
      sealMaterial.emissiveIntensity = Math.max(0, 1 - sinceFail / 2000) * 0.8;
    },
    disposables,
  };
}

// ---------------------------------------------------------------------------
// LED — the die cracks and the bond goes
// ---------------------------------------------------------------------------

/**
 * A die in a reflector cup with a bond wire.
 *
 * The quiet death, and it has to stay quiet: nothing is ejected and nothing
 * burns, because an LED die is a fraction of a milligram of semiconductor inside
 * a sealed epoxy lens. What actually happens is that the junction runs away, the
 * die cracks, and the gold bond wire — hair-thin, with no heatsink but its own
 * ends — is the first thing to go. So the failure happens entirely inside the
 * package, and the model is the cup, the die and the wire.
 */
function buildLed(three: Three, comp: ComponentComposition | null): FamilyBuilt {
  const interior = new three.Group();
  const disposables: { dispose: () => void }[] = [];

  const cup = layerOf(comp, "copper");
  const die = layerOf(comp, "gan_semiconductor");
  const wire = layerOf(comp, "gold");
  const cupRadius = cup?.scale[0] ?? 0.28;
  const cupHeight = cup?.scale[1] ?? 0.1;
  const cupY = cup?.position[1] ?? -0.15;
  const dieSize = die?.scale[0] ?? 0.09;
  const dieThickness = die?.scale[1] ?? 0.05;
  const dieY = die?.position[1] ?? -0.1;
  const wireColor = wire?.color ?? "#ffd700";

  // ── The lead frame ── copper, and as much the die's heat path out as its
  // electrical one.
  const frameMaterial = standard(three, {
    color: cup?.color ?? "#b87333",
    metalness: 0.9,
    roughness: 0.34,
    emissive: "#ff4a08",
  });
  disposables.push(frameMaterial);
  const cupMesh = tubeMesh(
    three,
    cupRadius,
    cupRadius * 0.82,
    cupHeight,
    frameMaterial,
    22,
  );
  cupMesh.position.y = cupY;
  interior.add(cupMesh);

  // The reflector bore. A polished cup throws the die's own light back out of
  // the lens, which is why it is a cone and not a flat pad — and at failure it
  // is the surface that catches the last of that light.
  const boreMaterial = standard(three, {
    color: "#d8a06a",
    metalness: 0.95,
    roughness: 0.22,
    emissive: "#ff5512",
    side: three.DoubleSide,
  });
  disposables.push(boreMaterial);
  const bore = new three.Mesh(
    new three.ConeGeometry(cupRadius * 0.84, cupHeight * 0.92, 22, 1, true),
    boreMaterial,
  );
  bore.rotation.x = Math.PI; // apex down: the cup walls flare upward
  bore.position.y = cupY + cupHeight * 0.08;
  interior.add(bore);

  // The post down to the leads. Deliberately longer than the fitted span, so it
  // reaches out of the package and into the leads the part already has.
  const post = tubeMesh(three, 0.035, 0.035, 0.34, frameMaterial, 10);
  post.position.y = cupY - 0.2;
  interior.add(post);

  // ── The die ── built as two halves, because the failure is a CRACK, and a
  // crack is only visible if the two sides can part.
  const dieMaterial = standard(three, {
    color: die?.color ?? "#ffe040",
    metalness: 0.35,
    roughness: 0.35,
    emissive: "#ffcf5a",
    emissiveIntensity: 0.85,
  });
  disposables.push(dieMaterial);
  const dieHalves: Mesh[] = [];
  for (const sign of [-1, 1]) {
    const half = new three.Mesh(
      new three.BoxGeometry(dieSize / 2, dieThickness, dieSize),
      dieMaterial,
    );
    half.position.set((sign * dieSize) / 4, dieY, 0);
    interior.add(half);
    dieHalves.push(half);
  }

  // ── The bond wire ── gold, hair-thin, and it arcs because it is welded at
  // both ends and has nothing to hold it straight. Swept, not a cylinder: a
  // straight bond wire is the one detail on this part that never exists.
  const wireMaterial = standard(three, {
    color: wireColor,
    metalness: 0.95,
    roughness: 0.25,
    emissive: "#ffb347",
  });
  disposables.push(wireMaterial);
  const wireFrom = new three.Vector3(dieSize * 0.3, dieY + dieThickness * 0.6, 0);
  const wireTo = new three.Vector3(cupRadius * 0.72, cupY + cupHeight * 0.6, 0);
  const wireArc: Vector3[] = [];
  for (let index = 0; index <= 10; index += 1) {
    const t = index / 10;
    wireArc.push(
      new three.Vector3(
        wireFrom.x + (wireTo.x - wireFrom.x) * t,
        wireFrom.y +
          (wireTo.y - wireFrom.y) * t +
          // Ball bond lifts off the die, wedge bond comes down onto the post:
          // the wire flies higher in the middle than at either end.
          Math.sin(t * Math.PI) * cupHeight * 0.85,
        wireFrom.z,
      ),
    );
  }
  const wireMesh = sweptTube(three, wireArc, 0.008, wireMaterial, 26, 4);
  interior.add(wireMesh);

  const soot = new three.Color(SOOT);
  const dieBase = new three.Color(die?.color ?? "#ffe040");
  const frameBase = new three.Color(cup?.color ?? "#b87333");
  const wireBase = new three.Color(wireColor);

  return {
    interior,
    specRadius: cupRadius,
    // The fitted span is the PACKAGE, not the post: the post is the lead frame
    // and it is allowed to run out of the bottom of the part.
    specSpan: [cupY - cupHeight / 2, cupY + cupHeight * 0.6 + cupHeight * 0.85],
    animate(sinceFail) {
      // ── The die ── cracks almost at once. Nothing else in this part is fast,
      // because nothing else in this part is the failure.
      const crack = Math.min(1, sinceFail / 300);
      dieHalves[0].position.x = -dieSize / 4 - crack * 0.015;
      dieHalves[1].position.x = dieSize / 4 + crack * 0.015;
      dieHalves[0].rotation.z = crack * 0.07;
      dieHalves[1].rotation.z = -crack * 0.07;

      const dead = Math.min(1, Math.max(0, (sinceFail - 180) / 900));
      // Two-stage, because a cracked die still conducts a little until the wire
      // goes with it — it dims, then it is out.
      dieMaterial.emissiveIntensity =
        0.85 * (1 - dead) + 0.22 * Math.max(0, 1 - sinceFail / 2600);
      dieMaterial.color.copy(dieBase).lerp(soot, dead * 0.88);

      // ── The bond wire ── heats before the die does (it has the least metal to
      // soak in) and SAGS as it softens rather than snapping, which is what gold
      // does a couple of hundred degrees below its melting point.
      const sag = Math.min(1, sinceFail / 1500);
      wireMesh.position.y = -sag * cupHeight * 0.22;
      wireMaterial.emissiveIntensity =
        Math.max(0, 1 - sinceFail / 1400) * 1.8 * Math.min(1, sinceFail / 120);
      wireMaterial.color
        .copy(wireBase)
        .lerp(soot, Math.min(1, sinceFail / 2200) * 0.7);

      // The cup catches the die's heat, so it lags badly behind everything else.
      const cupHeat = Math.max(0, 1 - Math.max(0, sinceFail - 500) / 3000);
      frameMaterial.emissiveIntensity = cupHeat * 0.9;
      boreMaterial.emissiveIntensity = cupHeat * 1.4;
      frameMaterial.color
        .copy(frameBase)
        .lerp(soot, Math.max(0, 1 - sinceFail / 3200) * 0.5);
    },
    disposables,
  };
}

BUILDERS.resistor = { build: buildResistor, align: "center" };
BUILDERS.capacitor = { build: buildCapacitor, align: "center" };
BUILDERS.led = { build: buildLed, align: "base" };

// ---------------------------------------------------------------------------
// Opening the package
// ---------------------------------------------------------------------------

/** A casing mesh as tagged at creation (see ArenaScene's createComponentGroup). */
type CasingTag = {
  kind: string;
  radius: number;
  length: number;
  axis: [number, number, number];
  finish: string;
  color: string;
  opacity: number;
};

type CasingMesh = {
  mesh: Mesh;
  tag: CasingTag;
  axis: Vector3;
  /** Where the mesh sits along the part axis, in body-local units. */
  projected: number;
};

type Casing = {
  axis: Vector3;
  radius: number;
  span: [number, number];
  meshes: CasingMesh[];
};

/**
 * Measure the rendered package, so the interior can be fitted to it and the
 * panels can be cut from the same dimensions.
 *
 * The package is the outermost non-terminal geometry. Identified by size rather
 * than by index or material, because the library's parts are mostly ONE material
 * per shape and index-tagging breaks the moment a shape is inserted: a terminal
 * is a thin cylinder, a package is not, and that holds for every part here.
 */
function measureCasing(three: Three, body: Obj3D): Casing | null {
  const shells: { mesh: Mesh; tag: CasingTag; axis: Vector3 }[] = [];
  let maxRadius = 0;
  for (const child of body.children) {
    const tag = child.userData?.casing as CasingTag | undefined;
    if (
      !tag ||
      (tag.kind !== "cylinder" && tag.kind !== "sphere") ||
      !(child as Mesh).isMesh
    ) {
      continue;
    }
    shells.push({
      mesh: child as Mesh,
      tag,
      axis: new three.Vector3(tag.axis[0], tag.axis[1], tag.axis[2]),
    });
    maxRadius = Math.max(maxRadius, tag.radius);
  }
  if (shells.length === 0 || maxRadius <= 0) {
    return null;
  }

  // The package: everything within 20% of the largest radius. A lead modelled
  // as a shape (the resistor does this) is a fraction of the body and drops out.
  let widest = shells[0];
  for (const shell of shells) {
    if (shell.tag.radius > widest.tag.radius) {
      widest = shell;
    }
  }
  const axis = widest.axis.clone().normalize();
  const meshes: CasingMesh[] = [];
  let span: [number, number] = [0, 0];
  for (const shell of shells) {
    if (shell.tag.radius < widest.tag.radius * 0.8) {
      continue;
    }
    // Every piece of the package has to be on the same axis, or the panels
    // would be cut from a shape they do not belong to. 0.97 is about 14°.
    if (shell.axis.dot(axis) < 0.97) {
      continue;
    }
    const projected = shell.mesh.position.dot(axis);
    const halfSpan = shell.tag.length / 2;
    if (meshes.length === 0) {
      span = [projected - halfSpan, projected + halfSpan];
    } else {
      span = [
        Math.min(span[0], projected - halfSpan),
        Math.max(span[1], projected + halfSpan),
      ];
    }
    meshes.push({ mesh: shell.mesh, tag: shell.tag, axis, projected });
  }
  if (meshes.length === 0) {
    return null;
  }
  return { axis, radius: widest.tag.radius, span, meshes };
}

/** One hinged piece of the package. */
type Panel = {
  /** Rotated to peel. Its origin sits ON the hinge line. */
  hinge: Obj3D;
  /** Rest orientation of the hinge; the peel is applied on top of this. */
  base: import("three").Quaternion;
  /** Axis to peel about, in the hinge's parent frame. */
  axis: Vector3;
  /** Sign that swings the free edge OUTWARD, not along the shell. */
  sign: number;
  /** Not every panel opens the same amount — a seam does not tear evenly. */
  bias: number;
  mesh: Mesh;
  material: StandardMaterial;
  materialBase: Color;
  emissiveBase: number;
};

/**
 * Cut the package into hinged panels.
 *
 * Each panel is the same surface as the piece it replaces, hinged along one of
 * its own edges. That is what makes the swap invisible while the part is whole
 * and makes the opening read as the body splitting rather than the body being
 * swapped for a different, broken one.
 */
function buildPanels(
  three: Three,
  casing: Casing,
  peel: { panels: number; angle: number },
): { group: Obj3D; panels: Panel[]; disposables: { dispose: () => void }[] } {
  const group = new three.Group();
  const panels: Panel[] = [];
  const disposables: { dispose: () => void }[] = [];
  const step = (Math.PI * 2) / peel.panels;

  casing.meshes.forEach((entry, meshIndex) => {
    const { tag } = entry;
    const source = entry.mesh.material;
    // Copy the surface the piece it replaces was wearing, so a whole part looks
    // whole: same albedo, same finish, and — for a lens or an envelope that was
    // lit when it died — the same glow, which is then killed over the next
    // second. Reading the source material rather than the library shape also
    // picks up whatever the charring loop had already done to it.
    const sourceMaterial = Array.isArray(source) ? source[0] : source;
    const standardSource = sourceMaterial as StandardMaterial;
    const finish =
      SURFACE_FINISHES[tag.finish as keyof typeof SURFACE_FINISHES] ??
      SURFACE_FINISHES.plastic;
    const materialBase = standardSource?.color
      ? standardSource.color.clone()
      : new three.Color(tag.color);
    // Was this piece LIT when it died? Only an emitter's lens or envelope is,
    // and it is the one surface whose failure has to be a light going out
    // rather than a colour darkening. Zero for everything else, which is what
    // keeps this from turning every panel into a glow.
    const emissiveBase =
      standardSource?.emissive && standardSource.emissive.getHex() !== 0
        ? (standardSource.emissiveIntensity ?? 1)
        : 0;

    // A container that reproduces the shape's own placement, so the hinge
    // geometry below can be reasoned about in the shape's local frame.
    const frame = new three.Group();
    frame.position.copy(entry.mesh.position);
    frame.rotation.copy(entry.mesh.rotation);
    group.add(frame);

    for (let index = 0; index < peel.panels; index += 1) {
      // Three's cylinder puts theta=0 at +Z and runs toward +X; its sphere puts
      // phi=0 at -X and runs toward +Z. The hinge point is therefore computed
      // per kind from the same formula the geometry itself uses.
      const theta = index * step;
      // A cylinder is cut into SOLID wedges, not open curved sheets. Two
      // reasons, and the first one is a bug this replaced: an open sector has no
      // end caps, so a "whole" can was missing the top of its lid and the first
      // thing the swap did was leak its own winding. Second, the cracks between
      // wedges are only invisible if the wedges ADD UP to the piece they
      // replace, and a solid wedge has the flat faces and the end discs the
      // original had — so at rest the union is the original, exactly.
      //
      // A sphere is a surface, so a lune IS its wedge; segments are turned up
      // because the dome it stands in for is drawn at 24, and a coarser petal
      // gives itself away in the shading before it ever moves.
      const geometry =
        tag.kind === "sphere"
          ? new three.SphereGeometry(tag.radius, 12, 12, theta, step)
          : new three.CylinderGeometry(
              tag.radius,
              tag.radius,
              tag.length,
              10,
              1,
              false,
              theta,
              step,
            );
      disposables.push(geometry);

      const hingePoint =
        tag.kind === "sphere"
          ? new three.Vector3(
              -tag.radius * Math.cos(theta),
              0,
              tag.radius * Math.sin(theta),
            )
          : new three.Vector3(
              tag.radius * Math.sin(theta),
              0,
              tag.radius * Math.cos(theta),
            );
      geometry.translate(-hingePoint.x, -hingePoint.y, -hingePoint.z);

      const material = standard(three, {
        color: tag.color,
        metalness: finish.metalness,
        roughness: finish.roughness,
        emissive: "#000000",
        opacity: tag.opacity < 1 ? tag.opacity : undefined,
        side: three.DoubleSide,
      });
      material.color.copy(materialBase);
      disposables.push(material);

      const mesh = new three.Mesh(geometry, material);
      // The piece it replaces cast and received shadow, and so does the interior
      // — a rod that does not shadow its own film is a decal of a rod. Set here
      // rather than left to the scene's creation-time pass because these meshes
      // do not exist yet when that pass runs: they are born on the frame the
      // part dies.
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const hinge = new three.Group();
      hinge.position.copy(hingePoint);
      hinge.add(mesh);
      frame.add(hinge);

      // The peel axis. A cylinder sector hinges about its own axis (which, for
      // the shape's frame, is +Y — the axis the geometry was built on), and
      // rotating it one way slides the free edge along the shell while the other
      // way levers it outward. A sphere petal cannot hinge on the pole: that
      // would spin it around the surface into its neighbour. It hinges on the
      // tangent at its own equator instead, and tips its pole outward.
      const hingeAxis =
        tag.kind === "sphere"
          ? new three.Vector3(Math.sin(theta), 0, Math.cos(theta))
          : new three.Vector3(0, 1, 0);
      const sign = tag.kind === "sphere" ? 1 : -1;

      panels.push({
        hinge,
        base: hinge.quaternion.clone(),
        axis: hingeAxis,
        sign,
        bias: 0.72 + ((index * 37 + meshIndex * 13) % 11) / 18,
        mesh,
        material,
        materialBase: materialBase.clone(),
        emissiveBase,
      });
    }
  });

  return { group, panels, disposables };
}

/**
 * Build the interior and the opened package for one dying part.
 *
 * Returns null for a family with no modelled interior, or where the rendered
 * package cannot be measured — the caller then keeps the generic wound, which is
 * an honest fallback rather than a crash.
 *
 * The reveal is parented to the BODY by this function and removed by dispose(),
 * because the interior has to ride every convulsion and slump the body does: it
 * is not debris, it is what the part is made of.
 */
export function createInternalsReveal(
  three: Three,
  family: string,
  body: Obj3D | null,
): InternalsReveal | null {
  const entry = BUILDERS[family];
  const peel = PEEL[family];
  if (!entry || !peel || !body) {
    return null;
  }
  const casing = measureCasing(three, body);
  if (!casing) {
    return null;
  }

  const built = entry.build(three, getComponentComposition(family) ?? null);
  const { group: panelsGroup, panels, disposables: panelDisposables } =
    buildPanels(three, casing, peel);

  // ── Fit ───────────────────────────────────────────────────────────────────
  // Isotropic (the spec's proportions are the point) and anchored to the package
  // that was actually rendered, per axis convention: a symmetric part centers in
  // its package, a part whose interior sits at one end of the package starts
  // there.
  const fit = Math.min(Math.max(casing.radius / built.specRadius, 0.35), 2.5);
  const base =
    entry.align === "center"
      ? (casing.span[0] + casing.span[1]) / 2 -
        ((built.specSpan[0] + built.specSpan[1]) / 2) * fit
      : casing.span[0] - built.specSpan[0] * fit;

  built.interior.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  const interiorRoot = new three.Group();
  interiorRoot.quaternion.setFromUnitVectors(
    new three.Vector3(0, 1, 0),
    casing.axis.clone().normalize(),
  );
  interiorRoot.scale.setScalar(fit);
  interiorRoot.position.copy(casing.axis.clone().normalize().multiplyScalar(base));
  interiorRoot.add(built.interior);

  const root = new three.Group();
  root.add(interiorRoot, panelsGroup);
  body.add(root);

  // The shell is replaced, not hidden: until the panels move they ARE the shell,
  // so nothing about this is visible on the frame it happens on.
  for (const entryMesh of casing.meshes) {
    entryMesh.mesh.visible = false;
  }

  const soot = new three.Color(SOOT);
  const peelQuat = new three.Quaternion();

  return {
    root,
    update(dt, sinceFail, split) {
      built.animate(sinceFail, dt);

      // The package opening. Not linear: a casing resists, then gives, then the
      // pieces keep drifting once free — so the peel overshoots slightly and
      // settles, the same shape the wound uses.
      const open = Math.min(Math.max(split, 0), 1.35);
      const eased = open < 1 ? Math.sin(open * Math.PI * 0.5) * 1.06 : open;
      const char = Math.min(1, Math.max(0, (sinceFail - 200) / 2400));
      for (const panel of panels) {
        peelQuat.setFromAxisAngle(panel.axis, panel.sign * eased * peel.angle * panel.bias);
        panel.hinge.quaternion.copy(panel.base).multiply(peelQuat);
        panel.material.color.copy(panel.materialBase).lerp(soot, char * 0.88);
        // A light that was ON goes out rather than darkening: an emitter's lens
        // does not fade to black, it stops emitting, and the difference is
        // visible on a part at the moment you are looking straight at it.
        if (panel.emissiveBase > 0) {
          const out = Math.max(0, 1 - sinceFail / 900);
          panel.material.emissive.copy(panel.materialBase);
          panel.material.emissiveIntensity = out * panel.emissiveBase;
        }
      }
    },
    dispose() {
      for (const item of built.disposables) {
        item.dispose();
      }
      for (const item of panelDisposables) {
        item.dispose();
      }
      // Unhide, so a disposed kit leaves the part whole rather than shell-less.
      for (const entryMesh of casing.meshes) {
        entryMesh.mesh.visible = true;
      }
      root.parent?.remove(root);
    },
  };
}
