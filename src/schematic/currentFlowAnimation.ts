import { Vec2 } from "./types";
import { getPerformanceTier } from "../utils/mobilePerformance";
import { LOGO_COLORS } from "./visualConstants";

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

const parseHexColor = (hex: string, fallback: number): number => {
  if (typeof hex !== "string") return fallback;
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const BRAND_FLOW_COLORS = {
  negative: parseHexColor(LOGO_COLORS.wireGradientStart, 0x88ccff),
  mid: parseHexColor(LOGO_COLORS.componentGradientStart, 0xff8844),
  positive: parseHexColor(LOGO_COLORS.wireGradientEnd, 0x00ff88),
} as const;

/**
 * Color scheme for current intensity visualization
 * Uses existing brand palette tokens already shared across the app.
 * Low -> high current: brand blue -> brand orange -> brand green
 */
export const CURRENT_FLOW_COLOR_RAMP = {
  slow: BRAND_FLOW_COLORS.negative,
  mid: BRAND_FLOW_COLORS.mid,
  fast: BRAND_FLOW_COLORS.positive,
} as const;

const CURRENT_FLOW_OFF_COLORS = {
  core: 0x6b7280,     // Gray - no current
  glow: 0x9ca3af,
  emissive: 0x4b5563
} as const;

/**
 * Particle appearance based on flow mode
 */
export const FLOW_MODE_APPEARANCE = {
  // NOTE: size here is the *base radius* in scene units (scaled in update()).
  electron: { opacity: 0.72, size: 0.13, glowOpacity: 0.28 },       // Softer, slightly larger
  conventional: { opacity: 0.95, size: 0.16, glowOpacity: 0.42 }    // Brighter, larger
} as const;

/**
 * Get comet tail configuration based on device performance tier
 * Improved settings for better visual quality while maintaining performance
 */
const getCometTailConfig = () => {
  const tier = getPerformanceTier();
  if (tier === 'low') {
    return {
      segments: 6,
      length: 6.0,
      maxOpacity: 0.28,
      minOpacity: 0.02,
      maxRadiusFactor: 0.75,
      minRadiusFactor: 0.18
    };
  }
  if (tier === 'medium') {
    return {
      segments: 7,
      length: 6.8,
      maxOpacity: 0.28,
      minOpacity: 0.02,
      maxRadiusFactor: 0.75,
      minRadiusFactor: 0.18
    };
  }
  return {
    segments: 8,
    length: 7.4,
    maxOpacity: 0.28,
    minOpacity: 0.02,
    maxRadiusFactor: 0.75,
    minRadiusFactor: 0.18
  };
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const lerpColor = (start: number, end: number, t: number) => {
  const tt = clamp01(t);
  const sr = (start >> 16) & 0xff;
  const sg = (start >> 8) & 0xff;
  const sb = start & 0xff;
  const er = (end >> 16) & 0xff;
  const eg = (end >> 8) & 0xff;
  const eb = end & 0xff;

  const r = Math.round(lerp(sr, er, tt));
  const g = Math.round(lerp(sg, eg, tt));
  const b = Math.round(lerp(sb, eb, tt));
  return (r << 16) + (g << 8) + b;
};

/**
 * Get performance-adjusted particle limits based on device tier
 * Improved limits for better visual density
 */
const getParticleLimits = () => {
  const tier = getPerformanceTier();
  if (tier === 'low') {
    return { min: 2, max: 10 };  // Increased from 1-8 for better flow visualization
  }
  if (tier === 'medium') {
    return { min: 2, max: 14 }; // Increased from 2-12
  }
  return { min: 2, max: 15 };
};

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

  /**
   * Resistance scaling: higher resistance slows particles within that element
   */
  RESISTANCE_LOG_RANGE: 4,          // log10 range (1Ω to 10kΩ) for full slowdown
  MAX_RESISTANCE_SLOWDOWN: 0.6,     // up to 60% slowdown at high resistance
  RESISTANCE_SPEED_FLOOR: 0.35      // keep at least 35% of min visible speed
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
  /** Cached total path length to avoid recalculating every frame */
  pathLength: number;
  intensity: CurrentIntensity;
  reversed: boolean; // True for electron flow (reversed direction)
  /** True if conventional current flows from path[0] to path[end] */
  flowsForward: boolean;
  /** The amperage this particle represents */
  currentAmps: number;
  /** Whether this particle should track global current updates */
  usesGlobalCurrent: boolean;
  /** Optional resistance to slow this particle's speed */
  resistanceOhms?: number;
};

export type FlowPathConfig = {
  path: Vec2[];
  particleCount?: number;
  baseSpeed?: number;
  currentAmps?: number;
  sourcePolarity?: "positive" | "negative";
  /** Direction of current flow: true if current flows forward along path */
  flowsForward?: boolean;
  /** Resistance in ohms to slow particle speed through this path */
  resistanceOhms?: number;
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
  /** Reusable Vector3 for direction calculations (avoids per-frame allocations) */
  private tempDir: any = null;
  /** Reusable Vector3 for forward vector (avoids per-frame allocations) */
  private tempForward: any = null;
  /** Reusable Quaternion for orientation (avoids per-frame allocations) */
  private tempQuat: any = null;

  constructor(three: any, parentGroup: any) {
    this.three = three;
    this.parentGroup = parentGroup;
    // Pre-allocate reusable objects to avoid per-frame allocations
    this.tempDir = new three.Vector3();
    this.tempForward = new three.Vector3(0, 0, 1);
    this.tempQuat = new three.Quaternion();
  }

  private getReversedForFlowDirection(flowsForward: boolean): boolean {
    // Electron flow is opposite conventional current.
    return this.flowMode === "electron" ? flowsForward : !flowsForward;
  }

  /**
   * Calculate physics-based speed from current magnitude
   * Higher current = faster drift velocity = faster particles
   * Uses logarithmic scaling to handle wide current ranges (mA to A)
   */
  private calculateNormalizedCurrent(amps: number): number {
    const absAmps = Math.abs(amps);
    if (absAmps < CURRENT_FLOW_PHYSICS.ZERO_CURRENT_THRESHOLD) {
      return 0;
    }

    const logCurrent = Math.log10(absAmps + 0.001);
    return clamp01((logCurrent + 3) / 4);
  }

  private getCurrentFlowColors(amps: number): { core: number; glow: number; emissive: number } {
    const absAmps = Math.abs(amps);
    if (absAmps < CURRENT_FLOW_PHYSICS.ZERO_CURRENT_THRESHOLD) {
      return CURRENT_FLOW_OFF_COLORS;
    }

    const normalized = this.calculateNormalizedCurrent(absAmps);
    const base =
      normalized <= 0.5
        ? lerpColor(CURRENT_FLOW_COLOR_RAMP.slow, CURRENT_FLOW_COLOR_RAMP.mid, normalized / 0.5)
        : lerpColor(CURRENT_FLOW_COLOR_RAMP.mid, CURRENT_FLOW_COLOR_RAMP.fast, (normalized - 0.5) / 0.5);

    return {
      core: base,
      glow: lerpColor(base, 0xffffff, 0.45),
      emissive: lerpColor(base, 0x000000, 0.25),
    };
  }

  private calculateResistanceMultiplier(resistanceOhms: number): number {
    if (!Number.isFinite(resistanceOhms) || resistanceOhms <= 0) {
      return 1;
    }

    const normalized = clamp01(Math.log10(resistanceOhms + 1) / CURRENT_FLOW_PHYSICS.RESISTANCE_LOG_RANGE);
    const slowdown = 1 - normalized * CURRENT_FLOW_PHYSICS.MAX_RESISTANCE_SLOWDOWN;
    return Math.max(1 - CURRENT_FLOW_PHYSICS.MAX_RESISTANCE_SLOWDOWN, slowdown);
  }

  private applyResistanceToSpeed(baseSpeed: number, resistanceOhms?: number): number {
    if (baseSpeed <= 0) return 0;
    if (!Number.isFinite(resistanceOhms) || resistanceOhms <= 0) return baseSpeed;

    const multiplier = this.calculateResistanceMultiplier(resistanceOhms);
    const minSpeed = CURRENT_FLOW_PHYSICS.MIN_VISIBLE_SPEED * CURRENT_FLOW_PHYSICS.RESISTANCE_SPEED_FLOOR;
    return Math.max(minSpeed, baseSpeed * multiplier);
  }

  private calculateSpeedFromCurrent(amps: number): number {
    const absAmps = Math.abs(amps);

    // No current = no movement
    if (absAmps < CURRENT_FLOW_PHYSICS.ZERO_CURRENT_THRESHOLD) {
      return 0;
    }

    const normalizedCurrent = this.calculateNormalizedCurrent(absAmps);

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

    // Get performance-adjusted limits for particle count
    const limits = getParticleLimits();

    // Base count on path length and current magnitude
    // Use square root scaling so particle density doesn't explode at high currents
    const densityFactor = Math.sqrt(absAmps) * CURRENT_FLOW_PHYSICS.PARTICLES_PER_UNIT_LENGTH_PER_AMP;
    const baseCount = Math.round(pathLength * densityFactor);

    // Clamp to performance-adjusted bounds
    return Math.min(limits.max, Math.max(limits.min, baseCount));
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
        particle.reversed = this.getReversedForFlowDirection(particle.flowsForward);
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
    const prevGlobal = this.globalCurrentAmps;
    this.globalCurrentAmps = Math.abs(amps);
    this.globalIntensity = this.calculateIntensity(amps);

    // If particles were created using the previous global current (no per-path current provided),
    // update them. If they have their own per-path currents (e.g., parallel branches), preserve them.
    const newBaseSpeed = this.calculateSpeedFromCurrent(this.globalCurrentAmps);
    this.particles.forEach((particle) => {
      if (!particle.usesGlobalCurrent) return;
      particle.currentAmps = this.globalCurrentAmps;
      const adjustedSpeed = this.applyResistanceToSpeed(newBaseSpeed, particle.resistanceOhms);
      particle.baseSpeed = adjustedSpeed;
      particle.speed = this.addSpeedVariation(adjustedSpeed);
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
    let usesGlobalCurrent = true;
    let resistanceOhms: number | undefined;

    if (Array.isArray(pathOrConfig)) {
      path = pathOrConfig;
    } else {
      path = pathOrConfig.path;
      if (pathOrConfig.currentAmps !== undefined) {
        currentAmps = Math.abs(pathOrConfig.currentAmps);
        usesGlobalCurrent = false;
      }
      if (pathOrConfig.flowsForward !== undefined) {
        flowsForward = pathOrConfig.flowsForward;
      }
      if (pathOrConfig.resistanceOhms !== undefined) {
        resistanceOhms = pathOrConfig.resistanceOhms;
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
    if (pathLength <= 1e-6) return;

    // Calculate intensity from current
    const intensity = currentAmps > 0 ? this.calculateIntensity(currentAmps) : this.globalIntensity;

    // Calculate physics-based particle count if not explicitly provided
    const count = particleCount ?? this.calculateParticleCount(pathLength, currentAmps);

    // Calculate physics-based speed if not explicitly provided
    const calculatedSpeed = baseSpeed ?? this.calculateSpeedFromCurrent(currentAmps);
    const adjustedSpeed = this.applyResistanceToSpeed(calculatedSpeed, resistanceOhms);

    // Determine flow direction based on mode and current direction
    // - In electron flow mode, electrons move opposite to conventional current
    // - If current flows forward along path, electrons flow backward, and vice versa
    const isReversed = this.getReversedForFlowDirection(flowsForward);

    for (let i = 0; i < count; i++) {
      // For electron flow, start at the end of the path (since we'll move backward)
      // For conventional flow, start at the beginning
      const startPosition = isReversed ? path[path.length - 1] : path[0];
      // Distribute particles evenly along the path
      const initialProgress = isReversed ? 1 - (i / count) : i / count;

      // Add speed variation for natural movement
      const particleSpeed = this.addSpeedVariation(adjustedSpeed);

      const particle: CurrentFlowParticle = {
        id: `particle-${this.nextParticleId++}`,
        position: { ...startPosition },
        progress: initialProgress,
        baseSpeed: adjustedSpeed,
        speed: particleSpeed,
        path: path, // Use the path as-is, direction is handled in update()
        pathLength, // Cache the path length to avoid recalculating every frame
        intensity,
        reversed: isReversed,
        flowsForward,
        currentAmps,
        usesGlobalCurrent,
        resistanceOhms
      };
      this.particles.push(particle);
      this.createParticleMesh(particle);
    }
  }

  private createParticleMesh(particle: CurrentFlowParticle): void {
    const appearance = FLOW_MODE_APPEARANCE[this.flowMode];
    const colors = this.getCurrentFlowColors(particle.currentAmps);
    const tier = getPerformanceTier();
    const COMET_TAIL = getCometTailConfig();

    // Improved sphere segments for better visual quality across all tiers
    const sphereSegments = tier === 'low' ? 14 : tier === 'medium' ? 16 : 18;
    const glowSegments = tier === 'low' ? 12 : tier === 'medium' ? 14 : 16;
    const tailSegments = tier === 'low' ? 10 : tier === 'medium' ? 10 : 12;

    // Use unit geometry and scale it so we can easily combine base size + pulse in update()
    const geometry = new this.three.SphereGeometry(1, sphereSegments, sphereSegments);
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

    // Add a glow effect - enabled on all tiers for visual appeal
    const glowGeometry = new this.three.SphereGeometry(1, glowSegments, glowSegments);
    const glowMaterial = new this.three.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: tier === 'low' ? appearance.glowOpacity * 0.7 : appearance.glowOpacity // Slightly reduced on low-end
    });
    const glow = new this.three.Mesh(glowGeometry, glowMaterial);
    glow.name = "glow";
    glow.scale.setScalar(1.9);
    mesh.add(glow);

    // Add a comet tail (stacked translucent spheres that trail behind)
    const tailGroup = new this.three.Group();
    tailGroup.name = "tail";
    const tailHeadColor = lerpColor(colors.glow, BRAND_FLOW_COLORS.positive, 0.3);
    const tailTrailColor = lerpColor(colors.glow, BRAND_FLOW_COLORS.negative, 0.6);

    for (let i = 0; i < COMET_TAIL.segments; i++) {
      const t = i / Math.max(COMET_TAIL.segments - 1, 1); // 0..1
      const falloff = (1 - t) * (1 - t);
      const opacity = COMET_TAIL.minOpacity + (COMET_TAIL.maxOpacity - COMET_TAIL.minOpacity) * falloff;
      const radiusFactor = COMET_TAIL.minRadiusFactor + (COMET_TAIL.maxRadiusFactor - COMET_TAIL.minRadiusFactor) * falloff;
      const segmentColor = lerpColor(tailHeadColor, tailTrailColor, t);

      const segGeom = new this.three.SphereGeometry(1, tailSegments, tailSegments);
      const segMat = new this.three.MeshBasicMaterial({
        color: segmentColor,
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

      // Per-particle intensity (derived from this particle's own current) so parallel
      // branches can look/feel different.
      const intensity = this.calculateIntensity(particle.currentAmps);
      const colors = this.getCurrentFlowColors(particle.currentAmps);
      particle.intensity = intensity;

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
        const COMET_TAIL = getCometTailConfig();
        const tailHeadColor = lerpColor(colors.glow, BRAND_FLOW_COLORS.positive, 0.3);
        const tailTrailColor = lerpColor(colors.glow, BRAND_FLOW_COLORS.negative, 0.6);
        const tailChildCount = tail.children?.length || 0;
        tail.children?.forEach?.((seg: any, index: number) => {
          if (!seg?.material) return;
          const t = index / Math.max((tailChildCount - 1), 1);
          const falloff = (1 - t) * (1 - t);
          seg.material.color.setHex(lerpColor(tailHeadColor, tailTrailColor, t));
          seg.material.opacity = COMET_TAIL.minOpacity + (COMET_TAIL.maxOpacity - COMET_TAIL.minOpacity) * falloff;
        });
      }
    });
  }

  private wrapDistance(distance: number, totalLength: number): number {
    if (totalLength <= 0) return 0;
    const wrapped = distance % totalLength;
    return wrapped < 0 ? wrapped + totalLength : wrapped;
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
      const signedDirection = particle.reversed ? -1 : 1;
      particle.progress += signedDirection * particle.speed * deltaTime;
      // Keep progress in [0,1) without snapbacks on long frames.
      particle.progress = ((particle.progress % 1) + 1) % 1;

      // Use cached path length instead of recalculating every frame
      const totalLength = particle.pathLength;
      const targetDistance = this.wrapDistance(particle.progress * totalLength, totalLength);

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
          const aheadDistance = this.wrapDistance(targetDistance + signed * sampleDistance, totalLength);
          const ahead = this.getPositionAlongPath(particle.path, aheadDistance);
          if (ahead) {
            const dx = ahead.x - pos.x;
            const dz = ahead.z - pos.z;
            const mag = Math.sqrt(dx * dx + dz * dz);
            if (mag > 1e-6) {
              // Reuse pre-allocated Vector3/Quaternion to avoid per-frame allocations
              this.tempDir.set(dx / mag, 0, dz / mag);
              this.tempForward.set(0, 0, 1);
              this.tempQuat.setFromUnitVectors(this.tempForward, this.tempDir);
              mesh.quaternion.copy(this.tempQuat);
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
