export interface Vec2 { x: number; y: number; }

export const SNAP_RADIUS = 12; // px, tune for device
export const INTERSECT_TOLERANCE = 4;
export const MERGE_RADIUS = 6;
export const RELEASE_DISTANCE = 18;

/** Return projection of P onto segment AB (clamped). */
export function projectPointOnSegment(P: Vec2, A: Vec2, B: Vec2): Vec2 {
  const vx = B.x - A.x;
  const vy = B.y - A.y;
  const wx = P.x - A.x;
  const wy = P.y - A.y;
  const vv = vx * vx + vy * vy;
  if (vv === 0) return { x: A.x, y: A.y };
  let t = (wx * vx + wy * vy) / vv;
  t = Math.max(0, Math.min(1, t));
  return { x: A.x + t * vx, y: A.y + t * vy };
}

/** Standard segment intersection; returns point or null. */
export function segmentIntersect(A: Vec2, B: Vec2, C: Vec2, D: Vec2): Vec2 | null {
  const ax = B.x - A.x;
  const ay = B.y - A.y;
  const bx = D.x - C.x;
  const by = D.y - C.y;
  const denom = ax * by - ay * bx;
  if (Math.abs(denom) < 1e-9) return null;
  const cx = C.x - A.x;
  const cy = C.y - A.y;
  const s = (cx * by - cy * bx) / denom;
  const t = (cx * ay - cy * ax) / denom;
  if (s >= -0.0001 && s <= 1.0001 && t >= -0.0001 && t <= 1.0001) {
    return { x: A.x + s * ax, y: A.y + s * ay };
  }
  return null;
}

/** Distance between points squared */
export function dist2(a: Vec2, b: Vec2) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
