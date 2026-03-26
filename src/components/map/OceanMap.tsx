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
import { OceanWater, IslandFoamRing } from "./OceanWater";

// ─── Mobile detection (static) ──────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

// ─── Ocean world topic ids ──────────────────────────────────────
const OCEAN_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "ocean")?.topicIds ?? []
);

// ─── Filter ocean cities ────────────────────────────────────────
const OCEAN_CITIES = CITIES.filter((c) => OCEAN_TOPIC_IDS.has(c.topicId));

// ─── Island positions (custom 3D) ───────────────────────────────
const ISLAND_POSITIONS: Record<string, [number, number]> = {
  "harbor-bay": [-25, 10],
  "fish-dock": [5, -15],
  "lighthouse-point": [30, -5],
  "sailing-school": [-15, -10],
  "cruise-port": [15, 5],
  "storm-zone": [35, 15],
  "skull-cove": [0, 25],
  "shipping-yard": [25, 25],
};

// ─── Island sizes per city ──────────────────────────────────────
const ISLAND_SIZES: Record<string, number> = {
  "harbor-bay": 1.4,
  "fish-dock": 1.0,
  "lighthouse-point": 0.8,
  "sailing-school": 0.9,
  "cruise-port": 1.2,
  "storm-zone": 0.85,
  "skull-cove": 1.0,
  "shipping-yard": 1.1,
};

function cityTo3D(city: City): [number, number, number] {
  const pos = ISLAND_POSITIONS[city.id];
  if (pos) return [pos[0], 0.3, pos[1]];
  const x = (city.pos.x - 50) * 1.5;
  const z = (city.pos.y - 50) * 1.5;
  return [x, 0.3, z];
}

// ─── Route pairs for sea connections ────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["harbor-bay", "fish-dock"],
  ["harbor-bay", "sailing-school"],
  ["fish-dock", "lighthouse-point"],
  ["sailing-school", "cruise-port"],
  ["cruise-port", "storm-zone"],
  ["lighthouse-point", "storm-zone"],
  ["cruise-port", "skull-cove"],
  ["skull-cove", "shipping-yard"],
  ["storm-zone", "shipping-yard"],
];

// ─── Deep water background ──────────────────────────────────────
function DeepWater() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#051a2e" roughness={1} />
    </mesh>
  );
}

// ─── Dock / Pier at Harbor Bay ──────────────────────────────────
function HarborDock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main pier plank */}
      <mesh position={[4.5, 0.35, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[5, 0.15, 1.2]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Support posts */}
      {[2.5, 4.5, 6.5].map((x, i) => (
        <mesh key={`post-${i}`} position={[x, -0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1, 6]} />
          <meshStandardMaterial color="#6a4a10" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Palm Tree ──────────────────────────────────────────────────
function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.08, 0.14, 2.4, 6]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.7, 6, 4]} />
        <meshStandardMaterial color="#228B22" roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 2.4, 0.3]} rotation={[0.3, 0, 0.5]}>
        <coneGeometry args={[0.3, 1.0, 4]} />
        <meshStandardMaterial color="#2d9e2d" roughness={0.8} />
      </mesh>
      <mesh position={[-0.35, 2.3, -0.25]} rotation={[-0.2, 0, -0.4]}>
        <coneGeometry args={[0.28, 0.9, 4]} />
        <meshStandardMaterial color="#1e8c1e" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Rock ───────────────────────────────────────────────────────
function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} rotation={[Math.random() * 0.3, Math.random() * Math.PI, 0]}>
      <dodecahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#4a4a50" roughness={0.95} />
    </mesh>
  );
}

// ─── Island cluster for each city ───────────────────────────────
function IslandCluster({ position, cityId }: { position: [number, number, number]; cityId: string }) {
  const s = ISLAND_SIZES[cityId] ?? 1;
  const segments = IS_MOBILE ? 8 : 16;
  const isStorm = cityId === "storm-zone";
  const isSkull = cityId === "skull-cove";

  const sandColor = isStorm ? "#7a7068" : isSkull ? "#9a8a6a" : "#d4b87a";
  const cliffColor = isStorm ? "#3a3530" : "#6e5535";

  // Seed-based deterministic offsets for props
  const seed = cityId.length + cityId.charCodeAt(0);

  return (
    <group position={position}>
      {/* Main island body — irregular cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[3.2 * s, 3.8 * s, 1.2, segments, 1]} />
        <meshStandardMaterial color={cliffColor} roughness={0.95} />
      </mesh>
      {/* Sand top */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[3.3 * s, 3.0 * s, 0.3, segments, 1]} />
        <meshStandardMaterial color={sandColor} roughness={0.9} />
      </mesh>
      {/* Beach ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <ringGeometry args={[3.0 * s, 4.0 * s, segments]} />
        <meshStandardMaterial color="#e8d5a8" transparent opacity={0.35} roughness={1} />
      </mesh>
      {/* Secondary smaller bump */}
      <mesh position={[1.5 * s, 0.1, 1.2 * s]}>
        <cylinderGeometry args={[1.2 * s, 1.5 * s, 0.8, segments > 8 ? 8 : 6]} />
        <meshStandardMaterial color={cliffColor} roughness={0.95} />
      </mesh>
      <mesh position={[1.5 * s, 0.5, 1.2 * s]}>
        <cylinderGeometry args={[1.3 * s, 1.1 * s, 0.2, segments > 8 ? 8 : 6]} />
        <meshStandardMaterial color={sandColor} roughness={0.9} />
      </mesh>

      {/* Palm trees (skip on storm island) */}
      {!isStorm && (
        <>
          <PalmTree position={[-1.5 * s, 0.6, -0.8 * s]} scale={s * 0.8} />
          <PalmTree position={[0.8 * s, 0.6, -1.6 * s]} scale={s * 0.65} />
          {s > 0.9 && <PalmTree position={[2.2 * s, 0.5, 0.5 * s]} scale={s * 0.55} />}
        </>
      )}

      {/* Rocks around edges */}
      <Rock position={[-3.0 * s, 0.1, 0.5 * s]} scale={s * 1.2} />
      <Rock position={[2.5 * s, 0.0, -2.0 * s]} scale={s * 0.9} />
      <Rock position={[-1.0 * s, 0.0, 2.8 * s]} scale={s * 1.0} />
      {!IS_MOBILE && (
        <>
          <Rock position={[3.2 * s, -0.1, 1.5 * s]} scale={s * 0.7} />
          <Rock position={[-2.5 * s, -0.1, -2.2 * s]} scale={s * 0.8} />
        </>
      )}

      {/* Storm island: extra dark rocks */}
      {isStorm && (
        <>
          <Rock position={[0, 0.7, 0]} scale={s * 1.8} />
          <Rock position={[-1.5 * s, 0.5, 1.0 * s]} scale={s * 1.4} />
        </>
      )}

      {/* Foam ring around island */}
      <IslandFoamRing position={[0, 0.04, 0]} radius={3.5 * s * 1.2} />

      {/* Dock at Harbor Bay */}
      {cityId === "harbor-bay" && <HarborDock position={[2.5 * s, 0, 0]} />}
    </group>
  );
}

// ─── Sea Routes ─────────────────────────────────────────────────
function SeaRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const routeMeshes = useMemo(() => {
    const meshes: { mesh: THREE.Mesh; key: string }[] = [];

    for (const [fromId, toId] of ROUTE_PAIRS) {
      const fromCity = OCEAN_CITIES.find((c) => c.id === fromId);
      const toCity = OCEAN_CITIES.find((c) => c.id === toId);
      if (!fromCity || !toCity) continue;

      const unlocked = unlockedIds.has(fromId) && unlockedIds.has(toId);
      const [x1, , z1] = cityTo3D(fromCity);
      const [x2, , z2] = cityTo3D(toCity);

      // Midpoints for organic curve
      const dx = x2 - x1;
      const dz = z2 - z1;
      const mx1 = x1 + dx * 0.33 + dz * 0.12;
      const mz1 = z1 + dz * 0.33 - dx * 0.12;
      const mx2 = x1 + dx * 0.66 - dz * 0.08;
      const mz2 = z1 + dz * 0.66 + dx * 0.08;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x1, 0.12, z1),
        new THREE.Vector3(mx1, 0.12, mz1),
        new THREE.Vector3(mx2, 0.12, mz2),
        new THREE.Vector3(x2, 0.12, z2),
      ]);

      const geo = new THREE.TubeGeometry(curve, 24, unlocked ? 0.3 : 0.18, 6, false);
      const mat = new THREE.MeshStandardMaterial({
        color: unlocked ? "#40d4f0" : "#1a4a6a",
        transparent: true,
        opacity: unlocked ? 0.75 : 0.3,
        roughness: 0.4,
        emissive: unlocked ? "#20a0c0" : "#000000",
        emissiveIntensity: unlocked ? 0.3 : 0,
      });

      meshes.push({ mesh: new THREE.Mesh(geo, mat), key: `${fromId}-${toId}` });
    }
    return meshes;
  }, [unlockedIds]);

  return (
    <group>
      {routeMeshes.map(({ mesh, key }) => (
        <primitive key={key} object={mesh} />
      ))}
    </group>
  );
}

// ─── Boat ───────────────────────────────────────────────────────
function Boat({ curve, speed, offset }: { curve: THREE.CatmullRomCurve3; speed: number; offset: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = ((clock.getElapsedTime() * speed + offset) % 1 + 1) % 1;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    groupRef.current.position.copy(point);
    groupRef.current.lookAt(point.x + tangent.x, point.y, point.z + tangent.z);
    // Gentle bob
    groupRef.current.position.y += Math.sin(clock.getElapsedTime() * 2 + offset * 10) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {/* Hull */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.5, 0.3, 1.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Sail */}
      <mesh position={[0, 0.8, -0.1]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.4, 1.0, 3]} />
        <meshStandardMaterial color="#f5f0e0" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 0.6, -0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 4]} />
        <meshStandardMaterial color="#5a4020" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Moving boats ───────────────────────────────────────────────
function MovingBoats() {
  const boatCount = IS_MOBILE ? 1 : 3;

  const curves = useMemo(() => {
    const c1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-30, 0.3, -5),
      new THREE.Vector3(-10, 0.3, -20),
      new THREE.Vector3(15, 0.3, -10),
      new THREE.Vector3(30, 0.3, 0),
      new THREE.Vector3(15, 0.3, 12),
      new THREE.Vector3(-10, 0.3, 5),
      new THREE.Vector3(-30, 0.3, -5),
    ], true);
    const c2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(10, 0.3, 30),
      new THREE.Vector3(30, 0.3, 20),
      new THREE.Vector3(40, 0.3, 30),
      new THREE.Vector3(20, 0.3, 35),
      new THREE.Vector3(10, 0.3, 30),
    ], true);
    const c3 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-35, 0.3, 15),
      new THREE.Vector3(-20, 0.3, 25),
      new THREE.Vector3(-5, 0.3, 18),
      new THREE.Vector3(-20, 0.3, 8),
      new THREE.Vector3(-35, 0.3, 15),
    ], true);
    return [c1, c2, c3];
  }, []);

  return (
    <group>
      {curves.slice(0, boatCount).map((curve, i) => (
        <Boat key={`boat-${i}`} curve={curve} speed={0.015 + i * 0.005} offset={i * 0.33} />
      ))}
    </group>
  );
}

// ─── Whale silhouettes ──────────────────────────────────────────
function Whale({ startPos, speed, direction }: { startPos: [number, number, number]; speed: number; direction: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * speed;
    groupRef.current.position.x = startPos[0] + Math.sin(t * 0.3 + direction) * 25;
    groupRef.current.position.z = startPos[2] + Math.cos(t * 0.2 + direction) * 15;
    groupRef.current.position.y = startPos[1] + Math.sin(t * 0.8) * 0.2;
    groupRef.current.rotation.y = Math.atan2(
      Math.cos(t * 0.3 + direction) * 25 * 0.3 * speed,
      -Math.sin(t * 0.2 + direction) * 15 * 0.2 * speed
    );
  });

  return (
    <group ref={groupRef}>
      <mesh scale={[2.5, 0.6, 0.8]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#0a2a3a" transparent opacity={0.5} roughness={1} />
      </mesh>
      {/* Tail */}
      <mesh position={[-2.2, 0.1, 0]} scale={[0.8, 0.4, 1.2]}>
        <sphereGeometry args={[0.5, 4, 3]} />
        <meshStandardMaterial color="#0a2a3a" transparent opacity={0.4} roughness={1} />
      </mesh>
    </group>
  );
}

function Whales() {
  const count = IS_MOBILE ? 1 : 3;
  const whaleData: { startPos: [number, number, number]; speed: number; direction: number }[] = [
    { startPos: [-15, -0.8, 5], speed: 0.12, direction: 0 },
    { startPos: [20, -0.9, -10], speed: 0.09, direction: 2.1 },
    { startPos: [5, -0.7, 20], speed: 0.1, direction: 4.2 },
  ];

  return (
    <group>
      {whaleData.slice(0, count).map((w, i) => (
        <Whale key={`whale-${i}`} {...w} />
      ))}
    </group>
  );
}

// ─── Seagulls ───────────────────────────────────────────────────
function Seagull({ center, radius, speed, height }: { center: [number, number]; radius: number; speed: number; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed;
    meshRef.current.position.x = center[0] + Math.cos(t) * radius;
    meshRef.current.position.z = center[1] + Math.sin(t) * radius;
    meshRef.current.position.y = height + Math.sin(t * 3) * 0.3;
    meshRef.current.rotation.y = -t + Math.PI / 2;
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.15, 0.5, 3]} />
      <meshBasicMaterial color="#f0f0f0" />
    </mesh>
  );
}

function Seagulls() {
  if (IS_MOBILE) return null;
  const gulls = [
    { center: [-25, 10] as [number, number], radius: 6, speed: 0.4, height: 8 },
    { center: [15, 5] as [number, number], radius: 5, speed: 0.5, height: 9 },
    { center: [30, -5] as [number, number], radius: 4, speed: 0.6, height: 7 },
    { center: [0, 25] as [number, number], radius: 5.5, speed: 0.35, height: 8.5 },
  ];
  return (
    <group>
      {gulls.map((g, i) => (
        <Seagull key={`gull-${i}`} {...g} />
      ))}
    </group>
  );
}

// ─── Floating buoys ─────────────────────────────────────────────
function Buoy({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5 + position[0]) * 0.2;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.35, 8, 6]} />
      <meshStandardMaterial color="#e05030" roughness={0.6} />
    </mesh>
  );
}

function Buoys() {
  const positions: [number, number, number][] = [
    [-22, 0.3, 7],
    [7, 0.3, -12],
    [17, 0.3, 3],
    [27, 0.3, 22],
  ];
  const count = IS_MOBILE ? 2 : positions.length;
  return (
    <group>
      {positions.slice(0, count).map((p, i) => (
        <Buoy key={`buoy-${i}`} position={p} />
      ))}
    </group>
  );
}

// ─── Cloud meshes ───────────────────────────────────────────────
function Cloud({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2.5, 6, 5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.6} roughness={1} />
      </mesh>
      <mesh position={[2, -0.3, 0.5]}>
        <sphereGeometry args={[2.0, 6, 5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} />
      </mesh>
      <mesh position={[-1.8, -0.2, -0.3]}>
        <sphereGeometry args={[1.8, 6, 5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} />
      </mesh>
      <mesh position={[0.8, 0.5, -0.5]}>
        <sphereGeometry args={[1.5, 6, 5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={1} />
      </mesh>
    </group>
  );
}

function Clouds() {
  if (IS_MOBILE) return null;
  const positions: [number, number, number][] = [
    [-30, 30, -20],
    [25, 35, -30],
    [40, 28, 10],
    [-15, 32, 30],
  ];
  return (
    <group>
      {positions.map((p, i) => (
        <Cloud key={`cloud-${i}`} position={p} />
      ))}
    </group>
  );
}

// ─── City marker (clickable node) ───────────────────────────────
function OceanCityMarker({
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
  const [x, , z] = cityTo3D(city);
  const size = isNext ? 120 : unlocked ? 104 : 80;

  return (
    <group position={[x, 1.2, z]}>
      {/* Glow ring for unlocked cities */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[3.8, 5.5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#00e5ff" : "#0ea5e9"}
            transparent
            opacity={isNext ? 0.55 : 0.25}
          />
        </mesh>
      )}
      {/* Second subtle outer ring for "next" */}
      {isNext && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
          <ringGeometry args={[5.5, 6.5, 32]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.15} />
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
                ? "radial-gradient(circle at 35% 35%, #e0f7ff, #80d0f0)"
                : "radial-gradient(circle at 35% 35%, #4a5a68, #2a3a48)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#0ea5e9" : "#445566"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.5), 0 0 ${isNext ? 24 : 10}px #0ea5e9${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.4)",
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
              background: unlocked ? "rgba(5,30,50,0.92)" : "rgba(20,30,40,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#667788",
                whiteSpace: "nowrap",
                letterSpacing: 0.5,
              }}
            >
              {city.building[lang]}
            </p>
          </div>

          {/* Stars for completed levels */}
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

          {/* City name */}
          <p
            style={{
              fontSize: 12,
              color: unlocked ? "#60d0ee" : "#556",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {city.name[lang]}
          </p>

          {/* Lock + XP for locked cities */}
          {!unlocked && city.requiredXP > 0 && (
            <span style={{ fontSize: 11, color: "#8899aa", fontWeight: 700, marginTop: 2 }}>
              🔒 {city.requiredXP} XP
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Camera controls ────────────────────────────────────────────
function OceanCameraControls() {
  const controlsRef = useRef<any>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useFrame(() => {
    if (!controlsRef.current) return;
    const t = controlsRef.current.target;
    const dist = controlsRef.current.object.position.distanceTo(t);
    const f = THREE.MathUtils.clamp(dist / 110, 0, 1);
    const maxX = THREE.MathUtils.lerp(60, 5, f);
    const maxZ = THREE.MathUtils.lerp(50, 5, f);
    t.x = THREE.MathUtils.clamp(t.x, -maxX, maxX);
    t.z = THREE.MathUtils.clamp(t.z, -maxZ, maxZ);
    t.y = 0;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enablePan={true}
      enableZoom={true}
      zoomToCursor={!isTouchDevice}
      screenSpacePanning={true}
      enableDamping={true}
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
export function OceanMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(OCEAN_CITIES.filter((c) => totalPoints >= c.requiredXP).map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...OCEAN_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = OCEAN_CITIES.find((c) => !unlockedIds.has(c.id));
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
        background: "linear-gradient(180deg, #6cb4d8 0%, #3a8abf 30%, #1a5a8a 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 55, 50], fov: 45 }}
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

        {/* Sky background */}
        <color attach="background" args={["#76b9d8"]} />
        <fog attach="fog" args={["#76b9d8", 80, 250]} />

        {/* Lighting — warm atmospheric */}
        <hemisphereLight intensity={0.9} color="#ffffff" groundColor="#2b6c8e" />
        <directionalLight position={[20, 30, 10]} intensity={1.2} color="#fff3d6" />
        <ambientLight intensity={0.3} />

        <Suspense fallback={null}>
          <DeepWater />
          <OceanWater size={500} position={[0, -0.15, 0]} segments={IS_MOBILE ? 64 : 128} />
          <SeaRoutes unlockedIds={unlockedIds} />

          {/* Island clusters */}
          {OCEAN_CITIES.map((city) => (
            <IslandCluster key={`island-${city.id}`} position={cityTo3D(city)} cityId={city.id} />
          ))}

          {/* City markers */}
          {OCEAN_CITIES.map((city) => (
            <OceanCityMarker
              key={city.id}
              city={city}
              lang={lang}
              unlocked={unlockedIds.has(city.id)}
              completedLevels={getTopicCompletedLevels(city.topicId)}
              isNext={city.id === nextCityId}
              onSelect={onSelectCity}
            />
          ))}

          {/* Ambient life */}
          <MovingBoats />
          <Whales />
          <Seagulls />
          <Buoys />
          <Clouds />

          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        <OceanCameraControls />
      </Canvas>

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0a2a4a] via-[#1a4a7a] to-[#0a2a4a] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌊
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Setting sail...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
