"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

export function Ocean() {
  const baseRef = useRef<Mesh>(null);
  const topRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (baseRef.current) {
      baseRef.current.position.y = Math.sin(t * 0.4) * 0.06 - 0.55;
    }
    if (topRef.current) {
      topRef.current.position.y = Math.sin(t * 0.5 + 1) * 0.08 - 0.4;
    }
  });

  return (
    <>
      {/* Deep ocean layer — rich deep blue */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[160, 160, 64, 64]} />
        <MeshDistortMaterial
          color="#0a5c8f"
          emissive="#041e3a"
          emissiveIntensity={0.5}
          transparent
          opacity={0.95}
          roughness={0.25}
          metalness={0.15}
          speed={1.5}
          factor={0.7}
        />
      </mesh>

      {/* Surface wave layer — vibrant cyan crests */}
      <mesh ref={topRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[160, 160, 48, 48]} />
        <MeshDistortMaterial
          color="#1e90d4"
          emissive="#0e6aaa"
          emissiveIntensity={0.35}
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.25}
          speed={2.5}
          factor={0.9}
        />
      </mesh>
    </>
  );
}
