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
const BG_TOP = "#0a0e1a";
const BG_BOTTOM = "#2a1a08";
const FOG_COLOR = "#2a1a08";

const historyWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const HISTORY_CITIES = CITIES.filter((c) =>
  historyWorld.topicIds.includes(c.topicId)
);

// ─── City positions on terrain ───────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-capital": [-20, 1, -12],
  "medieval-fortress": [0, 3, -18],
  "rila-monastery": [-22, 0, 8],
  "revival-town": [18, 0, 6],
  "modern-sofia": [0, 0, 20],
};

const CITY_YEARS: Record<string, string> = {
  "ancient-capital": "681",
  "medieval-fortress": "1185",
  "rila-monastery": "10th c.",
  "revival-town": "1762",
  "modern-sofia": "1878",
};

// Chronological order for timeline path
const TIMELINE_ORDER = [
  "ancient-capital",
  "medieval-fortress",
  "rila-monastery",
  "revival-town",
  "modern-sofia",
];

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Background gradient ─────────────────────────────────────────
function BackgroundGradient() {
  const mesh = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={mesh} position={[0, 0, -80]} renderOrder={-1}>
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
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#3a5a2a" roughness={1} />
      </mesh>
      {/* Darker valley patches */}
      {[
        [-10, 5],
        [12, -8],
        [-15, -5],
        [8, 15],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, -0.45, z]}
        >
          <circleGeometry args={[5 + i * 1.5, 16]} />
          <meshStandardMaterial
            color="#2a4a1a"
            roughness={1}
            transparent
            opacity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Mountain ridges ─────────────────────────────────────────────
function Mountains() {
  const ridges: { pos: [number, number, number]; h: number; r: number }[] = [
    { pos: [15, 0, -25], h: 10, r: 6 },
    { pos: [-12, 0, -22], h: 8, r: 5 },
    { pos: [30, 0, -10], h: 7, r: 5 },
    { pos: [-30, 0, -5], h: 9, r: 6 },
    { pos: [25, 0, 15], h: 6, r: 4 },
  ];
  return (
    <group>
      {ridges.map((m, i) => (
        <mesh key={i} position={[m.pos[0], m.h / 2 - 0.5, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color="#2a4a20" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Distant mountain silhouettes (background) ──────────────────
function DistantMountains() {
  const silhouettes: [number, number, number, number][] = [
    [-50, 5, -50, 12],
    [-20, 7, -55, 15],
    [15, 6, -52, 14],
    [45, 4, -48, 10],
  ];
  return (
    <group>
      {silhouettes.map(([x, h, z, r], i) => (
        <mesh key={i} position={[x, h / 2 - 1, z]}>
          <coneGeometry args={[r, h, 4]} />
          <meshStandardMaterial color="#0a0e18" roughness={1} />
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
function BulgarianFlag({ position, sway = true }: { position: [number, number, number]; sway?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (sway && groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5 + position[0]) * 0.06;
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
        <meshStandardMaterial color="#00966e" />
      </mesh>
      {/* Red */}
      <mesh position={[0.35, 1.35, 0]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color="#d62612" />
      </mesh>
    </group>
  );
}

// ─── Fire bowl (emissive hemisphere) ─────────────────────────────
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
      {/* Hill base */}
      <mesh position={[0, -1, 0]}>
        <coneGeometry args={[5, 4, 8]} />
        <meshStandardMaterial color="#2a4a20" roughness={0.9} />
      </mesh>
      {/* Castle main */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[2.5, 2, 2]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      {/* Tower left */}
      <mesh position={[-1.2, 3, -0.5]}>
        <cylinderGeometry args={[0.35, 0.4, 2, 8]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      <mesh position={[-1.2, 4.1, -0.5]}>
        <coneGeometry args={[0.5, 0.7, 8]} />
        <meshStandardMaterial color="#8b2020" />
      </mesh>
      {/* Tower right */}
      <mesh position={[1.2, 3, 0.5]}>
        <cylinderGeometry args={[0.35, 0.4, 2, 8]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      <mesh position={[1.2, 4.1, 0.5]}>
        <coneGeometry args={[0.5, 0.7, 8]} />
        <meshStandardMaterial color="#8b2020" />
      </mesh>
      {/* Bulgarian flag */}
      <BulgarianFlag position={[0, 3.2, 1.2]} />
      {/* Fire bowls */}
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
      {/* Dome */}
      <mesh position={[0, 2, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a2a1a" roughness={0.7} />
      </mesh>
      {/* Cross on top */}
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
      {/* Light rays — semi-transparent planes */}
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
      {/* Mist spheres */}
      {!IS_MOBILE && <MistSpheres center={pos} />}
      {/* Soft warm light */}
      <pointLight position={[0, 3, 0]} color="#ffe8c0" intensity={2} distance={12} />
    </group>
  );
}

// ─── Floating mist ───────────────────────────────────────────────
function MistSpheres({ center }: { center: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        x: (i - 1.5) * 2,
        z: ((i % 2) - 0.5) * 3,
        speed: 0.2 + i * 0.1,
      })),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    offsets.forEach((o, i) => {
      const m = refs.current[i];
      if (m) {
        m.position.y = 1.5 + Math.sin(t * o.speed) * 0.5;
        m.position.x = o.x + Math.sin(t * 0.15 + i) * 0.5;
      }
    });
  });

  return (
    <group>
      {offsets.map((o, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          position={[o.x, 1.5, o.z]}
        >
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.04} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Smoke particles (for Revival town) ──────────────────────────
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
      {/* Houses */}
      {houses.map((h, i) => (
        <group key={i} position={h.offset}>
          {/* Body */}
          <mesh position={[0, h.h / 2, 0]}>
            <boxGeometry args={[h.w, h.h, h.w * 0.8]} />
            <meshStandardMaterial color={h.color} roughness={0.7} />
          </mesh>
          {/* Pitched roof */}
          <mesh position={[0, h.h + 0.25, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[h.w * 0.75, 0.5, 4]} />
            <meshStandardMaterial color={h.roofColor} />
          </mesh>
          {/* Window glow */}
          <mesh position={[0, h.h * 0.45, h.w * 0.41]}>
            <boxGeometry args={[0.2, 0.2, 0.02]} />
            <meshStandardMaterial emissive="#ffc040" emissiveIntensity={2} color="#ffc040" />
          </mesh>
        </group>
      ))}

      {/* School building */}
      <mesh position={[0.5, 0.7, -1.2]}>
        <boxGeometry args={[1.8, 1.4, 1.2]} />
        <meshStandardMaterial color="#d8c8a0" roughness={0.6} />
      </mesh>
      {/* Book on school */}
      <mesh position={[0.5, 1.5, -1.2]}>
        <boxGeometry args={[0.5, 0.08, 0.35]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>

      {/* Smoke (desktop only) */}
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
      {/* Alexander Nevsky Cathedral — box base + gold dome */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[2.5, 1.6, 2]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8a832" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Modern buildings */}
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

      {/* City lights */}
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

// ─── Timeline paths (golden tubes) ──────────────────────────────
function TimelinePaths() {
  const tubeData = useMemo(() => {
    const segments: { curve: THREE.CatmullRomCurve3 }[] = [];
    for (let i = 0; i < TIMELINE_ORDER.length - 1; i++) {
      const from = CITY_POSITIONS[TIMELINE_ORDER[i]];
      const to = CITY_POSITIONS[TIMELINE_ORDER[i + 1]];
      if (!from || !to) continue;
      const mid: [number, number, number] = [
        (from[0] + to[0]) / 2,
        Math.max(from[1], to[1]) + 2,
        (from[2] + to[2]) / 2,
      ];
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(from[0], from[1] + 1, from[2]),
        new THREE.Vector3(mid[0], mid[1], mid[2]),
        new THREE.Vector3(to[0], to[1] + 1, to[2]),
      ]);
      segments.push({ curve });
    }
    return segments;
  }, []);

  return (
    <group>
      {tubeData.map((seg, i) => (
        <TimelineSegment key={i} curve={seg.curve} index={i} />
      ))}
    </group>
  );
}

function TimelineSegment({ curve, index }: { curve: THREE.CatmullRomCurve3; index: number }) {
  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.08, 6, false),
    [curve]
  );
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dotCount = IS_MOBILE ? 2 : 4;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Tube pulse
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.5 + Math.sin(t * 2 + index) * 0.3;
    }
    // Flowing dots
    for (let i = 0; i < dotCount; i++) {
      const dot = dotRefs.current[i];
      if (dot) {
        const progress = ((t * 0.15 + i / dotCount) % 1);
        const p = curve.getPoint(progress);
        dot.position.set(p.x, p.y, p.z);
      }
    }
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          ref={matRef}
          color="#c8a832"
          emissive="#c8a832"
          emissiveIntensity={0.5}
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

// ─── Floating year labels ────────────────────────────────────────
function YearLabel({ cityId }: { cityId: string }) {
  const pos = CITY_POSITIONS[cityId];
  const year = CITY_YEARS[cityId];
  if (!pos || !year) return null;

  // Tsarevets is on a hill, raise its label more
  const yOffset = cityId === "medieval-fortress" ? 6 : 3.5;

  return (
    <Html
      position={[pos[0], pos[1] + yOffset, pos[2]]}
      center
      distanceFactor={50}
      style={{ pointerEvents: "none" }}
    >
      <span
        style={{
          color: "#c8a832",
          fontSize: "13px",
          fontWeight: 700,
          textShadow: "0 0 8px rgba(200,168,50,0.6)",
          whiteSpace: "nowrap",
        }}
      >
        {year}
      </span>
    </Html>
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
        z: (Math.random() - 0.5) * 50,
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

// ─── Ember particles near fortresses ─────────────────────────────
function EmberParticles() {
  const count = IS_MOBILE ? 8 : 16;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const zones = [CITY_POSITIONS["ancient-capital"], CITY_POSITIONS["medieval-fortress"]];
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
    [count]
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

// ─── City label + button ─────────────────────────────────────────
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
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#2a1a0a" />
      <directionalLight position={[-15, 25, 10]} intensity={0.9} color="#ffc860" />
      <hemisphereLight color="#ffc860" groundColor="#1a2a0a" intensity={0.3} />

      {/* Background + terrain */}
      <BackgroundGradient />
      <Terrain />
      <Mountains />
      <DistantMountains />

      {/* Landmarks */}
      <PliskaLandmark />
      <TsarevetsLandmark />
      <RilaMonasteryLandmark />
      <RevivalTownLandmark />
      <ModernSofiaLandmark />

      {/* Timeline paths */}
      <TimelinePaths />

      {/* Year labels */}
      {TIMELINE_ORDER.map((id) => (
        <YearLabel key={id} cityId={id} />
      ))}

      {/* Particles */}
      <GoldenDust />
      {!IS_MOBILE && <EmberParticles />}

      {/* City labels / buttons */}
      {HISTORY_CITIES.map((city) => {
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP
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
        camera={{ position: [0, 35, 45], fov: 50 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: "#1a1208" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={[FOG_COLOR, 50, 120]} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minDistance={15}
          maxDistance={70}
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
