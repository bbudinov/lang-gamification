"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
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

// ─── Lat/Lng to 3D position on sphere ──────────────────────────
function latLngToPos(lat: number, lng: number, radius: number = 14): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// Game-friendly coordinates — spread wider than real geography for readability
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Europe — spread across wider lng range
  "british-pub":        { lat: 55, lng: -15 },
  "french-cafe":        { lat: 42, lng: -5 },
  "spanish-plaza":      { lat: 30, lng: -18 },
  "italian-plaza":      { lat: 35, lng: 8 },
  "german-castle":      { lat: 52, lng: 15 },
  "bulgarian-village":  { lat: 38, lng: 30 },
  // Nordics — spread north
  "fjord-village":      { lat: 68, lng: -8 },
  "nordic-town":        { lat: 65, lng: 20 },
  "lakeside-cabin":     { lat: 70, lng: 35 },
  "volcano-valley":     { lat: 72, lng: -30 },
  "ice-settlement":     { lat: 78, lng: -50 },
  // Africa — spread south
  "moroccan-market":    { lat: 25, lng: -10 },
  "egyptian-pyramid":   { lat: 22, lng: 35 },
  "african-village":    { lat: 2, lng: 42 },
  "kenyan-safari":      { lat: -8, lng: 45 },
  "south-african-coast":{ lat: -38, lng: 25 },
  "baobab-grove":       { lat: -22, lng: 55 },
  // Asia — spread east
  "indian-temple":      { lat: 15, lng: 78 },
  "thai-temple":        { lat: 8, lng: 100 },
  "chinese-temple":     { lat: 35, lng: 110 },
  "korean-street":      { lat: 42, lng: 135 },
  "japanese-street":    { lat: 38, lng: 155 },
  "island-market":      { lat: -10, lng: 120 },
  // Americas — spread west
  "canadian-lodge":     { lat: 58, lng: -110 },
  "american-city":      { lat: 40, lng: -80 },
  "mexican-market":     { lat: 18, lng: -105 },
  "brazilian-beach":    { lat: -25, lng: -50 },
  "argentinian-ranch":  { lat: -40, lng: -65 },
  // Oceania
  "australian-coast":   { lat: -35, lng: 150 },
  "green-hills":        { lat: -45, lng: 175 },
};

// ─── Get position for a city ────────────────────────────────────
function cityGlobePos(cityId: string, radius: number = 14): [number, number, number] {
  const coords = COUNTRY_COORDS[cityId];
  if (!coords) return [0, 0, 0];
  return latLngToPos(coords.lat, coords.lng, radius);
}

// ─── Segments based on device ───────────────────────────────────
const SPHERE_SEGS = IS_MOBILE ? 32 : 64;

// ═════════════════════════════════════════════════════════════════
//  STARFIELD (desktop only)
// ═════════════════════════════════════════════════════════════════
function Starfield() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      const r = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.3} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

// ═════════════════════════════════════════════════════════════════
//  GLOBE SPHERE — ocean + continents
// ═════════════════════════════════════════════════════════════════
function GlobeSphere() {
  return (
    <group>
      {/* Main ocean sphere */}
      <mesh>
        <sphereGeometry args={[14, SPHERE_SEGS, SPHERE_SEGS]} />
        <meshStandardMaterial color="#3a8a6a" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Continent patches — slightly elevated green/brown areas */}
      <ContinentPatch lat={48} lng={10} scale={3.5} color="#5a9a50" /> {/* Europe */}
      <ContinentPatch lat={35} lng={100} scale={4} color="#6a9a45" /> {/* Asia */}
      <ContinentPatch lat={5} lng={25} scale={3.5} color="#7a8a40" /> {/* Africa */}
      <ContinentPatch lat={20} lng={-80} scale={4} color="#5a9050" /> {/* Americas */}
      <ContinentPatch lat={-25} lng={135} scale={2.5} color="#9a8a50" /> {/* Australia */}
    </group>
  );
}

function ContinentPatch({ lat, lng, scale, color }: { lat: number; lng: number; scale: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = latLngToPos(lat, lng, 14.05);

  useEffect(() => {
    if (ref.current) {
      ref.current.lookAt(0, 0, 0);
    }
  }, []);

  return (
    <mesh ref={ref} position={pos}>
      <circleGeometry args={[scale, IS_MOBILE ? 12 : 20]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  CLOUD LAYER
// ═════════════════════════════════════════════════════════════════
function CloudLayer() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[14.8, SPHERE_SEGS, SPHERE_SEGS]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  ATMOSPHERE GLOW
// ═════════════════════════════════════════════════════════════════
function AtmosphereGlow() {
  return (
    <mesh>
      <sphereGeometry args={[15.5, SPHERE_SEGS, SPHERE_SEGS]} />
      <meshBasicMaterial color="#4ac8e8" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  LANDMARK GROUP WRAPPER — orients children outward on globe
// ═════════════════════════════════════════════════════════════════
function LandmarkGroup({ lat, lng, scale, children }: { lat: number; lng: number; scale?: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const surfacePos = latLngToPos(lat, lng, 14.3);

  useEffect(() => {
    if (ref.current) {
      ref.current.lookAt(0, 0, 0);
      ref.current.rotateX(Math.PI);
    }
  }, []);

  return (
    <group ref={ref} position={surfacePos} scale={scale}>
      {children}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  LANDMARKS — small 3D objects on globe surface
// ═════════════════════════════════════════════════════════════════

// UK — tiny Big Ben tower
function UKLandmark() {
  const c = COUNTRY_COORDS["british-pub"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#8a8a80" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.18]} />
        <meshStandardMaterial color="#b0b0a0" />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0, 0.95, 0]}>
          <coneGeometry args={[0.07, 0.15, 4]} />
          <meshStandardMaterial color="#6a6a60" />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// France — mini Eiffel Tower (converging cylinders)
function FranceLandmark() {
  const c = COUNTRY_COORDS["french-cafe"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* 4 legs converging */}
      <mesh position={[-0.12, 0.3, -0.12]} rotation={[0.15, 0, 0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.6, 4]} />
        <meshStandardMaterial color="#7a7a70" />
      </mesh>
      <mesh position={[0.12, 0.3, -0.12]} rotation={[0.15, 0, -0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.6, 4]} />
        <meshStandardMaterial color="#7a7a70" />
      </mesh>
      <mesh position={[-0.12, 0.3, 0.12]} rotation={[-0.15, 0, 0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.6, 4]} />
        <meshStandardMaterial color="#7a7a70" />
      </mesh>
      <mesh position={[0.12, 0.3, 0.12]} rotation={[-0.15, 0, -0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.6, 4]} />
        <meshStandardMaterial color="#7a7a70" />
      </mesh>
      {/* Top spire */}
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.03, 0.3, 4]} />
        <meshStandardMaterial color="#8a8a80" />
      </mesh>
    </LandmarkGroup>
  );
}

// Italy — tiny fountain
function ItalyLandmark() {
  const c = COUNTRY_COORDS["italian-plaza"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.15, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#c0b8a0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#90c8e8" emissive="#90c8e8" emissiveIntensity={0.2} />
      </mesh>
    </LandmarkGroup>
  );
}

// Spain — cathedral spires
function SpainLandmark() {
  const c = COUNTRY_COORDS["spanish-plaza"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[-0.1, 0.3, 0]}>
        <coneGeometry args={[0.06, 0.6, 6]} />
        <meshStandardMaterial color="#c8a050" roughness={0.5} />
      </mesh>
      <mesh position={[0.1, 0.35, 0]}>
        <coneGeometry args={[0.05, 0.7, 6]} />
        <meshStandardMaterial color="#c8a050" roughness={0.5} />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.05, 0.5, 6]} />
          <meshStandardMaterial color="#d0b060" roughness={0.5} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Germany — mini castle
function GermanyLandmark() {
  const c = COUNTRY_COORDS["german-castle"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.7} />
      </mesh>
      <mesh position={[-0.12, 0.4, 0]}>
        <coneGeometry args={[0.05, 0.2, 6]} />
        <meshStandardMaterial color="#8a3030" />
      </mesh>
      <mesh position={[0.12, 0.4, 0]}>
        <coneGeometry args={[0.05, 0.2, 6]} />
        <meshStandardMaterial color="#8a3030" />
      </mesh>
    </LandmarkGroup>
  );
}

// Bulgaria — small church dome
function BulgariaLandmark() {
  const c = COUNTRY_COORDS["bulgarian-village"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.15]} />
        <meshStandardMaterial color="#e0d8c0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a8a3a" />
      </mesh>
      {/* Cross */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.1, 4]} />
        <meshStandardMaterial color="#c8a030" />
      </mesh>
    </LandmarkGroup>
  );
}

// Japan — torii gate
function JapanLandmark() {
  const c = COUNTRY_COORDS["japanese-street"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Two posts */}
      <mesh position={[-0.12, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
      <mesh position={[0.12, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
      {/* Top beam */}
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.32, 6]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
    </LandmarkGroup>
  );
}

// China — pagoda (stacked boxes)
function ChinaLandmark() {
  const c = COUNTRY_COORDS["chinese-temple"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.25]} />
        <meshStandardMaterial color="#c83020" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color="#c83020" />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0, 0.33, 0]}>
          <boxGeometry args={[0.15, 0.1, 0.15]} />
          <meshStandardMaterial color="#c83020" />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// India — temple dome
function IndiaLandmark() {
  const c = COUNTRY_COORDS["indian-temple"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.22, 0.2, 0.22]} />
        <meshStandardMaterial color="#e0d0a0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e0c060" />
      </mesh>
    </LandmarkGroup>
  );
}

// Egypt — pyramid
function EgyptLandmark() {
  const c = COUNTRY_COORDS["egyptian-pyramid"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.25, 0.4, 4]} />
        <meshStandardMaterial color="#d4b060" roughness={0.6} />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0.25, 0.12, 0.1]}>
          <coneGeometry args={[0.15, 0.25, 4]} />
          <meshStandardMaterial color="#c8a850" roughness={0.6} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Africa — round hut
function AfricaLandmark() {
  const c = COUNTRY_COORDS["african-village"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 8]} />
        <meshStandardMaterial color="#c0a060" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.15, 0.15, 8]} />
        <meshStandardMaterial color="#8a6a30" roughness={0.7} />
      </mesh>
    </LandmarkGroup>
  );
}

// Mexico — cactus + stall
function MexicoLandmark() {
  const c = COUNTRY_COORDS["mexican-market"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Cactus */}
      <mesh position={[-0.08, 0.18, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.35, 6]} />
        <meshStandardMaterial color="#3a8a30" />
      </mesh>
      {!IS_MOBILE && (
        <>
          <mesh position={[-0.15, 0.2, 0]} rotation={[0, 0, Math.PI / 3]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 4]} />
            <meshStandardMaterial color="#3a8a30" />
          </mesh>
          {/* Small stall */}
          <mesh position={[0.1, 0.06, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.1]} />
            <meshStandardMaterial color="#c08040" />
          </mesh>
        </>
      )}
    </LandmarkGroup>
  );
}

// USA — skyline (tall thin boxes)
function USALandmark() {
  const c = COUNTRY_COORDS["american-city"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[-0.08, 0.25, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#8090a0" />
      </mesh>
      <mesh position={[0.05, 0.2, 0.04]}>
        <boxGeometry args={[0.07, 0.4, 0.07]} />
        <meshStandardMaterial color="#90a0b0" />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0.15, 0.15, -0.03]}>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial color="#7a8a9a" />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Brazil — Christ statue (T-shape on cone hill)
function BrazilLandmark() {
  const c = COUNTRY_COORDS["brazilian-beach"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Hill */}
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.2, 0.2, 8]} />
        <meshStandardMaterial color="#4a8a40" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.2, 4]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Arms */}
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 4]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
    </LandmarkGroup>
  );
}

// Australia — Opera House (tilted half-spheres)
function AustraliaLandmark() {
  const c = COUNTRY_COORDS["australian-coast"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[-0.08, 0.08, 0]} rotation={[0, 0, 0.3]}>
        <sphereGeometry args={[0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0.15]}>
        <sphereGeometry args={[0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      <mesh position={[0.1, 0.08, 0]} rotation={[0, 0, -0.2]}>
        <sphereGeometry args={[0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
    </LandmarkGroup>
  );
}

// Canada — small log cabin
function CanadaLandmark() {
  const c = COUNTRY_COORDS["canadian-lodge"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Cabin body */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.22, 0.18, 0.16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.18, 0.15, 4]} />
        <meshStandardMaterial color="#654321" roughness={0.7} />
      </mesh>
    </LandmarkGroup>
  );
}

// Argentina — small ranch
function ArgentinaLandmark() {
  const c = COUNTRY_COORDS["argentinian-ranch"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Ranch body */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.18]} />
        <meshStandardMaterial color="#c08040" roughness={0.7} />
      </mesh>
      {/* Fence posts */}
      <mesh position={[-0.18, 0.06, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 4]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
      <mesh position={[0.18, 0.06, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 4]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
    </LandmarkGroup>
  );
}

// Morocco — small archway
function MoroccoLandmark() {
  const c = COUNTRY_COORDS["moroccan-market"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Two pillars */}
      <mesh position={[-0.1, 0.18, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 6]} />
        <meshStandardMaterial color="#d4a050" roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.18, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 6]} />
        <meshStandardMaterial color="#d4a050" roughness={0.6} />
      </mesh>
      {/* Top arch */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.26, 0.06, 0.08]} />
        <meshStandardMaterial color="#e0a040" roughness={0.5} />
      </mesh>
    </LandmarkGroup>
  );
}

// Kenya — acacia tree
function KenyaLandmark() {
  const c = COUNTRY_COORDS["kenyan-safari"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Thin trunk */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.4, 6]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
      {/* Flat wide canopy */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.04, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#3a8a30" roughness={0.7} />
      </mesh>
    </LandmarkGroup>
  );
}

// South Africa — Table Mountain (flat-top)
function SouthAfricaLandmark() {
  const c = COUNTRY_COORDS["south-african-coast"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.35, 0.24, 0.2]} />
        <meshStandardMaterial color="#808080" roughness={0.8} />
      </mesh>
    </LandmarkGroup>
  );
}

// Korea — small palace gate
function KoreaLandmark() {
  const c = COUNTRY_COORDS["korean-street"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Two posts */}
      <mesh position={[-0.1, 0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
      <mesh position={[0.1, 0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
      {/* Decorative roof */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.12]} />
        <meshStandardMaterial color="#c8a030" />
      </mesh>
    </LandmarkGroup>
  );
}

// Thailand — small golden temple
function ThailandLandmark() {
  const c = COUNTRY_COORDS["thai-temple"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Base */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.2]} />
        <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Pointed cone top */}
      <mesh position={[0, 0.28, 0]}>
        <coneGeometry args={[0.08, 0.3, 6]} />
        <meshStandardMaterial color="#e0b030" roughness={0.3} metalness={0.4} />
      </mesh>
    </LandmarkGroup>
  );
}

// Norway — small cliff + wooden house
function NorwayLandmark() {
  const c = COUNTRY_COORDS["fjord-village"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Cliff */}
      <mesh position={[-0.1, 0.25, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.08]} />
        <meshStandardMaterial color="#808080" roughness={0.8} />
      </mesh>
      {/* Wooden house */}
      <mesh position={[0.1, 0.1, 0]}>
        <boxGeometry args={[0.15, 0.18, 0.12]} />
        <meshStandardMaterial color="#8B6914" roughness={0.7} />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0.1, 0.24, 0]}>
          <coneGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="#654321" roughness={0.7} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Sweden — colorful yellow house + small tree
function SwedenLandmark() {
  const c = COUNTRY_COORDS["nordic-town"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Yellow house */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.2, 0.14]} />
        <meshStandardMaterial color="#facc15" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.12, 0.12, 4]} />
        <meshStandardMaterial color="#c83030" roughness={0.6} />
      </mesh>
      {/* Small tree */}
      {!IS_MOBILE && (
        <>
          <mesh position={[0.18, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 4]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          <mesh position={[0.18, 0.26, 0]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshStandardMaterial color="#3a8a30" />
          </mesh>
        </>
      )}
    </LandmarkGroup>
  );
}

// Greenland — igloo + ice block
function GreenlandLandmark() {
  const c = COUNTRY_COORDS["ice-settlement"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Igloo (hemisphere) */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
      </mesh>
      {/* Ice block */}
      {!IS_MOBILE && (
        <mesh position={[0.22, 0.06, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.08]} />
          <meshStandardMaterial color="#c0e8f0" roughness={0.3} transparent opacity={0.8} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Iceland — small volcano cone with orange emissive tip
function IcelandLandmark() {
  const c = COUNTRY_COORDS["volcano-valley"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Volcano cone */}
      <mesh position={[0, 0.18, 0]}>
        <coneGeometry args={[0.2, 0.35, 8]} />
        <meshStandardMaterial color="#404040" roughness={0.8} />
      </mesh>
      {/* Glowing tip */}
      <mesh position={[0, 0.38, 0]}>
        <coneGeometry args={[0.06, 0.08, 6]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.6} />
      </mesh>
    </LandmarkGroup>
  );
}

// Madagascar — baobab tree (thick trunk + flat crown)
function MadagascarLandmark() {
  const c = COUNTRY_COORDS["baobab-grove"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Thick trunk */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
      {/* Flat crown */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, IS_MOBILE ? 8 : 12]} />
        <meshStandardMaterial color="#4a8a30" roughness={0.7} />
      </mesh>
    </LandmarkGroup>
  );
}

// Indonesia — beach stall + palm
function IndonesiaLandmark() {
  const c = COUNTRY_COORDS["island-market"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Stall base */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#c08040" roughness={0.7} />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.24, 0.03, 0.15]} />
        <meshStandardMaterial color="#e05050" roughness={0.5} />
      </mesh>
      {/* Palm */}
      {!IS_MOBILE && (
        <>
          <mesh position={[0.2, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.4, 6]} />
            <meshStandardMaterial color="#8B6914" />
          </mesh>
          <mesh position={[0.2, 0.42, 0]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#3a8a30" />
          </mesh>
        </>
      )}
    </LandmarkGroup>
  );
}

// New Zealand — rolling hills (2-3 green hemispheres)
function NewZealandLandmark() {
  const c = COUNTRY_COORDS["green-hills"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      <mesh position={[-0.12, 0.06, 0]}>
        <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a9a40" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.06, 0.05]}>
        <sphereGeometry args={[0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a8a30" roughness={0.7} />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[0, 0.06, -0.1]}>
          <sphereGeometry args={[0.14, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5aaa50" roughness={0.7} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// Finland — cabin + lake hint (blue circle)
function FinlandLandmark() {
  const c = COUNTRY_COORDS["lakeside-cabin"];
  return (
    <LandmarkGroup lat={c.lat} lng={c.lng} scale={[1.3, 1.3, 1.3]}>
      {/* Cabin body */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.14]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Triangle roof */}
      <mesh position={[0, 0.24, 0]}>
        <coneGeometry args={[0.14, 0.12, 4]} />
        <meshStandardMaterial color="#654321" roughness={0.7} />
      </mesh>
      {/* Lake circle */}
      {!IS_MOBILE && (
        <mesh position={[0.22, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 12]} />
          <meshStandardMaterial color="#4090c0" roughness={0.3} />
        </mesh>
      )}
    </LandmarkGroup>
  );
}

// ═════════════════════════════════════════════════════════════════
//  ALL LANDMARKS
// ═════════════════════════════════════════════════════════════════
function AllLandmarks() {
  return (
    <>
      <UKLandmark />
      <FranceLandmark />
      <ItalyLandmark />
      <SpainLandmark />
      <GermanyLandmark />
      <BulgariaLandmark />
      <JapanLandmark />
      <ChinaLandmark />
      <IndiaLandmark />
      <EgyptLandmark />
      <AfricaLandmark />
      <MexicoLandmark />
      <USALandmark />
      <BrazilLandmark />
      <AustraliaLandmark />
      <CanadaLandmark />
      <ArgentinaLandmark />
      <MoroccoLandmark />
      <KenyaLandmark />
      <SouthAfricaLandmark />
      <KoreaLandmark />
      <ThailandLandmark />
      <NorwayLandmark />
      <SwedenLandmark />
      <GreenlandLandmark />
      <IcelandLandmark />
      <MadagascarLandmark />
      <IndonesiaLandmark />
      <NewZealandLandmark />
      <FinlandLandmark />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
//  TRAVEL ARCS (desktop only)
// ═════════════════════════════════════════════════════════════════
const ARC_ROUTES: [string, string][] = [
  ["british-pub", "american-city"],
  ["french-cafe", "japanese-street"],
  ["brazilian-beach", "african-village"],
  ["australian-coast", "indian-temple"],
];

function TravelArc({ fromId, toId }: { fromId: string; toId: string }) {
  const fromCoords = COUNTRY_COORDS[fromId];
  const toCoords = COUNTRY_COORDS[toId];
  if (!fromCoords || !toCoords) return null;

  const from = new THREE.Vector3(...latLngToPos(fromCoords.lat, fromCoords.lng, 14.5));
  const to = new THREE.Vector3(...latLngToPos(toCoords.lat, toCoords.lng, 14.5));
  const mid = from.clone().add(to).multiplyScalar(0.5);
  // Pull midpoint outward from globe center for arc height
  const arcHeight = from.distanceTo(to) * 0.3 + 20;
  mid.normalize().multiplyScalar(arcHeight);

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);

  return (
    <mesh>
      <tubeGeometry args={[curve, 32, 0.04, 6, false]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
    </mesh>
  );
}

function TravelArcs() {
  return (
    <>
      {ARC_ROUTES.map(([f, t]) => (
        <TravelArc key={`${f}-${t}`} fromId={f} toId={t} />
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
//  AIRPLANE (desktop only) — flies along longest arc
// ═════════════════════════════════════════════════════════════════
function FlyingAirplane() {
  const ref = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const fromC = COUNTRY_COORDS["british-pub"];
    const toC = COUNTRY_COORDS["american-city"];
    const from = new THREE.Vector3(...latLngToPos(fromC.lat, fromC.lng, 14.5));
    const to = new THREE.Vector3(...latLngToPos(toC.lat, toC.lng, 14.5));
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(from.distanceTo(to) * 0.3 + 20);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.05) % 1;
    const pos = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    ref.current.position.copy(pos);
    ref.current.lookAt(pos.clone().add(tangent));
  });

  return (
    <group ref={ref} scale={0.3}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Wings */}
      <mesh>
        <boxGeometry args={[0.6, 0.02, 0.15]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  CITY MARKER — Html label on the globe surface
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
  const coords = COUNTRY_COORDS[city.id];
  if (!coords) return null;
  const pos = latLngToPos(coords.lat, coords.lng, 16);

  return (
    <group position={pos}>
      <Html center distanceFactor={15} zIndexRange={[100, 0]} style={{ pointerEvents: "auto" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (unlocked) onSelect(city);
          }}
          className="flex flex-col items-center cursor-pointer select-none"
          style={{ transform: "translateY(-10px)" }}
        >
          <div
            className="rounded-full flex items-center justify-center transition-all"
            style={{
              width: isNext ? 56 : 48,
              height: isNext ? 56 : 48,
              background: unlocked
                ? "radial-gradient(circle, rgba(50,20,40,0.95) 0%, rgba(30,10,25,0.98) 100%)"
                : "rgba(40,40,40,0.7)",
              border: unlocked
                ? `3px solid ${isNext ? "#ec4899" : "#a855f7"}`
                : "2px solid rgba(100,100,100,0.4)",
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
//  CAMERA CONTROLS — orbit around globe center
// ═════════════════════════════════════════════════════════════════
function GlobeCameraControls() {
  return (
    <OrbitControls
      enableRotate
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minDistance={25}
      maxDistance={50}
      autoRotate
      autoRotateSpeed={0.3}
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
      style={{ touchAction: "none", background: "#050510" }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 15, 35], fov: 45 }}
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

        <color attach="background" args={["#050510"]} />

        {/* Lighting — sun from upper-left, dim blue ambient, hemisphere */}
        <directionalLight position={[-20, 30, 15]} intensity={1.4} color="#fff5e0" />
        <ambientLight intensity={0.3} color="#1a2a4a" />
        <hemisphereLight intensity={0.5} color="#6090d0" groundColor="#0a0a20" />

        <Suspense fallback={null}>
          <GlobeSphere />
          <CloudLayer />
          <AtmosphereGlow />
          <AllLandmarks />

          {!IS_MOBILE && (
            <>
              <Starfield />
              <TravelArcs />
              <FlyingAirplane />
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

        <GlobeCameraControls />
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: overlayVisible ? 1 : 0,
            background: "#050510",
          }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌍
              </div>
            </div>
            <p className="text-blue-200/80 text-sm font-medium tracking-wider">
              Exploring the world...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
