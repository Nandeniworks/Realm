import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Interactive3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene, Camera, and WebGL Renderer
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    // Add atmospheric deep fog to the scene to match Awwwards styling
    scene.fog = new THREE.FogExp2(0x040610, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Build 3D Glowing Moon Sphere
    const moonGeo = new THREE.SphereGeometry(6, 64, 64);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xC3C9FF,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // 3. Build Outer Constellation Particles Ring
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Spawn particles randomly in a spherical envelope around the moon
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 9 + Math.random() * 5; // Radius bounds

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom star shape point texture emulation
    const particleMat = new THREE.PointsMaterial({
      color: 0xF3C5C1,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const starParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(starParticles);

    // 4. Mouse Move Tracking for Camera Parallax
    let targetX = 0;
    let targetY = 0;
    const handleMouseMove = (e) => {
      // Normalized coordinates (-1 to 1)
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 5. Animation Render loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Rotate moon mesh slowly
      moonMesh.rotation.y += 0.0012;
      moonMesh.rotation.x += 0.0006;

      // Rotate outer constellation particles opposite way
      starParticles.rotation.y -= 0.0018;

      // Smooth camera interpolation based on mouse coordinates (inertia)
      camera.position.x += (targetX * 5 - camera.position.x) * 0.05;
      camera.position.y += (targetY * 5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // 6. Handle Resizing
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] md:min-h-[450px] opacity-75 relative pointer-events-none select-none"
    />
  );
}
export { Interactive3D };
