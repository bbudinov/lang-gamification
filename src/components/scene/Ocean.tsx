"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

export function Ocean() {
  const ref = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.05 - 0.5;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[100, 100, 64, 64]} />
      <MeshDistortMaterial
        color="#0ea5e9"
        transparent
        opacity={0.85}
        roughness={0.3}
        metalness={0.1}
        speed={1.5}
        factor={0.4}
      />
    </mesh>
  );
}
