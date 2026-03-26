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
const CORAL_SHALLOW = ["#FF1493", "#9B30FF", "#FF6600", "#FFD700", "#FF4040", "#FF69B4", "#7B68EE", "#00FF7F", "#FFFFFF", "#FFB6C1"];
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

// ─── Scattered Seagrass (instanced — doubled + color variety) ────
function ScatteredSeagrass({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 60 : 200;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const COLORS = ["#2d8a4e", "#1e7a3a", "#3d9a5e", "#25804a", "#48a860", "#8B4513", "#CD853F"];

  const blades = useMemo(() => {
    const rng = seededRandom(7777);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 120,
      z: (rng() - 0.5) * 120,
      y: -17 + rng() * 12,
      height: 1 + rng() * 3,
      phase: rng() * Math.PI * 2,
      speed: 0.3 + rng() * 0.4,
      // ~20% red/brown (indices 5,6), ~80% greens (indices 0-4)
      colorIndex: rng() < 0.8 ? Math.floor(rng() * 5) : 5 + Math.floor(rng() * 2),
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const b = blades[i];
      const swayX = Math.sin(t * b.speed + b.phase) * 0.12;
      const swayZ = Math.sin(t * b.speed * 0.7 + b.phase + 1) * 0.06;
      dummy.position.set(b.x, b.y + b.height / 2, b.z);
      dummy.rotation.set(swayX, 0, swayZ);
      dummy.scale.set(0.15, b.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(COLORS[b.colorIndex]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#2d8a4e"
        emissive="#2d8a4e"
        emissiveIntensity={0.1}
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}

// ─── Seagrass Meadow (cluster — kept for existing placements) ───
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

// ─── Fan Corals (increased to 30/10) ─────────────────────────────
function FanCorals({ isMobile }: { isMobile: boolean }) {
  const FAN_COLORS = ["#9B30FF", "#FF69B4", "#FF6600", "#E040FB", "#FF1493"];
  const fans = useMemo(() => {
    const count = isMobile ? 10 : 30;
    const rng = seededRandom(777);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 80,
      z: (rng() - 0.5) * 80,
      y: -16.5 + rng() * 0.5,
      rotY: rng() * Math.PI,
      radius: 0.5 + rng() * 2.5, // more size variety: 0.5 to 3
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

// ─── Tube Sponges (more scattered) ──────────────────────────────
function TubeSponges({ isMobile }: { isMobile: boolean }) {
  const clusterCount = isMobile ? 4 : 10;
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

// ─── Sea Anemones (more clusters + neon colors) ─────────────────
function SeaAnemonesScattered({ isMobile }: { isMobile: boolean }) {
  const clusterCount = isMobile ? 8 : 20;
  const ANEMONE_COLORS = ["#FF69B4", "#9B30FF", "#FF6347", "#FF1493", "#DA70D6", "#00FF7F", "#FF6347"];
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
            <meshStandardMaterial color={a.color} emissive={a.color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Floor Coral Groups (increased + new coral types) ────────────
function FloorCorals({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 12 : 35;
  const CORAL_COLORS = ["#FF69B4", "#FF6600", "#9B30FF", "#FF1493", "#DAA520", "#00FF7F", "#FFD700", "#E040FB", "#FFFFFF", "#FFB6C1", "#7B68EE", "#6A5ACD"];

  const corals = useMemo(() => {
    const rng = seededRandom(4444);
    return Array.from({ length: count }, () => {
      const shapeType = Math.floor(rng() * 6); // 0=brain, 1=branch, 2=mushroom, 3=staghorn, 4=table, 5=finger
      return {
        x: (rng() - 0.5) * 100,
        z: (rng() - 0.5) * 100,
        shapeType,
        scale: 0.3 + rng() * 0.5,
        color: CORAL_COLORS[Math.floor(rng() * CORAL_COLORS.length)],
        rotY: rng() * Math.PI * 2,
      };
    });
  }, [count]);

  return (
    <>
      {corals.map((c, i) => (
        <group key={i} position={[c.x, -16.8, c.z]} rotation={[0, c.rotY, 0]}>
          {c.shapeType === 0 && (
            /* Brain coral — squashed sphere */
            <mesh position={[0, c.scale * 0.5, 0]} scale={[1, 0.6, 1]}>
              <sphereGeometry args={[c.scale, 8, 6]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} roughness={0.6} />
            </mesh>
          )}
          {c.shapeType === 1 && (
            /* Branching coral — small cylinder tree */
            <group>
              <mesh position={[0, c.scale * 0.5, 0]}>
                <cylinderGeometry args={[c.scale * 0.15, c.scale * 0.2, c.scale, 5]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} />
              </mesh>
              <mesh position={[c.scale * 0.15, c.scale * 0.8, 0]} rotation={[0, 0, 0.4]}>
                <cylinderGeometry args={[c.scale * 0.08, c.scale * 0.12, c.scale * 0.5, 4]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} />
              </mesh>
              <mesh position={[-c.scale * 0.12, c.scale * 0.7, 0.1]} rotation={[0, 0, -0.3]}>
                <cylinderGeometry args={[c.scale * 0.06, c.scale * 0.1, c.scale * 0.4, 4]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} />
              </mesh>
            </group>
          )}
          {c.shapeType === 2 && (
            /* Mushroom coral — disc on thin stalk */
            <group>
              <mesh position={[0, c.scale * 0.3, 0]}>
                <cylinderGeometry args={[c.scale * 0.08, c.scale * 0.1, c.scale * 0.6, 4]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, c.scale * 0.65, 0]} scale={[1, 0.3, 1]}>
                <sphereGeometry args={[c.scale * 0.5, 8, 6]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} />
              </mesh>
            </group>
          )}
          {c.shapeType === 3 && (
            /* Staghorn coral — Y-shaped branching */
            <group>
              {/* Main trunk */}
              <mesh position={[0, c.scale * 0.5, 0]}>
                <cylinderGeometry args={[c.scale * 0.1, c.scale * 0.15, c.scale, 5]} />
                <meshStandardMaterial color="#FFB6C1" emissive="#FFB6C1" emissiveIntensity={0.35} />
              </mesh>
              {/* Left branch */}
              <mesh position={[-c.scale * 0.15, c.scale * 1.1, 0]} rotation={[0, 0, -0.5]}>
                <cylinderGeometry args={[c.scale * 0.06, c.scale * 0.09, c.scale * 0.7, 4]} />
                <meshStandardMaterial color="#FFFFFF" emissive="#FFB6C1" emissiveIntensity={0.3} />
              </mesh>
              {/* Right branch */}
              <mesh position={[c.scale * 0.15, c.scale * 1.1, 0]} rotation={[0, 0, 0.5]}>
                <cylinderGeometry args={[c.scale * 0.06, c.scale * 0.09, c.scale * 0.7, 4]} />
                <meshStandardMaterial color="#FFFFFF" emissive="#FFB6C1" emissiveIntensity={0.3} />
              </mesh>
            </group>
          )}
          {c.shapeType === 4 && (
            /* Table coral — flat wide disc on short stalk */
            <group>
              <mesh position={[0, c.scale * 0.3, 0]}>
                <cylinderGeometry args={[c.scale * 0.1, c.scale * 0.12, c.scale * 0.6, 5]} />
                <meshStandardMaterial color="#8B7355" emissive="#8B7355" emissiveIntensity={0.2} />
              </mesh>
              <mesh position={[0, c.scale * 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[c.scale * 1.2, 10]} />
                <meshStandardMaterial color="#CD853F" emissive="#CD853F" emissiveIntensity={0.3} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
          {c.shapeType === 5 && (
            /* Finger coral — cluster of small vertical cylinders */
            <group>
              {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, 5 + Math.floor(c.scale * 6)).map((fi) => {
                const fAngle = (fi / 8) * Math.PI * 2;
                const fDist = c.scale * 0.2;
                const fHeight = c.scale * (0.5 + (fi % 3) * 0.3);
                return (
                  <mesh key={fi} position={[Math.cos(fAngle) * fDist, fHeight / 2, Math.sin(fAngle) * fDist]}>
                    <cylinderGeometry args={[c.scale * 0.05, c.scale * 0.07, fHeight, 4]} />
                    <meshStandardMaterial color="#6A5ACD" emissive="#6A5ACD" emissiveIntensity={0.35} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>
      ))}
    </>
  );
}

// ─── Sea Sponges (barrel-shaped) ────────────────────────────────
function SeaSponges({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 5 : 14;
  const SPONGE_COLORS = ["#FFA500", "#FFD700", "#FF8C00", "#E8A030", "#D4A040"];

  const sponges = useMemo(() => {
    const rng = seededRandom(5555);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 90,
      z: (rng() - 0.5) * 90,
      height: 0.4 + rng() * 0.6,
      radius: 0.3 + rng() * 0.3,
      color: SPONGE_COLORS[Math.floor(rng() * SPONGE_COLORS.length)],
    }));
  }, [count]);

  return (
    <>
      {sponges.map((s, i) => (
        <mesh key={i} position={[s.x, -16.8 + s.height / 2, s.z]}>
          <cylinderGeometry args={[s.radius * 0.8, s.radius, s.height, 8]} />
          <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.1} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

// ─── Starfish (5 thin boxes in a star) ──────────────────────────
function Starfish({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 4 : 10;
  const STAR_COLORS = ["#FF4500", "#FF6347", "#E04020", "#D4380D", "#FF5733"];

  const stars = useMemo(() => {
    const rng = seededRandom(6666);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 90,
      z: (rng() - 0.5) * 90,
      rotY: rng() * Math.PI * 2,
      scale: 0.2 + rng() * 0.15,
      color: STAR_COLORS[Math.floor(rng() * STAR_COLORS.length)],
    }));
  }, [count]);

  return (
    <>
      {stars.map((s, i) => (
        <group key={i} position={[s.x, -16.9, s.z]} rotation={[-Math.PI / 2, 0, s.rotY]}>
          {[0, 1, 2, 3, 4].map((arm) => {
            const angle = (arm / 5) * Math.PI * 2;
            return (
              <mesh key={arm} position={[Math.cos(angle) * s.scale * 0.7, Math.sin(angle) * s.scale * 0.7, 0]} rotation={[0, 0, angle]}>
                <boxGeometry args={[s.scale * 0.3, s.scale * 1.2, s.scale * 0.08]} />
                <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.1} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

// ─── Sea Urchins (spiky icosahedrons) ───────────────────────────
function SeaUrchins({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 3 : 8;
  const URCHIN_COLORS = ["#1A1A2E", "#2D2D44", "#1E1E30", "#252540"];

  const urchins = useMemo(() => {
    const rng = seededRandom(8888);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 80,
      z: (rng() - 0.5) * 80,
      scale: 0.15 + rng() * 0.12,
      color: URCHIN_COLORS[Math.floor(rng() * URCHIN_COLORS.length)],
    }));
  }, [count]);

  return (
    <>
      {urchins.map((u, i) => (
        <mesh key={i} position={[u.x, -16.7, u.z]}>
          <icosahedronGeometry args={[u.scale, 0]} />
          <meshStandardMaterial color={u.color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ─── Seafloor Carpet (algae/moss patches — more variety) ────────
function SeafloorCarpet() {
  const CARPET_COLORS = ["#1a3020", "#2a3520", "#3a1520", "#2a1530", "#1a2818", "#301828"];
  const patches = useMemo(() => {
    const rng = seededRandom(9999);
    return Array.from({ length: 8 }, () => ({
      x: (rng() - 0.5) * 60,
      z: (rng() - 0.5) * 60,
      radius: 8 + rng() * 4,
      color: CARPET_COLORS[Math.floor(rng() * CARPET_COLORS.length)],
    }));
  }, []);

  return (
    <>
      {patches.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, -16.95, p.z]}>
          <circleGeometry args={[p.radius, 16]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ─── Flowering Sea Plants (new) ─────────────────────────────────
function FloweringSeaPlants({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 5 : 15;
  const FLOWER_COLORS = ["#FF69B4", "#FFD700", "#FFFFFF", "#9B30FF", "#FF1493", "#FFA07A"];

  const plants = useMemo(() => {
    const rng = seededRandom(11111);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 100,
      z: (rng() - 0.5) * 100,
      height: 1 + rng() * 1,
      color: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
      phase: rng() * Math.PI * 2,
    }));
  }, [count]);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const sway = Math.sin(t * 0.5 + plants[i].phase) * 0.08;
      children[i].rotation.x = sway;
    }
  });

  return (
    <group ref={groupRef}>
      {plants.map((p, i) => (
        <group key={i} position={[p.x, -16.8, p.z]}>
          {/* Thin stalk */}
          <mesh position={[0, p.height / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.03, p.height, 4]} />
            <meshStandardMaterial color="#2d8a4e" emissive="#2d8a4e" emissiveIntensity={0.1} />
          </mesh>
          {/* Flower sphere on top */}
          <mesh position={[0, p.height, 0]}>
            <sphereGeometry args={[0.08, 6, 4]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Crabs (new — instanced for static placement) ───────────────
function Crabs({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 3 : 8;
  const CRAB_COLORS = ["#E04020", "#FF6347", "#CD5C5C", "#B22222", "#FF4500"];

  const crabs = useMemo(() => {
    const rng = seededRandom(12345);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 80,
      z: (rng() - 0.5) * 80,
      rotY: rng() * Math.PI * 2,
      scale: 0.15 + rng() * 0.1,
      color: CRAB_COLORS[Math.floor(rng() * CRAB_COLORS.length)],
      phase: rng() * Math.PI * 2,
      speed: 0.1 + rng() * 0.15,
    }));
  }, [count]);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const c = crabs[i];
      // Very slow sideways movement
      children[i].position.x = c.x + Math.sin(t * c.speed + c.phase) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {crabs.map((c, i) => (
        <group key={i} position={[c.x, -16.85, c.z]} rotation={[0, c.rotY, 0]}>
          {/* Body — flat wide box */}
          <mesh>
            <boxGeometry args={[c.scale * 2, c.scale * 0.5, c.scale * 1.5]} />
            <meshStandardMaterial color={c.color} roughness={0.7} />
          </mesh>
          {/* Left claw */}
          <mesh position={[-c.scale * 1.2, 0, 0]}>
            <sphereGeometry args={[c.scale * 0.4, 5, 4]} />
            <meshStandardMaterial color={c.color} roughness={0.6} />
          </mesh>
          {/* Right claw */}
          <mesh position={[c.scale * 1.2, 0, 0]}>
            <sphereGeometry args={[c.scale * 0.4, 5, 4]} />
            <meshStandardMaterial color={c.color} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Seahorses (new) ────────────────────────────────────────────
function Seahorses({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 1 : 4;
  const SEAHORSE_COLORS = ["#FFD700", "#FFA500", "#FF8C00", "#DAA520"];

  const seahorses = useMemo(() => {
    const rng = seededRandom(13579);
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 70,
      y: -14 + rng() * 8,
      z: (rng() - 0.5) * 70,
      color: SEAHORSE_COLORS[Math.floor(rng() * SEAHORSE_COLORS.length)],
      phase: rng() * Math.PI * 2,
      scale: 0.12 + rng() * 0.08,
    }));
  }, [count]);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const s = seahorses[i];
      // Gentle up/down bob
      children[i].position.y = s.y + Math.sin(t * 0.5 + s.phase) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {seahorses.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]}>
          {/* Head */}
          <mesh position={[0, s.scale * 5, 0]}>
            <sphereGeometry args={[s.scale * 1.2, 6, 4]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.15} />
          </mesh>
          {/* Upper body — angled cylinder */}
          <mesh position={[0, s.scale * 3.5, 0]} rotation={[0.2, 0, 0]}>
            <cylinderGeometry args={[s.scale * 0.6, s.scale * 0.8, s.scale * 3, 5]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.1} />
          </mesh>
          {/* Mid body — angled other way */}
          <mesh position={[0, s.scale * 1.5, s.scale * 0.3]} rotation={[-0.3, 0, 0]}>
            <cylinderGeometry args={[s.scale * 0.8, s.scale * 0.6, s.scale * 2.5, 5]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.1} />
          </mesh>
          {/* Tail — curved down */}
          <mesh position={[0, s.scale * -0.5, s.scale * -0.2]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[s.scale * 0.3, s.scale * 0.6, s.scale * 2, 4]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Clownfish Pairs (new — near anemones) ──────────────────────
function ClownfishPairs({ isMobile }: { isMobile: boolean }) {
  const pairCount = isMobile ? 2 : 6;

  const pairs = useMemo(() => {
    const rng = seededRandom(24680);
    return Array.from({ length: pairCount }, () => ({
      cx: (rng() - 0.5) * 60,
      cy: -14 + rng() * 6,
      cz: (rng() - 0.5) * 60,
      phase1: rng() * Math.PI * 2,
      phase2: rng() * Math.PI * 2,
      speed: 1.5 + rng() * 1.5,
      radius: 0.8 + rng() * 0.5,
    }));
  }, [pairCount]);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let pi = 0; pi < pairCount; pi++) {
      const p = pairs[pi];
      const pairGroup = children[pi] as THREE.Group;
      if (!pairGroup) continue;
      // Fish 1
      const f1 = pairGroup.children[0];
      if (f1) {
        f1.position.set(
          p.cx + Math.sin(t * p.speed + p.phase1) * p.radius,
          p.cy + Math.sin(t * p.speed * 0.7 + p.phase1) * 0.3,
          p.cz + Math.cos(t * p.speed + p.phase1) * p.radius,
        );
      }
      // Fish 2
      const f2 = pairGroup.children[1];
      if (f2) {
        f2.position.set(
          p.cx + Math.sin(t * p.speed + p.phase2 + Math.PI) * p.radius,
          p.cy + Math.sin(t * p.speed * 0.7 + p.phase2) * 0.3,
          p.cz + Math.cos(t * p.speed + p.phase2 + Math.PI) * p.radius,
        );
      }
    }
  });

  return (
    <group ref={groupRef}>
      {pairs.map((_, pi) => (
        <group key={pi}>
          {/* Fish 1 */}
          <group>
            <mesh scale={[1.5, 1, 0.8]}>
              <sphereGeometry args={[0.1, 6, 4]} />
              <meshStandardMaterial color="#FF6600" emissive="#FF6600" emissiveIntensity={0.15} />
            </mesh>
            {/* White stripe */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.1, 0.015, 4, 8]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          </group>
          {/* Fish 2 */}
          <group>
            <mesh scale={[1.5, 1, 0.8]}>
              <sphereGeometry args={[0.08, 6, 4]} />
              <meshStandardMaterial color="#FF8C00" emissive="#FF8C00" emissiveIntensity={0.15} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.08, 0.012, 4, 8]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// ─── Large Fish (new — desktop only) ────────────────────────────
function LargeFish() {
  const LARGE_FISH_DATA = useMemo(() => {
    const rng = seededRandom(77777);
    const colors = ["#C0C0C0", "#3B82F6", "#374151", "#4A6FA5"];
    return Array.from({ length: 4 }, () => {
      const points = Array.from({ length: 5 }, () =>
        new THREE.Vector3(
          (rng() - 0.5) * 80,
          -3 - rng() * 8,
          (rng() - 0.5) * 80,
        )
      );
      return {
        curve: new THREE.CatmullRomCurve3(points, true),
        color: colors[Math.floor(rng() * colors.length)],
        speed: 0.005 + rng() * 0.005,
        offset: rng(),
      };
    });
  }, []);

  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    LARGE_FISH_DATA.forEach((f, i) => {
      const group = refs.current[i];
      if (!group) return;
      const progress = (t * f.speed + f.offset) % 1;
      const pos = f.curve.getPointAt(progress);
      const tangent = f.curve.getTangentAt(progress);
      group.position.copy(pos);
      group.lookAt(pos.clone().add(tangent));
    });
  });

  return (
    <>
      {LARGE_FISH_DATA.map((f, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <mesh scale={[2, 1, 0.6]}>
            <sphereGeometry args={[0.5, 8, 6]} />
            <meshStandardMaterial color={f.color} metalness={0.4} roughness={0.5} />
          </mesh>
          {/* Tail fin */}
          <mesh position={[-0.9, 0, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.3, 0.5, 4]} />
            <meshStandardMaterial color={f.color} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─── Eels (new — desktop only) ──────────────────────────────────
function Eels() {
  const EEL_DATA = useMemo(() => {
    const rng = seededRandom(88888);
    return Array.from({ length: 2 }, () => {
      const points = Array.from({ length: 6 }, () =>
        new THREE.Vector3(
          (rng() - 0.5) * 50,
          -14 - rng() * 3,
          (rng() - 0.5) * 50,
        )
      );
      return {
        curve: new THREE.CatmullRomCurve3(points, true),
        color: rng() > 0.5 ? "#2D4A2D" : "#3A2D1A",
        speed: 0.008 + rng() * 0.004,
        offset: rng(),
      };
    });
  }, []);

  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    EEL_DATA.forEach((e, i) => {
      const group = refs.current[i];
      if (!group) return;
      const progress = (t * e.speed + e.offset) % 1;
      const pos = e.curve.getPointAt(progress);
      const tangent = e.curve.getTangentAt(progress);
      group.position.copy(pos);
      group.lookAt(pos.clone().add(tangent));
      // Body undulation
      const children = group.children;
      for (let s = 0; s < children.length; s++) {
        children[s].position.y = Math.sin(t * 2 + s * 0.8) * 0.08;
      }
    });
  });

  return (
    <>
      {EEL_DATA.map((e, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          {/* Eel body — 5 segments */}
          {[0, 1, 2, 3, 4].map((seg) => (
            <mesh key={seg} position={[seg * 0.3 - 0.6, 0, 0]}>
              <cylinderGeometry args={[0.06 - seg * 0.008, 0.07 - seg * 0.008, 0.35, 5]} />
              <meshStandardMaterial color={e.color} roughness={0.7} />
            </mesh>
          ))}
          {/* Head */}
          <mesh position={[-0.8, 0, 0]}>
            <sphereGeometry args={[0.08, 5, 4]} />
            <meshStandardMaterial color={e.color} />
          </mesh>
        </group>
      ))}
    </>
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

// ─── Coral Reef Platform (upgraded coral variety + boosted emissive) ─
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

  // Boosted emissive for shallow zone corals
  const shallowEmissive = 0.35;
  const midEmissive = 0.15;
  const abyssEmissive = 0.6;
  const getEmissive = (base: number) => isGlowing ? abyssEmissive + base * 0.2 : isShallow ? shallowEmissive : midEmissive;

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
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={getEmissive(0)} />
              </mesh>
              <mesh position={[0, c.height + 0.1, 0]}>
                <coneGeometry args={[c.radius * 0.7, 0.3, 5]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={getEmissive(0.1)} />
              </mesh>
            </>
          )}
          {c.shapeType === 1 && (
            /* Round/brain coral */
            <mesh position={[0, c.radius * 1.5, 0]}>
              <sphereGeometry args={[c.radius * 2, 8, 6]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={getEmissive(0)} roughness={0.6} />
            </mesh>
          )}
          {c.shapeType === 2 && (
            /* Flat disc coral */
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[c.radius * 2.5, 10]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={getEmissive(-0.05)} side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* Extra side branch for shallow corals (branch type) */}
          {c.hasBranch && c.shapeType === 0 && (
            <group position={[0, c.height * 0.6, 0]} rotation={[0.4, 0, 0.5]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[c.radius * 0.3, c.radius * 0.5, 0.6, 5]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} />
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

// ─── Background Fish (ambient tiny fish — instanced, increased) ──
function BackgroundFish({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const FISH_COLORS_LIST = [0x3b82f6, 0xf97316, 0xc0c0c0, 0xff6b9d, 0x2dd4bf, 0xfacc15, 0xa78bfa, 0xff1493, 0x00ced1, 0xffd700];

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

// ─── Light Beams (soft volumetric planes) ────────────────────────
function LightBeams() {
  const beamsRef = useRef<THREE.Group>(null!);

  const beams = useMemo(() => [
    { pos: [-12, 8, -12] as [number, number, number], rotZ: 0.12, rotY: 0.3, width: 8, height: 30, opacity: 0.07 },
    { pos: [8, 10, -8] as [number, number, number], rotZ: -0.08, rotY: 0.8, width: 10, height: 32, opacity: 0.06 },
    { pos: [22, 7, -18] as [number, number, number], rotZ: 0.1, rotY: 1.5, width: 7, height: 28, opacity: 0.08 },
    { pos: [-25, 9, -5] as [number, number, number], rotZ: 0.15, rotY: 2.2, width: 12, height: 35, opacity: 0.06 },
    { pos: [0, 9, -15] as [number, number, number], rotZ: -0.05, rotY: 3.0, width: 9, height: 25, opacity: 0.07 },
    { pos: [-18, 8, -20] as [number, number, number], rotZ: 0.18, rotY: 4.0, width: 6, height: 30, opacity: 0.07 },
  ], []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = beamsRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const b = beams[i];
      const swayAmount = 0.02 + i * 0.005;
      const swaySpeed = 0.15 + i * 0.04;
      children[i].rotation.z = b.rotZ + Math.sin(t * swaySpeed + i * 0.5) * swayAmount;
      children[i].rotation.x = Math.sin(t * swaySpeed * 0.5 + i) * 0.01;
    }
  });

  return (
    <group ref={beamsRef}>
      {beams.map((beam, i) => (
        <mesh key={i} position={beam.pos} rotation={[0, beam.rotY, beam.rotZ]}>
          <planeGeometry args={[beam.width, beam.height]} />
          <meshBasicMaterial
            color="#a8d8ea"
            transparent
            opacity={beam.opacity}
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

// ─── Scattered Terrain Rocks (replaces cliff walls) ──────────────
function TerrainRocks() {
  const rocks = useMemo(() => {
    const rng = seededRandom(2222);
    return Array.from({ length: 8 }, () => ({
      x: (rng() - 0.5) * 70,
      z: (rng() - 0.5) * 70,
      scale: 1.5 + rng() * 2.5,
      squish: 0.5 + rng() * 0.3, // vertical squish
      rotY: rng() * Math.PI * 2,
    }));
  }, []);

  return (
    <>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, -17 + r.scale * r.squish * 0.3, r.z]} rotation={[0, r.rotY, 0]} scale={[1, r.squish, 1]}>
          <sphereGeometry args={[r.scale, 6, 5]} />
          <meshStandardMaterial color="#1A2D42" roughness={0.95} />
        </mesh>
      ))}
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

// ─── Sea Turtle (desktop only — now 4 with size variety) ─────────
function SeaTurtle({ pathSeed, scale = 1 }: { pathSeed: number; scale?: number }) {
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
    <group ref={groupRef} scale={[scale, scale, scale]}>
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

// ─── Manta Ray (desktop only — now supports different paths) ─────
function MantaRay({ pathIndex = 0 }: { pathIndex?: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  const curve = useMemo(() => {
    const paths = [
      [
        new THREE.Vector3(-30, -6, -10),
        new THREE.Vector3(-10, -5, 15),
        new THREE.Vector3(20, -7, 10),
        new THREE.Vector3(30, -6, -15),
        new THREE.Vector3(10, -5, -25),
      ],
      [
        new THREE.Vector3(25, -4, -20),
        new THREE.Vector3(15, -3, 10),
        new THREE.Vector3(-20, -5, 20),
        new THREE.Vector3(-35, -4, -5),
        new THREE.Vector3(-5, -3, -30),
      ],
    ];
    return new THREE.CatmullRomCurve3(paths[pathIndex % paths.length], true);
  }, [pathIndex]);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * (0.01 + pathIndex * 0.003)) % 1;
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
  const backgroundFishCount = isMobile ? 20 : 50;

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

      {/* Terrain rocks (replacing cliff walls) */}
      <TerrainRocks />

      {/* Light beams (soft volumetric planes) */}
      <LightBeams />

      {/* Scattered seagrass everywhere (instanced — doubled) */}
      <ScatteredSeagrass isMobile={isMobile} />

      {/* Seagrass meadow clusters */}
      <SeagrassMeadow position={[-18, -16.5, -10]} seed={101} />
      <SeagrassMeadow position={[12, -16.5, -18]} seed={202} />
      <SeagrassMeadow position={[-28, -16.5, 8]} seed={303} />
      {!isMobile && <SeagrassMeadow position={[25, -16.5, -8]} seed={404} />}

      {/* Fan corals scattered (increased to 30/10) */}
      <FanCorals isMobile={isMobile} />

      {/* Tube sponges (more scattered) */}
      <TubeSponges isMobile={isMobile} />

      {/* Sea anemones scattered (more clusters + neon) */}
      <SeaAnemonesScattered isMobile={isMobile} />

      {/* Floor coral groups (increased + new types) */}
      <FloorCorals isMobile={isMobile} />

      {/* Sea sponges (barrel-shaped) */}
      <SeaSponges isMobile={isMobile} />

      {/* Starfish on the floor */}
      <Starfish isMobile={isMobile} />

      {/* Sea urchins on rocks */}
      <SeaUrchins isMobile={isMobile} />

      {/* Seafloor carpet (algae/moss patches — more variety) */}
      <SeafloorCarpet />

      {/* Flowering sea plants (new) */}
      <FloweringSeaPlants isMobile={isMobile} />

      {/* Crabs (new) */}
      <Crabs isMobile={isMobile} />

      {/* Seahorses (new) */}
      <Seahorses isMobile={isMobile} />

      {/* Clownfish pairs (new) */}
      <ClownfishPairs isMobile={isMobile} />

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

      {/* Background ambient fish (increased to 50/20) */}
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

      {/* Sea turtles — 4 with size variety (desktop only) */}
      {!isMobile && (
        <>
          <SeaTurtle pathSeed={1} scale={1.0} />
          <SeaTurtle pathSeed={2} scale={1.2} />
          <SeaTurtle pathSeed={3} scale={0.6} />
          <SeaTurtle pathSeed={4} scale={0.7} />
        </>
      )}

      {/* Manta rays — 2 at different depths (desktop only) */}
      {!isMobile && (
        <>
          <MantaRay pathIndex={0} />
          <MantaRay pathIndex={1} />
        </>
      )}

      {/* Large solitary fish (desktop only) */}
      {!isMobile && <LargeFish />}

      {/* Eels near rocks/shipwreck (desktop only) */}
      {!isMobile && <Eels />}

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
