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

// ─── Sports world cities ────────────────────────────────────────
const SPORTS_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "sports-world")?.topicIds ?? []
);
const SPORTS_CITIES = CITIES.filter((c) => SPORTS_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions ──────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "main-stadium": [0, 0, 0],
  "basketball-court": [0, 0, -18],
  "tennis-arena": [18, 0, -8],
  "racing-track": [14, 0, 14],
  "boxing-ring": [-16, 0, 6],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs ────────────────────────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["main-stadium", "basketball-court"],
  ["main-stadium", "tennis-arena"],
  ["main-stadium", "racing-track"],
  ["main-stadium", "boxing-ring"],
  ["basketball-court", "tennis-arena"],
  ["tennis-arena", "racing-track"],
  ["racing-track", "boxing-ring"],
  ["boxing-ring", "basketball-court"],
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL ELEMENTS
// ═══════════════════════════════════════════════════════════════

// ─── Ground ─────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0d1f0d" roughness={1} />
    </mesh>
  );
}

// ─── Energy spark particles ─────────────────────────────────────
function EnergySparks({ count = 30 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 20 + 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  const baseSpeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.5 + Math.random() * 2;
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const baseY = positions[i * 3 + 1];
      pos.setY(i, baseY + Math.sin(t * baseSpeeds[i] + i * 1.3) * 3);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#22ff44"
        size={0.4}
        sizeAttenuation
        transparent
        opacity={0.7}
      />
    </points>
  );
}

// ─── Neon routes with energy pulse ──────────────────────────────
function SportsRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const pulsesRef = useRef<THREE.Group>(null!);

  const curves = useMemo(() => {
    return ROUTE_PAIRS.map(([a, b]) => {
      const posA = CITY_POSITIONS[a] ?? [0, 0, 0];
      const posB = CITY_POSITIONS[b] ?? [0, 0, 0];
      const mid: [number, number, number] = [
        (posA[0] + posB[0]) / 2,
        (posA[1] + posB[1]) / 2 + 3,
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

  useFrame(({ clock }) => {
    if (!pulsesRef.current) return;
    const t = clock.getElapsedTime();
    pulsesRef.current.children.forEach((child, i) => {
      const c = curves[i];
      if (!c.bothUnlocked) return;
      const progress = (t * 0.3 + i * 0.15) % 1;
      const point = c.curve.getPoint(progress);
      child.position.set(point.x, point.y, point.z);
    });
  });

  return (
    <group>
      {curves.map(({ curve, bothUnlocked }, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 20, 0.08, 4, false]} />
          <meshBasicMaterial
            color={bothUnlocked ? "#22ff44" : "#1a3a1a"}
            transparent
            opacity={bothUnlocked ? 0.4 : 0.12}
          />
        </mesh>
      ))}
      <group ref={pulsesRef}>
        {curves.map((c, i) => (
          <mesh key={i} visible={c.bothUnlocked}>
            <sphereGeometry args={[0.25, 6, 4]} />
            <meshBasicMaterial color="#44ff66" transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZONE COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── 1. Stadium (center) ────────────────────────────────────────
function StadiumZone() {
  const crowdRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!crowdRef.current) return;
    const t = clock.getElapsedTime();
    crowdRef.current.children.forEach((child, i) => {
      child.position.y = 1.8 + Math.sin(t * 3 + i * 0.7) * 0.15;
    });
  });

  // Arena wall segments
  const wallSegments = useMemo(() => {
    const segs: { pos: [number, number, number]; rot: number }[] = [];
    const count = IS_MOBILE ? 16 : 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 4.5;
      segs.push({
        pos: [Math.cos(angle) * r, 1, Math.sin(angle) * r],
        rot: angle,
      });
    }
    return segs;
  }, []);

  // Crowd dots
  const crowdDots = useMemo(() => {
    const dots: { pos: [number, number, number] }[] = [];
    const count = IS_MOBILE ? 20 : 40;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 4.3 + Math.random() * 0.6;
      dots.push({
        pos: [Math.cos(angle) * r, 1.8, Math.sin(angle) * r],
      });
    }
    return dots;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Green field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[4, 32]} />
        <meshStandardMaterial color="#228833" roughness={0.8} />
      </mesh>

      {/* Field lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.8, 1.9, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      {/* Arena wall segments (oval bowl) */}
      {wallSegments.map((seg, i) => (
        <mesh key={i} position={seg.pos} rotation={[0, seg.rot, 0]}>
          <boxGeometry args={[1.2, 2.5, 0.4]} />
          <meshStandardMaterial color="#334433" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* 4 Floodlight poles */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => {
        const r = 6;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Pole */}
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 8, 6]} />
              <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Light sphere */}
            <mesh position={[0, 8.2, 0]}>
              <sphereGeometry args={[0.35, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <pointLight
              position={[0, 8.2, 0]}
              color="#eeffee"
              intensity={0.5}
              distance={15}
            />
          </group>
        );
      })}

      {/* Crowd shimmer dots */}
      <group ref={crowdRef}>
        {crowdDots.map((dot, i) => (
          <mesh key={i} position={dot.pos}>
            <sphereGeometry args={[0.08, 4, 4]} />
            <meshBasicMaterial color="#88ff88" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Neon green accent ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[4.8, 5.0, 32]} />
        <meshBasicMaterial
          color="#22ff44"
          transparent
          opacity={0.3}
        />
      </mesh>

      <pointLight color="#22ff44" intensity={1} distance={25} position={[0, 5, 0]} />
    </group>
  );
}

// ─── 2. Basketball Court ────────────────────────────────────────
function BasketballCourtZone() {
  const ballRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ballRef.current) return;
    const t = clock.getElapsedTime();
    // Bouncing ball
    ballRef.current.position.y = 1.5 + Math.abs(Math.sin(t * 3)) * 2;
    ballRef.current.rotation.x = t * 4;
  });

  return (
    <group position={[0, 0, -18]}>
      {/* Court floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <meshStandardMaterial color="#b5651d" roughness={0.7} />
      </mesh>

      {/* Court lines */}
      {[[-2.5, 0], [2.5, 0]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]}>
          <boxGeometry args={[0.05, 5, 0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[0.8, 0.85, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Hoop 1 (left) */}
      <group position={[-3.5, 0, 0]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 3, 6]} />
          <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0.4, 3.8, 0]}>
          <boxGeometry args={[0.8, 0.6, 0.05]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0.4, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.03, 6, 12]} />
          <meshStandardMaterial color="#ff4400" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      {/* Hoop 2 (right) */}
      <group position={[3.5, 0, 0]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 3, 6]} />
          <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.4, 3.8, 0]}>
          <boxGeometry args={[0.8, 0.6, 0.05]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[-0.4, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.03, 6, 12]} />
          <meshStandardMaterial color="#ff4400" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      {/* Bouncing ball */}
      <mesh ref={ballRef} position={[0, 2, 0]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color="#ff8833" roughness={0.6} />
      </mesh>

      <pointLight color="#ffaa44" intensity={0.4} distance={12} position={[0, 5, 0]} />
    </group>
  );
}

// ─── 3. Tennis Arena ────────────────────────────────────────────
function TennisArenaZone() {
  const ballRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ballRef.current) return;
    const t = clock.getElapsedTime();
    ballRef.current.position.x = Math.sin(t * 2) * 3;
    ballRef.current.position.y = 1.2 + Math.abs(Math.sin(t * 4)) * 0.5;
    ballRef.current.position.z = Math.sin(t * 1.5) * 0.5;
  });

  return (
    <group position={[18, 0, -8]}>
      {/* Green court surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <meshStandardMaterial color="#2d7a3a" roughness={0.6} />
      </mesh>

      {/* Court boundary lines */}
      {[[-4, 0], [4, 0]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]}>
          <boxGeometry args={[0.06, 5, 0.06]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[[0, -2.5], [0, 2.5]].map(([x, z], i) => (
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]}>
          <boxGeometry args={[8, 0.06, 0.06]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Net (thin plane across middle) */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.05, 1.2, 5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.6} roughness={0.8} />
      </mesh>
      {/* Net posts */}
      {[-2.6, 2.6].map((z, i) => (
        <mesh key={i} position={[0, 0.8, z]}>
          <cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
          <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      {/* Ball moving side to side */}
      <mesh ref={ballRef} position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial
          color="#ccff00"
          emissive="#88aa00"
          emissiveIntensity={0.4}
          roughness={0.5}
        />
      </mesh>

      <pointLight color="#88ff88" intensity={0.3} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ─── 4. Racing Track ────────────────────────────────────────────
function RacingTrackZone() {
  const carRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const trailPositions = useMemo(() => new Float32Array(20 * 3), []);

  useFrame(({ clock }) => {
    if (!carRef.current) return;
    const t = clock.getElapsedTime();
    const angle = t * 0.8;
    const rx = 4;
    const rz = 2.5;
    const x = Math.cos(angle) * rx;
    const z = Math.sin(angle) * rz;
    carRef.current.position.set(x, 0.5, z);
    carRef.current.rotation.y = -angle + Math.PI / 2;

    // Update trail
    if (trailRef.current) {
      const positions = trailRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 19; i > 0; i--) {
        positions.setXYZ(
          i,
          positions.getX(i - 1),
          positions.getY(i - 1),
          positions.getZ(i - 1)
        );
      }
      positions.setXYZ(0, x, 0.5, z);
      positions.needsUpdate = true;
    }
  });

  return (
    <group position={[14, 0, 14]}>
      {/* Oval track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[3.5, 1.2, 2, 32]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>

      {/* Track center (grass) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[2.3, 24]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.9} />
      </mesh>

      {/* Car */}
      <group ref={carRef}>
        <mesh>
          <boxGeometry args={[0.6, 0.3, 1]} />
          <meshStandardMaterial color="#ff2222" metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 0.2, -0.1]}>
          <boxGeometry args={[0.5, 0.2, 0.4]} />
          <meshStandardMaterial color="#aaddff" metalness={0.7} roughness={0.1} />
        </mesh>
        <pointLight color="#22ff44" intensity={0.5} distance={3} position={[0, 0, -0.6]} />
      </group>

      {/* Neon trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#22ff44"
          size={0.2}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      <pointLight color="#22ff44" intensity={0.3} distance={10} position={[0, 3, 0]} />
    </group>
  );
}

// ─── 5. Boxing Ring ─────────────────────────────────────────────
function BoxingRingZone() {
  const lightRefs = useRef<THREE.PointLight[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    lightRefs.current.forEach((light, i) => {
      if (light) {
        light.intensity = 0.3 + Math.sin(t * 4 + i * Math.PI / 2) * 0.3;
      }
    });
  });

  const corners: [number, number, number][] = [
    [-2, 0, -2],
    [2, 0, -2],
    [2, 0, 2],
    [-2, 0, 2],
  ];

  // Ropes between consecutive corners
  const ropeSegments = useMemo(() => {
    const segs: { from: [number, number, number]; to: [number, number, number]; h: number }[] = [];
    for (let ci = 0; ci < 4; ci++) {
      const next = (ci + 1) % 4;
      for (const h of [1.0, 1.6, 2.2]) {
        segs.push({
          from: [corners[ci][0], h, corners[ci][2]],
          to: [corners[next][0], h, corners[next][2]],
          h,
        });
      }
    }
    return segs;
  }, []);

  return (
    <group position={[-16, 0, 6]}>
      {/* Ring platform */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[5, 0.6, 5]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.7} />
      </mesh>

      {/* Ring mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.62, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#ddddcc" roughness={0.8} />
      </mesh>

      {/* Corner posts */}
      {corners.map((pos, i) => (
        <group key={i}>
          <mesh position={[pos[0], 1.5, pos[2]]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
            <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Red corner light */}
          <mesh position={[pos[0], 2.8, pos[2]]}>
            <sphereGeometry args={[0.12, 6, 4]} />
            <meshBasicMaterial color="#ff2222" />
          </mesh>
          <pointLight
            ref={(el) => { if (el) lightRefs.current[i] = el; }}
            position={[pos[0], 2.8, pos[2]]}
            color="#ff2222"
            intensity={0.3}
            distance={5}
          />
        </group>
      ))}

      {/* Ropes (thin cylinders between posts) */}
      {ropeSegments.map((seg, i) => {
        const dx = seg.to[0] - seg.from[0];
        const dz = seg.to[2] - seg.from[2];
        const len = Math.sqrt(dx * dx + dz * dz);
        const midX = (seg.from[0] + seg.to[0]) / 2;
        const midZ = (seg.from[2] + seg.to[2]) / 2;
        const angle = Math.atan2(dx, dz);
        return (
          <mesh
            key={i}
            position={[midX, seg.h, midZ]}
            rotation={[0, angle, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.025, 0.025, len, 4]} />
            <meshStandardMaterial color="#dddddd" roughness={0.5} />
          </mesh>
        );
      })}

      <pointLight color="#ff8844" intensity={0.5} distance={10} position={[0, 4, 0]} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CITY MARKER
// ═══════════════════════════════════════════════════════════════

function SportsCityMarker({
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
    <group position={[x, y + 4, z]}>
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
          <ringGeometry args={[2.5, 4, 24]} />
          <meshBasicMaterial
            color={isNext ? "#44ff66" : "#226633"}
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
                ? "radial-gradient(circle at 35% 35%, #b0ffb0, #1a6633)"
                : "radial-gradient(circle at 35% 35%, #3a3a4e, #1a1a2e)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#22cc44" : "#334433"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.6), 0 0 ${isNext ? 24 : 10}px #22ff44${isNext ? "90" : "40"}`
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
              background: unlocked ? "rgba(10,30,10,0.92)" : "rgba(15,15,30,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#556655",
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
function SportsCameraControls() {
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

export function SportsMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const getTopicCompletedLevels = useProgressStore((s) => s.getTopicCompletedLevels);

  const unlockedIds = useMemo(() => {
    return new Set(SPORTS_CITIES.map((c) => c.id)); // TODO: restore unlock logic
  }, []);

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...SPORTS_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = SPORTS_CITIES.find((c) => !unlockedIds.has(c.id));
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
      style={{ touchAction: "none", background: "#0a1a0a" }}
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

        <color attach="background" args={["#0a1a0a"]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} />

        <Suspense fallback={null}>
          <Ground />
          <EnergySparks count={IS_MOBILE ? 15 : 30} />
          <SportsRoutes unlockedIds={unlockedIds} />

          <StadiumZone />
          <BasketballCourtZone />
          <TennisArenaZone />
          <RacingTrackZone />
          <BoxingRingZone />

          {SPORTS_CITIES.map((city) => (
            <SportsCityMarker
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

        <SportsCameraControls />
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0a1a0a] via-[#0d2a0d] to-[#0a1a0a] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
                &#x26BD;
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Entering the arena...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-green-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-green-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-green-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
