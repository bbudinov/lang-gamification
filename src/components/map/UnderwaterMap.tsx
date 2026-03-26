"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor, shaderMaterial } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

const underwaterWorld = WORLDS.find((w) => w.id === "underwater")!;
const UNDERWATER_CITIES = CITIES.filter((c) => underwaterWorld.topicIds.includes(c.topicId));

// ─── City positions with depth ───────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "coral-city":         [-20, -1,  -15],
  "deep-sea-dome":      [ 15, -5,  -10],
  "shipwreck-cove":     [ 30, -2,  -20],
  "kelp-forest":        [-30, -1,    0],
  "submarine-base":     [  5, -8,    5],
  "abyss-zone":         [ 25, -14,  15],
  "bubble-town":        [-15, -6,   15],
  "treasure-vault":     [ 10, -10,  20],
  "underwater-volcano":  [  0, -12,  30],
};

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [(city.pos.x - 50) * 1.2, -3, (city.pos.y - 50) * 1.2];
}

function getDepthZone(y: number): "shallow" | "mid" | "abyss" {
  if (y > -3) return "shallow";
  if (y > -8) return "mid";
  return "abyss";
}

const DEPTH_LABELS: Record<string, string> = { shallow: "Shallow", mid: "Deep", abyss: "Abyss" };

// ─── Coral palette (upgraded — more vivid) ───────────────────────
const CORAL_SHALLOW = ["#FF1493", "#9B30FF", "#FF6600", "#FFD700", "#FF4040", "#FF69B4", "#7B68EE", "#00FF7F"];
const CORAL_DEEP    = ["#1E3A5F", "#0E4D6E", "#3B1F6E", "#0D9488", "#155E75"];

function getCoralColors(y: number): string[] {
  return y > -3 ? CORAL_SHALLOW : y > -8
    ? CORAL_SHALLOW.map((c, i) => i % 2 === 0 ? c : CORAL_DEEP[i % CORAL_DEEP.length])
    : CORAL_DEEP;
}

// ─── Seeded random helper ────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Background Gradient Shader ──────────────────────────────────
const OceanGradientMaterial = shaderMaterial(
  {},
  // vertex
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  // fragment
  `varying vec2 vUv;
   void main() {
     vec3 top    = vec3(0.102, 0.420, 0.541);   // #1a6b8a
     vec3 mid    = vec3(0.051, 0.290, 0.420);   // #0d4a6b
     vec3 bottom = vec3(0.012, 0.051, 0.094);   // #030d18
     vec3 color;
     if (vUv.y > 0.5) {
       color = mix(mid, top, (vUv.y - 0.5) * 2.0);
     } else {
       color = mix(bottom, mid, vUv.y * 2.0);
     }
     gl_FragColor = vec4(color, 1.0);
   }`
);

extend({ OceanGradientMaterial });

// Type augmentation for R3F
declare module "@react-three/fiber" {
  interface ThreeElements {
    oceanGradientMaterial: React.JSX.IntrinsicElements["shaderMaterial"];
  }
}

function OceanBackground() {
  return (
    <mesh position={[0, 0, -80]} renderOrder={-1}>
      <planeGeometry args={[300, 200]} />
      <oceanGradientMaterial depthWrite={false} />
    </mesh>
  );
}

// ─── Depth Layer Planes ─────────────────────────────────────────
function DepthLayers() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshBasicMaterial color="#0A4D6E" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshBasicMaterial color="#061220" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// ─── Underwater Dust Particles ──────────────────────────────────
function UnderwaterDust({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = Array.from({ length: count }, () => ({
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.01,
      vz: (Math.random() - 0.5) * 0.02,
    }));
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = -16 + Math.random() * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += velocities[i].vx;
      arr[i * 3 + 1] += velocities[i].vy;
      arr[i * 3 + 2] += velocities[i].vz;
      if (arr[i * 3] > 50) arr[i * 3] = -50;
      if (arr[i * 3] < -50) arr[i * 3] = 50;
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = -16;
      if (arr[i * 3 + 1] < -16) arr[i * 3 + 1] = 4;
      if (arr[i * 3 + 2] > 50) arr[i * 3 + 2] = -50;
      if (arr[i * 3 + 2] < -50) arr[i * 3 + 2] = 50;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.35} depthWrite={false} sizeAttenuation />
    </points>
  );
}

// ─── Seagrass Meadow ────────────────────────────────────────────
function SeagrassMeadow({ position, seed }: { position: [number, number, number]; seed: number }) {
  const count = IS_MOBILE ? 8 : 20;
  const groupRef = useRef<THREE.Group>(null!);
  const GREENS = ["#2d8a4e", "#1e7a3a", "#3d9a5e", "#25804a", "#48a860"];

  const blades = useMemo(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 6,
      z: (rng() - 0.5) * 6,
      height: 1.5 + rng() * 1.5,
      phase: rng() * Math.PI * 2,
      speed: 0.4 + rng() * 0.4,
      color: GREENS[Math.floor(rng() * GREENS.length)],
    }));
  }, [seed, count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const b = blades[i];
      children[i].rotation.x = Math.sin(t * b.speed + b.phase) * 0.12;
      children[i].rotation.z = Math.sin(t * b.speed * 0.7 + b.phase + 1) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {blades.map((b, i) => (
        <mesh key={i} position={[b.x, b.height / 2, b.z]}>
          <planeGeometry args={[0.15, b.height]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.1} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Fan Corals ─────────────────────────────────────────────────
function FanCorals({ isMobile }: { isMobile: boolean }) {
  const FAN_COLORS = ["#9B30FF", "#FF69B4", "#FF6600", "#E040FB", "#FF1493"];
  const fans = useMemo(() => {
    const count = isMobile ? 4 : 10;
    const rng = seededRandom(777);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 80,
      z: (rng() - 0.5) * 80,
      y: -16.5 + rng() * 0.5,
      rotY: rng() * Math.PI,
      radius: 0.6 + rng() * 0.8,
      color: FAN_COLORS[Math.floor(rng() * FAN_COLORS.length)],
    }));
  }, [isMobile]);

  return (
    <>
      {fans.map((f, i) => (
        <mesh key={i} position={[f.x, f.y + f.radius, f.z]} rotation={[0, f.rotY, 0]}>
          <circleGeometry args={[f.radius, 12, 0, Math.PI]} />
          <meshStandardMaterial color={f.color} emissive={f.color} emissiveIntensity={0.2} side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      ))}
    </>
  );
}

// ─── Tube Sponges ───────────────────────────────────────────────
function TubeSponges({ isMobile }: { isMobile: boolean }) {
  const clusterCount = isMobile ? 2 : 5;
  const SPONGE_COLORS = ["#FFA500", "#FFD700", "#FF8C00", "#DAA520"];
  const clusters = useMemo(() => {
    const rng = seededRandom(333);
    return Array.from({ length: clusterCount }, () => {
      const cx = (rng() - 0.5) * 70;
      const cz = (rng() - 0.5) * 70;
      const tubeCount = 3 + Math.floor(rng() * 3);
      return Array.from({ length: tubeCount }, () => ({
        x: cx + (rng() - 0.5) * 1.5,
        z: cz + (rng() - 0.5) * 1.5,
        height: 1 + rng() * 1,
        radius: 0.1 + rng() * 0.1,
        color: SPONGE_COLORS[Math.floor(rng() * SPONGE_COLORS.length)],
      }));
    });
  }, [clusterCount]);

  return (
    <>
      {clusters.flat().map((s, i) => (
        <mesh key={i} position={[s.x, -16.5 + s.height / 2, s.z]}>
          <cylinderGeometry args={[s.radius, s.radius * 1.2, s.height, 6]} />
          <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </>
  );
}

// ─── Sea Anemones (pulsing) ─────────────────────────────────────
function SeaAnemonesScattered({ isMobile }: { isMobile: boolean }) {
  const clusterCount = isMobile ? 3 : 7;
  const ANEMONE_COLORS = ["#FF69B4", "#9B30FF", "#FF6347", "#FF1493", "#DA70D6"];
  const groupRef = useRef<THREE.Group>(null!);

  const clusters = useMemo(() => {
    const rng = seededRandom(555);
    return Array.from({ length: clusterCount }, () => {
      const cx = (rng() - 0.5) * 70;
      const cz = (rng() - 0.5) * 70;
      const count = 3 + Math.floor(rng() * 4);
      return Array.from({ length: count }, () => ({
        x: cx + (rng() - 0.5) * 2,
        z: cz + (rng() - 0.5) * 2,
        stalkH: 0.3 + rng() * 0.4,
        tipR: 0.06 + rng() * 0.06,
        color: ANEMONE_COLORS[Math.floor(rng() * ANEMONE_COLORS.length)],
        phase: rng() * Math.PI * 2,
      }));
    }).flat();
  }, [clusterCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const pulse = 1 + Math.sin(t * 1.5 + clusters[i].phase) * 0.2;
      children[i].scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {clusters.map((a, i) => (
        <group key={i} position={[a.x, -16.5, a.z]}>
          <mesh position={[0, a.stalkH / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.03, a.stalkH, 4]} />
            <meshStandardMaterial color={a.color} />
          </mesh>
          <mesh position={[0, a.stalkH, 0]}>
            <sphereGeometry args={[a.tipR, 6, 4]} />
            <meshStandardMaterial color={a.color} emissive={a.color} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Sea Fan Props (existing, on platforms) ─────────────────────
function SeaFans({ position, index }: { position: [number, number, number]; index: number }) {
  const fans = useMemo(() => {
    const seed = index * 97;
    return Array.from({ length: 3 }, (_, i) => {
      const angle = ((seed + i * 120) % 360) * (Math.PI / 180);
      const dist = 2 + ((seed + i * 13) % 10) / 10;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotY: angle + 0.3,
        height: 0.8 + ((seed + i * 7) % 10) / 10 * 0.6,
        color: CORAL_SHALLOW[(seed + i) % CORAL_SHALLOW.length],
      };
    });
  }, [index]);

  return (
    <group position={position}>
      {fans.map((f, i) => (
        <mesh key={i} position={[f.x, f.height / 2 + 0.1, f.z]} rotation={[0, f.rotY, 0]}>
          <planeGeometry args={[0.6, f.height]} />
          <meshStandardMaterial color={f.color} emissive={f.color} emissiveIntensity={0.15} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Anemone Clusters (on platforms — existing) ─────────────────
function AnemoneCluster({ position, index }: { position: [number, number, number]; index: number }) {
  const anemones = useMemo(() => {
    const seed = index * 53;
    return Array.from({ length: 5 }, (_, i) => ({
      x: ((seed + i * 17) % 20 - 10) / 10 * 0.8,
      z: ((seed + i * 31) % 20 - 10) / 10 * 0.8,
      scale: 0.08 + ((seed + i * 7) % 10) / 100,
      color: CORAL_SHALLOW[(seed + i) % CORAL_SHALLOW.length],
    }));
  }, [index]);

  return (
    <group position={[position[0], position[1] + 0.15, position[2]]}>
      {anemones.map((a, i) => (
        <mesh key={i} position={[a.x, 0, a.z]}>
          <sphereGeometry args={[a.scale, 6, 4]} />
          <meshStandardMaterial color={a.color} emissive={a.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Coral Reef Platform (upgraded coral variety) ────────────────
function CoralPlatform({
  position,
  index,
  isMobile,
}: {
  position: [number, number, number];
  index: number;
  isMobile: boolean;
}) {
  const zone = getDepthZone(position[1]);
  const palette = getCoralColors(position[1]);
  const isGlowing = zone === "abyss";
  const isShallow = zone === "shallow";
  const coralCount = isMobile ? 3 : (isShallow ? 8 : 5);
  const heightMultiplier = isShallow ? 1.5 : zone === "mid" ? 1.0 : 0.7;

  const corals = useMemo(() => {
    const seed = index * 137;
    return Array.from({ length: coralCount }, (_, i) => {
      const angle = ((seed + i * 72) % 360) * (Math.PI / 180);
      const dist = 0.6 + (((seed + i * 7) % 10) / 10) * 0.9;
      const tiltX = ((seed + i * 11) % 60 - 30) * (Math.PI / 180);
      const tiltZ = ((seed + i * 17) % 60 - 30) * (Math.PI / 180);
      // Variety: 0=branch, 1=round, 2=flat disc
      const shapeType = i % 3;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: (0.5 + (((seed + i * 13) % 10) / 10) * 1.4) * heightMultiplier,
        radius: 0.12 + (((seed + i * 3) % 10) / 10) * 0.18,
        tiltX,
        tiltZ,
        color: palette[(seed + i) % palette.length],
        hasBranch: isShallow && i % 2 === 0,
        shapeType,
      };
    });
  }, [index, coralCount, palette, heightMultiplier, isShallow]);

  return (
    <group position={position}>
      {/* Base rock */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[2.2, 3, 1.4, 7]} />
        <meshStandardMaterial color="#2D3748" roughness={0.95} />
      </mesh>
      <mesh position={[1.2, -0.2, 0.5]} rotation={[0.1, 0.4, 0]}>
        <cylinderGeometry args={[1, 1.5, 0.8, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>

      {/* Coral branches with variety */}
      {corals.map((c, i) => (
        <group key={i} position={[c.x, 0.2, c.z]} rotation={[c.tiltX, 0, c.tiltZ]}>
          {c.shapeType === 0 && (
            <>
              {/* Branch coral */}
              <mesh position={[0, c.height / 2, 0]}>
                <cylinderGeometry args={[c.radius * 0.5, c.radius, c.height, 6]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={isGlowing ? 0.6 : isShallow ? 0.25 : 0.12} />
              </mesh>
              <mesh position={[0, c.height + 0.1, 0]}>
                <coneGeometry args={[c.radius * 0.7, 0.3, 5]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={isGlowing ? 0.8 : isShallow ? 0.3 : 0.2} />
              </mesh>
            </>
          )}
          {c.shapeType === 1 && (
            /* Round/brain coral */
            <mesh position={[0, c.radius * 1.5, 0]}>
              <sphereGeometry args={[c.radius * 2, 8, 6]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={isGlowing ? 0.6 : isShallow ? 0.25 : 0.12} roughness={0.6} />
            </mesh>
          )}
          {c.shapeType === 2 && (
            /* Flat disc coral */
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[c.radius * 2.5, 10]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={isGlowing ? 0.5 : isShallow ? 0.25 : 0.1} side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* Extra side branch for shallow corals (branch type) */}
          {c.hasBranch && c.shapeType === 0 && (
            <group position={[0, c.height * 0.6, 0]} rotation={[0.4, 0, 0.5]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[c.radius * 0.3, c.radius * 0.5, 0.6, 5]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.2} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

// ─── City Marker (Html overlay) ──────────────────────────────────
function CityMarker({
  city,
  lang,
  unlocked,
  onSelect,
  position,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
  position: [number, number, number];
}) {
  const zone = getDepthZone(position[1]);

  return (
    <group position={[position[0], position[1] + 4, position[2]]}>
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
          <ringGeometry args={[2.5, 3, 32]} />
          <meshStandardMaterial
            color={zone === "abyss" ? "#06B6D4" : "#2DD4BF"}
            emissive={zone === "abyss" ? "#06B6D4" : "#2DD4BF"}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <Html center distanceFactor={30} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center gap-0.5"
          style={{ cursor: unlocked ? "pointer" : "default" }}
        >
          <span style={{ fontSize: 28 }}>{unlocked ? city.emoji : "🔒"}</span>
          <div
            className="px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: unlocked ? "rgba(6,182,212,0.85)" : "rgba(20,40,60,0.7)",
              border: unlocked ? "1px solid rgba(45,212,191,0.5)" : "1px solid rgba(60,80,100,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: unlocked ? "#fff" : "#667" }}>
              {city.name[lang]}
            </p>
          </div>
          <span
            className="text-[8px] font-medium tracking-wider uppercase"
            style={{ color: zone === "abyss" ? "#06B6D4" : zone === "mid" ? "#5EADB0" : "#7EDCD0" }}
          >
            {DEPTH_LABELS[zone]}
          </span>
          {!unlocked && city.requiredXP > 0 && (
            <span className="text-[9px] font-medium" style={{ color: "#c8a050" }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Bubbles (instanced) ─────────────────────────────────────────
function Bubbles({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 120,
        speed: 0.4 + Math.random() * 1.2,
        offset: Math.random() * 100,
        scale: 0.08 + Math.random() * 0.2,
        wobble: 0.3 + Math.random() * 1.2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    bubbles.forEach((b, i) => {
      const y = ((t * b.speed + b.offset) % 40) - 18;
      dummy.position.set(
        b.x + Math.sin(t * b.wobble + b.offset) * 2,
        y,
        b.z + Math.cos(t * b.wobble * 0.7 + b.offset) * 2,
      );
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}

// ─── Fish School (instanced) — improved with shimmer ─────────────
function FishSchool({
  anchor,
  color,
  fishCount,
}: {
  anchor: [number, number, number];
  color: string;
  fishCount: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fishData = useMemo(
    () =>
      Array.from({ length: fishCount }, (_, i) => ({
        offset: (i / fishCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        radius: 3 + Math.random() * 4,
        yOff: (Math.random() - 0.5) * 3,
        speed: 0.2 + Math.random() * 0.35,
        scale: 0.15 + Math.random() * 0.15,
        wobbleFreq: 0.3 + Math.random() * 0.7,
        wobbleAmp: 0.5 + Math.random() * 1.0,
        radiusOsc: 0.5 + Math.random() * 1.5,
        radiusOscFreq: 0.1 + Math.random() * 0.2,
      })),
    [fishCount],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.08;

    // Shimmer effect on material
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.1 + Math.sin(t * 3) * 0.08;
    }

    fishData.forEach((f, i) => {
      const angle = t * f.speed + f.offset;
      const r = f.radius + Math.sin(t * f.radiusOscFreq + f.offset) * f.radiusOsc;
      dummy.position.set(
        Math.cos(angle) * r,
        f.yOff + Math.sin(t * f.wobbleFreq + f.offset) * f.wobbleAmp,
        Math.sin(angle) * r,
      );
      dummy.rotation.y = -angle + Math.PI / 2;
      dummy.rotation.z = Math.cos(angle) * 0.15;
      dummy.scale.set(f.scale * 2, f.scale, f.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={anchor}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, fishCount]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial ref={matRef} color={color} emissive={color} emissiveIntensity={0.1} metalness={0.4} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

// ─── Background Fish (ambient tiny fish — instanced) ─────────────
function BackgroundFish({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const FISH_COLORS_LIST = [0x3b82f6, 0xf97316, 0xc0c0c0, 0xff6b9d, 0x2dd4bf, 0xfacc15, 0xa78bfa];

  const fishData = useMemo(() => {
    const rng = seededRandom(999);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 100,
      y: -15 + rng() * 18,
      z: (rng() - 0.5) * 100,
      vx: (rng() - 0.5) * 0.03,
      vy: (rng() - 0.5) * 0.01,
      vz: (rng() - 0.5) * 0.03,
      colorIndex: Math.floor(rng() * FISH_COLORS_LIST.length),
    }));
  }, [count]);

  // Set colors once
  useMemo(() => {
    // Will be set on first frame
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const f = fishData[i];
      f.x += f.vx;
      f.y += f.vy;
      f.z += f.vz;
      if (f.x > 50) f.x = -50;
      if (f.x < -50) f.x = 50;
      if (f.y > 3) f.vy = -Math.abs(f.vy);
      if (f.y < -16) f.vy = Math.abs(f.vy);
      if (f.z > 50) f.z = -50;
      if (f.z < -50) f.z = 50;
      dummy.position.set(f.x, f.y, f.z);
      dummy.scale.set(0.16, 0.08, 0.08);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(FISH_COLORS_LIST[f.colorIndex]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 3]} />
      <meshStandardMaterial metalness={0.3} roughness={0.5} />
    </instancedMesh>
  );
}

// ─── Jellyfish (improved transparency + colors) ─────────────────
function Jellyfish({ startPos, color }: { startPos: [number, number, number]; color: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const bellRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const offset = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const y = ((t * 0.15 + offset) % 25) - 16;
    groupRef.current.position.set(
      startPos[0] + Math.sin(t * 0.2 + offset) * 3,
      y,
      startPos[2] + Math.cos(t * 0.15 + offset) * 3,
    );
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.5 + Math.sin(t * 1.5 + offset) * 0.3;
    }
    // Pulsing bell animation
    if (bellRef.current) {
      const pulse = 1 + Math.sin(t * 2 + offset) * 0.15;
      bellRef.current.scale.set(pulse, 1 / pulse, pulse);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bellRef}>
        <mesh>
          <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            ref={matRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* Thinner, longer tentacles — 6 total */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.35, -1.5, Math.sin(angle) * 0.35]}>
            <cylinderGeometry args={[0.015, 0.01, 3, 3]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Light Rays (stronger, more dramatic) ───────────────────────
function LightRays() {
  const raysRef = useRef<THREE.Group>(null!);

  const rays = useMemo(() => [
    { pos: [-10, 8, -12] as [number, number, number], rotZ: 0.15, tint: "#FFE8B0" },
    { pos: [8, 10, -8] as [number, number, number], rotZ: -0.1, tint: "#FFF5D6" },
    { pos: [20, 7, -18] as [number, number, number], rotZ: 0.08, tint: "#FFE8B0" },
    { pos: [-25, 9, -5] as [number, number, number], rotZ: 0.12, tint: "#FFF0C0" },
    { pos: [0, 9, -15] as [number, number, number], rotZ: -0.05, tint: "#D4E8F0" },
    { pos: [-18, 8, -20] as [number, number, number], rotZ: 0.18, tint: "#FFE0A0" },
    { pos: [30, 9, -12] as [number, number, number], rotZ: -0.12, tint: "#C8DEF0" },
  ], []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = raysRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const baseRot = rays[i].rotZ;
      const swayAmount = 0.04 + i * 0.008;
      const swaySpeed = 0.2 + i * 0.06;
      children[i].rotation.z = baseRot + Math.sin(t * swaySpeed + i * 0.5) * swayAmount;
      children[i].rotation.x = Math.sin(t * swaySpeed * 0.5 + i) * 0.015;
    }
  });

  return (
    <group ref={raysRef}>
      {rays.map((ray, i) => (
        <mesh key={i} position={ray.pos} rotation={[0, 0, ray.rotZ]}>
          <coneGeometry args={[6, 28, 8, 1, true]} />
          <meshStandardMaterial
            color={ray.tint}
            transparent
            opacity={0.17}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Sea Floor (with rocks, sand, shells) ────────────────────────
function SeaFloor({ isMobile }: { isMobile: boolean }) {
  const rockCount = isMobile ? 8 : 18;
  const sandCount = isMobile ? 4 : 10;
  const shellCount = isMobile ? 3 : 8;

  const details = useMemo(() => {
    const rng = seededRandom(1234);
    const rocks = Array.from({ length: rockCount }, () => ({
      x: (rng() - 0.5) * 100,
      z: (rng() - 0.5) * 100,
      r: 0.3 + rng() * 0.7,
    }));
    const sand = Array.from({ length: sandCount }, () => ({
      x: (rng() - 0.5) * 90,
      z: (rng() - 0.5) * 90,
      r: 1.5 + rng() * 3,
    }));
    const shells = Array.from({ length: shellCount }, () => ({
      x: (rng() - 0.5) * 80,
      z: (rng() - 0.5) * 80,
    }));
    return { rocks, sand, shells };
  }, [rockCount, sandCount, shellCount]);

  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -17, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#091520" roughness={1} />
      </mesh>
      {/* Existing bumps */}
      {[
        [-25, -16.5, 10],
        [20, -16, -5],
        [35, -16.5, 25],
        [-10, -16.2, 30],
        [0, -16, -20],
      ].map((p, i) => (
        <mesh key={`bump-${i}`} position={p as [number, number, number]}>
          <sphereGeometry args={[3 + i * 0.5, 6, 5]} />
          <meshStandardMaterial color="#0D1B2A" roughness={1} />
        </mesh>
      ))}
      {/* Scattered rocks */}
      {details.rocks.map((r, i) => (
        <mesh key={`rock-${i}`} position={[r.x, -16.8, r.z]}>
          <sphereGeometry args={[r.r, 5, 4]} />
          <meshStandardMaterial color="#1a2030" roughness={0.95} />
        </mesh>
      ))}
      {/* Sand patches */}
      {details.sand.map((s, i) => (
        <mesh key={`sand-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, -16.95, s.z]}>
          <circleGeometry args={[s.r, 10]} />
          <meshBasicMaterial color="#c2a87d" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
      {/* Shells */}
      {details.shells.map((sh, i) => (
        <mesh key={`shell-${i}`} position={[sh.x, -16.9, sh.z]}>
          <sphereGeometry args={[0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f0e8d8" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Underwater Cliffs (between depth zones) ─────────────────────
function UnderwaterCliffs() {
  return (
    <>
      <mesh position={[-5, -5, -5]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[35, 6, 2]} />
        <meshStandardMaterial color="#1A2D42" roughness={0.9} />
      </mesh>
      <mesh position={[20, -5.5, 2]} rotation={[0, -0.5, 0.05]}>
        <boxGeometry args={[20, 5, 2.5]} />
        <meshStandardMaterial color="#15263B" roughness={0.95} />
      </mesh>
      <mesh position={[10, -11, 12]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[40, 5, 2]} />
        <meshStandardMaterial color="#0E1C2E" roughness={0.95} />
      </mesh>
      <mesh position={[-15, -11.5, 18]} rotation={[0, -0.4, 0.03]}>
        <boxGeometry args={[25, 6, 2.5]} />
        <meshStandardMaterial color="#0B1624" roughness={1} />
      </mesh>
    </>
  );
}

// ─── Kelp Forest (much more impressive) ─────────────────────────
function KelpForest({ position, isMobile }: { position: [number, number, number]; isMobile: boolean }) {
  const stalkCount = isMobile ? 6 : 18;
  const groupRef = useRef<THREE.Group>(null!);

  const stalks = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: stalkCount }, () => ({
      x: (rng() - 0.5) * 12,
      z: (rng() - 0.5) * 12,
      height: 4 + rng() * 7,
      phase: rng() * Math.PI * 2,
      swaySpeed: 0.3 + rng() * 0.3,
      leafCount: isMobile ? 3 : 4 + Math.floor(rng() * 3),
    }));
  }, [stalkCount, isMobile]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const s = stalks[i];
      children[i].rotation.x = Math.sin(t * s.swaySpeed + s.phase) * 0.1;
      children[i].rotation.z = Math.sin(t * s.swaySpeed * 0.6 + s.phase + 1) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, s.height / 2 + 0.2, s.z]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.1, s.height, 5]} />
            <meshStandardMaterial color="#2D8B4E" emissive="#1A6B35" emissiveIntensity={0.15} />
          </mesh>
          {/* Multiple leaf blobs along stalk */}
          {Array.from({ length: s.leafCount }, (_, j) => {
            const side = j % 2 === 0 ? 1 : -1;
            const yPos = -s.height / 2 + (j + 1) * (s.height / (s.leafCount + 1));
            return (
              <group key={j} position={[side * 0.2, yPos, 0]}>
                <mesh>
                  <sphereGeometry args={[0.15, 5, 4]} />
                  <meshStandardMaterial color="#3CB371" emissive="#2E8B57" emissiveIntensity={0.1} />
                </mesh>
                {/* Extra leaf blob for canopy feel */}
                <mesh position={[side * 0.12, 0.1, 0.08]}>
                  <sphereGeometry args={[0.1, 4, 3]} />
                  <meshStandardMaterial color="#228B22" emissive="#1A6B35" emissiveIntensity={0.08} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// ─── Sea Turtle (desktop only) ──────────────────────────────────
function SeaTurtle({ pathSeed }: { pathSeed: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const flippersRef = useRef<THREE.Group>(null!);

  const curve = useMemo(() => {
    const rng = seededRandom(pathSeed);
    const points = Array.from({ length: 6 }, () =>
      new THREE.Vector3(
        (rng() - 0.5) * 60,
        -2 - rng() * 5,
        (rng() - 0.5) * 60,
      )
    );
    return new THREE.CatmullRomCurve3(points, true);
  }, [pathSeed]);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.015 + pathSeed * 0.1) % 1;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    groupRef.current.position.copy(pos);
    groupRef.current.lookAt(pos.clone().add(tangent));

    // Flipper animation
    if (flippersRef.current) {
      const flipAngle = Math.sin(clock.getElapsedTime() * 1.2) * 0.3;
      const children = flippersRef.current.children;
      if (children[0]) children[0].rotation.z = flipAngle;
      if (children[1]) children[1].rotation.z = -flipAngle;
      if (children[2]) children[2].rotation.z = flipAngle * 0.5;
      if (children[3]) children[3].rotation.z = -flipAngle * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shell (half sphere) */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5C7A3A" roughness={0.8} />
      </mesh>
      {/* Belly */}
      <mesh rotation={[0, 0, 0]} position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.75, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#C8B878" roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0, 0.9]}>
        <sphereGeometry args={[0.25, 6, 4]} />
        <meshStandardMaterial color="#6B8A4A" roughness={0.7} />
      </mesh>
      {/* Flippers */}
      <group ref={flippersRef}>
        <mesh position={[0.7, 0, 0.2]} rotation={[0, 0.3, 0]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#5C7A3A" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.7, 0, 0.2]} rotation={[0, -0.3, 0]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#5C7A3A" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.5, 0, -0.5]} rotation={[0, 0.5, 0]}>
          <planeGeometry args={[0.35, 0.15]} />
          <meshStandardMaterial color="#5C7A3A" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.5, 0, -0.5]} rotation={[0, -0.5, 0]}>
          <planeGeometry args={[0.35, 0.15]} />
          <meshStandardMaterial color="#5C7A3A" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Manta Ray (desktop only) ───────────────────────────────────
function MantaRay() {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  const curve = useMemo(() => {
    const points = [
      new THREE.Vector3(-30, -6, -10),
      new THREE.Vector3(-10, -5, 15),
      new THREE.Vector3(20, -7, 10),
      new THREE.Vector3(30, -6, -15),
      new THREE.Vector3(10, -5, -25),
    ];
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.01) % 1;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    groupRef.current.position.copy(pos);
    groupRef.current.lookAt(pos.clone().add(tangent));

    // Wing wave animation
    if (meshRef.current) {
      const geo = meshRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const time = clock.getElapsedTime();
      for (let i = 0; i < posAttr.count; i++) {
        const x = arr[i * 3];
        const distFromCenter = Math.abs(x);
        arr[i * 3 + 1] = Math.sin(time * 1.5 + distFromCenter * 0.8) * distFromCenter * 0.1;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 2.5, 8, 4]} />
        <meshStandardMaterial color="#2C3E50" side={THREE.DoubleSide} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Bioluminescent Dots (abyss) ────────────────────────────────
function BioluminescentDots({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 6 : 14;
  const groupRef = useRef<THREE.Group>(null!);
  const GLOW_COLORS = ["#1a1aff", "#8a2be2", "#00ced1", "#4169e1", "#9370db", "#00bfff"];

  const dots = useMemo(() => {
    const rng = seededRandom(888);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 60,
      y: -10 - rng() * 6,
      z: (rng() - 0.5) * 60,
      color: GLOW_COLORS[Math.floor(rng() * GLOW_COLORS.length)],
      phase: rng() * Math.PI * 2,
      speed: 0.5 + rng() * 1.5,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const d = dots[i];
      const intensity = 0.5 + Math.sin(t * d.speed + d.phase) * 0.5;
      const mesh = children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = intensity;
      mesh.scale.setScalar(0.8 + intensity * 0.4);
    }
  });

  return (
    <group ref={groupRef}>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          <sphereGeometry args={[0.06, 4, 4]} />
          <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={0.8} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Abyss Zone Darkness ────────────────────────────────────────
function AbyssZoneDarkness({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#020408" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {[
        { x: -3, z: 2, color: "#1E0A4E" },
        { x: 4, z: -1, color: "#0A1E4E" },
        { x: 1, z: 4, color: "#1E0A3E" },
      ].map((spot, i) => (
        <mesh key={i} position={[spot.x, -0.4, spot.z]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshStandardMaterial color={spot.color} emissive={spot.color} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Landmarks ───────────────────────────────────────────────────
function Shipwreck({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[4, 0.5, 0]} rotation={[0, 0.3, 0.25]}>
        <boxGeometry args={[6, 2.5, 2.5]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.9} />
      </mesh>
      <mesh position={[4, 3.5, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.12, 0.15, 5, 6]} />
        <meshStandardMaterial color="#4A3012" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SubmarineLandmark({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[4, 0.8, 2]} rotation={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 5, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[4, 1.8, 2]}>
        <sphereGeometry args={[0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AbyssCrack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[3, -0.5, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[18, 0.5, 1.5]} />
        <meshStandardMaterial color="#020408" roughness={1} />
      </mesh>
      <mesh position={[5, -0.3, 1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[10, 0.4, 1.0]} />
        <meshStandardMaterial color="#030610" roughness={1} />
      </mesh>
      <mesh position={[3, -0.7, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[16, 0.2, 0.8]} />
        <meshStandardMaterial color="#1A0500" emissive="#FF4500" emissiveIntensity={0.4} transparent opacity={0.6} />
      </mesh>
      <mesh position={[5, -0.5, 1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[8, 0.15, 0.5]} />
        <meshStandardMaterial color="#1A0500" emissive="#FF6B00" emissiveIntensity={0.3} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[4, -0.8, 0.5]} intensity={0.4} color="#FF4500" distance={8} decay={2} />
    </group>
  );
}

function TreasureChest({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[3, 0.5, 2]}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial color="#B8860B" emissive="#FFD700" emissiveIntensity={1.0} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[3, 1.1, 2]}>
        <boxGeometry args={[1.3, 0.3, 0.9]} />
        <meshStandardMaterial color="#996515" emissive="#FFD700" emissiveIntensity={0.7} metalness={0.6} roughness={0.4} />
      </mesh>
      <pointLight position={[3, 1.5, 2]} intensity={0.6} color="#FFD700" distance={6} decay={2} />
    </group>
  );
}

function TreasureParticles({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const particles = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2,
      radius: 1.2 + Math.random() * 0.5,
      yOff: Math.random() * 1.5,
      speed: 0.3 + Math.random() * 0.3,
    })),
  []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angle = t * p.speed + p.angle;
      children[i].position.set(
        Math.cos(angle) * p.radius,
        p.yOff + Math.sin(t * 0.8 + p.angle) * 0.4,
        Math.sin(angle) * p.radius,
      );
    }
  });

  return (
    <group ref={groupRef} position={[position[0] + 3, position[1] + 1, position[2] + 2]}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────
function UnderwaterScene({
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
  const bubbleCount = isMobile ? 30 : 60;
  const dustCount = isMobile ? 20 : 50;
  const showJellyfish = true; // now shown on both
  const showSeaFans = !isMobile;
  const backgroundFishCount = isMobile ? 10 : 30;

  return (
    <>
      {/* Background gradient */}
      <OceanBackground />

      {/* Depth fog */}
      <fog attach="fog" args={["#061a2e", 15, 80]} />

      {/* Lighting */}
      <ambientLight intensity={0.25} color="#4A90B8" />
      <directionalLight position={[5, 35, -10]} intensity={0.7} color="#7EC8E3" />
      <directionalLight position={[-15, 20, 10]} intensity={0.25} color="#2A6090" />
      <pointLight position={[0, -14, 15]} intensity={0.3} color="#06B6D4" distance={30} decay={2} />

      {/* Depth layer planes */}
      <DepthLayers />

      {/* Underwater dust */}
      <UnderwaterDust count={dustCount} />

      {/* Sea floor with details */}
      <SeaFloor isMobile={isMobile} />

      {/* Underwater cliffs */}
      <UnderwaterCliffs />

      {/* Light rays */}
      <LightRays />

      {/* Seagrass meadows */}
      <SeagrassMeadow position={[-18, -16.5, -10]} seed={101} />
      <SeagrassMeadow position={[12, -16.5, -18]} seed={202} />
      <SeagrassMeadow position={[-28, -16.5, 8]} seed={303} />
      {!isMobile && <SeagrassMeadow position={[25, -16.5, -8]} seed={404} />}

      {/* Fan corals scattered */}
      <FanCorals isMobile={isMobile} />

      {/* Tube sponges */}
      <TubeSponges isMobile={isMobile} />

      {/* Sea anemones scattered */}
      <SeaAnemonesScattered isMobile={isMobile} />

      {/* Bioluminescent dots in abyss */}
      <BioluminescentDots isMobile={isMobile} />

      {/* Coral platforms + markers + landmarks */}
      {UNDERWATER_CITIES.map((city, i) => {
        const pos = getCityPos(city);
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP
        const zone = getDepthZone(pos[1]);
        return (
          <React.Fragment key={city.id}>
            <CoralPlatform position={pos} index={i} isMobile={isMobile} />
            <CityMarker city={city} lang={lang} unlocked={unlocked} onSelect={onSelectCity} position={pos} />

            {/* Anemone clusters on all platforms */}
            <AnemoneCluster position={pos} index={i} />

            {/* Sea fans on shallow platforms (desktop only) */}
            {showSeaFans && zone === "shallow" && (
              <SeaFans position={pos} index={i} />
            )}

            {/* Per-city landmarks */}
            {city.id === "shipwreck-cove" && <Shipwreck position={pos} />}
            {city.id === "submarine-base" && <SubmarineLandmark position={pos} />}
            {city.id === "abyss-zone" && (
              <>
                <AbyssCrack position={pos} />
                <AbyssZoneDarkness position={pos} />
              </>
            )}
            {city.id === "treasure-vault" && (
              <>
                <TreasureChest position={pos} />
                <TreasureParticles position={pos} />
              </>
            )}
            {city.id === "kelp-forest" && (
              <KelpForest position={pos} isMobile={isMobile} />
            )}
          </React.Fragment>
        );
      })}

      {/* Bubbles */}
      <Bubbles count={bubbleCount} />

      {/* Background ambient fish */}
      <BackgroundFish count={backgroundFishCount} />

      {/* Fish schools — larger groups with shimmer */}
      <FishSchool anchor={[-12, -3, -8]} color="#C0C0C0" fishCount={isMobile ? 8 : 16} />
      {!isMobile && (
        <>
          <FishSchool anchor={[18, -7, 8]} color="#3B82F6" fishCount={12} />
          <FishSchool anchor={[-5, -10, 22]} color="#F97316" fishCount={10} />
          <FishSchool anchor={[0, -4, -20]} color="#2DD4BF" fishCount={8} />
        </>
      )}

      {/* Jellyfish — improved with color variants */}
      {showJellyfish && (
        <>
          <Jellyfish startPos={[-18, -10, 5]} color="#FF69B4" />
          <Jellyfish startPos={[12, -6, -12]} color="#4169E1" />
          <Jellyfish startPos={[5, -12, 25]} color="#9B30FF" />
        </>
      )}

      {/* Sea turtles (desktop only) */}
      {!isMobile && (
        <>
          <SeaTurtle pathSeed={1} />
          <SeaTurtle pathSeed={2} />
        </>
      )}

      {/* Manta ray (desktop only) */}
      {!isMobile && <MantaRay />}

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
        minDistance={15}
        maxDistance={100}
      />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────
export function UnderwaterMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div className="w-full h-full">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 20, 55], fov: 50 }}
        style={{
          background: "linear-gradient(180deg, #1a6b8a 0%, #0d4a6b 40%, #030d18 100%)",
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <UnderwaterScene
          onSelectCity={onSelectCity}
          lang={lang}
          totalPoints={totalPoints}
          isMobile={IS_MOBILE}
        />
      </Canvas>
    </div>
  );
}
