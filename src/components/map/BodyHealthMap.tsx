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

// ─── Body & Health world cities ─────────────────────────────────
const BODY_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "body-health")?.topicIds ?? []
);
const BODY_CITIES = CITIES.filter((c) => BODY_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions ──────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "heart-core": [0, 0, 0],
  "brain-zone": [0, 4, -18],
  "lungs-area": [-16, 0, -6],
  "skeleton-zone": [16, 0, -6],
  "muscles-area": [-12, -1, 14],
  "medicine-lab": [12, 0, 14],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs (arteries from heart to organs) ────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["heart-core", "brain-zone"],
  ["heart-core", "lungs-area"],
  ["heart-core", "skeleton-zone"],
  ["heart-core", "muscles-area"],
  ["heart-core", "medicine-lab"],
  ["brain-zone", "lungs-area"],
  ["brain-zone", "skeleton-zone"],
  ["lungs-area", "muscles-area"],
  ["skeleton-zone", "medicine-lab"],
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL ELEMENTS
// ═══════════════════════════════════════════════════════════════

// ─── Ground ─────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#180808" roughness={1} />
    </mesh>
  );
}

// ─── Blood cell particles ───────────────────────────────────────
function BloodCells({ count = 20 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 70;
      arr[i * 3 + 1] = Math.random() * 15 - 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    return arr;
  }, [count]);

  const baseSpeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.3 + Math.random() * 0.8;
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const baseX = positions[i * 3];
      const baseY = positions[i * 3 + 1];
      pos.setX(i, baseX + Math.sin(t * baseSpeeds[i] + i) * 2);
      pos.setY(i, baseY + Math.sin(t * baseSpeeds[i] * 0.7 + i * 2) * 1.5);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ff3333"
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0.6}
      />
    </points>
  );
}

// ─── Blood flow routes ──────────────────────────────────────────
function BloodRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const flowRef = useRef<THREE.Group>(null!);

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

  // Blood cell dots flowing along routes
  const flowDots = useMemo(() => {
    const dots: { routeIdx: number; offset: number }[] = [];
    curves.forEach((c, ri) => {
      if (c.bothUnlocked) {
        const count = IS_MOBILE ? 2 : 3;
        for (let i = 0; i < count; i++) {
          dots.push({ routeIdx: ri, offset: i / count });
        }
      }
    });
    return dots;
  }, [curves]);

  useFrame(({ clock }) => {
    if (!flowRef.current) return;
    const t = clock.getElapsedTime();
    flowRef.current.children.forEach((child, i) => {
      const d = flowDots[i];
      if (!d) return;
      const c = curves[d.routeIdx];
      const progress = (t * 0.15 + d.offset) % 1;
      const point = c.curve.getPoint(progress);
      child.position.set(point.x, point.y, point.z);
    });
  });

  return (
    <group>
      {/* Route tubes (red arteries) */}
      {curves.map(({ curve, bothUnlocked }, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 20, 0.1, 4, false]} />
          <meshBasicMaterial
            color={bothUnlocked ? "#cc2222" : "#3a1111"}
            transparent
            opacity={bothUnlocked ? 0.35 : 0.12}
          />
        </mesh>
      ))}
      {/* Flowing blood cell dots */}
      <group ref={flowRef}>
        {flowDots.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.18, 6, 4]} />
            <meshBasicMaterial color="#ff4444" transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZONE COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── 1. Heart (center) ──────────────────────────────────────────
function HeartZone() {
  const heartRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat = 1 + Math.pow(Math.sin(t * 3.2), 6) * 0.08;
    if (heartRef.current) {
      heartRef.current.scale.setScalar(beat);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1 + Math.pow(Math.sin(t * 3.2), 6) * 1.5;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Heart sphere */}
      <mesh ref={heartRef}>
        <sphereGeometry args={[3, 24, 16]} />
        <meshStandardMaterial
          color="#cc1111"
          emissive="#ff2222"
          emissiveIntensity={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Artery stubs going outward */}
      {[
        { dir: [0, 1, -1], rot: [-0.8, 0, 0] },
        { dir: [-1, 0, -0.5], rot: [0, 0, 0.9] },
        { dir: [1, 0, -0.5], rot: [0, 0, -0.9] },
        { dir: [-0.8, 0, 1], rot: [0, 0, 0.6] },
        { dir: [0.8, 0, 1], rot: [0, 0, -0.6] },
      ].map((a, i) => (
        <mesh
          key={i}
          position={[a.dir[0] * 3.2, a.dir[1] * 3.2, a.dir[2] * 3.2]}
          rotation={a.rot as [number, number, number]}
        >
          <cylinderGeometry args={[0.3, 0.15, 2, 6]} />
          <meshStandardMaterial
            color="#aa1111"
            emissive="#cc2222"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Warm pulsing light */}
      <pointLight
        ref={lightRef}
        color="#ff2222"
        intensity={1.5}
        distance={30}
      />
    </group>
  );
}

// ─── 2. Brain ───────────────────────────────────────────────────
function BrainZone() {
  const sparksRef = useRef<THREE.Group>(null!);

  const sparks = useMemo(() => {
    const count = IS_MOBILE ? 3 : 5;
    return Array.from({ length: count }, (_, i) => ({
      speed: 0.8 + Math.random() * 1.2,
      radius: 2.5 + Math.random() * 1.5,
      offset: (i / count) * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!sparksRef.current) return;
    const t = clock.getElapsedTime();
    sparksRef.current.children.forEach((child, i) => {
      const s = sparks[i];
      const angle = t * s.speed + s.offset;
      child.position.set(
        Math.cos(angle) * s.radius,
        s.yOffset + Math.sin(t * 0.5 + i) * 0.5,
        Math.sin(angle) * s.radius
      );
    });
  });

  return (
    <group position={[0, 4, -18]}>
      {/* Brain — icosahedron for bumpy surface */}
      <mesh>
        <icosahedronGeometry args={[2.5, 2]} />
        <meshStandardMaterial
          color="#cc99aa"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Brain folds (slight bumps) */}
      {[
        [0, 2.3, 0.5],
        [1.2, 1.5, 1.5],
        [-1.5, 1.0, -1.0],
        [0.5, -1.8, 1.2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.5, 6, 4]} />
          <meshStandardMaterial color="#bb8899" roughness={0.8} />
        </mesh>
      ))}

      {/* Brain hemispheres groove */}
      <mesh rotation={[0, 0, 0]} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.08, 4, 4]} />
        <meshStandardMaterial color="#aa7788" roughness={0.8} />
      </mesh>

      {/* Electric spark particles */}
      <group ref={sparksRef}>
        {sparks.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial
              color="#44ffff"
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>

      <pointLight color="#8844cc" intensity={0.6} distance={15} />
    </group>
  );
}

// ─── 3. Lungs ───────────────────────────────────────────────────
function LungsZone() {
  const leftRef = useRef<THREE.Mesh>(null!);
  const rightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * 1.8) * 0.06;
    if (leftRef.current) {
      leftRef.current.scale.set(breathe, 1, breathe);
    }
    if (rightRef.current) {
      rightRef.current.scale.set(breathe, 1, breathe);
    }
  });

  return (
    <group position={[-16, 0, -6]}>
      {/* Left lung */}
      <mesh ref={leftRef} position={[-1.5, 0, 0]}>
        <sphereGeometry args={[2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#ee8899"
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Left lung lower half */}
      <mesh position={[-1.5, 0, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#dd7788"
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Right lung */}
      <mesh ref={rightRef} position={[1.5, 0, 0]}>
        <sphereGeometry args={[2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#ee8899"
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Right lung lower half */}
      <mesh position={[1.5, 0, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#dd7788"
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Bronchi (trachea connecting) */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 2, 6]} />
        <meshStandardMaterial color="#cc6677" roughness={0.5} />
      </mesh>
      {/* Bronchi branching */}
      <mesh position={[-0.8, 0.8, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.12, 0.1, 1.5, 6]} />
        <meshStandardMaterial color="#cc6677" roughness={0.5} />
      </mesh>
      <mesh position={[0.8, 0.8, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.12, 0.1, 1.5, 6]} />
        <meshStandardMaterial color="#cc6677" roughness={0.5} />
      </mesh>

      <pointLight color="#4466cc" intensity={0.4} distance={12} />
    </group>
  );
}

// ─── 4. Skeleton ────────────────────────────────────────────────
function SkeletonZone() {
  const shimmerRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!shimmerRef.current) return;
    const t = clock.getElapsedTime();
    shimmerRef.current.children.forEach((child, i) => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
        0.3 + Math.sin(t * 2 + i * 0.8) * 0.2;
    });
  });

  return (
    <group position={[16, 0, -6]}>
      {/* Skull */}
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[1.2, 12, 8]} />
        <meshStandardMaterial color="#eeeeee" roughness={0.5} />
      </mesh>
      {/* Jaw */}
      <mesh position={[0, 2.8, 0.3]}>
        <boxGeometry args={[1, 0.5, 0.8]} />
        <meshStandardMaterial color="#dddddd" roughness={0.5} />
      </mesh>
      {/* Eye sockets */}
      {[-0.35, 0.35].map((x, i) => (
        <mesh key={i} position={[x, 4.2, 1]}>
          <sphereGeometry args={[0.2, 6, 4]} />
          <meshStandardMaterial color="#222222" roughness={0.9} />
        </mesh>
      ))}

      {/* Spine (stacked small boxes) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 2 - i * 0.5, 0]}>
          <boxGeometry args={[0.5, 0.35, 0.4]} />
          <meshStandardMaterial color="#ddddcc" roughness={0.5} />
        </mesh>
      ))}

      {/* Ribs (curved thin boxes) */}
      {[0, 1, 2].map((row) => (
        <group key={row}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 1.2, 1.5 - row * 0.6, 0.2]}
              rotation={[0, 0, side * 0.3]}
            >
              <boxGeometry args={[1.8, 0.12, 0.15]} />
              <meshStandardMaterial color="#ddddcc" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Subtle white shimmer spots */}
      <group ref={shimmerRef}>
        {[
          [0, 4.5, 0.8],
          [1.2, 1, 0.5],
          [-1.2, 0.5, 0.5],
          [0, -1.5, 0.3],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.15, 4, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>

      <pointLight color="#eeeeff" intensity={0.4} distance={12} />
    </group>
  );
}

// ─── 5. Muscles ─────────────────────────────────────────────────
function MusclesZone() {
  const muscleRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    muscleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      // Tension pulse — slight squeeze
      const pulse = 1 + Math.sin(t * 2.5 + i * 1.2) * 0.04;
      mesh.scale.set(pulse, 1, 1 / pulse);
    });
  });

  const muscles = useMemo(() => [
    { pos: [0, 1, 0] as [number, number, number], scaleY: 2.5, r: 0.6 },
    { pos: [-1.5, 0.5, 0.5] as [number, number, number], scaleY: 2, r: 0.5 },
    { pos: [1.5, 0.5, -0.5] as [number, number, number], scaleY: 2, r: 0.5 },
    { pos: [0, -0.5, 1] as [number, number, number], scaleY: 1.8, r: 0.45 },
    { pos: [-1, 1.5, -0.8] as [number, number, number], scaleY: 1.5, r: 0.4 },
  ], []);

  return (
    <group position={[-12, -1, 14]}>
      {/* Muscle shapes (elongated spheres) */}
      {muscles.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) muscleRefs.current[i] = el; }}
          position={m.pos}
          scale={[1, m.scaleY, 1]}
        >
          <sphereGeometry args={[m.r, 10, 8]} />
          <meshStandardMaterial
            color="#cc4455"
            roughness={0.6}
          />
        </mesh>
      ))}

      {/* Fiber lines (thin red cylinders) */}
      {[
        { from: [0, -0.5, 0], to: [0, 2.5, 0] },
        { from: [-1.5, -0.5, 0.5], to: [-1.5, 1.5, 0.5] },
        { from: [1.5, -0.5, -0.5], to: [1.5, 1.5, -0.5] },
      ].map((fiber, i) => {
        const midY = (fiber.from[1] + fiber.to[1]) / 2;
        const length = fiber.to[1] - fiber.from[1];
        return (
          <mesh key={i} position={[fiber.from[0], midY, fiber.from[2]]}>
            <cylinderGeometry args={[0.025, 0.025, length, 4]} />
            <meshBasicMaterial color="#ff6666" transparent opacity={0.5} />
          </mesh>
        );
      })}

      <pointLight color="#cc4455" intensity={0.4} distance={10} />
    </group>
  );
}

// ─── 6. Medicine Lab ────────────────────────────────────────────
function MedicineLabZone() {
  const bubblesRef = useRef<THREE.Group>(null!);

  const bubbles = useMemo(() => {
    const arr: { x: number; z: number; speed: number; maxY: number }[] = [];
    const count = IS_MOBILE ? 4 : 8;
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 3,
        z: (Math.random() - 0.5) * 2,
        speed: 0.3 + Math.random() * 0.4,
        maxY: 2 + Math.random() * 2,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!bubblesRef.current) return;
    const t = clock.getElapsedTime();
    bubblesRef.current.children.forEach((child, i) => {
      const b = bubbles[i];
      if (!b) return;
      child.position.y = 1.8 + ((t * b.speed + i * 0.4) % b.maxY);
      child.position.x = b.x + Math.sin(t * 0.5 + i) * 0.2;
      const progress = ((t * b.speed + i * 0.4) % b.maxY) / b.maxY;
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - progress);
    });
  });

  return (
    <group position={[12, 0, 14]}>
      {/* Lab table */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[5, 0.2, 2.5]} />
        <meshStandardMaterial color="#222233" roughness={0.5} />
      </mesh>

      {/* Test tubes */}
      {[
        { x: -1.5, color: "#22ff44", h: 1.2 },
        { x: -0.8, color: "#4488ff", h: 1.0 },
        { x: -0.1, color: "#ff44aa", h: 1.3 },
        { x: 0.6, color: "#ffaa22", h: 0.9 },
      ].map((tube, i) => (
        <group key={i} position={[tube.x, 0.9, 0]}>
          {/* Glass tube */}
          <mesh position={[0, tube.h / 2 + 0.2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, tube.h, 8]} />
            <meshStandardMaterial
              color="#aabbcc"
              transparent
              opacity={0.4}
              metalness={0.3}
              roughness={0.1}
            />
          </mesh>
          {/* Liquid inside */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.08, tube.h * 0.6, 8]} />
            <meshStandardMaterial
              color={tube.color}
              emissive={tube.color}
              emissiveIntensity={0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      ))}

      {/* Microscope */}
      <group position={[1.5, 0.9, 0]}>
        {/* Base */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 0.3, 8]} />
          <meshStandardMaterial color="#333344" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Column */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.5, 6]} />
          <meshStandardMaterial color="#444455" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Eyepiece */}
        <mesh position={[0.2, 1.8, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.06, 0.1, 0.8, 6]} />
          <meshStandardMaterial color="#333344" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Lens */}
        <mesh position={[0.45, 2.1, 0]}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshStandardMaterial
            color="#44aaff"
            emissive="#2266aa"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* Bubbling liquid particles */}
      <group ref={bubblesRef}>
        {bubbles.map((b, i) => (
          <mesh key={i} position={[b.x, 1.8, b.z]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshBasicMaterial color="#44ffaa" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      <pointLight color="#22aa66" intensity={0.4} distance={10} position={[0, 3, 0]} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CITY MARKER
// ═══════════════════════════════════════════════════════════════

function BodyCityMarker({
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
            color={isNext ? "#ff5555" : "#662222"}
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
                ? "radial-gradient(circle at 35% 35%, #ffbbbb, #6a2222)"
                : "radial-gradient(circle at 35% 35%, #3a3a4e, #1a1a2e)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#cc3333" : "#443333"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.6), 0 0 ${isNext ? 24 : 10}px #ff4444${isNext ? "90" : "40"}`
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
              background: unlocked ? "rgba(30,10,10,0.92)" : "rgba(15,15,30,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#776655",
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
function BodyCameraControls() {
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

export function BodyHealthMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const getTopicCompletedLevels = useProgressStore((s) => s.getTopicCompletedLevels);

  const unlockedIds = useMemo(() => {
    return new Set(BODY_CITIES.map((c) => c.id)); // TODO: restore unlock logic
  }, []);

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...BODY_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = BODY_CITIES.find((c) => !unlockedIds.has(c.id));
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
      style={{ touchAction: "none", background: "#1a0a0a" }}
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

        <color attach="background" args={["#1a0a0a"]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 20, 10]} intensity={0.5} />

        <Suspense fallback={null}>
          <Ground />
          <BloodCells count={IS_MOBILE ? 10 : 20} />
          <BloodRoutes unlockedIds={unlockedIds} />

          <HeartZone />
          <BrainZone />
          <LungsZone />
          <SkeletonZone />
          <MusclesZone />
          <MedicineLabZone />

          {BODY_CITIES.map((city) => (
            <BodyCityMarker
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

        <BodyCameraControls />
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a] via-[#2a1010] to-[#1a0a0a] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-rose-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-red-400 to-rose-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
                &#x2764;&#xFE0F;
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Entering your body...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-red-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-red-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-red-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
