import { projectPointOnSegment, segmentIntersect } from "../src/utils/geom";

test("projectPointOnSegment clamps correctly", () => {
  const A = { x: 0, y: 0 }, B = { x: 10, y: 0 }, P = { x: -5, y: 3 };
  const R = projectPointOnSegment(P, A, B);
  expect(R.x).toBeGreaterThanOrEqual(0);
  expect(R.x).toBeLessThanOrEqual(10);
});

test("segmentIntersect finds crossing", () => {
  const A = { x: 0, y: 0 }, B = { x: 10, y: 0 };
  const C = { x: 5, y: -5 }, D = { x: 5, y: 5 };
  const P = segmentIntersect(A, B, C, D);
  expect(P).not.toBeNull();
  if (P) expect(Math.abs(P.x - 5)).toBeLessThan(1e-6);
});
