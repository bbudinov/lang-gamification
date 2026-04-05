"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

// ─── Professions world cities ───────────────────────────────────
const PROF_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "professions")?.topicIds ?? []
);
const PROF_CITIES = CITIES.filter((c) => PROF_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions ──────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "career-hub": [0, 0, 0],
  "hospital-ward": [0, 0, -18],
  "school-class": [-18, 0, -6],
  "pro-kitchen": [-14, 0, 14],
  "airport-tower": [18, 0, -6],
  "tech-office": [14, 0, 14],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs ────────────────────────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["career-hub", "hospital-ward"],
  ["career-hub", "school-class"],
  ["career-hub", "pro-kitchen"],
  ["career-hub", "airport-tower"],
  ["career-hub", "tech-office"],
  ["hospital-ward", "school-class"],
  ["hospital-ward", "airport-tower"],
  ["school-class", "pro-kitchen"],
  ["airport-tower", "tech-office"],
  ["pro-kitchen", "tech-office"],
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL ELEMENTS
// ═══════════════════════════════════════════════════════════════

// ─── Ground ─────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#081828" roughness={1} />
    </mesh>
  );
}

// ─── Clean routes ───────────────────────────────────────────────
function ProfRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const curves = useMemo(() => {
    return ROUTE_PAIRS.map(([a, b]) => {
      const posA = CITY_POSITIONS[a] ?? [0, 0, 0];
      const posB = CITY_POSITIONS[b] ?? [0, 0, 0];
      const mid: [number, number, number] = [
        (posA[0] + posB[0]) / 2,
        (posA[1] + posB[1]) / 2 + 2.5,
        (posA[2] + posB[2]) / 2,
      ];
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...posA),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...posB)
      );
      const bothUnlocked = unlockedIds.has(a) && unlockedIds.has(b);
      return { curve, bothUnlocked };
    });
  }, [unlockedIds]);

  return (
    <group>
      {curves.map(({ curve, bothUnlocked }, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 20, 0.06, 4, false]} />
          <meshBasicMaterial
            color={bothUnlocked ? "#ccddee" : "#223344"}
            transparent
            opacity={bothUnlocked ? 0.3 : 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZONE COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── 1. Career Hub (center) ─────────────────────────────────────
function CareerHubZone() {
  const iconsRef = useRef<THREE.Group>(null!);

  const careerIcons = useMemo(() => [
    { color: "#4488ff", shape: "box" as const, offset: 0 },
    { color: "#44cc88", shape: "sphere" as const, offset: Math.PI * 0.66 },
    { color: "#ff8844", shape: "octahedron" as const, offset: Math.PI * 1.33 },
    { color: "#cc44ff", shape: "tetrahedron" as const, offset: Math.PI * 2 },
  ], []);

  useFrame(({ clock }) => {
    if (!iconsRef.current) return;
    const t = clock.getElapsedTime();
    iconsRef.current.children.forEach((child, i) => {
      const angle = t * 0.3 + careerIcons[i].offset;
      const r = 3.5;
      child.position.set(Math.cos(angle) * r, 4 + Math.sin(t * 0.5 + i) * 0.5, Math.sin(angle) * r);
      child.rotation.y = t * 0.5;
      child.rotation.x = t * 0.3;
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Modern office building */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[4, 5, 3]} />
        <meshStandardMaterial
          color="#3366aa"
          metalness={0.6}
          roughness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Glass panels */}
      {[-1.2, 0, 1.2].map((y, i) => (
        <mesh key={i} position={[0, y + 2.5, 1.52]}>
          <planeGeometry args={[3.6, 1]} />
          <meshStandardMaterial
            color="#88bbff"
            emissive="#2244aa"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.1}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
      {/* Roof accent */}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[4.4, 0.3, 3.4]} />
        <meshStandardMaterial color="#445566" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Floating career icons */}
      <group ref={iconsRef}>
        {careerIcons.map((icon, i) => (
          <mesh key={i}>
            {icon.shape === "box" && <boxGeometry args={[0.5, 0.5, 0.5]} />}
            {icon.shape === "sphere" && <sphereGeometry args={[0.3, 8, 6]} />}
            {icon.shape === "octahedron" && <octahedronGeometry args={[0.35]} />}
            {icon.shape === "tetrahedron" && <tetrahedronGeometry args={[0.4]} />}
            <meshStandardMaterial
              color={icon.color}
              emissive={icon.color}
              emissiveIntensity={0.3}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>

      <pointLight color="#4488ff" intensity={0.6} distance={20} position={[0, 6, 0]} />
    </group>
  );
}

// ─── 2. Hospital ────────────────────────────────────────────────
function HospitalZone() {
  const monitorRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!monitorRef.current) return;
    const t = clock.getElapsedTime();
    // Heartbeat pulse on the line
    const scale = 1 + Math.pow(Math.sin(t * 3.2), 6) * 0.3;
    monitorRef.current.scale.y = scale;
    monitorRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.05;
  });

  return (
    <group position={[0, 0, -18]}>
      {/* Main building */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 4, 3]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
      </mesh>

      {/* Red cross — horizontal */}
      <mesh position={[0, 3.5, 1.52]}>
        <boxGeometry args={[1.5, 0.35, 0.05]} />
        <meshStandardMaterial color="#dd2222" emissive="#dd2222" emissiveIntensity={0.3} />
      </mesh>
      {/* Red cross — vertical */}
      <mesh position={[0, 3.5, 1.52]}>
        <boxGeometry args={[0.35, 1.5, 0.05]} />
        <meshStandardMaterial color="#dd2222" emissive="#dd2222" emissiveIntensity={0.3} />
      </mesh>

      {/* Bed */}
      <mesh position={[2.8, 0.5, 0]}>
        <boxGeometry args={[1.5, 0.3, 0.8]} />
        <meshStandardMaterial color="#eeeeff" roughness={0.7} />
      </mesh>
      {/* Bed legs */}
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([dx, dz], i) => (
        <mesh key={i} position={[2.8 + dx, 0.15, dz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 4]} />
          <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      {/* Heart monitor line (pulsing) */}
      <mesh ref={monitorRef} position={[3, 2.5, 0.5]}>
        <boxGeometry args={[1.2, 0.04, 0.02]} />
        <meshBasicMaterial color="#22ff44" />
      </mesh>
      {/* Monitor box */}
      <mesh position={[3, 2.5, 0.3]}>
        <boxGeometry args={[1.4, 1, 0.15]} />
        <meshStandardMaterial color="#222233" roughness={0.5} />
      </mesh>

      <pointLight color="#ff4444" intensity={0.3} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ─── 3. School Class ────────────────────────────────────────────
function SchoolClassZone() {
  const booksRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!booksRef.current) return;
    const t = clock.getElapsedTime();
    booksRef.current.children.forEach((child, i) => {
      child.position.y = 3.5 + Math.sin(t * 0.8 + i * 1.5) * 0.4;
      child.rotation.y = t * 0.2 + i;
    });
  });

  return (
    <group position={[-18, 0, -6]}>
      {/* Building */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 4, 3]} />
        <meshStandardMaterial color="#ddc89a" roughness={0.7} />
      </mesh>

      {/* Blackboard */}
      <mesh position={[0, 3, 1.52]}>
        <planeGeometry args={[3, 1.8]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.9} />
      </mesh>
      {/* Chalk writing (white lines) */}
      {[0.3, 0, -0.3].map((y, i) => (
        <mesh key={i} position={[-0.3 + i * 0.4, 3 + y, 1.53]}>
          <boxGeometry args={[0.8, 0.04, 0.01]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Desk cluster */}
      {[[-1.5, -0.8], [0, -0.8], [1.5, -0.8]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.8, dz + 3]}>
          <boxGeometry args={[1, 0.1, 0.6]} />
          <meshStandardMaterial color="#8b6914" roughness={0.7} />
        </mesh>
      ))}

      {/* Floating books */}
      <group ref={booksRef}>
        {[
          { pos: [-1.5, 3.5, 2] as [number, number, number], color: "#dd4444" },
          { pos: [1.5, 3.5, 2] as [number, number, number], color: "#4444dd" },
          { pos: [0, 3.5, -1.5] as [number, number, number], color: "#44aa44" },
        ].map((book, i) => (
          <mesh key={i} position={book.pos}>
            <boxGeometry args={[0.5, 0.7, 0.1]} />
            <meshStandardMaterial color={book.color} roughness={0.5} />
          </mesh>
        ))}
      </group>

      <pointLight color="#ffcc66" intensity={0.4} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ─── 4. Pro Kitchen ─────────────────────────────────────────────
function ProKitchenZone() {
  const steamRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!steamRef.current) return;
    const t = clock.getElapsedTime();
    steamRef.current.children.forEach((child, i) => {
      child.position.y = 3 + ((t * 0.5 + i * 0.3) % 3);
      child.position.x = Math.sin(t * 0.8 + i * 2) * 0.3;
      const progress = ((t * 0.5 + i * 0.3) % 3) / 3;
      (child as THREE.Mesh).material = child.userData.material;
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress);
    });
  });

  return (
    <group position={[-14, 0, 14]}>
      {/* Stainless counter */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[5, 0.2, 2.5]} />
        <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Counter legs */}
      {[[-2, -1], [2, -1], [-2, 1], [2, 1]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.5, dz]}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 6]} />
          <meshStandardMaterial color="#999999" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Pots on counter */}
      <mesh position={[-1, 1.7, 0]}>
        <cylinderGeometry args={[0.4, 0.35, 0.6, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[1, 1.6, 0]}>
        <cylinderGeometry args={[0.3, 0.25, 0.5, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Chef hat (white hemisphere on stand) */}
      <group position={[3, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.5, 6]} />
          <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      </group>

      {/* Steam particles rising */}
      <group ref={steamRef}>
        {Array.from({ length: IS_MOBILE ? 3 : 5 }).map((_, i) => {
          const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4 });
          return (
            <mesh key={i} position={[Math.random() * 2 - 1, 3, Math.random() - 0.5]} userData={{ material: mat }}>
              <sphereGeometry args={[0.12, 6, 4]} />
              <primitive object={mat} attach="material" />
            </mesh>
          );
        })}
      </group>

      <pointLight color="#ffaa44" intensity={0.4} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ─── 5. Airport Tower ───────────────────────────────────────────
function AirportTowerZone() {
  const planeRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!planeRef.current) return;
    const t = clock.getElapsedTime();
    const angle = t * 0.4;
    const r = 6;
    planeRef.current.position.set(Math.cos(angle) * r, 5, Math.sin(angle) * r);
    planeRef.current.rotation.y = -angle + Math.PI / 2;
    // Slight banking
    planeRef.current.rotation.z = Math.sin(angle) * 0.15;
  });

  return (
    <group position={[18, 0, -6]}>
      {/* Control tower — tall thin cylinder */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.5, 0.7, 7, 8]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Top disc */}
      <mesh position={[0, 7.2, 0]}>
        <cylinderGeometry args={[1.5, 1.2, 0.6, 12]} />
        <meshStandardMaterial color="#334455" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Windows on top */}
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.3, 12]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#2266aa"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 4]}>
        <boxGeometry args={[2, 12, 0.1]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </mesh>
      {/* Runway dashes */}
      {[-2, -1, 0, 1, 2, 3, 4].map((offset, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, offset * 1.5 + 1]}>
          <boxGeometry args={[0.15, 0.8, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Flying plane */}
      <group ref={planeRef}>
        {/* Fuselage */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.12, 1.2, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Wings */}
        <mesh>
          <boxGeometry args={[0.08, 0.04, 1.4]} />
          <meshStandardMaterial color="#cccccc" roughness={0.3} />
        </mesh>
        {/* Tail */}
        <mesh position={[-0.5, 0.2, 0]}>
          <boxGeometry args={[0.04, 0.35, 0.4]} />
          <meshStandardMaterial color="#cccccc" roughness={0.3} />
        </mesh>
        {/* Engine glow */}
        <pointLight color="#ffaa44" intensity={0.3} distance={3} position={[-0.7, 0, 0]} />
      </group>

      <pointLight color="#88bbff" intensity={0.4} distance={12} position={[0, 8, 0]} />
    </group>
  );
}

// ─── 6. Tech Office ─────────────────────────────────────────────
function TechOfficeZone() {
  const binaryRef = useRef<THREE.Group>(null!);

  const binaryDots = useMemo(() => {
    const dots: { x: number; z: number; speed: number }[] = [];
    const count = IS_MOBILE ? 6 : 12;
    for (let i = 0; i < count; i++) {
      dots.push({
        x: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 3,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
    return dots;
  }, []);

  useFrame(({ clock }) => {
    if (!binaryRef.current) return;
    const t = clock.getElapsedTime();
    binaryRef.current.children.forEach((child, i) => {
      const d = binaryDots[i];
      child.position.y = 3 + ((t * d.speed + i * 0.5) % 4);
      const progress = ((t * d.speed + i * 0.5) % 4) / 4;
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - progress);
    });
  });

  return (
    <group position={[14, 0, 14]}>
      {/* Desk */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[4, 0.15, 2]} />
        <meshStandardMaterial color="#222233" roughness={0.5} />
      </mesh>

      {/* 3 Screens at angles */}
      <mesh position={[-1.2, 2, -0.5]} rotation={[0, 0.3, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial
          color="#1144aa"
          emissive="#2266ff"
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 2.1, -0.5]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshStandardMaterial
          color="#1144aa"
          emissive="#2266ff"
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[1.2, 2, -0.5]} rotation={[0, -0.3, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial
          color="#1144aa"
          emissive="#2266ff"
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 1.15, 0.3]}>
        <boxGeometry args={[1.5, 0.05, 0.5]} />
        <meshStandardMaterial color="#111111" roughness={0.7} />
      </mesh>

      {/* Binary particles rising */}
      <group ref={binaryRef}>
        {binaryDots.map((d, i) => (
          <mesh key={i} position={[d.x, 3, d.z]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshBasicMaterial color="#4488ff" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      <pointLight color="#4488ff" intensity={0.5} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CITY MARKER
// ═══════════════════════════════════════════════════════════════

function ProfCityMarker({
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
    <group position={[x, y + 5, z]}>
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
          <ringGeometry args={[2.5, 4, 24]} />
          <meshBasicMaterial
            color={isNext ? "#88aaff" : "#334466"}
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
                ? "radial-gradient(circle at 35% 35%, #c0d0ff, #2a3a6a)"
                : "radial-gradient(circle at 35% 35%, #3a3a4e, #1a1a2e)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#5577bb" : "#334455"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.6), 0 0 ${isNext ? 24 : 10}px #5577bb${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.5)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 48 : 40 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 30, opacity: 0.4 }}>&#x1F512;</span>
            )}
          </div>

          <div
            className="mt-1.5 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(10,15,40,0.92)" : "rgba(15,15,30,0.75)",
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

          {unlocked && (
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ fontSize: 13, opacity: i < completedLevels ? 1 : 0.2 }}
                >
                  &#x2B50;
                </span>
              ))}
            </div>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Camera Controls ────────────────────────────────────────────
function ProfCameraControls() {
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

export function ProfessionsMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const getTopicCompletedLevels = useProgressStore((s) => s.getTopicCompletedLevels);

  const unlockedIds = useMemo(() => {
    return new Set(PROF_CITIES.map((c) => c.id)); // TODO: restore unlock logic
  }, []);

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...PROF_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = PROF_CITIES.find((c) => !unlockedIds.has(c.id));
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
      style={{ touchAction: "none", background: "#0a1a2e" }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: IS_MOBILE ? [0, 58, 72] : [0, 40, 50], fov: IS_MOBILE ? 58 : 50 }}
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

        <color attach="background" args={["#0a1a2e"]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} />

        <Suspense fallback={null}>
          <Ground />
          <ProfRoutes unlockedIds={unlockedIds} />

          <CareerHubZone />
          <HospitalZone />
          <SchoolClassZone />
          <ProKitchenZone />
          <AirportTowerZone />
          <TechOfficeZone />

          {PROF_CITIES.map((city) => (
            <ProfCityMarker
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

        <ProfCameraControls />
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0a1a2e] via-[#0d2040] to-[#0a1a2e] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                &#x1F468;&#x200D;&#x2695;&#xFE0F;
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Exploring careers...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
