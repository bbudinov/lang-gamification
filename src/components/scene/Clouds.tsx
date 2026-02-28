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
      {
        x: -15, y: 7, z: -8, speed: 0.15, scale: 1,
        spheres: [
          { offset: [0, 0, 0], radius: 1.2 },
          { offset: [1.1, 0.2, 0.3], radius: 0.9 },
          { offset: [-0.9, 0.1, -0.2], radius: 0.8 },
        ],
      },
      {
        x: 5, y: 8.5, z: -12, speed: 0.1, scale: 1.3,
        spheres: [
          { offset: [0, 0, 0], radius: 1.0 },
          { offset: [1.0, 0.15, 0.2], radius: 0.85 },
          { offset: [-0.7, -0.1, 0.1], radius: 0.7 },
          { offset: [0.3, 0.3, -0.4], radius: 0.6 },
        ],
      },
      {
        x: -8, y: 9, z: -15, speed: 0.08, scale: 0.9,
        spheres: [
          { offset: [0, 0, 0], radius: 1.1 },
          { offset: [0.8, 0.1, 0.1], radius: 0.7 },
          { offset: [-0.6, 0.2, -0.3], radius: 0.65 },
        ],
      },
      {
        x: 12, y: 7.5, z: -6, speed: 0.12, scale: 1.1,
        spheres: [
          { offset: [0, 0, 0], radius: 0.9 },
          { offset: [0.9, 0.1, 0.2], radius: 0.75 },
          { offset: [-0.5, 0.15, -0.1], radius: 0.6 },
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
    const x = ((data.x + clock.elapsedTime * data.speed + 25) % 50) - 25;
    ref.current.position.x = x;
  });

  return (
    <group ref={ref} position={[data.x, data.y, data.z]} scale={data.scale}>
      {data.spheres.map((s, i) => (
        <mesh key={i} position={s.offset}>
          <dodecahedronGeometry args={[s.radius, 0]} />
          <meshStandardMaterial
            color="#e2e8f0"
            transparent
            opacity={0.6}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
