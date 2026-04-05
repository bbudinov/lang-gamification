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

// ─── Time world cities ──────────────────────────────────────────
const TIME_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "time")?.topicIds ?? []
);
const TIME_CITIES = CITIES.filter((c) => TIME_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions ──────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-village": [-20, 0, -16],
  "medieval-castle": [20, 0, -16],
  "present-city": [-16, 0, 6],
  "future-lab": [16, 0, 6],
  "dino-era": [-24, -2, -4],
  "industrial-age": [24, 0, 0],
  "time-station": [0, 4, -22],
  "time-museum": [0, 0, 22],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs for bronze connections ─────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["time-station", "ancient-village"],
  ["time-station", "medieval-castle"],
  ["ancient-village", "dino-era"],
  ["ancient-village", "present-city"],
  ["medieval-castle", "industrial-age"],
  ["medieval-castle", "future-lab"],
  ["present-city", "time-museum"],
  ["future-lab", "time-museum"],
  ["dino-era", "present-city"],
  ["industrial-age", "future-lab"],
];

// ─── Ground plane ───────────────────────────────────────────────
function TimeGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#1a1208" roughness={1} />
    </mesh>
  );
}

// ─── Giant Hourglass (centerpiece) ──────────────────────────────
function GiantHourglass() {
  const groupRef = useRef<THREE.Group>(null);
  const sandRefs = useRef<THREE.Mesh[]>([]);

  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
    // Golden glow pulse
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime) * 1.2;
    }
    // Animate sand particles falling
    sandRefs.current.forEach((mesh) => {
      if (mesh) {
        mesh.position.y -= delta * 2.5;
        if (mesh.position.y < -4) {
          mesh.position.y = 4;
          mesh.position.x = (Math.random() - 0.5) * 0.6;
          mesh.position.z = (Math.random() - 0.5) * 0.6;
        }
      }
    });
  });

  const sandParticles = useMemo(() => {
    const count = IS_MOBILE ? 8 : 14;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      y: (Math.random() * 8) - 4,
      x: (Math.random() - 0.5) * 0.6,
      z: (Math.random() - 0.5) * 0.6,
    }));
  }, []);

  return (
    <group ref={groupRef} position={[0, 6, 0]}>
      {/* Top cone (inverted) */}
      <mesh position={[0, 4, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[3, 5, 16]} />
        <meshPhysicalMaterial
          color="#d4a544"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.2}
          transmission={0.5}
        />
      </mesh>
      {/* Bottom cone */}
      <mesh position={[0, -4, 0]}>
        <coneGeometry args={[3, 5, 16]} />
        <meshPhysicalMaterial
          color="#d4a544"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.2}
          transmission={0.5}
        />
      </mesh>
      {/* Narrow neck cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 2, 12]} />
        <meshPhysicalMaterial
          color="#c9993a"
          transparent
          opacity={0.4}
          roughness={0.1}
        />
      </mesh>
      {/* Golden frame rings */}
      <mesh position={[0, 6.6, 0]}>
        <torusGeometry args={[3.1, 0.15, 8, 24]} />
        <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -6.6, 0]}>
        <torusGeometry args={[3.1, 0.15, 8, 24]} />
        <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Center glow — pulsing */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color="#ffd700" intensity={3} distance={20} />
      {/* Sand particles falling */}
      {sandParticles.map((p) => (
        <mesh
          key={p.key}
          position={[p.x, p.y, p.z]}
          ref={(el) => { if (el) sandRefs.current[p.key] = el; }}
        >
          <sphereGeometry args={[0.08, 4, 4]} />
          <meshStandardMaterial color="#d4a544" emissive="#c9993a" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Sand pile at bottom */}
      <mesh position={[0, -5.5, 0]}>
        <coneGeometry args={[1.2, 0.8, 8]} />
        <meshStandardMaterial color="#d4a544" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Ancient Village zone ───────────────────────────────────────
function AncientVillageZone() {
  const dustRef = useRef<THREE.Points>(null);
  const dustCount = 6;
  const dustPositions = useMemo(() => {
    const arr = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = 0.5 + Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!dustRef.current) return;
    const pos = dustRef.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < dustCount; i++) {
      arr[i * 3] += Math.sin(t * 0.3 + i) * 0.003;
      arr[i * 3 + 1] += 0.002;
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = 0.5;
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={[-20, 0, -16]}>
      {/* Sandy platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#c2a66b" roughness={0.9} />
      </mesh>
      {/* Broken stone columns */}
      <mesh position={[-2, 1.5, -1]}>
        <cylinderGeometry args={[0.3, 0.35, 3, 8]} />
        <meshStandardMaterial color="#8a8070" roughness={0.95} />
      </mesh>
      <mesh position={[1.5, 1, 1]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.25, 0.3, 2, 8]} />
        <meshStandardMaterial color="#9a9080" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.6, 2]} rotation={[0.1, 0, -0.1]}>
        <cylinderGeometry args={[0.28, 0.32, 1.2, 8]} />
        <meshStandardMaterial color="#8a7a68" roughness={0.95} />
      </mesh>
      {/* Small pyramid */}
      <mesh position={[2.5, 1.2, -1.5]}>
        <coneGeometry args={[1.5, 2.4, 4]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.85} />
      </mesh>
      {/* Stone block */}
      <mesh position={[-1, 0.3, 1.5]}>
        <boxGeometry args={[1, 0.6, 0.8]} />
        <meshStandardMaterial color="#7a7060" roughness={0.95} />
      </mesh>
      {/* Dust particles */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} count={dustCount} />
        </bufferGeometry>
        <pointsMaterial color="#c9a84c" size={0.1} transparent opacity={0.5} sizeAttenuation />
      </points>
      <pointLight position={[0, 3, 0]} color="#e8c870" intensity={1} distance={12} />
    </group>
  );
}

// ─── Medieval Castle zone ───────────────────────────────────────
function MedievalCastleZone() {
  const gear1Ref = useRef<THREE.Mesh>(null);
  const gear2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (gear1Ref.current) gear1Ref.current.rotation.z += delta * 0.3;
    if (gear2Ref.current) gear2Ref.current.rotation.z -= delta * 0.2;
  });

  return (
    <group position={[20, 0, -16]}>
      {/* Bronze/wood platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#8b6914" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Clock tower */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[1.5, 5, 1.5]} />
        <meshStandardMaterial color="#6a5030" roughness={0.85} />
      </mesh>
      {/* Tower roof */}
      <mesh position={[0, 5.5, 0]}>
        <coneGeometry args={[1.2, 1.8, 4]} />
        <meshStandardMaterial color="#4a3020" roughness={0.8} />
      </mesh>
      {/* Gear on tower front */}
      <mesh ref={gear1Ref} position={[0, 3, 0.8]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.6, 0.08, 6, 12]} />
        <meshStandardMaterial color="#b8860b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Large standalone gear */}
      <mesh ref={gear2Ref} position={[-2.5, 1.5, 1]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[1, 0.1, 6, 10]} />
        <meshStandardMaterial color="#cd853f" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bell on top */}
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[0.25, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#daa520" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Castle wall segment */}
      <mesh position={[2.5, 0.8, -1]}>
        <boxGeometry args={[2, 1.6, 0.4]} />
        <meshStandardMaterial color="#7a6a50" roughness={0.9} />
      </mesh>
      {/* Battlements */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={i} position={[2.5 + x, 1.8, -1]}>
          <boxGeometry args={[0.3, 0.4, 0.45]} />
          <meshStandardMaterial color="#7a6a50" roughness={0.9} />
        </mesh>
      ))}
      <pointLight position={[0, 4, 0]} color="#daa520" intensity={1.2} distance={12} />
    </group>
  );
}

// ─── Present City zone ──────────────────────────────────────────
function PresentCityZone() {
  return (
    <group position={[-16, 0, 6]}>
      {/* Gray platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#5a5a5e" roughness={0.7} />
      </mesh>
      {/* Modern buildings */}
      <mesh position={[-1.5, 2, -1]}>
        <boxGeometry args={[1.2, 4, 1.2]} />
        <meshStandardMaterial color="#607080" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[1, 1.5, 0.5]}>
        <boxGeometry args={[1, 3, 1]} />
        <meshStandardMaterial color="#506878" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[2.5, 1, -0.5]}>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshStandardMaterial color="#6090b0" transparent opacity={0.7} roughness={0.2} metalness={0.4} />
      </mesh>
      {/* Digital clock (emissive box) */}
      <mesh position={[-1.5, 4.2, -1]}>
        <boxGeometry args={[0.8, 0.4, 0.3]} />
        <meshStandardMaterial color="#001a2e" roughness={0.3} />
      </mesh>
      {/* Cyan display rectangles */}
      <mesh position={[-1.7, 4.2, -0.82]}>
        <boxGeometry args={[0.15, 0.2, 0.02]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-1.4, 4.2, -0.82]}>
        <boxGeometry args={[0.15, 0.2, 0.02]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      {/* Street lamp */}
      <mesh position={[3, 1.5, 2]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
      </mesh>
      <mesh position={[3, 3.1, 2]}>
        <sphereGeometry args={[0.15, 6, 4]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, 3, 0]} color="#ccddee" intensity={0.8} distance={12} />
    </group>
  );
}

// ─── Future Lab zone ────────────────────────────────────────────
function FutureLabZone() {
  const panelRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    panelRefs.current.forEach((mesh, i) => {
      if (mesh) {
        mesh.position.y = 2.5 + Math.sin(t * 0.8 + i * 1.5) * 0.3;
      }
    });
  });

  return (
    <group position={[16, 0, 6]}>
      {/* Dark platform with cyan edge */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 5.6, 24]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} transparent opacity={0.6} />
      </mesh>
      {/* Hologram panels */}
      {[
        [-1.5, 0, -1, 0.3],
        [1, 0, 0.5, -0.2],
        [0, 0, 2, 0.1],
      ].map(([x, _y, z, ry], i) => (
        <mesh
          key={i}
          position={[x as number, 2.5, z as number]}
          rotation={[0, ry as number, 0]}
          ref={(el) => { if (el) panelRefs.current[i] = el; }}
        >
          <planeGeometry args={[1.2, 1.6]} />
          <meshStandardMaterial
            color="#7b61ff"
            emissive="#7b61ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Neon timeline */}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[8, 0.04, 0.04]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      {/* Timeline dots */}
      {[-3, -1.5, 0, 1.5, 3].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 0]}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshStandardMaterial color="#7b61ff" emissive="#7b61ff" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <pointLight position={[0, 3, 0]} color="#7b61ff" intensity={1.5} distance={12} />
    </group>
  );
}

// ─── Dino Era zone ──────────────────────────────────────────────
function DinoEraZone() {
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });

  return (
    <group position={[-24, -2, -4]}>
      {/* Green/brown platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#4a5a2e" roughness={0.9} />
      </mesh>
      {/* Simple dinosaur — body */}
      <group position={[-1, 0.8, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2.2, 1.2, 1]} />
          <meshStandardMaterial color="#5a6a3a" roughness={0.85} />
        </mesh>
        {/* Head */}
        <mesh position={[1.4, 0.9, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.4, 1, 6]} />
          <meshStandardMaterial color="#5a6a3a" roughness={0.85} />
        </mesh>
        {/* Tail — swaying */}
        <mesh ref={tailRef} position={[-1.5, 0.5, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.3, 1.5, 6]} />
          <meshStandardMaterial color="#4a5a2a" roughness={0.85} />
        </mesh>
        {/* Legs */}
        {[[-0.5, -0.1, 0.4], [-0.5, -0.1, -0.4], [0.5, -0.1, 0.4], [0.5, -0.1, -0.4]].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]}>
            <cylinderGeometry args={[0.12, 0.15, 0.6, 5]} />
            <meshStandardMaterial color="#4a5a2a" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* Volcano */}
      <mesh position={[2.5, 1.5, -2]}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      {/* Orange tip (lava) */}
      <mesh position={[2.5, 3.2, -2]}>
        <coneGeometry args={[0.4, 0.5, 8]} />
        <meshStandardMaterial color="#ff6a00" emissive="#ff4400" emissiveIntensity={1} />
      </mesh>
      {/* Fern plants */}
      {[[3, 0.5, 1.5], [-3, 0.5, 2], [1, 0.5, 3]].map(([fx, fy, fz], i) => (
        <mesh key={i} position={[fx, fy, fz]}>
          <coneGeometry args={[0.4, 1.2, 5]} />
          <meshStandardMaterial color="#2e6e1e" roughness={0.8} />
        </mesh>
      ))}
      <pointLight position={[2.5, 4, -2]} color="#ff6a00" intensity={1} distance={10} />
      <pointLight position={[0, 2, 0]} color="#7a9a4a" intensity={0.6} distance={10} />
    </group>
  );
}

// ─── Industrial Age zone ────────────────────────────────────────
function IndustrialAgeZone() {
  const gearRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (gearRef.current) gearRef.current.rotation.z += delta * 0.25;
  });

  return (
    <group position={[24, 0, 0]}>
      {/* Iron/dark platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Smokestack */}
      <mesh position={[-1.5, 2.5, -1]}>
        <cylinderGeometry args={[0.4, 0.5, 5, 8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Smokestack top rim */}
      <mesh position={[-1.5, 5.1, -1]}>
        <torusGeometry args={[0.45, 0.08, 6, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Large gear */}
      <mesh ref={gearRef} position={[2, 1.5, 0]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[1.2, 0.12, 6, 10]} />
        <meshStandardMaterial color="#8a7a60" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Small train — body */}
      <mesh position={[0.5, 0.5, 2]}>
        <boxGeometry args={[1.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.7} metalness={0.5} />
      </mesh>
      {/* Train chimney */}
      <mesh position={[1.1, 1.2, 2]}>
        <cylinderGeometry args={[0.12, 0.15, 0.8, 6]} />
        <meshStandardMaterial color="#3a3a3e" roughness={0.7} />
      </mesh>
      {/* Train boiler */}
      <mesh position={[0.8, 0.5, 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 1, 8]} />
        <meshStandardMaterial color="#4a4a50" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Smoke particles (desktop only via conditional render in parent) */}
      {!IS_MOBILE && <SmokeParticles position={[-1.5, 5.5, -1]} />}
      <pointLight position={[0, 3, 0]} color="#e8a050" intensity={0.8} distance={12} />
    </group>
  );
}

// ─── Smoke particles ────────────────────────────────────────────
function SmokeParticles({ position }: { position: [number, number, number] }) {
  const refs = useRef<THREE.Mesh[]>([]);

  const particles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      key: i,
      y: Math.random() * 3,
      x: (Math.random() - 0.5) * 0.5,
      z: (Math.random() - 0.5) * 0.5,
      speed: 0.3 + Math.random() * 0.4,
      size: 0.15 + Math.random() * 0.15,
    })),
  []);

  useFrame((_, delta) => {
    refs.current.forEach((mesh, i) => {
      if (mesh) {
        mesh.position.y += particles[i].speed * delta * 3;
        mesh.position.x += (Math.random() - 0.5) * delta * 0.3;
        if (mesh.position.y > 4) {
          mesh.position.y = 0;
          mesh.position.x = (Math.random() - 0.5) * 0.5;
        }
        // Fade out as rising
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 1 - mesh.position.y / 4) * 0.4;
      }
    });
  });

  return (
    <group position={position}>
      {particles.map((p) => (
        <mesh
          key={p.key}
          position={[p.x, p.y, p.z]}
          ref={(el) => { if (el) refs.current[p.key] = el; }}
        >
          <sphereGeometry args={[p.size, 5, 4]} />
          <meshStandardMaterial color="#888888" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Time Station zone (elevated) ──────────────────────────────
function TimeStationZone() {
  const minuteRef = useRef<THREE.Mesh>(null);
  const hourRef = useRef<THREE.Mesh>(null);
  const pendulumRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (minuteRef.current) minuteRef.current.rotation.z = -t * 0.5;
    if (hourRef.current) hourRef.current.rotation.z = -t * 0.04;
    if (!IS_MOBILE && pendulumRef.current) {
      pendulumRef.current.rotation.z = Math.sin(t * 2) * 0.4;
    }
  });

  return (
    <group position={[0, 4, -22]}>
      {/* Golden platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#b8860b" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Platform pillar */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[1.5, 2, 5, 8]} />
        <meshStandardMaterial color="#8a6a0a" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Clock face (flat circle) */}
      <mesh position={[0, 3, 0]} rotation={[-0.3, 0, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#f5e6c8" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Clock rim */}
      <mesh position={[0, 3, -0.05]} rotation={[-0.3, 0, 0]}>
        <torusGeometry args={[2, 0.12, 8, 32]} />
        <meshStandardMaterial color="#b8860b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Clock hour markers (12 dots) */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.6, 3 + Math.sin(a) * 1.6 * Math.cos(0.3), Math.sin(a) * 1.6 * Math.sin(-0.3)]}>
            <sphereGeometry args={[0.08, 4, 4]} />
            <meshStandardMaterial color="#4a3a0a" roughness={0.5} />
          </mesh>
        );
      })}
      {/* Minute hand */}
      <mesh ref={minuteRef} position={[0, 3.02, 0.05]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.06, 1.4, 0.02]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>
      {/* Hour hand */}
      <mesh ref={hourRef} position={[0, 3.02, 0.08]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.9, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* Pendulum (desktop only) */}
      {!IS_MOBILE && (
        <group ref={pendulumRef} position={[0, 0.5, 0.5]}>
          <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 2, 4]} />
            <meshStandardMaterial color="#b8860b" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -2.1, 0]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color="#daa520" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
      <pointLight position={[0, 4, 1]} color="#ffd700" intensity={1.5} distance={15} />
    </group>
  );
}

// ─── Time Museum zone ───────────────────────────────────────────
function TimeMuseumZone() {
  return (
    <group position={[0, 0, 22]}>
      {/* Marble-white platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.5, 6, 1, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.4} />
      </mesh>
      {/* Display cases */}
      {[[-2, 0], [0, -1.5], [2, 0.5]].map(([dx, dz], i) => (
        <group key={i} position={[dx, 0.6, dz]}>
          {/* Glass case */}
          <mesh>
            <boxGeometry args={[0.8, 1.2, 0.8]} />
            <meshPhysicalMaterial
              color="#a8d4f0"
              transparent
              opacity={0.2}
              roughness={0.05}
              metalness={0.1}
            />
          </mesh>
          {/* Artifact inside */}
          <mesh position={[0, -0.1, 0]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial
              color={["#daa520", "#cd853f", "#b8860b"][i]}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Case base */}
          <mesh position={[0, -0.65, 0]}>
            <boxGeometry args={[0.9, 0.1, 0.9]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Floating timeline */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[8, 0.03, 0.03]} />
        <meshStandardMaterial color="#daa520" emissive="#daa520" emissiveIntensity={1} />
      </mesh>
      {/* Timeline era dots */}
      {[-3, -1.5, 0, 1.5, 3].map((x, i) => (
        <mesh key={i} position={[x, 2, 0]}>
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Pillars */}
      {[[-3.5, 1.5, -2], [3.5, 1.5, -2], [-3.5, 1.5, 2], [3.5, 1.5, 2]].map(([px, py, pz], i) => (
        <mesh key={i} position={[px, py, pz]}>
          <cylinderGeometry args={[0.15, 0.2, 3, 8]} />
          <meshStandardMaterial color="#d0c8b8" roughness={0.5} />
        </mesh>
      ))}
      <pointLight position={[0, 3, 0]} color="#f5e6c8" intensity={0.8} distance={12} />
    </group>
  );
}

// ─── Floating decorative gears ──────────────────────────────────
function FloatingGears() {
  const refsDesktop = useRef<THREE.Mesh[]>([]);

  const gears = useMemo(() => {
    const full = [
      { pos: [-10, 8, -10] as [number, number, number], size: 1.5, speed: 0.15 },
      { pos: [12, 10, -8] as [number, number, number], size: 1.2, speed: -0.2 },
      { pos: [-8, 6, 12] as [number, number, number], size: 1.0, speed: 0.25 },
      { pos: [10, 7, 14] as [number, number, number], size: 1.3, speed: -0.12 },
      { pos: [0, 12, 0] as [number, number, number], size: 0.8, speed: 0.3 },
      { pos: [-18, 5, 8] as [number, number, number], size: 1.1, speed: -0.18 },
      { pos: [18, 9, -12] as [number, number, number], size: 0.9, speed: 0.22 },
      { pos: [-5, 14, -18] as [number, number, number], size: 1.4, speed: -0.1 },
    ];
    return IS_MOBILE ? full.slice(0, 3) : full;
  }, []);

  useFrame((_, delta) => {
    refsDesktop.current.forEach((mesh, i) => {
      if (mesh && gears[i]) {
        mesh.rotation.z += gears[i].speed * delta;
      }
    });
  });

  return (
    <>
      {gears.map((g, i) => (
        <mesh
          key={i}
          position={g.pos}
          rotation={[Math.random() * 0.5, Math.random() * 0.5, 0]}
          ref={(el) => { if (el) refsDesktop.current[i] = el; }}
        >
          <torusGeometry args={[g.size, 0.06, 6, 12]} />
          <meshStandardMaterial
            color="#b8860b"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Bronze routes between zones ────────────────────────────────
function TimeRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material && "opacity" in mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = mat.userData?.baseOpacity ?? mat.opacity;
        if (!mat.userData) mat.userData = {};
        mat.userData.baseOpacity = base;
        mat.opacity = base * (0.7 + Math.sin(t * 2) * 0.3);
      }
    });
  });

  const routes = useMemo(() => {
    return ROUTE_PAIRS.map(([fromId, toId]) => {
      const fromCity = TIME_CITIES.find((c) => c.id === fromId);
      const toCity = TIME_CITIES.find((c) => c.id === toId);
      if (!fromCity || !toCity) return null;
      const from = cityTo3D(fromCity);
      const to = cityTo3D(toCity);
      const unlocked = unlockedIds.has(fromId) && unlockedIds.has(toId);
      return { from, to, unlocked, key: `${fromId}-${toId}` };
    }).filter(Boolean) as { from: [number, number, number]; to: [number, number, number]; unlocked: boolean; key: string }[];
  }, [unlockedIds]);

  return (
    <group ref={groupRef}>
      {routes.map(({ from, to, unlocked, key }) => {
        const midX = (from[0] + to[0]) / 2;
        const midY = Math.max(from[1], to[1]) + 2;
        const midZ = (from[2] + to[2]) / 2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(...from),
          new THREE.Vector3(midX, midY, midZ),
          new THREE.Vector3(...to),
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.12, 6, false);
        return (
          <mesh key={key} geometry={tubeGeo}>
            <meshStandardMaterial
              color={unlocked ? "#b8860b" : "#4a3a20"}
              metalness={unlocked ? 0.6 : 0.2}
              roughness={0.4}
              transparent
              opacity={unlocked ? 0.7 : 0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Golden sand particles (ambient) ────────────────────────────
function GoldenParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = IS_MOBILE ? 25 : 50;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 20 + 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] -= delta * 0.3;
        arr[i * 3] += Math.sin(Date.now() * 0.001 + i) * delta * 0.2;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 18 + Math.random() * 5;
        }
      }
      pos.needsUpdate = true;
    }
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
      <pointsMaterial color="#ffd700" size={0.15} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ─── City marker (label + ring) ─────────────────────────────────
function TimeCityMarker({
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
    <group position={[x, y + 1.2, z]}>
      {/* Glow ring */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[3.8, 5.5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#ffd700" : "#b8860b"}
            transparent
            opacity={isNext ? 0.55 : 0.25}
          />
        </mesh>
      )}
      {isNext && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
          <ringGeometry args={[5.5, 6.5, 32]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.15} />
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
                ? "radial-gradient(circle at 35% 35%, #fff3d6, #daa520)"
                : "radial-gradient(circle at 35% 35%, #4a4a3a, #2a2a20)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#b8860b" : "#445544"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.5), 0 0 ${isNext ? 24 : 10}px #daa520${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 48 : 40 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 30, opacity: 0.4 }}>🔒</span>
            )}
          </div>

          {/* Stars */}
          {unlocked && completedLevels > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {[1, 2, 3].map((lvl) => (
                <span
                  key={lvl}
                  style={{
                    fontSize: 16,
                    filter: lvl <= completedLevels ? "none" : "grayscale(1) opacity(0.3)",
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>
          )}

          {/* City name */}
          <div
            className="mt-1 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(30,20,5,0.92)" : "rgba(20,20,15,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#667755",
                whiteSpace: "nowrap",
                textShadow: unlocked ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
              }}
            >
              {city.name[lang] || city.name.en}
            </p>
          </div>
        </button>
      </Html>
    </group>
  );
}

// ─── Camera controls ────────────────────────────────────────────
function TimeCameraControls() {
  const controlsRef = useRef<ReturnType<typeof OrbitControls> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;

  useFrame(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = controlsRef.current as any;
    if (!c) return;
    const t = c.target;
    const f = 0;
    const maxX = THREE.MathUtils.lerp(50, 10, f);
    const maxZ = THREE.MathUtils.lerp(50, 10, f);
    t.x = THREE.MathUtils.clamp(t.x, -maxX, maxX);
    t.z = THREE.MathUtils.clamp(t.z, -maxZ, maxZ);
    t.y = 0;
  });

  return (
    <OrbitControls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={controlsRef as any}
      enableRotate
      enablePan
      enableZoom
      zoomToCursor={!isTouchDevice}
      screenSpacePanning
      enableDamping
      dampingFactor={0.08}
      minDistance={25}
      maxDistance={90}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 3.2}
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

// ─── Main component ─────────────────────────────────────────────
export function TimeMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(TIME_CITIES.map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...TIME_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = TIME_CITIES.find((c) => !unlockedIds.has(c.id));
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
      style={{
        touchAction: "none",
        background: "linear-gradient(180deg, #0a0a2e 0%, #1a1208 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: IS_MOBILE ? [0, 78, 72] : [0, 55, 50], fov: IS_MOBILE ? 55 : 45 }}
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

        {/* Background gradient — dark amber to navy */}
        <color attach="background" args={["#1a1208"]} />
        <fog attach="fog" args={["#2a1a08", 80, 250]} />

        {/* Lighting — warm golden */}
        <hemisphereLight intensity={0.7} color="#fff3d6" groundColor="#2a1a08" />
        <directionalLight position={[20, 30, 10]} intensity={1.2} color="#ffd700" />
        <ambientLight intensity={0.25} color="#c9993a" />

        <Suspense fallback={null}>
          <TimeGround />

          {/* Centerpiece — Giant Hourglass */}
          <GiantHourglass />

          {/* Zone builds */}
          <AncientVillageZone />
          <MedievalCastleZone />
          <PresentCityZone />
          <FutureLabZone />
          <DinoEraZone />
          <IndustrialAgeZone />
          <TimeStationZone />
          <TimeMuseumZone />

          {/* Routes */}
          <TimeRoutes unlockedIds={unlockedIds} />

          {/* Floating gears */}
          <FloatingGears />

          {/* Golden particles */}
          <GoldenParticles />

          {/* City markers */}
          {TIME_CITIES.map((city) => (
            <TimeCityMarker
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

        <TimeCameraControls />
      </Canvas>

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#2a1a08] to-[#1a1208] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                ⏳
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Traveling through time...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div
                className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
