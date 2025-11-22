import { Vec2 } from "./types";

export type CurrentFlowParticle = {
  id: string;
  position: Vec2;
  progress: number;
  speed: number;
  path: Vec2[];
};

export class CurrentFlowAnimationSystem {
  private particles: CurrentFlowParticle[] = [];
  private nextParticleId = 0;
  private three: any;
  private particleMeshes: Map<string, any> = new Map();
  private parentGroup: any;

  constructor(three: any, parentGroup: any) {
    this.three = three;
    this.parentGroup = parentGroup;
  }

  public addFlowPath(path: Vec2[], particleCount: number = 3, baseSpeed: number = 0.4) {
    if (path.length < 2) return;

    for (let i = 0; i < particleCount; i++) {
      const particle: CurrentFlowParticle = {
        id: `particle-${this.nextParticleId++}`,
        position: { ...path[0] },
        progress: i / particleCount,
        speed: baseSpeed + Math.random() * 0.2,
        path: [...path]
      };
      this.particles.push(particle);
      this.createParticleMesh(particle);
    }
  }

  private createParticleMesh(particle: CurrentFlowParticle) {
    const geometry = new this.three.SphereGeometry(0.08, 16, 16);
    const material = new this.three.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x60a5fa,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new this.three.Mesh(geometry, material);
    mesh.position.set(particle.position.x, 0.2, particle.position.z);

    // Add a glow effect
    const glowGeometry = new this.three.SphereGeometry(0.15, 16, 16);
    const glowMaterial = new this.three.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.3
    });
    const glow = new this.three.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    this.parentGroup.add(mesh);
    this.particleMeshes.set(particle.id, mesh);
  }

  public update(deltaTime: number) {
    this.particles.forEach(particle => {
      // Update particle progress along path
      particle.progress += particle.speed * deltaTime;

      // Loop back to start
      if (particle.progress >= 1) {
        particle.progress = 0;
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

          // Pulse effect
          const pulseScale = 1 + Math.sin(particle.progress * Math.PI * 4) * 0.2;
          mesh.scale.set(pulseScale, pulseScale, pulseScale);
        }
      }
    });
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
