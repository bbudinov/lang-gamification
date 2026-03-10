"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Animal Island — rich, layered terrain with life ─────────────

interface Props {
  unlocked: boolean;
  hovered: boolean;
  unlockEffect: boolean;
  topicColor: string;
  completedLevels?: number;
}

export function AnimalIslandBody({ unlocked, hovered, unlockEffect, topicColor, completedLevels = 0 }: Props) {
  const waterfallRef = useRef<THREE.Mesh>(null);
  const pondRef = useRef<THREE.Mesh>(null);
  const birdRef = useRef<THREE.Group>(null);
  const fishRef = useRef<THREE.Mesh>(null);

  const g = unlocked ? "#16a34a" : "#6b7280"; // ground
  const gDark = unlocked ? "#0d7a2e" : "#555";
  const cliff = unlocked ? "#7c5e3c" : "#4b5563";
  const cliffDark = unlocked ? "#5a3f28" : "#3a3a3a";
  const beach = unlocked ? "#fbbf24" : "#9ca3af";
  const water = unlocked ? "#38bdf8" : "#6b7280";
  const treeTrunk = unlocked ? "#92400e" : "#555";
  const treeGreen = unlocked ? "#16a34a" : "#6b7280";
  const treeLight = unlocked ? "#4ade80" : "#777";

  // Progress glow
  const isCompleted = completedLevels >= 3;
  const progressGlow = unlocked ? (isCompleted ? 0.4 : completedLevels * 0.08) : 0;
  const glowColor = isCompleted ? "#fbbf24" : topicColor;
  const emissive = unlockEffect ? topicColor : hovered && unlocked ? topicColor : (progressGlow > 0 ? glowColor : "#000000");
  const emissiveI = unlockEffect ? 1.5 : hovered ? 0.3 : progressGlow;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Waterfall shimmer
    if (waterfallRef.current) {
      (waterfallRef.current.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 4) * 0.15;
    }

    // Pond ripple
    if (pondRef.current) {
      pondRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.02;
      pondRef.current.scale.z = 1 + Math.cos(t * 1.5) * 0.02;
    }

    // Bird bobbing on branch
    if (birdRef.current) {
      birdRef.current.position.y = 1.15 + Math.sin(t * 2) * 0.03;
      birdRef.current.rotation.y = Math.sin(t * 0.5) * 0.3;
    }

    // Fish jumping from pond
    if (fishRef.current && unlocked) {
      const cycle = (t * 0.4) % 4; // 4 second cycle
      if (cycle < 1) {
        // Jump arc
        const p = cycle;
        fishRef.current.visible = true;
        fishRef.current.position.y = 0.25 + Math.sin(p * Math.PI) * 0.4;
        fishRef.current.position.x = -0.6 + p * 0.15;
        fishRef.current.rotation.z = -p * Math.PI * 0.5;
      } else {
        fishRef.current.visible = false;
      }
    }
  });

  return (
    <>
      {/* ── Main terrain ── */}

      {/* Base mass — wider, more organic */}
      <mesh position={[0, 0.05, 0]} scale={[1.5, 0.55, 1.4]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color={g} flatShading emissive={emissive} emissiveIntensity={emissiveI} />
      </mesh>

      {/* Main hill — taller, offset to create interesting silhouette */}
      <mesh position={[-0.3, 0.35, -0.2]} scale={[0.8, 0.7, 0.75]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={gDark} flatShading emissive={emissive} emissiveIntensity={emissiveI * 0.7} />
      </mesh>

      {/* Secondary peak — smaller, creates ridge */}
      <mesh position={[0.4, 0.2, -0.3]} scale={[0.5, 0.45, 0.5]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={g} flatShading emissive={emissive} emissiveIntensity={emissiveI * 0.5} />
      </mesh>

      {/* Gentle meadow slope — front area */}
      <mesh position={[0.3, 0.05, 0.4]} scale={[0.9, 0.2, 0.7]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={treeLight} flatShading emissive={emissive} emissiveIntensity={emissiveI * 0.3} />
      </mesh>

      {/* ── Cliff layers ── */}
      <mesh position={[-0.7, -0.05, 0.5]} scale={[0.6, 0.35, 0.5]} rotation={[0, 0.8, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={cliff} flatShading />
      </mesh>
      <mesh position={[0.8, -0.1, -0.4]} scale={[0.45, 0.3, 0.4]} rotation={[0, 1.5, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={cliffDark} flatShading />
      </mesh>

      {/* ── Beach shelf ── */}
      <mesh position={[0, -0.2, 0]} scale={[1, 1, 1]}>
        <cylinderGeometry args={[1.8, 1.4, 0.12, 10]} />
        <meshStandardMaterial color={beach} flatShading />
      </mesh>

      {/* Underwater base */}
      <mesh position={[0, -0.4, 0]} scale={[1.0, 0.4, 1.0]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={cliffDark} flatShading />
      </mesh>

      {/* Shoreline foam */}
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.1, 4, 20]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} flatShading />
      </mesh>

      {/* ── Pond ── */}
      <mesh ref={pondRef} position={[-0.5, 0.22, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 8]} />
        <meshStandardMaterial
          color={water}
          emissive={unlocked ? "#0ea5e9" : "#000"}
          emissiveIntensity={unlocked ? 0.3 : 0}
          transparent
          opacity={0.7}
          flatShading
        />
      </mesh>
      {/* Pond edge — tiny rocks */}
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle, i) => (
        <mesh key={`pr${i}`} position={[
          -0.5 + Math.cos(angle) * 0.38,
          0.22,
          0.3 + Math.sin(angle) * 0.38
        ]}>
          <dodecahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial color={cliff} flatShading />
        </mesh>
      ))}

      {/* ── Waterfall — from hill to pond ── */}
      <mesh
        ref={waterfallRef}
        position={[-0.45, 0.4, 0.05]}
        rotation={[0.3, 0, 0.1]}
      >
        <planeGeometry args={[0.08, 0.35]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Trees — varied sizes and types ── */}

      {/* Big tree — back left, round canopy */}
      <mesh position={[-0.15, 0.55, -0.25]}>
        <cylinderGeometry args={[0.05, 0.07, 0.5, 5]} />
        <meshStandardMaterial color={treeTrunk} flatShading />
      </mesh>
      <mesh position={[-0.15, 0.85, -0.25]}>
        <dodecahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color={treeGreen} flatShading />
      </mesh>
      <mesh position={[-0.05, 0.95, -0.2]}>
        <dodecahedronGeometry args={[0.18, 1]} />
        <meshStandardMaterial color={treeLight} flatShading />
      </mesh>

      {/* Medium pine — back right */}
      <mesh position={[0.35, 0.5, -0.35]}>
        <cylinderGeometry args={[0.03, 0.05, 0.35, 4]} />
        <meshStandardMaterial color={treeTrunk} flatShading />
      </mesh>
      <mesh position={[0.35, 0.75, -0.35]}>
        <coneGeometry args={[0.2, 0.35, 5]} />
        <meshStandardMaterial color={treeGreen} flatShading />
      </mesh>
      <mesh position={[0.35, 0.95, -0.35]}>
        <coneGeometry args={[0.13, 0.25, 5]} />
        <meshStandardMaterial color={treeLight} flatShading />
      </mesh>

      {/* Small tree — near pond */}
      <mesh position={[-0.8, 0.35, 0.15]}>
        <cylinderGeometry args={[0.03, 0.04, 0.25, 4]} />
        <meshStandardMaterial color={treeTrunk} flatShading />
      </mesh>
      <mesh position={[-0.8, 0.52, 0.15]}>
        <dodecahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={treeGreen} flatShading />
      </mesh>

      {/* Tiny bush cluster — front right */}
      <mesh position={[0.6, 0.2, 0.35]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={treeGreen} flatShading />
      </mesh>
      <mesh position={[0.75, 0.18, 0.25]}>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={treeLight} flatShading />
      </mesh>

      {/* ── Grass tufts ── */}
      {[
        [0.1, 0.18, 0.5],
        [0.5, 0.15, 0.1],
        [-0.2, 0.2, 0.6],
        [0.7, 0.12, -0.1],
        [-0.6, 0.15, -0.3],
      ].map((pos, i) => (
        <mesh key={`grass${i}`} position={pos as [number, number, number]}>
          <coneGeometry args={[0.04, 0.08, 3]} />
          <meshStandardMaterial color={treeLight} flatShading />
        </mesh>
      ))}

      {/* ── Animals! ── */}

      {/* Bear — brown blob near big tree */}
      <group position={[0.05, 0.3, -0.1]}>
        {/* Body */}
        <mesh>
          <sphereGeometry args={[0.08, 6, 5]} />
          <meshStandardMaterial color={unlocked ? "#8B4513" : "#666"} flatShading />
        </mesh>
        {/* Head */}
        <mesh position={[0.05, 0.06, 0.03]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshStandardMaterial color={unlocked ? "#A0522D" : "#777"} flatShading />
        </mesh>
        {/* Ears */}
        <mesh position={[0.07, 0.1, 0]}>
          <sphereGeometry args={[0.02, 4, 3]} />
          <meshStandardMaterial color={unlocked ? "#8B4513" : "#666"} flatShading />
        </mesh>
      </group>

      {/* Rabbit — white blob in meadow */}
      <group position={[0.45, 0.2, 0.45]}>
        <mesh>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshStandardMaterial color={unlocked ? "#f5f5f4" : "#888"} flatShading />
        </mesh>
        {/* Ears — two tiny elongated shapes */}
        <mesh position={[0.01, 0.06, 0]} scale={[1, 2, 1]}>
          <sphereGeometry args={[0.015, 3, 3]} />
          <meshStandardMaterial color={unlocked ? "#fecdd3" : "#888"} flatShading />
        </mesh>
        <mesh position={[-0.01, 0.06, 0]} scale={[1, 2, 1]}>
          <sphereGeometry args={[0.015, 3, 3]} />
          <meshStandardMaterial color={unlocked ? "#fecdd3" : "#888"} flatShading />
        </mesh>
      </group>

      {/* Bird — on tree branch */}
      <group ref={birdRef} position={[-0.3, 1.15, -0.25]}>
        <mesh>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshStandardMaterial color={unlocked ? "#ef4444" : "#777"} flatShading />
        </mesh>
        {/* Beak */}
        <mesh position={[0.035, 0, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.01, 0.03, 3]} />
          <meshStandardMaterial color={unlocked ? "#fbbf24" : "#999"} flatShading />
        </mesh>
        {/* Wing */}
        <mesh position={[-0.01, 0.01, 0.02]} rotation={[0.2, 0, 0.3]}>
          <sphereGeometry args={[0.025, 4, 3]} />
          <meshStandardMaterial color={unlocked ? "#dc2626" : "#666"} flatShading />
        </mesh>
      </group>

      {/* Fish — jumps from pond */}
      <mesh ref={fishRef} position={[-0.6, 0.25, 0.3]} visible={false}>
        <coneGeometry args={[0.025, 0.08, 4]} />
        <meshStandardMaterial
          color={unlocked ? "#fb923c" : "#777"}
          emissive={unlocked ? "#f97316" : "#000"}
          emissiveIntensity={0.3}
          flatShading
        />
      </mesh>

      {/* ── Scattered shore rocks ── */}
      <mesh position={[1.2, -0.15, 0.6]} rotation={[0.3, 0.7, 0.1]}>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={cliff} flatShading />
      </mesh>
      <mesh position={[-1.1, -0.12, -0.8]} rotation={[0.5, 1.2, 0.2]}>
        <dodecahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={cliff} flatShading />
      </mesh>
      <mesh position={[0.7, -0.18, -1.1]} rotation={[0.1, 2.1, 0.3]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={cliffDark} flatShading />
      </mesh>
      <mesh position={[-0.4, -0.16, 1.0]} rotation={[0.2, 0.5, 0.1]}>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={cliff} flatShading />
      </mesh>

      {/* ── Satellite mini-islands ── */}
      {/* Island with single palm */}
      <group position={[2.8, -0.1, 1.2]} scale={0.35}>
        <mesh scale={[1.2, 0.4, 1.2]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={g} flatShading />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[1.3, 1.0, 0.08, 6]} />
          <meshStandardMaterial color={beach} flatShading />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.04, 0.06, 0.5, 4]} />
          <meshStandardMaterial color={treeTrunk} flatShading />
        </mesh>
        <mesh position={[0.08, 0.6, 0]}>
          <dodecahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={treeGreen} flatShading />
        </mesh>
      </group>

      {/* Rocky mini-island */}
      <group position={[-2.5, -0.1, -0.5]} scale={0.3}>
        <mesh scale={[1.1, 0.45, 1.1]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={cliff} flatShading />
        </mesh>
        <mesh position={[0.1, 0.25, 0]} scale={[0.6, 0.4, 0.5]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={cliffDark} flatShading />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[1.2, 0.9, 0.08, 6]} />
          <meshStandardMaterial color={beach} flatShading />
        </mesh>
      </group>

      {/* Tiny grassy islet */}
      <group position={[1.3, -0.08, -2.6]} scale={0.28}>
        <mesh scale={[1.0, 0.35, 1.0]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={g} flatShading />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[1.1, 0.8, 0.07, 5]} />
          <meshStandardMaterial color={beach} flatShading />
        </mesh>
        {/* Tiny bush */}
        <mesh position={[0, 0.25, 0]}>
          <dodecahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color={treeGreen} flatShading />
        </mesh>
      </group>
    </>
  );
}
