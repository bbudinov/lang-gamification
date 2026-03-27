"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

const WORLD_ID = "history-bg";
const BG_TOP = "#0a0a1a";
const BG_BOTTOM = "#2a1a08";
const FOG_COLOR = "#2a1a08";

const historyWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const HISTORY_CITIES = CITIES.filter((c) =>
  historyWorld.topicIds.includes(c.topicId)
);

// ─── City positions on terrain (timeline left→right) ─────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-capital": [-18, 0.5, -2],
  "medieval-fortress": [-6, 2, -4],
  "rila-monastery": [-2, 0.5, 6],
  "revival-town": [10, 0.5, 4],
  "modern-sofia": [20, 0.5, 0],
};

const CITY_YEARS: Record<string, string> = {
  "ancient-capital": "681",
  "medieval-fortress": "1185",
  "rila-monastery": "10th c.",
  "revival-town": "1762",
  "modern-sofia": "1878",
};

// Chronological order for timeline path (interactive + decorative)
const TIMELINE_ORDER = [
  "ancient-capital",
  "medieval-fortress",
  "rila-monastery",
  "revival-town",
  "modern-sofia",
];

// All POI positions for full timeline path (interactive + decorative, chronological)
const ALL_POI_POSITIONS: [number, number, number][] = [
  [-24, 0.5, 0],     // Foundation marker (681)
  [-18, 0.5, -2],    // Pliska
  [-12, 0.5, -4],    // Preslav
  [-6, 2, -4],       // Tarnovo
  [-2, 0.5, 6],      // Rila
  [2, 0.3, -2],      // Ottoman
  [10, 0.5, 4],      // Revival
  [14, 0.5, -2],     // April Uprising
  [16, 1, -6],       // Shipka
  [18, 0.5, -4],     // Liberation
  [20, 0.5, 0],      // Sofia
];

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Background gradient ─────────────────────────────────────────
function BackgroundGradient() {
  return (
    <mesh position={[0, 0, -80]} renderOrder={-1}>
      <planeGeometry args={[200, 120]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          colorTop: { value: new THREE.Color(BG_TOP) },
          colorBottom: { value: new THREE.Color(BG_BOTTOM) },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 colorTop;
          uniform vec3 colorBottom;
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(mix(colorBottom, colorTop, vUv.y), 1.0);
          }
        `}
      />
    </mesh>
  );
}

// ─── Terrain ground ──────────────────────────────────────────────
function Terrain() {
  return (
    <group>
      {/* Main elevated terrain */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[60, 0.6, 35]} />
        <meshStandardMaterial color="#4a6a35" roughness={0.9} />
      </mesh>
      {/* Slight relief patches */}
      {[
        [-10, 0.05, 3, 8, 6],
        [8, 0.08, -3, 10, 7],
        [-5, 0.04, 8, 7, 5],
        [15, 0.06, -5, 6, 8],
      ].map(([x, y, z, w, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, 0.15, d]} />
          <meshStandardMaterial color="#3d5e2e" roughness={1} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Mountain ranges ─────────────────────────────────────────────
function Mountains() {
  const mountains: { pos: [number, number, number]; h: number; r: number; color: string }[] = [
    // Balkan range (Stara Planina) — across center, z=-4 to z=-8
    { pos: [-8, 0, -5], h: 5, r: 4, color: "#2e4a22" },
    { pos: [0, 0, -6], h: 6, r: 4.5, color: "#2a4620" },
    { pos: [8, 0, -7], h: 5.5, r: 4, color: "#2e4a22" },
    { pos: [16, 0, -8], h: 4.5, r: 3.5, color: "#2a4620" },
    // Rila / Pirin — larger cones south
    { pos: [-4, 0, 5], h: 7, r: 5, color: "#254018" },
    { pos: [2, 0, 7], h: 8, r: 5.5, color: "#1f3a14" },
    // Rhodope — southeast
    { pos: [6, 0, 10], h: 5, r: 4, color: "#254018" },
    { pos: [12, 0, 11], h: 4, r: 3.5, color: "#2a4620" },
    { pos: [18, 0, 9], h: 3.5, r: 3, color: "#254018" },
  ];

  return (
    <group>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.pos[0], m.h / 2 - 0.3, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Danube River ────────────────────────────────────────────────
function DanubeRiver() {
  return (
    <mesh position={[0, -0.1, -14]}>
      <boxGeometry args={[55, 0.12, 1.5]} />
      <meshStandardMaterial color="#2a6090" roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

// ─── Three Seas ──────────────────────────────────────────────────
function ThreeSeas() {
  const blackSeaRef = useRef<THREE.MeshStandardMaterial>(null);
  const aegeanRef = useRef<THREE.MeshStandardMaterial>(null);
  const adriaticRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = (ref: React.RefObject<THREE.MeshStandardMaterial | null>, offset: number) => {
      if (ref.current) {
        ref.current.emissiveIntensity = 0.15 + Math.sin(t * 1.5 + offset) * 0.08;
      }
    };
    pulse(blackSeaRef, 0);
    pulse(aegeanRef, 2);
    pulse(adriaticRef, 4);
  });

  return (
    <group>
      {/* Black Sea — east */}
      <mesh position={[28, -0.2, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 24]} />
        <meshStandardMaterial
          ref={blackSeaRef}
          color="#1f5f8b"
          emissive="#1f5f8b"
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Aegean Sea — south */}
      <mesh position={[8, -0.2, 16]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 24]} />
        <meshStandardMaterial
          ref={aegeanRef}
          color="#28707d"
          emissive="#28707d"
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Adriatic Sea — west */}
      <mesh position={[-26, -0.2, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 24]} />
        <meshStandardMaterial
          ref={adriaticRef}
          color="#1b4f78"
          emissive="#1b4f78"
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// ─── Distant mountain silhouettes ────────────────────────────────
function DistantMountains() {
  const silhouettes: [number, number, number, number][] = [
    [-40, 4, -40, 10],
    [-15, 6, -42, 12],
    [15, 5, -40, 11],
    [40, 3.5, -38, 9],
  ];
  return (
    <group>
      {silhouettes.map(([x, h, z, r], i) => (
        <mesh key={i} position={[x, h / 2 - 1, z]}>
          <coneGeometry args={[r, h, 4]} />
          <meshStandardMaterial color="#0a0e18" roughness={1} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Torch (cylinder + flickering sphere) ────────────────────────
function Torch({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.7 + Math.sin(t * 8 + position[0] * 3) * 0.3;
    if (lightRef.current) lightRef.current.intensity = flicker * 2;
    if (sphereRef.current) sphereRef.current.scale.setScalar(0.8 + flicker * 0.3);
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      <mesh ref={sphereRef} position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial emissive="#ff6a00" emissiveIntensity={2} color="#ff8a20" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1, 0]} color="#ff8a20" intensity={2} distance={8} />
    </group>
  );
}

// ─── Bulgarian flag ──────────────────────────────────────────────
function BulgarianFlag({ position, offset = 0 }: { position: [number, number, number]; offset?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 2 + offset) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
        <meshStandardMaterial color="#888" metalness={0.5} />
      </mesh>
      {/* White */}
      <mesh position={[0.35, 1.5, 0]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Green */}
      <mesh position={[0.35, 1.65, 0]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color="#009b3a" />
      </mesh>
      {/* Red */}
      <mesh position={[0.35, 1.35, 0]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color="#d62612" />
      </mesh>
    </group>
  );
}

// ─── Fire bowl ───────────────────────────────────────────────────
function FireBowl({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 0.9 + Math.sin(clock.getElapsedTime() * 6 + position[0] * 2) * 0.1;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI, 0, 0]}>
      <sphereGeometry args={[0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial emissive="#ff6a00" emissiveIntensity={1.5} color="#ff8a20" />
    </mesh>
  );
}

// ─── Smoke particles ─────────────────────────────────────────────
function SmokeParticles({ positions }: { positions: [number, number, number][] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const data = useMemo(
    () =>
      positions.flatMap((p, pi) =>
        Array.from({ length: 3 }, (_, i) => ({
          base: p,
          offset: i * 0.6,
          speed: 0.3 + Math.random() * 0.2,
          idx: pi * 3 + i,
        }))
      ),
    [positions]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d) => {
      const m = refs.current[d.idx];
      if (m) {
        const cycle = ((t * d.speed + d.offset) % 3) / 3;
        m.position.y = d.base[1] + cycle * 2.5;
        m.position.x = d.base[0] + Math.sin(t + d.idx) * 0.15;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.12 * (1 - cycle);
      }
    });
  });

  return (
    <group>
      {data.map((d) => (
        <mesh
          key={d.idx}
          ref={(el) => { refs.current[d.idx] = el; }}
          position={[d.base[0], d.base[1], d.base[2]]}
        >
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color="#999" transparent opacity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Ember particles near rising ─────────────────────────────────
function EmberParticles({ center }: { center: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: 3 }, () => ({
        rx: (Math.random() - 0.5) * 2,
        rz: (Math.random() - 0.5) * 2,
        speed: 0.4 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  // Single ember for simplicity — just a visual accent
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      const d = data[0];
      const cycle = ((t * d.speed + d.phase) % 3) / 3;
      ref.current.position.set(
        center[0] + d.rx + Math.sin(t) * 0.3,
        center[1] + 1 + cycle * 2,
        center[2] + d.rz
      );
      const s = 0.06 * (1 - cycle);
      ref.current.scale.setScalar(s > 0 ? s : 0.01);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ff6a20" transparent opacity={0.8} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTIVE LANDMARKS (5 clickable cities)
// ═══════════════════════════════════════════════════════════════════

// ─── Pliska / Ancient Capital ────────────────────────────────────
function PliskaLandmark() {
  const pos = CITY_POSITIONS["ancient-capital"];
  return (
    <group position={pos}>
      {/* Fortress walls — 4 low boxes forming square */}
      {[
        [0, 0.4, -1.8],
        [0, 0.4, 1.8],
        [-1.8, 0.4, 0],
        [1.8, 0.4, 0],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i < 2 ? 0 : Math.PI / 2, 0]}>
          <boxGeometry args={[3.6, 0.8, 0.3]} />
          <meshStandardMaterial color="#aaa8a0" roughness={0.8} />
        </mesh>
      ))}
      {/* Central tower */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 2.0, 8]} />
        <meshStandardMaterial color="#aaa8a0" roughness={0.7} />
      </mesh>
      {/* Golden glow */}
      <pointLight position={[0, 2, 0]} color="#ffc040" intensity={3} distance={12} />
      {/* Torches */}
      <Torch position={[-1.5, 0, -1.5]} />
      <Torch position={[1.5, 0, 1.5]} />
    </group>
  );
}

// ─── Tsarevets / Medieval Fortress ───────────────────────────────
function TsarevetsLandmark() {
  const pos = CITY_POSITIONS["medieval-fortress"];
  return (
    <group position={pos}>
      {/* Hill base — cone */}
      <mesh position={[0, -1, 0]}>
        <coneGeometry args={[5, 4, 8]} />
        <meshStandardMaterial color="#2a4a20" roughness={0.9} />
      </mesh>
      {/* Castle main body */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[2.5, 2, 2]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      {/* Tower left with red roof */}
      <mesh position={[-1.2, 3, -0.5]}>
        <cylinderGeometry args={[0.35, 0.4, 2, 8]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      <mesh position={[-1.2, 4.1, -0.5]}>
        <coneGeometry args={[0.5, 0.7, 8]} />
        <meshStandardMaterial color="#8b2020" />
      </mesh>
      {/* Tower right with red roof */}
      <mesh position={[1.2, 3, 0.5]}>
        <cylinderGeometry args={[0.35, 0.4, 2, 8]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      <mesh position={[1.2, 4.1, 0.5]}>
        <coneGeometry args={[0.5, 0.7, 8]} />
        <meshStandardMaterial color="#8b2020" />
      </mesh>
      {/* Bulgarian tricolor flag */}
      <BulgarianFlag position={[0, 3.2, 1.2]} offset={1} />
      {/* 3 Fire bowls */}
      <FireBowl position={[-1.8, 1.4, 1.5]} />
      <FireBowl position={[1.8, 1.4, -1.5]} />
      <FireBowl position={[0, 3.3, -1.2]} />
      {/* Warm light */}
      <pointLight position={[0, 4, 0]} color="#ff9040" intensity={3} distance={15} />
    </group>
  );
}

// ─── Rila Monastery ──────────────────────────────────────────────
function RilaMonasteryLandmark() {
  const pos = CITY_POSITIONS["rila-monastery"];
  return (
    <group position={pos}>
      {/* White building */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[3, 1.6, 2.2]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.6} />
      </mesh>
      {/* Dark brown dome */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.8, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a2a1a" roughness={0.7} />
      </mesh>
      {/* Golden cross on top */}
      <mesh position={[0, 2.9, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      <mesh position={[0, 3.0, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.06]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      {/* Arched entrance */}
      <mesh position={[0, 0.5, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.15, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      {/* Light rays — semi-transparent planes (desktop only) */}
      {!IS_MOBILE &&
        [
          { rot: [0.3, 0.2, 0.1] as [number, number, number], p: [1, 3, -0.5] as [number, number, number] },
          { rot: [-0.2, -0.1, 0.15] as [number, number, number], p: [-0.8, 3.5, 0.3] as [number, number, number] },
          { rot: [0.1, 0.3, -0.1] as [number, number, number], p: [0.3, 4, -0.2] as [number, number, number] },
        ].map((ray, i) => (
          <mesh key={i} position={ray.p} rotation={ray.rot}>
            <planeGeometry args={[1.5, 5]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.DoubleSide} />
          </mesh>
        ))}
      {/* Soft warm light */}
      <pointLight position={[0, 3, 0]} color="#ffe8c0" intensity={2} distance={12} />
    </group>
  );
}

// ─── Revival Town ────────────────────────────────────────────────
function RevivalTownLandmark() {
  const pos = CITY_POSITIONS["revival-town"];
  const houses: { offset: [number, number, number]; color: string; roofColor: string; w: number; h: number }[] = [
    { offset: [-1.5, 0, -0.8], color: "#c8a050", roofColor: "#8b4513", w: 1.2, h: 1.2 },
    { offset: [1.2, 0, 0.5], color: "#b06030", roofColor: "#6a2a10", w: 1.0, h: 1.0 },
    { offset: [-0.3, 0, 1.5], color: "#5a7a9a", roofColor: "#3a4a5a", w: 1.1, h: 1.1 },
  ];

  return (
    <group position={pos}>
      {/* 3 Colorful houses with pitched roofs and glowing windows */}
      {houses.map((h, i) => (
        <group key={i} position={h.offset}>
          <mesh position={[0, h.h / 2, 0]}>
            <boxGeometry args={[h.w, h.h, h.w * 0.8]} />
            <meshStandardMaterial color={h.color} roughness={0.7} />
          </mesh>
          <mesh position={[0, h.h + 0.25, 0]}>
            <coneGeometry args={[h.w * 0.75, 0.5, 4]} />
            <meshStandardMaterial color={h.roofColor} />
          </mesh>
          <mesh position={[0, h.h * 0.45, h.w * 0.41]}>
            <boxGeometry args={[0.2, 0.2, 0.02]} />
            <meshStandardMaterial emissive="#ffc040" emissiveIntensity={2} color="#ffc040" />
          </mesh>
        </group>
      ))}
      {/* School building with book prop */}
      <mesh position={[0.5, 0.7, -1.2]}>
        <boxGeometry args={[1.8, 1.4, 1.2]} />
        <meshStandardMaterial color="#d8c8a0" roughness={0.6} />
      </mesh>
      <mesh position={[0.5, 1.5, -1.2]}>
        <boxGeometry args={[0.5, 0.08, 0.35]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      {/* Chimney smoke (desktop only) */}
      {!IS_MOBILE && (
        <SmokeParticles
          positions={[
            [-1.5, 1.6, -0.8],
            [1.2, 1.4, 0.5],
            [-0.3, 1.5, 1.5],
          ]}
        />
      )}
      <pointLight position={[0, 2, 0]} color="#ffe0a0" intensity={2} distance={10} />
    </group>
  );
}

// ─── Modern Sofia ────────────────────────────────────────────────
function ModernSofiaLandmark() {
  const pos = CITY_POSITIONS["modern-sofia"];
  return (
    <group position={pos}>
      {/* Alexander Nevsky Cathedral — box base + gold dome + cross */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[2.5, 1.6, 2]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8a832" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cross on cathedral */}
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.25, 0.05, 0.05]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      {/* Modern buildings — tall gray-blue boxes */}
      {[
        { p: [-2.5, 1.5, -0.5] as [number, number, number], h: 3, c: "#6a7a8a" },
        { p: [2.8, 1.8, 0.3] as [number, number, number], h: 3.6, c: "#5a6a7a" },
        { p: [-1.5, 1, 2] as [number, number, number], h: 2, c: "#7a8a9a" },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={[1, b.h, 0.8]} />
          <meshStandardMaterial color={b.c} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      {/* City lights — emissive dots */}
      {[
        [-2.5, 3.2, -0.5],
        [2.8, 3.8, 0.3],
        [0, 2.8, 0],
        [-1.5, 2.2, 2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial emissive="#ffe080" emissiveIntensity={3} color="#ffe080" />
        </mesh>
      ))}
      <pointLight position={[0, 3, 0]} color="#ffe0a0" intensity={2} distance={12} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECORATIVE LANDMARKS (visual only, NOT clickable)
// ═══════════════════════════════════════════════════════════════════

// ─── Foundation marker (681 Asparuh) ─────────────────────────────
function FoundationMarker() {
  return (
    <group position={[-24, 0.5, 0]}>
      {/* 2 tent shapes (cones) */}
      <mesh position={[-0.6, 0.5, 0]}>
        <coneGeometry args={[0.6, 1.0, 6]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, 0.5, 0.3]}>
        <coneGeometry args={[0.5, 0.9, 6]} />
        <meshStandardMaterial color="#7a6a4a" roughness={0.8} />
      </mesh>
      {/* Banner pole with flag */}
      <mesh position={[0, 0.9, -0.5]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
        <meshStandardMaterial color="#666" metalness={0.4} />
      </mesh>
      <mesh position={[0.2, 1.65, -0.5]}>
        <boxGeometry args={[0.4, 0.25, 0.02]} />
        <meshStandardMaterial color="#c8a832" />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffc040" intensity={1} distance={6} />
    </group>
  );
}

// ─── Preslav ─────────────────────────────────────────────────────
function PreslavMarker() {
  return (
    <group position={[-12, 0.5, -4]}>
      {/* Small elegant stone building */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1.0, 0.8]} />
        <meshStandardMaterial color="#bab0a0" roughness={0.7} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.15, 0]}>
        <coneGeometry args={[0.8, 0.4, 4]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      {/* Book symbol — small box on top */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.2]} />
        <meshStandardMaterial color="#c8a832" metalness={0.5} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffe8c0" intensity={1} distance={5} />
    </group>
  );
}

// ─── Ottoman period marker ───────────────────────────────────────
function OttomanMarker() {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    }
  });

  return (
    <group position={[2, 0.3, -2]}>
      {/* Broken column — tilted cylinder */}
      <mesh position={[0, 0.6, 0]} rotation={[0.15, 0, 0.1]}>
        <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      {/* Subtle red-orange glow at base */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial
          ref={glowRef}
          color="#1a0a0a"
          emissive="#aa3010"
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── April Uprising memorial flame ───────────────────────────────
function AprilUprisingMarker() {
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (flameRef.current) {
      const t = clock.getElapsedTime();
      flameRef.current.scale.y = 1 + Math.sin(t * 5) * 0.2;
      flameRef.current.scale.x = 1 + Math.sin(t * 4 + 1) * 0.1;
    }
  });

  return (
    <group position={[14, 0.5, -2]}>
      {/* Memorial flame — emissive cone */}
      <mesh ref={flameRef} position={[0, 0.6, 0]}>
        <coneGeometry args={[0.25, 0.8, 8]} />
        <meshStandardMaterial emissive="#ff4a00" emissiveIntensity={2} color="#ff6a20" transparent opacity={0.9} />
      </mesh>
      {/* Base pedestal */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.3, 8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.8} />
      </mesh>
      {/* Rising ember particles (desktop only) */}
      {!IS_MOBILE && <EmberParticles center={[14, 1, -2]} />}
      <pointLight position={[0, 1.5, 0]} color="#ff6a20" intensity={2} distance={8} />
    </group>
  );
}

// ─── Shipka monument ─────────────────────────────────────────────
function ShipkaMarker() {
  return (
    <group position={[16, 1, -6]}>
      {/* Mountain peak — tall cone */}
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[2.5, 3, 6]} />
        <meshStandardMaterial color="#2a4a20" roughness={0.9} />
      </mesh>
      {/* White obelisk monument on top */}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <coneGeometry args={[0.2, 0.3, 4]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.5} />
      </mesh>
      {/* Hero light beam — semi-transparent cylinder going up */}
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 3, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>
      {/* Bulgarian flag */}
      <BulgarianFlag position={[0.5, 3.5, 0.3]} offset={3} />
      <pointLight position={[0, 4, 0]} color="#ffe8c0" intensity={1.5} distance={8} />
    </group>
  );
}

// ─── Liberation monument ─────────────────────────────────────────
function LiberationMarker() {
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(clock.getElapsedTime() * 1.5) * 0.03;
    }
  });

  return (
    <group position={[18, 0.5, -4]}>
      {/* White monument — tall thin box + sphere on top */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.25, 2.4, 0.25]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
      </mesh>
      {/* Upward white glow beam */}
      <mesh ref={beamRef} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.08, 0.25, 3, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>
      {/* Golden aura */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.06} />
      </mesh>
      {/* Bulgarian flag */}
      <BulgarianFlag position={[0.6, 0.5, 0.3]} offset={5} />
      <pointLight position={[0, 3, 0]} color="#ffe8c0" intensity={1.5} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIMELINE PATH + PARTICLES + LABELS
// ═══════════════════════════════════════════════════════════════════

// ─── Timeline golden path ────────────────────────────────────────
function TimelinePath() {
  const { curve, geo } = useMemo(() => {
    const points = ALL_POI_POSITIONS.map(
      (p) => new THREE.Vector3(p[0], p[1] + 0.8, p[2])
    );
    const c = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    const g = new THREE.TubeGeometry(c, 64, 0.08, 6, false);
    return { curve: c, geo: g };
  }, []);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotCount = IS_MOBILE ? 4 : 8;
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Tube opacity pulse
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    }
    // Flowing golden spheres along path
    for (let i = 0; i < dotCount; i++) {
      const dot = dotRefs.current[i];
      if (dot) {
        const progress = ((t * 0.1 + i / dotCount) % 1);
        const p = curve.getPoint(progress);
        dot.position.set(p.x, p.y, p.z);
      }
    }
  });

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial
          ref={matRef}
          color="#d4a832"
          emissive="#d4a832"
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {Array.from({ length: dotCount }, (_, i) => (
        <mesh key={i} ref={(el) => { dotRefs.current[i] = el; }}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshStandardMaterial emissive="#ffd700" emissiveIntensity={2} color="#ffd700" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Floating year / name labels ─────────────────────────────────
function FloatingLabel({ position, text }: { position: [number, number, number]; text: string }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
    }
  });

  return (
    <group ref={ref} position={position}>
      <Html center distanceFactor={50} style={{ pointerEvents: "none" }}>
        <span
          style={{
            color: "#c8a832",
            fontSize: "13px",
            fontWeight: 700,
            textShadow: "0 0 8px rgba(200,168,50,0.6)",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      </Html>
    </group>
  );
}

function AllFloatingLabels() {
  // Interactive city labels
  const cityLabels = TIMELINE_ORDER.map((id) => {
    const pos = CITY_POSITIONS[id];
    const year = CITY_YEARS[id];
    if (!pos || !year) return null;
    const yOffset = id === "medieval-fortress" ? 6 : 3.5;
    return (
      <FloatingLabel
        key={id}
        position={[pos[0], pos[1] + yOffset, pos[2]]}
        text={year}
      />
    );
  });

  // Decorative landmark labels
  const decoLabels: { pos: [number, number, number]; text: string }[] = [
    { pos: [-24, 3.5, 0], text: "681 \u0410\u0441\u043F\u0430\u0440\u0443\u0445" },
    { pos: [-12, 3.5, -4], text: "Preslav" },
    { pos: [2, 3, -2], text: "1396" },
    { pos: [14, 3, -2], text: "1876" },
    { pos: [16, 6.5, -6], text: "Shipka 1877" },
    { pos: [18, 4.5, -4], text: "1878" },
  ];

  return (
    <group>
      {cityLabels}
      {decoLabels.map((l, i) => (
        <FloatingLabel key={`deco-${i}`} position={l.pos} text={l.text} />
      ))}
    </group>
  );
}

// ─── Golden dust particles ───────────────────────────────────────
function GoldenDust() {
  const count = IS_MOBILE ? 15 : 30;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 60,
        y: Math.random() * 10 + 1,
        z: (Math.random() - 0.5) * 40,
        speed: 0.05 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      })),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      dummy.position.set(
        d.x + Math.sin(t * d.speed + d.phase) * 2,
        d.y + Math.sin(t * d.speed * 0.7 + d.phase) * 1.5,
        d.z + Math.cos(t * d.speed * 0.5 + d.phase) * 1.5
      );
      dummy.scale.setScalar(0.06);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ffd700" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// ─── Ember particles near fortresses (desktop only) ──────────────
function FortressEmbers() {
  const count = 10;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const zones: [number, number, number][] = [
    CITY_POSITIONS["ancient-capital"],
    CITY_POSITIONS["medieval-fortress"],
  ];
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const zone = zones[i % zones.length];
        return {
          cx: zone[0],
          cy: zone[1] + 2,
          cz: zone[2],
          rx: (Math.random() - 0.5) * 6,
          ry: Math.random() * 4,
          rz: (Math.random() - 0.5) * 6,
          speed: 0.3 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const cycle = ((t * d.speed + d.phase) % 4) / 4;
      dummy.position.set(
        d.cx + d.rx + Math.sin(t + d.phase) * 0.5,
        d.cy + d.ry * cycle,
        d.cz + d.rz + Math.cos(t + d.phase) * 0.5
      );
      dummy.scale.setScalar(0.04 * (1 - cycle));
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ff6a20" transparent opacity={0.8} />
    </instancedMesh>
  );
}

// ─── City label + button (interactive cities only) ───────────────
function CityLabel({
  city,
  lang,
  unlocked,
  completedLevels,
  onClick,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  completedLevels: number;
  onClick: () => void;
}) {
  const pos = getCityPos(city);
  const yOffset = city.id === "medieval-fortress" ? 7.5 : 5;

  return (
    <Html
      position={[pos[0], pos[1] + yOffset, pos[2]]}
      center
      distanceFactor={40}
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-0.5 select-none"
        style={{ cursor: unlocked ? "pointer" : "default" }}
      >
        <span className="text-2xl">{unlocked ? city.emoji : "\uD83D\uDD12"}</span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
          style={{
            background: unlocked ? "rgba(200,168,50,0.2)" : "rgba(0,0,0,0.5)",
            color: unlocked ? "#fbbf24" : "#666",
            border: `1px solid ${unlocked ? "rgba(200,168,50,0.3)" : "rgba(100,100,100,0.3)"}`,
          }}
        >
          {city.building[lang]}
        </span>
        {unlocked && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="text-[8px]"
                style={{ opacity: i < completedLevels ? 1 : 0.2 }}
              >
                {"\u2B50"}
              </span>
            ))}
          </span>
        )}
      </button>
    </Html>
  );
}

// ─── Scene content ───────────────────────────────────────────────
function SceneContent({
  onSelectCity,
  lang,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
}) {
  const { getTopicCompletedLevels } = useProgressStore();

  return (
    <>
      {/* Lighting — warm golden atmosphere */}
      <ambientLight intensity={0.5} color="#2a1a0a" />
      <directionalLight position={[-15, 25, 10]} intensity={0.9} color="#ffc860" />
      <hemisphereLight color="#87ceeb" groundColor="#3a2a10" intensity={0.3} />

      {/* Background + terrain */}
      <BackgroundGradient />
      <Terrain />
      <Mountains />
      <DanubeRiver />
      <ThreeSeas />
      <DistantMountains />

      {/* ── 5 Interactive landmarks ── */}
      <PliskaLandmark />
      <TsarevetsLandmark />
      <RilaMonasteryLandmark />
      <RevivalTownLandmark />
      <ModernSofiaLandmark />

      {/* ── 6 Decorative landmarks ── */}
      <FoundationMarker />
      <PreslavMarker />
      <OttomanMarker />
      <AprilUprisingMarker />
      <ShipkaMarker />
      <LiberationMarker />

      {/* Timeline golden path */}
      <TimelinePath />

      {/* Floating year / name labels */}
      <AllFloatingLabels />

      {/* Particles */}
      <GoldenDust />
      {!IS_MOBILE && <FortressEmbers />}

      {/* City labels / buttons (5 interactive only) */}
      {HISTORY_CITIES.map((city) => {
        const unlocked = true;
        return (
          <CityLabel
            key={city.id}
            city={city}
            lang={lang}
            unlocked={unlocked}
            completedLevels={getTopicCompletedLevels(city.topicId)}
            onClick={() => unlocked && onSelectCity(city)}
          />
        );
      })}
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────
export function HistoryBGMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState<[number, number]>(IS_MOBILE ? [0.8, 1] : [1, 1.5]);

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 25, 35], fov: 50 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: "#1a1208" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={[FOG_COLOR, 40, 120]} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minDistance={15}
          maxDistance={50}
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
