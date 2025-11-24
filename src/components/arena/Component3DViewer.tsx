import { useEffect, useRef } from 'react';
import { getComponent3D } from '../circuit/Component3DLibrary';

interface Component3DViewerProps {
  componentType: string;
  isRotating?: boolean;
  isBattling?: boolean;
}

export function Component3DViewer({
  componentType,
  isRotating = true,
  isBattling = false
}: Component3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') {
      return;
    }

    // Dynamically import Three.js
    import('three').then((THREE) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Setup scene
      const scene = new THREE.Scene();
      scene.background = null; // Transparent background
      sceneRef.current = scene;

      // Setup camera - positioned to view component hovering above platform
      const camera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100
      );
      camera.position.set(0, 2, 4);
      camera.lookAt(0, 0.5, 0);

      // Setup renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      rendererRef.current = renderer;

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
      fillLight.position.set(-3, 2, -3);
      scene.add(fillLight);

      // Get component definition
      const componentDef = getComponent3D(componentType);
      const componentGroup = new THREE.Group();

      if (componentDef) {
        // Build shapes
        componentDef.geometry.shapes.forEach((shapeDef) => {
          let geometry: THREE.BufferGeometry | null = null;

          switch (shapeDef.type) {
            case 'box':
              geometry = new THREE.BoxGeometry(
                shapeDef.scale?.[0] || 1,
                shapeDef.scale?.[1] || 1,
                shapeDef.scale?.[2] || 1
              );
              break;
            case 'cylinder':
              geometry = new THREE.CylinderGeometry(
                shapeDef.scale?.[0] || 0.5,
                shapeDef.scale?.[0] || 0.5,
                shapeDef.scale?.[1] || 1,
                32
              );
              break;
            case 'sphere':
              geometry = new THREE.SphereGeometry(
                shapeDef.scale?.[0] || 0.5,
                32,
                32
              );
              break;
            case 'cone':
              geometry = new THREE.ConeGeometry(
                shapeDef.scale?.[0] || 0.5,
                shapeDef.scale?.[1] || 1,
                32
              );
              break;
            case 'torus':
              geometry = new THREE.TorusGeometry(
                shapeDef.scale?.[0] || 0.5,
                shapeDef.scale?.[1] || 0.2,
                16,
                100
              );
              break;
          }

          if (geometry) {
            const material = new THREE.MeshStandardMaterial({
              color: shapeDef.color || '#888888',
              metalness: 0.3,
              roughness: 0.4,
              transparent: shapeDef.opacity !== undefined,
              opacity: shapeDef.opacity || 1.0
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
              shapeDef.position[0],
              shapeDef.position[1],
              shapeDef.position[2]
            );

            if (shapeDef.rotation) {
              mesh.rotation.set(
                shapeDef.rotation[0],
                shapeDef.rotation[1],
                shapeDef.rotation[2]
              );
            }

            componentGroup.add(mesh);
          }
        });

        // Build leads
        componentDef.geometry.leads.forEach((leadDef) => {
          const geometry = new THREE.CylinderGeometry(
            leadDef.radius,
            leadDef.radius,
            leadDef.length,
            16
          );

          const material = new THREE.MeshStandardMaterial({
            color: leadDef.color || '#C0C0C0',
            metalness: 0.8,
            roughness: 0.2
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
            leadDef.position[0],
            leadDef.position[1],
            leadDef.position[2]
          );

          componentGroup.add(mesh);
        });
      } else {
        // Fallback: generic component placeholder
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({
          color: '#3b82f6',
          metalness: 0.3,
          roughness: 0.4
        });
        const mesh = new THREE.Mesh(geometry, material);
        componentGroup.add(mesh);
      }

      scene.add(componentGroup);

      // Animation loop
      let animationTime = 0;
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        animationTime += 0.016;

        if (isRotating && !isBattling) {
          // Slow rotation: 12 seconds per revolution like a car in a showroom
          // 2 * PI radians per 12 seconds = PI/6 radians per second
          // At 60fps (0.016s per frame): 0.016 * PI/6 ≈ 0.0084 radians per frame
          componentGroup.rotation.y = animationTime * (Math.PI / 6);
        }

        if (isBattling) {
          // Fast rotation during battle: 2 seconds per revolution
          componentGroup.rotation.y = animationTime * Math.PI;
          componentGroup.rotation.x = Math.sin(animationTime * 3) * 0.2;
          const scale = 1 + Math.sin(animationTime * 4) * 0.1;
          componentGroup.scale.set(scale, scale, scale);
        } else {
          componentGroup.scale.set(1, 1, 1);
          componentGroup.rotation.x = 0;
        }

        renderer.render(scene, camera);
      };

      animate();

      // Handle resize
      const handleResize = () => {
        if (!canvas || !camera || !renderer) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (renderer) {
          renderer.dispose();
        }
        scene.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      };
    }).catch((error) => {
      console.error('Failed to load Three.js:', error);
    });
  }, [componentType, isRotating, isBattling]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
}
