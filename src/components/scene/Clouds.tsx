"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

interface CloudData {
  x: number;
  y: number;
  z: number;
  speed: number;
  scale: number;
  spheres: { offset: [number, number, number]; radius: number }[];
}

export function Clouds() {
  const clouds = useMemo<CloudData[]>(
    () => [
      // Large cloud — left side, slow drift
      {
        x: -18, y: 6, z: -5, speed: 0.12, scale: 1.6,
        spheres: [
          { offset: [0, 0, 0], radius: 1.4 },
          { offset: [1.3, 0.2, 0.3], radius: 1.1 },
          { offset: [-1.1, 0.1, -0.2], radius: 1.0 },
          { offset: [0.5, 0.4, -0.3], radius: 0.8 },
        ],
      },
      // Medium cloud — right, over islands
      {
        x: 10, y: 7, z: -3, speed: 0.09, scale: 1.4,
        spheres: [
          { offset: [0, 0, 0], radius: 1.2 },
          { offset: [1.1, 0.15, 0.2], radius: 0.95 },
          { offset: [-0.8, 0.1, 0.1], radius: 0.8 },
          { offset: [0.3, 0.35, -0.4], radius: 0.7 },
        ],
      },
      // Small fluffy — top area
      {
        x: -6, y: 8, z: -12, speed: 0.07, scale: 1.2,
        spheres: [
          { offset: [0, 0, 0], radius: 1.1 },
          { offset: [0.9, 0.1, 0.1], radius: 0.8 },
          { offset: [-0.7, 0.2, -0.3], radius: 0.7 },
        ],
      },
      // Large cloud — center back
      {
        x: 2, y: 7.5, z: -10, speed: 0.1, scale: 1.5,
        spheres: [
          { offset: [0, 0, 0], radius: 1.3 },
          { offset: [1.2, 0.1, 0.2], radius: 1.0 },
          { offset: [-1.0, 0.15, -0.1], radius: 0.9 },
          { offset: [0.6, 0.3, 0.4], radius: 0.75 },
        ],
      },
      // Small wispy — low near islands
      {
        x: 15, y: 5.5, z: 2, speed: 0.14, scale: 1.0,
        spheres: [
          { offset: [0, 0, 0], radius: 0.9 },
          { offset: [0.7, 0.1, 0.2], radius: 0.65 },
          { offset: [-0.5, 0.15, -0.1], radius: 0.55 },
        ],
      },
      // Medium cloud — far right
      {
        x: -12, y: 6.5, z: 5, speed: 0.11, scale: 1.3,
        spheres: [
          { offset: [0, 0, 0], radius: 1.1 },
          { offset: [1.0, 0.2, 0.15], radius: 0.85 },
          { offset: [-0.6, 0.1, -0.2], radius: 0.7 },
        ],
      },
      // Tiny accent cloud
      {
        x: 8, y: 8.5, z: -8, speed: 0.16, scale: 0.9,
        spheres: [
          { offset: [0, 0, 0], radius: 0.8 },
          { offset: [0.6, 0.1, 0.1], radius: 0.55 },
        ],
      },
    ],
    []
  );

  return (
    <>
      {clouds.map((cloud, i) => (
        <Cloud key={i} data={cloud} />
      ))}
    </>
  );
}

function Cloud({ data }: { data: CloudData }) {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const x = ((data.x + clock.elapsedTime * data.speed + 30) % 60) - 30;
    ref.current.position.x = x;
    // Gentle vertical bob
    ref.current.position.y = data.y + Math.sin(clock.elapsedTime * 0.3 + data.x) * 0.15;
  });

  return (
    <group ref={ref} position={[data.x, data.y, data.z]} scale={data.scale}>
      {data.spheres.map((s, i) => (
        <mesh key={i} position={s.offset}>
          <dodecahedronGeometry args={[s.radius, 1]} />
          <meshStandardMaterial
            color="#f0f4ff"
            emissive="#7ca8cc"
            emissiveIntensity={0.2}
            transparent
            opacity={0.75}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
