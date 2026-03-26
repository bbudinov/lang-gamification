"use client";

import React, { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

const emotionsWorld = WORLDS.find((w) => w.id === "emotions")!;
const EMOTION_CITIES = CITIES.filter((c) =>
  emotionsWorld.topicIds.includes(c.topicId)
);

// ─── City positions — evenly distributed oval layout ─────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "joy-island":      [0, 6, -22],      // top center (bright, high)
  "surprise-box":    [18, 8, -14],      // top right
  "calm-forest":     [24, 2, 2],        // right
  "love-garden":     [16, 3, 16],       // bottom right
  "courage-peak":    [0, 0, 22],        // bottom center
  "dream-cloud":     [-16, 10, 14],     // bottom left (floaty)
  "anger-volcano":   [-24, 0, -2],      // left
  "fear-cave":       [-16, -3, -16],    // top left (low, dark)
};

function getCityPos(city: City): [number, number, number] {
  return (
    CITY_POSITIONS[city.id] ?? [
      (city.pos.x - 50) * 1.2,
      0,
      (city.pos.y - 50) * 1.2,
    ]
  );
}

// ─── Zone config ─────────────────────────────────────────────────
interface ZoneConfig {
  color: string;
  emissive: string;
  lightColor: string;
  lightIntensity: number;
  particleColor: string;
  particleCount: number;
  particleBehavior: "sparkle" | "drift-down" | "rise" | "float" | "burst";
}

const ZONE_CONFIG: Record<string, ZoneConfig> = {
  "joy-island": {
    color: "#FFD700",
    emissive: "#FFD700",
    lightColor: "#FFD700",
    lightIntensity: 1.2,
    particleColor: "#FFD700",
    particleCount: 30,
    particleBehavior: "sparkle",
  },
  "fear-cave": {
    color: "#1a1a3a",
    emissive: "#1a1a5a",
    lightColor: "#3344aa",
    lightIntensity: 0.5,
    particleColor: "#2a2a4a",
    particleCount: 20,
    particleBehavior: "drift-down",
  },
  "anger-volcano": {
    color: "#8B0000",
    emissive: "#FF4500",
    lightColor: "#FF2200",
    lightIntensity: 1.5,
    particleColor: "#FF4500",
    particleCount: 15,
    particleBehavior: "rise",
  },
  "calm-forest": {
    color: "#2E8B57",
    emissive: "#3CB371",
    lightColor: "#3CB371",
    lightIntensity: 0.8,
    particleColor: "#4CAF50",
    particleCount: 20,
    particleBehavior: "drift-down",
  },
  "surprise-box": {
    color: "#FFD700",
    emissive: "#FF69B4",
    lightColor: "#FFFFFF",
    lightIntensity: 1.4,
    particleColor: "#FF69B4",
    particleCount: 20,
    particleBehavior: "burst",
  },
  "love-garden": {
    color: "#FF69B4",
    emissive: "#FF1493",
    lightColor: "#FF69B4",
    lightIntensity: 1.0,
    particleColor: "#FFB6C1",
    particleCount: 25,
    particleBehavior: "float",
  },
  "dream-cloud": {
    color: "#E6E6FA",
    emissive: "#9370DB",
    lightColor: "#9370DB",
    lightIntensity: 0.9,
    particleColor: "#DDA0DD",
    particleCount: 30,
    particleBehavior: "float",
  },
  "courage-peak": {
    color: "#4A4A4A",
    emissive: "#FF8C00",
    lightColor: "#FF8C00",
    lightIntensity: 1.1,
    particleColor: "#FF6600",
    particleCount: 10,
    particleBehavior: "rise",
  },
};

// ─── Seeded random ──────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Zone Particles (Points-based, performant) ─────────────────
function ZoneParticles({
  position,
  color,
  count,
  behavior,
  spread = 5,
}: {
  position: [number, number, number];
  color: string;
  count: number;
  behavior: string;
  spread?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const actualCount = IS_MOBILE ? Math.floor(count * 0.5) : count;

  const { positions, velocities } = useMemo(() => {
    const rng = seededRandom(
      Math.abs(position[0] * 100 + position[2] * 10 + count)
    );
    const pos = new Float32Array(actualCount * 3);
    const vel = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i++) {
      const i3 = i * 3;
      pos[i3] = (rng() - 0.5) * spread;
      pos[i3 + 1] = rng() * spread * 0.8;
      pos[i3 + 2] = (rng() - 0.5) * spread;
      vel[i3] = (rng() - 0.5) * 0.02;
      vel[i3 + 1] =
        behavior === "rise"
          ? 0.01 + rng() * 0.02
          : behavior === "drift-down"
            ? -(0.005 + rng() * 0.01)
            : behavior === "burst"
              ? 0.015 + rng() * 0.02
              : (rng() - 0.5) * 0.01;
      vel[i3 + 2] = (rng() - 0.5) * 0.02;
    }
    return { positions: pos, velocities: vel };
  }, [actualCount, position, spread, behavior, count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < actualCount; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3];
      arr[i3 + 1] += velocities[i3 + 1];
      arr[i3 + 2] += velocities[i3 + 2];
      // Reset if too far
      const halfS = spread * 0.6;
      if (
        Math.abs(arr[i3]) > halfS ||
        arr[i3 + 1] > spread ||
        arr[i3 + 1] < -1
      ) {
        arr[i3] = (Math.random() - 0.5) * spread * 0.5;
        arr[i3 + 1] = behavior === "rise" ? -0.5 : Math.random() * spread * 0.5;
        arr[i3 + 2] = (Math.random() - 0.5) * spread * 0.5;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={actualCount}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={behavior === "sparkle" ? 0.15 : 0.12}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Joy Island — Icosahedron, flowers, sparkles ────────────────
function JoyIsland({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);

  const flowers = useMemo(() => {
    const rng = seededRandom(111);
    const count = IS_MOBILE ? 4 : 8;
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 4,
      z: (rng() - 0.5) * 4,
      color: rng() > 0.5 ? "#FF69B4" : "#FF1493",
      scale: 0.15 + rng() * 0.1,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main island */}
      <mesh>
        <icosahedronGeometry args={[3.5, 1]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.3}
          roughness={0.4}
          flatShading
        />
      </mesh>
      {/* Top surface flattener */}
      <mesh position={[0, 1.5, 0]} scale={[1.2, 0.3, 1.2]}>
        <cylinderGeometry args={[2.5, 3, 1, 8]} />
        <meshStandardMaterial
          color="#FFEC80"
          emissive="#FFD700"
          emissiveIntensity={0.2}
          roughness={0.5}
        />
      </mesh>
      {/* Flowers */}
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, 2.2, f.z]}>
          <sphereGeometry args={[f.scale, 6, 6]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Glow Aura Ring (per island) ──────────────────────────────
function GlowAura({
  position,
  radius,
  color,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ringRef.current) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <mesh
      ref={ringRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[radius * 1.2, radius * 1.5, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Background Distant Islands ───────────────────────────────
function DistantIslands() {
  const groupRef = useRef<THREE.Group>(null!);

  const islands = useMemo(() => {
    const rng = seededRandom(999);
    return Array.from({ length: 6 }, () => {
      const angle = rng() * Math.PI * 2;
      const dist = 50 + rng() * 20;
      return {
        x: Math.cos(angle) * dist,
        y: rng() * 15,
        z: Math.sin(angle) * dist,
        scale: 0.5 + rng() * 0.5,
        color: ["#4a3a5a", "#3a4a5a", "#5a3a4a", "#3a5a4a", "#5a4a3a", "#4a4a5a"][
          Math.floor(rng() * 6)
        ],
        speed: 0.1 + rng() * 0.15,
        detail: rng() > 0.5 ? 1 : 0,
      };
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const island = islands[i];
      if (island) {
        child.position.y =
          island.y + Math.sin(state.clock.elapsedTime * island.speed + i * 2) * 0.5;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {islands.map((island, i) => (
        <mesh key={i} position={[island.x, island.y, island.z]} scale={island.scale}>
          {island.detail === 1 ? (
            <icosahedronGeometry args={[1.5, 0]} />
          ) : (
            <sphereGeometry args={[1.5, 6, 6]} />
          )}
          <meshStandardMaterial
            color={island.color}
            transparent
            opacity={0.12 + i * 0.02}
            roughness={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Global Ambient Particles ──────────────────────────────────
function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = IS_MOBILE ? 40 : 100;

  const { positions, velocities } = useMemo(() => {
    const rng = seededRandom(1234);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (rng() - 0.5) * 100;
      pos[i3 + 1] = -5 + rng() * 25;
      pos[i3 + 2] = (rng() - 0.5) * 100;
      vel[i3] = (rng() - 0.5) * 0.005;
      vel[i3 + 1] = (rng() - 0.5) * 0.003;
      vel[i3 + 2] = (rng() - 0.5) * 0.005;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3];
      arr[i3 + 1] += velocities[i3 + 1];
      arr[i3 + 2] += velocities[i3 + 2];
      if (Math.abs(arr[i3]) > 50) velocities[i3] *= -1;
      if (arr[i3 + 1] > 20 || arr[i3 + 1] < -5) velocities[i3 + 1] *= -1;
      if (Math.abs(arr[i3 + 2]) > 50) velocities[i3 + 2] *= -1;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#E0E0FF"
        size={0.08}
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Fear Cave — Dark arch with glowing eyes ────────────────────
function FearCave({ position }: { position: [number, number, number] }) {
  const eyeRef1 = useRef<THREE.Mesh>(null!);
  const eyeRef2 = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    if (eyeRef1.current) {
      (eyeRef1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
    if (eyeRef2.current) {
      (eyeRef2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
  });

  return (
    <group position={position}>
      {/* Base rock — angular cone */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[4, 3, 6]} />
        <meshStandardMaterial color="#1a1a3a" roughness={0.9} flatShading />
      </mesh>
      {/* Left pillar */}
      <mesh position={[-2, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 4, 6]} />
        <meshStandardMaterial color="#12122a" roughness={0.9} flatShading />
      </mesh>
      {/* Right pillar */}
      <mesh position={[2, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 4, 6]} />
        <meshStandardMaterial color="#12122a" roughness={0.9} flatShading />
      </mesh>
      {/* Bridge / arch top */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[5, 1, 2.5]} />
        <meshStandardMaterial color="#0d0d20" roughness={0.9} />
      </mesh>
      {/* Glowing eyes */}
      <mesh ref={eyeRef1} position={[-0.6, 2, 1.3]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF0000"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh ref={eyeRef2} position={[0.6, 2, 1.3]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF0000"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ─── Anger Volcano — Cone with lava pool + cracks ───────────────
function AngerVolcano({
  position,
}: {
  position: [number, number, number];
}) {
  const lavaRef = useRef<THREE.Mesh>(null!);
  const volcanoRef = useRef<THREE.Group>(null!);
  const smokeRef = useRef<THREE.Group>(null!);

  const smokeParticles = useMemo(() => {
    const rng = seededRandom(555);
    return Array.from({ length: 10 }, () => ({
      x: (rng() - 0.5) * 1.2,
      z: (rng() - 0.5) * 1.2,
      speed: 0.3 + rng() * 0.5,
      scale: 0.15 + rng() * 0.15,
      offset: rng() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lavaRef.current) {
      const mat = lavaRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.4;
    }
    // Scale breathing
    if (volcanoRef.current) {
      volcanoRef.current.scale.y = 1 + Math.sin(t * 3) * 0.03;
    }
    // Smoke rising
    if (smokeRef.current) {
      smokeRef.current.children.forEach((child, i) => {
        const sp = smokeParticles[i];
        if (sp) {
          const cycle = ((t * sp.speed + sp.offset) % 3) / 3; // 0-1
          child.position.y = 5.5 + cycle * 4;
          child.scale.setScalar(sp.scale * (1 + cycle * 2));
          (child as THREE.Mesh).material &&
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity !== undefined &&
            (((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.4 * (1 - cycle));
        }
      });
    }
  });

  return (
    <group ref={volcanoRef} position={position}>
      {/* Volcano cone — angular 6-sided */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[4, 6, 6]} />
        <meshStandardMaterial
          color="#4A1010"
          roughness={0.8}
          flatShading
        />
      </mesh>
      {/* Crater rim */}
      <mesh position={[0, 5.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.8, 8]} />
        <meshStandardMaterial
          color="#2A0505"
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Lava pool */}
      <mesh ref={lavaRef} position={[0, 5.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 12]} />
        <meshStandardMaterial
          color="#FF4500"
          emissive="#FF4500"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Lava cracks on sides — emissive orange/red lines */}
      {[0, 1.2, 2.5, 3.8].map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(angle) * 2.8,
            1.5 + i * 0.5,
            Math.sin(angle) * 2.8,
          ]}
          rotation={[0, -angle, Math.PI / 4]}
        >
          <boxGeometry args={[0.08, 1.8, 0.05]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#FF6600" : "#FF2200"}
            emissive={i % 2 === 0 ? "#FF4500" : "#FF0000"}
            emissiveIntensity={1.0}
          />
        </mesh>
      ))}
      {/* Smoke particles */}
      <group ref={smokeRef}>
        {smokeParticles.map((sp, i) => (
          <mesh key={i} position={[sp.x, 5.5, sp.z]}>
            <sphereGeometry args={[sp.scale, 5, 5]} />
            <meshStandardMaterial
              color="#3a3a3a"
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Calm Forest — Green island with low-poly trees ─────────────
function CalmForest({ position }: { position: [number, number, number] }) {
  const treeCount = IS_MOBILE ? 4 : 7;

  const trees = useMemo(() => {
    const rng = seededRandom(444);
    return Array.from({ length: treeCount }, () => ({
      x: (rng() - 0.5) * 6,
      z: (rng() - 0.5) * 6,
      trunkH: 1 + rng() * 0.8,
      crownScale: 0.7 + rng() * 0.5,
      crownColor: rng() > 0.3 ? "#2E8B57" : "#3CB371",
    }));
  }, [treeCount]);

  return (
    <group position={position}>
      {/* Island base — flat smooth cylinder */}
      <mesh>
        <cylinderGeometry args={[4, 4.5, 2, 16]} />
        <meshStandardMaterial
          color="#1B5E20"
          roughness={0.7}
        />
      </mesh>
      {/* Grass top */}
      <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 16]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      {/* Trees */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 1, t.z]}>
          {/* Trunk */}
          <mesh position={[0, t.trunkH * 0.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, t.trunkH, 5]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
          {/* Crown */}
          <mesh position={[0, t.trunkH + t.crownScale * 0.4, 0]}>
            <coneGeometry args={[t.crownScale, t.crownScale * 1.8, 6]} />
            <meshStandardMaterial
              color={t.crownColor}
              emissive={t.crownColor}
              emissiveIntensity={0.15}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Surprise Box — Giant colorful box with lid + spring ────────
function SurpriseBox({ position }: { position: [number, number, number] }) {
  const springRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (springRef.current) {
      springRef.current.position.y =
        3.5 + Math.sin(state.clock.elapsedTime * 2) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Box body */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Stripes — horizontal bands */}
      <mesh position={[0, 1, 2.01]}>
        <boxGeometry args={[4, 0.5, 0.02]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 2, 2.01]}>
        <boxGeometry args={[4, 0.5, 0.02]} />
        <meshStandardMaterial color="#0066FF" emissive="#0066FF" emissiveIntensity={0.3} />
      </mesh>
      {/* Lid — slightly open */}
      <mesh position={[0.5, 3.3, -0.3]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[4.2, 0.4, 4.2]} />
        <meshStandardMaterial
          color="#FF69B4"
          emissive="#FF69B4"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Spring poking out */}
      <group ref={springRef}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 1.2) * 0.3,
              i * 0.25,
              Math.sin(i * 1.2) * 0.3,
            ]}
          >
            <torusGeometry args={[0.3, 0.06, 6, 12]} />
            <meshStandardMaterial
              color="#00CC00"
              emissive="#00CC00"
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}
        {/* Star on top */}
        <mesh position={[0, 1.5, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

// ─── Love Garden — Pink island, hearts, petals ──────────────────
function LoveGarden({ position }: { position: [number, number, number] }) {
  const heartCount = IS_MOBILE ? 3 : 5;

  const hearts = useMemo(() => {
    const rng = seededRandom(666);
    return Array.from({ length: heartCount }, () => ({
      x: (rng() - 0.5) * 5,
      z: (rng() - 0.5) * 5,
      scale: 0.3 + rng() * 0.2,
      rotY: rng() * Math.PI * 2,
    }));
  }, [heartCount]);

  const flowers = useMemo(() => {
    const rng = seededRandom(667);
    const count = IS_MOBILE ? 4 : 8;
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 6,
      z: (rng() - 0.5) * 6,
      color: rng() > 0.5 ? "#FF69B4" : "#FF1493",
    }));
  }, []);

  return (
    <group position={position}>
      {/* Island — soft organic icosahedron */}
      <mesh>
        <icosahedronGeometry args={[3.5, 1]} />
        <meshStandardMaterial
          color="#FFB6C1"
          emissive="#FF69B4"
          emissiveIntensity={0.15}
          roughness={0.6}
          flatShading
        />
      </mesh>
      {/* Hearts — squeezed torus */}
      {hearts.map((h, i) => (
        <group key={i} position={[h.x, 1.5, h.z]} rotation={[0, h.rotY, 0]}>
          <mesh scale={[h.scale, h.scale * 1.2, h.scale * 0.4]}>
            <torusGeometry args={[0.8, 0.4, 8, 12]} />
            <meshStandardMaterial
              color="#FF1493"
              emissive="#FF1493"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
      {/* Flower patches */}
      {flowers.map((f, i) => (
        <mesh key={`f${i}`} position={[f.x, 0.9, f.z]}>
          <sphereGeometry args={[0.12, 5, 5]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Dream Cloud — Semi-transparent cloud + floating shapes ─────
function DreamCloud({ position }: { position: [number, number, number] }) {
  const shapesRef = useRef<THREE.Group>(null!);

  const cloudSpheres = useMemo(() => {
    const rng = seededRandom(777);
    const count = IS_MOBILE ? 6 : 10;
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 5,
      y: (rng() - 0.5) * 1.5,
      z: (rng() - 0.5) * 4,
      scale: 1 + rng() * 1.5,
    }));
  }, []);

  const floatingShapes = useMemo(() => {
    const rng = seededRandom(778);
    const count = IS_MOBILE ? 5 : 10;
    const pastelColors = ["#E6E6FA", "#DDA0DD", "#B0C4DE", "#C8A2C8", "#98FB98", "#FFB6C1", "#B0E0E6"];
    return Array.from({ length: count }, (_, i) => ({
      x: (rng() - 0.5) * 10,
      y: 2 + rng() * 5,
      z: (rng() - 0.5) * 10,
      type: i % 4, // 0=torus, 1=icosa, 2=box, 3=small sphere
      scale: 0.2 + rng() * 0.35,
      color: pastelColors[i % pastelColors.length],
      speed: 0.2 + rng() * 0.4,
      rotAxis: i % 3, // which axis to mainly rotate on
    }));
  }, []);

  useFrame((state) => {
    if (shapesRef.current) {
      shapesRef.current.children.forEach((child, i) => {
        const shape = floatingShapes[i];
        if (shape) {
          const t = state.clock.elapsedTime;
          // Different rotation axes per shape
          if (shape.rotAxis === 0) {
            child.rotation.x = t * shape.speed * 0.3;
            child.rotation.y = t * shape.speed * 0.1;
          } else if (shape.rotAxis === 1) {
            child.rotation.y = t * shape.speed * 0.3;
            child.rotation.z = t * shape.speed * 0.15;
          } else {
            child.rotation.z = t * shape.speed * 0.25;
            child.rotation.x = t * shape.speed * 0.12;
          }
          child.position.y =
            shape.y + Math.sin(t * shape.speed + i) * 0.5;
        }
      });
    }
  });

  return (
    <group position={position}>
      {/* Cloud platform */}
      {cloudSpheres.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.scale, 8, 8]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#E6E6FA"
            emissiveIntensity={0.2}
            transparent
            opacity={0.5}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* Floating abstract shapes */}
      <group ref={shapesRef}>
        {floatingShapes.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]}>
            {s.type === 0 && <torusGeometry args={[s.scale, s.scale * 0.3, 6, 12]} />}
            {s.type === 1 && <icosahedronGeometry args={[s.scale, 0]} />}
            {s.type === 2 && <boxGeometry args={[s.scale, s.scale, s.scale]} />}
            {s.type === 3 && <sphereGeometry args={[s.scale * 0.6, 6, 6]} />}
            <meshStandardMaterial
              color={s.color}
              emissive={s.color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.55}
            />
          </mesh>
        ))}
      </group>
      {/* Purple-tinted fog sphere around dream zone */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[8, 12, 12]} />
        <meshStandardMaterial
          color="#9370DB"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Courage Peak — Rocky mountain with sword + flag ────────────
function CouragePeak({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Mountain base — taller cone */}
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[4, 9, 7]} />
        <meshStandardMaterial
          color="#4A4A4A"
          roughness={0.8}
          flatShading
        />
      </mesh>
      {/* Golden peak cap */}
      <mesh position={[0, 7.5, 0]}>
        <coneGeometry args={[1.2, 2, 6]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FF8C00"
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Sword blade */}
      <mesh position={[0, 9.2, 0]}>
        <boxGeometry args={[0.12, 2.5, 0.05]} />
        <meshStandardMaterial
          color="#C0C0C0"
          emissive="#FFFFFF"
          emissiveIntensity={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Sword cross guard */}
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[0.8, 0.12, 0.12]} />
        <meshStandardMaterial
          color="#8B6914"
          roughness={0.5}
        />
      </mesh>
      {/* Sword handle */}
      <mesh position={[0, 7.9, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 5]} />
        <meshStandardMaterial color="#5C3317" roughness={0.7} />
      </mesh>
      {/* Flag pole */}
      <mesh position={[1.5, 7, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
      {/* Flag */}
      <mesh position={[2.2, 7.8, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.02]} />
        <meshStandardMaterial
          color="#CC0000"
          emissive="#FF0000"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// ─── Routes between zones (glowing ethereal lines) ──────────────
function ZoneRoutes() {
  const connections: [string, string][] = [
    ["joy-island", "fear-cave"],
    ["fear-cave", "anger-volcano"],
    ["anger-volcano", "calm-forest"],
    ["calm-forest", "surprise-box"],
    ["surprise-box", "love-garden"],
    ["love-garden", "dream-cloud"],
    ["dream-cloud", "courage-peak"],
  ];

  const tubes = useMemo(() => {
    return connections.map(([from, to]) => {
      const fromPos = CITY_POSITIONS[from];
      const toPos = CITY_POSITIONS[to];
      if (!fromPos || !toPos) return null;

      const midY = Math.max(fromPos[1], toPos[1]) + 3;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromPos[0], fromPos[1], fromPos[2]),
        new THREE.Vector3(
          (fromPos[0] + toPos[0]) / 2,
          midY,
          (fromPos[2] + toPos[2]) / 2
        ),
        new THREE.Vector3(toPos[0], toPos[1], toPos[2])
      );
      return curve;
    });
  }, []);

  return (
    <>
      {tubes.map((curve, i) => {
        if (!curve) return null;
        return (
          <React.Fragment key={i}>
            <mesh>
              <tubeGeometry args={[curve, 20, 0.08, 6, false]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#8888aa"
                emissiveIntensity={0.3}
                transparent
                opacity={0.35}
                depthWrite={false}
              />
            </mesh>
            <TrailParticles curve={curve} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Pulsing light for anger zone ───────────────────────────────
function PulsingLight({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity =
        1.0 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={color}
      intensity={1.5}
      distance={15}
      decay={2}
    />
  );
}

// ─── City Marker (emoji + name + glow ring) ─────────────────────
function CityMarker({
  city,
  lang,
  unlocked,
  onSelect,
  position,
  glowColor,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
  position: [number, number, number];
  glowColor: string;
}) {
  return (
    <group position={[position[0], position[1] + 6, position[2]]}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
        <ringGeometry args={[3, 3.5, 32]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <Html center distanceFactor={30} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center gap-0.5"
          style={{ cursor: unlocked ? "pointer" : "default" }}
        >
          <span style={{ fontSize: 32 }}>
            {unlocked ? city.emoji : "🔒"}
          </span>
          <div
            className="px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span
              className="text-[11px] font-bold"
              style={{ color: glowColor }}
            >
              {city.name[lang] ?? city.name.en}
            </span>
          </div>
        </button>
      </Html>
    </group>
  );
}

// ─── Pulsing Island Wrapper (heartbeat pulse) ────────────────────
const PULSE_SPEEDS: Record<string, number> = {
  "love-garden": 2,
  "fear-cave": 3.5,
  "anger-volcano": 4,
};

function PulsingIsland({
  speed,
  children,
}: {
  speed: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * speed) * 0.025;
      groupRef.current.scale.setScalar(s);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// ─── Trail Particles along routes ────────────────────────────────
function TrailParticles({ curve }: { curve: THREE.QuadraticBezierCurve3 }) {
  const count = IS_MOBILE ? 3 : 6;
  const meshRefs = useRef<THREE.Mesh[]>([]);

  const offsets = useMemo(() => {
    return Array.from({ length: count }, (_, i) => i / count);
  }, [count]);

  const setRef = useCallback(
    (el: THREE.Mesh | null, i: number) => {
      if (el) meshRefs.current[i] = el;
    },
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const progress = (offsets[i] + t * 0.025) % 1;
      const point = curve.getPoint(progress);
      mesh.position.copy(point);
    });
  });

  return (
    <>
      {offsets.map((_, i) => (
        <mesh key={i} ref={(el) => setRef(el, i)}>
          <sphereGeometry args={[0.1, 4, 4]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFFFFF"
            emissiveIntensity={0.5}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Micro Events (random particle bursts) ───────────────────────
function MicroEvents() {
  if (IS_MOBILE) return null;

  const MAX_BURSTS = 2;
  const BURST_PARTICLE_COUNT = 5;

  const zonePositions = useMemo(() => {
    return Object.entries(CITY_POSITIONS).map(([id, pos]) => ({
      id,
      pos,
      color: ZONE_CONFIG[id]?.particleColor ?? "#FFFFFF",
    }));
  }, []);

  interface BurstData {
    center: [number, number, number];
    color: string;
    startTime: number;
    active: boolean;
  }

  const burstsRef = useRef<BurstData[]>(
    Array.from({ length: MAX_BURSTS }, () => ({
      center: [0, 0, 0] as [number, number, number],
      color: "#FFFFFF",
      startTime: -10,
      active: false,
    }))
  );

  const nextSpawnRef = useRef<number[]>([1, 3.5]);
  const groupRefs = useRef<(THREE.Group | null)[]>([null, null]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    for (let b = 0; b < MAX_BURSTS; b++) {
      const burst = burstsRef.current[b];
      const group = groupRefs.current[b];

      if (!burst.active && t >= nextSpawnRef.current[b]) {
        // Spawn new burst
        const zone = zonePositions[Math.floor(Math.random() * zonePositions.length)];
        burst.center = [...zone.pos];
        burst.color = zone.color;
        burst.startTime = t;
        burst.active = true;
      }

      if (burst.active && group) {
        const elapsed = t - burst.startTime;
        const progress = elapsed / 1.5; // 1.5 seconds duration

        if (progress >= 1) {
          burst.active = false;
          nextSpawnRef.current[b] = t + 4 + Math.random() * 2;
          // Hide
          group.visible = false;
        } else {
          group.visible = true;
          group.position.set(...burst.center);
          group.children.forEach((child, i) => {
            const angle = (i / BURST_PARTICLE_COUNT) * Math.PI * 2;
            const dist = progress * 2;
            child.position.set(
              Math.cos(angle) * dist,
              Math.sin(angle * 0.7) * dist * 0.5 + progress * 1,
              Math.sin(angle) * dist
            );
            child.scale.setScalar(0.08 * (1 + progress));
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat) {
              mat.opacity = 0.6 * (1 - progress);
              mat.color.set(burst.color);
              mat.emissive.set(burst.color);
            }
          });
        }
      }
    }
  });

  return (
    <>
      {[0, 1].map((b) => (
        <group
          key={b}
          ref={(el) => {
            groupRefs.current[b] = el;
          }}
          visible={false}
        >
          {Array.from({ length: BURST_PARTICLE_COUNT }, (_, i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.08, 4, 4]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={0.6}
                transparent
                opacity={0.6}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ─── Camera Micro Drift ──────────────────────────────────────────
function CameraMicroDrift() {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.y += Math.sin(t * 0.3) * 0.003;
    camera.position.x += Math.cos(t * 0.2) * 0.002;
  });

  return null;
}

// ─── Thought Fragments near Dream/Fear (desktop only) ────────────
function ThoughtFragments() {
  if (IS_MOBILE) return null;

  const dreamPos = CITY_POSITIONS["dream-cloud"];
  const fearPos = CITY_POSITIONS["fear-cave"];

  interface Fragment {
    x: number;
    y: number;
    z: number;
    color: string;
    scale: number;
    speed: number;
    rotSpeed: number;
    jitter: number;
    shape: number; // 0=triangle, 1=square, 2=circle
  }

  const fragments = useMemo(() => {
    const rng = seededRandom(8888);
    const result: { zone: "dream" | "fear"; frag: Fragment }[] = [];

    // Dream fragments — pastel, slow
    for (let i = 0; i < 4; i++) {
      const pastelColors = ["#E6E6FA", "#DDA0DD", "#B0C4DE", "#FFB6C1"];
      result.push({
        zone: "dream",
        frag: {
          x: dreamPos[0] + (rng() - 0.5) * 12,
          y: dreamPos[1] + 3 + rng() * 6,
          z: dreamPos[2] + (rng() - 0.5) * 12,
          color: pastelColors[i % pastelColors.length],
          scale: 0.25 + rng() * 0.15,
          speed: 0.15 + rng() * 0.2,
          rotSpeed: 0.3 + rng() * 0.3,
          jitter: 0,
          shape: i % 3,
        },
      });
    }

    // Fear fragments — dark, jittery
    for (let i = 0; i < 4; i++) {
      const darkColors = ["#1a1a3a", "#2a2a4a", "#3a2a4a", "#1a2a3a"];
      result.push({
        zone: "fear",
        frag: {
          x: fearPos[0] + (rng() - 0.5) * 10,
          y: fearPos[1] + 3 + rng() * 5,
          z: fearPos[2] + (rng() - 0.5) * 10,
          color: darkColors[i % darkColors.length],
          scale: 0.2 + rng() * 0.15,
          speed: 0.3 + rng() * 0.3,
          rotSpeed: 0.8 + rng() * 0.6,
          jitter: 0.03,
          shape: i % 3,
        },
      });
    }

    return result;
  }, []);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const item = fragments[i];
      if (!item) return;
      const { frag } = item;
      child.rotation.x = t * frag.rotSpeed * 0.5;
      child.rotation.y = t * frag.rotSpeed;
      child.position.y =
        frag.y + Math.sin(t * frag.speed + i * 1.5) * 0.8;

      // Jitter for fear
      if (frag.jitter > 0) {
        child.position.x =
          frag.x + (Math.random() - 0.5) * frag.jitter;
        child.position.z =
          frag.z + (Math.random() - 0.5) * frag.jitter;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {fragments.map(({ frag }, i) => (
        <mesh key={i} position={[frag.x, frag.y, frag.z]}>
          {frag.shape === 0 && (
            <coneGeometry args={[frag.scale, frag.scale * 1.5, 3]} />
          )}
          {frag.shape === 1 && (
            <boxGeometry
              args={[frag.scale, frag.scale, frag.scale * 0.1]}
            />
          )}
          {frag.shape === 2 && (
            <circleGeometry args={[frag.scale, 12]} />
          )}
          <meshStandardMaterial
            color={frag.color}
            emissive={frag.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Enhanced Fog Sphere ─────────────────────────────────────────
function FogSphere() {
  return (
    <mesh position={[0, 5, 0]}>
      <sphereGeometry args={[80, 16, 16]} />
      <meshBasicMaterial
        color="#0a0a1a"
        transparent
        opacity={0.04}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Island component selector ──────────────────────────────────
function ZoneIsland({
  cityId,
  position,
}: {
  cityId: string;
  position: [number, number, number];
}) {
  const pulseSpeed = PULSE_SPEEDS[cityId];

  const island = (() => {
    switch (cityId) {
      case "joy-island":
        return <JoyIsland position={position} />;
      case "fear-cave":
        return <FearCave position={position} />;
      case "anger-volcano":
        return <AngerVolcano position={position} />;
      case "calm-forest":
        return <CalmForest position={position} />;
      case "surprise-box":
        return <SurpriseBox position={position} />;
      case "love-garden":
        return <LoveGarden position={position} />;
      case "dream-cloud":
        return <DreamCloud position={position} />;
      case "courage-peak":
        return <CouragePeak position={position} />;
      default:
        return null;
    }
  })();

  if (pulseSpeed && island) {
    return <PulsingIsland speed={pulseSpeed}>{island}</PulsingIsland>;
  }

  return island;
}

// ─── Main Scene ─────────────────────────────────────────────────
function EmotionsScene({
  onSelectCity,
  lang,
  totalPoints,
  isMobile,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
  isMobile: boolean;
}) {
  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={["#1a0a2a", 30, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} color="#2a1a3a" />
      <directionalLight
        position={[10, 25, -5]}
        intensity={0.6}
        color="#FFF5E0"
      />

      {/* Per-zone point lights */}
      <pointLight
        position={[-25, 8, -20]}
        color="#FFD700"
        intensity={1.2}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[20, 0, -15]}
        color="#3344aa"
        intensity={0.5}
        distance={15}
        decay={2}
      />
      {/* Anger gets pulsing light */}
      <PulsingLight position={[-15, 4, 10]} color="#FF2200" />
      <pointLight
        position={[25, 5, 5]}
        color="#3CB371"
        intensity={0.8}
        distance={18}
        decay={2}
      />
      <pointLight
        position={[0, 11, -25]}
        color="#FFFFFF"
        intensity={1.4}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[15, 6, 15]}
        color="#FF69B4"
        intensity={1.0}
        distance={18}
        decay={2}
      />
      <pointLight
        position={[-20, 13, 20]}
        color="#9370DB"
        intensity={0.9}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[5, 4, 25]}
        color="#FF8C00"
        intensity={1.1}
        distance={18}
        decay={2}
      />

      {/* Enhanced fog sphere */}
      <FogSphere />

      {/* Routes between zones */}
      <ZoneRoutes />

      {/* Background distant islands */}
      <DistantIslands />

      {/* Global ambient particles */}
      <AmbientParticles />

      {/* Micro events — random particle bursts */}
      <MicroEvents />

      {/* Thought fragments near Dream/Fear */}
      <ThoughtFragments />

      {/* Camera micro drift */}
      <CameraMicroDrift />

      {/* Islands + particles + aura rings + markers */}
      {EMOTION_CITIES.map((city) => {
        const pos = getCityPos(city);
        const config = ZONE_CONFIG[city.id];
        const unlocked = totalPoints >= city.requiredXP;

        return (
          <React.Fragment key={city.id}>
            <ZoneIsland cityId={city.id} position={pos} />

            {/* Glow aura ring */}
            {config && (
              <GlowAura
                position={pos}
                radius={4}
                color={config.color}
              />
            )}

            {config && (
              <ZoneParticles
                position={[pos[0], pos[1] + 2, pos[2]]}
                color={config.particleColor}
                count={config.particleCount}
                behavior={config.particleBehavior}
                spread={6}
              />
            )}

            <CityMarker
              city={city}
              lang={lang}
              unlocked={unlocked}
              onSelect={onSelectCity}
              position={pos}
              glowColor={config?.lightColor ?? "#FFFFFF"}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────
export function EmotionsMap({
  onSelectCity,
}: {
  onSelectCity: (city: City) => void;
}) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div
      className="w-full h-full"
      style={{
        background:
          "linear-gradient(180deg, #0a2a2a 0%, #0a1628 50%, #0d0015 100%)",
      }}
    >
      <Canvas dpr={dpr} camera={{ position: [0, 30, 50], fov: 50 }}>
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <EmotionsScene
          onSelectCity={onSelectCity}
          lang={lang}
          totalPoints={totalPoints}
          isMobile={IS_MOBILE}
        />
        <OrbitControls
          enablePan
          enableZoom
          minDistance={15}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
