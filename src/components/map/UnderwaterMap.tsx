"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
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

// ─── Coral palette ───────────────────────────────────────────────
const CORAL_SHALLOW = ["#FF6B9D", "#FF8E53", "#C084FC", "#2DD4BF", "#FACC15"];
const CORAL_DEEP    = ["#1E3A5F", "#0E4D6E", "#3B1F6E", "#0D9488", "#155E75"];

function getCoralColors(y: number): string[] {
  return y > -3 ? CORAL_SHALLOW : y > -8
    ? CORAL_SHALLOW.map((c, i) => i % 2 === 0 ? c : CORAL_DEEP[i])
    : CORAL_DEEP;
}

// ─── Depth Layer Planes ─────────────────────────────────────────
function DepthLayers() {
  return (
    <>
      {/* Shallow → Mid transition */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshBasicMaterial
          color="#0A4D6E"
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Mid → Abyss transition */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshBasicMaterial
          color="#061220"
          transparent
          opacity={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
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
      // Wrap around bounds
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.05}
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Sea Fan Props ──────────────────────────────────────────────
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
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.15}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Anemone Clusters ───────────────────────────────────────────
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
          <meshStandardMaterial
            color={a.color}
            emissive={a.color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Coral Reef Platform ─────────────────────────────────────────
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
  const coralCount = isMobile ? 3 : (zone === "shallow" ? 7 : 5);
  const heightMultiplier = zone === "shallow" ? 1.5 : zone === "mid" ? 1.0 : 0.7;

  const corals = useMemo(() => {
    const seed = index * 137;
    return Array.from({ length: coralCount }, (_, i) => {
      const angle = ((seed + i * 72) % 360) * (Math.PI / 180);
      const dist = 0.6 + (((seed + i * 7) % 10) / 10) * 0.9;
      const tiltX = ((seed + i * 11) % 60 - 30) * (Math.PI / 180);
      const tiltZ = ((seed + i * 17) % 60 - 30) * (Math.PI / 180);
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: (0.5 + (((seed + i * 13) % 10) / 10) * 1.4) * heightMultiplier,
        radius: 0.12 + (((seed + i * 3) % 10) / 10) * 0.18,
        tiltX,
        tiltZ,
        color: palette[(seed + i) % palette.length],
        // Extra branch for shallow zone variety
        hasBranch: zone === "shallow" && i % 2 === 0,
      };
    });
  }, [index, coralCount, palette, heightMultiplier, zone]);

  return (
    <group position={position}>
      {/* Base rock */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[2.2, 3, 1.4, 7]} />
        <meshStandardMaterial color="#2D3748" roughness={0.95} />
      </mesh>
      {/* Secondary rock bump */}
      <mesh position={[1.2, -0.2, 0.5]} rotation={[0.1, 0.4, 0]}>
        <cylinderGeometry args={[1, 1.5, 0.8, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>

      {/* Coral branches */}
      {corals.map((c, i) => (
        <group key={i} position={[c.x, 0.2, c.z]} rotation={[c.tiltX, 0, c.tiltZ]}>
          {/* Main branch */}
          <mesh position={[0, c.height / 2, 0]}>
            <cylinderGeometry args={[c.radius * 0.5, c.radius, c.height, 6]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={isGlowing ? 0.6 : 0.12}
            />
          </mesh>
          {/* Tip cone */}
          <mesh position={[0, c.height + 0.1, 0]}>
            <coneGeometry args={[c.radius * 0.7, 0.3, 5]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={isGlowing ? 0.8 : 0.2}
            />
          </mesh>
          {/* Extra side branch for shallow corals */}
          {c.hasBranch && (
            <group position={[0, c.height * 0.6, 0]} rotation={[0.4, 0, 0.5]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[c.radius * 0.3, c.radius * 0.5, 0.6, 5]} />
                <meshStandardMaterial
                  color={c.color}
                  emissive={c.color}
                  emissiveIntensity={0.15}
                />
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
      {/* Glowing ring for unlocked cities */}
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
          {/* Depth label */}
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

// ─── Fish School (instanced) — improved organic movement ────────
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
        // Slight radius oscillation for more organic paths
        radiusOsc: 0.5 + Math.random() * 1.5,
        radiusOscFreq: 0.1 + Math.random() * 0.2,
      })),
    [fishCount],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.08;

    fishData.forEach((f, i) => {
      const angle = t * f.speed + f.offset;
      const r = f.radius + Math.sin(t * f.radiusOscFreq + f.offset) * f.radiusOsc;
      dummy.position.set(
        Math.cos(angle) * r,
        f.yOff + Math.sin(t * f.wobbleFreq + f.offset) * f.wobbleAmp,
        Math.sin(angle) * r,
      );
      dummy.rotation.y = -angle + Math.PI / 2;
      // Slight banking turn
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
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

// ─── Jellyfish ───────────────────────────────────────────────────
function Jellyfish({ startPos, color }: { startPos: [number, number, number]; color: string }) {
  const groupRef = useRef<THREE.Group>(null!);
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
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.4, -1, Math.sin(angle) * 0.4]}
          >
            <cylinderGeometry args={[0.03, 0.02, 2, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.4}
              transparent
              opacity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Light Rays (shallow zone) — enhanced with sway ─────────────
function LightRays() {
  const raysRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = raysRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const swayAmount = 0.03 + i * 0.01;
      const swaySpeed = 0.3 + i * 0.1;
      children[i].rotation.z = (i === 1 ? -0.1 : i === 2 ? 0.08 : 0.15) + Math.sin(t * swaySpeed) * swayAmount;
    }
  });

  return (
    <group ref={raysRef}>
      {[
        { pos: [-10, 8, -12] as [number, number, number], rotZ: 0.15 },
        { pos: [8, 10, -8] as [number, number, number], rotZ: -0.1 },
        { pos: [20, 7, -18] as [number, number, number], rotZ: 0.08 },
        { pos: [-25, 9, -5] as [number, number, number], rotZ: 0.12 },
      ].map((ray, i) => (
        <mesh key={i} position={ray.pos} rotation={[0, 0, ray.rotZ]}>
          <coneGeometry args={[4, 22, 8, 1, true]} />
          <meshStandardMaterial
            color="#A7D8F0"
            transparent
            opacity={0.09}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Sea Floor ───────────────────────────────────────────────────
function SeaFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -17, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#091520" roughness={1} />
      </mesh>
      {[
        [-25, -16.5, 10],
        [20, -16, -5],
        [35, -16.5, 25],
        [-10, -16.2, 30],
        [0, -16, -20],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[3 + i * 0.5, 6, 5]} />
          <meshStandardMaterial color="#0D1B2A" roughness={1} />
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

// ─── Kelp Forest ────────────────────────────────────────────────
function KelpForest({ position, isMobile }: { position: [number, number, number]; isMobile: boolean }) {
  const stalkCount = isMobile ? 4 : 10;
  const groupRef = useRef<THREE.Group>(null!);

  const stalks = useMemo(() =>
    Array.from({ length: stalkCount }, (_, i) => ({
      x: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
      height: 3 + Math.random() * 5,
      phase: Math.random() * Math.PI * 2,
      swaySpeed: 0.3 + Math.random() * 0.3,
    })),
  [stalkCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const s = stalks[i];
      children[i].rotation.x = Math.sin(t * s.swaySpeed + s.phase) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, s.height / 2 + 0.2, s.z]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.1, s.height, 5]} />
            <meshStandardMaterial
              color="#2D8B4E"
              emissive="#1A6B35"
              emissiveIntensity={0.15}
            />
          </mesh>
          {/* Leaf blobs along stalk */}
          {Array.from({ length: 3 }, (_, j) => (
            <mesh key={j} position={[(j % 2 === 0 ? 0.15 : -0.15), -s.height / 2 + (j + 1) * (s.height / 4), 0]}>
              <sphereGeometry args={[0.12, 5, 4]} />
              <meshStandardMaterial
                color="#3CB371"
                emissive="#2E8B57"
                emissiveIntensity={0.1}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─── Abyss Zone Darkness ────────────────────────────────────────
function AbyssZoneDarkness({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Dark circle below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#020408" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {/* Glowing ground spots */}
      {[
        { x: -3, z: 2, color: "#1E0A4E" },
        { x: 4, z: -1, color: "#0A1E4E" },
        { x: 1, z: 4, color: "#1E0A3E" },
      ].map((spot, i) => (
        <mesh key={i} position={[spot.x, -0.4, spot.z]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshStandardMaterial
            color={spot.color}
            emissive={spot.color}
            emissiveIntensity={1.2}
          />
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
      {/* Main crack — longer */}
      <mesh position={[3, -0.5, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[18, 0.5, 1.5]} />
        <meshStandardMaterial color="#020408" roughness={1} />
      </mesh>
      {/* Branch crack */}
      <mesh position={[5, -0.3, 1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[10, 0.4, 1.0]} />
        <meshStandardMaterial color="#030610" roughness={1} />
      </mesh>
      {/* Lava glow from below */}
      <mesh position={[3, -0.7, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[16, 0.2, 0.8]} />
        <meshStandardMaterial
          color="#1A0500"
          emissive="#FF4500"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[5, -0.5, 1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[8, 0.15, 0.5]} />
        <meshStandardMaterial
          color="#1A0500"
          emissive="#FF6B00"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
        />
      </mesh>
      {/* Lava point light */}
      <pointLight position={[4, -0.8, 0.5]} intensity={0.4} color="#FF4500" distance={8} decay={2} />
    </group>
  );
}

function TreasureChest({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[3, 0.5, 2]}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial
          color="#B8860B"
          emissive="#FFD700"
          emissiveIntensity={1.0}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Lid */}
      <mesh position={[3, 1.1, 2]}>
        <boxGeometry args={[1.3, 0.3, 0.9]} />
        <meshStandardMaterial
          color="#996515"
          emissive="#FFD700"
          emissiveIntensity={0.7}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      {/* Gold glow light */}
      <pointLight position={[3, 1.5, 2]} intensity={0.6} color="#FFD700" distance={6} decay={2} />
    </group>
  );
}

// ─── Floating Gold Particles around Treasure ────────────────────
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
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1.5}
          />
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
  const showJellyfish = !isMobile;
  const showSeaFans = !isMobile;

  return (
    <>
      {/* Depth fog */}
      <fog attach="fog" args={["#061a2e", 15, 80]} />

      {/* Lighting — brighter shallow, dimmer deep */}
      <ambientLight intensity={0.25} color="#4A90B8" />
      <directionalLight position={[5, 35, -10]} intensity={0.7} color="#7EC8E3" />
      <directionalLight position={[-15, 20, 10]} intensity={0.25} color="#2A6090" />
      {/* Faint bottom light for abyss glow */}
      <pointLight position={[0, -14, 15]} intensity={0.3} color="#06B6D4" distance={30} decay={2} />

      {/* Depth layer planes */}
      <DepthLayers />

      {/* Underwater dust particles */}
      <UnderwaterDust count={dustCount} />

      {/* Sea floor */}
      <SeaFloor />

      {/* Underwater cliffs */}
      <UnderwaterCliffs />

      {/* Light rays from above (shallow zone only) */}
      <LightRays />

      {/* Coral platforms + markers + landmarks */}
      {UNDERWATER_CITIES.map((city, i) => {
        const pos = getCityPos(city);
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP
        const zone = getDepthZone(pos[1]);
        return (
          <React.Fragment key={city.id}>
            <CoralPlatform position={pos} index={i} isMobile={isMobile} />
            <CityMarker
              city={city}
              lang={lang}
              unlocked={unlocked}
              onSelect={onSelectCity}
              position={pos}
            />

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

      {/* Fish schools — varied sizes */}
      <FishSchool anchor={[-12, -3, -8]} color="#C0C0C0" fishCount={isMobile ? 6 : 12} />
      {!isMobile && (
        <>
          <FishSchool anchor={[18, -7, 8]} color="#3B82F6" fishCount={8} />
          <FishSchool anchor={[-5, -10, 22]} color="#F97316" fishCount={6} />
        </>
      )}

      {/* Jellyfish (desktop only) */}
      {showJellyfish && (
        <>
          <Jellyfish startPos={[-18, -10, 5]} color="#E879F9" />
          <Jellyfish startPos={[12, -6, -12]} color="#67E8F9" />
          <Jellyfish startPos={[5, -12, 25]} color="#A78BFA" />
        </>
      )}

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
          background: "linear-gradient(180deg, #1A5276 0%, #0E3D5C 30%, #0A2A4A 60%, #061220 100%)",
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
