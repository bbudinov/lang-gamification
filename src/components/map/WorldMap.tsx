"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor, Sky } from "@react-three/drei";
// import { EffectComposer, N8AO, Bloom, Vignette, TiltShift2 } from "@react-three/postprocessing";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Mobile detection (static — no hooks) ────────────────────────
const IS_MOBILE = typeof window !== "undefined" && (
  "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.innerWidth < 800
);

// ─── City grid layout ────────────────────────────────────────────
const WORLD_W = 180;
const WORLD_H = 140;

const CITY_POSITIONS: Record<string, [number, number]> = {
  // Original 8
  greenville:  [-50, 36],
  farmstead:   [30, 26],
  colortown:   [-36, 4],
  numberville: [22, -4],
  homestead:   [-20, -18],
  seaside:     [42, -30],
  healthville: [-34, -38],
  stormridge:  [10, -50],
  // Previously unmapped
  bookshire:   [-56, -10],
  portside:    [50, 4],
  townhall:    [8, 14],
  sportsville: [56, -40],
  melodia:     [-28, 40],
  // New Land locations
  "botanical-garden": [-52, -56],
  "central-park":     [48, -56],
  "university":       [-40, -68],
  "art-museum":       [36, -68],
  "history-museum":   [0, -72],
  "legendary-places": [0, -84],
};

const ALL_NODE_POSITIONS: [number, number][] = [
  ...Object.values(CITY_POSITIONS),
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
  { x: -44, z: 36, w: 48, h: 28, tint: "#4a8a3a" },
  { x: -38, z: 0, w: 52, h: 32, tint: "#3a7a34" },
  { x: 14, z: -2, w: 44, h: 34, tint: "#5a8a5a" },
  { x: 38, z: 24, w: 40, h: 28, tint: "#4a8040" },
  { x: -34, z: -38, w: 44, h: 24, tint: "#508058" },
  { x: 38, z: -32, w: 40, h: 24, tint: "#3a7a6a" },
  { x: 10, z: -50, w: 36, h: 20, tint: "#4a7a48" },
];

// ─── Ground ──────────────────────────────────────────────────────

function Ground() {
  return (
    <group>
      {/* Huge base — dark grey so edges blend */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#4a5a4a" roughness={1} />
      </mesh>
      {/* City area — grey-green urban ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow={!IS_MOBILE}>
        <planeGeometry args={[WORLD_W, WORLD_H]} />
        <meshStandardMaterial color="#6a7a6a" roughness={0.95} />
      </mesh>
      {/* Green district patches — use polygonOffset to prevent z-fighting */}
      {DISTRICTS.map((d, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[d.x, -0.19, d.z]}>
          <planeGeometry args={[d.w, d.h]} />
          <meshStandardMaterial color={d.tint} roughness={1} transparent opacity={0.35} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Streets ─────────────────────────────────────────────────────

function Streets() {
  const meshes = useMemo(() => {
    const result: THREE.Mesh[] = [];
    // Shared wet asphalt material — low roughness for subtle reflections
    const asphaltMain = new THREE.MeshStandardMaterial({ color: "#3a3a3e", roughness: 0.55, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2 });
    const asphaltSec = new THREE.MeshStandardMaterial({ color: "#444448", roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: "#8a8a85", roughness: 0.8 });
    const curbMat = new THREE.MeshStandardMaterial({ color: "#9a9a95", roughness: 0.75 });
    const yellowLine = new THREE.MeshStandardMaterial({ color: "#d4b830", roughness: 0.9 });
    const whiteLine = new THREE.MeshStandardMaterial({ color: "#d8d8d8", roughness: 0.9 });

    // Main avenues — dark wet asphalt with curbs and sidewalks
    for (const ave of MAIN_AVENUES) {
      const len = ave.x2 - ave.x1;
      const cx = (ave.x1 + ave.x2) / 2;
      // Asphalt road surface — raised above ground to avoid z-fighting
      const geo = new THREE.PlaneGeometry(len, 5.5);
      const m = new THREE.Mesh(geo, asphaltMain);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, -0.12, ave.z);
      result.push(m);
      if (!IS_MOBILE) {
        // Center dashed line (yellow)
        for (let x = ave.x1 + 2; x < ave.x2 - 2; x += 5) {
          const dGeo = new THREE.PlaneGeometry(2.5, 0.18);
          const dm = new THREE.Mesh(dGeo, yellowLine);
          dm.rotation.x = -Math.PI / 2;
          dm.position.set(x, -0.11, ave.z);
          result.push(dm);
        }
        // Edge lines (white, continuous)
        for (const side of [-1, 1]) {
          const eGeo = new THREE.PlaneGeometry(len, 0.1);
          const em = new THREE.Mesh(eGeo, whiteLine);
          em.rotation.x = -Math.PI / 2;
          em.position.set(cx, -0.11, ave.z + side * 2.5);
          result.push(em);
        }
      }
      // Raised sidewalks with curbs
      for (const side of [-1, 1]) {
        if (!IS_MOBILE) {
          // Curb — small raised edge
          const cGeo = new THREE.BoxGeometry(len, 0.15, 0.2);
          const cm = new THREE.Mesh(cGeo, curbMat);
          cm.position.set(cx, 0.075, ave.z + side * 2.9);
          result.push(cm);
        }
        // Sidewalk surface (raised)
        const sGeo = new THREE.BoxGeometry(len, 0.1, 1.8);
        const sm = new THREE.Mesh(sGeo, sidewalkMat);
        sm.position.set(cx, 0.05, ave.z + side * 3.8);
        result.push(sm);
      }
    }
    // Secondary vertical streets — lighter wet asphalt
    for (const st of SECONDARY_STREETS_V) {
      const len = st.z2 - st.z1;
      const cz = (st.z1 + st.z2) / 2;
      const geo = new THREE.PlaneGeometry(3.8, len);
      const m = new THREE.Mesh(geo, asphaltSec);
      m.rotation.x = -Math.PI / 2;
      m.position.set(st.x, -0.13, cz);
      result.push(m);
      if (!IS_MOBILE) {
        for (let z = st.z1 + 2; z < st.z2 - 2; z += 5) {
          const dGeo = new THREE.PlaneGeometry(0.12, 2.5);
          const dm = new THREE.Mesh(dGeo, whiteLine);
          dm.rotation.x = -Math.PI / 2;
          dm.position.set(st.x, -0.12, z);
          result.push(dm);
        }
        for (const side of [-1, 1]) {
          const cGeo = new THREE.BoxGeometry(0.15, 0.12, len);
          const cm = new THREE.Mesh(cGeo, curbMat);
          cm.position.set(st.x + side * 2.0, 0.06, cz);
          result.push(cm);
        }
      }
    }
    // Secondary horizontal streets
    for (const st of SECONDARY_STREETS_H) {
      const len = st.x2 - st.x1;
      const cx = (st.x1 + st.x2) / 2;
      const geo = new THREE.PlaneGeometry(len, 3.8);
      const m = new THREE.Mesh(geo, asphaltSec);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, -0.13, st.z);
      result.push(m);
      if (!IS_MOBILE) {
        for (let x = st.x1 + 2; x < st.x2 - 2; x += 5) {
          const dGeo = new THREE.PlaneGeometry(2.5, 0.12);
          const dm = new THREE.Mesh(dGeo, whiteLine);
          dm.rotation.x = -Math.PI / 2;
          dm.position.set(x, -0.12, st.z);
          result.push(dm);
        }
        for (const side of [-1, 1]) {
          const cGeo = new THREE.BoxGeometry(len, 0.12, 0.15);
          const cm = new THREE.Mesh(cGeo, curbMat);
          cm.position.set(cx, 0.06, st.z + side * 2.0);
          result.push(cm);
        }
      }
    }
    // Crosswalks (zebra stripes) at avenue-street intersections — skip on mobile
    if (!IS_MOBILE) {
      const crosswalkMat = new THREE.MeshStandardMaterial({ color: "#e0e0e0", roughness: 0.85 });
      for (const ave of MAIN_AVENUES) {
        for (const st of SECONDARY_STREETS_V) {
          for (let stripe = -2; stripe <= 2; stripe += 0.6) {
            const sGeo = new THREE.PlaneGeometry(3.0, 0.25);
            const sm = new THREE.Mesh(sGeo, crosswalkMat);
            sm.rotation.x = -Math.PI / 2;
            sm.position.set(st.x, -0.11, ave.z + stripe);
            result.push(sm);
          }
        }
      }
    }

    return result;
  }, []);
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>;
}

// ─── Connection roads between cities ─────────────────────────────

function CityRoads({ unlockedIds, cities }: { unlockedIds: Set<string>; cities: City[] }) {
  const roads = useMemo(() => {
    const result: THREE.Mesh[] = [];
    for (const city of cities) {
      for (const targetId of city.connectsTo) {
        const target = cities.find((c) => c.id === targetId);
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
          color: unlocked ? "#8a8a80" : "#5a5a50",
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

// Mobile facade textures — canvas-drawn windows/doors, cached globally
const _facadeCache = new Map<string, THREE.CanvasTexture>();
function getFacadeTex(type: "house" | "apartment" | "office" | "tower", wallColor: string, h: number): THREE.CanvasTexture {
  const floors = Math.max(1, Math.min(6, Math.round(h / 2.5)));
  const key = `${type}-${wallColor}-${floors}`;
  const cached = _facadeCache.get(key);
  if (cached) return cached;

  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Wall background
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, S, S);

  // Subtle ground floor distinction
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.fillRect(0, S * 0.82, S, S * 0.18);

  const WIN = "#78c8e0";
  const FRAME = "#d8d4cc";
  const DOOR = "#5a4030";

  if (type === "house") {
    // Two windows with crosses
    const ww = 22, wh = 20, wy = S * 0.3;
    for (const wx of [18, S - 18 - ww]) {
      ctx.fillStyle = WIN; ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = FRAME; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, ww, wh);
      ctx.beginPath();
      ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
      ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
      ctx.stroke();
    }
    // Door
    ctx.fillStyle = DOOR; ctx.fillRect(S / 2 - 11, S - 30, 22, 30);
    ctx.fillStyle = "#3a2818"; ctx.fillRect(S / 2 - 13, S - 32, 26, 3);
  } else {
    // Window grid
    const cols = type === "tower" ? 4 : 3;
    const rows = floors;
    const ww = S * 0.11, wh = S * 0.065;
    const mx = S * 0.1;
    const gapX = cols > 1 ? (S - 2 * mx - cols * ww) / (cols - 1) : 0;
    const mt = S * 0.06;
    const zone = S * 0.74;
    const gapY = rows > 0 ? (zone - rows * wh) / (rows + 1) : 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = mx + c * (ww + gapX);
        const y = mt + gapY * (r + 1) + r * wh;
        ctx.fillStyle = WIN; ctx.fillRect(x, y, ww, wh);
        ctx.strokeStyle = FRAME; ctx.lineWidth = 1; ctx.strokeRect(x, y, ww, wh);
      }
    }
    // Door
    ctx.fillStyle = DOOR; ctx.fillRect(S / 2 - 8, S - 22, 16, 22);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _facadeCache.set(key, tex);
  return tex;
}

type SignData = {
  face: "front" | "side";
  y: number; // height on building
  w: number; h: number;
  color: string;
  emissive: string;
  intensity: number;
};

type BuildingData = {
  x: number; z: number; w: number; h: number; d: number;
  wallColor: string; roofColor: string; accentColor: string;
  type: "house" | "apartment" | "office" | "tower";
  rot: number;
  signs: SignData[];
};

function CityBlocks() {
  const blocks = useMemo(() => {
    const rng = seededRng(42);
    const buildings: BuildingData[] = [];

    // Dense urban layout — many more buildings, taller, closer together
    const blockAreas = [
      // Residential west
      { x1: -72, x2: -54, z1: -16, z2: -2, density: 1.2, zone: "res" as const },
      { x1: -54, x2: -22, z1: -16, z2: -2, density: 1.0, zone: "res" as const },
      { x1: -54, x2: -22, z1: 2, z2: 16, density: 1.0, zone: "res" as const },
      { x1: -72, x2: -54, z1: 2, z2: 16, density: 0.9, zone: "res" as const },
      // School quarter
      { x1: -72, x2: -54, z1: 20, z2: 34, density: 0.8, zone: "res" as const },
      { x1: -54, x2: -22, z1: 20, z2: 34, density: 0.9, zone: "market" as const },
      // Civic center — dense tall buildings
      { x1: -18, x2: 10, z1: -16, z2: -2, density: 1.3, zone: "civic" as const },
      { x1: 10, x2: 36, z1: -16, z2: -2, density: 1.2, zone: "civic" as const },
      { x1: -18, x2: 10, z1: 2, z2: 16, density: 1.2, zone: "civic" as const },
      { x1: 10, x2: 36, z1: 2, z2: 16, density: 1.1, zone: "civic" as const },
      // Market east — mixed dense
      { x1: 40, x2: 62, z1: 2, z2: 16, density: 1.1, zone: "market" as const },
      { x1: 40, x2: 62, z1: 18, z2: 34, density: 1.0, zone: "market" as const },
      // Hospital area
      { x1: -54, x2: -22, z1: -50, z2: -38, density: 0.8, zone: "civic" as const },
      // Zoo area
      { x1: 22, x2: 54, z1: -44, z2: -38, density: 0.6, zone: "market" as const },
      // Weather station
      { x1: -8, x2: 26, z1: -54, z2: -44, density: 0.7, zone: "civic" as const },
      // South strips
      { x1: -68, x2: -22, z1: 38, z2: 50, density: 0.7, zone: "res" as const },
      { x1: -18, x2: 38, z1: 38, z2: 50, density: 0.8, zone: "market" as const },
      // Fill edges with more buildings
      { x1: -72, x2: -56, z1: -50, z2: -20, density: 0.6, zone: "res" as const },
      { x1: 56, x2: 72, z1: -30, z2: 30, density: 0.7, zone: "market" as const },
      { x1: -18, x2: 38, z1: -38, z2: -20, density: 0.9, zone: "civic" as const },
    ];

    // More varied wall colors — including some colored facades like in Japanese cities
    const WALL_PALETTES = {
      res: ["#e0ddd6", "#d4cfc6", "#c8c4ba", "#e8e4dc", "#d8d0c4", "#c4b8a0", "#e0d8cc", "#d0c8b8", "#dcd4c8"],
      civic: ["#d8dce0", "#c8ccd4", "#e0e4e8", "#b8c0c8", "#e4e8ec", "#c0c8d0", "#d4d8e0", "#b0b8c4", "#dce0e4"],
      market: ["#e2d8c8", "#d0c4b0", "#dcd0bc", "#c8bca8", "#e8dcc8", "#d8c8b0", "#c4b8a0", "#dcd4c0", "#d0c0a8"],
    };
    // Some buildings get colored facades (Japanese city style)
    const COLORED_FACADES = [
      "#c8a070", "#8a6848", "#b85838", "#4868a0", "#386848", "#a04868",
      "#c0a050", "#607898", "#886848", "#987858", "#6080a0", "#a86848",
    ];
    const ROOF_PALETTES = {
      res: ["#b86830", "#a85828", "#c07038", "#986020", "#b06028", "#c87840"],
      civic: ["#404850", "#383e48", "#4a5058", "#505860", "#343a42", "#485058"],
      market: ["#a86030", "#b06828", "#986020", "#4a5050", "#585e5e", "#c07038"],
    };
    const ACCENT_COLORS = ["#3070b8", "#c83838", "#2a8a48", "#d4a020", "#8840a8", "#2898a0", "#e06828", "#c06088", "#4090d0", "#38a878"];
    // Bigger, bolder sign colors
    const SIGN_COLORS = [
      { color: "#ff2020", emissive: "#ff1818" },
      { color: "#2070ff", emissive: "#1858ff" },
      { color: "#20ff50", emissive: "#18e040" },
      { color: "#ff6010", emissive: "#e05008" },
      { color: "#ff20a0", emissive: "#e01888" },
      { color: "#30e0e0", emissive: "#28c8c8" },
      { color: "#ffe030", emissive: "#e0c020" },
      { color: "#a040ff", emissive: "#8830e0" },
      { color: "#ff4060", emissive: "#e03050" },
      { color: "#40a0ff", emissive: "#3088e0" },
    ];
    // Ground floor storefront colors
    const STOREFRONT_COLORS = ["#2858a0", "#a03838", "#2a6838", "#8a6030", "#683868", "#286868", "#a06028", "#3868a0"];

    for (const block of blockAreas) {
      const bw = block.x2 - block.x1;
      const bh = block.z2 - block.z1;
      const count = Math.floor((bw * bh * block.density) / (IS_MOBILE ? 60 : 28)); // fewer buildings on mobile
      const walls = WALL_PALETTES[block.zone];
      const roofs = ROOF_PALETTES[block.zone];

      for (let i = 0; i < count; i++) {
        const bx = block.x1 + 1.5 + rng() * (bw - 3);
        const bz = block.z1 + 1.5 + rng() * (bh - 3);
        let tooClose = false;
        for (const pos of ALL_NODE_POSITIONS) {
          const dx = bx - pos[0];
          const dz = bz - pos[1];
          if (dx * dx + dz * dz < 42) { tooClose = true; break; } // reduced from 64
        }
        if (tooClose) continue;

        const r = rng();
        let type: BuildingData["type"];
        let w: number, h: number, d: number;

        if (block.zone === "civic") {
          if (r < 0.3) { type = "tower"; w = 2 + rng() * 2; h = 10 + rng() * 10; d = 2 + rng() * 2; }
          else if (r < 0.65) { type = "office"; w = 2.5 + rng() * 2.5; h = 5 + rng() * 6; d = 2.5 + rng() * 2; }
          else { type = "apartment"; w = 2 + rng() * 2.5; h = 4 + rng() * 4; d = 2 + rng() * 2; }
        } else if (block.zone === "market") {
          if (r < 0.2) { type = "office"; w = 2 + rng() * 2; h = 5 + rng() * 5; d = 2 + rng() * 2; }
          else if (r < 0.6) { type = "apartment"; w = 2 + rng() * 2; h = 3 + rng() * 4; d = 2 + rng() * 1.5; }
          else { type = "house"; w = 1.5 + rng() * 1.5; h = 2 + rng() * 2; d = 1.5 + rng() * 1.5; }
        } else {
          if (r < 0.2) { type = "apartment"; w = 2 + rng() * 2; h = 3.5 + rng() * 3; d = 2 + rng() * 1.5; }
          else if (r < 0.05 + 0.2) { type = "office"; w = 2 + rng() * 1.5; h = 4 + rng() * 3; d = 2 + rng() * 1.5; }
          else { type = "house"; w = 1.5 + rng() * 1.8; h = 2 + rng() * 2.5; d = 1.5 + rng() * 1.8; }
        }

        // Generate signs — MUCH bigger and more frequent (Shibuya style)
        const signs: SignData[] = [];
        if (type !== "house" && h > 3) {
          // More signs on taller buildings
          const maxSigns = type === "tower" ? 3 + Math.floor(rng() * 3) : type === "office" ? 2 + Math.floor(rng() * 2) : rng() < 0.7 ? 1 + Math.floor(rng() * 2) : 0;
          for (let s = 0; s < maxSigns; s++) {
            const sc = SIGN_COLORS[Math.floor(rng() * SIGN_COLORS.length)];
            const signW = 0.6 + rng() * (w * 0.8); // much wider signs
            const signH = 0.4 + rng() * 1.2; // taller signs
            signs.push({
              face: rng() < 0.55 ? "front" : "side",
              y: 1.8 + rng() * (h - 2.5),
              w: signW,
              h: signH,
              color: sc.color,
              emissive: sc.emissive,
              intensity: 0.4 + rng() * 0.6,
            });
          }
        }

        // Some buildings get colored facades
        const useColoredFacade = rng() < 0.2;
        const wallColor = useColoredFacade
          ? COLORED_FACADES[Math.floor(rng() * COLORED_FACADES.length)]
          : walls[Math.floor(rng() * walls.length)];

        buildings.push({
          x: bx, z: bz, w, h, d,
          wallColor,
          roofColor: roofs[Math.floor(rng() * roofs.length)],
          accentColor: ACCENT_COLORS[Math.floor(rng() * ACCENT_COLORS.length)],
          type,
          rot: Math.floor(rng() * 4) * Math.PI / 2,
          signs,
        });
      }
    }
    return buildings;
  }, []);

  // Mobile: textured facades — canvas-drawn windows/doors (0 extra meshes)
  if (IS_MOBILE) {
    return (
      <group>
        {blocks.map((b, i) => (
          <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
            {/* Building body with facade texture */}
            <mesh position={[0, b.h / 2, 0]}>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial map={getFacadeTex(b.type, b.wallColor, b.h)} />
            </mesh>
            {/* Roof — pitched for houses, flat slab for others */}
            {b.type === "house" ? (
              <mesh position={[0, b.h + 0.35, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[Math.max(b.w, b.d) * 0.7, 1.1, 4]} />
                <meshStandardMaterial color={b.roofColor} />
              </mesh>
            ) : (
              <mesh position={[0, b.h + 0.06, 0]}>
                <boxGeometry args={[b.w + 0.2, 0.12, b.d + 0.2]} />
                <meshStandardMaterial color={b.roofColor} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    );
  }

  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {/* Foundation / base */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[b.w + 0.1, 0.08, b.d + 0.1]} />
            <meshStandardMaterial color="#707068" roughness={0.9} />
          </mesh>

          {/* Main body with facade texture (windows/doors baked in) */}
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial map={getFacadeTex(b.type, b.wallColor, b.h)} roughness={0.85} />
          </mesh>

          {/* Awning / shop canopy */}
          {(b.type === "office" || b.type === "apartment") && (
            <mesh position={[0, 1.1, b.d / 2 + 0.25]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[b.w * 0.6, 0.03, 0.5]} />
              <meshStandardMaterial color={b.accentColor} />
            </mesh>
          )}

          {/* Roof varies by type */}
          {b.type === "house" && (
            <group>
              {/* Pitched roof */}
              <mesh position={[0, b.h + 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <coneGeometry args={[Math.max(b.w, b.d) * 0.7, 1.1, 4]} />
                <meshStandardMaterial color={b.roofColor} roughness={0.8} />
              </mesh>
            </group>
          )}
          {b.type === "apartment" && (
            <group>
              <mesh position={[0, b.h + 0.06, 0]} castShadow>
                <boxGeometry args={[b.w + 0.2, 0.12, b.d + 0.2]} />
                <meshStandardMaterial color={b.roofColor} roughness={0.85} />
              </mesh>
            </group>
          )}
          {(b.type === "office" || b.type === "tower") && (
            <group>
              {/* Flat roof with parapet */}
              <mesh position={[0, b.h + 0.08, 0]} castShadow>
                <boxGeometry args={[b.w + 0.3, 0.15, b.d + 0.3]} />
                <meshStandardMaterial color={b.roofColor} roughness={0.8} />
              </mesh>
              {/* Accent stripe near top */}
              <mesh position={[0, b.h - 0.15, b.d / 2 + 0.02]}>
                <planeGeometry args={[b.w * 0.95, 0.2]} />
                <meshStandardMaterial color={b.accentColor} />
              </mesh>
              {/* Rooftop equipment */}
              <mesh position={[b.w * 0.2, b.h + 0.3, 0]}>
                <boxGeometry args={[0.4, 0.3, 0.3]} />
                <meshStandardMaterial color="#708090" metalness={0.3} />
              </mesh>
            </group>
          )}
          {b.type === "tower" && (
            <group>
              {/* Antenna */}
              <mesh position={[0, b.h + 0.9, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.06, 1.4, 6]} />
                <meshStandardMaterial color="#666" metalness={0.5} />
              </mesh>
              {/* Beacon light */}
              <mesh position={[0, b.h + 1.6, 0]}>
                <sphereGeometry args={[0.06, 6, 4]} />
                <meshStandardMaterial color="#ff3030" emissive="#ff2020" emissiveIntensity={0.5} />
              </mesh>
            </group>
          )}

          {/* Neon signs / billboards — single mesh per sign */}
          {b.signs.map((sign, si) => (
            sign.face === "front" ? (
              <mesh key={`sign${si}`} position={[0, sign.y, b.d / 2 + 0.03]}>
                <planeGeometry args={[sign.w, sign.h]} />
                <meshStandardMaterial color={sign.color} emissive={sign.emissive} emissiveIntensity={sign.intensity} />
              </mesh>
            ) : (
              <mesh key={`sign${si}`} position={[b.w / 2 + 0.03, sign.y, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[sign.w, sign.h]} />
                <meshStandardMaterial color={sign.color} emissive={sign.emissive} emissiveIntensity={sign.intensity} />
              </mesh>
            )
          ))}

          {/* Building shadow on ground */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[b.w + 0.5, b.d + 0.5]} />
            <meshBasicMaterial color="#000" transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Mobile-only simple trees & greenery ─────────────────────────

function SimpleMobileTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.0, 4]} />
        <meshStandardMaterial color="#3a2818" />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.7, 6, 4]} />
        <meshStandardMaterial color="#3da03a" />
      </mesh>
    </group>
  );
}

function MobileGreenery() {
  const trees = useMemo(() => {
    const rng = seededRng(321);
    const result: { x: number; z: number; s: number }[] = [];
    // Fewer park zones, fewer trees per zone
    const zones = [
      { cx: -8, cz: 8, r: 7, count: 4 },
      { cx: -40, cz: 40, r: 6, count: 3 },
      { cx: 48, cz: -20, r: 5, count: 3 },
      { cx: 20, cz: 42, r: 6, count: 3 },
      { cx: -56, cz: -28, r: 5, count: 2 },
      { cx: 56, cz: 10, r: 5, count: 2 },
      { cx: -75, cz: 0, r: 10, count: 4 },
      { cx: 0, cz: -60, r: 10, count: 3 },
      { cx: 0, cz: 55, r: 8, count: 3 },
      // Lake area
      { cx: 62, cz: -8, r: 12, count: 5 },
    ];
    for (const z of zones) {
      for (let i = 0; i < z.count; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = rng() * z.r;
        result.push({ x: z.cx + Math.cos(angle) * dist, z: z.cz + Math.sin(angle) * dist, s: 0.6 + rng() * 0.5 });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {/* Green grass patches */}
      {[
        { cx: -8, cz: 8, r: 6 }, { cx: -40, cz: 40, r: 5 }, { cx: 48, cz: -20, r: 5 },
        { cx: 20, cz: 42, r: 5 }, { cx: 62, cz: -8, r: 10 },
      ].map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.cx, -0.17, p.cz]}>
          <circleGeometry args={[p.r, 8]} />
          <meshStandardMaterial color="#3a8a30" polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
      {/* Simple lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[62, -0.14, -8]}>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#2868a0" metalness={0.5} roughness={0.2} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {trees.map((t, i) => <SimpleMobileTree key={i} position={[t.x, 0, t.z]} scale={t.s} />)}
    </group>
  );
}

// ─── Small parks ─────────────────────────────────────────────────

function ParkTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk — thin dark */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 1.2, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={0.9} />
      </mesh>
      {/* Big round lollipop crown */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.8, 12, 8]} />
        <meshStandardMaterial color="#3da03a" roughness={0.75} />
      </mesh>
      {/* Highlight sphere */}
      <mesh position={[0.1, 1.9, 0.1]}>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshStandardMaterial color="#58c048" roughness={0.7} />
      </mesh>
      {/* Shadow on ground */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 10]} />
        <meshBasicMaterial color="#1a3a18" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// ─── Instanced trees (2 draw calls for ALL trees) ───────────────
function InstancedTrees({ treeData }: { treeData: { x: number; z: number; s: number }[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const count = treeData.length;

  const [trunkGeo, crownGeo, trunkMat, crownMat] = useMemo(() => [
    new THREE.CylinderGeometry(0.06, 0.1, 1.2, 6),
    new THREE.SphereGeometry(0.8, 12, 8),
    new THREE.MeshStandardMaterial({ color: "#3a2818", roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: "#3da03a", roughness: 0.75 }),
  ], []);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = treeData[i];
      // Trunk
      dummy.position.set(t.x, 0.6 * t.s, t.z);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);
      // Crown
      dummy.position.set(t.x, 1.6 * t.s, t.z);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      crownRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (crownRef.current) crownRef.current.instanceMatrix.needsUpdate = true;
  }, [treeData, count]);

  if (count === 0) return null;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, count]} castShadow />
      <instancedMesh ref={crownRef} args={[crownGeo, crownMat, count]} castShadow />
    </group>
  );
}

function Parks() {
  const trees = useMemo(() => {
    const rng = seededRng(123);
    const result: { x: number; z: number; s: number }[] = [];
    const parkZones = [
      { cx: -8, cz: 8, r: 7, count: 10 },
      { cx: -40, cz: 40, r: 6, count: 8 },
      { cx: 48, cz: -20, r: 5, count: 6 },
      { cx: 20, cz: 42, r: 6, count: 7 },
      { cx: -56, cz: -28, r: 5, count: 5 },
      { cx: 56, cz: 10, r: 5, count: 5 },
      { cx: -75, cz: 0, r: 12, count: 10 },
      { cx: 72, cz: -10, r: 8, count: 6 },
      { cx: 0, cz: -60, r: 12, count: 8 },
      { cx: 0, cz: 55, r: 10, count: 7 },
      // Extra green strips between blocks
      { cx: -44, cz: -8, r: 3, count: 4 },
      { cx: 30, cz: -10, r: 3, count: 4 },
      { cx: -20, cz: 8, r: 3, count: 3 },
      { cx: 50, cz: 26, r: 3, count: 3 },
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

  // Street trees along main avenues
  const streetTrees = useMemo(() => {
    const result: { x: number; z: number; s: number }[] = [];
    for (const ave of MAIN_AVENUES) {
      for (let x = ave.x1 + 8; x < ave.x2 - 5; x += 12) {
        result.push({ x, z: ave.z + 5.2, s: 0.55 });
        result.push({ x: x + 6, z: ave.z - 5.2, s: 0.55 });
      }
    }
    return result;
  }, []);

  // Combine all trees into a single instanced set
  const allTrees = useMemo(() => [...trees, ...streetTrees], [trees, streetTrees]);

  return (
    <group>
      {/* Green grass patches under parks */}
      {[
        { cx: -8, cz: 8, r: 7 }, { cx: -40, cz: 40, r: 6 }, { cx: 48, cz: -20, r: 6 },
        { cx: 20, cz: 42, r: 6 }, { cx: -56, cz: -28, r: 5 }, { cx: 56, cz: 10, r: 5 },
      ].map((p, i) => (
        <mesh key={`grass${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p.cx, -0.04, p.cz]}>
          <circleGeometry args={[p.r, 16]} />
          <meshStandardMaterial color="#3a8a30" roughness={0.9} />
        </mesh>
      ))}

      <InstancedTrees treeData={allTrees} />

      {/* Park benches */}
      {[[-9, 7], [-7, 9], [-9, 10]].map(([x, z], i) => (
        <group key={`bench${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[1.0, 0.06, 0.35]} />
            <meshStandardMaterial color="#6a5030" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.4, -0.15]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[1.0, 0.3, 0.04]} />
            <meshStandardMaterial color="#6a5030" roughness={0.85} />
          </mesh>
          {[-0.35, 0.35].map((lx, li) => (
            <mesh key={li} position={[lx, 0.12, 0]}>
              <boxGeometry args={[0.04, 0.24, 0.3]} />
              <meshStandardMaterial color="#404040" metalness={0.3} />
            </mesh>
          ))}
        </group>
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

// ─── Lake / pond (large, central-east) ──────────────────────────

function Lake() {
  const shoreTrees = useMemo(() => {
    const rng = seededRng(999);
    const cx = 62, cz = -8;
    const result: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 10 + rng() * 5;
      result.push({
        x: cx + Math.cos(angle) * dist,
        z: cz + Math.sin(angle) * dist * 0.75,
        s: 0.5 + rng() * 0.5,
      });
    }
    return result;
  }, []);
  const cx = 62, cz = -8;
  const lakeW = 22, lakeH = 16;

  return (
    <group>
      {/* Large green park area around lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.05, cz]}>
        <planeGeometry args={[lakeW + 16, lakeH + 14]} />
        <meshStandardMaterial color="#388828" roughness={0.85} />
      </mesh>
      {/* Sandy bank */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.03, cz]}>
        <planeGeometry args={[lakeW + 3, lakeH + 2]} />
        <meshStandardMaterial color="#7a8868" roughness={0.85} />
      </mesh>
      {/* Water — deep blue with reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.01, cz]}>
        <planeGeometry args={[lakeW, lakeH]} />
        <meshStandardMaterial color="#2868a0" metalness={0.65} roughness={0.12} transparent opacity={0.88} />
      </mesh>
      {/* Water highlight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx - 3, 0.015, cz + 2]}>
        <planeGeometry args={[lakeW * 0.4, lakeH * 0.35]} />
        <meshStandardMaterial color="#4890c0" metalness={0.5} roughness={0.15} transparent opacity={0.35} />
      </mesh>
      {/* Shore trees — instanced */}
      <InstancedTrees treeData={shoreTrees} />
      {/* Wooden bridge */}
      <mesh position={[cx - 7, 0.15, cz]} castShadow>
        <boxGeometry args={[1.5, 0.1, lakeH * 0.5]} />
        <meshStandardMaterial color="#6a5030" roughness={0.85} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`br${side}`} position={[cx - 7 + side * 0.65, 0.3, cz]}>
          <boxGeometry args={[0.06, 0.25, lakeH * 0.5]} />
          <meshStandardMaterial color="#5a4428" roughness={0.8} />
        </mesh>
      ))}
      {[-3, -1.5, 0, 1.5, 3].map((offset) => [-1, 1].map((side) => (
        <mesh key={`bp${offset}${side}`} position={[cx - 7 + side * 0.65, 0.22, cz + offset * 1.3]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#5a4428" />
        </mesh>
      )))}
      {/* Park benches near lake */}
      {[[cx - 12, cz - 3], [cx - 12, cz + 4], [cx + 10, cz - 2], [cx + 10, cz + 3]].map(([bx, bz], bi) => (
        <group key={`lb${bi}`} position={[bx, 0, bz]} rotation={[0, bi < 2 ? 0.3 : -0.3, 0]}>
          <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.0, 0.06, 0.35]} /><meshStandardMaterial color="#6a5030" /></mesh>
          <mesh position={[0, 0.4, -0.15]} rotation={[0.15, 0, 0]}><boxGeometry args={[1.0, 0.3, 0.04]} /><meshStandardMaterial color="#6a5030" /></mesh>
        </group>
      ))}
      {/* People around lake */}
      <AmbientPerson position={[cx - 13, 0, cz - 1]} color="#4080b0" rot={0.8} />
      <AmbientPerson position={[cx - 11, 0, cz + 5]} color="#b05040" rot={2.2} />
      <AmbientPerson position={[cx + 11, 0, cz]} color="#50a060" rot={4.0} />
      <AmbientPerson position={[cx + 9, 0, cz + 4]} color="#8060a0" rot={1.5} />
      <AmbientDog position={[cx - 10, 0, cz + 2]} color="#c09050" rot={3.0} />
    </group>
  );
}

// ─── Landmarks (unique big structures) ──────────────────────────

function Landmarks() {
  return (
    <group>
      {/* ═══ SHOPPING MALL — large building near Farmstead ═══ */}
      <group position={[38, 0, 40]}>
        {/* Mall base — wide low building */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[12, 4, 8]} />
          <meshStandardMaterial color="#d0d4d8" roughness={0.7} />
        </mesh>
        {/* Glass facade front */}
        <mesh position={[0, 2.5, 4.02]}>
          <planeGeometry args={[11, 3.5]} />
          <meshStandardMaterial color="#5098c0" metalness={0.5} roughness={0.15} transparent opacity={0.7} />
        </mesh>
        {/* Glass facade side */}
        <mesh position={[6.02, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[7, 3.5]} />
          <meshStandardMaterial color="#4888b0" metalness={0.5} roughness={0.15} transparent opacity={0.65} />
        </mesh>
        {/* Entrance canopy */}
        <mesh position={[0, 3.8, 4.8]} castShadow>
          <boxGeometry args={[5, 0.15, 2]} />
          <meshStandardMaterial color="#e0e4e8" metalness={0.3} />
        </mesh>
        {/* Entrance columns */}
        {[-2, 0, 2].map((col) => (
          <mesh key={col} position={[col, 2, 5.6]}>
            <cylinderGeometry args={[0.12, 0.12, 3.6, 6]} />
            <meshStandardMaterial color="#c0c4c8" metalness={0.2} />
          </mesh>
        ))}
        {/* Roof parking level */}
        <mesh position={[0, 4.1, 0]} castShadow>
          <boxGeometry args={[12.3, 0.2, 8.3]} />
          <meshStandardMaterial color="#505858" roughness={0.85} />
        </mesh>
        {/* Rooftop structures (AC, stairs) */}
        <mesh position={[-3, 4.8, -1]} castShadow>
          <boxGeometry args={[2, 1.2, 1.5]} />
          <meshStandardMaterial color="#708090" metalness={0.3} />
        </mesh>
        <mesh position={[4, 4.5, 2]} castShadow>
          <boxGeometry args={[1, 0.6, 1]} />
          <meshStandardMaterial color="#808888" metalness={0.2} />
        </mesh>
        {/* Big mall sign */}
        <mesh position={[0, 3.2, 4.05]}>
          <planeGeometry args={[6, 1]} />
          <meshStandardMaterial color="#ff3030" emissive="#e02020" emissiveIntensity={0.5} />
        </mesh>
        {/* Mall parking lot in front */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 9]}>
          <planeGeometry args={[14, 6]} />
          <meshStandardMaterial color="#3a3a3e" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Parking lines */}
        {[-4, -2, 0, 2, 4].map((px) => (
          <mesh key={px} rotation={[-Math.PI / 2, 0, 0]} position={[px, -0.015, 9]}>
            <planeGeometry args={[0.08, 3]} />
            <meshStandardMaterial color="#d8d8d0" />
          </mesh>
        ))}
        {/* Parked cars */}
        <Car position={[-3, 0, 8]} color="#c04040" rot={Math.PI / 2} />
        <Car position={[-1, 0, 8]} color="#4080c0" rot={Math.PI / 2} />
        <Car position={[1, 0, 10]} color="#50a050" rot={Math.PI / 2} />
        <Car position={[3, 0, 10]} color="#808080" rot={Math.PI / 2} />
        {/* Shoppers */}
        <AmbientPerson position={[-1, 0, 5.5]} color="#c06060" rot={0} />
        <AmbientPerson position={[1, 0, 6]} color="#4080a0" rot={0.5} />
        <AmbientPerson position={[2.5, 0, 5.8]} color="#60a060" rot={3.0} />
      </group>

      {/* ═══ UNIVERSITY — with botanical garden in front ═══ */}
      <group position={[-62, 0, -20]}>
        {/* Main university building — L-shape */}
        <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[10, 6, 7]} />
          <meshStandardMaterial color="#c8c0b0" roughness={0.8} />
        </mesh>
        {/* Wing */}
        <mesh position={[7, 2.5, -1]} castShadow>
          <boxGeometry args={[5, 5, 5]} />
          <meshStandardMaterial color="#c0b8a8" roughness={0.8} />
        </mesh>
        {/* Windows — front */}
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <mesh key={`uw${row}${col}`} position={[(col - 2) * 1.8, 1.5 + row * 1.6, 3.52]}>
              <planeGeometry args={[0.8, 1.0]} />
              <meshStandardMaterial color="#5898b8" metalness={0.4} roughness={0.2} />
            </mesh>
          ))
        )}
        {/* Entrance — grand columns */}
        {[-1.2, 0, 1.2].map((col) => (
          <mesh key={`uc${col}`} position={[col, 2.5, 3.8]}>
            <cylinderGeometry args={[0.15, 0.18, 4.5, 8]} />
            <meshStandardMaterial color="#d8d0c0" />
          </mesh>
        ))}
        {/* Pediment (triangle above entrance) */}
        <mesh position={[0, 5.2, 3.6]} rotation={[0, 0, 0]} castShadow>
          <coneGeometry args={[2.5, 1.2, 3]} />
          <meshStandardMaterial color="#c8c0b0" roughness={0.8} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 6.1, 0]} castShadow>
          <boxGeometry args={[10.4, 0.2, 7.4]} />
          <meshStandardMaterial color="#505858" />
        </mesh>
        {/* University sign */}
        <mesh position={[0, 4.8, 3.53]}>
          <planeGeometry args={[5, 0.5]} />
          <meshStandardMaterial color="#2858a0" emissive="#1848a0" emissiveIntensity={0.3} />
        </mesh>

        {/* ── Botanical Garden in front ── */}
        {/* Green lawn */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 10]}>
          <planeGeometry args={[16, 10]} />
          <meshStandardMaterial color="#2a7a22" roughness={0.85} />
        </mesh>
        {/* Flower beds (colorful patches) */}
        {[[-3, 8, "#c04060"], [2, 9, "#d0a030"], [-1, 12, "#6040c0"], [4, 11, "#e06030"]].map(([x, z, color], fi) => (
          <mesh key={`fb${fi}`} rotation={[-Math.PI / 2, 0, 0]} position={[x as number, -0.02, z as number]}>
            <circleGeometry args={[1.2, 8]} />
            <meshStandardMaterial color={color as string} roughness={0.9} />
          </mesh>
        ))}
        {/* Garden trees */}
        {[[-5, 8], [-2, 11], [1, 8], [4, 12], [-4, 13], [3, 9], [6, 11], [-6, 10]].map(([x, z], ti) => (
          <ParkTree key={`gt${ti}`} position={[x, 0, z]} scale={0.7 + (ti % 3) * 0.15} />
        ))}
        {/* Garden path */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 10]}>
          <planeGeometry args={[1, 9]} />
          <meshStandardMaterial color="#8a8880" roughness={0.9} />
        </mesh>
        {/* Garden fountain */}
        <group position={[0, 0, 10]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[1.5, 1.8, 0.4, 16]} />
            <meshStandardMaterial color="#808880" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[1.2, 1.3, 0.15, 16]} />
            <meshStandardMaterial color="#3868a0" metalness={0.5} roughness={0.15} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.5, 8]} />
            <meshStandardMaterial color="#909890" />
          </mesh>
        </group>
        {/* Students */}
        <AmbientPerson position={[-3, 0, 7]} color="#4070b0" rot={1.2} />
        <AmbientPerson position={[2, 0, 7.5]} color="#b04050" rot={2.5} />
        <AmbientPerson position={[0, 0, 12]} color="#50a060" rot={0.8} />
        <AmbientPerson position={[-5, 0, 11]} color="#a06080" rot={4.0} />
      </group>

      {/* ═══ CLOCK TOWER — city center landmark ═══ */}
      <group position={[0, 0, -8]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[2, 8, 2]} />
          <meshStandardMaterial color="#c8b898" roughness={0.8} />
        </mesh>
        <mesh position={[0, 8.5, 0]} castShadow>
          <coneGeometry args={[1.8, 2.5, 4]} />
          <meshStandardMaterial color="#505858" roughness={0.8} />
        </mesh>
        {/* Clock face */}
        <mesh position={[0, 6.5, 1.02]}>
          <circleGeometry args={[0.6, 16]} />
          <meshStandardMaterial color="#f0f0e8" />
        </mesh>
        <mesh position={[0, 6.5, 1.03]}>
          <circleGeometry args={[0.65, 16]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      </group>

      {/* ═══ WATER TOWER — industrial area near Stormridge ═══ */}
      <group position={[24, 0, -52]}>
        {/* Legs */}
        {[-1, 1].map((x) => [-1, 1].map((z) => (
          <mesh key={`wt${x}${z}`} position={[x * 1.2, 3, z * 1.2]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 6, 6]} />
            <meshStandardMaterial color="#606868" metalness={0.3} />
          </mesh>
        )))}
        {/* Tank */}
        <mesh position={[0, 6.5, 0]} castShadow>
          <cylinderGeometry args={[2.5, 2, 3, 16]} />
          <meshStandardMaterial color="#708090" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 8.1, 0]} castShadow>
          <coneGeometry args={[2.5, 1, 16]} />
          <meshStandardMaterial color="#606870" metalness={0.3} />
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
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], -0.15, pos[1]]}>
          <circleGeometry args={[5, 20]} />
          <meshStandardMaterial color="#8a8a88" roughness={0.95} transparent opacity={0.4} polygonOffset polygonOffsetFactor={-2} />
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
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.6, 0.06, 0.9]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[-0.65, 0.25, 0]}><boxGeometry args={[0.06, 0.5, 0.06]} /><meshStandardMaterial color="#606060" /></mesh>
          <mesh position={[0.65, 0.25, 0]}><boxGeometry args={[0.06, 0.5, 0.06]} /><meshStandardMaterial color="#606060" /></mesh>
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

  const poleRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);
  const count = positions.length;

  const [poleGeo, poleMat, bulbGeo, bulbMat] = useMemo(() => [
    new THREE.CylinderGeometry(0.05, 0.08, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: "#404040", metalness: 0.5, roughness: 0.5 }),
    new THREE.SphereGeometry(0.1, 6, 4),
    new THREE.MeshStandardMaterial({ color: "#fff8d0", emissive: new THREE.Color("#f0e0a0"), emissiveIntensity: 0.4 }),
  ], []);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const [x, z] = positions[i];
      // Pole
      dummy.position.set(x, 1.2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poleRef.current?.setMatrixAt(i, dummy.matrix);
      // Bulb
      dummy.position.set(x + 0.5, 2.4, z);
      dummy.updateMatrix();
      bulbRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (poleRef.current) poleRef.current.instanceMatrix.needsUpdate = true;
    if (bulbRef.current) bulbRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, count]);

  return (
    <group>
      <instancedMesh ref={poleRef} args={[poleGeo, poleMat, count]} castShadow />
      <instancedMesh ref={bulbRef} args={[bulbGeo, bulbMat, count]} />
    </group>
  );
}

// ─── Ambient life ────────────────────────────────────────────────

function AmbientPerson({ position, color, rot = 0 }: { position: [number, number, number]; color: string; rot?: number }) {
  // Simplified: 2 meshes (body + head) on all platforms
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.5}>
      <mesh position={[0, 0.6, 0]} castShadow><capsuleGeometry args={[0.18, 0.45, 3, 4]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.16, 5, 4]} /><meshStandardMaterial color="#e8c8a0" /></mesh>
    </group>
  );
}

function AmbientDog({ position, color = "#a07040", rot = 0 }: { position: [number, number, number]; color?: string; rot?: number }) {
  // Simplified: 2 meshes (body + head) on all platforms
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.2}>
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.14, 0.4, 3, 4]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.35, 0.32, 0]}><sphereGeometry args={[0.13, 4, 3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function AmbientCat({ position, color = "#404040", rot = 0 }: { position: [number, number, number]; color?: string; rot?: number }) {
  // Simplified: 2 meshes (body + head) on all platforms
  return (
    <group position={position} rotation={[0, rot, 0]} scale={2.2}>
      <mesh position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.09, 0.22, 3, 3]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.22, 0.24, 0]}><sphereGeometry args={[0.1, 4, 3]} /><meshStandardMaterial color={color} /></mesh>
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
  // Procedurally place many people along streets
  const people = useMemo(() => {
    const rng = seededRng(555);
    const colors = ["#4070b0", "#b04050", "#50a060", "#8060a0", "#c0a030", "#6060c0", "#c06060",
      "#a06080", "#508080", "#6080a0", "#a08050", "#609060", "#c07050", "#5080b0", "#b06040",
      "#706080", "#80a0b0", "#4090a0", "#a07050", "#907040", "#608090", "#a060a0", "#60b060"];
    const result: { x: number; z: number; color: string; rot: number }[] = [];

    const step = 6;
    // Scatter along main avenues
    for (const ave of MAIN_AVENUES) {
      for (let x = ave.x1 + 5; x < ave.x2 - 5; x += step + rng() * step) {
        const side = rng() < 0.5 ? 4.5 : -4.5;
        result.push({ x, z: ave.z + side + (rng() - 0.5) * 1.5, color: colors[Math.floor(rng() * colors.length)], rot: rng() * Math.PI * 2 });
      }
    }
    // Scatter in districts
    const hubs = [
      { cx: 30, cz: 26, r: 8, count: 6 },  // market
      { cx: -50, cz: 36, r: 6, count: 5 },  // school
      { cx: 20, cz: -4, r: 10, count: 8 },  // civic
      { cx: -20, cz: -18, r: 6, count: 4 },  // homes
      { cx: 42, cz: -30, r: 6, count: 4 },  // zoo
      { cx: -34, cz: -38, r: 5, count: 3 },  // hospital
      { cx: -36, cz: 4, r: 6, count: 4 },   // colortown
      { cx: 10, cz: -50, r: 5, count: 3 },  // stormridge
      { cx: 0, cz: 8, r: 5, count: 4 },     // central park
      { cx: -10, cz: 36, r: 6, count: 3 },  // near school/mall
    ];
    for (const hub of hubs) {
      for (let i = 0; i < hub.count; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = rng() * hub.r;
        result.push({
          x: hub.cx + Math.cos(angle) * dist,
          z: hub.cz + Math.sin(angle) * dist,
          color: colors[Math.floor(rng() * colors.length)],
          rot: rng() * Math.PI * 2,
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {/* Procedural people */}
      {people.map((p, i) => (
        <AmbientPerson key={`p${i}`} position={[p.x, 0, p.z]} color={p.color} rot={p.rot} />
      ))}

      {/* Dogs — scattered around */}
      <AmbientDog position={[-22, 0, -14]} color="#a07040" rot={2.0} />
      <AmbientDog position={[36, 0, 22]} color="#c09050" rot={0.7} />
      <AmbientDog position={[-46, 0, 36]} color="#806030" rot={4.5} />
      <AmbientDog position={[16, 0, 8]} color="#e0c080" rot={3.2} />
      <AmbientDog position={[-14, 0, -22]} color="#505050" rot={1.1} />
      <AmbientDog position={[8, 0, 38]} color="#a08040" rot={0.5} />
      <AmbientDog position={[-40, 0, -2]} color="#c0a060" rot={3.8} />
      <AmbientDog position={[50, 0, -28]} color="#806040" rot={1.8} />

      {/* Cats */}
      <AmbientCat position={[-38, 0, 6]} color="#404040" rot={1.5} />
      <AmbientCat position={[48, 0, -18]} color="#c08040" rot={3.2} />
      <AmbientCat position={[-60, 0, 20]} color="#303030" rot={0.4} />
      <AmbientCat position={[12, 0, -12]} color="#e0a040" rot={2.8} />
      <AmbientCat position={[-28, 0, 40]} color="#606060" rot={5.2} />

      {/* Birds — scattered groups */}
      {[
        [32, 28], [33, 29], [31, 27.5], [-7, 9], [-8.5, 7.5],
        [-48, 35], [-47, 36], [15, -5], [16, -4], [-30, -1],
        [42, -29], [43, -28], [-34, -37], [25, 42], [26, 43],
      ].map(([x, z], i) => (
        <AmbientBird key={`b${i}`} position={[x, 0.01, z]} rot={i * 1.3} />
      ))}
      <AmbientBird position={[20, 5, -6]} rot={2.0} />
      <AmbientBird position={[-30, 4, 2]} rot={5.0} />
      <AmbientBird position={[5, 6, -3]} rot={1.2} />
      <AmbientBird position={[-15, 4, -10]} rot={3.5} />
    </group>
  );
}

// ─── Cars on streets ─────────────────────────────────────────────

function Car({ position, color, rot = 0 }: { position: [number, number, number]; color: string; rot?: number }) {
  if (IS_MOBILE) {
    return (
      <group position={position} rotation={[0, rot, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[2.2, 0.5, 1.1]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.5} /></mesh>
        <mesh position={[0.05, 0.65, 0]}><boxGeometry args={[1.2, 0.35, 0.95]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.5} /></mesh>
        {[[-0.6, 0.55], [-0.6, -0.55], [0.6, 0.55], [0.6, -0.55]].map(([ox, oz], i) => (
          <mesh key={i} position={[ox, 0.1, oz]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.08, 6]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        ))}
      </group>
    );
  }
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {/* Main body — lower chassis */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[2.4, 0.28, 1.15]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Body curve — slightly wider at bottom */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 1.1]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Cabin — tapered windshield shape */}
      <mesh position={[0.05, 0.58, 0]} castShadow>
        <boxGeometry args={[1.15, 0.35, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Windshield front (angled) */}
      <mesh position={[0.66, 0.58, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.4, 0.32, 0.92]} />
        <meshStandardMaterial color="#6ab8d8" metalness={0.5} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Rear windshield */}
      <mesh position={[-0.58, 0.58, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.3, 0.3, 0.9]} />
        <meshStandardMaterial color="#6ab8d8" metalness={0.5} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Side windows */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.05, 0.6, side * 0.505]}>
          <boxGeometry args={[1.0, 0.25, 0.02]} />
          <meshStandardMaterial color="#6ab8d8" metalness={0.5} roughness={0.1} transparent opacity={0.65} />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0.05, 0.78, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.98]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Front bumper */}
      <mesh position={[1.22, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.14, 1.05]} />
        <meshStandardMaterial color="#333" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Rear bumper */}
      <mesh position={[-1.22, 0.20, 0]}>
        <boxGeometry args={[0.08, 0.14, 1.05]} />
        <meshStandardMaterial color="#333" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Headlights */}
      {[-1, 1].map((side) => (
        <mesh key={`hl${side}`} position={[1.2, 0.3, side * 0.4]}>
          <boxGeometry args={[0.06, 0.08, 0.2]} />
          <meshStandardMaterial color="#f0e8a0" emissive="#f0e080" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Tail lights */}
      {[-1, 1].map((side) => (
        <mesh key={`tl${side}`} position={[-1.2, 0.3, side * 0.4]}>
          <boxGeometry args={[0.06, 0.08, 0.16]} />
          <meshStandardMaterial color="#c03030" emissive="#a02020" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* Side mirrors */}
      {[-1, 1].map((side) => (
        <mesh key={`sm${side}`} position={[0.5, 0.52, side * 0.62]}>
          <boxGeometry args={[0.08, 0.06, 0.05]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {/* Wheels with hubs */}
      {[[-0.7, 0.6], [-0.7, -0.6], [0.7, 0.6], [0.7, -0.6]].map(([ox, oz], i) => (
        <group key={i} position={[ox, 0.1, oz]}>
          {/* Tire */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.1, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          {/* Hub cap */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, oz > 0 ? 0.052 : -0.052]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 8]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Undercarriage shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 1.0]} />
        <meshBasicMaterial color="#000" transparent opacity={0.15} />
      </mesh>
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
                ? "radial-gradient(circle at 35% 35%, #f0f0ee, #d0d0cc)"
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
            <span style={{ fontSize: 10, color: "#a0a0a0", fontWeight: 700 }}>⭐ {city.requiredXP}</span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Future locked location markers (BIGGER) ────────────────────


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
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  // Only show Land world cities on this map
  const landTopicIds = WORLDS.find((w) => w.id === "land")?.topicIds ?? [];
  const landCities = useMemo(() => CITIES.filter((c) => landTopicIds.includes(c.topicId)), []);

  const unlockedIds = useMemo(
    () => new Set(landCities.map((c) => c.id)), // TODO: restore unlock: .filter((c) => totalPoints >= c.requiredXP)
    [landCities]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...landCities].reverse().find(
      (c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3
    );
    const firstLocked = landCities.find((c) => !unlockedIds.has(c.id));
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
        shadows={!IS_MOBILE}
        camera={{ position: IS_MOBILE ? [0, 65, 48] : [0, 55, 40], fov: IS_MOBILE ? 52 : 45 }}
        style={{ touchAction: "none" }}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
      >
        <PerformanceMonitor onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)} onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)} />

        {/* Sky — skip on mobile (heavy shader) */}
        {!IS_MOBILE && <Sky sunPosition={[80, 40, 30]} turbidity={2} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />}
        {IS_MOBILE && <color attach="background" args={["#8ab0c8"]} />}
        {!IS_MOBILE && <fog attach="fog" args={["#8aa8c0", 100, 200]} />}

        {/* Lighting — simplified on mobile */}
        <ambientLight intensity={IS_MOBILE ? 0.7 : 0.65} color="#e8e0d8" />
        {IS_MOBILE ? (
          <directionalLight position={[40, 60, 25]} intensity={1.3} color="#fff0c0" />
        ) : (
          <directionalLight
            position={[40, 60, 25]}
            intensity={1.5}
            color="#fff0c0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-90}
            shadow-camera-right={90}
            shadow-camera-top={70}
            shadow-camera-bottom={-70}
            shadow-camera-near={1}
            shadow-camera-far={200}
            shadow-bias={-0.0005}
          />
        )}
        {!IS_MOBILE && <directionalLight position={[-30, 20, -40]} intensity={0.2} color="#6090c0" />}
        <hemisphereLight intensity={0.4} color="#87ceeb" groundColor="#c0a880" />

        <Suspense fallback={null}>
          <Ground />
          <Streets />
          <CityRoads unlockedIds={unlockedIds} cities={landCities} />
          <Plazas />
          <CityBlocks />
          {IS_MOBILE && <MobileGreenery />}
          {!IS_MOBILE && <>
            <Lake />
            <Landmarks />
            <Parks />
            <MarketStalls />
            <Lamps />
            <AmbientLife />
            <Cars />
            <Clouds />
          </>}

          {landCities.map((city) => (
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


          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        <CameraControls />

        {/* Post-processing disabled — causes hook error with React 19 */}
      </Canvas>

      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1a2a3a] via-[#2a4a6a] to-[#1a2a3a] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            {/* Animated globe */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌍
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">Exploring the world...</p>
            {/* Loading dots */}
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
