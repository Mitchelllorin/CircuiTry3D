import * as THREE from "three";

// ── Modelled 3D icons ────────────────────────────────────────────────────────
//
// Each entry builds a real three.js object — extruded, bevelled, lit geometry,
// not a glyph and not a picture of one. They are rendered ONCE on a single shared
// WebGL context and cached as images (see Icon3D.tsx), so the cost of the whole
// set is one frame no matter how many places show them.
//
// Modelling notes that apply to all of them:
//   - Work in a roughly [-1, 1] box. The renderer frames whatever it's given, so
//     absolute scale doesn't matter, but keeping everything in the same range
//     means every icon comes out optically the same size.
//   - These are read at ~26px. Silhouette is the whole game: bold shapes, few of
//     them, generous bevels to catch the light. Detail below ~4% of the width is
//     wasted work — it disappears in the downscale.
//   - Metal without an environment map renders black, so every material carries a
//     little emissive of its own colour. That is also the house brief: the app
//     should read lit and colourful, never dim.

const BEVEL = {
  bevelEnabled: true,
  bevelThickness: 0.035,
  bevelSize: 0.035,
  bevelOffset: 0,
  bevelSegments: 3,
  curveSegments: 24,
};

/**
 * Tinted chrome. Not "steel-ish plastic" — actual metal.
 *
 * The previous version hedged: metalness 0.45, roughness 0.32, emissive 0.2. Every
 * one of those three numbers pushes the same way, toward flat. Half-metal has half
 * a specular response, a rough surface smears what's left of it, and an emissive
 * term adds the SAME value to every face — which is precisely the light-to-dark
 * falloff that tells an eye it is looking at a solid object. Stack all three and
 * you get a shape filled with one colour: a cartoon.
 *
 * The worry behind it — "metal with no environment renders black" — is true, and
 * irrelevant here, because there IS an environment (RoomEnvironment, see Icon3D).
 * A near-chrome surface in a lit room mirrors that room, so the bevels pick up
 * bright rolls of highlight and the flanks fall away dark. That contrast is the
 * entire reason a 26px icon reads as three-dimensional.
 *
 * Colour survives because a metal tints its reflection: base colour multiplies
 * what is mirrored, so a blue chrome is blue AND still chrome. envMapIntensity
 * above 1 pushes the room brighter than life, which keeps it lively rather than
 * grey — the house brief, without reaching for emissive.
 */
function steel(color: number, glow: number, glowStrength = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.94,
    roughness: 0.19,
    envMapIntensity: 1.55,
    // A trace only, and purely so the faces pointing away from the room don't
    // crush to pure black against the dark chrome. Anything more flattens it.
    emissive: glow,
    emissiveIntensity: glowStrength,
  });
}

function extrude(shape: THREE.Shape, depth: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, ...BEVEL });
  geo.center();
  return geo;
}

/**
 * A ring with a HEX hole — the box end of a combination wrench.
 *
 * The round hole is what killed the last version. A circular annulus is a donut;
 * it can be a washer, a bearing, an O. Six flats and it can only be one thing,
 * because the hole is the shape of the fastener it drives. This is the single
 * highest-value detail in the whole model: it costs six line segments and it is
 * what makes the silhouette say "wrench" before any of the shading is even read.
 *
 * `flatDeg` rotates the hex so a FLAT faces along the shaft rather than a corner.
 * A corner pointing down the shaft puts the thinnest wall exactly where the tool
 * would snap, and the eye knows it — it reads wrong even when you can't say why.
 */
function boxEnd(outer: number, hexR: number, flatDeg: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, 0, Math.PI * 2, false);

  const hole = new THREE.Path();
  const off = THREE.MathUtils.degToRad(flatDeg);
  for (let i = 0; i < 6; i++) {
    const a = off + (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * hexR;
    const y = Math.sin(a) * hexR;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  s.holes.push(hole);
  return s;
}

/**
 * The open end, modelled off the photograph rather than off memory.
 *
 * The last two attempts both treated this as "a disc with a bite out of it", and
 * a real one is nothing like a disc. It is a HEAD: the shaft flares out into a
 * wedge, the wedge is squared off at the front, and the mouth is cut straight
 * back into that square face. So the outline is a rounded trapezoid, widest at
 * the jaw tips, and the front of each jaw is a flat face perpendicular to the
 * mouth - which is the detail that makes it look forged instead of punched.
 *
 * Traced from the top jaw tip, anticlockwise: out across the flat front face,
 * back along the top flank to the shoulder, in to the shaft, across the back,
 * then the mirror of all of it, and finally up the inside of the mouth.
 */
function openEnd(
  halfW: number,
  len: number,
  halfMouth: number,
  rootX: number,
  neckHalf: number,
): THREE.Shape {
  const back = -len * 1.05;
  const shoulder = -len * 0.3;
  const r = 0.05; // fillet at the root of the slot - a sharp inside corner is a crack
  const s = new THREE.Shape();

  // The jaws TAPER. Carrying the full head width all the way out to the tip -
  // which is what the previous pass did - turns the open end into a square
  // bracket, and that one error made the head look half again as big as the box
  // end, when in the photograph the two are near enough the same size. A real jaw
  // is widest at the shoulder and narrows to a rounded tip.
  const tipHalf = halfW * 0.8;
  s.moveTo(len, halfMouth);
  s.lineTo(len, tipHalf - 0.045);
  // Rounded, not cut off: a real wrench breaks this edge so it cannot bite the
  // hand, and that roundness is most of what stops it reading as a block.
  s.quadraticCurveTo(len, tipHalf, len - 0.05, tipHalf);
  s.quadraticCurveTo(shoulder + 0.06, halfW, shoulder, halfW);
  // The flare: shoulder down to the neck in one curve, which is how a forging
  // actually transitions. A straight bevel here reads as machined sheet.
  s.quadraticCurveTo(back, halfW * 0.92, back, neckHalf);
  s.lineTo(back, -neckHalf);
  s.quadraticCurveTo(back, -halfW * 0.92, shoulder, -halfW);
  s.quadraticCurveTo(shoulder + 0.06, -halfW, len - 0.05, -tipHalf);
  s.quadraticCurveTo(len, -tipHalf, len, -(tipHalf - 0.045));
  s.lineTo(len, -halfMouth);
  // Up the inside of the mouth: parallel flats with a filleted root. Parallel is
  // the whole point - it is what lets the jaws hold two faces of a hex.
  s.lineTo(rootX + r, -halfMouth);
  s.quadraticCurveTo(rootX, -halfMouth, rootX, -halfMouth + r);
  s.lineTo(rootX, halfMouth - r);
  s.quadraticCurveTo(rootX, halfMouth, rootX + r, halfMouth);
  s.closePath();
  return s;
}

/**
 * The shaft - slender, waisted, and ASYMMETRIC.
 *
 * Three things the photograph shows that a from-memory shaft never has. It is
 * barely a third of the head width (the first pass made it as thick as the heads,
 * which is the single biggest reason that version read as a bone). It pinches in
 * across the middle, because the real section is an I-beam - stiffness without
 * the weight. And it is NOT the same at both ends: the box end is fatter, since
 * that is the end you put the torque through.
 *
 * -x is the box end, +x the open end, matching how buildWrench lays them out.
 */
function shaft(halfLen: number, boxHalf: number, openHalf: number): THREE.Shape {
  const waist = Math.min(boxHalf, openHalf) * 0.78;
  const s = new THREE.Shape();
  // Control points sit at the waist height, so the curve's midpoint lands between
  // it and the ends: a gentle pinch, not a pinched-off neck.
  s.moveTo(-halfLen, boxHalf);
  s.quadraticCurveTo(0, waist, halfLen, openHalf);
  s.lineTo(halfLen, -openHalf);
  s.quadraticCurveTo(0, -waist, -halfLen, -boxHalf);
  s.closePath();
  return s;
}

/**
 * A combination wrench. NOT CURRENTLY ON A TAB - kept deliberately.
 *
 * Held the Build slot for three passes and was replaced, and the reason is worth
 * keeping: a wrench is a TWO-ENDED object, so at 26px the eye has to resolve both
 * heads or the whole thing collapses into a bar. Everything that works in this
 * set - pencil, soldering iron - is a wand: one long axis, one business end, and
 * a run of hard segment changes on the way there. That is the shape rule for this
 * icon set, and this model is the counter-example that proves it. It is also
 * accurate now (see the proportions note below), so keep it: some future tab may
 * be big enough, or generic-tool enough, to want it.
 *
 * Proportions are from a photograph of a Gedore No. 7 set, because the first two
 * passes were drawn from memory and memory made a dumbbell. The number that
 * matters most is the slenderness: a real combination wrench is about EIGHT
 * head-widths long. The first version was three, which is why it read as a bone
 * with two knobs on it - no amount of correct detail at the ends survives a
 * silhouette that wrong.
 *
 * Rendered at ~4:1 rather than the true 8:1, and that is a deliberate compromise
 * arrived at by trying both. At the true ratio, laid on the diagonal of a 26px
 * icon, the shaft is a hairline and the two heads are specks - accurate and
 * illegible. At 3:1 it is a dumbbell. 4:1 is where it still reads unmistakably
 * long and thin while the heads survive the downscale, and it is the ratio the
 * icon is FOR that decides this, not the photograph.
 *
 * Other things the photo corrected:
 *   - the shaft is barely a third of the head width, and TAPERS - thicker at the
 *     box end, which is the end that takes the torque;
 *   - the box end is a teardrop oval, not a circle, and its wall is thin: the
 *     hole is about 60% of the outer width;
 *   - the open end sits at ~15 degrees to the shaft, so the tool can be flipped
 *     for a fresh bite in a tight space.
 *
 * The hole is kept a HEX rather than the photograph's 12-point. Twelve flats at
 * 26px is a circle again, and the six-flat version says "wrench" louder - which
 * is the one job an icon has. Six-point combination wrenches are a real thing.
 */
function buildWrench(): THREE.Object3D {
  const g = new THREE.Group();
  const body = steel(0xd2e6ff, 0x1d4d8f, 0.06);
  const DEPTH = 0.115;

  const bar = new THREE.Mesh(extrude(shaft(0.82, 0.115, 0.098), DEPTH), body);
  g.add(bar);

  // Box end. Squashed into an oval along the shaft axis, which is the real forged
  // shape and also stops it reading as a lollipop.
  const ring = new THREE.Mesh(extrude(boxEnd(0.32, 0.209, 0), DEPTH), body);
  ring.position.x = -0.95;
  ring.scale.x = 1.22;
  g.add(ring);

  const jaw = new THREE.Mesh(extrude(openEnd(0.33, 0.32, 0.115, -0.1, 0.125), DEPTH), body);
  jaw.position.x = 0.95;
  jaw.rotation.z = -0.26;
  g.add(jaw);

  // Diagonal so the long axis uses the square's full diagonal, with a 3/4 tilt
  // that shows the thickness of the forging and rakes light across every bevel.
  g.rotation.set(0.28, -0.44, Math.PI / 4);
  return g;
}

/**
 * Not-metal, for the parts of an object that aren't: erasers, graphite, cloth,
 * painted wood. Same studio lighting, but a diffuse surface answers to the broad
 * panels rather than mirroring the hot ones, so it sits back against the chrome
 * instead of competing with it. Without this, everything in the set comes out
 * looking like it was cast from the same billet, which is its own kind of fake.
 */
function matte(color: number, glow: number, glowStrength = 0.06) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.12,
    roughness: 0.55,
    envMapIntensity: 1.2,
    emissive: glow,
    emissiveIntensity: glowStrength,
  });
}

/** A rounded rectangle as a 2D shape, for extruding. */
function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** The classic bolt outline, scaled. Shared by Arena and Troubleshoot. */
function boltShape(scale: number): THREE.Shape {
  const pts: [number, number][] = [
    [0.16, 1.0],
    [-0.58, 0.06],
    [-0.09, 0.06],
    [-0.34, -1.0],
    [0.62, 0.2],
    [0.09, 0.2],
  ];
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const px = x * scale;
    const py = y * scale;
    if (i === 0) {
      s.moveTo(px, py);
    } else {
      s.lineTo(px, py);
    }
  });
  s.closePath();
  return s;
}

/**
 * PRACTICE - a pencil.
 *
 * Chosen over the obvious worksheet-and-clipboard because a sheet of paper is a
 * rectangle, and a rectangle at 26px is a rectangle. A pencil is diagonal, so it
 * fills a square icon, and it has four hard silhouette events along its length -
 * eraser, ferrule, barrel, sharpened cone - which survive the downscale as a
 * rhythm even after the detail inside them has gone.
 *
 * The barrel is a SIX-sided cylinder, not a smooth one. Nobody consciously counts
 * the facets; what they see is the highlight breaking into flats instead of
 * running as one soft band, and that is the difference between a pencil and a
 * dowel.
 */
function buildPencil(): THREE.Object3D {
  const g = new THREE.Group();

  const wood = matte(0xf5a623, 0x8a4a00, 0.1);
  const bare = matte(0xe8c489, 0x6b4415, 0.08);
  const lead = matte(0x2b2f38, 0x000000, 0);
  const band = steel(0xd8dee8, 0x2a3444, 0.05);
  const rub = matte(0xff7a9c, 0x8c1f3d, 0.1);

  // Cylinders and cones are built up the Y axis; the pencil runs along X.
  // A cone is built with its apex at +Y, so the SAME +90deg turn that lays a
  // cylinder along X points a cone apex at -X - which is the sharp end, and is
  // what the first pass got backwards: flipped the wrong way, the apex pointed
  // back into the barrel and the tip read as a blunt white stub with no graphite
  // visible at all.
  const along = (m: THREE.Mesh, x: number) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    g.add(m);
  };

  along(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.02, 6, 1), wood), 0.06);
  // Bare wood of the sharpening, then the graphite. Two cones rather than one,
  // because the colour change is where the eye reads "sharpened".
  along(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 6, 1), bare), -0.61);
  along(new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.16, 6, 1), lead), -0.84);
  // Ferrule, with the crimp rings a real one has.
  along(new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.2, 20, 1), band), 0.67);
  along(new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.016, 8, 20), band), 0.62);
  along(new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.016, 8, 20), band), 0.72);
  // Eraser, domed. A flat disc end reads as a cut-off stick.
  along(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 20, 1), rub), 0.84);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    rub,
  );
  dome.rotation.z = -Math.PI / 2;
  dome.position.x = 0.91;
  g.add(dome);

  g.rotation.set(0.16, -0.2, Math.PI / 4);
  return g;
}

/**
 * TROUBLESHOOT - a magnifier over a fault.
 *
 * The emoji is a stethoscope, which is a doctor's tool and a tangle of thin tube
 * at icon size: no silhouette at all. A magnifier is the opposite - a thick ring
 * and a stub handle, two fat shapes, legible at any size - and it says "find the
 * problem" rather than "medicine", which is the actual job of this mode.
 *
 * The bolt behind the glass is what makes it OUR magnifier and not a search box.
 * It is deliberately small and high-contrast: at 26px it survives as a bright
 * flick inside a dark ring, which is all it has to do.
 */
function buildMagnifier(): THREE.Object3D {
  const g = new THREE.Group();
  const rim = steel(0x7fe8d0, 0x0d5f4e, 0.07);
  const grip = matte(0x2f3a4d, 0x0b1220, 0.05);

  const R = 0.46;
  g.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.085, 18, 56), rim));

  // The glass. Transmission would be the right material and is far too expensive
  // for a one-frame bake, so this is a plain tinted disc at low opacity - which
  // at 26px is indistinguishable, and keeps what is behind it readable.
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(R, 56),
    new THREE.MeshStandardMaterial({
      color: 0xbfe9ff,
      metalness: 0.1,
      roughness: 0.06,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.34,
    }),
  );
  glass.position.z = 0.02;
  g.add(glass);

  const bolt = new THREE.Mesh(extrude(boltShape(0.3), 0.06), matte(0xffc247, 0x8a5200, 0.22));
  bolt.position.set(0, 0, -0.03);
  g.add(bolt);

  // Handle, off the lower-right of the ring on the ring's own diagonal so the two
  // read as one object rather than a circle with a stick next to it.
  const a = -Math.PI / 4;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.62, 16, 1), grip);
  handle.rotation.z = a + Math.PI / 2;
  handle.position.set(Math.cos(a) * (R + 0.29), Math.sin(a) * (R + 0.29), 0);
  g.add(handle);

  g.rotation.set(0.12, -0.16, 0);
  return g;
}

/**
 * ARENA - a lightning bolt.
 *
 * The one icon in the set whose shape needs no argument, so all the work is in
 * the treatment: hot amber metal, a thicker extrusion than the rest (0.17 against
 * the wrench's 0.1) so the zig-zag reads as a solid slab of current with real
 * depth in its notches, and a steeper tilt to catch the softbox along the top
 * edge of both arms.
 *
 * Emissive is still low. A glowing flat bolt is a decal; a bolt made of hot metal
 * with a blown highlight on its leading edges looks like it would burn you.
 */
function buildBolt(): THREE.Object3D {
  const g = new THREE.Group();
  // NOT steel(). A near-chrome amber mirrors the studio, and the studio surround
  // is blue (0x2b4c72) - so 94% metalness handed the bolt a blue reflection over
  // an orange base and it came out olive-brown, the one colour a lightning bolt
  // must never be. Dropping metalness lets the actual amber through as diffuse
  // while roughness 0.22 keeps a hard specular streak on the leading edges, and a
  // stronger emissive than the rest of the set earns its keep here because this
  // is the one object that is supposed to be its own light source.
  const hot = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    metalness: 0.55,
    roughness: 0.22,
    envMapIntensity: 1.5,
    emissive: 0xd85a00,
    emissiveIntensity: 0.3,
  });
  g.add(new THREE.Mesh(extrude(boltShape(0.95), 0.17), hot));
  g.rotation.set(0.24, -0.38, 0.05);
  return g;
}

/**
 * LEARN - a mortarboard.
 *
 * The whole shape is the board: a thin square plate seen in three-quarter, which
 * turns the square into a diamond and gives the icon a wide, stable silhouette
 * nothing else in the set has. Under it the skull-cap is barely visible, and that
 * is correct - it is there so the board has something to sit ON, because a plate
 * floating alone reads as a diamond, not a hat.
 *
 * The tassel is the tell. It is the only thing in the set that hangs, so it puts
 * a vertical stroke off one corner that no other icon has, and gold against the
 * blue board keeps the two reading apart at any size.
 */
function buildMortarboard(): THREE.Object3D {
  const g = new THREE.Group();
  const felt = matte(0x4a8ef0, 0x0d2a63, 0.1);
  const gold = steel(0xffcf5c, 0x8a5c00, 0.14);

  // Skull cap first, so the board overlaps it.
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 28, 1), felt);
  cap.position.y = -0.2;
  g.add(cap);

  // The board. Extruded rather than a box so its edge carries a bevel and picks
  // up a highlight all the way round the diamond.
  const board = new THREE.Mesh(extrude(roundedRect(1.32, 1.32, 0.05), 0.07), felt);
  board.rotation.x = -Math.PI / 2;
  board.position.y = -0.02;
  g.add(board);

  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), gold);
  btn.position.y = 0.08;
  g.add(btn);

  // Tassel: cord out to a corner, then the hanging fall.
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.66, 10, 1), gold);
  cord.rotation.z = Math.PI / 2;
  cord.position.set(0.34, 0.08, 0.34);
  g.add(cord);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), gold);
  knot.position.set(0.67, 0.02, 0.34);
  g.add(knot);
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.06, 0.6, 12, 1), gold);
  fall.position.set(0.67, -0.32, 0.34);
  g.add(fall);

  // Steeper than the rest of the set on purpose. The board is a flat plate, and a
  // flat plate seen near-on is a rectangle; it needs enough tilt to read as a
  // plane in space AND to let the cap and the tassel show under its edge, which
  // is the whole difference between a hat and a blue lozenge at 26px.
  g.rotation.set(0.72, -0.62, 0.1);
  return g;
}

/**
 * A soldering iron. NOT CURRENTLY ON A TAB - kept deliberately.
 *
 * Held Build for one round and lost to the wire bundle, on the principle that the
 * icon should be the SUBJECT rather than a tool for handling it: this app is
 * about conductors, so Build is conductors. The model is finished and correct and
 * it is the best "do something to electronics" object in the set, so it is the
 * one to reach for if a tab ever wants that verb.
 *
 * Modelled off a photograph of a Hakko 907. The wrench kept failing for a reason
 * that had nothing to do with the modelling: a wrench is a stubby two-ended
 * object, and two ends means the eye has to resolve BOTH of them at 26px or the
 * thing reads as a bar. The pencil works because it is a wand - one long axis,
 * one business end, and a run of hard segment changes along the way. A soldering
 * iron is the same silhouette, and it is a tool for building CIRCUITS rather than
 * for undoing plumbing, which is the other half of why the wrench never sat right
 * on this app.
 *
 * Segments, tip to tail, straight off the photo: chisel tip, chrome barrel,
 * knurled retaining nut, ribbed black collar, foam grip, tapered tail, cord stub.
 * Seven changes of diameter and material along one axis - which is exactly the
 * rhythm that survives being shrunk.
 *
 * The grip is brand blue rather than the photograph's black, because a black iron
 * on a dark nav bar is a hole. The tip carries a genuine heat glow: it is the one
 * place in the set where emissive is the honest choice, because the object really
 * is emitting.
 */
function buildSolderingIron(): THREE.Object3D {
  const g = new THREE.Group();

  const chrome = steel(0xe6eefa, 0x24425f, 0.05);
  const dark = matte(0x232a36, 0x070b12, 0.04);
  const grip = matte(0x2f7fd6, 0x0a2c5c, 0.1);
  const hot = new THREE.MeshStandardMaterial({
    color: 0xffb056,
    metalness: 0.5,
    roughness: 0.32,
    envMapIntensity: 1.3,
    emissive: 0xff5a1a,
    emissiveIntensity: 0.55,
  });

  // Everything is a cylinder on the X axis; three.js builds them up Y.
  const seg = (
    rTop: number,
    rBot: number,
    len: number,
    x: number,
    mat: THREE.Material,
    facets = 24,
  ) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, facets, 1), mat);
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    g.add(m);
    return m;
  };

  // Chisel tip. A real one is a cylinder cut off at an angle and flattened, so
  // the very end is a wedge, not a point - that flat is what holds the solder.
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.045), hot);
  tip.position.set(-1.02, 0, 0);
  tip.rotation.z = 0.22;
  g.add(tip);
  seg(0.052, 0.062, 0.26, -0.83, hot, 16);
  seg(0.062, 0.085, 0.2, -0.6, chrome, 20);
  seg(0.085, 0.085, 0.34, -0.33, chrome, 20);
  // Knurled nut: few facets on purpose. The flats catch the softbox one at a time
  // and read as knurling, which no amount of smooth cylinder ever will.
  seg(0.108, 0.108, 0.12, -0.1, chrome, 14);
  seg(0.14, 0.14, 0.16, 0.04, dark, 26);
  // Foam grip, the fattest section and the visual anchor.
  seg(0.158, 0.152, 0.66, 0.45, grip, 28);
  seg(0.15, 0.118, 0.46, 1.0, dark, 26);
  // Strain relief and a stub of cord, so the tail reads as an appliance and the
  // silhouette does not just stop.
  seg(0.07, 0.05, 0.16, 1.31, dark, 16);
  seg(0.042, 0.042, 0.22, 1.5, dark, 14);

  g.rotation.set(0.16, -0.2, Math.PI / 4);
  return g;
}

/**
 * A carbon-film resistor. NOT CURRENTLY ON A TAB - kept deliberately.
 *
 * Ran against the soldering iron for the Build slot and lost on a technicality:
 * Build is an action, so it wants a tool, and a resistor is a part. The model
 * itself is finished and correct, and it is the most recognisable object in all
 * of electronics, so it is the obvious candidate the moment a tab wants a
 * component rather than a verb. Do not delete it to satisfy a lint rule.
 *
 * The most recognisable object in all of electronics, and it has the wand
 * silhouette the pencil proved: one long axis, a fat middle, thin ends.
 *
 * Two details out of the photograph that a from-memory resistor never has, and
 * which are the whole difference between this and a striped sausage:
 *   - the body is a DOG-BONE, not a cylinder. It bulges at the shoulders and then
 *     necks sharply down to the lead. Built as a lathe so that profile is real
 *     geometry catching real light, rather than a texture pretending;
 *   - the leads are tinned steel and BRIGHT - nearly white against the beige.
 *     That contrast is what makes the ends read at small size.
 *
 * The bands are brown-black-red-gold: 1 kilohm, five percent. That is the app's
 * own default resistor value (see the F.U.S.E. work), so the icon is not merely a
 * resistor, it is OUR resistor.
 */
function buildResistor(): THREE.Object3D {
  const g = new THREE.Group();

  const beige = matte(0xe8dcc0, 0x6b5a33, 0.09);
  const lead = steel(0xf0f4fa, 0x33465c, 0.06);

  const BODY_R = 0.235;
  const HALF = 0.62;

  // Lathe profile, from the middle out to the neck. Radii read straight off the
  // photograph: flat barrel, a slight swell at the shoulder, then a fast taper.
  const profile: [number, number][] = [
    [0, 0],
    [BODY_R, 0],
    [BODY_R, HALF * 0.62],
    [BODY_R * 1.02, HALF * 0.76],
    [BODY_R * 0.86, HALF * 0.88],
    [BODY_R * 0.42, HALF * 0.97],
    [BODY_R * 0.17, HALF],
    [0, HALF],
  ];
  const half = new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      40,
    ),
    beige,
  );
  half.rotation.z = -Math.PI / 2;
  g.add(half);
  const other = half.clone();
  other.rotation.z = Math.PI / 2;
  g.add(other);

  // Colour bands. Slightly proud of the body so they catch their own highlight -
  // on a real resistor the paint sits on top of the ceramic, and at icon size a
  // flush band disappears into the beige.
  const band = (x: number, color: number, w: number) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY_R * 1.015, BODY_R * 1.015, w, 40, 1),
      matte(color, 0x000000, 0.02),
    );
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    g.add(m);
  };
  band(-0.3, 0x6b3a1e, 0.095); // brown  1
  band(-0.15, 0x14181f, 0.095); // black  0
  band(0.0, 0xcc2b1d, 0.095); // red    x100  -> 1 kilohm
  band(0.34, 0xd8a83c, 0.085); // gold   +/-5%

  // Leads. Bright, thin, and long enough that the body reads as a component
  // WIRED IN rather than as a bead.
  const wire = (x: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.62, 14, 1), lead);
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    g.add(m);
  };
  wire(-0.92);
  wire(0.92);

  g.rotation.set(0.18, -0.22, Math.PI / 4);
  return g;
}

/**
 * BUILD - a bundle of wires, cut ends toward the viewer.
 *
 * Several gauges, several colours, the ends staggered, seen at an angle so each
 * cut face is an ellipse showing insulation around a bright copper core. The
 * user's idea, and it is a better icon than any of the three tools that came
 * before it, for three reasons worth writing down:
 *
 *   1. It is the SUBJECT, not a tool for it. A wrench, a screwdriver, even a
 *      soldering iron are things you hold while doing something else. This app is
 *      about conductors, so the icon is conductors.
 *   2. It carries real colour without inventing any. Wire insulation is already
 *      red, blue, yellow, green - the house brief asks for colour and the
 *      subject supplies it, which is always better than tinting something that
 *      should be grey.
 *   3. It NEEDS three dimensions. A flat version of this is a row of circles; the
 *      whole read depends on the ellipses of the cut faces receding at an angle
 *      and the copper catching light down inside each one. Nothing else in the
 *      set makes the case for a modelled icon this plainly.
 *
 * The staggered lengths are load-bearing, not decoration. Cut every wire to the
 * same length and the ends form one flat plane, which reads as a single striped
 * block. Staggering them puts each ellipse at its own depth, and that parallax is
 * what makes the bundle read as a bundle at 26px.
 */
function buildWireBundle(): THREE.Object3D {
  const g = new THREE.Group();

  // Copper, and NOT near-chrome, which is what the first pass tried.
  //
  // A cut face is a small flat disc, and a flat disc mirrors exactly one patch of
  // the environment - whichever one it happens to face. Yawed round to show the
  // ends, these faces point at a dark quarter of the studio, so at 0.92 metalness
  // every core came out near-black and the bundle read as six hollow straws. The
  // one thing the icon must show is solid copper, so the core cannot be left at
  // the mercy of where it happens to be pointing.
  //
  // Half-metal with a warm base and a real emissive term fixes it: enough
  // specular to still look like metal, but a floor of its own colour so a core
  // facing nowhere in particular is still unmistakably copper.
  const copper = new THREE.MeshStandardMaterial({
    color: 0xff9d52,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.5,
    emissive: 0xc9560c,
    emissiveIntensity: 0.42,
  });

  // Insulation is glossy PVC, not the set's default matte. A sheen down the top
  // of each wire is what makes six cylinders read as six ROUND cylinders rather
  // than as flat coloured bars, and it is most of what sells the bundle.
  const jacket = (color: number) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.08,
      roughness: 0.28,
      envMapIntensity: 1.35,
      emissive: color,
      emissiveIntensity: 0.07,
    });

  // gauge, colour, y, z, cut length, fan
  // Offsets are close enough that neighbouring jackets touch. A BUNDLE is the
  // point; spaced out, this is six loose wires lying near each other, and the
  // gaps let the dark background through and eat the silhouette at 26px.
  const WIRES: [number, number, number, number, number, number][] = [
    [0.16, 0xf03434, 0.0, 0.0, 0.64, 0.0], //      red, fattest, front centre
    [0.125, 0x2b86f0, 0.25, -0.06, 1.0, 0.04], //  blue
    [0.11, 0xffcc22, -0.23, -0.03, 0.38, -0.03], // yellow
    [0.14, 0x22c46a, 0.05, -0.24, 1.26, 0.02], //  green
    [0.095, 0xeef3fa, -0.17, -0.26, 0.8, -0.05], // white, thinnest
    [0.115, 0xff8420, 0.26, -0.29, 0.16, 0.05], // orange
  ];

  const TAIL = -1.15;

  for (const [r, color, y, z, cut, fan] of WIRES) {
    const w = new THREE.Group();
    const len = cut - TAIL;
    const mid = (cut + TAIL) / 2;

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 26, 1), jacket(color));
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = mid;
    w.add(sleeve);

    // The core, pushed a hair proud of the cut face so its disc paints in front
    // of the insulation's end cap instead of fighting it for the same depth.
    // Fat enough to survive the downscale: at r * 0.55 the core was a couple of
    // pixels at icon size and simply vanished, taking the whole idea with it.
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.62, r * 0.62, len + 0.02, 20, 1),
      copper,
    );
    core.rotation.z = Math.PI / 2;
    core.position.x = mid + 0.01;
    w.add(core);

    w.position.set(0, y, z);
    w.rotation.y = fan;
    g.add(w);
  }

  // Yaw brings the cut ends round toward the camera so the faces read as
  // ellipses rather than edge-on lines; the roll puts the run of the bundle on
  // the square's diagonal. Both matter - lose the yaw and the copper disappears,
  // which is the whole point of the icon.
  g.rotation.set(0.2, -1.12, 0.5);
  return g;
}

/**
 * A shallow extrusion. The shared BEVEL is 0.035 thick, which is FATTER than a
 * book board is deep - and a bevel deeper than the extrusion turns the solid
 * inside out. Anything under ~0.1 deep needs its own, smaller bevel.
 */
function thinExtrude(shape: THREE.Shape, depth: number, bevel: number) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.center();
  return geo;
}

/**
 * Paper. Cream, and lit from inside far more than a diffuse surface deserves.
 *
 * Same call as the copper cores in the wire bundle: the page block shows itself
 * on three narrow flat edges, and a narrow flat edge mirrors exactly one patch of
 * the studio - so left to physics it goes dark whenever it happens to face a dark
 * quarter, and the book turns into a solid coloured brick. The value jump from
 * cover to paper is most of what says "book", so it is not allowed to be at the
 * mercy of the environment.
 *
 * A FUNCTION, not a shared constant: Icon3D.disposeTree() disposes every material
 * it finds after each icon is captured, so a module-level material would be dead
 * the second time the set renders - which HMR does on every save.
 */
const paper = () => matte(0xf1e5cb, 0xa08a5e, 0.3);

/**
 * One hardback lying flat. Thickness runs up +Y, the spine is the -X edge.
 *
 * Built as the four parts a real hardback actually has, because the joins between
 * them are the whole icon: two boards, a spine covering, and a page block that
 * stands INSIDE the boards on the head, tail and fore-edge. That last inset - the
 * binder's "square" - is the detail the drawn version always drops, and dropping
 * it is what makes a book icon read as a coloured brick.
 */
function hardback(w: number, d: number, t: number, cover: THREE.Material) {
  const g = new THREE.Group();
  const boardT = 0.042;
  const spineW = 0.1;
  const square = 0.045;

  // Extruding in XY and tipping the result back puts the extrusion depth on +Y,
  // so "depth" reads as thickness for every piece here.
  const lay = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  for (const side of [-1, 1]) {
    const board = lay(thinExtrude(roundedRect(w, d, 0.05), boardT * 0.6, 0.012), cover);
    board.position.y = side * (t / 2 - boardT / 2);
    g.add(board);
  }

  // A box, not an extrusion: at a tenth of a unit wide there is no room for a
  // bevel, and the crisp arris down a spine is right anyway.
  const spine = new THREE.Mesh(new THREE.BoxGeometry(spineW, t, d), cover);
  spine.position.x = -w / 2 + spineW / 2;
  g.add(spine);

  const pw = w - spineW - square;
  const pages = lay(
    thinExtrude(roundedRect(pw, d - square * 2, 0.02), t - boardT * 2 - 0.02, 0.008),
    paper(),
  );
  pages.position.x = (spineW - square) / 2;
  g.add(pages);

  return g;
}

/**
 * TEXTBOOK - three hardbacks stacked, seen from above and off to the spine side.
 *
 * Modelled from a photograph of a stack of school books, which corrected three
 * things the drawn book icon always gets wrong:
 *
 *  1. The COVER OVERHANGS THE PAGES - see `hardback`.
 *  2. The PAGE BLOCK IS A DIFFERENT MATERIAL. Saturated cloth against cream paper
 *     is most of the read; the colour difference matters less than the VALUE one.
 *  3. Books are THIN. About a seventh of their width, not the fat blocks an icon
 *     usually draws. Three thin ones stack in the space one fat one would take.
 *
 * A stack rather than a single book for the same reason the wire bundle is a
 * bundle: one flat slab at an angle is just a parallelogram, while three of them
 * stepped, shrinking and skewed against each other put a run of colour/cream
 * stripes down the silhouette that still reads after the downscale to 26px. The
 * skew is load-bearing - squared up, the three merge into one striped block.
 *
 * Colour comes from the subject. Book cloth is red, ochre and blue in the world,
 * so nothing has to be tinted for the sake of the house brief.
 */
function buildBookStack(): THREE.Object3D {
  const g = new THREE.Group();

  // Deeper cloth than the reference photo, deliberately. The top cover takes the
  // studio's softbox square on, so a mid-tone up there renders near-white - and
  // at 26px the top face is the largest area in the icon, which turns the whole
  // thing into a pale lump. The covers have to start dark enough to survive being
  // lit, or the paper has nothing to be brighter than.
  const books: [number, number, number, THREE.Material, number, number, number][] = [
    // w, d, thickness, cover, skew, x nudge, z nudge
    [1.56, 1.12, 0.27, matte(0x9e2118, 0x3a0703, 0.1), -0.15, 0, 0],
    [1.42, 1.02, 0.23, matte(0xc47a12, 0x4a2600, 0.1), 0.11, 0.03, -0.02],
    [1.28, 0.94, 0.2, matte(0x14618f, 0x032033, 0.1), -0.07, -0.02, 0.03],
  ];

  let y = 0;
  let top: THREE.Group | null = null;
  let topW = 0;
  let topD = 0;
  for (const [w, d, t, cover, skew, dx, dz] of books) {
    const b = hardback(w, d, t, cover);
    b.position.set(dx, y + t / 2, dz);
    b.rotation.y = skew;
    g.add(b);
    y += t;
    top = b;
    topW = w;
    topD = d;
  }

  // One gold rule foil-stamped along the top cover, near the spine. It is the
  // only metal in the icon, so it is the only thing that throws a hard highlight
  // - which is what stops three matte slabs reading as a stack of coasters.
  if (top) {
    const foil = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.014, topD * 0.62),
      steel(0xffcf5c, 0x8a5c00, 0.16),
    );
    foil.position.set(-topW / 2 + 0.26, 0.2 / 2 - 0.004, 0);
    top.add(foil);
  }

  g.position.y = -y / 2;

  // Shallow on purpose. Pitch trades the stacked EDGES for the top cover, and the
  // edges are the icon: cloth/cream/cloth/cream banding down the side is what
  // survives the downscale, while the top face is one flat plane that only ever
  // gets bigger and brighter. Enough tilt to prove there is a top, no more.
  //
  // Yawed so the SPINE comes round to the near side. The fore-edge shows more
  // cream, but bare paper on both visible sides reads as a stack of paper; one
  // solid spine is what makes it a stack of books.
  const outer = new THREE.Group();
  outer.add(g);
  outer.rotation.set(0.34, 0.62, 0.09);
  return outer;
}

/**
 * Glossy plastic - a moulded ball top, an arcade button, an insulated bead.
 *
 * Between `steel` and `matte`: it takes a sharp specular hit like the chrome does,
 * but it is not a mirror, so its colour stays its own instead of becoming whatever
 * the studio is. Nearly everything man-made and coloured in this set is this.
 */
function gloss(color: number, glow: number, glowStrength = 0.08) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.14,
    envMapIntensity: 1.35,
    emissive: glow,
    emissiveIntensity: glowStrength,
  });
}

/**
 * Put an extruded piece back where its 2D shape was drawn.
 *
 * `extrude` and `thinExtrude` both call geometry.center(), which is what keeps a
 * single-piece icon centred - and what makes a MULTI-piece one impossible, since
 * every part lands on the origin and the coordinates they were traced in are
 * thrown away. This reads the offset back off the shape, so several pieces can be
 * drawn in one shared coordinate system and still assemble.
 */
function atShape(shape: THREE.Shape, geo: THREE.BufferGeometry, mat: THREE.Material) {
  const c = new THREE.Box2().setFromPoints(shape.getPoints(24)).getCenter(new THREE.Vector2());
  const m = new THREE.Mesh(geo, mat);
  m.position.set(c.x, c.y, 0);
  return m;
}

/** A cylinder spanning two points - a conductor between two junctions. */
function link(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 12, 1), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

/**
 * HELP - a life ring.
 *
 * From a photograph of one floating at a jetty, two things that the drawn version
 * gets wrong. It is FAT: the tube is about a third of the outer radius, so the
 * hole is only ~40% of the overall width - a thin hoop reads as a washer. And the
 * quarters are the whole identity; without the alternating bands it is a tyre.
 *
 * Eight arcs rather than four, which is what a real buoy carries. At 26px each
 * band is still ~10px of arc, so the rhythm survives - and the rhythm is what
 * separates this from Troubleshoot's magnifier, the other round thing in the set.
 * The magnifier has a long dark handle; this has none, and that is the difference
 * the eye actually uses.
 */
function buildLifeRing(): THREE.Object3D {
  const g = new THREE.Group();
  const R = 0.72;
  const TUBE = 0.28;
  const SEG = 8;
  const arc = (Math.PI * 2) / SEG;

  for (let i = 0; i < SEG; i++) {
    // 1.04 of an arc each: butt-jointed segments show daylight between them once
    // the bevelled highlight rolls off, and a gap in a ring reads as a break.
    const geo = new THREE.TorusGeometry(R, TUBE, 16, 14, arc * 1.04);
    const m = new THREE.Mesh(
      geo,
      i % 2
        ? matte(0xeef1f5, 0x8f9aa8, 0.26) // white needs a floor or it greys out
        : matte(0xd4342a, 0x4a0904, 0.12),
    );
    m.rotation.z = i * arc;
    g.add(m);
  }

  // The grab line. It costs one thin torus and it does two jobs: it puts a hard
  // outer edge on a shape that is otherwise all soft rolls, and it is the detail
  // that says rescue equipment rather than pool toy.
  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(R + TUBE * 0.88, 0.038, 8, 64),
    matte(0xdcd3bd, 0x7a6f56, 0.2),
  );
  g.add(rope);

  g.rotation.set(0.62, 0.08, 0.38);
  return g;
}

/**
 * PRICING - a swing tag.
 *
 * Chosen over a coin stack (we already have a stack) and over a card (a card is a
 * rectangle, and a rectangle at an angle is a parallelogram - the failure mode
 * this set keeps hitting). The tag survives because three details break the slab:
 * the pointed end, the eyelet punched through it, and the metal grommet round the
 * eyelet, which is the only hard highlight on the whole piece.
 *
 * Modelled from knowledge rather than reference - Commons had nothing but
 * supermarket shelf-edge labels, which are a different object entirely.
 */
function buildPriceTag(): THREE.Object3D {
  const g = new THREE.Group();
  const T = 0.17;
  const halfH = 0.5;
  const right = 0.86;
  // A longer, narrower taper than a real swing tag has. The point is what stops
  // this being a card, so it gets more of the length than accuracy would give it.
  const neck = -0.32;
  const tip = -0.98;
  const r = 0.14;

  const s = new THREE.Shape();
  s.moveTo(tip + 0.05, -0.06);
  s.quadraticCurveTo(tip, 0, tip + 0.05, 0.06); // the point is rounded, not sharp
  s.lineTo(neck, halfH);
  s.lineTo(right - r, halfH);
  s.quadraticCurveTo(right, halfH, right, halfH - r);
  s.lineTo(right, -halfH + r);
  s.quadraticCurveTo(right, -halfH, right - r, -halfH);
  s.lineTo(neck, -halfH);
  s.closePath();

  // Big enough to survive the downscale. At 0.13 the hole closed up into a dark
  // speck and the tag read as a solid red slab.
  const eyeAt = -0.5;
  const hole = new THREE.Path();
  hole.absarc(eyeAt, 0, 0.23, 0, Math.PI * 2, false);
  s.holes.push(hole);

  g.add(atShape(s, thinExtrude(s, T, 0.022), matte(0xc8342c, 0x430704, 0.12)));

  // The grommet stands proud of BOTH faces - a flush ring would just be a darker
  // circle, and the whole reason it is here is to catch a highlight. Thin, though:
  // a fat one closes the eyelet back up, and the icon needs the hole to punch
  // through to the dark background. A filled ring reads as a stud, not a hole.
  const grommet = new THREE.Mesh(
    new THREE.TorusGeometry(0.255, 0.045, 10, 30),
    steel(0xdae1ec, 0x2a3444, 0.1),
  );
  grommet.position.x = eyeAt;
  g.add(grommet);

  // No cord. The first version had one looping out of the eyelet and it turned
  // the whole icon into a handbag - a loop above a rounded body is a handle, and
  // the eye takes that reading before it takes "tag". The punched hole says
  // "hangs from something" on its own.

  // Squarer to camera than the rest of the set. The pointed end is the entire
  // silhouette, and yaw is what foreshortens a point away to nothing.
  g.rotation.set(0.28, -0.3, 0.48);
  return g;
}

/**
 * ARCADE - a ball-top joystick on its panel.
 *
 * Textbook case of the shape rule this set runs on: one long axis, one business
 * end, and hard changes of section on the way up - plate, dust washer, thin
 * shaft, big ball. The ball is four times the shaft, and that ratio IS the icon;
 * closer to equal and it is a pin.
 *
 * The two buttons beside it are not decoration. From the reference, a stick never
 * appears alone on a panel, and they are what fixes the reading as "arcade
 * cabinet" rather than "gear lever" or "lollipop".
 */
function buildJoystick(): THREE.Object3D {
  const g = new THREE.Group();
  const deck = -0.35;

  const plate = new THREE.Mesh(extrude(roundedRect(1.5, 1.08, 0.13), 0.14), matte(0x161c2e, 0x050912, 0.12));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = deck - 0.07;
  g.add(plate);

  const stickX = -0.28;
  const stickZ = 0.06;

  const washer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.26, 0.08, 26, 1),
    matte(0x2b3350, 0x0a0f1e, 0.12),
  );
  washer.position.set(stickX, deck + 0.03, stickZ);
  g.add(washer);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.066, 0.078, 0.66, 16, 1),
    steel(0xd7dfea, 0x2a3444, 0.08),
  );
  shaft.position.set(stickX, deck + 0.36, stickZ);
  g.add(shaft);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.31, 30, 22), gloss(0xe23b3b, 0x4a0705, 0.12));
  ball.position.set(stickX, deck + 0.82, stickZ);
  g.add(ball);

  const button = (x: number, z: number, c: number, glow: number) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.185, 0.12, 26, 1), gloss(c, glow, 0.16));
    b.position.set(x, deck + 0.02, z);
    g.add(b);
  };
  button(0.34, -0.16, 0x35c6f0, 0x03384d);
  button(0.63, 0.24, 0xf2b134, 0x4d3200);

  // Low pitch. The stick's height in silhouette is the icon, and pitch is exactly
  // what spends it - tip it far enough to show the panel properly and the ball
  // slides down over the plate and the whole thing becomes a blob.
  g.rotation.set(0.3, -0.46, 0.05);
  return g;
}

/**
 * CLASSROOM - the teacher's hand bell.
 *
 * A schoolhouse was the obvious pick and is unusable: a building is windows and
 * roofline, all of it under the 4%-of-width floor, so at 26px it is a lump. The
 * bell is the classroom object that has a silhouette - and it obeys the shape
 * rule, one axis with one business end.
 *
 * The photograph corrected the profile twice. A real bell is a FLARE, not a
 * hemisphere: it leaves the crown almost straight and only opens out in the last
 * third. And the mouth ends in a rolled lip that turns back under itself, which
 * is where the brightest highlight in the model sits - a cone cut off square
 * reads as a lampshade.
 */
function buildHandBell(): THREE.Object3D {
  const g = new THREE.Group();

  const brass = steel(0xd9a441, 0x6b4405, 0.14);
  // The mouth is open, so we see the inside surface, whose normals face the other
  // way. Single-sided, it renders as a hole straight through the model.
  brass.side = THREE.DoubleSide;

  const profile: [number, number][] = [
    [0.0, 0.6],
    [0.13, 0.59],
    [0.19, 0.5],
    [0.24, 0.33],
    [0.31, 0.13],
    [0.42, -0.07],
    [0.55, -0.23],
    [0.6, -0.31], // outer lip
    [0.56, -0.35], // rolled back under
    [0.51, -0.3],
    [0.45, -0.19], // and up the inside
    [0.35, 0.0],
    [0.27, 0.2],
    [0.2, 0.38],
    [0.11, 0.5],
    [0.0, 0.5],
  ];
  g.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 44),
      brass,
    ),
  );

  // Turned grip, in BONE - and the colour is the whole fix.
  //
  // First pass gave it dark walnut, which is what a Victorian school bell has and
  // exactly wrong here: against a dark nav bar a dark handle is not a handle, it
  // is absent, so the icon collapsed to a gold triangle that read as a paper
  // plane. The handbells in the reference photograph all have pale handles, so
  // this is accurate as well as legible - but it would be worth doing either way.
  // The rule: on a dark surface, an icon's SECOND colour has to be lighter than
  // the ground, or the object loses whichever part carries it.
  //
  // Chunkier than a real one too. A slim stem survives at 150px and disappears at
  // 26, and the two-part read - flare plus grip - is the whole identity.
  const grip: [number, number][] = [
    [0.0, 0.56],
    [0.09, 0.59],
    [0.1, 0.7],
    [0.16, 0.82],
    [0.17, 1.0],
    [0.13, 1.12],
    [0.08, 1.17],
    [0.0, 1.19],
  ];
  g.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(grip.map(([x, y]) => new THREE.Vector2(x, y)), 30),
      matte(0xe7dcc6, 0x8a7f66, 0.26),
    ),
  );

  const clapper = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 20, 14),
    steel(0x8d949f, 0x1a1e26, 0.08),
  );
  clapper.position.y = -0.18;
  g.add(clapper);

  // Rolled over as if mid-swing. Upright, the mouth is a horizontal line and the
  // bell is a triangle; tilted, the lip opens into an ellipse and the object
  // becomes hollow, which is the entire difference between a bell and a cone.
  g.rotation.set(0.14, -0.36, 0.3);
  return g;
}

/**
 * CLASSROOM - the teacher's apple.
 *
 * This replaced a hand bell, and the bell's failure is the useful part. A bell is
 * a CONE, and a cone at 26px is a triangle. Two attempts to rescue it both failed
 * in an instructive way: a pale handle only produced a triangle with a stick on
 * it, and pitching the camera under the rim to open the mouth into an ellipse -
 * which is genuinely the right instinct, and works at 150px - turned it into a
 * crumpled horn once the downscale took the ellipse away. The lesson is that a
 * detail which only exists in SHADING cannot save a silhouette; at this size the
 * outline has to carry the object on its own. The bell is parked, not deleted.
 *
 * The apple wins on the thing that actually decides these: it is one compact mass
 * with two hard colour breaks - stem and leaf - sitting on a notched top. Solid
 * red, one green flag. That survives any amount of downscaling.
 *
 * Not a sphere, despite appearances. The profile is turned: a dimple at the top,
 * a broad shoulder, and a narrower base with a second dimple under it. A ball
 * with a stick in it reads as a cherry.
 */
function buildApple(): THREE.Object3D {
  const g = new THREE.Group();

  const profile: [number, number][] = [
    [0.0, 0.5],
    [0.11, 0.48], // the dimple the stem sits in
    [0.24, 0.55],
    [0.4, 0.58],
    [0.57, 0.49],
    [0.69, 0.28],
    [0.73, 0.02],
    [0.67, -0.24],
    [0.51, -0.44],
    [0.29, -0.54],
    [0.11, -0.56],
    [0.0, -0.52],
  ];
  g.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 44),
      gloss(0xd8322a, 0x4a0904, 0.16),
    ),
  );

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.055, 0.36, 12, 1),
    matte(0x6a4a2a, 0x1d1006, 0.12),
  );
  stem.position.set(0.03, 0.63, 0);
  stem.rotation.z = -0.16;
  g.add(stem);

  // The leaf is doing more work than its size suggests: it is the only thing that
  // breaks the round silhouette, and the only colour that is not red.
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.26, 0.22, 0.6, 0.05);
  leaf.quadraticCurveTo(0.28, -0.04, 0, 0);
  const leafMesh = new THREE.Mesh(
    thinExtrude(leaf, 0.05, 0.014),
    gloss(0x54b03e, 0x0e2e0a, 0.2),
  );
  leafMesh.position.set(0.36, 0.74, 0.02);
  leafMesh.rotation.set(0.3, 0, 0.18);
  g.add(leafMesh);

  g.rotation.set(0.12, -0.3, 0.04);
  return g;
}

/**
 * COMMUNITY - four junctions and the conductors between them.
 *
 * A globe is the reflex and it is the worst possible icon: a sphere's silhouette
 * is a circle at every angle, so it carries no information at all. This is the
 * subject instead of a symbol for it - and in THIS app the subject of "people
 * connected" is already drawn, because a junction node joining conductors is the
 * app's own foundation for wiring (see the junction-node work).
 *
 * A hub and three spokes, not a mesh: six links between four nodes is a scribble
 * at 26px. The hub is deliberately the biggest and the only neutral one, so the
 * three coloured beads read as separate things joined to it.
 */
function buildNodeCluster(): THREE.Object3D {
  const g = new THREE.Group();
  const copper = steel(0xc8823c, 0x4a2405, 0.12);

  const hub = new THREE.Vector3(0, 0, 0);
  const spokes: [THREE.Vector3, number, number][] = [
    [new THREE.Vector3(0.06, 0.84, 0.16), 0x35c6f0, 0x03384d],
    [new THREE.Vector3(-0.78, -0.44, -0.18), 0xf2b134, 0x4d3200],
    [new THREE.Vector3(0.8, -0.4, 0.1), 0xd4342a, 0x4a0904],
  ];

  for (const [p] of spokes) {
    g.add(link(hub, p, 0.075, copper));
  }
  for (const [p, c, glow] of spokes) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.23, 26, 18), gloss(c, glow, 0.16));
    bead.position.copy(p);
    g.add(bead);
  }
  const centre = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 28, 20),
    gloss(0xeef1f5, 0x8f9aa8, 0.2),
  );
  g.add(centre);

  // The beads are off-plane by a fifth of a unit; without a little pitch and yaw
  // that depth does nothing and the cluster flattens into a peace sign.
  g.rotation.set(0.24, -0.3, 0.12);
  return g;
}

// Slate stripes, off the photograph: a modern clapperboard is NOT black and
// white. The colour bar is there as a camera reference, which means the icon gets
// a run of saturated colour that belongs to the object - always better than
// tinting something that should be grey.
const SLATE_STRIPES: [number, number][] = [
  [0x2e8b57, 0x0a2b1a],
  [0xe07b25, 0x4a2405],
  [0x2f5fbf, 0x081c47],
  [0xc7362c, 0x430704],
  [0xe8ecf2, 0x8b93a3],
  [0x8b93a3, 0x2a2f3a],
  [0x2a2f3a, 0x0a0d14],
  [0xd8dee8, 0x6b7382],
];

/** One striped bar of a clapperboard. The stripes SLANT - that is the tell. */
function stripeBar(w: number, h: number, depth: number): THREE.Group {
  const g = new THREE.Group();
  const n = SLATE_STRIPES.length;
  const sw = w / n;
  const slant = h * 0.45;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * sw;
    const s = new THREE.Shape();
    // Overlapped by 0.02, because each stripe's bevel eats its own edge and a
    // hairline of background between them shreds the bar at icon size.
    s.moveTo(x0, -h / 2);
    s.lineTo(x0 + sw + 0.02, -h / 2);
    s.lineTo(x0 + sw + slant + 0.02, h / 2);
    s.lineTo(x0 + slant, h / 2);
    s.closePath();
    const [c, glow] = SLATE_STRIPES[i];
    g.add(atShape(s, thinExtrude(s, depth, 0.007), matte(c, glow, 0.16)));
  }
  return g;
}

/**
 * GALLERY - a film slate, clapper OPEN.
 *
 * Open is not a pose, it is the icon. Closed, a clapperboard is a rectangle with
 * a stripe across the top, indistinguishable from a card or a screen; the raised
 * stick puts a diagonal above the silhouette that nothing else in the set has.
 * The reference has it at about 25 degrees and that is plenty.
 *
 * The white board against the colour bar is the strongest value contrast in the
 * whole icon set, which is why this one survives the downscale better than most.
 */
function buildClapperboard(): THREE.Object3D {
  const g = new THREE.Group();
  const W = 1.5;
  // Board shorter and stripes taller than the real proportions. At 26px the white
  // board is just area - it carries no information - while the colour bar and the
  // raised stick carry all of it, so the budget goes to them. A photographically
  // correct slate rendered as a blank white card with a smudge on top.
  const BH = 0.68;
  const SH = 0.3;
  const D = 0.09;
  const boardY = -0.16;

  const board = new THREE.Mesh(
    extrude(roundedRect(W, BH, 0.06), D),
    // Properly white. At 0xe6eaf1 the board rendered mid-grey once the studio
    // shaded it, and a grey slab beside a colour bar reads as a box, not a slate.
    matte(0xf4f7fb, 0xa8b0bd, 0.32),
  );
  board.position.y = boardY;
  g.add(board);

  // Ruled lines. Invisible at 26px and worth it anyway - they are what stops the
  // board looking like a blank tile in the places the icon is shown big.
  const rule = matte(0x2b3242, 0x0a0d14, 0.08);
  for (const dy of [0.18, -0.02, -0.22]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.026, 0.02), rule);
    r.position.set(0, boardY + dy, D / 2 + 0.006);
    g.add(r);
  }

  const barY = boardY + BH / 2 + SH / 2 - 0.02;
  const fixed = stripeBar(W, SH, D);
  fixed.position.y = barY;
  g.add(fixed);

  const hingeX = -W / 2 + 0.07;
  const pivot = new THREE.Group();
  pivot.position.set(hingeX, barY + SH * 0.6, 0);
  const stick = stripeBar(W, SH, D);
  stick.position.x = W / 2 - 0.07; // hinge at the stick's left end, not its middle
  pivot.add(stick);
  // Wider than the reference's 25 degrees. At icon size a shallow opening closes
  // up in the downscale and the stick welds itself back onto the bar - the gap
  // has to be several pixels of daylight at 26px or the slate reads as shut.
  pivot.rotation.z = 0.62;
  g.add(pivot);

  const hinge = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.34, D * 1.6),
    matte(0x1d222e, 0x080b12, 0.12),
  );
  hinge.position.set(hingeX, barY + SH * 0.2, 0);
  g.add(hinge);

  // Barely turned. The white face IS the icon; yaw it hard and the thing the eye
  // needs foreshortens away to nothing.
  g.rotation.set(0.14, -0.4, 0.05);
  return g;
}

/**
 * ACCOUNT - a key.
 *
 * The reflex is a head-and-shoulders bust, which in a set of hard-edged forged
 * objects renders as a chess pawn. A key says the same thing - this is yours, you
 * hold it - and it is a real object with a real silhouette.
 *
 * It passes the two-ended test that killed the wrench, but only just, and only
 * because it is ASYMMETRIC: a small ring at one end and a long blade at the
 * other, like the pencil. The wrench failed because both ends were heads of the
 * same size, so the eye had to resolve both or read a bar.
 *
 * The BITTING is the load-bearing detail, the same job the hex hole does on the
 * wrench. A plain bar with a ring on the end is a lollipop; cut four teeth into
 * the underside and it can only be a key.
 */
function buildKey(): THREE.Object3D {
  const g = new THREE.Group();

  // Half-metal with a real emissive floor, NOT the house chrome.
  //
  // First pass used `steel` at 0.94 metalness and the key rendered olive-black -
  // unreadable on a dark bar. The cause is the one already recorded against the
  // wire bundle's copper: a near-mirror shows whatever it faces, and a key is one
  // broad FLAT plate, so the entire object mirrors a single patch of studio. Rolled
  // onto the diagonal, that patch was a dark one. Curved objects here get away with
  // full chrome because they sweep the whole environment; flat ones cannot.
  const brass = new THREE.MeshStandardMaterial({
    color: 0xf2c76c,
    metalness: 0.6,
    roughness: 0.24,
    envMapIntensity: 1.5,
    emissive: 0x7a5410,
    emissiveIntensity: 0.34,
  });

  const bow = new THREE.Shape();
  bow.absarc(-0.74, 0, 0.42, 0, Math.PI * 2, false);
  const eye = new THREE.Path();
  eye.absarc(-0.74, 0, 0.2, 0, Math.PI * 2, false);
  bow.holes.push(eye);
  g.add(atShape(bow, thinExtrude(bow, 0.1, 0.026), brass));

  // Blade: flat along the top, and the underside is the BITTING.
  //
  // Two corrections from the first pass. The teeth hung BELOW the shank, which is
  // backwards - bitting is cut up into the blade, not added under it. And there
  // were four shallow ones; at 26px they filed themselves smooth and left a bar.
  // Three, cut most of the blade's depth, is the shallowest thing that survives.
  const blade = new THREE.Shape();
  blade.moveTo(-0.84, 0.2);
  blade.lineTo(0.9, 0.2);
  blade.lineTo(0.99, 0.05);
  blade.lineTo(0.95, -0.3);
  const bitting: [number, number][] = [
    [0.86, -0.3],
    [0.8, -0.04],
    [0.68, -0.04],
    [0.62, -0.3],
    [0.52, -0.3],
    [0.46, -0.04],
    [0.34, -0.04],
    [0.28, -0.3],
    [0.2, -0.3],
    [0.14, -0.04],
    [0.02, -0.04],
    [-0.04, -0.3],
  ];
  for (const [x, y] of bitting) {
    blade.lineTo(x, y);
  }
  blade.lineTo(-0.84, -0.3);
  blade.closePath();
  g.add(atShape(blade, thinExtrude(blade, 0.08, 0.02), brass));

  // The ward. A real blade is grooved down its length; we cannot cut into the
  // extrusion, so this stands the line proud instead. It reads the same - what
  // the eye wants is a hard line running the length, not a hole.
  const ward = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.055, 0.035), brass);
  ward.position.set(0.03, 0.06, 0.055);
  g.add(ward);

  // Rolled onto the diagonal: a horizontal bar leaves the top and bottom of a
  // square icon empty, so the object has to shrink to fit the width.
  g.rotation.set(0.24, -0.28, 0.6);
  return g;
}

/**
 * BUILD - the series circuit from the app's own logo, modelled.
 *
 * This replaces the wire bundle, which failed the only test that matters:
 * "I'm not sure what it is at all ... it looks like a hypodermic from here."
 * A bundle of cut cables is a fine object and a poor icon - at 26px the six
 * ellipses merge into one blunt cylinder with a point, and a blunt cylinder
 * with a point is a syringe.
 *
 * The replacement was already in the repo. `src/assets/circuit-logo.svg` -
 * aria-label "CircuiTry3D Logo - Series Circuit" - is the mark this app used
 * before the 3D wordmark: a square loop, a battery on the left, zigzag
 * resistors, purple junction beads. Reusing it means the Build tab is marked
 * with something the user already reads as this product, which no newly
 * invented object can be.
 *
 * What had to change to survive 26px, and why:
 *   - THREE resistors become ONE, on the top run. The logo has one per side
 *     because it is a 512px illustration with room for R1/R2/R3 labels. At icon
 *     size three zigzags on three sides is texture, not structure - the eye
 *     reads a fuzzy square. One zigzag on one side stays a zigzag.
 *   - The labels, the grid, the current arrows and the flowing photons all go.
 *     Every one of them is information the icon is not being asked to carry.
 *   - The gap in the left run is kept and made bigger. It is the second tell
 *     after the zigzag: an unbroken square is a frame, a square with a battery
 *     wedged into one side is a circuit.
 *
 * A closed loop is the strongest silhouette in this set - better even than a
 * wand. It has no ambiguous end to resolve, and the hole in the middle means
 * the background reads THROUGH it, which is what stops small marks turning to
 * mush. (Compare the price tag's eyelet, which had to be enlarged for exactly
 * this reason.)
 *
 * Colour comes from the logo, not from physics: green conductor, orange
 * resistor, red battery, purple junctions. Copper would be more truthful and
 * less recognisable, and recognition is the entire job here.
 */
function buildSeriesCircuit(): THREE.Object3D {
  const g = new THREE.Group();

  // Tubes sweep the whole studio as they curve, so they can take full chrome.
  // The battery plates cannot - they are flat faces, and a near-mirror flat face
  // shows only the one patch of environment it happens to point at (the lesson
  // the key and the wire bundle's cut cores both taught). Hence gloss(), not
  // steel(), for the plates.
  // Both the orange and the red had to come UP from the logo's values. The logo
  // is a 512px illustration on its own dark ground and #ff8844 sits fine there;
  // shrunk to 26px on the nav bar, a chrome tube of it averaged out to BROWN,
  // and the small red plate to near-black. This is the same rule the hand bell's
  // walnut handle broke - on a dark ground an icon's second colour has to be
  // LIGHTER than the ground, and reference accuracy loses to it every time.
  // Lighter base plus a higher emissive floor, not one or the other: the base
  // alone still averages down, and emissive alone flattens the tube.
  // The conductor stays chrome: #00ff88 is bright enough that even a mostly
  // reflected surface averages green.
  const conductor = steel(0x00ff88, 0x004d29, 0.15);
  // The resistor does NOT. At metalness 0.94 an object's colour is mostly what
  // it REFLECTS, and a tube this thin reflects a few pixels of a dark studio -
  // so mid-tone orange averaged out to brown at 26px however far the base colour
  // and the emissive were pushed. gloss() is nearly non-metallic, so the orange
  // is its OWN colour rather than a borrowed one. Generalises the copper-core
  // and flat-key findings: it is not "flat faces", it is any surface too small
  // to sweep enough of the environment to average out.
  const resistor = gloss(0xffa257, 0x6b3410, 0.26);
  const bead = gloss(0x9d5cff, 0x2a0a5c, 0.22);
  const plate = gloss(0xff4d4d, 0x6b0a0a, 0.34);

  const X = 0.66;
  const Y = 0.6;
  const WIRE_R = 0.062;
  const at = (x: number, y: number) => new THREE.Vector3(x, y, 0);

  // ── The loop, drawn as four runs so two of them can be interrupted ────────
  const TL = at(-X, Y), TR = at(X, Y), BR = at(X, -Y), BL = at(-X, -Y);

  // Top run: lead, resistor, lead. The resistor spans about half the width -
  // wider than the logo's R1 does, because peaks need room (see below).
  const rzL = -0.36, rzR = 0.36;
  g.add(link(TL, at(rzL, Y), WIRE_R, conductor));
  g.add(link(at(rzR, Y), TR, WIRE_R, conductor));

  // Right and bottom runs are unbroken - they are what carries the square.
  g.add(link(TR, BR, WIRE_R, conductor));
  g.add(link(BR, BL, WIRE_R, conductor));

  // Left run, interrupted for the battery.
  const GAP = 0.15;
  g.add(link(BL, at(-X, -GAP), WIRE_R, conductor));
  g.add(link(at(-X, GAP), TL, WIRE_R, conductor));

  // ── The resistor: one zigzag, TWO peaks ──────────────────────────────────
  // The logo's R1 has four and the first pass here had three. Both turn to a
  // brown blob: the top run is only about 13px wide on a 26px icon, so three
  // peaks means a direction change every 4px and anti-aliasing fills the gaps
  // between them into a solid mass. Two peaks across the same width gives each
  // stroke ~6px to be seen in, which is the difference between a zigzag and a
  // smudge. Amplitude came DOWN as well (0.23 -> 0.17): a tall zigzag pushes
  // the bounding box up, and everything else in the icon shrinks to fit it.
  const AMP = 0.17;
  const zig = [
    at(rzL, Y),
    at(rzL + 0.08, Y),
    at(-0.1, Y + AMP),
    at(0.1, Y - AMP),
    at(rzR - 0.08, Y),
    at(rzR, Y),
  ];
  for (let i = 0; i < zig.length - 1; i += 1) {
    // Fatter than the conductor, as in the logo (9 vs 6) - the resistor has to
    // win the top run or the zigzag reads as a kink in the wire. Not much
    // fatter, though: bulk is what filled the gaps in the first place.
    g.add(link(zig[i], zig[i + 1], WIRE_R * 1.15, resistor));
  }
  // Round the corners of the zigzag. Without these the segments meet in mitred
  // points that catch light as bright specks and break the line up.
  for (const p of zig.slice(1, -1)) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(WIRE_R * 1.15, 14, 10), resistor);
    j.position.copy(p);
    g.add(j);
  }

  // ── The battery: a wide + plate and a narrow - plate ──────────────────────
  // The width difference IS the symbol. Two equal bars are a capacitor.
  //
  // Both plates came in much narrower than the logo draws them (0.52 -> 0.34).
  // Schematically the logo is right - plates cross the wire and overhang both
  // sides - but at 26px the overhang is most of what you can see, so two red
  // bars floated off the left edge and read as marks lying NEXT TO the circuit
  // rather than parts of it. Pulled in, and with the gap tightened, they sit as
  // a pair inside the square's edge and the left run reads as interrupted.
  const plateDepth = 0.15;
  const pos = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, plateDepth), plate);
  pos.position.set(-X, GAP - 0.015, 0);
  g.add(pos);
  // The narrow plate is the one at risk: it is the smallest solid in the icon,
  // and below about 5px of width it stops being a bar and becomes a speck. Kept
  // clearly narrower than the + plate, since that contrast is the symbol, but
  // not as narrow as the logo draws it.
  const neg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.078, plateDepth), plate);
  neg.position.set(-X, -GAP + 0.015, 0);
  g.add(neg);

  // ── Junction beads on the corners ─────────────────────────────────────────
  // They do a structural job, not a decorative one: four dots pin the corners of
  // the square, so the silhouette stays a square rather than four tubes that
  // happen to nearly meet.
  for (const c of [TL, TR, BR, BL]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(WIRE_R * 1.7, 18, 12), bead);
    b.position.copy(c);
    g.add(b);
  }

  // Barely any. The square outline is the whole read, and rotation turns a square
  // into a parallelogram - but flat-on, the tubes lose their round highlight and
  // it goes back to being the SVG. This is the smallest tilt that still shows the
  // conductors are cylinders.
  g.rotation.set(0.13, -0.17, 0.02);
  return g;
}

export type Icon3DName =
  | "build"
  | "practice"
  | "troubleshoot"
  | "arena"
  | "learn"
  | "help"
  | "textbook"
  | "pricing"
  | "arcade"
  | "classroom"
  | "community"
  | "gallery"
  | "account";

export const ICON_MODELS: Record<Icon3DName, () => THREE.Object3D> = {
  build: buildSeriesCircuit,

  practice: buildPencil,
  troubleshoot: buildMagnifier,
  arena: buildBolt,
  learn: buildMortarboard,
  help: buildLifeRing,
  textbook: buildBookStack,
  pricing: buildPriceTag,
  arcade: buildJoystick,
  classroom: buildApple,
  community: buildNodeCluster,
  gallery: buildClapperboard,
  account: buildKey,
};

export const ICON_NAMES = Object.keys(ICON_MODELS) as Icon3DName[];

/**
 * Finished models that no tab currently uses.
 *
 * Every one of these was built, rendered, judged at 26px and set aside for a
 * reason recorded at its definition - not abandoned. They are exported rather
 * than deleted because the expensive part of an icon is discovering what its
 * silhouette has to do, and that work is already paid for here. Re-point a tab
 * at one and it is live again.
 */
export const PARKED_MODELS: Record<string, () => THREE.Object3D> = {
  wrench: buildWrench,
  resistor: buildResistor,
  solderingIron: buildSolderingIron,
  handBell: buildHandBell,
  // Held Build until the series-circuit logo replaced it. Verdict at 26px on a
  // real phone: "I'm not sure what it is at all ... it looks like a hypodermic."
  // The six staggered cut faces that make it work at 150px merge into one blunt
  // pointed cylinder at icon size. Worth keeping - the copper-core material
  // finding (a small flat face cannot be left at the mercy of what it reflects)
  // came out of this model and is reused across the set - but it is not an icon.
  wireBundle: buildWireBundle,
};
