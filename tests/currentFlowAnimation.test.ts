import { describe, expect, it } from "vitest";
import { CurrentFlowAnimationSystem, CURRENT_FLOW_COLOR_RAMP } from "../src/schematic/currentFlowAnimation";
import type { Vec2 } from "../src/schematic/types";

class MockColor {
  public value: number;

  constructor(value: number) {
    this.value = value;
  }

  setHex(value: number) {
    this.value = value;
  }
}

class MockVector3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class MockQuaternion {
  public x = 0;
  public y = 0;
  public z = 0;
  public w = 1;

  setFromUnitVectors(_from: MockVector3, _to: MockVector3) {
    return this;
  }

  copy(other: MockQuaternion) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    this.w = other.w;
    return this;
  }
}

class MockScale {
  public x = 1;
  public y = 1;
  public z = 1;

  setScalar(value: number) {
    this.x = value;
    this.y = value;
    this.z = value;
  }
}

class MockPosition {
  public x = 0;
  public y = 0;
  public z = 0;

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class MockGeometry {
  dispose() {
    // no-op
  }
}

class MockSphereGeometry extends MockGeometry {
  constructor(_radius: number, _widthSegments: number, _heightSegments: number) {
    super();
  }
}

class MockStandardMaterial {
  public color: MockColor;
  public emissive: MockColor;
  public opacity: number;

  constructor(opts: { color: number; emissive: number; opacity: number }) {
    this.color = new MockColor(opts.color);
    this.emissive = new MockColor(opts.emissive);
    this.opacity = opts.opacity;
  }

  dispose() {
    // no-op
  }
}

class MockBasicMaterial {
  public color: MockColor;
  public opacity: number;

  constructor(opts: { color: number; opacity: number }) {
    this.color = new MockColor(opts.color);
    this.opacity = opts.opacity;
  }

  dispose() {
    // no-op
  }
}

class MockObject3D {
  public children: MockObject3D[] = [];
  public parent: MockObject3D | null = null;
  public name = "";
  public position = new MockPosition();
  public scale = new MockScale();
  public quaternion = new MockQuaternion();
  public userData: Record<string, unknown> = {};
  public visible = true;

  add(child: MockObject3D) {
    child.parent = this;
    this.children.push(child);
  }

  remove(child: MockObject3D) {
    this.children = this.children.filter((c) => c !== child);
    if (child.parent === this) {
      child.parent = null;
    }
  }
}

class MockMesh extends MockObject3D {
  constructor(public geometry: MockGeometry, public material: MockStandardMaterial | MockBasicMaterial) {
    super();
  }
}

class MockGroup extends MockObject3D {}

const mockThree = {
  Vector3: MockVector3,
  Quaternion: MockQuaternion,
  SphereGeometry: MockSphereGeometry,
  MeshStandardMaterial: MockStandardMaterial,
  MeshBasicMaterial: MockBasicMaterial,
  Mesh: MockMesh,
  Group: MockGroup,
};

const linePath: Vec2[] = [
  { x: 0, z: 0 },
  { x: 2, z: 0 },
];

describe("CurrentFlowAnimationSystem", () => {
  it("uses the designated red-blue-white current color ramp", () => {
    expect(CURRENT_FLOW_COLOR_RAMP.slow).toBe(0xef4444);
    expect(CURRENT_FLOW_COLOR_RAMP.mid).toBe(0x3b82f6);
    expect(CURRENT_FLOW_COLOR_RAMP.fast).toBe(0xffffff);
  });

  it("maps conventional segment direction into electron-flow direction", () => {
    const root = new MockGroup();
    const system = new CurrentFlowAnimationSystem(mockThree, root);

    system.addFlowPath({ path: linePath, currentAmps: 1, flowsForward: true, particleCount: 1 });
    system.addFlowPath({ path: linePath, currentAmps: 1, flowsForward: false, particleCount: 1 });

    const particles = (system as { particles: Array<{ flowsForward: boolean; reversed: boolean }> }).particles;
    expect(particles[0]?.flowsForward).toBe(true);
    expect(particles[0]?.reversed).toBe(true); // electron flow is opposite conventional forward
    expect(particles[1]?.flowsForward).toBe(false);
    expect(particles[1]?.reversed).toBe(false); // opposite of reverse conventional is forward

    system.setFlowMode("conventional");
    expect(particles[0]?.reversed).toBe(false);
    expect(particles[1]?.reversed).toBe(true);
  });

  it("slows particle speed through higher resistance paths", () => {
    const root = new MockGroup();
    const system = new CurrentFlowAnimationSystem(mockThree, root);

    system.addFlowPath({ path: linePath, currentAmps: 1, resistanceOhms: 1, particleCount: 1 });
    system.addFlowPath({ path: linePath, currentAmps: 1, resistanceOhms: 10_000, particleCount: 1 });

    const particles = (system as { particles: Array<{ baseSpeed: number }> }).particles;
    const lowResistance = particles[0]?.baseSpeed ?? 0;
    const highResistance = particles[1]?.baseSpeed ?? 0;

    expect(lowResistance).toBeGreaterThan(0);
    expect(highResistance).toBeGreaterThan(0);
    expect(highResistance).toBeLessThan(lowResistance);
  });

  it("resets particle start positions based on travel direction when circuit opens", () => {
    const root = new MockGroup();
    const system = new CurrentFlowAnimationSystem(mockThree, root);

    system.addFlowPath({ path: linePath, currentAmps: 1, flowsForward: true, particleCount: 1 });
    system.addFlowPath({ path: linePath, currentAmps: 1, flowsForward: false, particleCount: 1 });

    const particles = (
      system as {
        particles: Array<{ reversed: boolean; progress: number; position: Vec2 }>;
      }
    ).particles;

    system.setCircuitClosed(false);

    const reversedParticle = particles.find((p) => p.reversed);
    const forwardParticle = particles.find((p) => !p.reversed);

    expect(reversedParticle?.progress).toBe(1);
    expect(reversedParticle?.position).toEqual(linePath[linePath.length - 1]);
    expect(forwardParticle?.progress).toBe(0);
    expect(forwardParticle?.position).toEqual(linePath[0]);
  });

  it("keeps particle progress wrapped in [0, 1) during updates", () => {
    const root = new MockGroup();
    const system = new CurrentFlowAnimationSystem(mockThree, root);

    system.addFlowPath({ path: linePath, currentAmps: 1, flowsForward: true, particleCount: 1 });
    const particle = (
      system as {
        particles: Array<{ progress: number }>;
      }
    ).particles[0];

    const before = particle.progress;
    system.setCircuitClosed(true);
    system.update(0.2);

    expect(particle.progress).toBeLessThan(before);
    system.update(100);
    expect(particle.progress).toBeGreaterThanOrEqual(0);
    expect(particle.progress).toBeLessThan(1);
  });

  it("uses solver segment current signs for direction and magnitude", () => {
    const root = new MockGroup();
    const system = new CurrentFlowAnimationSystem(mockThree, root);
    const wirePathMap = new Map<string, Vec2[]>([
      ["w1", [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }]],
    ]);

    system.addFlowPathsFromSolver(
      [
        { wireId: "w1", segmentIndex: 0, amps: 0.5 },
        { wireId: "w1", segmentIndex: 1, amps: -0.75 },
      ],
      wirePathMap
    );

    const particles = (
      system as {
        particles: Array<{ flowsForward: boolean; reversed: boolean; currentAmps: number }>;
      }
    ).particles;

    expect(particles.some((p) => p.flowsForward)).toBe(true);
    expect(particles.some((p) => !p.flowsForward)).toBe(true);
    expect(particles.every((p) => p.currentAmps > 0)).toBe(true);
    expect(particles.some((p) => p.flowsForward && p.reversed)).toBe(true);
    expect(particles.some((p) => !p.flowsForward && !p.reversed)).toBe(true);
  });
});
