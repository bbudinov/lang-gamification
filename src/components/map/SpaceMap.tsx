"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Mobile detection (static) ──────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

// ─── Space world cities ─────────────────────────────────────────
const SPACE_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "space")?.topicIds ?? []
);
const SPACE_CITIES = CITIES.filter((c) => SPACE_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions ──────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "planet-hub": [0, 0, 0],
  "rocket-pad": [18, 2, -14],
  "astronaut-base": [-20, 0, -10],
  "alien-world": [24, -2, 8],
  "space-station": [-14, 3, 12],
  "moon-base": [8, -1, 20],
  "star-observatory": [-22, 4, -18],
  "galaxy-hub": [0, 5, -26],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs ────────────────────────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["planet-hub", "rocket-pad"],
  ["planet-hub", "astronaut-base"],
  ["planet-hub", "alien-world"],
  ["planet-hub", "space-station"],
  ["planet-hub", "moon-base"],
  ["planet-hub", "star-observatory"],
  ["planet-hub", "galaxy-hub"],
  ["rocket-pad", "star-observatory"],
  ["astronaut-base", "space-station"],
  ["alien-world", "moon-base"],
  ["star-observatory", "galaxy-hub"],
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL ELEMENTS
// ═══════════════════════════════════════════════════════════════

// ─── Starfield ──────────────────────────────────────────────────
function Starfield({ count = 200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 300;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 200 + 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    return arr;
  }, [count]);

  const sizes = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.3 + Math.random() * 0.7;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const geo = ref.current.geometry;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      sizeAttr.setX(i, sizes[i] * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7)));
    }
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.6}
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
}

// ─── Nebula clouds ──────────────────────────────────────────────
function Nebula() {
  const nebulae = useMemo(
    () => [
      { pos: [60, 30, -80] as [number, number, number], color: "#6633aa", r: 25 },
      { pos: [-70, 50, -60] as [number, number, number], color: "#3344aa", r: 30 },
      { pos: [40, 20, 60] as [number, number, number], color: "#aa3366", r: 20 },
      { pos: [-50, 40, 50] as [number, number, number], color: "#4422aa", r: 22 },
      { pos: [0, 60, -40] as [number, number, number], color: "#2244bb", r: 28 },
    ],
    []
  );

  return (
    <group>
      {nebulae.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[n.r, 12, 8]} />
          <meshBasicMaterial
            color={n.color}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Drifting asteroids ─────────────────────────────────────────
function DriftingAsteroids() {
  const groupRef = useRef<THREE.Group>(null!);
  const asteroids = useMemo(
    () => [
      { startPos: [40, 5, 30] as [number, number, number], speed: 0.3, dir: [-1, 0.1, -0.5] },
      { startPos: [-35, 8, -25] as [number, number, number], speed: 0.25, dir: [0.8, -0.05, 0.6] },
      { startPos: [10, -3, 40] as [number, number, number], speed: 0.35, dir: [-0.6, 0.15, -0.8] },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const a = asteroids[i];
      child.position.set(
        a.startPos[0] + Math.sin(t * a.speed) * 15 * a.dir[0],
        a.startPos[1] + Math.sin(t * a.speed * 0.7) * 3 * a.dir[1],
        a.startPos[2] + Math.cos(t * a.speed) * 15 * a.dir[2]
      );
      child.rotation.x = t * 0.3;
      child.rotation.y = t * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {asteroids.map((_, i) => (
        <mesh key={i}>
          <dodecahedronGeometry args={[0.5 + i * 0.2, 0]} />
          <meshStandardMaterial color="#554444" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Comet (desktop only) ───────────────────────────────────────
function Comet() {
  const groupRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Points>(null!);

  const trailPositions = useMemo(() => new Float32Array(30 * 3), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const cycle = (t % 30) / 30;
    const x = -60 + cycle * 120;
    const y = 25 + Math.sin(cycle * Math.PI) * 15;
    const z = -20 + cycle * 10;
    groupRef.current.position.set(x, y, z);

    // Update trail
    if (trailRef.current) {
      const positions = trailRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 29; i > 0; i--) {
        positions.setXYZ(
          i,
          positions.getX(i - 1),
          positions.getY(i - 1),
          positions.getZ(i - 1)
        );
      }
      positions.setXYZ(0, x, y, z);
      positions.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.4, 8, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <pointLight color="#aaccff" intensity={2} distance={8} />
      </group>
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#aaddff"
          size={0.25}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    </>
  );
}

// ─── Space routes (glowing arcs between planets) ────────────────
function SpaceRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const curves = useMemo(() => {
    return ROUTE_PAIRS.map(([a, b]) => {
      const posA = CITY_POSITIONS[a] ?? [0, 0, 0];
      const posB = CITY_POSITIONS[b] ?? [0, 0, 0];
      const mid: [number, number, number] = [
        (posA[0] + posB[0]) / 2,
        (posA[1] + posB[1]) / 2 + 4,
        (posA[2] + posB[2]) / 2,
      ];
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...posA),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...posB)
      );
      const bothUnlocked = unlockedIds.has(a) && unlockedIds.has(b);
      return { curve, bothUnlocked, a, b };
    });
  }, [unlockedIds]);

  return (
    <group>
      {curves.map(({ curve, bothUnlocked }, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 20, 0.06, 4, false]} />
          <meshBasicMaterial
            color={bothUnlocked ? "#6688ff" : "#334466"}
            transparent
            opacity={bothUnlocked ? 0.35 : 0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZONE COMPONENTS (Planets / Space Objects)
// ═══════════════════════════════════════════════════════════════

// ─── 1. Planet Hub — Sun (center) ───────────────────────────────
function SunZone() {
  const coronaRef = useRef<THREE.Group>(null!);
  const orbitRef1 = useRef<THREE.Mesh>(null!);
  const orbitRef2 = useRef<THREE.Mesh>(null!);
  const orbitRef3 = useRef<THREE.Mesh>(null!);

  const coronaParticles = useMemo(() => {
    const arr: { pos: [number, number, number]; speed: number; radius: number }[] = [];
    const count = IS_MOBILE ? 15 : 30;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 3.5 + Math.random() * 1.5;
      arr.push({
        pos: [Math.cos(angle) * r, (Math.random() - 0.5) * 1.5, Math.sin(angle) * r],
        speed: 0.3 + Math.random() * 0.5,
        radius: r,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coronaRef.current) {
      coronaRef.current.children.forEach((child, i) => {
        const p = coronaParticles[i];
        const angle = t * p.speed + (i / coronaParticles.length) * Math.PI * 2;
        child.position.set(
          Math.cos(angle) * p.radius,
          Math.sin(t * 0.5 + i) * 0.8,
          Math.sin(angle) * p.radius
        );
      });
    }
    if (orbitRef1.current) orbitRef1.current.rotation.z = t * 0.1;
    if (orbitRef2.current) orbitRef2.current.rotation.z = t * -0.07;
    if (orbitRef3.current) orbitRef3.current.rotation.z = t * 0.05;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Sun sphere */}
      <mesh>
        <sphereGeometry args={[3, 24, 16]} />
        <meshStandardMaterial
          color="#ff8800"
          emissive="#ff8800"
          emissiveIntensity={1.5}
          roughness={0.3}
        />
      </mesh>
      {/* Sun light */}
      <pointLight color="#ffaa44" intensity={3} distance={80} />

      {/* Corona particles */}
      <group ref={coronaRef}>
        {coronaParticles.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08, 4, 4]} />
            <meshBasicMaterial color="#ffaa33" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      {/* Orbit rings */}
      <mesh ref={orbitRef1} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[12, 0.04, 8, 64]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.2} />
      </mesh>
      <mesh ref={orbitRef2} rotation={[Math.PI / 2.5, 0.3, 0]}>
        <torusGeometry args={[18, 0.03, 8, 64]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.15} />
      </mesh>
      <mesh ref={orbitRef3} rotation={[Math.PI / 2, -0.2, 0]}>
        <torusGeometry args={[25, 0.03, 8, 64]} />
        <meshBasicMaterial color="#ff8844" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// ─── 2. Rocket Pad — Asteroid with rocket ───────────────────────
function RocketPadZone() {
  const thrusterRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (thrusterRef.current) {
      thrusterRef.current.scale.y = 0.8 + Math.sin(clock.getElapsedTime() * 8) * 0.3;
    }
  });

  return (
    <group position={[18, 2, -14]}>
      {/* Asteroid base */}
      <mesh rotation={[0.3, 0.5, 0.1]}>
        <dodecahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color="#666666" roughness={0.95} />
      </mesh>
      {/* Rocky details */}
      <mesh position={[0.8, -0.5, 0.6]} rotation={[0.5, 0.2, 0.3]}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#555555" roughness={0.95} />
      </mesh>

      {/* Rocket body */}
      <group position={[0, 2.8, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 2, 8]} />
          <meshStandardMaterial color="#cccccc" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Nose cone */}
        <mesh position={[0, 1.4, 0]}>
          <coneGeometry args={[0.4, 0.8, 8]} />
          <meshStandardMaterial color="#ff3333" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* Fins */}
        <mesh position={[0.45, -0.8, 0]}>
          <boxGeometry args={[0.3, 0.6, 0.1]} />
          <meshStandardMaterial color="#ff3333" roughness={0.5} />
        </mesh>
        <mesh position={[-0.45, -0.8, 0]}>
          <boxGeometry args={[0.3, 0.6, 0.1]} />
          <meshStandardMaterial color="#ff3333" roughness={0.5} />
        </mesh>
        {/* Thruster glow */}
        <mesh ref={thrusterRef} position={[0, -1.2, 0]}>
          <sphereGeometry args={[0.3, 6, 4]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
        </mesh>
        <pointLight position={[0, -1.2, 0]} color="#ff6600" intensity={1} distance={5} />
      </group>
    </group>
  );
}

// ─── 3. Astronaut Base — Space station ──────────────────────────
function AstronautBaseZone() {
  const stationRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (stationRef.current) {
      stationRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group position={[-20, 0, -10]}>
      <group ref={stationRef}>
        {/* Central module */}
        <mesh>
          <cylinderGeometry args={[0.8, 0.8, 3, 8]} />
          <meshStandardMaterial color="#ddeeff" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Arms */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              {/* Arm */}
              <mesh position={[2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.2, 4, 0.2]} />
                <meshStandardMaterial color="#ccddee" metalness={0.6} roughness={0.3} />
              </mesh>
              {/* Solar panel */}
              <mesh position={[4.5, 0, 0]}>
                <boxGeometry args={[1.6, 0.06, 0.8]} />
                <meshStandardMaterial
                  color="#2244aa"
                  metalness={0.8}
                  roughness={0.2}
                  emissive="#112244"
                  emissiveIntensity={0.3}
                />
              </mesh>
            </group>
          );
        })}
      </group>
      <pointLight color="#aaccff" intensity={0.5} distance={10} />
    </group>
  );
}

// ─── 4. Alien World — Purple planet ─────────────────────────────
function AlienWorldZone() {
  const ringsRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.y = clock.getElapsedTime() * 0.15;
      ringsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  return (
    <group position={[24, -2, 8]}>
      {/* Planet */}
      <mesh>
        <sphereGeometry args={[2.5, 20, 14]} />
        <meshStandardMaterial
          color="#8844aa"
          emissive="#441166"
          emissiveIntensity={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Alien plants on surface */}
      {[
        { pos: [0, 2.4, 0.5] as [number, number, number], h: 0.8 },
        { pos: [1.5, 1.6, 1.2] as [number, number, number], h: 0.6 },
        { pos: [-1.0, 2.0, -1.0] as [number, number, number], h: 0.7 },
        { pos: [0.5, -2.2, 0.8] as [number, number, number], h: 0.5 },
      ].map((plant, i) => (
        <mesh key={i} position={plant.pos}>
          <coneGeometry args={[0.12, plant.h, 4]} />
          <meshStandardMaterial
            color="#33ff66"
            emissive="#22cc44"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Floating rings */}
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[3.5, 0.08, 6, 32]} />
          <meshBasicMaterial color="#aa66cc" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2.5, 0.5, 0]}>
          <torusGeometry args={[4, 0.06, 6, 32]} />
          <meshBasicMaterial color="#cc88ee" transparent opacity={0.25} />
        </mesh>
      </group>

      <pointLight color="#9955cc" intensity={0.5} distance={10} />
    </group>
  );
}

// ─── 5. Space Station — Orbital torus ───────────────────────────
function SpaceStationZone() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.12;
    }
  });

  return (
    <group position={[-14, 3, 12]}>
      <group ref={ref}>
        {/* Main torus */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.4, 8, 24]} />
          <meshStandardMaterial color="#dddddd" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Central hub */}
        <mesh>
          <sphereGeometry args={[0.6, 8, 6]} />
          <meshStandardMaterial color="#cccccc" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Spokes connecting hub to torus */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 1.1, 0, Math.sin(angle) * 1.1]}
              rotation={[0, -angle, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.06, 0.06, 2.2, 4]} />
              <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.4} />
            </mesh>
          );
        })}
        {/* Docking ports */}
        {[0, Math.PI].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 2.6, 0, Math.sin(angle) * 2.6]}
          >
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <pointLight color="#ffffff" intensity={0.3} distance={8} />
    </group>
  );
}

// ─── 6. Moon Base — Moon with dome ──────────────────────────────
function MoonBaseZone() {
  return (
    <group position={[8, -1, 20]}>
      {/* Moon sphere */}
      <mesh>
        <sphereGeometry args={[2, 16, 12]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.9} />
      </mesh>
      {/* Craters (dark spots) */}
      {[
        [0.8, 1.6, 0.5, 0.4],
        [-1.0, 1.0, 1.2, 0.35],
        [0.3, -1.5, 1.0, 0.3],
        [-0.6, 0.5, -1.6, 0.25],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r as number, 6, 4]} />
          <meshStandardMaterial color="#777777" roughness={1} />
        </mesh>
      ))}

      {/* Dome base */}
      <group position={[0, 2.0, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#eeeeff"
            transparent
            opacity={0.7}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
        {/* Dome ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.04, 6, 16]} />
          <meshStandardMaterial color="#ccccdd" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>

      {/* Flag */}
      <group position={[1.2, 2.1, -0.5]}>
        {/* Pole */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 4]} />
          <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Flag cloth */}
        <mesh position={[0.15, 0.6, 0]}>
          <planeGeometry args={[0.3, 0.2]} />
          <meshBasicMaterial color="#3355ff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      <pointLight color="#ddddff" intensity={0.3} distance={8} />
    </group>
  );
}

// ─── 7. Star Observatory — Dome with telescope ─────────────────
function StarObservatoryZone() {
  return (
    <group position={[-22, 4, -18]}>
      {/* Platform asteroid */}
      <mesh position={[0, -1, 0]} rotation={[0.1, 0.3, 0]}>
        <dodecahedronGeometry args={[2, 1]} />
        <meshStandardMaterial color="#555566" roughness={0.9} />
      </mesh>

      {/* Observatory base cylinder */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 1, 12]} />
        <meshStandardMaterial color="#eeeef5" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Dome */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ddddee" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Telescope */}
      <mesh position={[0.2, 2.0, 0]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.08, 0.12, 2, 6]} />
        <meshStandardMaterial color="#888899" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Telescope lens */}
      <mesh position={[0.5, 2.8, -0.3]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial
          color="#4488ff"
          emissive="#2244aa"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Nearby bright stars */}
      {[
        [-3, 5, -2],
        [4, 6, 1],
        [-1, 7, 3],
        [2, 4, -4],
        [-4, 3, 2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.12, 4, 4]} />
          <meshBasicMaterial color="#ffffcc" />
        </mesh>
      ))}

      <pointLight color="#aabbff" intensity={0.5} distance={12} />
    </group>
  );
}

// ─── 8. Galaxy Hub — Spiral portal ──────────────────────────────
function GalaxyHubZone() {
  const discRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (discRef.current) {
      discRef.current.rotation.y = t * 0.2;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.1);
    }
  });

  return (
    <group position={[0, 5, -26]}>
      {/* Galaxy disc */}
      <mesh ref={discRef} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[3, 3, 0.15, 32]} />
        <meshStandardMaterial
          color="#6644cc"
          emissive="#4422aa"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Inner bright core */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 12, 8]} />
        <meshStandardMaterial
          color="#8866ff"
          emissive="#6644dd"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Spiral arms (simplified as torus arcs) */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          rotation={[Math.PI / 4, (i / 3) * Math.PI * 2, 0]}
        >
          <torusGeometry args={[2 + i * 0.4, 0.08, 4, 16, Math.PI * 0.8]} />
          <meshBasicMaterial
            color="#8866ff"
            transparent
            opacity={0.4 - i * 0.1}
          />
        </mesh>
      ))}

      {/* Portal glow ring */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[3.2, 0.12, 8, 32]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0.3}
        />
      </mesh>

      <pointLight color="#7755dd" intensity={1} distance={15} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CITY MARKER (label + emoji button)
// ═══════════════════════════════════════════════════════════════

function SpaceCityMarker({
  city,
  lang,
  unlocked,
  completedLevels,
  isNext,
  onSelect,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  completedLevels: number;
  isNext: boolean;
  onSelect: (city: City) => void;
}) {
  const [x, y, z] = cityTo3D(city);
  const size = isNext ? 120 : unlocked ? 104 : 80;

  return (
    <group position={[x, y + 3, z]}>
      {/* Glow ring under marker */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
          <ringGeometry args={[2.5, 4, 24]} />
          <meshBasicMaterial
            color={isNext ? "#7788ff" : "#4455aa"}
            transparent
            opacity={isNext ? 0.5 : 0.2}
          />
        </mesh>
      )}

      <Html center distanceFactor={50} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center transition-all duration-200 active:scale-90"
          style={{ transform: "translateY(-24px)" }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: unlocked
                ? "radial-gradient(circle at 35% 35%, #c8d0ff, #4455aa)"
                : "radial-gradient(circle at 35% 35%, #3a3a4e, #1a1a2e)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#6677dd" : "#334455"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.6), 0 0 ${isNext ? 24 : 10}px #6677dd${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.5)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 48 : 40 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 30, opacity: 0.4 }}>🔒</span>
            )}
          </div>

          {/* Building name */}
          <div
            className="mt-1.5 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(10,10,40,0.92)" : "rgba(15,15,30,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#556677",
                whiteSpace: "nowrap",
                letterSpacing: 0.5,
              }}
            >
              {city.building[lang]}
            </p>
          </div>

          {/* Stars */}
          {unlocked && (
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ fontSize: 13, opacity: i < completedLevels ? 1 : 0.2 }}
                >
                  ⭐
                </span>
              ))}
            </div>
          )}
        </button>
      </Html>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAMERA CONTROLS
// ═══════════════════════════════════════════════════════════════

function SpaceCameraControls() {
  return (
    <OrbitControls
      enablePan
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minDistance={18}
      maxDistance={70}
      maxPolarAngle={Math.PI / 1.8}
      minPolarAngle={0.3}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_ROTATE,
      }}
    />
  );
}

// ─── Scene ready detector ───────────────────────────────────────
function SceneReady({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    }
  });
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export function SpaceMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const unlockedTopicIds = useProgressStore((s) => s.unlockedTopics);
  const getTopicCompletedLevels = useProgressStore((s) => s.getTopicCompletedLevels);

  const unlockedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of SPACE_CITIES) {
      if (unlockedTopicIds.includes(c.topicId)) ids.add(c.id);
    }
    return ids;
  }, [unlockedTopicIds]);

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...SPACE_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = SPACE_CITIES.find((c) => !unlockedIds.has(c.id));
    return lastUnlocked?.id || firstLocked?.id;
  }, [unlockedIds, getTopicCompletedLevels]);

  useEffect(() => {
    if (sceneReady) {
      const t1 = setTimeout(() => setOverlayVisible(false), 100);
      const t2 = setTimeout(() => setOverlayHidden(true), 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [sceneReady]);

  return (
    <div
      className="w-full h-full relative z-0"
      style={{ touchAction: "none", background: "#000008" }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 40, 50], fov: 50 }}
        style={{ touchAction: "none" }}
        gl={
          IS_MOBILE
            ? { antialias: false, powerPreference: "high-performance" }
            : undefined
        }
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />

        {/* Deep space background */}
        <color attach="background" args={["#000008"]} />

        {/* Lighting — dim ambient + sun as main light */}
        <ambientLight intensity={0.15} />

        <Suspense fallback={null}>
          {/* Starfield */}
          <Starfield count={IS_MOBILE ? 100 : 200} />
          <Nebula />

          {/* Routes between planets */}
          <SpaceRoutes unlockedIds={unlockedIds} />

          {/* Zone structures */}
          <SunZone />
          <RocketPadZone />
          <AstronautBaseZone />
          <AlienWorldZone />
          <SpaceStationZone />
          <MoonBaseZone />
          <StarObservatoryZone />
          <GalaxyHubZone />

          {/* Ambient space objects */}
          <DriftingAsteroids />
          {!IS_MOBILE && <Comet />}

          {/* City markers */}
          {SPACE_CITIES.map((city) => (
            <SpaceCityMarker
              key={city.id}
              city={city}
              lang={lang}
              unlocked={unlockedIds.has(city.id)}
              completedLevels={getTopicCompletedLevels(city.topicId)}
              isNext={city.id === nextCityId}
              onSelect={onSelectCity}
            />
          ))}

          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        <SpaceCameraControls />
      </Canvas>

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#000020] via-[#0a0a3a] to-[#000020] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🚀
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Launching into space...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div
                className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
