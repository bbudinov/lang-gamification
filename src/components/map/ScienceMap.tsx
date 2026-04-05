"use client";

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

const BG_COLOR = "#0b1220";

const scienceWorld = WORLDS.find((w) => w.id === "science")!;
const SCIENCE_CITIES = CITIES.filter((c) =>
  scienceWorld.topicIds.includes(c.topicId)
);

// ─── City positions (custom 3D layout) ───────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "main-lab":           [0, 0, 0],
  "robot-factory":      [-22, 0, -14],
  "orbital-station":    [22, 2, -16],
  "energy-plant":       [-18, 0, 10],
  "nature-lab":         [18, 0, 8],
  "medical-center":     [-10, 0, 22],
  "computer-room":      [10, 0, 20],
  "invention-workshop": [0, 3, -24],
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
  platformColor: string;
  glowColor: string;
  lightColor: string;
  lightIntensity: number;
}

const ZONE_CONFIG: Record<string, ZoneConfig> = {
  "main-lab": {
    platformColor: "#1f2937",
    glowColor: "#00ffd5",
    lightColor: "#00ffd5",
    lightIntensity: 1.2,
  },
  "robot-factory": {
    platformColor: "#2a2a2a",
    glowColor: "#ff6600",
    lightColor: "#ff8844",
    lightIntensity: 0.9,
  },
  "orbital-station": {
    platformColor: "#1a1a3a",
    glowColor: "#4488ff",
    lightColor: "#4488ff",
    lightIntensity: 1.0,
  },
  "energy-plant": {
    platformColor: "#1a2a1a",
    glowColor: "#aaff00",
    lightColor: "#aaff00",
    lightIntensity: 1.1,
  },
  "nature-lab": {
    platformColor: "#1a2e1a",
    glowColor: "#22cc66",
    lightColor: "#22cc66",
    lightIntensity: 0.8,
  },
  "medical-center": {
    platformColor: "#e8e8e8",
    glowColor: "#ff3333",
    lightColor: "#ff4444",
    lightIntensity: 1.0,
  },
  "computer-room": {
    platformColor: "#141430",
    glowColor: "#3399ff",
    lightColor: "#3399ff",
    lightIntensity: 1.0,
  },
  "invention-workshop": {
    platformColor: "#2a2210",
    glowColor: "#ffcc00",
    lightColor: "#ffcc00",
    lightIntensity: 1.1,
  },
};

// ─── Seeded random ───────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Hex Platform ────────────────────────────────────────────────
function HexPlatform({
  position,
  radius = 4,
  color,
  glowColor,
}: {
  position: [number, number, number];
  radius?: number;
  color: string;
  glowColor: string;
}) {
  return (
    <group position={position}>
      {/* Main hex */}
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.5, 6]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Edge glow ring */}
      {!IS_MOBILE && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.26, 0]}>
          <ringGeometry args={[radius - 0.15, radius, 6]} />
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── 1. Main Lab — DNA Helix ─────────────────────────────────────
function MainLab({ position }: { position: [number, number, number] }) {
  const helixRef = useRef<THREE.Group>(null!);

  const { curve1, curve2 } = useMemo(() => {
    const points1: THREE.Vector3[] = [];
    const points2: THREE.Vector3[] = [];
    const turns = 3;
    const height = 8;
    const r = 1.2;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      const y = t * height - height / 2;
      points1.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      points2.push(new THREE.Vector3(Math.cos(angle + Math.PI) * r, y, Math.sin(angle + Math.PI) * r));
    }
    return {
      curve1: new THREE.CatmullRomCurve3(points1),
      curve2: new THREE.CatmullRomCurve3(points2),
    };
  }, []);

  useFrame((state) => {
    if (helixRef.current) {
      helixRef.current.rotation.y += 0.002;
      helixRef.current.position.y = 4.5 + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={5} color="#1f2937" glowColor="#00ffd5" />
      {/* DNA Helix */}
      <group ref={helixRef} position={[0, 4.5, 0]} /* Y controlled by useFrame */>
        {/* Strand 1 — cyan */}
        <mesh>
          <tubeGeometry args={[curve1, 60, 0.12, 8, false]} />
          <meshStandardMaterial
            color="#00ffd5"
            emissive="#00ffd5"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Strand 2 — magenta */}
        <mesh>
          <tubeGeometry args={[curve2, 60, 0.12, 8, false]} />
          <meshStandardMaterial
            color="#ff00ff"
            emissive="#ff00ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>
    </group>
  );
}

// ─── 2. Robot Factory — Conveyor + Arm + Sparks ──────────────────
function RobotFactory({ position }: { position: [number, number, number] }) {
  const boxesRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!boxesRef.current) return;
    const t = state.clock.elapsedTime;
    boxesRef.current.children.forEach((child, i) => {
      // Move boxes along conveyor (loop)
      const offset = ((t * 0.8 + i * 2) % 8) - 4;
      child.position.x = offset;
    });
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#2a2a2a" glowColor="#ff6600" />
      {/* Conveyor belt */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[8, 0.3, 1.5]} />
        <meshStandardMaterial color="#333333" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Moving boxes */}
      <group ref={boxesRef} position={[0, 1.2, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 2 - 2, 0, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color="#555555" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>
      {/* Robot arm — only on desktop */}
      {!IS_MOBILE && (
        <group position={[0, 0.7, -1.5]}>
          {/* Base */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 1, 8]} />
            <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Upper arm */}
          <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.12, 0.12, 1.5, 6]} />
            <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Joint */}
          <mesh position={[0.22, 2.2, 0]}>
            <sphereGeometry args={[0.18, 6, 6]} />
            <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}
      {/* Sparks — small emissive dots */}
      {!IS_MOBILE &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={`spark-${i}`} position={[(i - 1.5) * 0.5, 2.5, -1.2]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshStandardMaterial
              color="#ff8800"
              emissive="#ff8800"
              emissiveIntensity={1.5}
            />
          </mesh>
        ))}
    </group>
  );
}

// ─── 3. Orbital Station — Satellite + Hologram Planet ────────────
function OrbitalStation({ position }: { position: [number, number, number] }) {
  const planetRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (planetRef.current) {
      planetRef.current.rotation.y = state.clock.elapsedTime * 0.4;
      planetRef.current.rotation.x = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#1a1a3a" glowColor="#4488ff" />
      {/* Satellite body */}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.4, 0.4, 2.5, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Solar panel left */}
      <mesh position={[-2, 2.5, 0]}>
        <boxGeometry args={[2.5, 0.05, 1.2]} />
        <meshStandardMaterial
          color="#2244aa"
          emissive="#2244aa"
          emissiveIntensity={0.2}
          metalness={0.5}
        />
      </mesh>
      {/* Solar panel right */}
      <mesh position={[2, 2.5, 0]}>
        <boxGeometry args={[2.5, 0.05, 1.2]} />
        <meshStandardMaterial
          color="#2244aa"
          emissive="#2244aa"
          emissiveIntensity={0.2}
          metalness={0.5}
        />
      </mesh>
      {/* Hologram planet — wireframe */}
      <mesh ref={planetRef} position={[0, 5, 0]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color="#4488ff"
          emissive="#4488ff"
          emissiveIntensity={0.5}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}

// ─── 4. Energy Plant — Pylons + Electric Arc ─────────────────────
function EnergyPlant({ position }: { position: [number, number, number] }) {
  const arcRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (arcRef.current) {
      // Random flicker effect
      const t = state.clock.elapsedTime;
      const mat = arcRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.4 + Math.sin(t * 15) * 0.3 + Math.sin(t * 23) * 0.2;
      if (Math.random() > 0.95) {
        mat.emissiveIntensity = 3 + Math.random() * 2;
      } else {
        mat.emissiveIntensity = 2;
      }
    }
  });

  const pylonPositions: [number, number, number][] = [
    [-1.5, 0, -0.8],
    [1.5, 0, -0.8],
    [0, 0, 1.2],
  ];

  // Arc curve between first two pylons
  const arcCurve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.5, 4, -0.8),
      new THREE.Vector3(0, 5.5, -0.8),
      new THREE.Vector3(1.5, 4, -0.8)
    );
  }, []);

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#1a2a1a" glowColor="#aaff00" />
      {/* Energy pylons */}
      {pylonPositions.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 4, 6]} />
            <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Glowing top */}
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial
              color="#aaff00"
              emissive="#aaff00"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}
      {/* Electric arc between pylons */}
      <mesh ref={arcRef}>
        <tubeGeometry args={[arcCurve, 16, 0.04, 4, false]} />
        <meshStandardMaterial
          color="#ccff00"
          emissive="#aaff00"
          emissiveIntensity={2}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ─── 5. Nature Lab — Greenhouse Dome + Trees ─────────────────────
function NatureLab({ position }: { position: [number, number, number] }) {
  const leafRef = useRef<THREE.Points>(null!);
  const leafCount = IS_MOBILE ? 8 : 20;

  const leafPositions = useMemo(() => {
    const rng = seededRandom(555);
    const pos = new Float32Array(leafCount * 3);
    for (let i = 0; i < leafCount; i++) {
      const i3 = i * 3;
      pos[i3] = (rng() - 0.5) * 4;
      pos[i3 + 1] = 1 + rng() * 4;
      pos[i3 + 2] = (rng() - 0.5) * 4;
    }
    return pos;
  }, [leafCount]);

  useFrame((state) => {
    if (!leafRef.current) return;
    const posAttr = leafRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < leafCount; i++) {
      const i3 = i * 3;
      arr[i3 + 1] += Math.sin(t + i) * 0.003;
      arr[i3] += Math.cos(t * 0.5 + i) * 0.002;
      if (arr[i3 + 1] > 5) arr[i3 + 1] = 1;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#1a2e1a" glowColor="#22cc66" />
      {/* Greenhouse dome — semi-transparent */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#22cc66"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          roughness={0.1}
        />
      </mesh>
      {/* Trees inside */}
      {[[-0.8, 0, 0.5], [0.8, 0, -0.6], [0, 0, 0]].map((p, i) => (
        <group key={i} position={[p[0], p[1], p[2]]}>
          {/* Trunk */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1.5, 5]} />
            <meshStandardMaterial color="#5c3317" />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 2, 0]}>
            <sphereGeometry args={[0.6, 6, 6]} />
            <meshStandardMaterial
              color="#22aa44"
              emissive="#22aa44"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
      {/* Floating leaf particles */}
      <points ref={leafRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[leafPositions, 3]}
            count={leafCount}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#44dd66"
          size={0.15}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─── 6. Medical Center — Cross + Test Tubes + Microscope ─────────
function MedicalCenter({ position }: { position: [number, number, number] }) {
  const crossRef = useRef<THREE.Group>(null!);
  const tubeColors = ["#ff3333", "#3399ff", "#33cc33", "#ffcc00", "#cc33ff"];

  useFrame((state) => {
    if (crossRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      crossRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#e8e8e8" glowColor="#ff3333" />
      {/* Red cross */}
      <group ref={crossRef} position={[0, 3, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 2, 0.2]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.8}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[2, 0.4, 0.2]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
      {/* Test tubes */}
      {tubeColors.map((color, i) => (
        <mesh key={i} position={[(i - 2) * 0.5, 1.2, 1.5]} rotation={[0, 0, (i - 2) * 0.05]}>
          <cylinderGeometry args={[0.06, 0.06, 1.5, 6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      {/* Microscope */}
      <group position={[1.5, 0.5, -1]}>
        {/* Base */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.2, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Body tube */}
        <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 6]} />
          <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Eyepiece */}
        <mesh position={[0.1, 1.4, 0]}>
          <cylinderGeometry args={[0.1, 0.06, 0.3, 6]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 7. Computer Room — Floating Screens + Binary Particles ──────
function ComputerRoom({ position }: { position: [number, number, number] }) {
  const screensRef = useRef<THREE.Group>(null!);
  const binaryRef = useRef<THREE.Points>(null!);
  const screenCount = IS_MOBILE ? 2 : 4;
  const binaryCount = IS_MOBILE ? 10 : 25;

  const screenData = useMemo(() => {
    const rng = seededRandom(777);
    return Array.from({ length: screenCount }, (_, i) => ({
      x: (i - (screenCount - 1) / 2) * 1.8,
      y: 2.5 + rng() * 0.5,
      z: -0.5 + rng() * 1,
      rotY: (rng() - 0.5) * 0.5,
    }));
  }, [screenCount]);

  const binaryPositions = useMemo(() => {
    const rng = seededRandom(778);
    const pos = new Float32Array(binaryCount * 3);
    for (let i = 0; i < binaryCount; i++) {
      const i3 = i * 3;
      pos[i3] = (rng() - 0.5) * 6;
      pos[i3 + 1] = rng() * 5;
      pos[i3 + 2] = (rng() - 0.5) * 6;
    }
    return pos;
  }, [binaryCount]);

  useFrame((state) => {
    // Float screens gently
    if (screensRef.current) {
      const t = state.clock.elapsedTime;
      screensRef.current.children.forEach((child, i) => {
        child.position.y = screenData[i].y + Math.sin(t * 0.8 + i) * 0.15;
      });
    }
    // Rise binary particles
    if (binaryRef.current) {
      const posAttr = binaryRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < binaryCount; i++) {
        arr[i * 3 + 1] += 0.015;
        if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = 0;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#141430" glowColor="#3399ff" />
      {/* Floating screens */}
      <group ref={screensRef}>
        {screenData.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]} rotation={[0, s.rotY, 0]}>
            <planeGeometry args={[1.4, 0.9]} />
            <meshStandardMaterial
              color="#1144aa"
              emissive="#3399ff"
              emissiveIntensity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
      {/* Keyboard */}
      <mesh position={[0, 0.5, 1.5]}>
        <boxGeometry args={[2, 0.08, 0.6]} />
        <meshStandardMaterial color="#222222" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Binary particles */}
      <points ref={binaryRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[binaryPositions, 3]}
            count={binaryCount}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#3399ff"
          size={0.1}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─── 8. Invention Workshop — Light Bulb + Gears + Blueprint ──────
function InventionWorkshop({ position }: { position: [number, number, number] }) {
  const bulbRef = useRef<THREE.Group>(null!);
  const gearsRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Float the light bulb
    if (bulbRef.current) {
      bulbRef.current.position.y = 4 + Math.sin(t * 0.6) * 0.3;
    }
    // Rotate gears
    if (gearsRef.current) {
      gearsRef.current.children.forEach((child, i) => {
        child.rotation.z = t * (i % 2 === 0 ? 0.5 : -0.4);
      });
    }
  });

  return (
    <group position={position}>
      <HexPlatform position={[0, 0, 0]} radius={4} color="#2a2210" glowColor="#ffcc00" />
      {/* Light bulb — floating */}
      <group ref={bulbRef} position={[0, 4, 0]}>
        {/* Glass sphere */}
        <mesh>
          <sphereGeometry args={[0.7, 12, 12]} />
          <meshStandardMaterial
            color="#ffee88"
            emissive="#ffcc00"
            emissiveIntensity={1.0}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* Base screw */}
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.25, 0.35, 0.5, 8]} />
          <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      {/* Gears */}
      <group ref={gearsRef}>
        <mesh position={[-1.5, 1.5, -1]} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.6, 0.1, 6, 8]} />
          <meshStandardMaterial
            color="#cc9900"
            emissive="#ffcc00"
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[1.2, 1.2, -0.5]} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.45, 0.08, 6, 8]} />
          <meshStandardMaterial
            color="#cc9900"
            emissive="#ffcc00"
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>
      {/* Blueprint table */}
      <mesh position={[0, 0.5, 1.2]}>
        <boxGeometry args={[2.5, 0.1, 1.5]} />
        <meshStandardMaterial
          color="#224488"
          emissive="#224488"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

// ─── Routes — neon cyan tubes ────────────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["main-lab", "robot-factory"],
  ["main-lab", "orbital-station"],
  ["main-lab", "energy-plant"],
  ["main-lab", "nature-lab"],
  ["main-lab", "medical-center"],
  ["main-lab", "computer-room"],
  ["main-lab", "invention-workshop"],
  ["robot-factory", "invention-workshop"],
  ["orbital-station", "invention-workshop"],
  ["energy-plant", "medical-center"],
  ["nature-lab", "computer-room"],
];

function NeonRoutes() {
  const tubes = useMemo(() => {
    return ROUTE_PAIRS.map(([from, to]) => {
      const fromPos = CITY_POSITIONS[from];
      const toPos = CITY_POSITIONS[to];
      if (!fromPos || !toPos) return null;
      const midY = Math.max(fromPos[1], toPos[1]) + 1.5;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromPos[0], fromPos[1] + 0.3, fromPos[2]),
        new THREE.Vector3(
          (fromPos[0] + toPos[0]) / 2,
          midY,
          (fromPos[2] + toPos[2]) / 2
        ),
        new THREE.Vector3(toPos[0], toPos[1] + 0.3, toPos[2])
      );
      return curve;
    });
  }, []);

  return (
    <>
      {tubes.map((curve, i) => {
        if (!curve) return null;
        return (
          <mesh key={i}>
            <tubeGeometry args={[curve, 20, 0.06, 5, false]} />
            <meshStandardMaterial
              color="#00ffd5"
              emissive="#00ffd5"
              emissiveIntensity={0.5}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Molecule Particles (global floating) ────────────────────────
function MoleculeParticles() {
  const count = IS_MOBILE ? 30 : 80;
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, velocities } = useMemo(() => {
    const rng = seededRandom(999);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (rng() - 0.5) * 60;
      pos[i3 + 1] = 1 + rng() * 10;
      pos[i3 + 2] = (rng() - 0.5) * 60;
      vel[i3] = (rng() - 0.5) * 0.01;
      vel[i3 + 1] = (rng() - 0.5) * 0.008;
      vel[i3 + 2] = (rng() - 0.5) * 0.01;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3];
      arr[i3 + 1] += velocities[i3 + 1];
      arr[i3 + 2] += velocities[i3 + 2];
      if (Math.abs(arr[i3]) > 35 || arr[i3 + 1] > 12 || arr[i3 + 1] < 0) {
        arr[i3] = (Math.random() - 0.5) * 50;
        arr[i3 + 1] = 1 + Math.random() * 8;
        arr[i3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    posAttr.needsUpdate = true;
  });

  // Cycle colors: white, cyan, green
  const colors = useMemo(() => {
    const rng = seededRandom(1000);
    const colArr = new Float32Array(count * 3);
    const palette = [
      [1, 1, 1],        // white
      [0, 1, 0.84],     // cyan (#00ffd5)
      [0.4, 1, 0.5],    // green
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(rng() * palette.length)];
      colArr[i * 3] = c[0];
      colArr[i * 3 + 1] = c[1];
      colArr[i * 3 + 2] = c[2];
    }
    return colArr;
  }, [count]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}

// ─── Route Dots — moving emissive spheres along 3 routes ────────
function RouteDots() {
  const dotsRef = useRef<THREE.Group>(null!);

  const routeCurves = useMemo(() => {
    const pairs: [string, string][] = [
      ["main-lab", "robot-factory"],
      ["main-lab", "orbital-station"],
      ["main-lab", "energy-plant"],
    ];
    return pairs.map(([from, to]) => {
      const fromPos = CITY_POSITIONS[from]!;
      const toPos = CITY_POSITIONS[to]!;
      const midY = Math.max(fromPos[1], toPos[1]) + 1.5;
      return new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromPos[0], fromPos[1] + 0.3, fromPos[2]),
        new THREE.Vector3((fromPos[0] + toPos[0]) / 2, midY, (fromPos[2] + toPos[2]) / 2),
        new THREE.Vector3(toPos[0], toPos[1] + 0.3, toPos[2])
      );
    });
  }, []);

  useFrame(({ clock }) => {
    if (!dotsRef.current) return;
    const t = clock.getElapsedTime();
    let idx = 0;
    for (let r = 0; r < routeCurves.length; r++) {
      for (let d = 0; d < 3; d++) {
        const child = dotsRef.current.children[idx];
        if (child) {
          const offset = (t * 0.15 + d / 3) % 1;
          const pt = routeCurves[r].getPointAt(offset);
          child.position.copy(pt);
        }
        idx++;
      }
    }
  });

  return (
    <group ref={dotsRef}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.08, 4, 4]} />
          <meshStandardMaterial color="#00ffd5" emissive="#00ffd5" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Center Hologram — floating semi-transparent cyan plane ─────
function CenterHologram() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y += 0.005;
    ref.current.position.y = 7 + Math.sin(t * 0.8) * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, 7, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial
        color="#00ffd5"
        emissive="#00ffd5"
        emissiveIntensity={0.6}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
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

// ─── City Marker ─────────────────────────────────────────────────
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
    <group position={[position[0], position[1] + 5, position[2]]}>
      {/* Glow ring on platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <ringGeometry args={[3.5, 4, 6]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.45}
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
            {unlocked ? city.emoji : "\uD83D\uDD12"}
          </span>
          <div
            className="px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: "rgba(0,0,0,0.75)",
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

// ─── Zone selector ───────────────────────────────────────────────
function ZoneDecor({
  cityId,
  position,
}: {
  cityId: string;
  position: [number, number, number];
}) {
  switch (cityId) {
    case "main-lab":
      return <MainLab position={position} />;
    case "robot-factory":
      return <RobotFactory position={position} />;
    case "orbital-station":
      return <OrbitalStation position={position} />;
    case "energy-plant":
      return <EnergyPlant position={position} />;
    case "nature-lab":
      return <NatureLab position={position} />;
    case "medical-center":
      return <MedicalCenter position={position} />;
    case "computer-room":
      return <ComputerRoom position={position} />;
    case "invention-workshop":
      return <InventionWorkshop position={position} />;
    default:
      return null;
  }
}

// ─── Main Scene ──────────────────────────────────────────────────
function ScienceScene({
  onSelectCity,
  lang,
  totalPoints,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
}) {
  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={[BG_COLOR, 40, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.25} color="#1a2a3a" />
      <directionalLight
        position={[10, 25, -5]}
        intensity={0.5}
        color="#88ccff"
      />

      {/* Per-zone point lights */}
      {SCIENCE_CITIES.map((city) => {
        const pos = getCityPos(city);
        const config = ZONE_CONFIG[city.id];
        if (!config) return null;
        return (
          <pointLight
            key={city.id}
            position={[pos[0], pos[1] + 5, pos[2]]}
            color={config.lightColor}
            intensity={config.lightIntensity}
            distance={18}
            decay={2}
          />
        );
      })}

      {/* Dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={BG_COLOR} roughness={1} />
      </mesh>

      {/* Neon routes */}
      <NeonRoutes />

      {/* Moving dot particles along main routes */}
      <RouteDots />

      {/* Center hologram */}
      <CenterHologram />

      {/* Global molecule particles */}
      <MoleculeParticles />

      {/* Camera micro drift */}
      <CameraMicroDrift />

      {/* Zones + markers */}
      {SCIENCE_CITIES.map((city) => {
        const pos = getCityPos(city);
        const config = ZONE_CONFIG[city.id];
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP

        return (
          <React.Fragment key={city.id}>
            <ZoneDecor cityId={city.id} position={pos} />
            <CityMarker
              city={city}
              lang={lang}
              unlocked={unlocked}
              onSelect={onSelectCity}
              position={pos}
              glowColor={config?.glowColor ?? "#00ffd5"}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────

// Mobile camera adjuster — fixes zoom on phones (runs after mount)
function MobileCameraAdjust({ pos, fov }: { pos: [number, number, number]; fov: number }) {
  const { camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const isMob = window.innerWidth < 800 || "ontouchstart" in window;
    if (isMob) {
      camera.position.set(...pos);
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
      done.current = true;
    }
  }, [camera, fov, pos]);
  return null;
}

export function ScienceMap({
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
          "linear-gradient(180deg, #0b1220 0%, #0a0e1a 50%, #060a12 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: IS_MOBILE ? [0, 50, 65] : [0, 35, 45], fov: IS_MOBILE ? 58 : 50 }}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <ScienceScene
          onSelectCity={onSelectCity}
          lang={lang}
          totalPoints={totalPoints}
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
