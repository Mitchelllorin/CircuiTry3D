/**
 * Lightning flow — the app's current visualisation.
 *
 * Copied from the main workspace (public/legacy.html, the FLOW_STREAM_MODE
 * path: _createLightningBolt / _updateLightning / _tubeIndices). That builder
 * runs with FLOW_STREAM_DOT_RATIO = 0 — "lightning only" — so this bolt, not a
 * stream of dots, is what current looks like across the app.
 *
 * Current is rendered as a living, glowing TUBE of light that undulates, twists
 * and crackles down each conductor. Energy — thickness, amplitude, brightness,
 * travel speed, strand count — scales with the branch CURRENT, so Ohm's law
 * reads at a glance: a high-resistance / low-current branch is a thin gentle
 * wisp, a high-current branch is a fat writhing flare. The bolt travels in the
 * active current direction.
 *
 * Colour comes from getFlowSpectrumColors() so a given amperage is the same
 * colour here as it is on every other surface.
 */

import { getFlowSpectrumColors } from "./currentFlowAnimation";
import { isMobile } from "../utils/mobilePerformance";

// ── Constants, copied verbatim from legacy.html:5865 ────────────────────────
/** Rings along each bolt. */
const LIGHTNING_SEGS = isMobile() ? 20 : 28;
/** Radial faces — low-poly glowing tube. */
const LIGHTNING_TUBE_SIDES = 5;
/** Base tube radius (scaled by current). */
const LIGHTNING_RADIUS = 0.055;
/**
 * Perpendicular displacement, world units — how far off the conductor the
 * bolt is allowed to wander.
 *
 * TIGHTENED from 0.2. This is the knob that decides whether current reads as a
 * filament running THROUGH the wire or as a scribble draped around it, and the
 * tighter answer is also the more truthful one: current flows in the
 * conductor. At 0.2 the bolt sprawled wide enough to obscure the parts it was
 * running between, and on a phone that is most of the board.
 *
 * The trick is that amplitude is NOT what makes it read as electricity —
 * see LIGHTNING_SPATIAL. Drop the amplitude alone and you get a glowing
 * straight line, which reads as a laser or a lit wire. Drop the amplitude and
 * raise the frequency together and it reads MORE electric, not less: a tight,
 * fast, crackling filament instead of a slow fat snake.
 */
const LIGHTNING_BASE_AMP = 0.11;
/** How fast the bolt rotates around the conductor. */
const LIGHTNING_TWIST = 1.4;
/** Twist added per ring (spatial helix). */
const LIGHTNING_TWIST_PITCH = 0.5;
/** Undulation / travel speed — lower is more flowing. */
const LIGHTNING_WAVE_FREQ = 4.2;
/**
 * Undulation wavelength along the bolt — phase advance per ring, so HIGHER is
 * a shorter wavelength and more zigzags per unit of wire.
 *
 * Raised from 1.8 as the amplitude came down. Jaggedness DENSITY plus travel is
 * what the eye reads as electric current; size is not. Keeping the kink count
 * up while shrinking how far it strays is what lets the flow take a third of
 * the room and stay instantly recognisable.
 */
const LIGHTNING_SPATIAL = 2.6;
/** Intertwining bolts per conductor (3 at high current). */
const LIGHTNING_STRANDS = 2;

/** Triangle indices for an (N rings × M sides) open tube — built once per bolt. */
function tubeIndices(N: number, M: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = (i + 1) * (M + 1) + j;
      const c = (i + 1) * (M + 1) + (j + 1);
      const d = i * (M + 1) + (j + 1);
      idx.push(a, b, d, b, c, d);
    }
  }
  return idx;
}

type Bolt = {
  mesh: any;
  geom: any;
  mat: any;
  pos: Float32Array;
  basePts: any[];
  normals: any[];
  binormals: any[];
  N: number;
  M: number;
  ring: [number, number][];
  radius: number;
  amp: number;
  twist: number;
  twistOffset: number;
  travel: number;
  waveFreq: number;
  phase: number;
  baseOpacity: number;
  /** Optional group name, so a caller can dim a subset — see `setFade`. */
  tag?: string;
  crackleAt: number;
  crackleEnd: number;
  crackleBoost: number;
};

export type LightningPathPoint = { x: number; y?: number; z: number };

export class LightningFlowSystem {
  private three: any;
  private parentGroup: any;
  private bolts: Bolt[] = [];
  /** Set false while the switch is open, so geometry survives but nothing shows. */
  private visible = true;
  /** Per-tag dimming, 0 = full strength, 1 = invisible. See `setFade`. */
  private fades = new Map<string, number>();
  /** Whole-system opacity scale, 1 = the standard. See `setIntensity`. */
  private intensity = 1;

  /**
   * Scale every bolt's opacity, 1 = the app-wide standard strength.
   *
   * Exists so a surface can dial the flow back WITHOUT editing the shared
   * constants above, which are the standard the whole app matches. The builder
   * shows a handful of bolts across a wide canvas; the arena stacks a rung per
   * part between two rails and views the lot from one camera, so the same
   * per-bolt strength adds up to a curtain of light there and nowhere else.
   * Backing the arena off is a property of that scene, not a correction to the
   * standard — which is why it lives here rather than in the constants.
   */
  public setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Dim every bolt carrying `tag`, 0 → 1.
   *
   * Used to pull the current back inside a component as that component starts
   * to react, so the scorching and incandescence win the pixels rather than
   * competing with a bolt drawn straight through the body.
   */
  public setFade(tag: string, fade: number): void {
    this.fades.set(tag, Math.max(0, Math.min(1, fade)));
  }

  constructor(three: any, parentGroup: any) {
    this.three = three;
    this.parentGroup = parentGroup;
  }

  /**
   * Lay a bolt along `path`.
   *
   * @param path        Points the conductor follows. `y` defaults to 0.
   * @param currentAmps This branch's real current — drives colour AND energy.
   * @param speedFactor Cosmetic resistance damping; 1 when the current is known.
   * @param directionMul +1 or -1 for the direction current travels.
   */
  public addBolt(
    path: LightningPathPoint[],
    currentAmps: number,
    speedFactor = 1,
    directionMul = 1,
    options: {
      /**
       * Draw regardless of depth — for the span that passes INSIDE a component
       * body, so the current is visibly running through the part instead of
       * being swallowed by its opaque shell. Use only for that short span:
       * applied to a whole loop it would let far-side bolts draw over near
       * parts.
       */
      drawThrough?: boolean;
      /** Scales tube radius — a thinner filament reads better inside a body. */
      radiusScale?: number;
      /**
       * Groups this bolt under a name that `setFade` can dim later.
       *
       * The span running through a component is the one place the current
       * competes with the thing it is causing: the part's own scorching and
       * incandescence. Tagging that span lets the caller pull it back as the
       * part reacts, so early on you watch current arrive, and once the part is
       * in trouble you watch the PART.
       */
      tag?: string;
    } = {},
  ): void {
    const THREE = this.three;
    try {
      if (!path || path.length < 2) return;

      // A real Curve, so computeFrenetFrames() is available — the builder needs
      // the same thing and builds a CatmullRomCurve3 for exactly this reason.
      //
      // But a Catmull-Rom through bare corner points does NOT follow the
      // conductor: it rounds every corner off and bows outside the rails on the
      // long runs, so the bolt visibly leaves the wire. Densifying each straight
      // leg first pins the spline to the polyline — with control points every
      // ~0.25 units the curve has no freedom to wander, while still being a
      // smooth Curve that can produce Frenet frames.
      const pts: any[] = [];
      const STEP = 0.25;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const ax = a.x;
        const ay = a.y ?? 0;
        const az = a.z;
        const bx = b.x;
        const by = b.y ?? 0;
        const bz = b.z;
        const legLength = Math.hypot(bx - ax, by - ay, bz - az);
        const steps = Math.max(1, Math.ceil(legLength / STEP));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push(
            new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t),
          );
        }
      }
      const last = path[path.length - 1];
      pts.push(new THREE.Vector3(last.x, last.y ?? 0, last.z));
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts);

      // The builder's LIGHTNING_SEGS is per-WIRE — a short run. These paths are
      // whole loops, and stretching the same ring count over a loop makes the
      // undulation coarse and the corners faceted. Scale the rings with length
      // so detail per unit stays the same, with a ceiling for the phone's sake.
      const curveLength = curve.getLength();
      const N = Math.max(
        LIGHTNING_SEGS,
        Math.min(isMobile() ? 96 : 160, Math.ceil(curveLength * (isMobile() ? 3 : 4.5))),
      );
      const M = LIGHTNING_TUBE_SIDES;
      let frames;
      try {
        frames = curve.computeFrenetFrames(N, false);
      } catch {
        return;
      }
      const basePts: any[] = [];
      for (let i = 0; i <= N; i++) basePts.push(curve.getPoint(i / N));

      // Pre-compute the unit ring (cos/sin per radial face).
      const ring: [number, number][] = [];
      for (let j = 0; j <= M; j++) {
        const a = (Math.PI * 2 * j) / M;
        ring.push([Math.cos(a), Math.sin(a)]);
      }

      // Energy from current; resistance (low speedFactor) tames it.
      const energy = Math.max(
        0.12,
        Math.min(1.5, Math.sqrt(Math.max(0, currentAmps)) * 1.6 * (speedFactor || 1)),
      );
      // Several thin bolts braid down each conductor; more current → more strands.
      const strands = energy > 0.95 ? LIGHTNING_STRANDS + 1 : LIGHTNING_STRANDS;

      const colors = getFlowSpectrumColors(currentAmps);

      for (let s = 0; s < strands; s++) {
        const positions = new Float32Array((N + 1) * (M + 1) * 3);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geom.setIndex(tubeIndices(N, M));
        const mat = new THREE.MeshBasicMaterial({
          color: colors.core,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: !options.drawThrough,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.frustumCulled = false;
        mesh.visible = this.visible;
        this.parentGroup.add(mesh);
        this.bolts.push({
          mesh,
          geom,
          mat,
          pos: positions,
          basePts,
          normals: frames.normals,
          binormals: frames.binormals,
          N,
          M,
          ring,
          // Thinner per strand so the braid stays sharp, not bulky.
          radius:
            ((LIGHTNING_RADIUS * (0.55 + energy * 0.45)) / Math.sqrt(strands)) *
            (options.radiusScale ?? 1),
          amp: LIGHTNING_BASE_AMP * (0.55 + energy),
          // Alternate twist direction + start angle so the strands intertwine.
          twist: LIGHTNING_TWIST * (s % 2 === 0 ? 1 : -0.85),
          twistOffset: (Math.PI * 2 * s) / strands,
          travel: (directionMul >= 0 ? 1 : -1) * (1.0 + energy * 1.8),
          waveFreq: LIGHTNING_WAVE_FREQ * (0.75 + energy * 0.4) * (1 + s * 0.09),
          phase: Math.random() * Math.PI * 2 + s * 1.9,
          tag: options.tag,
          baseOpacity: Math.min(1, 0.45 + energy * 0.4),
          crackleAt: 0,
          crackleEnd: 0,
          crackleBoost: 1,
        });
      }
    } catch {
      /* skip degenerate path */
    }
  }

  /** @param time Milliseconds, monotonic (performance.now()). */
  public update(time: number): void {
    if (!this.bolts.length) return;
    const t = time * 0.001; // seconds
    for (let b = 0; b < this.bolts.length; b++) {
      const L = this.bolts[b];
      if (!L || !L.geom) continue;
      // Occasional crackle: a brief amplitude + brightness spike.
      if (time > L.crackleAt) {
        L.crackleAt = time + 110 + Math.random() * 380;
        L.crackleBoost = 1.35 + Math.random() * 1.1;
        L.crackleEnd = time + 80 + Math.random() * 90;
      }
      const crackling = time < L.crackleEnd;
      const ampNow = L.amp * (crackling ? L.crackleBoost : 1);
      const pos = L.pos;
      const N = L.N;
      const M = L.M;
      const ring = L.ring;
      const R = L.radius;
      for (let i = 0; i <= N; i++) {
        const bp = L.basePts[i];
        const nrm = L.normals[i] || L.normals[N - 1];
        const bin = L.binormals[i] || L.binormals[N - 1];
        // Taper to zero at the ends so the bolt stays pinned to the terminals.
        const taper = Math.sin(Math.PI * (i / N));
        // Smooth undulation that TRAVELS along the conductor (liquid, not spiky).
        const wave =
          Math.sin(i * LIGHTNING_SPATIAL - t * L.waveFreq * L.travel + L.phase) +
          0.35 * Math.sin(i * 2.7 - t * L.waveFreq * 1.5 + L.phase * 1.6);
        const jitter = crackling ? (Math.random() - 0.5) * 0.6 : 0;
        const disp = ampNow * taper * (wave + jitter);
        // Twist the displacement around the conductor axis (helix). Per-strand
        // twist rate/direction + start angle make the strands intertwine.
        const ang = t * L.twist + i * LIGHTNING_TWIST_PITCH + L.twistOffset;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        // Displaced centre of this ring.
        const cx = bp.x + (nrm.x * ca + bin.x * sa) * disp;
        const cy = bp.y + (nrm.y * ca + bin.y * sa) * disp;
        const cz = bp.z + (nrm.z * ca + bin.z * sa) * disp;
        // Tube ring around the displaced centre (slim at the ends).
        const rr = R * (0.45 + 0.55 * taper);
        const base = i * (M + 1) * 3;
        for (let j = 0; j <= M; j++) {
          const cj = ring[j][0];
          const sj = ring[j][1];
          const ox = (nrm.x * cj + bin.x * sj) * rr;
          const oy = (nrm.y * cj + bin.y * sj) * rr;
          const oz = (nrm.z * cj + bin.z * sj) * rr;
          const o = base + j * 3;
          pos[o] = cx + ox;
          pos[o + 1] = cy + oy;
          pos[o + 2] = cz + oz;
        }
      }
      L.geom.attributes.position.needsUpdate = true;
      // Tagged bolts can be pulled back by the caller — the span inside a
      // component gives way to that component's own reaction.
      const fade = L.tag ? (this.fades.get(L.tag) ?? 0) : 0;
      L.mat.opacity =
        Math.min(1, L.baseOpacity * (crackling ? 1.5 : 1)) *
        (1 - fade) *
        this.intensity;
    }
  }

  /** Hide the current without tearing the bolts down — an open switch. */
  public setVisible(visible: boolean): void {
    this.visible = visible;
    for (const bolt of this.bolts) {
      if (bolt.mesh) bolt.mesh.visible = visible;
    }
  }

  public clear(): void {
    for (const L of this.bolts) {
      if (!L) continue;
      if (L.geom) L.geom.dispose();
      if (L.mat) L.mat.dispose();
      if (L.mesh && this.parentGroup) this.parentGroup.remove(L.mesh);
    }
    this.bolts = [];
  }

  public dispose(): void {
    this.clear();
  }
}
