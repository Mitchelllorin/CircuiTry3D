import { Orientation, Vec2 } from "./types";
import { AxisSpec, resolveAxialVec2 } from "./standards";

export type AxisMetrics = {
  orientation: Orientation;
  axisStartCoord: number;
  axisEndCoord: number;
  perpCoord: number;
  totalLength: number;
  direction: 1 | -1;
  bodyLength: number;
  bodyStartCoord: number;
  bodyEndCoord: number;
  centerCoord: number;
  leadLength: number;
};

const EPSILON = 1e-6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const computeAxisMetrics = (
  start: Vec2,
  end: Vec2,
  orientation: Orientation,
  spec: AxisSpec
): AxisMetrics => {
  const axisStartCoord = orientation === "horizontal" ? start.x : start.z;
  const axisEndCoord = orientation === "horizontal" ? end.x : end.z;
  const perpCoord = orientation === "horizontal" ? start.z : start.x;
  const totalLength = Math.abs(axisEndCoord - axisStartCoord);
  const direction: 1 | -1 = axisEndCoord >= axisStartCoord ? 1 : -1;

  if (totalLength < EPSILON) {
    return {
      orientation,
      axisStartCoord,
      axisEndCoord,
      perpCoord,
      totalLength,
      direction: 1,
      bodyLength: 0,
      bodyStartCoord: axisStartCoord,
      bodyEndCoord: axisStartCoord,
      centerCoord: axisStartCoord,
      leadLength: 0,
    };
  }

  const minBodyLength = Math.min(spec.minBodyLength, totalLength);
  const minLeadLength = totalLength * clamp(spec.minLeadFraction, 0, 0.5);
  const targetBodyLength = totalLength * clamp(spec.bodyFraction, 0.2, 0.95);

  let bodyLength = clamp(targetBodyLength, minBodyLength, totalLength);
  let leadLength = Math.max(0, (totalLength - bodyLength) / 2);

  if (leadLength + EPSILON < minLeadLength) {
    const candidateBody = totalLength - 2 * minLeadLength;
    if (candidateBody >= minBodyLength) {
      bodyLength = candidateBody;
      leadLength = minLeadLength;
    } else {
      bodyLength = totalLength;
      leadLength = 0;
    }
  }

  bodyLength = clamp(bodyLength, 0, totalLength);
  leadLength = Math.max(0, (totalLength - bodyLength) / 2);

  const bodyStartCoord = axisStartCoord + direction * leadLength;
  const bodyEndCoord = axisEndCoord - direction * leadLength;
  const centerCoord = (bodyStartCoord + bodyEndCoord) / 2;

  return {
    orientation,
    axisStartCoord,
    axisEndCoord,
    perpCoord,
    totalLength,
    direction,
    bodyLength,
    bodyStartCoord,
    bodyEndCoord,
    centerCoord,
    leadLength,
  };
};

export const axisCoordToVec2 = (orientation: Orientation, axisCoord: number, perpCoord: number): Vec2 =>
  resolveAxialVec2(orientation, axisCoord, perpCoord);

