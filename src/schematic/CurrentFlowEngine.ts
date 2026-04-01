import * as THREE from "three";
import { CurrentFlowAnimationSystem } from "./currentFlowAnimation";

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let parentGroup: THREE.Group | null = null;
let flowSystem: CurrentFlowAnimationSystem | null = null;

export function initFlowEngine(canvas: HTMLCanvasElement) {
  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // Create scene
  scene = new THREE.Scene();

  // Create camera
  camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 120);

  // Parent group for wires + particles
  parentGroup = new THREE.Group();
  scene.add(parentGroup);

  // Create flow system
  flowSystem = new CurrentFlowAnimationSystem(THREE, parentGroup);

  return flowSystem;
}

export function updateFlowPaths(paths: any[]) {
  if (!flowSystem) return;
  parentGroup!.clear();
  flowSystem.particles = [];
  paths.forEach((p) => flowSystem!.addFlowPath(p));
}

export function setCurrent(amps: number) {
  if (!flowSystem) return;
  flowSystem.setCurrentIntensity(amps);
}

export function tick(deltaTime: number) {
  if (!flowSystem || !renderer || !scene || !camera) return;
  flowSystem.update(deltaTime);
  renderer.render(scene, camera);
}
