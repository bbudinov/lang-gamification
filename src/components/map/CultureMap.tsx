"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Mobile detection ───────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

// ─── Culture world cities ───────────────────────────────────────
const CULTURE_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "culture")?.topicIds ?? []
);
const CULTURE_CITIES = CITIES.filter((c) => CULTURE_TOPIC_IDS.has(c.topicId));

// ─── City 3D positions (world-map layout) ───────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "italian-plaza": [-24, 0, -16],
  "japanese-street": [24, 0, -16],
  "french-cafe": [-16, 0, -4],
  "mexican-market": [16, 0, -4],
  "indian-temple": [0, 2, -20],
  "african-village": [-20, 0, 14],
  "british-pub": [20, 0, 14],
  "brazilian-beach": [0, 0, 24],
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Route pairs for brick roads ────────────────────────────────
const ROUTE_PAIRS: [string, string][] = [
  ["italian-plaza", "french-cafe"],
  ["french-cafe", "indian-temple"],
  ["indian-temple", "japanese-street"],
  ["french-cafe", "african-village"],
  ["japanese-street", "mexican-market"],
  ["mexican-market", "british-pub"],
  ["african-village", "brazilian-beach"],
  ["brazilian-beach", "british-pub"],
  ["italian-plaza", "indian-temple"],
  ["mexican-market", "brazilian-beach"],
];

// ─── Ground plane ───────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <circleGeometry args={[65, IS_MOBILE ? 32 : 48]} />
      <meshStandardMaterial color="#c4a882" roughness={0.95} />
    </mesh>
  );
}

// ─── Brick roads between zones ──────────────────────────────────
function BrickRoads() {
  const shades = ["#b8956e", "#c4a07a", "#a8845e", "#c9a882", "#b08a64"];
  return (
    <group>
      {ROUTE_PAIRS.map(([a, b], ri) => {
        const pa = CITY_POSITIONS[a];
        const pb = CITY_POSITIONS[b];
        if (!pa || !pb) return null;
        const dx = pb[0] - pa[0];
        const dz = pb[2] - pa[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const mx = (pa[0] + pb[0]) / 2;
        const mz = (pa[2] + pb[2]) / 2;
        const angle = Math.atan2(dx, dz);
        return (
          <mesh
            key={`road-${ri}`}
            rotation={[-Math.PI / 2, 0, -angle]}
            position={[mx, -0.44, mz]}
          >
            <planeGeometry args={[0.8, dist]} />
            <meshStandardMaterial
              color={shades[ri % shades.length]}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Flag pole with 3-stripe flag ───────────────────────────────
function FlagPole({
  position,
  colors,
}: {
  position: [number, number, number];
  colors: [string, string, string];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
        <meshStandardMaterial color="#555555" roughness={0.8} />
      </mesh>
      {colors.map((c, i) => (
        <mesh key={i} position={[0.35, 2.7 - i * 0.3, 0]}>
          <planeGeometry args={[0.6, 0.28]} />
          <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Compass Rose (center of map) ───────────────────────────────
function CompassRose() {
  return (
    <group position={[0, -0.43, 0]}>
      {/* Base circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#d4c090" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.6, 3, 32]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.8} />
      </mesh>
      {/* Cardinal direction markers */}
      {[
        { label: "N", pos: [0, 0.02, -2.2] as [number, number, number] },
        { label: "S", pos: [0, 0.02, 2.2] as [number, number, number] },
        { label: "E", pos: [2.2, 0.02, 0] as [number, number, number] },
        { label: "W", pos: [-2.2, 0.02, 0] as [number, number, number] },
      ].map((d) => (
        <mesh key={d.label} position={d.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 6]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.8} />
        </mesh>
      ))}
      {/* Compass star — 4 triangles */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((rot, i) => (
        <mesh
          key={`star-${i}`}
          rotation={[-Math.PI / 2, 0, rot]}
          position={[0, 0.015, 0]}
        >
          <coneGeometry args={[0.5, 2, 3]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#8a6a3a" : "#c4a060"}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Rotating wireframe globe ───────────────────────────────────
function RotatingGlobe() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <mesh ref={ref} position={[0, 3.5, 0]}>
      <sphereGeometry args={[2, 16, 12]} />
      <meshStandardMaterial
        color="#c4a882"
        wireframe
        transparent
        opacity={0.35}
      />
    </mesh>
  );
}

// ─── Italian Plaza zone ─────────────────────────────────────────
function ItalianPlaza() {
  const pos = CITY_POSITIONS["italian-plaza"]!;
  return (
    <group position={pos}>
      {/* Ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d4a870" roughness={0.9} />
      </mesh>
      {/* Terracotta buildings */}
      <mesh position={[-2.5, 1.2, -1.5]}>
        <boxGeometry args={[2, 2.4, 1.8]} />
        <meshStandardMaterial color="#cc7744" roughness={0.85} />
      </mesh>
      <mesh position={[2.5, 1, -1.5]}>
        <boxGeometry args={[1.8, 2, 1.6]} />
        <meshStandardMaterial color="#d48844" roughness={0.85} />
      </mesh>
      {/* Arched entrance (half-cylinder) */}
      <mesh position={[0, 1.5, -2]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.6, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#bb6633" roughness={0.8} />
      </mesh>
      {/* Fountain base */}
      <mesh position={[0, 0.3, 1]}>
        <cylinderGeometry args={[0.8, 1, 0.6, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.7} />
      </mesh>
      {/* Fountain water sphere */}
      <mesh position={[0, 0.9, 1]}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#4488cc"
          emissiveIntensity={0.3}
          roughness={0.3}
        />
      </mesh>
      {/* String lights (thin line with emissive dots) */}
      {!IS_MOBILE && (
        <>
          <mesh position={[0, 3, -1.5]} rotation={[0, 0, 0.15]}>
            <cylinderGeometry args={[0.02, 0.02, 5.5, 3]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {[-2, -1, 0, 1, 2].map((x) => (
            <mesh key={`light-${x}`} position={[x, 2.85 + Math.abs(x) * 0.05, -1.5]}>
              <sphereGeometry args={[0.08, 4, 3]} />
              <meshStandardMaterial
                color="#ffee88"
                emissive="#ffdd44"
                emissiveIntensity={0.8}
              />
            </mesh>
          ))}
        </>
      )}
      {/* Italian flag accent stripes */}
      <mesh position={[-2.5, 2.6, -1.5]}>
        <boxGeometry args={[2, 0.1, 0.1]} />
        <meshStandardMaterial color="#009246" />
      </mesh>
      <mesh position={[2.5, 2.2, -1.5]}>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#ce2b37" />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#ffddaa" distance={10} />
    </group>
  );
}

// ─── Japanese Street zone ───────────────────────────────────────
function JapaneseStreet() {
  const pos = CITY_POSITIONS["japanese-street"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d8ccc0" roughness={0.9} />
      </mesh>
      {/* Torii gate */}
      <mesh position={[-1.2, 1.5, -2]}>
        <cylinderGeometry args={[0.15, 0.18, 3, 6]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      <mesh position={[1.2, 1.5, -2]}>
        <cylinderGeometry args={[0.15, 0.18, 3, 6]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.2, -2]}>
        <boxGeometry args={[3.2, 0.3, 0.4]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.7, -2]}>
        <boxGeometry args={[2.8, 0.15, 0.3]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      {/* Pagoda — stacked boxes */}
      <mesh position={[2.5, 0.5, 1]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.8} />
      </mesh>
      <mesh position={[2.5, 1.3, 1]}>
        <boxGeometry args={[2.4, 0.15, 2.4]} />
        <meshStandardMaterial color="#882222" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, 1.8, 1]}>
        <boxGeometry args={[1.5, 0.8, 1.5]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.8} />
      </mesh>
      <mesh position={[2.5, 2.4, 1]}>
        <boxGeometry args={[1.8, 0.15, 1.8]} />
        <meshStandardMaterial color="#882222" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, 2.8, 1]}>
        <boxGeometry args={[1, 0.6, 1]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.8} />
      </mesh>
      <mesh position={[2.5, 3.3, 1]}>
        <boxGeometry args={[1.3, 0.15, 1.3]} />
        <meshStandardMaterial color="#882222" roughness={0.7} />
      </mesh>
      {/* Cherry blossom tree */}
      <mesh position={[-2.5, 1, 1.5]}>
        <cylinderGeometry args={[0.15, 0.2, 2, 5]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-2.5, 2.5, 1.5]}>
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color="#ffaacc" roughness={0.7} transparent opacity={0.85} />
      </mesh>
      {/* Lanterns */}
      <mesh position={[-0.5, 2, 0.5]}>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 6]} />
        <meshStandardMaterial color="#cc3333" emissive="#cc2222" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.5, 1.8, -0.5]}>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 6]} />
        <meshStandardMaterial color="#cc3333" emissive="#cc2222" emissiveIntensity={0.3} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#ffddcc" distance={10} />
    </group>
  );
}

// ─── Cherry blossom petals (desktop only) ───────────────────────
function CherryBlossomPetals() {
  const ref = useRef<THREE.Group>(null);
  const petals = useMemo(() => {
    const pos = CITY_POSITIONS["japanese-street"]!;
    return Array.from({ length: 20 }, (_, i) => ({
      x: pos[0] + (Math.random() - 0.5) * 8,
      y: 2 + Math.random() * 4,
      z: pos[2] + (Math.random() - 0.5) * 8,
      speed: 0.3 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const p = petals[i];
      const mesh = child as THREE.Mesh;
      mesh.position.y = ((p.y - p.speed * t * 0.3) % 5) + 1;
      if (mesh.position.y < 0) mesh.position.y += 5;
      mesh.position.x = p.x + Math.sin(t * 0.5 + p.phase) * p.drift;
      mesh.rotation.z = t * 0.5 + p.phase;
    });
  });

  return (
    <group ref={ref}>
      {petals.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial
            color="#ffbbdd"
            side={THREE.DoubleSide}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── French Café zone ───────────────────────────────────────────
function FrenchCafe() {
  const pos = CITY_POSITIONS["french-cafe"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
      </mesh>
      {/* Café building */}
      <mesh position={[0, 1.2, -2]}>
        <boxGeometry args={[3, 2.4, 2]} />
        <meshStandardMaterial color="#f5edd8" roughness={0.8} />
      </mesh>
      {/* Striped awning */}
      <mesh position={[0, 2.2, -0.8]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[3.2, 0.08, 1.2]} />
        <meshStandardMaterial color="#cc3333" roughness={0.7} />
      </mesh>
      {/* White stripes on awning */}
      <mesh position={[-0.8, 2.22, -0.8]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.4, 0.09, 1.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      <mesh position={[0.8, 2.22, -0.8]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.4, 0.09, 1.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {/* Outdoor tables */}
      {[[-1, 0], [1, 0]].map(([tx, tz], i) => (
        <group key={`table-${i}`} position={[tx, 0, tz + 1]}>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
            <meshStandardMaterial color="#f0e8d0" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 4]} />
            <meshStandardMaterial color="#555555" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Eiffel tower hint — 4 angled thin cylinders converging */}
      <group position={[3.5, 0, 1]}>
        {[
          { pos: [0.3, 2, 0.3] as [number, number, number], rot: [0, 0, 0.12] as [number, number, number] },
          { pos: [-0.3, 2, 0.3] as [number, number, number], rot: [0, 0, -0.12] as [number, number, number] },
          { pos: [0.3, 2, -0.3] as [number, number, number], rot: [0.12, 0, 0.08] as [number, number, number] },
          { pos: [-0.3, 2, -0.3] as [number, number, number], rot: [-0.12, 0, -0.08] as [number, number, number] },
        ].map((leg, i) => (
          <mesh key={i} position={leg.pos} rotation={leg.rot}>
            <cylinderGeometry args={[0.03, 0.06, 4, 4]} />
            <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        {/* Top point */}
        <mesh position={[0, 4.2, 0]}>
          <coneGeometry args={[0.08, 0.4, 4]} />
          <meshStandardMaterial color="#777777" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      {/* Blue/white/red accents */}
      <mesh position={[-1.5, 2.5, -2]}>
        <boxGeometry args={[0.15, 0.6, 0.1]} />
        <meshStandardMaterial color="#002395" />
      </mesh>
      <mesh position={[-1.3, 2.5, -2]}>
        <boxGeometry args={[0.15, 0.6, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-1.1, 2.5, -2]}>
        <boxGeometry args={[0.15, 0.6, 0.1]} />
        <meshStandardMaterial color="#ed2939" />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#fff5dd" distance={10} />
    </group>
  );
}

// ─── Mexican Market zone ────────────────────────────────────────
function MexicanMarket() {
  const pos = CITY_POSITIONS["mexican-market"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d4b888" roughness={0.9} />
      </mesh>
      {/* Colorful market stalls */}
      <mesh position={[-2, 0.8, -1.5]}>
        <boxGeometry args={[1.5, 1.6, 1.2]} />
        <meshStandardMaterial color="#f5edd0" roughness={0.8} />
      </mesh>
      <mesh position={[-2, 1.75, -1.5]}>
        <boxGeometry args={[1.8, 0.3, 1.5]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      <mesh position={[0.5, 0.8, -1.5]}>
        <boxGeometry args={[1.5, 1.6, 1.2]} />
        <meshStandardMaterial color="#f5edd0" roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 1.75, -1.5]}>
        <boxGeometry args={[1.8, 0.3, 1.5]} />
        <meshStandardMaterial color="#22aa44" roughness={0.7} />
      </mesh>
      <mesh position={[3, 0.8, -1.5]}>
        <boxGeometry args={[1.5, 1.6, 1.2]} />
        <meshStandardMaterial color="#f5edd0" roughness={0.8} />
      </mesh>
      <mesh position={[3, 1.75, -1.5]}>
        <boxGeometry args={[1.8, 0.3, 1.5]} />
        <meshStandardMaterial color="#ddcc22" roughness={0.7} />
      </mesh>
      {/* Papel picado (colorful hanging planes) */}
      {!IS_MOBILE && (
        <>
          {/* Poles */}
          <mesh position={[-3, 1.8, 0.5]}>
            <cylinderGeometry args={[0.04, 0.04, 3.6, 3]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
          <mesh position={[3.5, 1.8, 0.5]}>
            <cylinderGeometry args={[0.04, 0.04, 3.6, 3]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
          {/* String */}
          <mesh position={[0.25, 3.4, 0.5]}>
            <cylinderGeometry args={[0.02, 0.02, 6.5, 3]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {/* Papel picado flags */}
          {[
            { x: -2, color: "#ff4488" },
            { x: -0.8, color: "#44cc88" },
            { x: 0.4, color: "#ffaa22" },
            { x: 1.6, color: "#4488ff" },
            { x: 2.8, color: "#cc44ff" },
          ].map((f, i) => (
            <mesh key={i} position={[f.x, 3.1, 0.5]} rotation={[0.1, 0, 0]}>
              <planeGeometry args={[0.8, 0.5]} />
              <meshStandardMaterial
                color={f.color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.85}
              />
            </mesh>
          ))}
        </>
      )}
      {/* Cactus */}
      <mesh position={[-3.5, 0.8, 2]}>
        <cylinderGeometry args={[0.2, 0.25, 1.6, 6]} />
        <meshStandardMaterial color="#228833" roughness={0.8} />
      </mesh>
      <mesh position={[-3.1, 1.2, 2]} rotation={[0, 0, 0.8]}>
        <cylinderGeometry args={[0.12, 0.15, 0.6, 5]} />
        <meshStandardMaterial color="#22aa44" roughness={0.8} />
      </mesh>
      <mesh position={[-3.9, 1, 2]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.1, 0.13, 0.5, 5]} />
        <meshStandardMaterial color="#22aa44" roughness={0.8} />
      </mesh>
      {/* Piñata */}
      <mesh position={[1.5, 2.5, 2]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 3]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[1.5, 2, 2]}>
        <sphereGeometry args={[0.35, 6, 5]} />
        <meshStandardMaterial color="#ff6688" roughness={0.6} />
      </mesh>
      <mesh position={[1.5, 1.8, 2]}>
        <coneGeometry args={[0.15, 0.3, 5]} />
        <meshStandardMaterial color="#ffcc22" roughness={0.6} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#ffeeaa" distance={10} />
    </group>
  );
}

// ─── Indian Temple zone ─────────────────────────────────────────
function IndianTemple() {
  const pos = CITY_POSITIONS["indian-temple"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#d4b890" roughness={0.9} />
      </mesh>
      {/* Steps leading up */}
      <mesh position={[0, 0.15, 2]}>
        <boxGeometry args={[4, 0.3, 1.5]} />
        <meshStandardMaterial color="#d4a860" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.45, 1]}>
        <boxGeometry args={[3.5, 0.3, 1.5]} />
        <meshStandardMaterial color="#d4a860" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[3, 0.3, 1.5]} />
        <meshStandardMaterial color="#d4a860" roughness={0.8} />
      </mesh>
      {/* Temple base */}
      <mesh position={[0, 1.5, -1]}>
        <boxGeometry args={[3.5, 2, 2.5]} />
        <meshStandardMaterial color="#e8a840" roughness={0.7} />
      </mesh>
      {/* Dome */}
      <mesh position={[0, 3, -1]}>
        <sphereGeometry args={[1.5, IS_MOBILE ? 8 : 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8a020" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Dome tip */}
      <mesh position={[0, 3.5, -1]}>
        <coneGeometry args={[0.15, 0.5, 6]} />
        <meshStandardMaterial color="#ffcc22" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Elephant statue */}
      <mesh position={[3, 0.5, 1.5]}>
        <boxGeometry args={[0.8, 0.8, 1.2]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      <mesh position={[3, 1, 1.5]}>
        <sphereGeometry args={[0.45, 6, 5]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      {/* Marigold garlands (thin orange lines on building) */}
      {!IS_MOBILE &&
        [-0.5, 0, 0.5].map((y, i) => (
          <mesh key={i} position={[0, 1.5 + y, 0.26]}>
            <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
            <meshStandardMaterial
              color="#ff8800"
              emissive="#ff6600"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffcc88" distance={12} />
    </group>
  );
}

// ─── African Village zone ───────────────────────────────────────
function AfricanVillage() {
  const pos = CITY_POSITIONS["african-village"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#c4a070" roughness={0.95} />
      </mesh>
      {/* Round hut 1 */}
      <mesh position={[-2, 0.8, -1]}>
        <cylinderGeometry args={[1.2, 1.3, 1.6, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#a07040" roughness={0.9} />
      </mesh>
      <mesh position={[-2, 2, -1]}>
        <coneGeometry args={[1.5, 1.2, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#ccaa55" roughness={0.9} />
      </mesh>
      {/* Round hut 2 (smaller) */}
      <mesh position={[2.5, 0.6, -0.5]}>
        <cylinderGeometry args={[0.9, 1, 1.2, IS_MOBILE ? 8 : 10]} />
        <meshStandardMaterial color="#a07848" roughness={0.9} />
      </mesh>
      <mesh position={[2.5, 1.5, -0.5]}>
        <coneGeometry args={[1.2, 1, IS_MOBILE ? 8 : 10]} />
        <meshStandardMaterial color="#c8a050" roughness={0.9} />
      </mesh>
      {/* Baobab tree */}
      <mesh position={[0.5, 1, 2.5]}>
        <cylinderGeometry args={[0.6, 0.8, 2, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.95} />
      </mesh>
      <mesh position={[0.5, 2.5, 2.5]}>
        <cylinderGeometry args={[2, 0.3, 0.8, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#448833" roughness={0.8} />
      </mesh>
      {/* Drums */}
      <mesh position={[-3, 0.25, 2]}>
        <cylinderGeometry args={[0.25, 0.3, 0.5, 6]} />
        <meshStandardMaterial color="#6a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-2.5, 0.2, 2.3]}>
        <cylinderGeometry args={[0.2, 0.25, 0.4, 6]} />
        <meshStandardMaterial color="#7a4a2a" roughness={0.9} />
      </mesh>
      {/* Campfire */}
      <mesh position={[0, 0.15, 0.5]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 6]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 0.5]}>
        <coneGeometry args={[0.2, 0.4, 5]} />
        <meshStandardMaterial
          color="#ff6622"
          emissive="#ff4400"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0, 1, 0.5]} intensity={0.5} color="#ff8844" distance={8} />
    </group>
  );
}

// ─── British Pub zone ───────────────────────────────────────────
function BritishPub() {
  const pos = CITY_POSITIONS["british-pub"]!;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#b8a888" roughness={0.9} />
      </mesh>
      {/* Red brick pub building */}
      <mesh position={[-1, 1.2, -1.5]}>
        <boxGeometry args={[3, 2.4, 2]} />
        <meshStandardMaterial color="#8b3322" roughness={0.85} />
      </mesh>
      {/* Roof */}
      <mesh position={[-1, 2.6, -1.5]}>
        <boxGeometry args={[3.3, 0.3, 2.3]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>
      {/* Pub sign (hanging from bracket) */}
      <mesh position={[0.8, 2, -0.4]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
      <mesh position={[1.1, 1.7, -0.4]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial color="#2a5a2a" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      {/* Phone booth */}
      <mesh position={[3, 0.7, 0]}>
        <boxGeometry args={[0.6, 1.4, 0.6]} />
        <meshStandardMaterial color="#cc2222" roughness={0.7} />
      </mesh>
      {/* Window on phone booth */}
      <mesh position={[3, 0.9, 0.31]}>
        <planeGeometry args={[0.35, 0.8]} />
        <meshStandardMaterial color="#aaccdd" roughness={0.3} transparent opacity={0.6} />
      </mesh>
      {/* Big Ben hint — tall clock tower */}
      <mesh position={[-3.5, 2, 1]}>
        <cylinderGeometry args={[0.4, 0.5, 4, IS_MOBILE ? 6 : 8]} />
        <meshStandardMaterial color="#b8a070" roughness={0.8} />
      </mesh>
      <mesh position={[-3.5, 4.2, 1]}>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color="#b8a070" roughness={0.8} />
      </mesh>
      {/* Clock face */}
      <mesh position={[-3.5, 4.2, 1.51]}>
        <circleGeometry args={[0.3, 12]} />
        <meshStandardMaterial color="#f0e8d0" roughness={0.5} />
      </mesh>
      {/* Clock hands */}
      <mesh position={[-3.5, 4.35, 1.52]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.03, 0.25, 0.02]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[-3.5, 4.28, 1.52]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.02, 0.18, 0.02]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Tower spire */}
      <mesh position={[-3.5, 4.9, 1]}>
        <coneGeometry args={[0.35, 0.8, IS_MOBILE ? 4 : 6]} />
        <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.6} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#ffeedd" distance={10} />
    </group>
  );
}

// ─── Brazilian Beach zone ───────────────────────────────────────
function BrazilianBeach() {
  const pos = CITY_POSITIONS["brazilian-beach"]!;
  return (
    <group position={pos}>
      {/* Sand patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[6, IS_MOBILE ? 16 : 24]} />
        <meshStandardMaterial color="#e8d4a0" roughness={0.95} />
      </mesh>
      {/* Palm trees */}
      {[
        [-3, 0, -1.5] as [number, number, number],
        [3.5, 0, -2] as [number, number, number],
        [-1.5, 0, 2.5] as [number, number, number],
      ].map((p, i) => (
        <group key={`palm-${i}`} position={p}>
          <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0.05 * (i - 1)]}>
            <cylinderGeometry args={[0.1, 0.16, 1.6, 5]} />
            <meshStandardMaterial color="#7a5a2a" roughness={0.9} />
          </mesh>
          <mesh position={[0.03, 1.8, 0]} rotation={[0, 0, -0.05 * (i - 1)]}>
            <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
            <meshStandardMaterial color="#8B6914" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <sphereGeometry args={[0.6, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.8} />
          </mesh>
          {/* Fronds */}
          <mesh position={[0.4, 2.3, 0.2]} rotation={[0.4, 0, 0.6]}>
            <coneGeometry args={[0.18, 0.8, 4]} />
            <meshStandardMaterial color="#2d9e2d" roughness={0.8} />
          </mesh>
          <mesh position={[-0.35, 2.25, -0.2]} rotation={[-0.3, 0, -0.5]}>
            <coneGeometry args={[0.16, 0.7, 4]} />
            <meshStandardMaterial color="#1e8c1e" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Beach umbrella */}
      <mesh position={[1.5, 0.8, 1]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 4]} />
        <meshStandardMaterial color="#f0e8d0" roughness={0.8} />
      </mesh>
      <mesh position={[1.5, 1.7, 1]} rotation={[0.1, 0, 0]}>
        <coneGeometry args={[1, 0.4, 8]} />
        <meshStandardMaterial color="#ff6644" roughness={0.6} />
      </mesh>
      {/* Surfboard */}
      <mesh position={[3, 0.5, 1.5]} rotation={[0, 0.3, 0.8]}>
        <boxGeometry args={[0.3, 1.6, 0.06]} />
        <meshStandardMaterial color="#22ccdd" roughness={0.6} />
      </mesh>
      {/* Waves hint (blue wavy at edge) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 5]}>
        <planeGeometry args={[12, 1.5]} />
        <meshStandardMaterial color="#4499cc" transparent opacity={0.4} roughness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.43, 5.5]}>
        <planeGeometry args={[12, 0.8]} />
        <meshStandardMaterial color="#55aadd" transparent opacity={0.3} roughness={0.3} />
      </mesh>
      {/* Carnival mask on pole */}
      <mesh position={[-3.5, 0.8, 1]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 3]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-3.5, 1.7, 1]}>
        <sphereGeometry args={[0.3, 6, 5]} />
        <meshStandardMaterial color="#ff44aa" roughness={0.5} />
      </mesh>
      <mesh position={[-3.3, 1.8, 1.1]}>
        <sphereGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#ffcc22" roughness={0.5} />
      </mesh>
      <mesh position={[-3.7, 1.8, 1.1]}>
        <sphereGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#44ddff" roughness={0.5} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#fff8dd" distance={10} />
    </group>
  );
}

// ─── Flying birds ───────────────────────────────────────────────
function FlyingBirds() {
  const ref = useRef<THREE.Group>(null);
  const birds = useMemo(
    () =>
      Array.from({ length: IS_MOBILE ? 3 : 5 }, (_, i) => ({
        radius: 15 + i * 8,
        height: 10 + i * 2 + Math.random() * 3,
        speed: 0.15 + Math.random() * 0.1,
        phase: (i * Math.PI * 2) / 5,
      })),
    []
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((group, i) => {
      const b = birds[i];
      const g = group as THREE.Group;
      g.position.x = Math.cos(t * b.speed + b.phase) * b.radius;
      g.position.z = Math.sin(t * b.speed + b.phase) * b.radius;
      g.position.y = b.height + Math.sin(t * 2 + b.phase) * 0.5;
      g.rotation.y = -(t * b.speed + b.phase) + Math.PI / 2;
    });
  });

  return (
    <group ref={ref}>
      {birds.map((_, i) => (
        <group key={i}>
          {/* Bird body */}
          <mesh>
            <sphereGeometry args={[0.15, 4, 3]} />
            <meshStandardMaterial color="#333333" roughness={0.8} />
          </mesh>
          {/* Wings */}
          <mesh position={[0.3, 0.05, 0]} rotation={[0, 0, 0.4]}>
            <planeGeometry args={[0.5, 0.15]} />
            <meshStandardMaterial color="#222222" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-0.3, 0.05, 0]} rotation={[0, 0, -0.4]}>
            <planeGeometry args={[0.5, 0.15]} />
            <meshStandardMaterial color="#222222" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Distant mountain silhouettes ───────────────────────────────
function Mountains() {
  return (
    <group>
      <mesh position={[-50, 3, -50]}>
        <coneGeometry args={[12, 10, 4]} />
        <meshStandardMaterial color="#8a7a6a" roughness={1} />
      </mesh>
      <mesh position={[-35, 2.5, -55]}>
        <coneGeometry args={[10, 8, 4]} />
        <meshStandardMaterial color="#7a6a5a" roughness={1} />
      </mesh>
      <mesh position={[45, 3.5, -52]}>
        <coneGeometry args={[14, 11, 4]} />
        <meshStandardMaterial color="#8a7a6a" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── Zone flags (near each zone) ────────────────────────────────
function ZoneFlags() {
  const flags: { position: [number, number, number]; colors: [string, string, string] }[] = [
    { position: [-20, 0, -16], colors: ["#009246", "#ffffff", "#ce2b37"] }, // Italy
    { position: [20, 0, -16], colors: ["#ffffff", "#cc2222", "#ffffff"] }, // Japan-ish
    { position: [-12, 0, -4], colors: ["#002395", "#ffffff", "#ed2939"] }, // France
    { position: [12, 0, -4], colors: ["#006341", "#ffffff", "#ce1126"] }, // Mexico
    { position: [4, 2, -20], colors: ["#ff9933", "#ffffff", "#138808"] }, // India
    { position: [-16, 0, 14], colors: ["#009639", "#fcdd09", "#ce1126"] }, // Pan-African
    { position: [16, 0, 14], colors: ["#012169", "#ffffff", "#c8102e"] }, // UK
    { position: [4, 0, 24], colors: ["#009c3b", "#ffdf00", "#002776"] }, // Brazil
  ];
  return (
    <group>
      {flags.map((f, i) => (
        <FlagPole key={i} position={f.position} colors={f.colors} />
      ))}
    </group>
  );
}

// ─── City marker (label + emoji) ────────────────────────────────
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
  const [x, y, z] = cityTo3D(city);
  const size = isNext ? 120 : unlocked ? 104 : 80;

  return (
    <group position={[x, y + 4, z]}>
      {/* Glow ring for unlocked cities */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
          <ringGeometry args={[4, 5.5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#ffaa00" : "#e8a840"}
            transparent
            opacity={isNext ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {isNext && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.52, 0]}>
          <ringGeometry args={[5.5, 6.5, 32]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.12} />
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
                ? "radial-gradient(circle at 35% 35%, #fff5e0, #e8c878)"
                : "radial-gradient(circle at 35% 35%, #5a5040, #3a3028)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#e8a840" : "#5a4a30"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.5), 0 0 ${isNext ? 24 : 10}px #e8a840${isNext ? "90" : "40"}`
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
              background: unlocked
                ? "linear-gradient(135deg, rgba(180,120,40,0.9), rgba(140,90,20,0.95))"
                : "rgba(40,30,20,0.7)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <p className="text-white text-[13px] font-bold whitespace-nowrap tracking-wide">
              {city.building[lang] ?? city.building.en}
            </p>
          </div>

          {/* Progress dots */}
          {unlocked && (
            <div className="flex gap-1.5 mt-1.5">
              {[1, 2, 3].map((lvl) => (
                <div
                  key={lvl}
                  className="rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    background:
                      completedLevels >= lvl
                        ? "#ffcc00"
                        : "rgba(255,255,255,0.2)",
                    border: `1.5px solid ${completedLevels >= lvl ? "#e8a840" : "rgba(255,255,255,0.3)"}`,
                    boxShadow:
                      completedLevels >= lvl
                        ? "0 0 6px rgba(255,200,0,0.5)"
                        : "none",
                  }}
                />
              ))}
            </div>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Scene ready callback ───────────────────────────────────────
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

// ─── Camera controls ────────────────────────────────────────────
function CultureCameraControls() {
  return (
    <OrbitControls
      enablePan
      enableZoom
      minDistance={20}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.3}
      minPolarAngle={0.3}
      enableDamping
      dampingFactor={0.08}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

// ─── Main export ────────────────────────────────────────────────
export function CultureMap({
  onSelectCity,
}: {
  onSelectCity: (city: City) => void;
}) {
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
      .find(
        (c) =>
          unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3
      );
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
        <color attach="background" args={["#87CEEB"]} />
        <fog attach="fog" args={["#c8d8e8", 80, 200]} />

        {/* Lighting — warm travel-day sun */}
        <hemisphereLight intensity={0.9} color="#87CEEB" groundColor="#c4a882" />
        <directionalLight position={[20, 30, 10]} intensity={1.2} color="#fff5dd" />
        <ambientLight intensity={0.35} />

        <Suspense fallback={null}>
          <Ground />
          <BrickRoads />
          <CompassRose />
          <RotatingGlobe />

          {/* Zone landmarks */}
          <ItalianPlaza />
          <JapaneseStreet />
          <FrenchCafe />
          <MexicanMarket />
          <IndianTemple />
          <AfricanVillage />
          <BritishPub />
          <BrazilianBeach />

          {/* Ambient decorations */}
          <ZoneFlags />
          <FlyingBirds />
          {!IS_MOBILE && <CherryBlossomPetals />}
          <Mountains />

          {/* City markers */}
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

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] via-[#c4a882] to-[#d4c4a4] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌍
              </div>
            </div>
            <p className="text-amber-900/70 text-sm font-medium tracking-wider">
              Exploring the world...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div
                className="w-2 h-2 rounded-full bg-amber-600/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-amber-600/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-amber-600/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
