import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Scene3D(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current ?? document.createElement('canvas');
    if (!canvasRef.current) document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1020');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 6);
    cameraRef.current = camera;

    const light = new THREE.DirectionalLight('#ffffff', 2.5);
    light.position.set(5, 10, 7.5);
    scene.add(light);

    const ambient = new THREE.AmbientLight('#88a', 0.4);
    scene.add(ambient);

    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 200, 32);
    const material = new THREE.MeshStandardMaterial({ color: '#09f', metalness: 0.6, roughness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let raf = 0;
    const onFrame = () => {
      raf = requestAnimationFrame(onFrame);
      mesh.rotation.x += 0.006;
      mesh.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    onFrame();

    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
}
