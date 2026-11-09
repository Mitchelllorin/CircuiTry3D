import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  FAILURE_FOV,
  FAILURE_HEIGHT,
  FAILURE_RADIUS,
  NOMINAL_PART_HEIGHT,
  failurePose,
} from "./failureShot";

/**
 * The camera sweep, asserted rather than eyeballed.
 *
 * Mitchell's acceptance note was blunt: tests passing is not enough, and a shot
 * that "did not happen" still had green tests. So this projects a part through
 * the pose the scene actually uses and checks the things he asked for — centred
 * in the VISIBLE canvas, close enough to be the subject — plus the one that
 * makes the inset matter: without the console inset, the same pose lands low,
 * behind the strip.
 *
 * The size claim is measured, not asserted into existence: the arena's parts are
 * built from unit-scale cylinders, so a nominal part is 1.0 units tall, and at
 * this pose that is 56% of the visible band. A true third would need a radius of
 * about 8.2, which is behind the ramp's own 6.6 push-in — a pull-back at the
 * moment of failure. That is a look decision, so it is flagged for Mitchell in
 * the report rather than changed here.
 */

const CANVAS = { width: 360, height: 640 };
/** The strip is capped at a third of the screen; 33vh of 640 rounds to this. */
const CONSOLE_PX = 211;
/** The band the part can actually be seen in, above the strip. */
const BAND_PX = CANVAS.height - CONSOLE_PX;

function cameraFor(bottomInset: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    FAILURE_FOV,
    CANVAS.width / CANVAS.height,
    1,
    200,
  );
  // Exactly what ArenaScene's applyViewFrame does with a console inset.
  if (bottomInset < 1) {
    camera.clearViewOffset();
  } else {
    camera.setViewOffset(
      CANVAS.width,
      CANVAS.height + bottomInset,
      0,
      bottomInset,
      CANVAS.width,
      CANVAS.height,
    );
  }
  camera.updateProjectionMatrix();
  return camera;
}

/** A part-sized box centred on `centre`, projected to screen pixels. */
function projectedBox(
  camera: THREE.PerspectiveCamera,
  centre: { x: number; y: number; z: number },
  size: { x: number; y: number; z: number },
) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const dx of [-0.5, 0.5]) {
    for (const dy of [-0.5, 0.5]) {
      for (const dz of [-0.5, 0.5]) {
        const point = new THREE.Vector3(
          centre.x + dx * size.x,
          centre.y + dy * size.y,
          centre.z + dz * size.z,
        ).project(camera);
        xs.push(point.x);
        ys.push(point.y);
      }
    }
  }
  // NDC y runs up; screen y runs down from the top of the canvas.
  const top = (1 - Math.max(...ys)) / 2 * CANVAS.height;
  const bottom = (1 - Math.min(...ys)) / 2 * CANVAS.height;
  return {
    centreX: (Math.min(...xs) + Math.max(...xs)) / 2 * CANVAS.width / 2 + CANVAS.width / 2,
    centreY: (top + bottom) / 2,
    height: bottom - top,
  };
}

const LOOK = { x: 0.4, y: 0.75, z: 0 };
const USER_SIDE = { x: 0.35, y: 0, z: 1 };
const PART = { x: 0.5, y: NOMINAL_PART_HEIGHT, z: 0.5 };

function shotFor(bottomInset: number) {
  const camera = cameraFor(bottomInset);
  const pose = failurePose(LOOK, USER_SIDE);
  camera.position.set(pose.x, pose.y, pose.z);
  camera.lookAt(new THREE.Vector3(LOOK.x, LOOK.y, LOOK.z));
  camera.updateMatrixWorld();
  return { camera, pose };
}

describe("the failure shot", () => {
  it("centres the part in the visible band, not in the whole canvas", () => {
    const { camera } = shotFor(CONSOLE_PX);
    const box = projectedBox(camera, LOOK, PART);
    const bandCentre = BAND_PX / 2;

    expect(Math.abs(box.centreX - CANVAS.width / 2)).toBeLessThan(6);
    expect(Math.abs(box.centreY - bandCentre)).toBeLessThan(6);

    // And the inset is what does it: on the raw canvas the same shot sits low,
    // in the third of the screen the strip now owns.
    const flat = projectedBox(shotFor(0).camera, LOOK, PART);
    expect(flat.centreY).toBeGreaterThan(bandCentre + 40);
  });

  it("sizes the part to be the subject of the band, not a speck and not the wall", () => {
    const { camera } = shotFor(CONSOLE_PX);
    const box = projectedBox(camera, LOOK, PART);
    const share = box.height / BAND_PX;

    expect(share).toBeGreaterThan(0.45);
    expect(share).toBeLessThan(0.7);
    // It stays clear of both edges of the band it is framed in.
    expect(box.centreY - box.height / 2).toBeGreaterThan(0);
    expect(box.centreY + box.height / 2).toBeLessThan(BAND_PX);
  });

  it("comes round to a bench-side eye line whatever the user's orbit height", () => {
    const level = failurePose(LOOK, USER_SIDE);
    const lookingDown = failurePose(LOOK, { x: 0.35, y: 9, z: 1 });
    expect(lookingDown.y).toBeCloseTo(level.y, 6);
    expect(lookingDown.x).toBeCloseTo(level.x, 6);
    expect(lookingDown.z).toBeCloseTo(level.z, 6);

    // The close-up is a fixed distance, so every break frames the same way.
    const distance = Math.hypot(FAILURE_RADIUS, FAILURE_HEIGHT);
    expect(
      Math.hypot(level.x - LOOK.x, level.y - LOOK.y, level.z - LOOK.z),
    ).toBeCloseTo(distance, 6);
  });
});
