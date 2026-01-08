import { Vec2 } from "./types";

/**
 * Flow mode determines the direction of particle animation:
 * - "electron": Particles flow from negative to positive (actual electron movement)
 * - "conventional": Particles flow from positive to negative (conventional current)
 */
export type FlowMode = "electron" | "conventional";

/**
 * Current intensity levels for color coding
 * Based on amperage ranges for educational visualization
 */
export type CurrentIntensity = "off" | "low" | "medium" | "high" | "critical";

/**
 * Color scheme for current intensity visualization
 * Colors progress from cool (low) to warm (high) for intuitive understanding
 */
export const INTENSITY_COLORS = {
  off: { core: 0x6b7280, glow: 0x9ca3af, emissive: 0x4b5563 },        // Gray - no current
  low: { core: 0x22c55e, glow: 0x86efac, emissive: 0x16a34a },        // Green - low current
  medium: { core: 0xeab308, glow: 0xfde047, emissive: 0xca8a04 },     // Yellow - medium current
  high: { core: 0xf97316, glow: 0xfb923c, emissive: 0xea580c },       // Orange - high current
  critical: { core: 0xef4444, glow: 0xfca5a5, emissive: 0xdc2626 }    // Red - critical/max current
} as const;

/**
 * Particle appearance based on flow mode
 */
export const FLOW_MODE_APPEARANCE = {
  // NOTE: size here is the *base radius* in scene units (scaled in update()).
  electron: { opacity: 0.72, size: 0.13, glowOpacity: 0.28 },       // Softer, slightly larger
  conventional: { opacity: 0.95, size: 0.16, glowOpacity: 0.42 }    // Brighter, larger
} as const;

const COMET_TAIL = {
  segments: 7,
  // Tail is expressed in multiples of the particle radius (since we scale the whole mesh by baseScale)
  length: 6.5,
  maxOpacity: 0.28,
  minOpacity: 0.02,
  maxRadiusFactor: 0.75,  // relative to particle size
  minRadiusFactor: 0.18
} as const;

/**
 * Physics-based constants for realistic current flow visualization
 * These constants map electrical properties to visual representations
 */
export const CURRENT_FLOW_PHYSICS = {
  /**
   * Base speed multiplier for particle movement (units per second at 1A)
   * In real circuits, drift velocity is very slow (~0.0001 m/s for 1A in copper)
   * We scale this up dramatically for visualization while maintaining proportionality
   */
  BASE_SPEED_PER_AMP: 0.3,

  /**
   * Minimum speed to ensure particles are always visibly moving when current flows
   */
  MIN_VISIBLE_SPEED: 0.15,

  /**
   * Maximum speed cap to prevent particles from moving too fast to see
   */
  MAX_SPEED: 1.5,

  /**
   * Base number of particles per unit path length at 1A
   * Higher current = more charge carriers = more visible particles
   */
  PARTICLES_PER_UNIT_LENGTH_PER_AMP: 0.8,

  /**
   * Minimum particles regardless of current (ensures visibility)
   */
  MIN_PARTICLES_PER_PATH: 2,

  /**
   * Maximum particles per path (performance limit)
   */
  MAX_PARTICLES_PER_PATH: 15,

  /**
   * Current threshold below which we consider "no current" (microamps)
   */
  ZERO_CURRENT_THRESHOLD: 0.000001,

  /**
   * Speed variation factor - adds natural randomness to particle movement
   * Real electrons don't all move at exactly the same speed
   */
  SPEED_VARIATION: 0.15,
} as const;

export type CurrentFlowParticle = {
  id: string;
  position: Vec2;
  progress: number;
  /** Base speed from current calculation (will be modified by variation) */
  baseSpeed: number;
  /** Actual speed including random variation */
  speed: number;
  path: Vec2[];
  intensity: CurrentIntensity;
  reversed: boolean; // True for electron flow (reversed direction)
  /** The amperage this particle represents */
  currentAmps: number;
};

export type FlowPathConfig = {
  path: Vec2[];
  particleCount?: number;
  baseSpeed?: number;
  currentAmps?: number;
  sourcePolarity?: "positive" | "negative";
  /** Direction of current flow: true if current flows forward along path */
  flowsForward?: boolean;
};

export class CurrentFlowAnimationSystem {
  private particles: CurrentFlowParticle[] = [];
  private nextParticleId = 0;
  private three: any;
  private particleMeshes: Map<string, any> = new Map();
  private parentGroup: any;
  private flowMode: FlowMode = "electron";
  private isCircuitClosed: boolean = false;
  private globalIntensity: CurrentIntensity = "medium";
  /** Global current value in amps for physics-based calculations */
  private globalCurrentAmps: number = 0;

  constructor(three: any, parentGroup: any) {
    this.three = three;
    this.parentGroup = parentGroup;
  }

  /**
   * Calculate physics-based speed from current magnitude
   * Higher current = faster drift velocity = faster particles
   * Uses logarithmic scaling to handle wide current ranges (mA to A)
   */
  private calculateSpeedFromCurrent(amps: number): number {
    const absAmps = Math.abs(amps);

    // No current = no movement
    if (absAmps < CURRENT_FLOW_PHYSICS.ZERO_CURRENT_THRESHOLD) {
      return 0;
    }

    // Use logarithmic scaling to handle the wide range of currents
    // log10(0.001) = -3, log10(1) = 0, log10(10) = 1
    // This gives us smooth visual scaling across mA to A range
    const logCurrent = Math.log10(absAmps + 0.001); // +0.001 to avoid log(0)
    const normalizedCurrent = (logCurrent + 3) / 4; // Map -3 to 1 into 0 to 1

    // Calculate speed with minimum and maximum bounds
    const baseSpeed = CURRENT_FLOW_PHYSICS.MIN_VISIBLE_SPEED +
      normalizedCurrent * (CURRENT_FLOW_PHYSICS.MAX_SPEED - CURRENT_FLOW_PHYSICS.MIN_VISIBLE_SPEED);

    return Math.min(CURRENT_FLOW_PHYSICS.MAX_SPEED, Math.max(CURRENT_FLOW_PHYSICS.MIN_VISIBLE_SPEED, baseSpeed));
  }

  /**
   * Calculate number of particles based on path length and current
   * Higher current = more charge carriers = more visible particles
   * This creates a denser "stream" of particles for higher currents
   */
  private calculateParticleCount(pathLength: number, amps: number): number {
    const absAmps = Math.abs(amps);

    if (absAmps < CURRENT_FLOW_PHYSICS.ZERO_CURRENT_THRESHOLD) {
      return 0;
    }

    // Base count on path length and current magnitude
    // Use square root scaling so particle density doesn't explode at high currents
    const densityFactor = Math.sqrt(absAmps) * CURRENT_FLOW_PHYSICS.PARTICLES_PER_UNIT_LENGTH_PER_AMP;
    const baseCount = Math.round(pathLength * densityFactor);

    // Clamp to reasonable bounds
    return Math.min(
      CURRENT_FLOW_PHYSICS.MAX_PARTICLES_PER_PATH,
      Math.max(CURRENT_FLOW_PHYSICS.MIN_PARTICLES_PER_PATH, baseCount)
    );
  }

  /**
   * Add random variation to speed to simulate natural electron movement
   * Real charge carriers don't move at uniform velocities
   */
  private addSpeedVariation(baseSpeed: number): number {
    const variation = (Math.random() - 0.5) * 2 * CURRENT_FLOW_PHYSICS.SPEED_VARIATION * baseSpeed;
    return baseSpeed + variation;
  }

  /**
   * Set the flow visualization mode
   * @param mode - "electron" for negative-to-positive, "conventional" for positive-to-negative
   */
  public setFlowMode(mode: FlowMode): void {
    const wasChanged = this.flowMode !== mode;
    this.flowMode = mode;

    if (wasChanged) {
      // Update all particle directions and appearances
      this.particles.forEach(particle => {
        particle.reversed = mode === "electron";
      });
      this.updateAllParticleAppearances();
    }
  }

  /**
   * Get the current flow mode
   */
  public getFlowMode(): FlowMode {
    return this.flowMode;
  }

  /**
   * Set whether the circuit is closed (complete loop with power source)
   * Animation only runs when circuit is closed
   */
  public setCircuitClosed(closed: boolean): void {
    this.isCircuitClosed = closed;

    // Update particle visibility based on circuit state
    this.particleMeshes.forEach(mesh => {
      mesh.visible = closed;
    });

    if (!closed) {
      // Reset all particles to their starting positions when circuit opens
      this.particles.forEach(particle => {
        particle.progress = 0;
        particle.position = { ...particle.path[0] };
      });
    }
  }

  /**
   * Check if the circuit is closed
   */
  public isCircuitComplete(): boolean {
    return this.isCircuitClosed;
  }

  /**
   * Set the global current intensity based on amperage
   * This affects both visual appearance AND particle physics (speed, density)
   * @param amps - Current in amperes
   */
  public setCurrentIntensity(amps: number): void {
    this.globalCurrentAmps = Math.abs(amps);
    this.globalIntensity = this.calculateIntensity(amps);

    // Update all existing particle speeds based on new current value
    const newBaseSpeed = this.calculateSpeedFromCurrent(this.globalCurrentAmps);
    this.particles.forEach(particle => {
      particle.currentAmps = this.globalCurrentAmps;
      particle.baseSpeed = newBaseSpeed;
      particle.speed = this.addSpeedVariation(newBaseSpeed);
    });

    this.updateAllParticleAppearances();
  }

  /**
   * Get the current amperage value
   */
  public getCurrentAmps(): number {
    return this.globalCurrentAmps;
  }

  /**
   * Calculate intensity level from amperage
   * Thresholds designed for educational circuit ranges
   */
  private calculateIntensity(amps: number): CurrentIntensity {
    const absAmps = Math.abs(amps);
    if (absAmps < 0.001) return "off";      // Less than 1mA
    if (absAmps < 0.1) return "low";        // 1mA to 100mA
    if (absAmps < 0.5) return "medium";     // 100mA to 500mA
    if (absAmps < 2.0) return "high";       // 500mA to 2A
    return "critical";                       // Over 2A
  }

  /**
   * Add a flow path with configuration options
   *
   * Path direction convention:
   * - Paths should be defined in the CONVENTIONAL current direction (positive to negative)
   * - The flow mode determines animation direction:
   *   - "conventional": particles move forward along path (progress increases)
   *   - "electron": particles move backward along path (progress decreases)
   *
   * Physics-based behavior:
   * - Particle count scales with current magnitude (more current = more visible charge carriers)
   * - Particle speed scales with current magnitude (more current = faster drift velocity)
   * - Speed includes natural variation to simulate real electron behavior
   */
  public addFlowPath(
    pathOrConfig: Vec2[] | FlowPathConfig,
    particleCount?: number,
    baseSpeed?: number
  ): void {
    let path: Vec2[];
    let currentAmps = this.globalCurrentAmps;
    let flowsForward = true;

    if (Array.isArray(pathOrConfig)) {
      path = pathOrConfig;
    } else {
      path = pathOrConfig.path;
      if (pathOrConfig.currentAmps !== undefined) {
        currentAmps = Math.abs(pathOrConfig.currentAmps);
      }
      if (pathOrConfig.flowsForward !== undefined) {
        flowsForward = pathOrConfig.flowsForward;
      }
      // Allow explicit override of particle count, otherwise calculate from physics
      if (pathOrConfig.particleCount !== undefined) {
        particleCount = pathOrConfig.particleCount;
      }
      // Allow explicit override of speed, otherwise calculate from physics
      if (pathOrConfig.baseSpeed !== undefined) {
        baseSpeed = pathOrConfig.baseSpeed;
      }
    }

    if (path.length < 2) return;

    // Calculate path length for physics-based calculations
    const pathLength = this.calculatePathLength(path);

    // Calculate intensity from current
    const intensity = currentAmps > 0 ? this.calculateIntensity(currentAmps) : this.globalIntensity;

    // Calculate physics-based particle count if not explicitly provided
    const count = particleCount ?? this.calculateParticleCount(pathLength, currentAmps);

    // Calculate physics-based speed if not explicitly provided
    const calculatedSpeed = baseSpeed ?? this.calculateSpeedFromCurrent(currentAmps);

    // Determine flow direction based on mode and current direction
    // - In electron flow mode, electrons move opposite to conventional current
    // - If current flows forward along path, electrons flow backward, and vice versa
    const isReversed = this.flowMode === "electron" ? flowsForward : !flowsForward;

    for (let i = 0; i < count; i++) {
      // For electron flow, start at the end of the path (since we'll move backward)
      // For conventional flow, start at the beginning
      const startPosition = isReversed ? path[path.length - 1] : path[0];
      // Distribute particles evenly along the path
      const initialProgress = isReversed ? 1 - (i / count) : i / count;

      // Add speed variation for natural movement
      const particleSpeed = this.addSpeedVariation(calculatedSpeed);

      const particle: CurrentFlowParticle = {
        id: `particle-${this.nextParticleId++}`,
        position: { ...startPosition },
        progress: initialProgress,
        baseSpeed: calculatedSpeed,
        speed: particleSpeed,
        path: path, // Use the path as-is, direction is handled in update()
        intensity,
        reversed: isReversed,
        currentAmps
      };
      this.particles.push(particle);
      this.createParticleMesh(particle);
    }
  }

  private createParticleMesh(particle: CurrentFlowParticle): void {
    const appearance = FLOW_MODE_APPEARANCE[this.flowMode];
    const colors = INTENSITY_COLORS[particle.intensity];

    // Use unit geometry and scale it so we can easily combine base size + pulse in update()
    const geometry = new this.three.SphereGeometry(1, 18, 18);
    const material = new this.three.MeshStandardMaterial({
      color: colors.core,
      emissive: colors.emissive,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: appearance.opacity
    });
    const mesh = new this.three.Mesh(geometry, material);
    mesh.position.set(particle.position.x, 0.2, particle.position.z);
    mesh.scale.setScalar(1);
    mesh.userData.baseScale = appearance.size;

    // Add a glow effect
    const glowGeometry = new this.three.SphereGeometry(1, 16, 16);
    const glowMaterial = new this.three.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: appearance.glowOpacity
    });
    const glow = new this.three.Mesh(glowGeometry, glowMaterial);
    glow.name = "glow";
    glow.scale.setScalar(1.9);
    mesh.add(glow);

    // Add a comet tail (stacked translucent spheres that trail behind)
    const tailGroup = new this.three.Group();
    tailGroup.name = "tail";
    const tailColor = colors.glow;

    for (let i = 0; i < COMET_TAIL.segments; i++) {
      const t = i / Math.max(COMET_TAIL.segments - 1, 1); // 0..1
      const falloff = (1 - t) * (1 - t);
      const opacity = COMET_TAIL.minOpacity + (COMET_TAIL.maxOpacity - COMET_TAIL.minOpacity) * falloff;
      const radiusFactor = COMET_TAIL.minRadiusFactor + (COMET_TAIL.maxRadiusFactor - COMET_TAIL.minRadiusFactor) * falloff;

      const segGeom = new this.three.SphereGeometry(1, 12, 12);
      const segMat = new this.three.MeshBasicMaterial({
        color: tailColor,
        transparent: true,
        opacity,
        depthWrite: false
      });
      const seg = new this.three.Mesh(segGeom, segMat);
      // In local space, the particle faces +Z. Tail goes down -Z.
      seg.position.set(0, 0, -(t * COMET_TAIL.length));
      seg.scale.setScalar(radiusFactor);
      tailGroup.add(seg);
    }

    mesh.add(tailGroup);

    // Set initial visibility based on circuit state
    mesh.visible = this.isCircuitClosed;

    this.parentGroup.add(mesh);
    this.particleMeshes.set(particle.id, mesh);
  }

  /**
   * Update all particle appearances (colors, opacity) based on current settings
   */
  private updateAllParticleAppearances(): void {
    const appearance = FLOW_MODE_APPEARANCE[this.flowMode];

    this.particles.forEach(particle => {
      const mesh = this.particleMeshes.get(particle.id);
      if (!mesh) return;

      const colors = INTENSITY_COLORS[this.globalIntensity];
      particle.intensity = this.globalIntensity;

      // Update main mesh material
      if (mesh.material) {
        mesh.material.color.setHex(colors.core);
        mesh.material.emissive.setHex(colors.emissive);
        mesh.material.opacity = appearance.opacity;
      }

      mesh.userData.baseScale = appearance.size;

      // Update glow + tail children (by name)
      const glow = mesh.children.find((child: any) => child?.name === "glow");
      if (glow?.material) {
        glow.material.color.setHex(colors.glow);
        glow.material.opacity = appearance.glowOpacity;
        glow.scale.setScalar(1.9);
      }

      const tail = mesh.children.find((child: any) => child?.name === "tail");
      if (tail) {
        tail.children?.forEach?.((seg: any, index: number) => {
          if (!seg?.material) return;
          const t = index / Math.max((COMET_TAIL.segments - 1), 1);
          const falloff = (1 - t) * (1 - t);
          seg.material.color.setHex(colors.glow);
          seg.material.opacity = COMET_TAIL.minOpacity + (COMET_TAIL.maxOpacity - COMET_TAIL.minOpacity) * falloff;
        });
      }
    });
  }

  public update(deltaTime: number): void {
    // Only animate when circuit is closed
    if (!this.isCircuitClosed) {
      return;
    }

    this.particles.forEach(particle => {
      // Update particle progress along path
      // Direction is determined by the reversed flag:
      // - reversed=false (conventional): progress increases (positive to negative direction)
      // - reversed=true (electron): progress decreases (negative to positive direction)
      if (particle.reversed) {
        particle.progress -= particle.speed * deltaTime;
        // Loop back when reaching the start
        if (particle.progress <= 0) {
          particle.progress = 1;
        }
      } else {
        particle.progress += particle.speed * deltaTime;
        // Loop back when reaching the end
        if (particle.progress >= 1) {
          particle.progress = 0;
        }
      }

      // Calculate position along path
      const totalLength = this.calculatePathLength(particle.path);
      const targetDistance = particle.progress * totalLength;

      const pos = this.getPositionAlongPath(particle.path, targetDistance);
      if (pos) {
        particle.position = pos;

        // Update mesh position
        const mesh = this.particleMeshes.get(particle.id);
        if (mesh) {
          mesh.position.set(pos.x, 0.2, pos.z);

          // Orient the particle so +Z matches direction of travel (tail trails in -Z)
          const sampleDistance = 0.08;
          const signed = particle.reversed ? -1 : 1;
          const ahead = this.getPositionAlongPath(particle.path, targetDistance + signed * sampleDistance);
          if (ahead) {
            const dx = ahead.x - pos.x;
            const dz = ahead.z - pos.z;
            const mag = Math.sqrt(dx * dx + dz * dz);
            if (mag > 1e-6) {
              const dir = new this.three.Vector3(dx / mag, 0, dz / mag);
              const forward = new this.three.Vector3(0, 0, 1);
              const q = new this.three.Quaternion().setFromUnitVectors(forward, dir);
              mesh.quaternion.copy(q);
            }
          }

          // Pulse effect scaled by intensity
          const intensityPulseScale = this.getIntensityPulseScale(particle.intensity);
          const pulse = 1 + Math.sin(particle.progress * Math.PI * 4) * 0.2 * intensityPulseScale;
          const baseScale = typeof mesh.userData.baseScale === "number" ? mesh.userData.baseScale : FLOW_MODE_APPEARANCE[this.flowMode].size;
          const finalScale = baseScale * pulse;
          mesh.scale.setScalar(finalScale);
        }
      }
    });
  }

  /**
   * Get pulse scale multiplier based on current intensity
   * Higher intensity = more pronounced pulse effect
   */
  private getIntensityPulseScale(intensity: CurrentIntensity): number {
    switch (intensity) {
      case "off": return 0;
      case "low": return 0.5;
      case "medium": return 1.0;
      case "high": return 1.5;
      case "critical": return 2.0;
      default: return 1.0;
    }
  }

  private calculatePathLength(path: Vec2[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dz = path[i + 1].z - path[i].z;
      total += Math.sqrt(dx * dx + dz * dz);
    }
    return total;
  }

  private getPositionAlongPath(path: Vec2[], distance: number): Vec2 | null {
    if (path.length < 2) return null;

    let remainingDistance = distance;
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const segmentLength = Math.sqrt(dx * dx + dz * dz);

      if (remainingDistance <= segmentLength) {
        const t = remainingDistance / segmentLength;
        return {
          x: start.x + dx * t,
          z: start.z + dz * t
        };
      }

      remainingDistance -= segmentLength;
    }

    return path[path.length - 1];
  }

  /**
   * Add flow paths from DC solver wire segment results
   * This provides physics-accurate current flow visualization using actual solved currents
   *
   * @param wireSegmentCurrents - Array of per-segment current data from solveDCCircuit()
   * @param wirePathMap - Map of wireId to full path points
   *
   * Each segment gets particles proportional to and moving at speeds based on
   * the actual current flowing through that segment, providing realistic visualization
   * of current distribution in complex circuits (e.g., parallel branches)
   */
  public addFlowPathsFromSolver(
    wireSegmentCurrents: Array<{ wireId: string; segmentIndex: number; amps: number }>,
    wirePathMap: Map<string, Vec2[]>
  ): void {
    // Group segments by wire
    const wireGroups = new Map<string, Array<{ segmentIndex: number; amps: number }>>();

    for (const segment of wireSegmentCurrents) {
      if (!wireGroups.has(segment.wireId)) {
        wireGroups.set(segment.wireId, []);
      }
      wireGroups.get(segment.wireId)!.push({
        segmentIndex: segment.segmentIndex,
        amps: segment.amps
      });
    }

    // Create flow paths for each wire's segments
    for (const [wireId, segments] of wireGroups) {
      const fullPath = wirePathMap.get(wireId);
      if (!fullPath || fullPath.length < 2) continue;

      // Sort segments by index
      segments.sort((a, b) => a.segmentIndex - b.segmentIndex);

      // Create a flow path for each segment with its own current
      for (const segment of segments) {
        const startIdx = segment.segmentIndex;
        const endIdx = segment.segmentIndex + 1;

        if (startIdx >= fullPath.length - 1) continue;

        // Extract segment path (just two points for a single segment)
        const segmentPath = [fullPath[startIdx], fullPath[endIdx]];
        const currentAmps = segment.amps;

        // Direction: positive amps means current flows startIdx -> endIdx
        // If amps is negative, current flows in reverse
        const flowsForward = currentAmps >= 0;

        this.addFlowPath({
          path: segmentPath,
          currentAmps: Math.abs(currentAmps),
          flowsForward
        });
      }
    }
  }

  /**
   * Calculate power dissipation color based on P = I²R
   * Returns a color that transitions from cool (low power) to hot (high power)
   * for visualizing heat generation in resistive elements
   *
   * @param powerWatts - Power dissipation in watts
   * @returns RGB color value as a hex number
   */
  public static calculatePowerDissipationColor(powerWatts: number): number {
    const absPower = Math.abs(powerWatts);

    // Power thresholds for color transitions (educational circuit ranges)
    // 0W = no glow, 0.01W = warm start, 0.1W = visible glow, 1W = bright, 5W+ = critical
    if (absPower < 0.001) {
      // No power - neutral gray
      return 0x4b5563;
    } else if (absPower < 0.01) {
      // Very low power - slight warm tint
      return 0x6b7280;
    } else if (absPower < 0.1) {
      // Low power - warm orange glow
      return 0xf59e0b;
    } else if (absPower < 0.5) {
      // Medium power - orange-red
      return 0xf97316;
    } else if (absPower < 2.0) {
      // High power - red glow
      return 0xef4444;
    } else {
      // Critical power - bright red-white (overheating)
      return 0xff6b6b;
    }
  }

  /**
   * Calculate glow intensity based on power dissipation
   * Higher power = brighter glow to simulate heat radiation
   *
   * @param powerWatts - Power dissipation in watts
   * @returns Emissive intensity value (0 to 2)
   */
  public static calculatePowerGlowIntensity(powerWatts: number): number {
    const absPower = Math.abs(powerWatts);

    // Use logarithmic scaling for wide power range
    if (absPower < 0.001) return 0;

    const logPower = Math.log10(absPower + 0.001);
    // Map from -3 (0.001W) to 1 (10W) into 0.1 to 2.0
    const normalizedPower = (logPower + 3) / 4;

    return Math.min(2.0, Math.max(0.1, normalizedPower * 1.5));
  }

  public clear() {
    this.particleMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: any) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      // Dispose glow child
      mesh.children.forEach((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.particleMeshes.clear();
    this.particles = [];
  }

  public dispose() {
    this.clear();
  }
}
