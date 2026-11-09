/**
 * THE RAMP — where the camera stands when a part fails.
 *
 * The isolation and the failure card were both in place, and the shot still did
 * not read: the camera was cutting to a part at a distance chosen by eye and
 * never measured. So the one thing this module exists for is that the framing is
 * geometry now, not a claim in a comment — the scene positions the camera from
 * `failurePose`, and `failureShot.test.ts` projects a part of nominal size
 * through that same pose to prove it lands centred and a third of the way up the
 * VISIBLE frame (the canvas minus the console).
 *
 * Everything here is pure numbers. No three, no scene, so it can be asserted in
 * node without a renderer — which is the only way a framing claim stays honest
 * between builds.
 */

/**
 * How far back the camera sits, in scene units.
 *
 * Close enough that a split seam is a shot rather than a handful of pixels;
 * far enough that the part is not pressed against the frame. At 45° vertical
 * this puts a nominal part (below) at about a third of the visible height.
 */
export const FAILURE_RADIUS = 4.2;

/** And a bench-side eye line on it, rather than looking down at it. */
export const FAILURE_HEIGHT = 2.4;

/** The scene camera's vertical field of view. Kept here so the test uses it. */
export const FAILURE_FOV = 45;

/**
 * The part size the shot is tuned against, in scene units.
 *
 * The arena's parts are built from unit-scale primitives (a cylinder body is
 * 0.5 radius by 1.0 long), so a nominal part is about a unit tall. The test
 * holds the shot to how much of the VISIBLE band that fills — measured, not
 * assumed — and the number it finds is in the test file.
 */
export const NOMINAL_PART_HEIGHT = 1.0;

export type Point3 = { x: number; y: number; z: number };

/**
 * The camera position for a failure shot on `look`, on the user's own side.
 *
 * The floor component is dropped on purpose: the shot should come round to a
 * bench-side eye line, not inherit however high the user had orbited to. That
 * keeps the break framed the same way every run, which is what makes it a
 * repeatable shot rather than a lucky one.
 */
export function failurePose(look: Point3, sideDir: Point3): Point3 {
  const flat = Math.hypot(sideDir.x, sideDir.z);
  const dir =
    flat < 1e-4
      ? { x: 0, y: 0, z: 1 }
      : { x: sideDir.x / flat, y: 0, z: sideDir.z / flat };
  return {
    x: look.x + dir.x * FAILURE_RADIUS,
    y: look.y + FAILURE_HEIGHT,
    z: look.z + dir.z * FAILURE_RADIUS,
  };
}
