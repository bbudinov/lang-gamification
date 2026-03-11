"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor, Sky } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, Vignette, TiltShift2 } from "@react-three/postprocessing";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── City grid layout ────────────────────────────────────────────
const WORLD_W = 180;
const WORLD_H = 140;

const CITY_POSITIONS: Record<string, [number, number]> = {
  greenville:  [-50, 36],
  farmstead:   [30, 26],
  colortown:   [-36, 4],
  numberville: [22, -4],
  homestead:   [-20, -18],
  seaside:     [42, -30],
  healthville: [-34, -38],
  stormridge:  [10, -50],
};

const FUTURE_LOCATIONS = [
  { id: "cinema", emoji: "🎬", label: "Cinema", pos: [-10, 26] as [number, number] },
  { id: "bakery", emoji: "🧁", label: "Bakery", pos: [50, 4] as [number, number] },
  { id: "restaurant", emoji: "🍽️", label: "Restaurant", pos: [8, 14] as [number, number] },
  { id: "library", emoji: "📚", label: "Library", pos: [-56, -10] as [number, number] },
  { id: "toystore", emoji: "🧸", label: "Toy Store", pos: [-28, 40] as [number, number] },
  { id: "trainstation", emoji: "🚂", label: "Train Station", pos: [56, -40] as [number, number] },
];

const ALL_NODE_POSITIONS: [number, number][] = [
  ...Object.values(CITY_POSITIONS),
  ...FUTURE_LOCATIONS.map((l) => l.pos),
];

function cityToWorld(city: City): [number, number, number] {
  const pos = CITY_POSITIONS[city.id];
  if (!pos) return [0, 0.01, 0];
  return [pos[0], 0.01, pos[1]];
}

// ─── Seeded RNG ──────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Street grid data ────────────────────────────────────────────
const MAIN_AVENUES = [
  { z: -36, x1: -75, x2: 75 },
  { z: 0, x1: -78, x2: 78 },
  { z: 36, x1: -72, x2: 72 },
];

const SECONDARY_STREETS_V = [
  { x: -54, z1: -52, z2: 48 },
  { x: -20, z1: -48, z2: 50 },
  { x: 10, z1: -54, z2: 46 },
  { x: 38, z1: -44, z2: 44 },
  { x: 60, z1: -42, z2: 38 },
];

const SECONDARY_STREETS_H = [
  { z: -18, x1: -60, x2: 55 },
  { z: 18, x1: -56, x2: 52 },
];

const DISTRICTS = [
  { x: -44, z: 36, w: 48, h: 28, tint: "#7a9a6e" },
  { x: -38, z: 0, w: 52, h: 32, tint: "#6f9a69" },
  { x: 14, z: -2, w: 44, h: 34, tint: "#8a9a82" },
  { x: 38, z: 24, w: 40, h: 28, tint: "#a08a63" },
  { x: -34, z: -38, w: 44, h: 24, tint: "#7a8878" },
  { x: 38, z: -32, w: 40, h: 24, tint: "#6a9090" },
  { x: 10, z: -50, w: 36, h: 20, tint: "#6a7a68" },
];

// ─── Ground ──────────────────────────────────────────────────────

function Ground() {
  return (
    <group>
      {/* Huge base so edges are never visible */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#b8aa8a" roughness={1} />
      </mesh>
      {/* City area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[WORLD_W, WORLD_H]} />
        <meshStandardMaterial color="#b8aa8a" roughness={1} />
      </mesh>
      {DISTRICTS.map((d, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[d.x, -0.06, d.z]}>
          <planeGeometry args={[d.w, d.h]} />
          <meshStandardMaterial color={d.tint} roughness={1} transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Streets ─────────────────────────────────────────────────────

function Streets() {
  const meshes = useMemo(() => {
    const result: THREE.Mesh[] = [];
    // Main avenues — dark asphalt with sidewalks and center line
    for (const ave of MAIN_AVENUES) {
      const len = ave.x2 - ave.x1;
      const cx = (ave.x1 + ave.x2) / 2;
      // Asphalt
      const geo = new THREE.PlaneGeometry(len, 5);
      const mat = new THREE.MeshStandardMaterial({ color: "#5a5a5a", roughness: 0.95 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, -0.04, ave.z);
      result.push(m);
      // Center dashed line (yellow)
      for (let x = ave.x1 + 2; x < ave.x2 - 2; x += 5) {
        const dGeo = new THREE.PlaneGeometry(2.5, 0.15);
        const dMat = new THREE.MeshStandardMaterial({ color: "#d4c040", roughness: 1 });
        const dm = new THREE.Mesh(dGeo, dMat);
        dm.rotation.x = -Math.PI / 2;
        dm.position.set(x, -0.035, ave.z);
        result.push(dm);
      }
      // Sidewalks
      for (const side of [-1, 1]) {
        const sGeo = new THREE.PlaneGeometry(len, 1.2);
        const sMat = new THREE.MeshStandardMaterial({ color: "#c0b898", roughness: 1 });
        const sm = new THREE.Mesh(sGeo, sMat);
        sm.rotation.x = -Math.PI / 2;
        sm.position.set(cx, -0.035, ave.z + side * 3.3);
        result.push(sm);
      }
    }
    // Secondary vertical streets — lighter grey
    for (const st of SECONDARY_STREETS_V) {
      const len = st.z2 - st.z1;
      const cz = (st.z1 + st.z2) / 2;
      const geo = new THREE.PlaneGeometry(3.5, len);
      const mat = new THREE.MeshStandardMaterial({ color: "#6a6a6a", roughness: 0.95 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(st.x, -0.04, cz);
      result.push(m);
      // Center dashed line (white)
      for (let z = st.z1 + 2; z < st.z2 - 2; z += 5) {
        const dGeo = new THREE.PlaneGeometry(0.12, 2.5);
        const dMat = new THREE.MeshStandardMaterial({ color: "#e0e0e0", roughness: 1 });
        const dm = new THREE.Mesh(dGeo, dMat);
        dm.rotation.x = -Math.PI / 2;
        dm.position.set(st.x, -0.035, z);
        result.push(dm);
      }
    }
    // Secondary horizontal streets
    for (const st of SECONDARY_STREETS_H) {
      const len = st.x2 - st.x1;
      const cx = (st.x1 + st.x2) / 2;
      const geo = new THREE.PlaneGeometry(len, 3.5);
      const mat = new THREE.MeshStandardMaterial({ color: "#6a6a6a", roughness: 0.95 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, -0.04, st.z);
      result.push(m);
      for (let x = st.x1 + 2; x < st.x2 - 2; x += 5) {
        const dGeo = new THREE.PlaneGeometry(2.5, 0.12);
        const dMat = new THREE.MeshStandardMaterial({ color: "#e0e0e0", roughness: 1 });
        const dm = new THREE.Mesh(dGeo, dMat);
        dm.rotation.x = -Math.PI / 2;
        dm.position.set(x, -0.035, st.z);
        result.push(dm);
      }
    }
    return result;
  }, []);
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>;
}

// ─── Connection roads between cities ─────────────────────────────

function CityRoads({ unlockedIds }: { unlockedIds: Set<string> }) {
  const roads = useMemo(() => {
    const result: THREE.Mesh[] = [];
    for (const city of CITIES) {
      for (const targetId of city.connectsTo) {
        const target = CITIES.find((c) => c.id === targetId);
        if (!target) continue;
        const unlocked = unlockedIds.has(city.id) && unlockedIds.has(target.id);
        const [x1, , z1] = cityToWorld(city);
        const [x2, , z2] = cityToWorld(target);
        const mx = (x1 + x2) / 2 + (z2 - z1) * 0.05;
        const mz = (z1 + z2) / 2 - (x2 - x1) * 0.05;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(x1, 0.02, z1),
          new THREE.Vector3(mx, 0.02, mz),
          new THREE.Vector3(x2, 0.02, z2)
        );
        const geo = new THREE.TubeGeometry(curve, 20, unlocked ? 0.6 : 0.35, 6, false);
        const mat = new THREE.MeshStandardMaterial({
          color: unlocked ? "#d4b87a" : "#7a7a6a",
          transparent: true,
          opacity: unlocked ? 0.8 : 0.3,
          roughness: 1,
        });
        result.push(new THREE.Mesh(geo, mat));
      }
    }
    return result;
  }, [unlockedIds]);
  return <group>{roads.map((m, i) => <primitive key={`cr${i}`} object={m} />)}</group>;
}

// ─── Procedural city blocks — varied building types ──────────────

type BuildingData = {
  x: number; z: number; w: number; h: number; d: number;
  wallColor: string; roofColor: string; accentColor: string;
  type: "house" | "apartment" | "office" | "tower";
  rot: number;
};

function CityBlocks() {
  const blocks = useMemo(() => {
    const rng = seededRng(42);
    const buildings: BuildingData[] = [];

    // Civic/center = taller, residential = shorter, market = mixed
    const blockAreas = [
      // Residential west — mostly houses + some apartments
      { x1: -70, x2: -54, z1: -16, z2: -2, density: 0.7, zone: "res" as const },
      { x1: -54, x2: -20, z1: -16, z2: -2, density: 0.6, zone: "res" as const },
      { x1: -54, x2: -20, z1: 2, z2: 16, density: 0.6, zone: "res" as const },
      // School quarter — houses
      { x1: -70, x2: -54, z1: 20, z2: 34, density: 0.5, zone: "res" as const },
      { x1: -54, x2: -20, z1: 20, z2: 34, density: 0.5, zone: "res" as const },
      // Civic center — offices + towers
      { x1: -18, x2: 10, z1: -16, z2: -2, density: 0.55, zone: "civic" as const },
      { x1: 10, x2: 36, z1: -16, z2: -2, density: 0.5, zone: "civic" as const },
      { x1: -18, x2: 10, z1: 2, z2: 16, density: 0.5, zone: "civic" as const },
      { x1: 10, x2: 36, z1: 2, z2: 16, density: 0.5, zone: "civic" as const },
      // Market east — mixed
      { x1: 40, x2: 58, z1: 2, z2: 16, density: 0.5, zone: "market" as const },
      { x1: 40, x2: 58, z1: 18, z2: 34, density: 0.6, zone: "market" as const },
      // Hospital area — offices
      { x1: -54, x2: -20, z1: -50, z2: -38, density: 0.4, zone: "civic" as const },
      // Zoo area
      { x1: 22, x2: 50, z1: -44, z2: -38, density: 0.3, zone: "res" as const },
      // Weather station
      { x1: -8, x2: 24, z1: -54, z2: -44, density: 0.25, zone: "civic" as const },
      // South
      { x1: -68, x2: -20, z1: 38, z2: 48, density: 0.35, zone: "res" as const },
      { x1: -18, x2: 36, z1: 38, z2: 48, density: 0.3, zone: "market" as const },
    ];

    const WALL_PALETTES = {
      res: ["#e8dcc8", "#d8c8a8", "#c8b898", "#e0d0b0", "#d0c4a0"],
      civic: ["#d0d4d8", "#c0c4cc", "#b8bcc8", "#d8dce0", "#c8d0d8"],
      market: ["#e0c8a0", "#d0b888", "#c8a878", "#dcc498", "#d4bc90"],
    };
    const ROOF_PALETTES = {
      res: ["#a05530", "#906838", "#8a6a40", "#b06030", "#985028"],
      civic: ["#505860", "#404850", "#586068", "#485058", "#606870"],
      market: ["#a05530", "#985028", "#906838", "#b06838", "#8a5830"],
    };
    const ACCENT_COLORS = ["#4080c0", "#c04040", "#40a060", "#c0a040", "#a040a0", "#40a0a0", "#e07030"];

    for (const block of blockAreas) {
      const bw = block.x2 - block.x1;
      const bh = block.z2 - block.z1;
      const count = Math.floor((bw * bh * block.density) / 40);
      const walls = WALL_PALETTES[block.zone];
      const roofs = ROOF_PALETTES[block.zone];

      for (let i = 0; i < count; i++) {
        const bx = block.x1 + 2 + rng() * (bw - 4);
        const bz = block.z1 + 2 + rng() * (bh - 4);
        let tooClose = false;
        for (const pos of ALL_NODE_POSITIONS) {
          const dx = bx - pos[0];
          const dz = bz - pos[1];
          if (dx * dx + dz * dz < 64) { tooClose = true; break; }
        }
        if (tooClose) continue;

        // Building type based on zone + random
        const r = rng();
        let type: BuildingData["type"];
        let w: number, h: number, d: number;

        if (block.zone === "civic") {
          if (r < 0.2) { type = "tower"; w = 1.8 + rng() * 1.5; h = 8 + rng() * 7; d = 1.8 + rng() * 1.5; }
          else if (r < 0.6) { type = "office"; w = 2 + rng() * 2; h = 4 + rng() * 4; d = 2 + rng() * 2; }
          else { type = "apartment"; w = 1.5 + rng() * 2; h = 3 + rng() * 3; d = 1.5 + rng() * 1.5; }
        } else if (block.zone === "market") {
          if (r < 0.15) { type = "office"; w = 2 + rng() * 1.5; h = 4 + rng() * 3; d = 2 + rng() * 1.5; }
          else if (r < 0.5) { type = "apartment"; w = 1.5 + rng() * 1.5; h = 2.5 + rng() * 2.5; d = 1.5 + rng() * 1.5; }
          else { type = "house"; w = 1.2 + rng() * 1.2; h = 1.5 + rng() * 1.5; d = 1.2 + rng() * 1.2; }
        } else {
          if (r < 0.1) { type = "apartment"; w = 1.8 + rng() * 1.5; h = 3 + rng() * 2; d = 1.5 + rng() * 1; }
          else { type = "house"; w = 1.2 + rng() * 1.5; h = 1.5 + rng() * 2; d = 1.2 + rng() * 1.5; }
        }

        buildings.push({
          x: bx, z: bz, w, h, d,
          wallColor: walls[Math.floor(rng() * walls.length)],
          roofColor: roofs[Math.floor(rng() * roofs.length)],
          accentColor: ACCENT_COLORS[Math.floor(rng() * ACCENT_COLORS.length)],
          type,
          rot: Math.floor(rng() * 4) * Math.PI / 2,
        });
      }
    }
    return buildings;
  }, []);

  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {/* Main body */}
          <mesh position={[0, b.h / 2, 0]} castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.wallColor} />
          </mesh>

          {/* Windows — front + side, spaced grid */}
          {(b.type !== "house") && (() => {
            const rows = Math.max(1, Math.floor(b.h / 1.4));
            const cols = Math.max(1, Math.floor(b.w / 1.0));
            const wSize = b.type === "tower" ? 0.4 : 0.3;
            return Array.from({ length: rows }, (_, row) =>
              Array.from({ length: cols }, (_, col) => {
                const wx = (col - (cols - 1) / 2) * (b.w * 0.7 / Math.max(cols, 1));
                const wy = 0.8 + row * ((b.h - 1) / Math.max(rows, 1));
                return (
                  <group key={`w${row}${col}`}>
                    {/* Front */}
                    <mesh position={[wx, wy, b.d / 2 + 0.01]}>
                      <planeGeometry args={[wSize, wSize * 1.2]} />
                      <meshStandardMaterial color="#80c8e0" emissive="#305060" emissiveIntensity={0.15} />
                    </mesh>
                    {/* Side */}
                    <mesh position={[b.w / 2 + 0.01, wy, (col - (cols - 1) / 2) * (b.d * 0.7 / Math.max(cols, 1))]} rotation={[0, Math.PI / 2, 0]}>
                      <planeGeometry args={[wSize, wSize * 1.2]} />
                      <meshStandardMaterial color="#70b0c8" emissive="#304858" emissiveIntensity={0.1} />
                    </mesh>
                  </group>
                );
              })
            );
          })()}

          {/* Roof varies by type */}
          {b.type === "house" && (
            <mesh position={[0, b.h + 0.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[Math.max(b.w, b.d) * 0.65, 1.0, 4]} />
              <meshStandardMaterial color={b.roofColor} />
            </mesh>
          )}
          {b.type === "apartment" && (
            <mesh position={[0, b.h + 0.05, 0]} castShadow>
              <boxGeometry args={[b.w + 0.2, 0.1, b.d + 0.2]} />
              <meshStandardMaterial color={b.roofColor} />
            </mesh>
          )}
          {(b.type === "office" || b.type === "tower") && (
            <group>
              {/* Flat roof with edge */}
              <mesh position={[0, b.h + 0.08, 0]} castShadow>
                <boxGeometry args={[b.w + 0.3, 0.15, b.d + 0.3]} />
                <meshStandardMaterial color={b.roofColor} />
              </mesh>
              {/* Accent stripe near top */}
              <mesh position={[0, b.h * 0.85, b.d / 2 + 0.02]}>
                <planeGeometry args={[b.w * 0.9, 0.15]} />
                <meshStandardMaterial color={b.accentColor} />
              </mesh>
            </group>
          )}
          {b.type === "tower" && (
            /* Antenna/spire on top */
            <mesh position={[0, b.h + 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.08, 1.2, 4]} />
              <meshStandardMaterial color="#666" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ─── Small parks ─────────────────────────────────────────────────

function ParkTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1.0, 5]} />
        <meshStandardMaterial color="#6b4420" />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.65, 8, 6]} />
        <meshStandardMaterial color="#3a8a3a" />
      </mesh>
    </group>
  );
}

function Parks() {
  const trees = useMemo(() => {
    const rng = seededRng(123);
    const result: { x: number; z: number; s: number }[] = [];
    const parkZones = [
      { cx: -8, cz: 8, r: 6, count: 6 },
      { cx: -40, cz: 40, r: 5, count: 5 },
      { cx: 48, cz: -20, r: 5, count: 5 },
      { cx: 20, cz: 42, r: 5, count: 4 },
      { cx: -56, cz: -28, r: 4, count: 3 },
      { cx: 56, cz: 10, r: 4, count: 3 },
      { cx: -75, cz: 0, r: 10, count: 6 },
      { cx: 72, cz: -10, r: 8, count: 4 },
      { cx: 0, cz: -60, r: 12, count: 5 },
      { cx: 0, cz: 55, r: 10, count: 4 },
    ];
    for (const park of parkZones) {
      for (let i = 0; i < park.count; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = rng() * park.r;
        result.push({
          x: park.cx + Math.cos(angle) * dist,
          z: park.cz + Math.sin(angle) * dist,
          s: 0.7 + rng() * 0.6,
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {trees.map((t, i) => <ParkTree key={i} position={[t.x, 0, t.z]} scale={t.s} />)}
      {[[-9, 7], [-7, 9], [-9, 10]].map(([x, z], i) => (
        <mesh key={`bench${i}`} position={[x, 0.2, z]} castShadow>
          <boxGeometry args={[1.0, 0.08, 0.3]} />
          <meshStandardMaterial color="#8a6a40" />
        </mesh>
      ))}
      <group position={[-8, 0, 8]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[1.0, 1.2, 0.3, 16]} />
          <meshStandardMaterial color="#8a9aa0" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
          <meshStandardMaterial color="#7a8a90" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Plazas near landmarks ───────────────────────────────────────

function Plazas() {
  return (
    <group>
      {ALL_NODE_POSITIONS.map((pos, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], -0.03, pos[1]]}>
          <circleGeometry args={[5, 20]} />
          <meshStandardMaterial color="#9a9a80" roughness={1} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Market stalls ───────────────────────────────────────────────

function MarketStalls() {
  const stalls = useMemo(() => {
    const rng = seededRng(77);
    const result: { x: number; z: number; rot: number }[] = [];
    const cx = 30, cz = 26;
    for (let i = 0; i < 5; i++) {
      result.push({ x: cx + 6 + rng() * 14, z: cz - 4 + rng() * 8, rot: rng() * 0.5 - 0.25 });
    }
    return result;
  }, []);

  return (
    <group>
      {stalls.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.6, 0.06, 0.9]} /><meshStandardMaterial color="#c8a050" /></mesh>
          <mesh position={[-0.65, 0.25, 0]}><boxGeometry args={[0.06, 0.5, 0.06]} /><meshStandardMaterial color="#8a6a40" /></mesh>
          <mesh position={[0.65, 0.25, 0]}><boxGeometry args={[0.06, 0.5, 0.06]} /><meshStandardMaterial color="#8a6a40" /></mesh>
          <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.8, 0.04, 1.1]} /><meshStandardMaterial color={["#c04040", "#4080c0", "#c0a040", "#40a060", "#a040a0"][i % 5]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Lamp posts ──────────────────────────────────────────────────

function Lamps() {
  const positions = useMemo(() => {
    const lamps: [number, number][] = [];
    for (const ave of MAIN_AVENUES) {
      for (let x = ave.x1 + 10; x < ave.x2; x += 18) {
        lamps.push([x, ave.z + 4]);
        lamps.push([x + 9, ave.z - 4]);
      }
    }
    return lamps;
  }, []);

  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.06, 0.08, 2.4, 5]} /><meshStandardMaterial color="#505050" /></mesh>
          <mesh position={[0, 2.5, 0]}><sphereGeometry args={[0.18, 6, 4]} /><meshStandardMaterial color="#f0e8c0" emissive="#f0e0a0" emissiveIntensity={0.3} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Ambient life ────────────────────────────────────────────────

function AmbientPerson({ position, color, rot = 0 }: { position: [number, number, number]; color: string; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.5}>
      <mesh position={[0, 0.6, 0]} castShadow><capsuleGeometry args={[0.2, 0.55, 4, 6]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.18, 6, 5]} /><meshStandardMaterial color="#e8c8a0" /></mesh>
    </group>
  );
}

function AmbientDog({ position, color = "#a07040", rot = 0 }: { position: [number, number, number]; color?: string; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.2}>
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.14, 0.4, 4, 5]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.35, 0.32, 0]}><sphereGeometry args={[0.14, 5, 4]} /><meshStandardMaterial color={color} /></mesh>
      {[[-0.14, 0.12], [0.14, 0.12], [-0.14, -0.12], [0.14, -0.12]].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 0.07, oz]}><cylinderGeometry args={[0.035, 0.035, 0.14, 4]} /><meshStandardMaterial color={color} /></mesh>
      ))}
      <mesh position={[-0.35, 0.35, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.02, 0.015, 0.2, 4]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function AmbientCat({ position, color = "#404040", rot = 0 }: { position: [number, number, number]; color?: string; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.2}>
      <mesh position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.09, 0.25, 4, 5]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.22, 0.22, 0]}><sphereGeometry args={[0.1, 5, 4]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.26, 0.33, 0.04]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.035, 0.07, 3]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.26, 0.33, -0.04]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.035, 0.07, 3]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[-0.25, 0.25, 0]} rotation={[0, 0, 0.8]}><cylinderGeometry args={[0.015, 0.02, 0.22, 4]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function AmbientBird({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, 0, 0]}><sphereGeometry args={[0.08, 5, 4]} /><meshStandardMaterial color="#707070" /></mesh>
      <mesh position={[0.1, 0.02, 0]}><sphereGeometry args={[0.05, 4, 3]} /><meshStandardMaterial color="#606060" /></mesh>
      <mesh position={[0.14, 0.03, 0]} rotation={[0, 0.3, 0]}><coneGeometry args={[0.015, 0.04, 3]} /><meshStandardMaterial color="#c0a020" /></mesh>
    </group>
  );
}

function AmbientLife() {
  return (
    <group>
      {/* People — market area */}
      <AmbientPerson position={[34, 0, 24]} color="#4070b0" rot={1.2} />
      <AmbientPerson position={[38, 0, 28]} color="#b04050" rot={2.8} />
      <AmbientPerson position={[28, 0, 30]} color="#50a060" rot={0.5} />
      <AmbientPerson position={[44, 0, 22]} color="#8060a0" rot={3.8} />
      {/* People — school area */}
      <AmbientPerson position={[-48, 0, 34]} color="#c0a030" rot={1.8} />
      <AmbientPerson position={[-52, 0, 38]} color="#6060c0" rot={0.3} />
      <AmbientPerson position={[-46, 0, 40]} color="#c06060" rot={5.2} />
      {/* People — civic center */}
      <AmbientPerson position={[18, 0, -2]} color="#a06080" rot={4.2} />
      <AmbientPerson position={[24, 0, 2]} color="#508080" rot={2.1} />
      <AmbientPerson position={[14, 0, -8]} color="#6080a0" rot={0.8} />
      {/* People — houses */}
      <AmbientPerson position={[-18, 0, -16]} color="#a08050" rot={3.5} />
      <AmbientPerson position={[-24, 0, -20]} color="#609060" rot={1.4} />
      {/* People — central park */}
      <AmbientPerson position={[-6, 0, 10]} color="#607090" rot={1.0} />
      <AmbientPerson position={[-10, 0, 6]} color="#906060" rot={5.0} />
      {/* People — zoo */}
      <AmbientPerson position={[44, 0, -28]} color="#4090a0" rot={2.5} />
      <AmbientPerson position={[38, 0, -32]} color="#a07050" rot={4.0} />
      {/* People — hospital */}
      <AmbientPerson position={[-32, 0, -36]} color="#f0f0f0" rot={1.6} />
      {/* More people — along streets */}
      <AmbientPerson position={[0, 0, 1.5]} color="#508090" rot={0.6} />
      <AmbientPerson position={[-30, 0, -1]} color="#905050" rot={2.4} />
      <AmbientPerson position={[55, 0, 1]} color="#a080c0" rot={4.5} />
      <AmbientPerson position={[-62, 0, -0.5]} color="#60a060" rot={1.1} />
      <AmbientPerson position={[10, 0, 37.5]} color="#c07050" rot={3.3} />
      <AmbientPerson position={[-45, 0, -35]} color="#4070a0" rot={0.2} />
      <AmbientPerson position={[30, 0, -35]} color="#a0a050" rot={5.5} />
      <AmbientPerson position={[-10, 0, 18.5]} color="#706080" rot={2.0} />
      <AmbientPerson position={[45, 0, -1]} color="#b06040" rot={3.8} />
      <AmbientPerson position={[-55, 0, 18]} color="#5080b0" rot={1.9} />
      <AmbientPerson position={[12, 0, -18.5]} color="#a08070" rot={4.2} />
      <AmbientPerson position={[-35, 0, 18]} color="#80a0b0" rot={0.7} />

      {/* Dogs */}
      <AmbientDog position={[-22, 0, -14]} color="#a07040" rot={2.0} />
      <AmbientDog position={[36, 0, 22]} color="#c09050" rot={0.7} />
      <AmbientDog position={[-46, 0, 36]} color="#806030" rot={4.5} />
      <AmbientDog position={[16, 0, 8]} color="#e0c080" rot={3.2} />
      <AmbientDog position={[-14, 0, -22]} color="#505050" rot={1.1} />

      {/* Cats */}
      <AmbientCat position={[-38, 0, 6]} color="#404040" rot={1.5} />
      <AmbientCat position={[48, 0, -18]} color="#c08040" rot={3.2} />
      <AmbientCat position={[-60, 0, 20]} color="#303030" rot={0.4} />

      {/* Birds — around market/square */}
      <AmbientBird position={[32, 0.01, 28]} rot={0.8} />
      <AmbientBird position={[33, 0.01, 29]} rot={2.1} />
      <AmbientBird position={[31, 0.01, 27.5]} rot={4.5} />
      <AmbientBird position={[-7, 0.01, 9]} rot={1.3} />
      <AmbientBird position={[-8.5, 0.01, 7.5]} rot={3.7} />
      {/* Birds on rooftops */}
      <AmbientBird position={[20, 3.5, -6]} rot={2.0} />
      <AmbientBird position={[-30, 3.0, 2]} rot={5.0} />
    </group>
  );
}

// ─── Cars on streets ─────────────────────────────────────────────

function Car({ position, color, rot = 0 }: { position: [number, number, number]; color: string; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {/* Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.2, 0.5, 1.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.1, 0.7, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 0.95]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Windows */}
      <mesh position={[0.1, 0.72, 0.48]}>
        <boxGeometry args={[1.0, 0.3, 0.02]} />
        <meshStandardMaterial color="#80c8e0" />
      </mesh>
      <mesh position={[0.1, 0.72, -0.48]}>
        <boxGeometry args={[1.0, 0.3, 0.02]} />
        <meshStandardMaterial color="#80c8e0" />
      </mesh>
      {/* Wheels */}
      {[[-0.6, 0.55], [-0.6, -0.55], [0.6, 0.55], [0.6, -0.55]].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 0.12, oz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.08, 8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function Cars() {
  return (
    <group>
      {/* Cars on main avenues */}
      <Car position={[-30, 0, 0.8]} color="#c04040" rot={0} />
      <Car position={[-5, 0, -0.8]} color="#4080c0" rot={Math.PI} />
      <Car position={[40, 0, 0.8]} color="#40a060" rot={0} />
      <Car position={[20, 0, 36.8]} color="#c0a040" rot={0} />
      <Car position={[-40, 0, 35.2]} color="#8060a0" rot={Math.PI} />
      <Car position={[50, 0, -36.8]} color="#e07030" rot={Math.PI} />
      <Car position={[-20, 0, -35.2]} color="#3080a0" rot={0} />
      {/* Cars on secondary streets */}
      <Car position={[-54.8, 0, 10]} color="#a04080" rot={Math.PI / 2} />
      <Car position={[10.8, 0, -20]} color="#c08040" rot={-Math.PI / 2} />
      <Car position={[38.8, 0, 15]} color="#505050" rot={Math.PI / 2} />
      <Car position={[-19.2, 0, 30]} color="#d0d040" rot={-Math.PI / 2} />
    </group>
  );
}

// ─── Clouds ──────────────────────────────────────────────────────

function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]}><sphereGeometry args={[3, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.6} roughness={1} /></mesh>
      <mesh position={[2.5, -0.3, 0]}><sphereGeometry args={[2.2, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={1} /></mesh>
      <mesh position={[-2, -0.2, 0.5]}><sphereGeometry args={[2.5, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={1} /></mesh>
      <mesh position={[1, 0.5, -0.5]}><sphereGeometry args={[2, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} /></mesh>
    </group>
  );
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.position.x += delta * 0.3;
    if (ref.current && ref.current.position.x > 120) ref.current.position.x = -120;
  });

  return (
    <group ref={ref}>
      <Cloud position={[-40, 45, -20]} scale={1.2} />
      <Cloud position={[20, 50, -35]} scale={0.9} />
      <Cloud position={[60, 42, 10]} scale={1.0} />
      <Cloud position={[-70, 48, 15]} scale={0.8} />
      <Cloud position={[0, 55, -50]} scale={1.1} />
      <Cloud position={[-20, 46, 30]} scale={0.7} />
      <Cloud position={[45, 52, -10]} scale={0.85} />
    </group>
  );
}

// ─── City marker (EVEN BIGGER) ───────────────────────────────────

const RING_COLOR: Record<City["terrain"], string> = {
  grass: "#22c55e", sand: "#f59e0b", coast: "#06b6d4",
  mountain: "#94a3b8", urban: "#818cf8",
};

function CityMarker({ city, lang, unlocked, completedLevels, isNext, onSelect }: {
  city: City; lang: Language; unlocked: boolean; completedLevels: number; isNext: boolean; onSelect: (city: City) => void;
}) {
  const [x, , z] = cityToWorld(city);
  const ringColor = RING_COLOR[city.terrain];
  const size = isNext ? 110 : unlocked ? 96 : 76;

  return (
    <group position={[x, 0.5, z]}>
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
          <ringGeometry args={[3.5, 5, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={isNext ? 0.4 : 0.18} />
        </mesh>
      )}
      <Html center distanceFactor={50} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center transition-all duration-200 active:scale-90"
          style={{ transform: "translateY(-22px)" }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: size, height: size, borderRadius: "50%",
              background: unlocked
                ? "radial-gradient(circle at 35% 35%, #f5f0e8, #d4c8a8)"
                : "radial-gradient(circle at 35% 35%, #6a6a60, #4a4a42)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? ringColor : "#555"}`,
              boxShadow: unlocked
                ? `0 4px 16px rgba(0,0,0,0.5), 0 0 ${isNext ? 20 : 8}px ${ringColor}${isNext ? "80" : "35"}`
                : "0 3px 8px rgba(0,0,0,0.4)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 44 : 36 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 28, opacity: 0.4 }}>🔒</span>
            )}
          </div>
          {unlocked && (
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ fontSize: 12, opacity: i < completedLevels ? 1 : 0.2 }}>⭐</span>
              ))}
            </div>
          )}
          <div className="mt-1 px-4 py-1.5 rounded-xl" style={{
            background: unlocked ? "rgba(20,15,5,0.92)" : "rgba(30,30,30,0.75)",
            backdropFilter: "blur(4px)",
          }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: unlocked ? "#fff" : "#777", whiteSpace: "nowrap", letterSpacing: 0.5 }}>
              {city.building[lang]}
            </p>
          </div>
          <p style={{ fontSize: 11, color: unlocked ? "#90b878" : "#666", fontWeight: 600, marginTop: 2 }}>{city.name[lang]}</p>
          {!unlocked && city.requiredXP > 0 && (
            <span style={{ fontSize: 10, color: "#c8a050", fontWeight: 700 }}>⭐ {city.requiredXP}</span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Future locked location markers (BIGGER) ────────────────────

function FutureLocationMarkers() {
  return (
    <group>
      {FUTURE_LOCATIONS.map((loc) => (
        <group key={loc.id} position={[loc.pos[0], 0.5, loc.pos[1]]}>
          <Html center distanceFactor={50} style={{ pointerEvents: "none" }}>
            <div className="flex flex-col items-center" style={{ opacity: 0.65 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #5a5a54, #3a3a34)",
                  border: "3px solid #555",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                }}
              >
                <span style={{ fontSize: 26, opacity: 0.5 }}>🔒</span>
              </div>
              <div className="mt-1 px-3 py-1 rounded-lg" style={{ background: "rgba(30,30,30,0.7)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#777", whiteSpace: "nowrap" }}>
                  {loc.label}
                </p>
              </div>
              <p style={{ fontSize: 10, color: "#999", fontStyle: "italic" }}>Coming soon</p>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ─── Camera controls ─────────────────────────────────────────────

function CameraControls() {
  const controlsRef = useRef<any>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useFrame(() => {
    if (!controlsRef.current) return;
    const t = controlsRef.current.target;
    // Tighter bounds based on zoom — closer = more freedom, far = more clamped
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
      minDistance={15}
      maxDistance={110}
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

// ─── Scene ready ────────────────────────────────────────────────

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

interface WorldMapProps {
  onSelectCity: (city: City) => void;
}

export function WorldMap({ onSelectCity }: WorldMapProps) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(CITIES.filter((c) => totalPoints >= c.requiredXP).map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...CITIES].reverse().find(
      (c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3
    );
    const firstLocked = CITIES.find((c) => !unlockedIds.has(c.id));
    return lastUnlocked?.id || firstLocked?.id;
  }, [unlockedIds, getTopicCompletedLevels]);

  useEffect(() => {
    if (sceneReady) {
      const t1 = setTimeout(() => setOverlayVisible(false), 100);
      const t2 = setTimeout(() => setOverlayHidden(true), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [sceneReady]);

  return (
    <div className="w-full h-full relative z-0" style={{ touchAction: "none" }}>
      <Canvas
        dpr={dpr}
        shadows
        camera={{ position: [0, 55, 40], fov: 45 }}
        style={{ touchAction: "none" }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />

        {/* Sky gradient instead of flat color */}
        <Sky sunPosition={[80, 40, 30]} turbidity={2} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
        <fog attach="fog" args={["#c8dbe8", 80, 180]} />

        {/* Lighting — warm sun + cool fill + bounce */}
        <ambientLight intensity={0.5} color="#e8e0d8" />
        <directionalLight
          position={[40, 60, 25]}
          intensity={1.5}
          color="#fff0c0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-90}
          shadow-camera-right={90}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
          shadow-camera-near={1}
          shadow-camera-far={200}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-30, 20, -40]} intensity={0.2} color="#6090c0" />
        <hemisphereLight intensity={0.4} color="#87ceeb" groundColor="#c0a880" />

        <Suspense fallback={null}>
          <Ground />
          <Streets />
          <CityRoads unlockedIds={unlockedIds} />
          <Plazas />
          <CityBlocks />
          <Parks />
          <MarketStalls />
          <Lamps />
          <AmbientLife />
          <Cars />
          <Clouds />

          {CITIES.map((city) => (
            <CityMarker
              key={city.id}
              city={city}
              lang={lang}
              unlocked={unlockedIds.has(city.id)}
              completedLevels={getTopicCompletedLevels(city.topicId)}
              isNext={city.id === nextCityId}
              onSelect={onSelectCity}
            />
          ))}

          <FutureLocationMarkers />

          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        <CameraControls />

        {/* Post-processing — ambient occlusion, bloom, tilt-shift, vignette */}
        <EffectComposer>
          <N8AO aoRadius={1.5} intensity={2.5} distanceFalloff={0.8} />
          <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.5} intensity={0.2} mipmapBlur />
          <TiltShift2 blur={0.08} />
          <Vignette eskil={false} offset={0.2} darkness={0.4} />
        </EffectComposer>
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-[#a8c0d0] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-500"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">🏙️</div>
            <p className="text-amber-800/50 text-sm">Loading city...</p>
          </div>
        </div>
      )}
    </div>
  );
}
