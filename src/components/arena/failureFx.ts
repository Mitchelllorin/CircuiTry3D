/**
 * The blowout kit — what a component's destruction actually LOOKS like.
 *
 * Before this, a part died by shaking, dimming to brown and emitting a grey
 * puff. That is a state change with a particle effect on top, and with the
 * camera now pushing in on the part under test it does not survive the close-up:
 * you are looking straight at the thing at the moment it is destroyed and
 * nothing physical happens to it.
 *
 * What actually happens to a component that fails under electrical overload:
 *
 *   1. The casing lets go. Epoxy cracks, a can's scored vent splits, film
 *      coating blisters and flakes. Pieces LEAVE, arc through the air and land
 *      on the bench — and they are still there afterwards. This is the part
 *      most people mean by "it popped".
 *   2. It burns. Not "glows" — burns, with a flame that has a bright base, a
 *      cooling tip, a flicker, and which lights everything around it. A flame
 *      is the single strongest read of "this thing is destroyed", and it is the
 *      thing a coloured emissive can never fake, because emissive doesn't lay
 *      light on the neighbours.
 *   3. It throws sparks — molten metal, ballistic, brief, far brighter than
 *      anything else on the board.
 *   4. It leaves a mark. The bench under a part that burned is scorched, and
 *      stays scorched. That mark is the evidence the event happened, which is
 *      what is missing when the flash ends and the part is just... darker.
 *
 * Everything here is pooled and lazily built: a kit is only ever created for a
 * part that actually dies, so a bench that finishes with no casualties pays
 * nothing. Sprites rather than a Points cloud for the same reason the smoke
 * plume uses them — each ember needs its own size, rotation and opacity curve.
 */

/**
 * How violently a family comes apart. Every field is "how much of this thing",
 * so a family that doesn't do a thing at all sets it to 0 and the kit skips
 * building it — an LED allocates no shards, a fuse allocates no flame.
 *
 *   shards      casing fragments thrown off (0 = the package holds together)
 *   shardSpeed  how hard they leave, units/sec
 *   shardSize   fragment size, world units
 *   sparks      molten ejecta count
 *   sparkSpeed  units/sec
 *   flameMs     how long it burns after the pop (0 = it doesn't burn)
 *   flameSize   flame width at its base, world units
 *   vent        "up" jets from the top (a can splitting its scored vent);
 *               "radial" throws in every direction (a package rupturing)
 *   scorch      radius of the mark left on the bench (0 = no mark)
 */
export type FailBlowout = {
  shards: number;
  shardSpeed: number;
  shardSize: number;
  sparks: number;
  sparkSpeed: number;
  flameMs: number;
  flameSize: number;
  vent: "up" | "radial";
  scorch: number;
  /**
   * How far the casing itself splits open, 0 → 1. 0 leaves the package intact.
   *
   * This is the piece debris alone cannot do. Fragments flying off a body that
   * never visibly breaks reads as pieces appearing NEAR the part rather than
   * coming OUT of it — the eye wants to see where they came from. So a part
   * that ruptures gets a real wound: a gap torn in the body with the glowing
   * inside of the package showing through it, which then cools and chars.
   */
  rupture: number;
};

export type BlowoutKit = {
  /** Add this to the part's group. Everything is local to the seat. */
  object: import("three").Object3D;
  /**
   * Add this to the part's BODY instead. The wound is the one part of the
   * event that belongs to the component rather than to the bench: debris must
   * not follow the body once it has left, but a hole torn in the casing has to
   * ride every convulsion and slump the body does, or it floats free of the
   * thing it is a hole in.
   */
  bodyObject: import("three").Object3D;
  /**
   * @param dt        ms since the previous frame
   * @param sinceFail ms since the part failed
   */
  update: (dt: number, sinceFail: number) => void;
  dispose: () => void;
};

/** Gravity for thrown debris, arena units/sec². Tuned, not physical. */
const SHARD_GRAVITY = 13;
const SPARK_GRAVITY = 9;
/** How much speed a fragment keeps when it hits the bench. */
const SHARD_RESTITUTION = 0.34;

/**
 * Flame colour ramp, base → tip. A flame is not orange; it is white-hot where
 * the fuel is being consumed and cools through yellow and orange to a dull red
 * as it rises and starves. Rendering it one flat orange is exactly what makes
 * cartoon fire look like cartoon fire.
 */
const FLAME_STOPS: [number, string][] = [
  [0, "#fff6d8"],
  [0.22, "#ffc457"],
  [0.5, "#ff6a14"],
  [0.78, "#a32603"],
  [1, "#2a0a00"],
];

/**
 * A soft round blob, brightest at the very centre. Shared by embers and sparks.
 * Steeper than the smoke puff's falloff on purpose: fire has an edge, smoke
 * does not.
 */
function createEmberTexture(
  THREE: typeof import("three"),
): import("three").CanvasTexture {
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
    gradient.addColorStop(0.35, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.72, "rgba(255,255,255,0.14)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * The scorch mark left on the bench.
 *
 * The obvious version of this — a black radial gradient — is invisible here,
 * and that is worth stating plainly because it is the trap: the arena floor is
 * `#020617`, which is already all but black. Painting soot-black onto near-black
 * leaves no mark at all, and multiply blending is worse than useless (three's
 * MultiplyBlending ignores alpha entirely, so the transparent corners of the
 * quad multiply the floor by zero and you get a black SQUARE).
 *
 * What actually reads is ASH — which is also what is physically there. A burn
 * is a dark sooty core surrounded by pale grey ash and scattered flecks thrown
 * clear of it, and the pale part is the part a dark floor can show. So this is
 * drawn light-on-dark, with the colour baked into the texture and ordinary
 * alpha blending on top.
 *
 * Ragged on purpose, too: a clean circle reads as a decal, and the whole point
 * of this mark is that it reads as damage.
 */
function createScorchTexture(
  THREE: typeof import("three"),
): import("three").CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    // Pale ash ring first — widest, faintest, and the thing that carries the
    // mark against a dark bench.
    const ash = context.createRadialGradient(half, half, 0, half, half, half);
    ash.addColorStop(0, "rgba(120,110,98,0.5)");
    ash.addColorStop(0.5, "rgba(138,126,110,0.42)");
    ash.addColorStop(0.82, "rgba(96,88,78,0.16)");
    ash.addColorStop(1, "rgba(96,88,78,0)");
    context.fillStyle = ash;
    context.fillRect(0, 0, size, size);

    // Then the sooted core burnt into the middle of it, which is what turns a
    // grey smudge into a burn.
    const soot = context.createRadialGradient(half, half, 0, half, half, half * 0.55);
    soot.addColorStop(0, "rgba(14,10,7,0.92)");
    soot.addColorStop(0.55, "rgba(22,15,10,0.6)");
    soot.addColorStop(1, "rgba(26,18,12,0)");
    context.fillStyle = soot;
    context.fillRect(0, 0, size, size);

    // Flecks thrown clear of the main burn — this is what breaks the disc.
    for (let index = 0; index < 110; index += 1) {
      // The texture is built once and shared, so this scatter only has to look
      // unstructured, not vary between parts.
      const angle = Math.random() * Math.PI * 2;
      const radius = half * (0.4 + Math.random() * 0.6);
      const fleck = 0.8 + Math.random() * 2.6;
      // Mixed soot and ash flecks, so the fringe has both.
      context.fillStyle =
        Math.random() > 0.45
          ? "rgba(150,139,124,0.5)"
          : "rgba(14,10,7,0.6)";
      context.beginPath();
      context.arc(
        half + Math.cos(angle) * radius,
        half + Math.sin(angle) * radius,
        fleck,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * The textures every blowout shares.
 *
 * Built ONCE for the whole scene and handed to each kit, never per part: a
 * CanvasTexture is uploaded to the GPU the first time it is rendered, and doing
 * that at the moment a part explodes would put a hitch on the one frame that
 * has to be smooth. Same reasoning as the shared smoke puff.
 */
export type BlowoutTextures = {
  ember: import("three").CanvasTexture;
  scorch: import("three").CanvasTexture;
  dispose: () => void;
};

export function createBlowoutTextures(
  THREE: typeof import("three"),
): BlowoutTextures {
  const ember = createEmberTexture(THREE);
  const scorch = createScorchTexture(THREE);
  return {
    ember,
    scorch,
    dispose() {
      ember.dispose();
      scorch.dispose();
    },
  };
}

/**
 * The ramp, resolved to Colors once per THREE module rather than per sample.
 * This is sampled for every ember and every spark on every frame — building
 * Color objects in there would churn a few thousand allocations a second for
 * one burning resistor, which is exactly the kind of garbage that shows up as
 * stutter on a phone and nowhere else.
 */
let flameRamp: { t: number; color: import("three").Color }[] | null = null;

function flameRampFor(
  THREE: typeof import("three"),
): { t: number; color: import("three").Color }[] {
  if (!flameRamp) {
    flameRamp = FLAME_STOPS.map(([t, hex]) => ({ t, color: new THREE.Color(hex) }));
  }
  return flameRamp;
}

/** Sample the flame ramp into `out`. */
function sampleFlame(
  THREE: typeof import("three"),
  out: import("three").Color,
  t: number,
): void {
  const ramp = flameRampFor(THREE);
  const clamped = Math.min(Math.max(t, 0), 1);
  for (let index = 1; index < ramp.length; index += 1) {
    const stop = ramp[index];
    if (clamped <= stop.t) {
      const previous = ramp[index - 1];
      const span = Math.max(stop.t - previous.t, 1e-6);
      out.copy(previous.color).lerp(stop.color, (clamped - previous.t) / span);
      return;
    }
  }
  out.copy(ramp[ramp.length - 1].color);
}

export type BlowoutOptions = {
  /** Height of the part's centreline above its seat. */
  railY: number;
  /** The part's own body colour, so its debris is made of the same thing. */
  bodyColor: import("three").Color;
  /** How long the part's letting-go moment lasts, ms. */
  popMs: number;
  /**
   * Roughly half the body's smallest cross-section, in world units — used to
   * size the wound against the part it is torn in. A wound scaled by a
   * constant would swallow a small signal diode and barely mark a battery.
   */
  bodyRadius: number;
  /**
   * The body's own orientation. The wound is parented to the BODY so it rides
   * every convulsion, but the library models some parts along X and some along
   * Y and then rotates them onto the branch — so a naive child at local +Y
   * ends up pointing sideways. Inverting this keeps the split facing UP, out
   * of the top surface, whichever way the part was modelled.
   */
  bodyQuaternion: import("three").Quaternion | null;
  /** Shared across every kit — see createBlowoutTextures. */
  textures: BlowoutTextures;
  /**
   * The part's EXISTING failure light, borrowed to carry the flame.
   *
   * A fire needs a real light or it is a sticker: what sells it is orange
   * flickering on the rails, the floor and the parts either side, so the
   * neighbours are lit BY the burning part. But the kit must not create that
   * light itself — three.js recompiles every material in the scene whenever
   * the light COUNT changes, and doing that at the instant a part explodes
   * would stall the one frame that has to be smooth. (The flash light exists
   * up front for exactly this reason.)
   *
   * So the flame borrows it. The two never fight: the flash is brighter while
   * it lasts and the caller writes it first, and the flame only takes the
   * light once it has something brighter to say — which is also the honest
   * order, since the fire outlives the bang.
   */
  light: import("three").PointLight | null;
};

/**
 * Build the kit for one dying part. Call once, at the moment of failure.
 */
export function createBlowoutKit(
  THREE: typeof import("three"),
  spec: FailBlowout,
  options: BlowoutOptions,
): BlowoutKit {
  const {
    railY,
    bodyColor,
    popMs,
    textures,
    light,
    bodyRadius,
    bodyQuaternion,
  } = options;
  const object = new THREE.Group();
  // Geometry and materials this kit owns. The TEXTURES are not in here — they
  // are shared with every other kit and outlive all of them.
  const disposables: { dispose: () => void }[] = [];
  const emberTexture = textures.ember;

  // ── The mark left on the bench ────────────────────────────────────────────
  // Laid flat just above the floor and NOT depth-written, so it can sit on a
  // surface it is coplanar with without fighting it for pixels.
  let scorch: import("three").Mesh | null = null;
  let scorchMaterial: import("three").MeshBasicMaterial | null = null;
  if (spec.scorch > 0) {
    scorchMaterial = new THREE.MeshBasicMaterial({
      map: textures.scorch,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    disposables.push(scorchMaterial);
    const geometry = new THREE.PlaneGeometry(spec.scorch * 2, spec.scorch * 2);
    disposables.push(geometry);
    scorch = new THREE.Mesh(geometry, scorchMaterial);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.014;
    scorch.renderOrder = 1;
    object.add(scorch);
  }

  // ── Casing fragments ──────────────────────────────────────────────────────
  // Irregular solids, not spheres: a shard is a shard because it has flat faces
  // and hard edges catching the light differently as it tumbles. One shared
  // material — they all came off the same part, and they all char together.
  let shardMaterial: import("three").MeshStandardMaterial | null = null;
  const shards: {
    mesh: import("three").Mesh;
    vx: number;
    vy: number;
    vz: number;
    spinX: number;
    spinY: number;
    spinZ: number;
    resting: boolean;
  }[] = [];
  if (spec.shards > 0) {
    shardMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor.clone(),
      roughness: 0.82,
      metalness: 0.05,
      emissive: new THREE.Color("#ff5512"),
      emissiveIntensity: 0,
    });
    disposables.push(shardMaterial);
    for (let index = 0; index < spec.shards; index += 1) {
      const geometry = new THREE.TetrahedronGeometry(spec.shardSize, 0);
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, shardMaterial);
      // A fragment is never a regular solid — squash each one differently so
      // eight shards off one package don't read as eight copies of one shape.
      mesh.scale.set(
        0.6 + Math.random() * 0.8,
        0.45 + Math.random() * 0.7,
        0.6 + Math.random() * 0.8,
      );
      mesh.visible = false;
      object.add(mesh);
      shards.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        resting: false,
      });
    }
  }

  // ── Flame ─────────────────────────────────────────────────────────────────
  const FLAME_COUNT = spec.flameMs > 0 ? 20 : 0;
  const flames = Array.from({ length: FLAME_COUNT }, () => {
    const material = new THREE.SpriteMaterial({
      map: emberTexture,
      color: "#ffffff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    object.add(sprite);
    return { sprite, material, age: 1, life: 1, vx: 0, vy: 0, vz: 0, sway: 0 };
  });

  // ── The wound ─────────────────────────────────────────────────────────────
  // Three pieces, because a hole is not one object:
  //   the CAVITY   — the dark, rough inside of the package, pushed out through
  //                  the casing so the hole has depth rather than being a decal
  //   the CORE     — what is glowing in there, seen through the split; this is
  //                  the bit that says the inside is hotter than the outside
  //   the LIPS     — the casing itself, peeled back. Without these the cavity
  //                  reads as a dark sphere sitting on the part; with them, the
  //                  part has visibly come apart along a seam.
  const bodyObject = new THREE.Group();
  if (bodyQuaternion) {
    bodyObject.quaternion.copy(bodyQuaternion).invert();
  }
  const woundRadius = Math.max(bodyRadius, 0.06) * 0.85;
  let cavity: import("three").Mesh | null = null;
  let woundCore: import("three").Sprite | null = null;
  const lips: import("three").Mesh[] = [];

  if (spec.rupture > 0) {
    const cavityMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0d0806"),
      roughness: 1,
      metalness: 0,
      emissive: new THREE.Color("#ff4a08"),
      emissiveIntensity: 0,
    });
    disposables.push(cavityMaterial);
    // Low-poly on purpose: a smooth sphere reads as a bubble, a faceted one
    // reads as a torn cavity, and this is only ever seen at close range for a
    // couple of seconds.
    const cavityGeometry = new THREE.SphereGeometry(1, 9, 6);
    disposables.push(cavityGeometry);
    cavity = new THREE.Mesh(cavityGeometry, cavityMaterial);
    cavity.position.y = bodyRadius * 0.45;
    cavity.scale.setScalar(0.001);
    bodyObject.add(cavity);

    const coreMaterial = new THREE.SpriteMaterial({
      map: emberTexture,
      color: "#ffd9a0",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    woundCore = new THREE.Sprite(coreMaterial);
    woundCore.position.y = bodyRadius * 0.5;
    woundCore.scale.setScalar(woundRadius * 1.6);
    bodyObject.add(woundCore);

    // Torn casing. Flat wedges hinged at the rim of the hole — they start
    // flush with the body and swing outward as it opens.
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor.clone(),
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
      emissive: new THREE.Color("#ff5512"),
      emissiveIntensity: 0,
    });
    disposables.push(lipMaterial);
    const LIP_COUNT = 3;
    for (let index = 0; index < LIP_COUNT; index += 1) {
      const lipGeometry = new THREE.CircleGeometry(woundRadius * 1.15, 4, 0, 1.5);
      disposables.push(lipGeometry);
      const lip = new THREE.Mesh(lipGeometry, lipMaterial);
      // A hinge parent per lip, so the lip swings about the rim rather than
      // about its own centre — the difference between casing peeling back and
      // a flap spinning in place.
      const hinge = new THREE.Group();
      hinge.position.y = bodyRadius * 0.42;
      hinge.rotation.y = (Math.PI * 2 * index) / LIP_COUNT;
      lip.rotation.x = -Math.PI / 2;
      lip.position.z = woundRadius * 0.5;
      hinge.add(lip);
      bodyObject.add(hinge);
      lips.push(hinge as unknown as import("three").Mesh);
    }
  }

  // Borrowed, never created — see BlowoutOptions.light.
  const flameLight = spec.flameMs > 0 ? light : null;
  const flameLightColor = new THREE.Color("#ff7a1e");

  // ── Sparks ────────────────────────────────────────────────────────────────
  const sparks = Array.from({ length: spec.sparks }, () => {
    const material = new THREE.SpriteMaterial({
      map: emberTexture,
      color: "#ffe9b0",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    object.add(sprite);
    return { sprite, material, age: 1, life: 1, vx: 0, vy: 0, vz: 0 };
  });

  /**
   * A launch direction. "up" families jet from a split in the top face, with
   * only a little spread — that is what a scored vent does, and it is why a
   * popped electrolytic fires its guts at the ceiling rather than sideways.
   * "radial" families throw in every direction at once.
   */
  const launch = (out: { vx: number; vy: number; vz: number }, speed: number) => {
    const angle = Math.random() * Math.PI * 2;
    if (spec.vent === "up") {
      const spread = Math.random() * 0.42;
      out.vx = Math.cos(angle) * spread * speed;
      out.vz = Math.sin(angle) * spread * speed;
      out.vy = speed * (0.85 + Math.random() * 0.5);
      return;
    }
    // Biased upward even when radial: the bench is below the part, so a
    // perfectly even sphere throws half the debris straight into the floor
    // where none of it is visible.
    const elevation = Math.random() * 0.9 + 0.12;
    const horizontal = Math.sqrt(Math.max(1 - elevation * elevation, 0));
    out.vx = Math.cos(angle) * horizontal * speed;
    out.vz = Math.sin(angle) * horizontal * speed;
    out.vy = elevation * speed * (0.7 + Math.random() * 0.6);
  };

  // Everything launches on the first update, from the failure site.
  let armed = false;
  const arm = () => {
    armed = true;
    for (const shard of shards) {
      shard.mesh.position.set(
        (Math.random() - 0.5) * 0.16,
        railY + (Math.random() - 0.5) * 0.16,
        (Math.random() - 0.5) * 0.16,
      );
      shard.mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      launch(shard, spec.shardSpeed * (0.6 + Math.random() * 0.7));
      shard.spinX = (Math.random() - 0.5) * 14;
      shard.spinY = (Math.random() - 0.5) * 14;
      shard.spinZ = (Math.random() - 0.5) * 14;
      shard.resting = false;
      shard.mesh.visible = true;
    }
    for (const spark of sparks) {
      spark.sprite.position.set(
        (Math.random() - 0.5) * 0.12,
        railY,
        (Math.random() - 0.5) * 0.12,
      );
      launch(spark, spec.sparkSpeed * (0.5 + Math.random() * 1.1));
      spark.age = 0;
      // Staggered lives so they don't all wink out on the same frame.
      spark.life = 320 + Math.random() * 620;
      spark.sprite.visible = true;
    }
  };

  const flameColor = new THREE.Color();
  /** Soot. Held here so the per-frame cooling lerp allocates nothing. */
  const shardCharColor = new THREE.Color("#140d06");
  let flameCredit = 0;

  const spawnFlame = (flame: (typeof flames)[number]) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * spec.flameSize * 0.55;
    flame.sprite.position.set(
      Math.cos(angle) * radius,
      railY - 0.08 + Math.random() * 0.1,
      Math.sin(angle) * radius,
    );
    flame.age = 0;
    flame.life = 420 + Math.random() * 340;
    flame.vx = (Math.random() - 0.5) * 0.3;
    // Fire rises fast and accelerates — hot gas is buoyant, it isn't thrown.
    flame.vy = 1.1 + Math.random() * 0.9;
    flame.vz = (Math.random() - 0.5) * 0.3;
    flame.sway = Math.random() * Math.PI * 2;
    flame.material.rotation = Math.random() * Math.PI * 2;
    flame.sprite.visible = true;
  };

  return {
    object,
    bodyObject,
    update(dt, sinceFail) {
      if (!armed) {
        arm();
      }
      const seconds = Math.min(dt, 64) / 1000;

      // ── The wound ── tears open fast, then cools and chars for good.
      if (cavity) {
        // Opens over the first part of the pop, not over its whole length: a
        // casing gives way in an instant and then simply IS open. Easing it
        // across the entire event would read as the part slowly inflating.
        const openT = Math.min(sinceFail / Math.max(popMs * 0.35, 120), 1);
        // Overshoot and settle — the casing springs as it lets go.
        const open = openT < 1 ? Math.sin(openT * Math.PI * 0.5) * 1.08 : 1;
        const scale = woundRadius * open * spec.rupture;
        cavity.scale.set(scale, scale * 0.72, scale);

        // The inside cools from white-hot through orange to dead black, and it
        // is always hotter than the outside — that temperature difference is
        // the whole reason a hole in a burnt part reads as a hole.
        const insideHeat = Math.max(0, 1 - sinceFail / 3200);
        const cavityMaterial = cavity.material as import("three").MeshStandardMaterial;
        cavityMaterial.emissiveIntensity = insideHeat * insideHeat * 3.4;

        if (woundCore) {
          const coreMaterial = woundCore.material as import("three").SpriteMaterial;
          sampleFlame(THREE, flameColor, 0.05 + (1 - insideHeat) * 0.7);
          coreMaterial.color.copy(flameColor);
          coreMaterial.opacity = openT * insideHeat * 0.95;
          // Breathes once it has settled, so a cooling part is not static.
          const breathe = 1 + Math.sin(sinceFail * 0.005) * 0.08 * insideHeat;
          woundCore.scale.setScalar(woundRadius * 1.5 * open * breathe);
        }

        for (let index = 0; index < lips.length; index += 1) {
          // Each lip peels a different amount — a seam does not tear evenly.
          const bias = 0.7 + ((index * 37) % 11) / 18;
          lips[index].rotation.x = open * 0.95 * bias * spec.rupture;
          const lipMesh = lips[index].children[0] as import("three").Mesh;
          const lipMaterial = lipMesh.material as import("three").MeshStandardMaterial;
          lipMaterial.emissiveIntensity = insideHeat * 1.2;
          lipMaterial.color
            .copy(bodyColor)
            .lerp(shardCharColor, Math.min(sinceFail / 1200, 1) * 0.9);
        }
      }

      // ── Scorch ── darkens fast as it burns in, then holds. It does not fade:
      // that is the whole point of it. The bench wears the result of the run.
      if (scorch && scorchMaterial) {
        const burnIn = Math.min(sinceFail / Math.max(popMs * 0.8, 200), 1);
        scorchMaterial.opacity = burnIn * 0.88;
        // Spreads a little as it burns in, so the mark is made by the event
        // rather than appearing at full size the instant the part dies.
        const spread = 0.55 + burnIn * 0.45;
        scorch.scale.setScalar(spread);
      }

      // ── Fragments ── ballistic, tumbling, and they stay where they land.
      if (shardMaterial) {
        // Debris comes off glowing at the temperature that destroyed the part
        // and cools on the way down. Cooling debris is a detail you only get
        // to see because the camera is in close, and it is the one that sells
        // the fragments as having come OUT of something that was on fire.
        const cool = Math.max(0, 1 - sinceFail / 2400);
        shardMaterial.emissiveIntensity = cool * cool * 2.2;
        shardMaterial.color
          .copy(bodyColor)
          .lerp(shardCharColor, Math.min(sinceFail / 900, 1) * 0.85);
      }
      for (const shard of shards) {
        if (shard.resting) {
          continue;
        }
        shard.vy -= SHARD_GRAVITY * seconds;
        shard.mesh.position.x += shard.vx * seconds;
        shard.mesh.position.y += shard.vy * seconds;
        shard.mesh.position.z += shard.vz * seconds;
        shard.mesh.rotation.x += shard.spinX * seconds;
        shard.mesh.rotation.y += shard.spinY * seconds;
        shard.mesh.rotation.z += shard.spinZ * seconds;
        const floor = spec.shardSize * 0.5;
        if (shard.mesh.position.y <= floor && shard.vy < 0) {
          shard.mesh.position.y = floor;
          shard.vy = -shard.vy * SHARD_RESTITUTION;
          shard.vx *= 0.6;
          shard.vz *= 0.6;
          shard.spinX *= 0.4;
          shard.spinY *= 0.4;
          shard.spinZ *= 0.4;
          // Below a bounce worth watching, it is debris on a bench. Parking it
          // costs nothing per frame from then on.
          if (shard.vy < 0.6) {
            shard.vy = 0;
            shard.resting = true;
          }
        }
      }

      // ── Flame ── emits hard through the pop, then starves.
      if (flames.length > 0) {
        const burn = Math.max(0, 1 - sinceFail / spec.flameMs);
        // Squared taper: a fire dies back much faster than it built, and a
        // linear one leaves a suspiciously steady candle on the corpse.
        const emit = burn * burn;
        flameCredit += 42 * emit * seconds;
        while (flameCredit >= 1) {
          flameCredit -= 1;
          const free = flames.find((candidate) => candidate.age >= candidate.life);
          if (!free) {
            flameCredit = 0;
            break;
          }
          spawnFlame(free);
        }

        for (const flame of flames) {
          if (flame.age >= flame.life) {
            if (flame.sprite.visible) {
              flame.sprite.visible = false;
              flame.material.opacity = 0;
            }
            continue;
          }
          flame.age += dt;
          const t = Math.min(flame.age / flame.life, 1);
          flame.sway += dt * 0.006;
          // Accelerating rise + a lateral wander: a flame is turbulent, and a
          // column of sprites going straight up at a constant speed is the
          // clearest tell of fake fire there is.
          flame.vy += 2.2 * seconds;
          flame.sprite.position.x +=
            (flame.vx + Math.sin(flame.sway) * 0.22) * seconds;
          flame.sprite.position.y += flame.vy * seconds;
          flame.sprite.position.z +=
            (flame.vz + Math.cos(flame.sway * 1.3) * 0.22) * seconds;
          sampleFlame(THREE, flameColor, t);
          flame.material.color.copy(flameColor);
          // Bright and tight at the base, wide and thin at the tip.
          const size = spec.flameSize * (0.5 + t * 1.35);
          flame.sprite.scale.set(size, size * 1.25, 1);
          flame.material.opacity = (1 - t) * (1 - t * 0.3) * 0.9 * emit;
        }

        if (flameLight) {
          // Flicker at two rates so it reads as combustion rather than as a
          // sine wave — one slow roll, one fast guttering.
          const flicker =
            0.72 +
            Math.sin(sinceFail * 0.021) * 0.16 +
            Math.sin(sinceFail * 0.073) * 0.12;
          const want = emit * flicker * 9;
          // Only take the light when the fire is the brighter event. The caller
          // has already written the flash into it this frame, so this hands
          // over exactly when the bang has faded below the burn.
          if (want > flameLight.intensity) {
            flameLight.intensity = want;
            flameLight.color.copy(flameLightColor);
          }
        }
      }

      // ── Sparks ── fast, bright, brief, and gone.
      for (const spark of sparks) {
        if (spark.age >= spark.life) {
          if (spark.sprite.visible) {
            spark.sprite.visible = false;
            spark.material.opacity = 0;
          }
          continue;
        }
        spark.age += dt;
        const t = Math.min(spark.age / spark.life, 1);
        spark.vy -= SPARK_GRAVITY * seconds;
        spark.sprite.position.x += spark.vx * seconds;
        spark.sprite.position.y += spark.vy * seconds;
        spark.sprite.position.z += spark.vz * seconds;
        // Molten metal cools visibly along its arc: white at the muzzle,
        // orange by the time it lands.
        sampleFlame(THREE, flameColor, 0.08 + t * 0.55);
        spark.material.color.copy(flameColor);
        const size = 0.05 * (1 - t * 0.55);
        spark.sprite.scale.set(size, size, 1);
        spark.material.opacity = (1 - t * t) * 0.95;
        if (spark.sprite.position.y < 0.02) {
          // Skitters out on contact rather than sinking through the bench.
          spark.age = spark.life;
        }
      }
    },
    dispose() {
      for (const item of disposables) {
        item.dispose();
      }
      for (const flame of flames) {
        flame.material.dispose();
      }
      for (const spark of sparks) {
        spark.material.dispose();
      }
      woundCore?.material.dispose();
      object.parent?.remove(object);
      bodyObject.parent?.remove(bodyObject);
    },
  };
}

/**
 * How each family comes apart. Anything not listed falls back to `generic`.
 *
 * These are not arbitrary: they are what the part in question actually does on
 * a bench. A film resistor blisters, flames and smokes but does not throw its
 * body across the room; an electrolytic fires its plug and its guts straight
 * up out of a scored vent; a TO-220 splits its epoxy and throws it; an LED
 * package survives its own death intact and merely goes dark.
 */
export const BLOWOUT_BY_FAMILY: Record<string, FailBlowout> = {
  // Cooks, blisters, flakes its coating and burns. A few small flying pieces,
  // a real flame off the body, and a mark on the bench underneath it.
  //
  // Toned down deliberately (was 5 shards / 0.55 rupture): an overloaded film
  // resistor CRACKS and blisters, and its coating flakes — it does not blow a
  // crater in itself or throw a handful of debris. That is the difference
  // between showing what happens and putting on a firework display. The
  // families that genuinely do come apart (electrolytic, MOSFET, cell) keep
  // their violence, which is what makes them read as different failures.
  resistor: {
    shards: 3,
    shardSpeed: 2.1,
    shardSize: 0.055,
    sparks: 8,
    sparkSpeed: 2.6,
    flameMs: 2600,
    flameSize: 0.3,
    vent: "radial",
    scorch: 0.85,
    rupture: 0.35,
  },
  // The scored top splits and it fires upward — plug, paper and electrolyte.
  // Fastest, most directional event on the bench, and famously loud.
  capacitor: {
    shards: 7,
    shardSpeed: 4.6,
    shardSize: 0.05,
    sparks: 16,
    sparkSpeed: 5.2,
    flameMs: 900,
    flameSize: 0.26,
    vent: "up",
    scorch: 0.7,
    rupture: 0.9,
  },
  // The package survives; the die inside does not. Nothing flies, nothing
  // burns — this is the quiet death, and it has to stay quiet or every part on
  // the bench dies the same way.
  //
  // Zero sparks, and that is a correction rather than a style choice: an LED,
  // a fuse and a lamp all fail INSIDE a sealed package. A fuse element
  // vaporises within its glass tube, a filament breaks inside its envelope,
  // an LED die cracks under its epoxy. Nothing is ejected, so drawing ejecta
  // would be inventing a phenomenon. The flash, the darkening and the sooted
  // glass are the real, and sufficient, tells.
  led: {
    shards: 0,
    shardSpeed: 0,
    shardSize: 0,
    sparks: 0,
    sparkSpeed: 1.4,
    flameMs: 0,
    flameSize: 0,
    vent: "radial",
    scorch: 0,
    rupture: 0,
  },
  diode: {
    shards: 4,
    shardSpeed: 3.2,
    shardSize: 0.045,
    sparks: 10,
    sparkSpeed: 3.6,
    flameMs: 900,
    flameSize: 0.22,
    vent: "radial",
    scorch: 0.5,
    rupture: 0.5,
  },
  // Insulation cooking off the windings: the longest, dirtiest burn on the
  // board, but the coil itself stays put.
  inductor: {
    shards: 2,
    shardSpeed: 1.4,
    shardSize: 0.05,
    sparks: 5,
    sparkSpeed: 1.9,
    flameMs: 4200,
    flameSize: 0.34,
    vent: "up",
    scorch: 0.9,
    rupture: 0.3,
  },
  // Vents hot gas and burns for a long time afterwards. A cell that lets go is
  // the one failure on this bench that is genuinely dangerous.
  battery: {
    shards: 4,
    shardSpeed: 3.4,
    shardSize: 0.07,
    sparks: 14,
    sparkSpeed: 4.4,
    flameMs: 5200,
    flameSize: 0.45,
    vent: "up",
    scorch: 1.25,
    rupture: 0.75,
  },
  // Doing its job. The element goes, the glass sooties, and NOTHING else
  // happens — a fuse that threw shrapnel would be a failed fuse.
  fuse: {
    shards: 0,
    shardSpeed: 0,
    shardSize: 0,
    sparks: 0,
    sparkSpeed: 1.6,
    flameMs: 0,
    flameSize: 0,
    vent: "radial",
    scorch: 0,
    rupture: 0,
  },
  lamp: {
    shards: 0,
    shardSpeed: 0,
    shardSize: 0,
    sparks: 0,
    sparkSpeed: 2.1,
    flameMs: 0,
    flameSize: 0,
    vent: "radial",
    scorch: 0,
    rupture: 0,
  },
  // Silicon letting go hard enough to split the package — the classic hole
  // blown clean through the top of an epoxy body, with the magic smoke behind
  // it. The most violent non-battery event here.
  mosfet: {
    shards: 8,
    shardSpeed: 5.4,
    shardSize: 0.06,
    sparks: 18,
    sparkSpeed: 6,
    flameMs: 1500,
    flameSize: 0.32,
    vent: "radial",
    scorch: 1,
    rupture: 1,
  },
  bjt: {
    shards: 7,
    shardSpeed: 5,
    shardSize: 0.055,
    sparks: 16,
    sparkSpeed: 5.6,
    flameMs: 1400,
    flameSize: 0.3,
    vent: "radial",
    scorch: 0.95,
    rupture: 0.95,
  },
  // Contacts arcing. The body is undamaged, so it must throw NOTHING and burn
  // nothing — only sparks, and they come from a spot you cannot see into.
  switch: {
    shards: 0,
    shardSpeed: 0,
    shardSize: 0,
    sparks: 12,
    sparkSpeed: 3.4,
    flameMs: 0,
    flameSize: 0,
    vent: "radial",
    scorch: 0.22,
    rupture: 0,
  },
  relay: {
    shards: 0,
    shardSpeed: 0,
    shardSize: 0,
    sparks: 10,
    sparkSpeed: 3,
    flameMs: 0,
    flameSize: 0,
    vent: "radial",
    scorch: 0.2,
    rupture: 0,
  },
  generic: {
    shards: 4,
    shardSpeed: 2.8,
    shardSize: 0.05,
    sparks: 9,
    sparkSpeed: 3.2,
    flameMs: 1600,
    flameSize: 0.28,
    vent: "radial",
    scorch: 0.7,
    rupture: 0.6,
  },
};

/**
 * The blowout for a family, modulated by the F.U.S.E. failure mode — the same
 * two-stage rule the motion signature uses. What a part is MADE of decides the
 * shape of the event; HOW it was killed decides its violence.
 */
export function blowoutFor(family: string, visual: string | null): FailBlowout {
  const base = BLOWOUT_BY_FAMILY[family] ?? BLOWOUT_BY_FAMILY.generic;
  if (visual === "melt") {
    // Melting is the opposite of exploding: nothing is thrown, but what is
    // left burns for much longer.
    return {
      ...base,
      shards: 0,
      sparks: Math.round(base.sparks * 0.3),
      flameMs: Math.max(base.flameMs, 3000),
      flameSize: base.flameSize * 1.15,
      scorch: base.scorch * 1.2,
      // Something that melted did not burst: it sags and weeps. A small gap
      // opens where it gave way, not a torn seam.
      rupture: base.rupture * 0.35,
    };
  }
  if (visual === "blowout") {
    // Everything harder and faster, and it burns for less time because it is
    // over sooner.
    return {
      ...base,
      shards: base.shards > 0 ? base.shards + 2 : 3,
      shardSpeed: base.shardSpeed * 1.5 || 3.6,
      shardSize: base.shardSize || 0.05,
      sparks: Math.round(base.sparks * 1.6) + 4,
      sparkSpeed: base.sparkSpeed * 1.35 || 4,
      flameMs: base.flameMs > 0 ? base.flameMs * 0.7 : 700,
      flameSize: base.flameSize || 0.24,
      scorch: Math.max(base.scorch, 0.6) * 1.2,
      // Blown apart: the casing goes whether or not this family normally
      // ruptures. That is what distinguishes this from the family's own death.
      rupture: Math.max(base.rupture, 0.7),
    };
  }
  return base;
}
