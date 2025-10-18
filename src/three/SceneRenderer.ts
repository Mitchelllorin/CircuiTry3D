import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer as ExpoRenderer } from 'expo-three';

export type ComponentType = 'battery' | 'resistor' | 'led' | 'switch';

type ConnectionSide = 'left' | 'right' | 'center';

interface ComponentNode {
  id: string;
  type: ComponentType;
  group: THREE.Group;
  position: THREE.Vector3;
  rotation: number;
}

interface JunctionNode {
  id: string;
  group: THREE.Group;
  position: THREE.Vector3;
  connectionPoint: THREE.Mesh;
}

interface WireNode {
  id: string;
  start: { objectId: string; side: ConnectionSide };
  end: { objectId: string; side: ConnectionSide };
  group: THREE.Group;
}

const GRID_SIZE = 2;

export class SceneRenderer {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: ExpoRenderer | null = null;
  private raycaster: THREE.Raycaster | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private snapIndicator: THREE.Mesh | null = null;

  private width = 0;
  private height = 0;

  private components: ComponentNode[] = [];
  private wires: WireNode[] = [];
  private junctions: JunctionNode[] = [];
  private objectIndex = new Map<string, ComponentNode | JunctionNode>();

  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraDistance = 15;
  private cameraAngleX = 0;
  private cameraAngleY = 0.5;

  private wireMode = false;
  private rotateMode = false;

  private pendingWireStart:
    | { objectId: string; side: ConnectionSide; world: THREE.Vector3 }
    | null = null;

  async init(gl: any) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    this.scene = scene;

    this.width = gl.drawingBufferWidth;
    this.height = gl.drawingBufferHeight;

    const camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera = camera;
    this.updateCameraPosition();

    const renderer = new ExpoRenderer({ gl });
    renderer.setSize(this.width, this.height);
    renderer.setPixelRatio(1);
    this.renderer = renderer;

    this.raycaster = new THREE.Raycaster();

    // Lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    this.createEnhancedGrid();
    this.createSnapIndicator();

    const render = () => {
      requestAnimationFrame(render);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        // @ts-ignore
        this.renderer.getContext().endFrameEXP?.();
      }
    };
    render();
  }

  handleResize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setWireMode(enabled: boolean) {
    this.pendingWireStart = null;
    this.wireMode = enabled;
  }
  setRotateMode(enabled: boolean) { this.rotateMode = enabled; }

  addComponent(type: ComponentType) {
    if (!this.scene) return;
    const group = new THREE.Group();

    switch (type) {
      case 'battery': this.createBatteryMesh(group); break;
      case 'resistor': this.createResistorMesh(group); break;
      case 'led': this.createLEDMesh(group); break;
      case 'switch': this.createSwitchMesh(group); break;
    }

    const id = `${type}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    group.position.copy(this.snapToGrid(new THREE.Vector3(0, 0, 0)));
    group.userData = { id, type };
    this.createConnectionPointsForComponent(group, type);
    this.scene.add(group);

    const node: ComponentNode = {
      id,
      type,
      group,
      position: group.position.clone(),
      rotation: 0,
    };
    this.components.push(node);
    this.objectIndex.set(id, node);
  }

  addJunction() {
    if (!this.scene) return;
    const group = new THREE.Group();
    const bodyGeometry = new THREE.SphereGeometry(0.25, 16, 12);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x8844ff, emissive: 0x221188, shininess: 100 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    const selectionGeometry = new THREE.SphereGeometry(0.8, 8, 6);
    const selectionMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const selectionSphere = new THREE.Mesh(selectionGeometry, selectionMaterial);
    selectionSphere.userData = { isSelectionBox: true };
    group.add(selectionSphere);

    const connectionPointGeometry = new THREE.SphereGeometry(0.28, 12, 8);
    const connectionPointMaterial = new THREE.MeshPhongMaterial({ color: 0xaa66ff, emissive: 0x332288, shininess: 200 });
    const connectionPoint = new THREE.Mesh(connectionPointGeometry, connectionPointMaterial);
    connectionPoint.userData = { kind: 'connection', side: 'center' as ConnectionSide };
    group.add(connectionPoint);

    const id = `junction_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    group.userData = { id, type: 'junction' };

    this.scene.add(group);
    const node: JunctionNode = { id, group, position: group.position.clone(), connectionPoint };
    this.junctions.push(node);
    this.objectIndex.set(id, node);
  }

  handleTap(x: number, y: number) {
    const hit = this.pickConnectionPoint(x, y);
    if (!hit) {
      this.pendingWireStart = null;
      return;
    }

    const { objectId, side, world } = hit;
    if (!this.wireMode) {
      this.pendingWireStart = null;
      return;
    }

    if (!this.pendingWireStart) {
      this.pendingWireStart = { objectId, side, world };
      return;
    }

    if (this.pendingWireStart.objectId === objectId && this.pendingWireStart.side === side) {
      this.pendingWireStart = null;
      return;
    }

    this.createWire(
      this.pendingWireStart.objectId,
      this.pendingWireStart.side,
      objectId,
      side,
    );
    this.pendingWireStart = null;
  }

  private pickConnectionPoint(x: number, y: number):
    | { objectId: string; side: ConnectionSide; world: THREE.Vector3 }
    | null {
    if (!this.scene || !this.camera || !this.raycaster) return null;

    const ndcX = (x / this.width) * 2 - 1;
    const ndcY = -(y / this.height) * 2 + 1;
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

    const candidates: THREE.Object3D[] = [];
    this.components.forEach(comp => {
      comp.group.children.forEach(child => {
        if ((child as any).userData?.kind === 'connection') candidates.push(child);
      });
    });
    this.junctions.forEach(j => candidates.push(j.connectionPoint));

    const intersections = this.raycaster.intersectObjects(candidates, false);
    if (!intersections.length) return null;

    const first = intersections[0].object as THREE.Mesh;
    const parentGroup = first.parent as THREE.Group;
    const parentUserData = (parentGroup?.userData ?? {}) as { id?: string };
    const side = (first.userData?.side ?? 'center') as ConnectionSide;

    const world = new THREE.Vector3();
    first.getWorldPosition(world);
    const objectId = parentUserData.id ?? '';
    if (!objectId) return null;
    return { objectId, side, world };
  }

  private createWire(startId: string, startSide: ConnectionSide, endId: string, endSide: ConnectionSide) {
    if (!this.scene) return;
    const startWorld = this.getWorldConnectionPoint(startId, startSide);
    const endWorld = this.getWorldConnectionPoint(endId, endSide);
    const path = this.createRightAngledWirePath(startWorld, endWorld);

    const group = new THREE.Group();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const distance = a.distanceTo(b);
      if (distance < 0.05) continue;
      const geom = new THREE.CylinderGeometry(0.08, 0.08, distance, 12);
      const mat = new THREE.MeshPhongMaterial({ color: 0xd2691e, shininess: 150, transparent: true, opacity: 0.9 });
      const seg = new THREE.Mesh(geom, mat);
      // midpoint
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      seg.position.copy(mid);
      // align
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      seg.setRotationFromQuaternion(q);
      group.add(seg);
    }

    const id = `wire_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    group.userData = { id, type: 'wire' };
    this.scene.add(group);
    const wire: WireNode = { id, start: { objectId: startId, side: startSide }, end: { objectId: endId, side: endSide }, group };
    this.wires.push(wire);
  }

  private getWorldConnectionPoint(objectId: string, side: ConnectionSide): THREE.Vector3 {
    const node = this.objectIndex.get(objectId);
    if (!node) return this.snapToGrid(new THREE.Vector3());

    if ((node as JunctionNode).connectionPoint) {
      const j = node as JunctionNode;
      const world = new THREE.Vector3();
      j.connectionPoint.getWorldPosition(world);
      return this.snapToGrid(world);
    }

    const comp = node as ComponentNode;
    const group = comp.group;
    const connectionChild = group.children.find(c => (c as any).userData?.kind === 'connection' && (c as any).userData?.side === side) as THREE.Mesh | undefined;
    if (connectionChild) {
      const world = new THREE.Vector3();
      connectionChild.getWorldPosition(world);
      return this.snapToGrid(world);
    }
    return this.snapToGrid(group.position.clone());
  }

  private updateCameraPosition() {
    if (!this.camera) return;
    const x = this.cameraTarget.x + this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraAngleY);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private createEnhancedGrid() {
    if (!this.scene) return;
    const gridSize = 40;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x333366, 0x111122);
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;
  }

  private createSnapIndicator() {
    if (!this.scene) return;
    const geometry = new THREE.RingGeometry(0.8, 1.0, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.rotation.x = -Math.PI / 2;
    indicator.visible = false;
    this.scene.add(indicator);
    this.snapIndicator = indicator;
  }

  private createConnectionPointsForComponent(group: THREE.Group, type: ComponentType) {
    const left = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x111111 })
    );
    left.position.set(-1.2, 0, 0);
    (left as any).userData = { kind: 'connection', side: 'left' as ConnectionSide };
    group.add(left);

    const right = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x111111 })
    );
    right.position.set(1.2, 0, 0);
    (right as any).userData = { kind: 'connection', side: 'right' as ConnectionSide };
    group.add(right);
  }

  private snapToGrid(position: THREE.Vector3) {
    return new THREE.Vector3(
      Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      0,
      Math.round(position.z / GRID_SIZE) * GRID_SIZE
    );
  }

  private createRightAngledWirePath(startPos: THREE.Vector3, endPos: THREE.Vector3): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    const snappedStart = this.snapToGrid(startPos);
    const snappedEnd = this.snapToGrid(endPos);
    path.push(snappedStart.clone());

    const deltaX = snappedEnd.x - snappedStart.x;
    const deltaZ = snappedEnd.z - snappedStart.z;

    const MIN_SEGMENT = GRID_SIZE * 2;

    if (Math.abs(deltaX) < MIN_SEGMENT && Math.abs(deltaZ) < MIN_SEGMENT) {
      path.push(snappedEnd.clone());
    } else if (Math.abs(deltaX) > Math.abs(deltaZ) * 2) {
      const outDistance = Math.sign(deltaX) * MIN_SEGMENT;
      const midX = snappedStart.x + outDistance;
      const outPoint = new THREE.Vector3(midX, 0, snappedStart.z);
      if (Math.abs(outDistance) > 0.1) path.push(outPoint);
      if (Math.abs(deltaZ) > 0.1) path.push(new THREE.Vector3(midX, 0, snappedEnd.z));
      if (Math.abs(snappedEnd.x - midX) > 0.1) path.push(new THREE.Vector3(snappedEnd.x - Math.sign(deltaX) * MIN_SEGMENT, 0, snappedEnd.z));
    } else if (Math.abs(deltaZ) > Math.abs(deltaX) * 2) {
      const outDistance = Math.sign(deltaZ) * MIN_SEGMENT;
      const midZ = snappedStart.z + outDistance;
      const outPoint = new THREE.Vector3(snappedStart.x, 0, midZ);
      if (Math.abs(outDistance) > 0.1) path.push(outPoint);
      if (Math.abs(deltaX) > 0.1) path.push(new THREE.Vector3(snappedEnd.x, 0, midZ));
      if (Math.abs(snappedEnd.z - midZ) > 0.1) path.push(new THREE.Vector3(snappedEnd.x, 0, snappedEnd.z - Math.sign(deltaZ) * MIN_SEGMENT));
    } else {
      const preferHorizontalFirst = Math.abs(deltaX) >= Math.abs(deltaZ);
      if (preferHorizontalFirst) {
        const midX = snappedStart.x + Math.sign(deltaX) * (Math.abs(deltaX) * 0.7 + MIN_SEGMENT);
        path.push(new THREE.Vector3(midX, 0, snappedStart.z));
        if (Math.abs(deltaZ) > 0.1) path.push(new THREE.Vector3(midX, 0, snappedEnd.z));
      } else {
        const midZ = snappedStart.z + Math.sign(deltaZ) * (Math.abs(deltaZ) * 0.7 + MIN_SEGMENT);
        path.push(new THREE.Vector3(snappedStart.x, 0, midZ));
        if (Math.abs(deltaX) > 0.1) path.push(new THREE.Vector3(snappedEnd.x, 0, midZ));
      }
    }

    path.push(snappedEnd.clone());

    const clean: THREE.Vector3[] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      if (clean[clean.length - 1].distanceTo(path[i]) > 0.1) clean.push(path[i]);
    }
    return clean;
  }

  // Camera gesture helpers
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lastPinchDistance = 0;

  handleGestureStart(touches: { x: number; y: number }[]) {
    if (!touches.length) return;
    if (touches.length === 1) {
      this.lastTouchX = touches[0].x;
      this.lastTouchY = touches[0].y;
    } else if (touches.length >= 2) {
      this.lastPinchDistance = this.distance(touches[0], touches[1]);
    }
  }

  handleGestureMove(touches: { x: number; y: number }[]) {
    if (!touches.length) return;
    if (touches.length === 1) {
      const dx = touches[0].x - this.lastTouchX;
      const dy = touches[0].y - this.lastTouchY;
      this.lastTouchX = touches[0].x;
      this.lastTouchY = touches[0].y;

      // orbit
      this.cameraAngleX += dx * 0.005;
      this.cameraAngleY += dy * 0.005;
      this.cameraAngleY = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.cameraAngleY));
      this.updateCameraPosition();
    } else if (touches.length >= 2) {
      const dist = this.distance(touches[0], touches[1]);
      if (this.lastPinchDistance === 0) this.lastPinchDistance = dist;
      const delta = dist - this.lastPinchDistance;
      this.lastPinchDistance = dist;
      this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance - delta * 0.01));
      this.updateCameraPosition();
    }
  }

  handleGestureEnd() {
    this.lastPinchDistance = 0;
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createBatteryMesh(group: THREE.Group) {
    const segments = 8;
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, segments);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const posGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3, segments);
    const posMaterial = new THREE.MeshPhongMaterial({ color: 0xb87333 });
    const pos = new THREE.Mesh(posGeometry, posMaterial);
    pos.rotation.z = Math.PI / 2;
    pos.position.x = 0.75;
    group.add(pos);

    const negGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.15, segments);
    const negMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const neg = new THREE.Mesh(negGeometry, negMaterial);
    neg.rotation.z = Math.PI / 2;
    neg.position.x = -0.7;
    group.add(neg);
  }

  private createResistorMesh(group: THREE.Group) {
    const segments = 8;
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, segments);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xccaa66 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    for (let i = -1; i <= 1; i++) {
      const bandGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.1, segments);
      const bandMaterial = new THREE.MeshLambertMaterial({ color: i === 0 ? 0x000000 : i < 0 ? 0xff0000 : 0xffff00 });
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.rotation.z = Math.PI / 2;
      band.position.x = i * 0.3;
      group.add(band);
    }
  }

  private createLEDMesh(group: THREE.Group) {
    const segments = 8;
    const domeGeometry = new THREE.SphereGeometry(0.25, segments, Math.floor(segments / 2), 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.2;
    group.add(dome);

    const baseGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, segments);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.1;
    group.add(base);
  }

  private createSwitchMesh(group: THREE.Group) {
    const baseGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    group.add(base);

    const leverGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const leverMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const lever = new THREE.Mesh(leverGeometry, leverMaterial);
    lever.position.y = 0.3;
    lever.position.x = 0.2;
    lever.rotation.z = -Math.PI / 8;
    group.add(lever);
  }
}
