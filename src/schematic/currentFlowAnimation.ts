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
  electron: { opacity: 0.7, size: 0.07, glowOpacity: 0.25 },    // Semi-transparent for electron flow
  conventional: { opacity: 0.95, size: 0.09, glowOpacity: 0.4 }  // Solid for conventional current
} as const;

export type CurrentFlowParticle = {
  id: string;
  position: Vec2;
  progress: number;
  speed: number;
  path: Vec2[];
  intensity: CurrentIntensity;
  reversed: boolean; // True for electron flow (reversed direction)
};

export type FlowPathConfig = {
  path: Vec2[];
  particleCount?: number;
  baseSpeed?: number;
  currentAmps?: number;
  sourcePolarity?: "positive" | "negative";
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

  constructor(three: any, parentGroup: any) {
    this.three = three;
    this.parentGroup = parentGroup;
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
   * @param amps - Current in amperes
   */
  public setCurrentIntensity(amps: number): void {
    this.globalIntensity = this.calculateIntensity(amps);
    this.updateAllParticleAppearances();
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
   */
  public addFlowPath(
    pathOrConfig: Vec2[] | FlowPathConfig,
    particleCount: number = 3,
    baseSpeed: number = 0.4
  ): void {
    let path: Vec2[];
    let count = particleCount;
    let speed = baseSpeed;
    let intensity = this.globalIntensity;

    if (Array.isArray(pathOrConfig)) {
      path = pathOrConfig;
    } else {
      path = pathOrConfig.path;
      count = pathOrConfig.particleCount ?? particleCount;
      speed = pathOrConfig.baseSpeed ?? baseSpeed;
      if (pathOrConfig.currentAmps !== undefined) {
        intensity = this.calculateIntensity(pathOrConfig.currentAmps);
      }
    }

    if (path.length < 2) return;

    // Determine flow direction based on mode
    // Electron flow: reversed = true (particles move backward along path)
    // Conventional flow: reversed = false (particles move forward along path)
    const isReversed = this.flowMode === "electron";

    for (let i = 0; i < count; i++) {
      // For electron flow, start at the end of the path (since we'll move backward)
      // For conventional flow, start at the beginning
      const startPosition = isReversed ? path[path.length - 1] : path[0];
      // Distribute particles evenly along the path
      const initialProgress = isReversed ? 1 - (i / count) : i / count;

      const particle: CurrentFlowParticle = {
        id: `particle-${this.nextParticleId++}`,
        position: { ...startPosition },
        progress: initialProgress,
        speed: speed + Math.random() * 0.2,
        path: path, // Use the path as-is, direction is handled in update()
        intensity,
        reversed: isReversed
      };
      this.particles.push(particle);
      this.createParticleMesh(particle);
    }
  }

  private createParticleMesh(particle: CurrentFlowParticle): void {
    const appearance = FLOW_MODE_APPEARANCE[this.flowMode];
    const colors = INTENSITY_COLORS[particle.intensity];

    const geometry = new this.three.SphereGeometry(appearance.size, 16, 16);
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

    // Add a glow effect
    const glowGeometry = new this.three.SphereGeometry(appearance.size * 1.8, 16, 16);
    const glowMaterial = new this.three.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: appearance.glowOpacity
    });
    const glow = new this.three.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

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

      // Update glow child
      if (mesh.children[0] && mesh.children[0].material) {
        mesh.children[0].material.color.setHex(colors.glow);
        mesh.children[0].material.opacity = appearance.glowOpacity;
      }

      // Update geometry size
      const newSize = appearance.size;
      mesh.scale.set(newSize / 0.08, newSize / 0.08, newSize / 0.08);
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

          // Pulse effect scaled by intensity
          const intensityPulseScale = this.getIntensityPulseScale(particle.intensity);
          const pulseScale = 1 + Math.sin(particle.progress * Math.PI * 4) * 0.2 * intensityPulseScale;
          mesh.scale.set(pulseScale, pulseScale, pulseScale);
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
