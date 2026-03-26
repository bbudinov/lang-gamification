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

// ─── Culture world cities ───────────────────────────────────────
const CULTURE_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "culture")?.topicIds ?? []
);
const CULTURE_CITIES = CITIES.filter((c) => CULTURE_TOPIC_IDS.has(c.topicId));

// ─── Fixed 3D city positions (S-flow layout) ────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "british-pub":     [-24, 0, -18],
  "french-cafe":     [-8, 0, -18],
  "italian-plaza":   [8, 0, -14],
  "japanese-street": [24, 0, -10],
  "indian-temple":   [16, 2, 4],
  "mexican-market":  [0, 0, 8],
  "african-village": [-16, 0, 14],
  "brazilian-beach": [0, 0, 24],
  "bulgarian-village": [-8, 0, 4],
  "american-city": [-28, 0, 8],
  "german-castle": [8, 0, 4],
  "chinese-temple": [28, 0, 0],
  "egyptian-pyramid": [20, 0, 18],
  "spanish-plaza": [-14, 0, 18],
  "australian-coast": [0, 0, 30],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Deterministic random ───────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ═════════════════════════════════════════════════════════════════
//  UK ZONE — Big Ben, Red Phone Booth, Double-Decker Bus, Fog
// ═════════════════════════════════════════════════════════════════
function BigBen({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tower body */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 12, 8]} />
        <meshStandardMaterial color="#8a8a80" roughness={0.8} />
      </mesh>
      {/* Clock face box */}
      <mesh position={[0, 12.2, 0]}>
        <boxGeometry args={[1.8, 1.5, 1.8]} />
        <meshStandardMaterial color="#b0b0a0" roughness={0.6} />
      </mesh>
      {/* Clock face (emissive) */}
      <mesh position={[0, 12.2, 1.0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffcc" emissiveIntensity={0.4} />
      </mesh>
      {/* Pointed cone roof */}
      <mesh position={[0, 13.8, 0]}>
        <coneGeometry args={[0.7, 2.5, 8]} />
        <meshStandardMaterial color="#6a6a60" roughness={0.7} />
      </mesh>
    </group>
  );
}

function RedPhoneBooth({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      {/* Window */}
      <mesh position={[0, 0.9, 0.31]}>
        <planeGeometry args={[0.35, 0.6]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function DoubleDeckerBus({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bottom deck */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.8, 3]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      {/* Top deck */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.9, 0.6, 2.8]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      {/* Windows */}
      {[-1, -0.3, 0.4, 1.1].map((z, i) => (
        <mesh key={i} position={[0.51, 0.5, z]}>
          <planeGeometry args={[0.01, 0.35]} />
          <meshStandardMaterial color="#aaddff" transparent opacity={0.4} />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.4, 0.05, -1], [0.4, 0.05, -1], [-0.4, 0.05, 1], [0.4, 0.05, 1]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.15, 8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function FogParticles({ position, count }: { position: [number, number, number]; count: number }) {
  const rng = useMemo(() => seededRandom(42), []);
  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      pos: [rng() * 16 - 8, rng() * 3 + 0.5, rng() * 16 - 8] as [number, number, number],
      scale: rng() * 1.5 + 0.5,
      speed: rng() * 0.003 + 0.001,
      offset: rng() * Math.PI * 2,
    })),
    [count, rng]
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      child.position.x = p.pos[0] + Math.sin(clock.elapsedTime * p.speed * 100 + p.offset) * 2;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <sphereGeometry args={[0.6, 6, 6]} />
          <meshBasicMaterial color="#c0c0c0" transparent opacity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function UKZone() {
  const base: [number, number, number] = [-24, 0, -18];
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
      </mesh>
      <BigBen position={[base[0] + 4, 0, base[2] - 2]} />
      <RedPhoneBooth position={[base[0] - 3, 0, base[2] + 2]} />
      <DoubleDeckerBus position={[base[0] - 5, 0, base[2] - 3]} />
      {/* Pub building */}
      <mesh position={[base[0] - 2, 1.5, base[2] - 4]}>
        <boxGeometry args={[3, 3, 2.5]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.8} />
      </mesh>
      {/* Pub sign */}
      <mesh position={[base[0] - 2, 3.2, base[2] - 2.7]}>
        <boxGeometry args={[1.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#cc9944" emissive="#cc9944" emissiveIntensity={0.15} />
      </mesh>
      {!IS_MOBILE && <FogParticles position={base} count={12} />}
      {/* Cloudy atmosphere */}
      <pointLight position={[base[0], 8, base[2]]} color="#a0a0aa" intensity={0.6} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  FRANCE ZONE — Eiffel Tower, Cafe Tables, Street Lamp
// ═════════════════════════════════════════════════════════════════
function EiffelTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 4 angled legs */}
      {[
        { rot: [0, 0, 0.15] as [number, number, number], px: -1.2, pz: 0 },
        { rot: [0, 0, -0.15] as [number, number, number], px: 1.2, pz: 0 },
        { rot: [0.15, 0, 0] as [number, number, number], px: 0, pz: -1.2 },
        { rot: [-0.15, 0, 0] as [number, number, number], px: 0, pz: 1.2 },
      ].map((leg, i) => (
        <mesh key={i} position={[leg.px, 7, leg.pz]} rotation={leg.rot}>
          <cylinderGeometry args={[0.12, 0.2, 14, 6]} />
          <meshStandardMaterial color="#5a5a58" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Horizontal rings at 3 levels */}
      {[3, 7, 11].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2 - i * 0.35, 0.06, 4, 12]} />
          <meshStandardMaterial color="#5a5a58" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Top spire */}
      <mesh position={[0, 14.5, 0]}>
        <coneGeometry args={[0.08, 1.5, 6]} />
        <meshStandardMaterial color="#5a5a58" metalness={0.7} />
      </mesh>
    </group>
  );
}

function CafeTables({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-1.5, 0], [0, 0.5], [1.5, -0.3]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Table */}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.06, 12]} />
            <meshStandardMaterial color="#f5f0e8" roughness={0.6} />
          </mesh>
          {/* Leg */}
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.55, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Cup */}
          <mesh position={[0.15, 0.65, 0.1]}>
            <cylinderGeometry args={[0.06, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#f8f8f0" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FranceZone() {
  const base: [number, number, number] = [-8, 0, -18];
  return (
    <group>
      {/* Ground — cobblestone feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#c8b89a" roughness={0.95} />
      </mesh>
      <EiffelTower position={[base[0] + 3, 0, base[2] - 1]} />
      <CafeTables position={[base[0] - 3, 0, base[2] + 2]} />
      {/* Striped awning */}
      <mesh position={[base[0] - 3, 2.2, base[2] + 1]}>
        <boxGeometry args={[4, 0.08, 1.5]} />
        <meshStandardMaterial color="#cc3333" roughness={0.5} />
      </mesh>
      <mesh position={[base[0] - 3, 2.16, base[2] + 1]}>
        <boxGeometry args={[3.8, 0.08, 1.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      {/* Street lamp */}
      <mesh position={[base[0] - 6, 1.5, base[2] + 4]}>
        <cylinderGeometry args={[0.04, 0.06, 3, 6]} />
        <meshStandardMaterial color="#333" metalness={0.7} />
      </mesh>
      <mesh position={[base[0] - 6, 3.1, base[2] + 4]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#ffffaa" emissive="#ffdd88" emissiveIntensity={0.6} />
      </mesh>
      {/* Warm romantic lighting */}
      <pointLight position={[base[0], 8, base[2]]} color="#ffcc77" intensity={0.8} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  ITALY ZONE — Fountain, Terracotta Buildings, Archway, Vines
// ═════════════════════════════════════════════════════════════════
function Fountain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Basin */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.8, 16]} />
        <meshStandardMaterial color="#b0b0a0" roughness={0.7} />
      </mesh>
      {/* Inner water */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.04, 16]} />
        <meshStandardMaterial color="#66aacc" transparent opacity={0.6} />
      </mesh>
      {/* Center spout */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#ddeeff" emissive="#88ccff" emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
        <meshStandardMaterial color="#a0a090" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ItalianBirds({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.3;
  });
  return (
    <group ref={groupRef} position={position}>
      {[0, 2.1, 4.2].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 4, Math.sin(angle * 0.5) * 0.5, Math.sin(angle) * 4]} rotation={[0, angle, 0.3]}>
          <coneGeometry args={[0.15, 0.4, 3]} />
          <meshBasicMaterial color="#2a2a2a" />
        </mesh>
      ))}
    </group>
  );
}

function ItalyZone() {
  const base: [number, number, number] = [8, 0, -14];
  return (
    <group>
      {/* Cobblestone ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#d4c4a4" roughness={0.95} />
      </mesh>
      <Fountain position={[base[0], 0, base[2]]} />
      {/* Terracotta buildings */}
      {[
        { pos: [base[0] - 5, 1.5, base[2] - 3] as [number, number, number], h: 3, c: "#cc8855" },
        { pos: [base[0] - 4, 2.0, base[2] - 5] as [number, number, number], h: 4, c: "#d4956a" },
        { pos: [base[0] + 5, 2.5, base[2] - 4] as [number, number, number], h: 5, c: "#c07848" },
      ].map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={[2.5, b.h, 2]} />
          <meshStandardMaterial color={b.c} roughness={0.85} />
        </mesh>
      ))}
      {/* Archway between buildings */}
      <mesh position={[base[0] - 4.5, 2, base[2] - 4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.15, 4, 12, Math.PI]} />
        <meshStandardMaterial color="#b08060" roughness={0.8} />
      </mesh>
      {/* Vine climbing wall */}
      <mesh position={[base[0] + 5.9, 1.5, base[2] - 4]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
        <meshStandardMaterial color="#447744" />
      </mesh>
      {!IS_MOBILE && <ItalianBirds position={[base[0], 10, base[2]]} />}
      {/* Warm sunlight */}
      <pointLight position={[base[0], 10, base[2]]} color="#ffcc66" intensity={0.8} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  JAPAN ZONE — Torii Gate, Cherry Blossom, Sakura Petals, Lanterns
// ═════════════════════════════════════════════════════════════════
function ToriiGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Posts */}
      <mesh position={[-1.2, 2.5, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 5, 8]} />
        <meshStandardMaterial color="#cc2222" roughness={0.4} />
      </mesh>
      <mesh position={[1.2, 2.5, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 5, 8]} />
        <meshStandardMaterial color="#cc2222" roughness={0.4} />
      </mesh>
      {/* Top lintel */}
      <mesh position={[0, 5.1, 0]}>
        <boxGeometry args={[3.2, 0.3, 0.35]} />
        <meshStandardMaterial color="#cc2222" roughness={0.4} />
      </mesh>
      {/* Second bar */}
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[2.8, 0.15, 0.2]} />
        <meshStandardMaterial color="#cc2222" roughness={0.4} />
      </mesh>
    </group>
  );
}

function CherryBlossomTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 3, 6]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      {/* Pink crown */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[2, 10, 10]} />
        <meshStandardMaterial color="#ffaacc" emissive="#ff88aa" emissiveIntensity={0.2} roughness={0.8} />
      </mesh>
      {/* Secondary smaller sphere */}
      <mesh position={[1, 3.2, 0.5]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="#ffbbdd" emissive="#ff88aa" emissiveIntensity={0.15} roughness={0.8} />
      </mesh>
    </group>
  );
}

function SakuraPetals({ position }: { position: [number, number, number] }) {
  const rng = useMemo(() => seededRandom(777), []);
  const petals = useMemo(() =>
    Array.from({ length: 20 }, () => ({
      pos: [rng() * 10 - 5, rng() * 8 + 1, rng() * 10 - 5] as [number, number, number],
      speed: rng() * 0.5 + 0.2,
      drift: rng() * 0.3,
      offset: rng() * Math.PI * 2,
    })),
    [rng]
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const p = petals[i];
      const t = clock.elapsedTime;
      child.position.y = ((p.pos[1] - t * p.speed) % 8 + 8) % 8;
      child.position.x = p.pos[0] + Math.sin(t * 0.5 + p.offset) * p.drift * 3;
      child.rotation.z = t * 0.5 + p.offset;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {petals.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={[0.3, 0, 0]}>
          <planeGeometry args={[0.12, 0.08]} />
          <meshBasicMaterial color="#ffaacc" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function PaperLanterns({ position }: { position: [number, number, number] }) {
  const lanterns: { pos: [number, number, number]; color: string }[] = [
    { pos: [-1.5, 3, 0], color: "#cc3322" },
    { pos: [0, 3.3, -1], color: "#ff6644" },
    { pos: [1.5, 2.8, 0.5], color: "#cc3322" },
    { pos: [0.5, 3.5, -2], color: "#ff8855" },
  ];
  return (
    <group position={position}>
      {lanterns.map((l, i) => (
        <group key={i}>
          {/* Wire */}
          <mesh position={[l.pos[0], l.pos[1] + 0.3, l.pos[2]]}>
            <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          {/* Lantern */}
          <mesh position={l.pos}>
            <cylinderGeometry args={[0.15, 0.12, 0.35, 8]} />
            <meshStandardMaterial color={l.color} emissive={l.color} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function JapanZone() {
  const base: [number, number, number] = [24, 0, -10];
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#c4b498" roughness={0.9} />
      </mesh>
      <ToriiGate position={[base[0] - 4, 0, base[2] + 3]} />
      <CherryBlossomTree position={[base[0] + 3, 0, base[2] - 2]} />
      {!IS_MOBILE && <SakuraPetals position={[base[0], 0, base[2]]} />}
      <PaperLanterns position={[base[0], 0, base[2]]} />
      {/* Small shrine */}
      <group position={[base[0] + 5, 0, base[2] + 3]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 1, 1]} />
          <meshStandardMaterial color="#8b6f47" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[1, 0.6, 4]} />
          <meshStandardMaterial color="#5a4a38" roughness={0.8} />
        </mesh>
      </group>
      {/* Soft pink atmosphere */}
      <pointLight position={[base[0], 8, base[2]]} color="#ffaacc" intensity={0.6} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  INDIA ZONE — Temple Dome, Elephant, Marigolds, Oil Lamps
// ═════════════════════════════════════════════════════════════════
function TempleDome({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base with steps */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[4, 1.5, 4]} />
        <meshStandardMaterial color="#d4a060" roughness={0.7} />
      </mesh>
      {/* Steps */}
      <mesh position={[0, 0.15, 2.3]}>
        <boxGeometry args={[2.5, 0.3, 0.8]} />
        <meshStandardMaterial color="#c49050" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.1, 2.8]}>
        <boxGeometry args={[2.8, 0.2, 0.6]} />
        <meshStandardMaterial color="#b88040" roughness={0.8} />
      </mesh>
      {/* Dome */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8a030" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Dome top finial */}
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffcc00" emissiveIntensity={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

function ElephantStatue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.2, 1, 1.6]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.2, 0.7]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, 0.7, 1.2]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
        <meshStandardMaterial color="#777777" roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[[-0.35, 0.25, -0.4], [0.35, 0.25, -0.4], [-0.35, 0.25, 0.4], [0.35, 0.25, 0.4]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.12, 0.14, 0.5, 6]} />
          <meshStandardMaterial color="#888888" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function IndiaZone() {
  const base: [number, number, number] = [16, 2, 4];
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], base[1] - 0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#c8a878" roughness={0.9} />
      </mesh>
      <TempleDome position={[base[0], base[1], base[2] - 2]} />
      <ElephantStatue position={[base[0] + 5, base[1], base[2] + 2]} />
      {/* Marigold garlands (orange tube segments) */}
      {[
        [base[0] - 2, base[1] + 2.5, base[2] - 1] as [number, number, number],
        [base[0] + 1, base[1] + 2.8, base[2] - 1.5] as [number, number, number],
      ].map((p, i) => (
        <mesh key={i} position={p} rotation={[0, i * 0.5, 0.2]}>
          <torusGeometry args={[0.8, 0.06, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#ff8c00" emissive="#ff6600" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* Oil lamps */}
      {[
        [base[0] - 3, base[1] + 0.1, base[2] + 3] as [number, number, number],
        [base[0] + 3, base[1] + 0.1, base[2] + 4] as [number, number, number],
        [base[0] - 1, base[1] + 0.1, base[2] + 4] as [number, number, number],
        [base[0] + 5, base[1] + 0.1, base[2] - 1] as [number, number, number],
      ].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshStandardMaterial color="#ff8800" emissive="#ff6600" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Gold/orange warm light */}
      <pointLight position={[base[0], base[1] + 8, base[2]]} color="#ffaa44" intensity={0.8} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MEXICO ZONE — Market Stalls, Papel Picado, Cactus, Pinata
// ═════════════════════════════════════════════════════════════════
function Cactus({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main body */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 2.4, 8]} />
        <meshStandardMaterial color="#2d8a4e" roughness={0.7} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.5, 1.6, 0]} rotation={[0, 0, 0.8]}>
        <cylinderGeometry args={[0.15, 0.18, 1, 6]} />
        <meshStandardMaterial color="#2d8a4e" roughness={0.7} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.4, 1.0, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.13, 0.16, 0.8, 6]} />
        <meshStandardMaterial color="#2d8a4e" roughness={0.7} />
      </mesh>
    </group>
  );
}

function PapelPicado({ position }: { position: [number, number, number] }) {
  const colors = ["#ff69b4", "#44bbff", "#ffdd33", "#ff4444", "#88ff44"];
  return (
    <group position={position}>
      {/* Poles */}
      <mesh position={[-2, 3, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.5, 4]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      <mesh position={[2, 3, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.5, 4]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      {/* Hanging paper banners */}
      {colors.map((color, i) => (
        <mesh key={i} position={[-1.5 + i * 0.8, 3.8, 0]} rotation={[0.1, 0, 0]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function MexicoZone() {
  const base: [number, number, number] = [0, 0, 8];
  const stalls: { pos: [number, number, number]; color: string }[] = [
    { pos: [base[0] - 4, 0, base[2] - 2], color: "#cc2222" },
    { pos: [base[0] - 1, 0, base[2] - 3], color: "#228833" },
    { pos: [base[0] + 3, 0, base[2] - 2], color: "#ccaa22" },
  ];
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#c8b070" roughness={0.9} />
      </mesh>
      {/* Market stalls */}
      {stalls.map((stall, i) => (
        <group key={i} position={stall.pos}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[2, 1.2, 1.5]} />
            <meshStandardMaterial color="#a0784c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[2.4, 0.1, 1.8]} />
            <meshStandardMaterial color={stall.color} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <PapelPicado position={[base[0], 0, base[2] + 2]} />
      <Cactus position={[base[0] + 6, 0, base[2] + 3]} />
      {/* Pinata */}
      <group position={[base[0] - 5, 0, base[2] + 3]}>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.5, 4]} />
          <meshStandardMaterial color="#6b4226" />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color="#ff44aa" roughness={0.4} />
        </mesh>
        {/* Pinata spikes */}
        {[0, 1, 2, 3, 4].map((idx) => (
          <mesh key={idx} position={[Math.cos(idx * 1.26) * 0.4, 2.2, Math.sin(idx * 1.26) * 0.4]}>
            <coneGeometry args={[0.1, 0.25, 4]} />
            <meshStandardMaterial color={["#ff4444", "#44ff44", "#4444ff", "#ffff44", "#ff44ff"][idx]} />
          </mesh>
        ))}
      </group>
      {/* Festive bright lighting */}
      <pointLight position={[base[0], 8, base[2]]} color="#ffee88" intensity={0.9} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  AFRICA ZONE — Round Hut, Baobab Tree, Drums, Campfire
// ═════════════════════════════════════════════════════════════════
function RoundHut({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[1.3, 1.4, 2, 12]} />
        <meshStandardMaterial color="#a07050" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <coneGeometry args={[1.8, 1.8, 12]} />
        <meshStandardMaterial color="#c8a848" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.5, 1.35]}>
        <boxGeometry args={[0.6, 1, 0.1]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BaobabTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 3, 8]} />
        <meshStandardMaterial color="#8b6f47" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[3, 2.5, 1, 10]} />
        <meshStandardMaterial color="#4a8a3a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <sphereGeometry args={[2.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a8a3a" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Campfire({ position }: { position: [number, number, number] }) {
  const flameRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flameRef.current) return;
    flameRef.current.scale.y = 1 + Math.sin(clock.elapsedTime * 5) * 0.2;
    flameRef.current.scale.x = 1 + Math.cos(clock.elapsedTime * 7) * 0.1;
  });
  return (
    <group position={position}>
      {[0, 1.05, 2.1].map((r, i) => (
        <mesh key={i} position={[0, 0.1, 0]} rotation={[0, r, 0.1]}>
          <cylinderGeometry args={[0.08, 0.1, 0.8, 4]} />
          <meshStandardMaterial color="#5a3a20" roughness={0.9} />
        </mesh>
      ))}
      <mesh ref={flameRef} position={[0, 0.4, 0]}>
        <coneGeometry args={[0.25, 0.7, 6]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.8} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.12, 0.4, 5]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffcc00" emissiveIntensity={1} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#ff6622" intensity={0.5} distance={6} />
    </group>
  );
}

function AfricaZone() {
  const base: [number, number, number] = [-16, 0, 14];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#b89060" roughness={0.95} />
      </mesh>
      <RoundHut position={[base[0] - 3, 0, base[2] - 2]} />
      <RoundHut position={[base[0] + 2, 0, base[2] - 4]} />
      <BaobabTree position={[base[0] + 5, 0, base[2] + 2]} />
      {/* Drums */}
      {[
        [base[0] - 1, 0.25, base[2] + 3] as [number, number, number],
        [base[0] + 0.5, 0.2, base[2] + 3.5] as [number, number, number],
        [base[0] - 0.3, 0.3, base[2] + 4.2] as [number, number, number],
      ].map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.2 + i * 0.03, 0.25 + i * 0.02, 0.5 + i * 0.1, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
      ))}
      <Campfire position={[base[0], 0, base[2] + 2]} />
      {/* Ethiopian flag pole */}
      <group position={[base[0] - 5, 0, base[2] + 1]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 5, 6]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
        {/* Green stripe */}
        <mesh position={[0.45, 4.2, 0]}>
          <boxGeometry args={[0.9, 0.35, 0.02]} />
          <meshStandardMaterial color="#009b3a" />
        </mesh>
        {/* Yellow stripe */}
        <mesh position={[0.45, 3.85, 0]}>
          <boxGeometry args={[0.9, 0.35, 0.02]} />
          <meshStandardMaterial color="#fcdd09" />
        </mesh>
        {/* Red stripe */}
        <mesh position={[0.45, 3.5, 0]}>
          <boxGeometry args={[0.9, 0.35, 0.02]} />
          <meshStandardMaterial color="#da121a" />
        </mesh>
      </group>
      <pointLight position={[base[0], 8, base[2]]} color="#dda860" intensity={0.7} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  BRAZIL ZONE — Christ Statue, Palms, Umbrella, Surfboard
// ═════════════════════════════════════════════════════════════════
function ChristStatue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[3, 3, 12]} />
        <meshStandardMaterial color="#6a8a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 3, 6]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.6} />
      </mesh>
      <mesh position={[-1.2, 5.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 2.2, 6]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.6} />
      </mesh>
      <mesh position={[1.2, 5.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 2.2, 6]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.6} />
      </mesh>
    </group>
  );
}

function PalmTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 4, 6]} />
        <meshStandardMaterial color="#8b6f47" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color="#2d8a4e" roughness={0.7} />
      </mesh>
    </group>
  );
}

function BrazilZone() {
  const base: [number, number, number] = [0, 0, 24];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base[0], -0.49, base[2]]}>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#e0d0a0" roughness={0.95} />
      </mesh>
      <ChristStatue position={[base[0], 0, base[2] - 4]} />
      <PalmTree position={[base[0] - 5, 0, base[2] + 2]} />
      <PalmTree position={[base[0] + 4, 0, base[2] + 3]} />
      <PalmTree position={[base[0] - 3, 0, base[2] + 5]} />
      {/* Beach umbrella */}
      <group position={[base[0] + 6, 0, base[2] + 1]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
          <meshStandardMaterial color="#aaa" />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <coneGeometry args={[1.2, 0.5, 8]} />
          <meshStandardMaterial color="#ff6644" roughness={0.4} />
        </mesh>
      </group>
      {/* Surfboard */}
      <mesh position={[base[0] + 4.5, 0.8, base[2] + 5]} rotation={[0.2, 0.3, 0.8]}>
        <boxGeometry args={[0.4, 0.06, 2]} />
        <meshStandardMaterial color="#44ccff" roughness={0.3} />
      </mesh>
      <pointLight position={[base[0], 8, base[2]]} color="#ffdd66" intensity={0.9} distance={25} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  BULGARIA — Church/Monastery, Mountains, Rose Bush
// ═════════════════════════════════════════════════════════════════
function BulgariaZone() {
  const pos = CITY_POSITIONS["bulgarian-village"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#a8c070" roughness={0.9} />
      </mesh>
      {/* Cobblestone lighter circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 1]}>
        <circleGeometry args={[2.5, IS_MOBILE ? 12 : 20]} />
        <meshStandardMaterial color="#d0c8b0" roughness={0.85} />
      </mesh>
      {/* Church base (white) */}
      <mesh position={[0, 1.5, -1]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color="#f0ece0" roughness={0.8} />
      </mesh>
      {/* Dome (gold/brown hemisphere) */}
      <mesh position={[0, 3.2, -1]}>
        <sphereGeometry args={[1.1, IS_MOBILE ? 8 : 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b8862a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Cross on top — vertical */}
      <mesh position={[0, 4, -1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 4]} />
        <meshStandardMaterial color="#c4a030" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Cross — horizontal */}
      <mesh position={[0, 4.1, -1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 4]} />
        <meshStandardMaterial color="#c4a030" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Mountain behind (dark green cone) */}
      <mesh position={[-3, 1.5, -4]}>
        <coneGeometry args={[3, 5, 6]} />
        <meshStandardMaterial color="#3a6a30" roughness={0.95} />
      </mesh>
      <mesh position={[2, 1, -3.5]}>
        <coneGeometry args={[2.5, 4, 6]} />
        <meshStandardMaterial color="#2a5a28" roughness={0.95} />
      </mesh>
      {/* Rose bush (pink sphere near ground) */}
      <mesh position={[2.5, 0.3, 1.5]}>
        <sphereGeometry args={[0.5, 6, 5]} />
        <meshStandardMaterial color="#e8709a" roughness={0.7} />
      </mesh>
      <mesh position={[2.8, 0.2, 1.2]}>
        <sphereGeometry args={[0.35, 5, 4]} />
        <meshStandardMaterial color="#d4608a" roughness={0.7} />
      </mesh>
      {/* Rose stems */}
      <mesh position={[2.5, 0, 1.5]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 3]} />
        <meshStandardMaterial color="#2a6a20" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.4} color="#aaddaa" distance={10} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  USA — Skyscrapers, Statue of Liberty, Yellow Taxi
// ═════════════════════════════════════════════════════════════════
function USAZone() {
  const pos = CITY_POSITIONS["american-city"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#888890" roughness={0.85} />
      </mesh>
      {/* Skyscrapers — 3 tall thin boxes */}
      <mesh position={[-1.5, 4, -1.5]}>
        <boxGeometry args={[1.2, 8, 1.2]} />
        <meshStandardMaterial color="#6688aa" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0.5, 6, -2]}>
        <boxGeometry args={[1.4, 12, 1.3]} />
        <meshStandardMaterial color="#556688" roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[2, 5, -1]}>
        <boxGeometry args={[1.1, 10, 1.1]} />
        <meshStandardMaterial color="#7799bb" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Windows — thin emissive strips on tallest building */}
      {!IS_MOBILE && [1, 3, 5, 7, 9].map((h) => (
        <mesh key={`win-${h}`} position={[0.5, h, -1.33]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshStandardMaterial color="#aaccee" emissive="#668899" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* Statue of Liberty hint */}
      <group position={[-3.5, 0, 2]}>
        {/* Pedestal */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#888888" roughness={0.7} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.2, 0.3, 1.6, 6]} />
          <meshStandardMaterial color="#5a9a6a" roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.2, 6, 5]} />
          <meshStandardMaterial color="#5a9a6a" roughness={0.7} />
        </mesh>
        {/* Arm + torch */}
        <mesh position={[0.2, 2.5, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 4]} />
          <meshStandardMaterial color="#5a9a6a" roughness={0.7} />
        </mesh>
        <mesh position={[0.35, 2.85, 0]}>
          <sphereGeometry args={[0.1, 5, 4]} />
          <meshStandardMaterial color="#ffcc22" emissive="#ffaa00" emissiveIntensity={0.6} />
        </mesh>
      </group>
      {/* Yellow taxi */}
      <mesh position={[2, 0.2, 2]}>
        <boxGeometry args={[1.2, 0.4, 0.6]} />
        <meshStandardMaterial color="#f5cc00" roughness={0.6} />
      </mesh>
      <mesh position={[2, 0.45, 2]}>
        <boxGeometry args={[0.7, 0.25, 0.55]} />
        <meshStandardMaterial color="#f5cc00" roughness={0.6} />
      </mesh>
      {/* Traffic light */}
      <mesh position={[3.5, 1, 0.5]}>
        <cylinderGeometry args={[0.04, 0.04, 2, 4]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
      <mesh position={[3.5, 2.1, 0.5]}>
        <boxGeometry args={[0.2, 0.5, 0.15]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>
      <mesh position={[3.5, 2.25, 0.58]}>
        <sphereGeometry args={[0.06, 4, 3]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[3.5, 2.1, 0.58]}>
        <sphereGeometry args={[0.06, 4, 3]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[3.5, 1.95, 0.58]}>
        <sphereGeometry args={[0.06, 4, 3]} />
        <meshStandardMaterial color="#22cc22" emissive="#00aa00" emissiveIntensity={0.3} />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#ffeedd" distance={12} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  GERMANY — Neuschwanstein Castle, Beer Stein, Pretzel
// ═════════════════════════════════════════════════════════════════
function GermanyZone() {
  const pos = CITY_POSITIONS["german-castle"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#7aaa5a" roughness={0.9} />
      </mesh>
      {/* Castle base (white/cream) */}
      <mesh position={[0, 1.5, -1]}>
        <boxGeometry args={[3.5, 3, 2.5]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.75} />
      </mesh>
      {/* Left tower */}
      <mesh position={[-1.5, 3, -1]}>
        <cylinderGeometry args={[0.4, 0.45, 4, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.75} />
      </mesh>
      <mesh position={[-1.5, 5.3, -1]}>
        <coneGeometry args={[0.55, 1, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#4466aa" roughness={0.6} />
      </mesh>
      {/* Right tower */}
      <mesh position={[1.5, 3.5, -1]}>
        <cylinderGeometry args={[0.35, 0.4, 5, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.75} />
      </mesh>
      <mesh position={[1.5, 6.3, -1]}>
        <coneGeometry args={[0.5, 1.2, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#4466aa" roughness={0.6} />
      </mesh>
      {/* Castle windows */}
      {!IS_MOBILE && [-0.5, 0.5].map((x) => (
        <mesh key={`cw-${x}`} position={[x, 2, 0.26]}>
          <planeGeometry args={[0.3, 0.5]} />
          <meshStandardMaterial color="#3a3020" roughness={0.5} />
        </mesh>
      ))}
      {/* Beer stein (small brown cylinder with handle) */}
      <mesh position={[3, 0.3, 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
        <meshStandardMaterial color="#8a5a2a" roughness={0.8} />
      </mesh>
      <mesh position={[3.25, 0.3, 2]}>
        <torusGeometry args={[0.12, 0.03, 6, 8, Math.PI]} />
        <meshStandardMaterial color="#7a4a1a" roughness={0.8} />
      </mesh>
      {/* Pretzel hint (small brown torus) */}
      <mesh position={[2.5, 0.1, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.06, 6, 12]} />
        <meshStandardMaterial color="#a06830" roughness={0.8} />
      </mesh>
      {/* Green trees nearby */}
      <mesh position={[-3, 0.8, 1.5]}>
        <cylinderGeometry args={[0.1, 0.14, 1.6, 4]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-3, 2, 1.5]}>
        <coneGeometry args={[0.8, 1.8, 6]} />
        <meshStandardMaterial color="#2a6a22" roughness={0.8} />
      </mesh>
      <mesh position={[-3.8, 0.6, 2.5]}>
        <cylinderGeometry args={[0.08, 0.12, 1.2, 4]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-3.8, 1.5, 2.5]}>
        <coneGeometry args={[0.6, 1.4, 6]} />
        <meshStandardMaterial color="#228a1e" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.4} color="#ffeedd" distance={10} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  CHINA — Pagoda, Red Lanterns, Great Wall Segment, Bamboo
// ═════════════════════════════════════════════════════════════════
function ChinaZone() {
  const pos = CITY_POSITIONS["chinese-temple"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#c4b088" roughness={0.9} />
      </mesh>
      {/* Pagoda — 3 stacked levels */}
      <group position={[0, 0, -1]}>
        {/* Level 1 */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[2.5, 1.2, 2.5]} />
          <meshStandardMaterial color="#cc2222" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[3, 0.15, 3]} />
          <meshStandardMaterial color="#882222" roughness={0.7} />
        </mesh>
        {/* Curved roof edges level 1 */}
        <mesh position={[1.6, 1.3, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.6, 0.08, 3]} />
          <meshStandardMaterial color="#882222" roughness={0.7} />
        </mesh>
        <mesh position={[-1.6, 1.3, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.6, 0.08, 3]} />
          <meshStandardMaterial color="#882222" roughness={0.7} />
        </mesh>
        {/* Level 2 */}
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[1.8, 1, 1.8]} />
          <meshStandardMaterial color="#cc3333" roughness={0.7} />
        </mesh>
        <mesh position={[0, 2.65, 0]}>
          <boxGeometry args={[2.2, 0.15, 2.2]} />
          <meshStandardMaterial color="#882222" roughness={0.7} />
        </mesh>
        {/* Level 3 */}
        <mesh position={[0, 3.2, 0]}>
          <boxGeometry args={[1.2, 0.8, 1.2]} />
          <meshStandardMaterial color="#cc2222" roughness={0.7} />
        </mesh>
        <mesh position={[0, 3.75, 0]}>
          <boxGeometry args={[1.6, 0.15, 1.6]} />
          <meshStandardMaterial color="#882222" roughness={0.7} />
        </mesh>
        {/* Spire */}
        <mesh position={[0, 4.2, 0]}>
          <coneGeometry args={[0.1, 0.6, 4]} />
          <meshStandardMaterial color="#c4a030" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
      {/* Red lanterns */}
      {[[-1.8, 2.5, 1], [1.8, 2.5, 1], [0, 3.5, 1.5]].map(([lx, ly, lz], i) => (
        <group key={`lantern-${i}`}>
          <mesh position={[lx, ly, lz - 1]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 3]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
          <mesh position={[lx, ly - 0.3, lz - 1]}>
            <cylinderGeometry args={[0.12, 0.1, 0.25, 6]} />
            <meshStandardMaterial color="#cc2222" emissive="#cc2222" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      {/* Great Wall segment */}
      <mesh position={[0, 0.4, 3.5]}>
        <boxGeometry args={[8, 0.8, 0.6]} />
        <meshStandardMaterial color="#8a7a60" roughness={0.9} />
      </mesh>
      {/* Battlements on wall */}
      {[-3, -1.5, 0, 1.5, 3].map((wx) => (
        <mesh key={`batt-${wx}`} position={[wx, 1, 3.5]}>
          <boxGeometry args={[0.5, 0.4, 0.65]} />
          <meshStandardMaterial color="#7a6a50" roughness={0.9} />
        </mesh>
      ))}
      {/* Bamboo stalks */}
      {[[-4, 0, 0], [-4.4, 0, 0.5], [-3.6, 0, -0.5]].map(([bx, _by, bz], i) => (
        <mesh key={`bamboo-${i}`} position={[bx, 1.5, bz]}>
          <cylinderGeometry args={[0.06, 0.06, 3, 4]} />
          <meshStandardMaterial color="#4a8a2a" roughness={0.7} />
        </mesh>
      ))}
      {/* Bamboo leaves */}
      <mesh position={[-4, 3.2, 0]}>
        <sphereGeometry args={[0.5, 5, 4]} />
        <meshStandardMaterial color="#5aaa3a" roughness={0.8} transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffaa88" distance={10} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  EGYPT — Pyramid, Sphinx, Obelisk, Sand Dune
// ═════════════════════════════════════════════════════════════════
function EgyptZone() {
  const pos = CITY_POSITIONS["egyptian-pyramid"]!;
  return (
    <group position={pos}>
      {/* Sand ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d4b870" roughness={0.95} />
      </mesh>
      {/* Main pyramid (cone with 4 segments) */}
      <mesh position={[-1, 2.5, -1]}>
        <coneGeometry args={[3, 5, 4]} />
        <meshStandardMaterial color="#d4a850" roughness={0.8} />
      </mesh>
      {/* Smaller pyramid behind */}
      <mesh position={[2.5, 1.2, -3]}>
        <coneGeometry args={[1.5, 2.5, 4]} />
        <meshStandardMaterial color="#c4a048" roughness={0.8} />
      </mesh>
      {/* Sphinx hint — body + head */}
      <group position={[3, 0, 2]}>
        {/* Body */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.8, 0.5, 0.8]} />
          <meshStandardMaterial color="#c4a060" roughness={0.9} />
        </mesh>
        {/* Head */}
        <mesh position={[-0.7, 0.7, 0]}>
          <sphereGeometry args={[0.35, 6, 5]} />
          <meshStandardMaterial color="#b89850" roughness={0.9} />
        </mesh>
        {/* Front paws */}
        <mesh position={[-1.1, 0.15, 0.2]}>
          <boxGeometry args={[0.5, 0.2, 0.2]} />
          <meshStandardMaterial color="#c4a060" roughness={0.9} />
        </mesh>
        <mesh position={[-1.1, 0.15, -0.2]}>
          <boxGeometry args={[0.5, 0.2, 0.2]} />
          <meshStandardMaterial color="#c4a060" roughness={0.9} />
        </mesh>
      </group>
      {/* Obelisk (tall thin tapered box) */}
      <mesh position={[-4, 1.8, 1.5]}>
        <boxGeometry args={[0.4, 3.5, 0.4]} />
        <meshStandardMaterial color="#5a5040" roughness={0.8} />
      </mesh>
      <mesh position={[-4, 3.7, 1.5]}>
        <coneGeometry args={[0.3, 0.5, 4]} />
        <meshStandardMaterial color="#c4a030" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Sand dune (squashed sphere) */}
      <mesh position={[1, -0.2, 3.5]} scale={[3, 0.4, 1.5]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#d8b868" roughness={0.95} />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#ffdd88" distance={12} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  SPAIN — Cathedral/Sagrada Familia, Plaza, Guitar, Tiles
// ═════════════════════════════════════════════════════════════════
function SpainZone() {
  const pos = CITY_POSITIONS["spanish-plaza"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d4a880" roughness={0.9} />
      </mesh>
      {/* Plaza lighter circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 1.5]}>
        <circleGeometry args={[2, IS_MOBILE ? 10 : 16]} />
        <meshStandardMaterial color="#e0d0b8" roughness={0.85} />
      </mesh>
      {/* Cathedral main body */}
      <mesh position={[0, 2, -1.5]}>
        <boxGeometry args={[3, 4, 2]} />
        <meshStandardMaterial color="#d4a870" roughness={0.75} />
      </mesh>
      {/* Tower spires (Sagrada Familia style) */}
      {[-1, -0.3, 0.3, 1].map((x, i) => (
        <group key={`spire-${i}`}>
          <mesh position={[x, 4.5 + i * 0.3, -1.5]}>
            <cylinderGeometry args={[0.15, 0.2, 3 + i * 0.2, 6]} />
            <meshStandardMaterial color="#c49860" roughness={0.75} />
          </mesh>
          <mesh position={[x, 6.2 + i * 0.4, -1.5]}>
            <coneGeometry args={[0.2, 0.6, 6]} />
            <meshStandardMaterial color="#b88850" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Rose window */}
      <mesh position={[0, 3, -0.49]}>
        <circleGeometry args={[0.5, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#4466aa" emissive="#223366" emissiveIntensity={0.2} />
      </mesh>
      {/* Guitar (squashed oval on ground) */}
      <mesh position={[3, 0.1, 2]} rotation={[-Math.PI / 2, 0, 0.4]} scale={[0.6, 1, 0.15]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color="#8a5a2a" roughness={0.8} />
      </mesh>
      <mesh position={[3.2, 0.12, 1.5]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 4]} />
        <meshStandardMaterial color="#6a4a1a" roughness={0.8} />
      </mesh>
      {/* Tile accents (colorful small squares on ground) */}
      <mesh position={[-2, -0.43, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial color="#2266aa" roughness={0.7} />
      </mesh>
      <mesh position={[-2.5, -0.43, 2.3]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshStandardMaterial color="#cc4422" roughness={0.7} />
      </mesh>
      <mesh position={[-1.8, -0.43, 2.6]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial color="#ddaa22" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.4} color="#ffcc88" distance={10} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  AUSTRALIA — Sydney Opera House, Beach, Surfboard, Kangaroo
// ═════════════════════════════════════════════════════════════════
function AustraliaZone() {
  const pos = CITY_POSITIONS["australian-coast"]!;
  return (
    <group position={pos}>
      {/* Beach sand ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#e8d8a0" roughness={0.95} />
      </mesh>
      {/* Sydney Opera House — 3 white sail shapes */}
      <group position={[-1, 0, -2]}>
        {/* Sail 1 */}
        <mesh position={[-1, 1.2, 0]} rotation={[0, 0, 0.15]}>
          <coneGeometry args={[0.8, 2.5, 4, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#f0ece8" roughness={0.5} />
        </mesh>
        {/* Sail 2 (tallest) */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0.1]}>
          <coneGeometry args={[0.9, 3, 4, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#f0ece8" roughness={0.5} />
        </mesh>
        {/* Sail 3 */}
        <mesh position={[1, 1, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.7, 2, 4, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#f0ece8" roughness={0.5} />
        </mesh>
        {/* Base platform */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4, 0.3, 1.5]} />
          <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
        </mesh>
      </group>
      {/* Blue water at edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 5]}>
        <planeGeometry args={[12, 2]} />
        <meshStandardMaterial color="#4499cc" transparent opacity={0.4} roughness={0.3} />
      </mesh>
      {/* Surfboard leaning */}
      <mesh position={[3.5, 0.6, 1]} rotation={[0, 0.2, 1.2]}>
        <boxGeometry args={[0.25, 1.4, 0.05]} />
        <meshStandardMaterial color="#22bbcc" roughness={0.6} />
      </mesh>
      {/* Surfboard stripe */}
      <mesh position={[3.5, 0.6, 1.03]} rotation={[0, 0.2, 1.2]}>
        <boxGeometry args={[0.08, 1.2, 0.05]} />
        <meshStandardMaterial color="#ff6644" roughness={0.6} />
      </mesh>
      {/* Coral/reef rock */}
      <mesh position={[-3.5, 0, 2.5]}>
        <sphereGeometry args={[0.5, 6, 5]} />
        <meshStandardMaterial color="#dd7744" roughness={0.8} />
      </mesh>
      <mesh position={[-3, 0.1, 2.8]}>
        <sphereGeometry args={[0.3, 5, 4]} />
        <meshStandardMaterial color="#cc6633" roughness={0.8} />
      </mesh>
      {/* Kangaroo silhouette */}
      <group position={[2, 0, 3]}>
        {/* Body */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.6, 0.4]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        {/* Head */}
        <mesh position={[-0.4, 0.9, 0]}>
          <sphereGeometry args={[0.2, 5, 4]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.35, 1.15, 0.08]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 3]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        <mesh position={[-0.45, 1.15, -0.08]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 3]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        {/* Back legs */}
        <mesh position={[0.2, 0.15, 0.12]}>
          <cylinderGeometry args={[0.06, 0.08, 0.4, 4]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        <mesh position={[0.2, 0.15, -0.12]}>
          <cylinderGeometry args={[0.06, 0.08, 0.4, 4]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
        {/* Tail */}
        <mesh position={[0.7, 0.3, 0]} rotation={[0, 0, 0.6]}>
          <cylinderGeometry args={[0.04, 0.06, 0.8, 4]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
        </mesh>
      </group>
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffeedd" distance={12} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  GLOBAL ELEMENTS
// ═════════════════════════════════════════════════════════════════
function WireframeGlobe() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, 5, 2]}>
      <sphereGeometry args={[3, 16, 12]} />
      <meshBasicMaterial color="#44aaaa" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

function CloudPuffs() {
  const rng = useMemo(() => seededRandom(999), []);
  const clouds = useMemo(() =>
    Array.from({ length: IS_MOBILE ? 4 : 8 }, () => ({
      pos: [rng() * 60 - 30, rng() * 5 + 10, rng() * 60 - 20] as [number, number, number],
      scale: rng() * 1.5 + 1,
      speed: rng() * 0.002 + 0.001,
    })),
    [rng]
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((group, i) => {
      const c = clouds[i];
      group.position.x = c.pos[0] + Math.sin(clock.elapsedTime * c.speed * 50) * 3;
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <group key={i} position={c.pos} scale={c.scale}>
          <mesh>
            <sphereGeometry args={[0.8, 6, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.7, 0.1, 0]}>
            <sphereGeometry args={[0.6, 6, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
          </mesh>
          <mesh position={[-0.5, -0.1, 0.3]}>
            <sphereGeometry args={[0.5, 6, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CompassRose() {
  const markers: { pos: [number, number, number]; rot: number; color: string }[] = [
    { pos: [0, 0.02, -1.6], rot: 0, color: "#cc2222" },
    { pos: [0, 0.02, 1.6], rot: Math.PI, color: "#666" },
    { pos: [1.6, 0.02, 0], rot: -Math.PI / 2, color: "#666" },
    { pos: [-1.6, 0.02, 0], rot: Math.PI / 2, color: "#666" },
  ];
  return (
    <group position={[0, -0.44, 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 24]} />
        <meshStandardMaterial color="#d4c090" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.2, 1.4, 24]} />
        <meshStandardMaterial color="#a08050" roughness={0.7} />
      </mesh>
      {markers.map((m, i) => (
        <mesh key={i} position={m.pos} rotation={[-Math.PI / 2, m.rot, 0]}>
          <coneGeometry args={[0.15, 0.5, 3]} />
          <meshStandardMaterial color={m.color} />
        </mesh>
      ))}
    </group>
  );
}

function DistantMountains() {
  const mountains: { pos: [number, number, number]; h: number; r: number }[] = [
    { pos: [-40, 2, -45], h: 12, r: 6 },
    { pos: [-25, 2, -50], h: 18, r: 8 },
    { pos: [30, 2, -48], h: 14, r: 7 },
    { pos: [50, 2, -42], h: 10, r: 5 },
  ];
  return (
    <group>
      {mountains.map((m, i) => (
        <mesh key={i} position={m.pos}>
          <coneGeometry args={[m.r, m.h, 5]} />
          <meshStandardMaterial color="#7a8a9a" roughness={0.9} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function CountryFlags() {
  const flags: { pos: [number, number, number]; stripes: string[] }[] = [
    { pos: [-17, 0, -23], stripes: ["#cc2222", "#ffffff", "#2244aa"] },
    { pos: [-1, 0, -23], stripes: ["#0055a4", "#ffffff", "#ef4135"] },
    { pos: [15, 0, -19], stripes: ["#009246", "#ffffff", "#ce2b37"] },
    { pos: [31, 0, -15], stripes: ["#ffffff", "#bc002d", "#ffffff"] },
    { pos: [23, 2, -1], stripes: ["#ff9933", "#ffffff", "#138808"] },
    { pos: [7, 0, 3], stripes: ["#006847", "#ffffff", "#ce1126"] },
    { pos: [-9, 0, 9], stripes: ["#009639", "#ffcd00", "#000000"] },
    { pos: [7, 0, 19], stripes: ["#009c3b", "#ffdf00", "#002776"] },
    { pos: [-4, 0, -1], stripes: ["#ffffff", "#00966e", "#d62612"] },   // Bulgaria
    { pos: [-24, 0, 3], stripes: ["#3c3b6e", "#ffffff", "#b22234"] },   // USA
    { pos: [12, 0, -1], stripes: ["#000000", "#dd0000", "#ffcc00"] },   // Germany
    { pos: [32, 0, -5], stripes: ["#de2910", "#ffde00", "#de2910"] },   // China
    { pos: [24, 0, 13], stripes: ["#ce1126", "#ffffff", "#000000"] },   // Egypt
    { pos: [-10, 0, 13], stripes: ["#aa151b", "#f1bf00", "#aa151b"] },  // Spain
    { pos: [4, 0, 25], stripes: ["#012169", "#ffffff", "#ff0000"] },    // Australia
  ];

  return (
    <group>
      {flags.map((f, i) => (
        <group key={i} position={f.pos}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 3, 4]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          {f.stripes.map((color, s) => (
            <mesh key={s} position={[0.4, 2.7 - s * 0.25, 0]}>
              <planeGeometry args={[0.8, 0.22]} />
              <meshStandardMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FlyingAirplane() {
  const ref = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const points = [
      new THREE.Vector3(-24, 12, -18),
      new THREE.Vector3(-8, 15, -18),
      new THREE.Vector3(8, 14, -14),
      new THREE.Vector3(24, 13, -10),
      new THREE.Vector3(16, 14, 4),
      new THREE.Vector3(0, 12, 8),
      new THREE.Vector3(-16, 13, 14),
      new THREE.Vector3(0, 14, 24),
      new THREE.Vector3(-24, 12, -18),
    ];
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.02) % 1;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    ref.current.position.copy(pos);
    ref.current.lookAt(pos.clone().add(tangent));
  });

  return (
    <group ref={ref}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.1, 1.2, 6]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      <mesh>
        <boxGeometry args={[1.8, 0.04, 0.4]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      <mesh position={[0, 0.15, -0.5]}>
        <boxGeometry args={[0.5, 0.3, 0.04]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
    </group>
  );
}

function FlightPaths() {
  const curve = useMemo(() => {
    const points = [
      new THREE.Vector3(-24, 8, -18),
      new THREE.Vector3(-8, 10, -18),
      new THREE.Vector3(8, 9, -14),
      new THREE.Vector3(24, 8, -10),
      new THREE.Vector3(16, 9, 4),
      new THREE.Vector3(0, 8, 8),
      new THREE.Vector3(-16, 9, 14),
      new THREE.Vector3(0, 10, 24),
      new THREE.Vector3(-8, 9, 4),
      new THREE.Vector3(-28, 8, 8),
      new THREE.Vector3(-14, 9, 18),
      new THREE.Vector3(0, 10, 30),
      new THREE.Vector3(20, 9, 18),
      new THREE.Vector3(28, 8, 0),
      new THREE.Vector3(8, 9, 4),
      new THREE.Vector3(-24, 8, -18),
    ];
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  const linePoints = useMemo(() => curve.getPoints(120), [curve]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(linePoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
          count={linePoints.length}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.1} />
    </line>
  );
}

// ═════════════════════════════════════════════════════════════════
//  GROUND PLANE
// ═════════════════════════════════════════════════════════════════
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[140, 140]} />
      <meshStandardMaterial color="#8aaa6a" roughness={0.95} />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  CITY MARKER
// ═════════════════════════════════════════════════════════════════
function CultureCityMarker({
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
  const [x, baseY, z] = cityTo3D(city);
  const size = isNext ? 110 : unlocked ? 96 : 72;

  return (
    <group position={[x, baseY + 5, z]}>
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
          <ringGeometry args={[3.5, 5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#ff6699" : "#ec4899"}
            transparent
            opacity={isNext ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {isNext && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.52, 0]}>
          <ringGeometry args={[5, 6, 32]} />
          <meshBasicMaterial color="#ff6699" transparent opacity={0.12} />
        </mesh>
      )}

      <Html center distanceFactor={50} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center transition-all duration-200 active:scale-90"
          style={{ transform: "translateY(-20px)" }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: unlocked
                ? "radial-gradient(circle at 35% 35%, #fff0f5, #f0a0c0)"
                : "radial-gradient(circle at 35% 35%, #4a4a48, #2a2a28)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#ec4899" : "#555555"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.5), 0 0 ${isNext ? 24 : 10}px #ec4899${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 44 : 36 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 28, opacity: 0.4 }}>🔒</span>
            )}
          </div>

          <div
            className="mt-1.5 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(30,10,20,0.92)" : "rgba(30,30,30,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#666",
                whiteSpace: "nowrap",
              }}
            >
              {city.building[lang]}
            </p>
          </div>

          <p style={{ fontSize: 11, color: unlocked ? "#f0a0c0" : "#555", marginTop: 2, fontWeight: 600 }}>
            {city.name[lang]}
          </p>

          {unlocked && (
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2].map((s) => (
                <span key={s} style={{ fontSize: 12, opacity: s < completedLevels ? 1 : 0.2 }}>⭐</span>
              ))}
            </div>
          )}

          {!unlocked && city.requiredXP > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#ec4899", marginTop: 2 }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  CAMERA CONTROLS
// ═════════════════════════════════════════════════════════════════
function CultureCameraControls() {
  const controlsRef = useRef<any>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useFrame(() => {
    if (!controlsRef.current) return;
    const t = controlsRef.current.target;
    const dist = controlsRef.current.object.position.distanceTo(t);
    const f = THREE.MathUtils.clamp(dist / 100, 0, 1);
    const maxX = THREE.MathUtils.lerp(50, 5, f);
    const maxZ = THREE.MathUtils.lerp(50, 5, f);
    t.x = THREE.MathUtils.clamp(t.x, -maxX, maxX);
    t.z = THREE.MathUtils.clamp(t.z, -maxZ, maxZ);
    t.y = 0;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate
      enablePan
      enableZoom
      zoomToCursor={!isTouchDevice}
      screenSpacePanning
      enableDamping
      dampingFactor={0.08}
      minDistance={20}
      maxDistance={80}
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

// ═════════════════════════════════════════════════════════════════
//  SCENE READY DETECTOR
// ═════════════════════════════════════════════════════════════════
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

// ═════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export function CultureMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(CULTURE_CITIES.map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...CULTURE_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = CULTURE_CITIES.find((c) => !unlockedIds.has(c.id));
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
        background: "linear-gradient(180deg, #87CEEB 0%, #b8d8e8 40%, #d4c4a4 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 50, 55], fov: 45 }}
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

        <color attach="background" args={["#87CEEB"]} />
        <fog attach="fog" args={["#c8d8e8", 80, 180]} />

        <hemisphereLight intensity={0.6} color="#87CEEB" groundColor="#d4c4a4" />
        <directionalLight position={[-15, 30, -10]} intensity={1.2} color="#fff8e0" />
        <ambientLight intensity={0.35} color="#ffe8cc" />

        <Suspense fallback={null}>
          <GroundPlane />

          <UKZone />
          <FranceZone />
          <ItalyZone />
          <JapanZone />
          <IndiaZone />
          <MexicoZone />
          <AfricaZone />
          <BrazilZone />
          <BulgariaZone />
          <USAZone />
          <GermanyZone />
          <ChinaZone />
          <EgyptZone />
          <SpainZone />
          <AustraliaZone />

          <WireframeGlobe />
          <CloudPuffs />
          <CompassRose />
          <DistantMountains />

          {!IS_MOBILE && (
            <>
              <FlyingAirplane />
              <FlightPaths />
              <CountryFlags />
            </>
          )}

          {CULTURE_CITIES.map((city) => (
            <CultureCityMarker
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

        <CultureCameraControls />
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: overlayVisible ? 1 : 0,
            background: "linear-gradient(180deg, #87CEEB 0%, #b8d8e8 40%, #d4c4a4 100%)",
          }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌍
              </div>
            </div>
            <p className="text-gray-700/80 text-sm font-medium tracking-wider">
              Exploring the world...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
