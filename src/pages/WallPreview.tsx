import { useEffect, useRef, useState } from "react";

/**
 * Standalone preview of a building envelope, built to a tradesperson's spec.
 *
 * Deliberately its own route and its own scene: the geometry needs to be judged
 * before deciding what surface it ends up on, and nothing here should be able to
 * disturb the builder or the arena while that is being decided.
 *
 * Runs on React + three.js directly — no iframe.
 *
 * Real-world rules this encodes (they are structural, not decorative):
 *  - Sheathing runs in HORIZONTAL courses and the joints are STAGGERED. A
 *    continuous aligned seam is a shear plane; staggered joints are what give a
 *    wall its racking resistance.
 *  - Every panel edge breaks on a stud centreline so two sheets share the stud
 *    and each gets half its width to fasten to.
 *  - A course therefore starts with a HALF sheet, the next course with a FULL
 *    sheet, which offsets the joints by 4 ft. At 16" o.c. a full sheet is exactly
 *    6 bays and a half sheet exactly 3, so every joint lands on framing with
 *    nothing cut off-module.
 *  - House wrap runs HORIZONTALLY around the building, bottom course first, each
 *    upper course lapping OVER the one below so water sheds outward. That
 *    shingle-lap direction is the whole point of the layer; lapping the wrong
 *    way funnels water into the wall.
 *  - Vertical seams occur only where a roll ENDS (butt joint) — rolls run
 *    100-150 ft, so these are occasional, not rhythmic.
 *  - The tape is the point. Plain white wrap is a featureless blob; the red or
 *    blue on the seams and around every opening is what gives the wall rhythm.
 */

const FT = 1; // world unit = 1 foot
const WALL_W = 24 * FT;
const WALL_H = 12 * FT;
const STUD_OC = 16 / 12; // 16" on centre
const STUD_W = 1.5 / 12;
const STUD_D = 3.5 / 12;
const COURSE_H = 4 * FT; // 4x8 sheet laid horizontally
const SHEET_FULL = 8 * FT;
const SHEET_HALF = 4 * FT;
// Tyvek ships in 3, 4.5, 5, 9 and 10 ft rolls. 4.5 ft is a real product and the
// one that gives a 12 ft wall an honest rhythm — a 9 ft roll would put a single
// seam at the storey line and leave the rest blank.
const ROLL_H = 4.5 * FT;
const WRAP_LAP = 0.5 * FT; // upper course laps over the lower
const ROLL_END_X = 15 * FT; // one butt joint where a roll ran out
const TAPE_W = 3 / 12; // 3" tape
const JOINT_GAP = 0.045; // visible seam between panels — the stagger has to read

// Openings are cut out of both sheathing and wrap, then taped.
const OPENINGS = [
  { x: 3.5, y: 4.5, w: 3, h: 4 }, // window
  { x: 14, y: 4.5, w: 4, h: 4 }, // window
  { x: 20.5, y: 2.2, w: 0.8, h: 0.8 }, // vent
];

const TAPE_COLORS = { red: 0xd0342c, blue: 0x2f6fd0 };
type TapeColor = keyof typeof TAPE_COLORS;

/** Panel runs for one course, following the half-sheet-start rule. */
function courseRuns(courseIndex: number): { x: number; w: number }[] {
  const runs: { x: number; w: number }[] = [];
  // Odd courses start with a half sheet; that 4 ft offset is the stagger.
  let x = 0;
  if (courseIndex % 2 === 0) {
    runs.push({ x: 0, w: SHEET_HALF });
    x = SHEET_HALF;
  }
  while (x < WALL_W - 0.001) {
    const w = Math.min(SHEET_FULL, WALL_W - x);
    runs.push({ x, w });
    x += w;
  }
  return runs;
}

export default function WallPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<import("three").WebGLRenderer | null>(null);
  const wrapGroupRef = useRef<import("three").Group | null>(null);
  const tapeMatsRef = useRef<import("three").MeshStandardMaterial[]>([]);

  const [wrapOn, setWrapOn] = useState(true);
  const [tape, setTape] = useState<TapeColor>("red");

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let controls: { update: () => void; dispose: () => void } | null = null;

    void Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, controlsModule]) => {
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#141922");

      const camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / Math.max(1, canvas.clientHeight),
        0.1,
        200,
      );
      // Near head-on: the whole point is reading the joint pattern, and an
      // oblique view foreshortens the stagger into mush. Slight offset only, so
      // it still reads as a wall in space rather than a flat texture.
      camera.position.set(WALL_W * 0.14, WALL_H * 0.1, 27);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      rendererRef.current = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.15;

      scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2620, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 1.9);
      key.position.set(9, 14, 16);
      scene.add(key);

      const root = new THREE.Group();
      root.position.set(-WALL_W / 2, -WALL_H / 2, 0);
      scene.add(root);

      // ── Framing ────────────────────────────────────────────────────────────
      const studMat = new THREE.MeshStandardMaterial({
        color: 0xd6bd8d,
        roughness: 0.85,
      });
      const studGeo = new THREE.BoxGeometry(STUD_W, WALL_H, STUD_D);
      for (let x = 0; x <= WALL_W + 0.001; x += STUD_OC) {
        const stud = new THREE.Mesh(studGeo, studMat);
        stud.position.set(x, WALL_H / 2, -STUD_D / 2);
        root.add(stud);
      }
      for (const y of [STUD_W / 2, WALL_H - STUD_W / 2]) {
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_W, STUD_W, STUD_D),
          studMat,
        );
        plate.position.set(WALL_W / 2, y, -STUD_D / 2);
        root.add(plate);
      }

      // ── Sheathing: horizontal courses, staggered joints ────────────────────
      const osbMat = new THREE.MeshStandardMaterial({
        color: 0xb9955c,
        roughness: 0.95,
      });
      const courses = Math.ceil(WALL_H / COURSE_H);
      for (let c = 0; c < courses; c++) {
        const y = c * COURSE_H;
        const h = Math.min(COURSE_H, WALL_H - y);
        for (const run of courseRuns(c)) {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(
              run.w - JOINT_GAP,
              h - JOINT_GAP,
              0.5 / 12,
            ),
            osbMat,
          );
          panel.position.set(run.x + run.w / 2, y + h / 2, 0.25 / 12);
          root.add(panel);
        }
      }

      // ── House wrap + tape (the layer that toggles) ─────────────────────────
      const wrapGroup = new THREE.Group();
      wrapGroupRef.current = wrapGroup;
      root.add(wrapGroup);

      const wrapMat = new THREE.MeshStandardMaterial({
        color: 0xe8ecef,
        roughness: 0.9,
      });
      const tapeMat = new THREE.MeshStandardMaterial({
        color: TAPE_COLORS[tape],
        roughness: 0.55,
      });
      tapeMatsRef.current = [tapeMat];

      const WRAP_Z = 0.75 / 12;
      // Courses go on bottom-first. Each is drawn slightly proud of the one
      // below so the lap reads the correct way round: upper OVER lower.
      const exposure = ROLL_H - WRAP_LAP;
      const courseCount = Math.ceil(WALL_H / exposure);
      const seamYs: number[] = [];
      for (let c = 0; c < courseCount; c++) {
        const bottom = c * exposure;
        const top = Math.min(bottom + ROLL_H, WALL_H);
        const h = top - bottom;
        if (h <= 0) break;
        const sheet = new THREE.Mesh(
          new THREE.PlaneGeometry(WALL_W, h),
          wrapMat,
        );
        sheet.position.set(WALL_W / 2, bottom + h / 2, WRAP_Z + c * 0.002);
        wrapGroup.add(sheet);
        if (c > 0) seamYs.push(bottom);
      }

      // Tape along each horizontal lap. Taping the laps is optional for water
      // once they are shingled correctly, but standard when the wrap is doing
      // double duty as the air barrier — and it is what breaks up the white.
      for (const y of seamYs) {
        const seam = new THREE.Mesh(
          new THREE.PlaneGeometry(WALL_W, TAPE_W),
          tapeMat,
        );
        seam.position.set(WALL_W / 2, y, WRAP_Z + 0.03);
        wrapGroup.add(seam);
      }

      // The one vertical seam: where a roll ran out and the next was butted to
      // it. Taped full height.
      const butt = new THREE.Mesh(
        new THREE.PlaneGeometry(TAPE_W, WALL_H),
        tapeMat,
      );
      butt.position.set(ROLL_END_X, WALL_H / 2, WRAP_Z + 0.032);
      wrapGroup.add(butt);

      // ── Openings: cut out, then taped on all four sides ────────────────────
      const holeMat = new THREE.MeshStandardMaterial({
        color: 0x0b0d12,
        roughness: 1,
      });
      for (const o of OPENINGS) {
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), holeMat);
        hole.position.set(o.x + o.w / 2, o.y + o.h / 2, WRAP_Z + 0.04);
        root.add(hole);

        const border = new THREE.Group();
        const bandH = new THREE.PlaneGeometry(o.w + TAPE_W * 2, TAPE_W);
        const bandV = new THREE.PlaneGeometry(TAPE_W, o.h + TAPE_W * 2);
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const z = WRAP_Z + 0.042;
        const top = new THREE.Mesh(bandH, tapeMat);
        top.position.set(cx, o.y + o.h + TAPE_W / 2, z);
        const bot = new THREE.Mesh(bandH, tapeMat);
        bot.position.set(cx, o.y - TAPE_W / 2, z);
        const lef = new THREE.Mesh(bandV, tapeMat);
        lef.position.set(o.x - TAPE_W / 2, cy, z);
        const rig = new THREE.Mesh(bandV, tapeMat);
        rig.position.set(o.x + o.w + TAPE_W / 2, cy, z);
        border.add(top, bot, lef, rig);
        wrapGroup.add(border);
      }

      const { OrbitControls } = controlsModule;
      const oc = new OrbitControls(camera, renderer.domElement);
      oc.target.set(0, 0, 0);
      oc.enableDamping = true;
      oc.update();
      controls = oc;

      const resize = () => {
        const el = canvasRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const h = Math.max(1, el.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener("resize", resize);
      resize();

      const animate = () => {
        if (disposed) return;
        oc.update();
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };
      frameId = window.requestAnimationFrame(animate);

      return () => window.removeEventListener("resize", resize);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      controls?.dispose();
      const renderer = rendererRef.current;
      rendererRef.current = null;
      renderer?.dispose();
      // dispose() does NOT release the WebGL context — it lives until GC, and
      // WebView allows only a handful. Hand it back explicitly.
      renderer?.forceContextLoss?.();
    };
  }, [tape]);

  useEffect(() => {
    if (wrapGroupRef.current) wrapGroupRef.current.visible = wrapOn;
  }, [wrapOn]);

  return (
    <div className="wall-preview">
      <canvas ref={canvasRef} className="wall-preview__canvas" />
      <div className="wall-preview__bar">
        <button type="button" onClick={() => setWrapOn((v) => !v)}>
          {wrapOn ? "Wrap off" : "Wrap on"}
        </button>
        <button
          type="button"
          onClick={() => setTape((t) => (t === "red" ? "blue" : "red"))}
        >
          {tape === "red" ? "Red tape" : "Blue tape"}
        </button>
        <span>
          {wrapOn
            ? "4.5 ft courses, lapped over · taped seams + openings"
            : "Staggered courses · joints on studs"}
        </span>
      </div>
    </div>
  );
}
