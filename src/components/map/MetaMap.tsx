"use client";

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

const metaWorld = WORLDS.find((w) => w.id === "meta")!;
const META_CITIES = CITIES.filter((c) =>
  metaWorld.topicIds.includes(c.topicId)
);

// ─── City positions ──────────────────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ui-world":       [0, 0, 0],
  "game-world":     [18, 2, -14],
  "code-world":     [-18, 3, -12],
  "internet-hub":   [22, 0, 8],
  "social-media":   [-20, -1, 10],
  "ai-hub":         [12, 4, 18],
  "music-studio":   [-12, 1, 20],
  "movie-set":      [0, -2, 26],
};

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [(city.pos.x - 50) * 1.2, 0, (city.pos.y - 50) * 1.2];
}

// ─── Seeded random ──────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Zone configs ────────────────────────────────────────────────
interface ZoneConfig {
  lightColor: string;
  lightIntensity: number;
}

const ZONE_CONFIG: Record<string, ZoneConfig> = {
  "ui-world":       { lightColor: "#7B68EE", lightIntensity: 1.2 },
  "game-world":     { lightColor: "#FF6B6B", lightIntensity: 1.0 },
  "code-world":     { lightColor: "#00FF41", lightIntensity: 0.8 },
  "internet-hub":   { lightColor: "#4FC3F7", lightIntensity: 1.0 },
  "social-media":   { lightColor: "#FF69B4", lightIntensity: 1.0 },
  "ai-hub":         { lightColor: "#CE93D8", lightIntensity: 1.3 },
  "music-studio":   { lightColor: "#FF9800", lightIntensity: 1.0 },
  "movie-set":      { lightColor: "#FFD700", lightIntensity: 1.1 },
};

// ─── Route connections ───────────────────────────────────────────
const ROUTES: [string, string][] = [
  ["ui-world", "game-world"],
  ["ui-world", "code-world"],
  ["ui-world", "internet-hub"],
  ["ui-world", "social-media"],
  ["ui-world", "ai-hub"],
  ["ui-world", "music-studio"],
  ["ui-world", "movie-set"],
  ["game-world", "code-world"],
  ["internet-hub", "social-media"],
  ["ai-hub", "movie-set"],
  ["music-studio", "movie-set"],
];

// ─── Gradient Route Lines ────────────────────────────────────────
function GradientRoutes({ isMobile }: { isMobile: boolean }) {
  const linesRef = useRef<THREE.Group>(null!);

  const lineData = useMemo(() => {
    return ROUTES.map(([fromId, toId]) => {
      const from = CITY_POSITIONS[fromId] ?? [0, 0, 0];
      const to = CITY_POSITIONS[toId] ?? [0, 0, 0];
      const segments = isMobile ? 8 : 16;
      const positions = new Float32Array((segments + 1) * 3);
      const colors = new Float32Array((segments + 1) * 3);
      const fromColor = new THREE.Color(ZONE_CONFIG[fromId]?.lightColor ?? "#ffffff");
      const toColor = new THREE.Color(ZONE_CONFIG[toId]?.lightColor ?? "#ffffff");

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        positions[i * 3] = from[0] + (to[0] - from[0]) * t;
        positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 1.5;
        positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
        const c = new THREE.Color().lerpColors(fromColor, toColor, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      return { positions, colors };
    });
  }, [isMobile]);

  useFrame(({ clock }) => {
    if (!linesRef.current) return;
    const t = clock.getElapsedTime();
    linesRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      if (line.material && "opacity" in line.material) {
        (line.material as THREE.LineBasicMaterial).opacity = 0.3 + Math.sin(t * 0.5) * 0.15;
      }
    });
  });

  return (
    <group ref={linesRef}>
      {lineData.map((data, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[data.positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[data.colors, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial vertexColors transparent opacity={0.4} linewidth={1} />
        </line>
      ))}
    </group>
  );
}

// ─── UI World Zone (center) ──────────────────────────────────────
function UIWorldZone({ pos }: { pos: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);

  // Floating UI panels
  const panels = useMemo(() => [
    { p: [0, 3, 0] as const, r: [0.2, 0.3, 0] as const, s: [2.5, 1.5, 0.05] as const, c: "#4a6cf7" },
    { p: [-1.5, 4.5, 1] as const, r: [-0.1, -0.4, 0.15] as const, s: [2, 1.2, 0.05] as const, c: "#7B68EE" },
    { p: [1.8, 2.5, -1] as const, r: [0.1, 0.5, -0.1] as const, s: [1.8, 1, 0.05] as const, c: "#6C5CE7" },
    { p: [0.5, 5.5, 0.5] as const, r: [-0.15, 0.2, 0.05] as const, s: [1.5, 0.8, 0.05] as const, c: "#5B86E5" },
    { p: [-2, 3.5, -0.5] as const, r: [0.05, -0.6, 0.1] as const, s: [1.2, 0.7, 0.05] as const, c: "#8B5CF6" },
  ], []);

  // Menu buttons
  const buttons = useMemo(() => [
    { p: [0.8, 3.2, 0.1] as const, c: "#FF6B6B" },
    { p: [1.2, 3.2, 0.1] as const, c: "#4ADE80" },
    { p: [1.6, 3.2, 0.1] as const, c: "#FBBF24" },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (i < panels.length) {
        child.position.y = panels[i].p[1] + Math.sin(t * 0.5 + i * 1.2) * 0.3;
        child.rotation.y = panels[i].r[1] + Math.sin(t * 0.2 + i * 0.8) * 0.08;
        child.rotation.z = panels[i].r[2] + Math.sin(t * 0.3 + i) * 0.05;
        // Opacity variation
        const mesh = child as THREE.Mesh;
        if (mesh.material && "opacity" in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 0.6 + i * 1.5) * 0.15;
        }
      }
    });
  });

  return (
    <group position={pos}>
      <group ref={groupRef}>
        {panels.map((panel, i) => (
          <mesh key={i} position={[panel.p[0], panel.p[1], panel.p[2]]} rotation={[panel.r[0], panel.r[1], panel.r[2]]}>
            <boxGeometry args={[panel.s[0], panel.s[1], panel.s[2]]} />
            <meshStandardMaterial color={panel.c} emissive={panel.c} emissiveIntensity={0.5} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      {/* Cursor arrow */}
      <mesh position={[2.5, 4, 1.5]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.4, 1.2, 3]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      {/* Menu buttons */}
      {buttons.map((btn, i) => (
        <mesh key={i} position={[btn.p[0], btn.p[1], btn.p[2]]}>
          <boxGeometry args={[0.25, 0.15, 0.05]} />
          <meshStandardMaterial color={btn.c} emissive={btn.c} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Game World Zone ─────────────────────────────────────────────
function GameWorldZone({ pos }: { pos: [number, number, number] }) {
  const controllerRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!controllerRef.current) return;
    const t = clock.getElapsedTime();
    controllerRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
    controllerRef.current.position.y = pos[1] + 2.5 + Math.sin(t * 0.6) * 0.3;
  });

  return (
    <group position={pos}>
      {/* Game controller */}
      <group ref={controllerRef}>
        {/* Body */}
        <mesh>
          <boxGeometry args={[2.5, 0.6, 1.5]} />
          <meshStandardMaterial color="#2D2D2D" />
        </mesh>
        {/* A/B buttons */}
        <mesh position={[0.6, 0.35, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#FF4444" emissive="#FF4444" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.9, 0.35, 0.3]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#44FF44" emissive="#44FF44" emissiveIntensity={0.6} />
        </mesh>
        {/* D-pad cross */}
        <mesh position={[-0.6, 0.35, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.15]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[-0.6, 0.35, 0]}>
          <boxGeometry args={[0.15, 0.1, 0.6]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      </group>
      {/* Pixel heart */}
      <mesh position={[-1.5, 4, 1]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#FF2222" emissive="#FF2222" emissiveIntensity={0.7} />
      </mesh>
      {/* 1UP text — simple emissive box */}
      <mesh position={[1.5, 5, -1]}>
        <boxGeometry args={[1.2, 0.5, 0.08]} />
        <meshStandardMaterial color="#00FF00" emissive="#00FF00" emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

// ─── Code World Zone ─────────────────────────────────────────────
function CodeWorldZone({ pos, isMobile }: { pos: [number, number, number]; isMobile: boolean }) {
  const bracketsRef = useRef<THREE.Group>(null!);
  const matrixRef = useRef<THREE.Points>(null!);

  // Floating bracket symbols
  const brackets = useMemo(() => [
    { p: [-1.5, 3, 0] as const, char: "{", s: [0.15, 1.2, 0.8] as const },
    { p: [1.5, 3.5, 0.5] as const, char: "}", s: [0.15, 1.2, 0.8] as const },
    { p: [0, 4.5, -1] as const, char: "<", s: [0.8, 0.8, 0.1] as const },
    { p: [0.8, 2.5, 1] as const, char: ">", s: [0.8, 0.8, 0.1] as const },
    { p: [-0.5, 5, 0] as const, char: "=", s: [0.8, 0.3, 0.1] as const },
  ], []);

  // Matrix rain particles
  const matrixCount = isMobile ? 30 : 80;
  const { matrixPositions, matrixVelocities } = useMemo(() => {
    const rng = seededRandom(42);
    const p = new Float32Array(matrixCount * 3);
    const v = new Float32Array(matrixCount);
    for (let i = 0; i < matrixCount; i++) {
      // Arrange in columns
      const col = Math.floor(i / (matrixCount / 8));
      p[i * 3] = (col - 4) * 0.8;
      p[i * 3 + 1] = rng() * 8;
      p[i * 3 + 2] = (rng() - 0.5) * 4;
      v[i] = 0.02 + rng() * 0.03;
    }
    return { matrixPositions: p, matrixVelocities: v };
  }, [matrixCount]);

  useFrame(({ clock }) => {
    if (bracketsRef.current) {
      const t = clock.getElapsedTime();
      bracketsRef.current.children.forEach((child, i) => {
        child.position.y = brackets[i].p[1] + Math.sin(t * 0.4 + i * 1.5) * 0.4;
        child.rotation.y = Math.sin(t * 0.2 + i) * 0.2;
      });
    }
    if (matrixRef.current) {
      const positions = matrixRef.current.geometry.attributes.position;
      const arr = positions.array as Float32Array;
      for (let i = 0; i < matrixCount; i++) {
        arr[i * 3 + 1] -= matrixVelocities[i];
        if (arr[i * 3 + 1] < -1) arr[i * 3 + 1] = 8;
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <group position={pos}>
      {/* Terminal background */}
      <mesh position={[0, 3, -2]}>
        <boxGeometry args={[5, 4, 0.1]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.7} />
      </mesh>
      {/* Brackets */}
      <group ref={bracketsRef}>
        {brackets.map((b, i) => (
          <mesh key={i} position={[b.p[0], b.p[1], b.p[2]]}>
            <boxGeometry args={[b.s[0], b.s[1], b.s[2]]} />
            <meshStandardMaterial color="#00FF41" emissive="#00FF41" emissiveIntensity={0.9} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
      {/* Matrix rain */}
      <points ref={matrixRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[matrixPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#00FF41" size={0.12} transparent opacity={0.7} sizeAttenuation />
      </points>
    </group>
  );
}

// ─── Internet Hub Zone ───────────────────────────────────────────
function InternetHubZone({ pos }: { pos: [number, number, number] }) {
  const globeRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
  });

  // Connection lines radiating from globe
  const connectionLines = useMemo(() => {
    const rng = seededRandom(77);
    const lines: { to: [number, number, number] }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 2.5 + rng() * 1.5;
      lines.push({
        to: [Math.cos(angle) * r, 3 + (rng() - 0.5) * 2, Math.sin(angle) * r],
      });
    }
    return lines;
  }, []);

  return (
    <group position={pos}>
      {/* Globe wireframe */}
      <mesh ref={globeRef} position={[0, 3.5, 0]}>
        <sphereGeometry args={[1.8, 16, 12]} />
        <meshStandardMaterial color="#4FC3F7" wireframe emissive="#4FC3F7" emissiveIntensity={0.5} />
      </mesh>
      {/* Connection lines */}
      {connectionLines.map((line, i) => {
        const positions = new Float32Array([0, 3.5, 0, line.to[0], line.to[1], line.to[2]]);
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#4FC3F7" transparent opacity={0.5} />
          </line>
        );
      })}
      {/* Browser window */}
      <mesh position={[3, 4, -1]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[2, 1.4, 0.06]} />
        <meshStandardMaterial color="#1a2a3a" />
      </mesh>
      <mesh position={[3, 4.6, -0.95]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[2, 0.15, 0.07]} />
        <meshStandardMaterial color="#4FC3F7" emissive="#4FC3F7" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ─── Social Media Zone ───────────────────────────────────────────
function SocialMediaZone({ pos }: { pos: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);

  // Notification badges
  const badges = useMemo(() => [
    { p: [2, 5.5, 1] as const, c: "#FF3B30" },
    { p: [-1.5, 6, -0.5] as const, c: "#FF9500" },
    { p: [0.5, 5, 2] as const, c: "#34C759" },
    { p: [-2, 4.5, 1.5] as const, c: "#5856D6" },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Animate notification badges floating
    const children = groupRef.current.children;
    for (let i = 0; i < badges.length; i++) {
      const child = children[i];
      if (child) {
        child.position.y = badges[i].p[1] + Math.sin(t * 0.8 + i * 1.5) * 0.4;
      }
    }
  });

  return (
    <group position={pos}>
      {/* Like button — thumb up: cylinder base + small box */}
      <group position={[0, 3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 1.5, 12]} />
          <meshStandardMaterial color="#1877F2" emissive="#1877F2" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 0.2]}>
          <boxGeometry args={[0.5, 0.4, 0.4]} />
          <meshStandardMaterial color="#1877F2" emissive="#1877F2" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {/* Heart shape — two spheres + cone */}
      <group position={[-2, 4, -1]}>
        <mesh position={[-0.25, 0.2, 0]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color="#FF69B4" emissive="#FF69B4" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0.25, 0.2, 0]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color="#FF69B4" emissive="#FF69B4" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0, -0.25, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.5, 0.6, 4]} />
          <meshStandardMaterial color="#FF69B4" emissive="#FF69B4" emissiveIntensity={0.7} />
        </mesh>
      </group>
      {/* Photo frame */}
      <mesh position={[2, 3.5, 1]} rotation={[0, -0.4, 0.1]}>
        <boxGeometry args={[1.5, 1.2, 0.06]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[2, 3.5, 1.04]} rotation={[0, -0.4, 0.1]}>
        <boxGeometry args={[1.2, 0.9, 0.02]} />
        <meshStandardMaterial color="#8B5CF6" emissive="#8B5CF6" emissiveIntensity={0.3} />
      </mesh>
      {/* Notification badges */}
      <group ref={groupRef}>
        {badges.map((b, i) => (
          <mesh key={i} position={[b.p[0], b.p[1], b.p[2]]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={b.c} emissive={b.c} emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── AI Hub Zone ─────────────────────────────────────────────────
function AIHubZone({ pos }: { pos: [number, number, number] }) {
  const networkRef = useRef<THREE.Group>(null!);

  // Neural network nodes
  const nodes = useMemo(() => {
    const rng = seededRandom(99);
    const n: [number, number, number][] = [];
    for (let i = 0; i < 10; i++) {
      n.push([
        (rng() - 0.5) * 4,
        2 + rng() * 4,
        (rng() - 0.5) * 4,
      ]);
    }
    return n;
  }, []);

  // Connections between close nodes
  const connections = useMemo(() => {
    const conns: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i][0] - nodes[j][0];
        const dy = nodes[i][1] - nodes[j][1];
        const dz = nodes[i][2] - nodes[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 4) conns.push([i, j]);
      }
    }
    return conns;
  }, [nodes]);

  useFrame(({ clock }) => {
    if (!networkRef.current) return;
    const t = clock.getElapsedTime();
    // Pulse the neural nodes
    networkRef.current.children.forEach((child, i) => {
      if (i < nodes.length && child instanceof THREE.Mesh) {
        const scale = 1 + Math.sin(t * 2 + i * 0.7) * 0.08;
        child.scale.setScalar(scale);
      }
    });
  });

  return (
    <group position={pos}>
      {/* Brain sphere hint */}
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[1.8, 12, 10]} />
        <meshStandardMaterial
          color="#9C27B0"
          emissive="#CE93D8"
          emissiveIntensity={0.4}
          transparent
          opacity={0.25}
          wireframe
        />
      </mesh>
      {/* Neural network nodes */}
      <group ref={networkRef}>
        {nodes.map((n, i) => (
          <mesh key={i} position={n}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#CE93D8" emissive="#CE93D8" emissiveIntensity={1.0} />
          </mesh>
        ))}
      </group>
      {/* Neural connections */}
      {connections.map(([a, b], i) => {
        const positions = new Float32Array([
          nodes[a][0], nodes[a][1], nodes[a][2],
          nodes[b][0], nodes[b][1], nodes[b][2],
        ]);
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#CE93D8" transparent opacity={0.4} />
          </line>
        );
      })}
    </group>
  );
}

// ─── Music Studio Zone ───────────────────────────────────────────
function MusicStudioZone({ pos, isMobile }: { pos: [number, number, number]; isMobile: boolean }) {
  const barsRef = useRef<THREE.Group>(null!);

  // Equalizer bars
  const barCount = 7;
  const barPositions = useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      bars.push(-1.8 + i * 0.6);
    }
    return bars;
  }, []);

  useFrame(({ clock }) => {
    if (!barsRef.current || isMobile) return;
    const t = clock.getElapsedTime();
    barsRef.current.children.forEach((child, i) => {
      const height = 1 + Math.abs(Math.sin(t * 3 + i * 0.9)) * 2;
      child.scale.y = height;
      child.position.y = 2 + height * 0.15;
    });
  });

  return (
    <group position={pos}>
      {/* Equalizer bars */}
      <group ref={barsRef}>
        {barPositions.map((x, i) => {
          const baseHeight = 1 + (i % 3) * 0.5;
          return (
            <mesh key={i} position={[x, 2 + baseHeight * 0.15, 0]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#FF9800" : "#9C27B0"}
                emissive={i % 2 === 0 ? "#FF9800" : "#9C27B0"}
                emissiveIntensity={0.7}
              />
            </mesh>
          );
        })}
      </group>
      {/* Headphones — torus + earpieces */}
      <group position={[2, 4, 1]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.6, 0.08, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        <mesh position={[-0.6, 0, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#FF9800" emissive="#FF9800" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.6, 0, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#FF9800" emissive="#FF9800" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Musical note */}
      <group position={[-2, 4.5, -1]}>
        <mesh>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#9C27B0" emissive="#9C27B0" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.12, 0.7, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
          <meshStandardMaterial color="#9C27B0" emissive="#9C27B0" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Movie Set Zone ──────────────────────────────────────────────
function MovieSetZone({ pos }: { pos: [number, number, number] }) {
  const spotlightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (spotlightRef.current) {
      const t = clock.getElapsedTime();
      spotlightRef.current.rotation.z = Math.sin(t * 0.4) * 0.15;
    }
  });

  return (
    <group position={pos}>
      {/* Camera body */}
      <group position={[0, 3, 0]}>
        <mesh>
          <boxGeometry args={[1, 0.8, 0.7]} />
          <meshStandardMaterial color="#2D2D2D" />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 0.4, 12]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        {/* Tripod legs */}
        <mesh position={[-0.3, -1, 0]} rotation={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0.3, -1, 0]} rotation={[0, 0, -0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0, -1, -0.3]} rotation={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      </group>
      {/* Clapperboard */}
      <mesh position={[-2.5, 3, 1]} rotation={[0, 0.3, 0.1]}>
        <boxGeometry args={[1.2, 0.8, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-2.5, 3.45, 1]} rotation={[0, 0.3, 0.25]}>
        <boxGeometry args={[1.2, 0.15, 0.06]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Film reel */}
      <mesh position={[2.5, 4, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.12, 8, 20]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Spotlight beam */}
      <mesh ref={spotlightRef} position={[0, 6, -2]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[1.5, 4, 12]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── Abstract Floating Shapes (key Meta feel) ────────────────────
function FloatingShapes({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const count = isMobile ? 8 : 18;

  const shapes = useMemo(() => {
    const rng = seededRandom(123);
    const result: {
      pos: [number, number, number];
      type: "box" | "sphere" | "torus" | "icosahedron";
      scale: number;
      color: string;
      speed: number;
    }[] = [];
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
      "#F1948A", "#82E0AA", "#F8C471", "#AED6F1", "#D7BDE2",
      "#A3E4D7", "#FAD7A0", "#D5F5E3",
    ];
    const types: ("box" | "sphere" | "torus" | "icosahedron")[] = ["box", "sphere", "torus", "icosahedron"];

    for (let i = 0; i < count; i++) {
      result.push({
        pos: [
          (rng() - 0.5) * 60,
          2 + rng() * 15,
          (rng() - 0.5) * 60,
        ],
        type: types[Math.floor(rng() * types.length)],
        scale: 0.3 + rng() * 0.8,
        color: colors[Math.floor(rng() * colors.length)],
        speed: 0.1 + rng() * 0.4,
      });
    }
    return result;
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const s = shapes[i];
      if (!s) return;
      child.rotation.x = t * s.speed * 0.3;
      child.rotation.y = t * s.speed * 0.5;
      child.position.y = s.pos[1] + Math.sin(t * s.speed + i) * 0.8;
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((s, i) => (
        <mesh key={i} position={s.pos} scale={s.scale}>
          {s.type === "box" && <boxGeometry args={[1, 1, 1]} />}
          {s.type === "sphere" && <sphereGeometry args={[0.6, 8, 8]} />}
          {s.type === "torus" && <torusGeometry args={[0.5, 0.2, 8, 12]} />}
          {s.type === "icosahedron" && <icosahedronGeometry args={[0.6, 0]} />}
          <meshStandardMaterial
            color={s.color}
            emissive={s.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Glitch Particles ────────────────────────────────────────────
function GlitchParticles({ isMobile }: { isMobile: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = isMobile ? 0 : 60;
  const glitchTimer = useRef(0);

  const { basePositions, colors } = useMemo(() => {
    if (count === 0) return { basePositions: new Float32Array(0), colors: [] as string[] };
    const rng = seededRandom(456);
    const positions = new Float32Array(count * 3);
    const cols: string[] = [];
    const rainbow = ["#FF0000", "#FF7700", "#FFFF00", "#00FF00", "#0077FF", "#8B00FF", "#FF00FF"];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * 70;
      positions[i * 3 + 1] = 1 + rng() * 12;
      positions[i * 3 + 2] = (rng() - 0.5) * 70;
      cols.push(rainbow[Math.floor(rng() * rainbow.length)]);
    }
    return { basePositions: positions, colors: cols };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => {
    if (count === 0) return null;
    const arr = new Float32Array(count * 3);
    colors.forEach((c, i) => {
      const col = new THREE.Color(c);
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    });
    return arr;
  }, [count, colors]);

  useFrame(({ clock }) => {
    if (!meshRef.current || count === 0) return;
    const t = clock.getElapsedTime();
    glitchTimer.current += clock.getDelta();

    const shouldGlitch = glitchTimer.current > 2.5;
    if (shouldGlitch) glitchTimer.current = 0;

    for (let i = 0; i < count; i++) {
      let x = basePositions[i * 3] + Math.sin(t * 0.1 + i) * 0.5;
      let y = basePositions[i * 3 + 1] + Math.sin(t * 0.2 + i * 0.5) * 0.3;
      let z = basePositions[i * 3 + 2] + Math.cos(t * 0.15 + i) * 0.5;

      // Glitch jump
      if (shouldGlitch && Math.random() < 0.3) {
        x += (Math.random() - 0.5) * 5;
        y += (Math.random() - 0.5) * 3;
        z += (Math.random() - 0.5) * 5;
      }

      dummy.position.set(x, y, z);
      dummy.rotation.set(t * 0.5 + i, t * 0.3, 0);
      dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        emissive="#ffffff"
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
      />
      {colorArray && (
        <instancedBufferAttribute
          attach="instanceColor"
          args={[colorArray, 3]}
        />
      )}
    </instancedMesh>
  );
}

// ─── Camera Drift ────────────────────────────────────────────────
function CameraDrift() {
  const { camera } = useThree();
  const basePos = useRef(camera.position.clone());
  const initialized = useRef(false);

  useFrame(({ clock }) => {
    if (!initialized.current) {
      basePos.current.copy(camera.position);
      initialized.current = true;
    }
    const t = clock.getElapsedTime();
    camera.position.x = basePos.current.x + Math.sin(t * 0.1) * 0.3;
    camera.position.y = basePos.current.y + Math.sin(t * 0.15) * 0.2;
    // Subtle zoom breathing
    if ("fov" in camera) {
      (camera as THREE.PerspectiveCamera).fov = 50 + Math.sin(t * 0.3) * 0.5;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Ambient Glitch Flash ────────────────────────────────────────
function GlitchFlash({ isMobile }: { isMobile: boolean }) {
  const lightRef = useRef<THREE.AmbientLight>(null!);
  const nextFlash = useRef(5);
  const flashDuration = useRef(0);

  useFrame(({ clock }) => {
    if (isMobile || !lightRef.current) return;
    const t = clock.getElapsedTime();

    // Slow hue rotation on ambient
    const hue = (t * 0.02) % 1;
    lightRef.current.color.setHSL(hue, 0.3, 0.5);

    // Random flash
    if (t > nextFlash.current) {
      flashDuration.current = 0.1;
      nextFlash.current = t + 5 + Math.random() * 3;
    }
    if (flashDuration.current > 0) {
      lightRef.current.intensity = 1.2;
      flashDuration.current -= clock.getDelta();
    } else {
      lightRef.current.intensity = 0.35;
    }
  });

  return <ambientLight ref={lightRef} intensity={0.35} color="#8866aa" />;
}

// ─── City Label ──────────────────────────────────────────────────
function CityLabel({
  city,
  pos,
  locked,
  onSelect,
  lang,
}: {
  city: City;
  pos: [number, number, number];
  locked: boolean;
  onSelect: (c: City) => void;
  lang: Language;
}) {
  return (
    <group position={pos}>
      <Html center distanceFactor={40} style={{ pointerEvents: "auto" }}>
        <div
          className="flex flex-col items-center cursor-pointer select-none"
          onClick={() => !locked && onSelect(city)}
          style={{ opacity: locked ? 0.5 : 1 }}
        >
          <div
            className="w-14 h-14 rounded-full backdrop-blur-sm border-2 flex items-center justify-center"
            style={{
              background: "rgba(15, 5, 25, 0.7)",
              borderColor: locked ? "rgba(255,255,255,0.2)" : (ZONE_CONFIG[city.id]?.lightColor ?? "#7B68EE"),
              boxShadow: locked ? "none" : `0 0 12px ${ZONE_CONFIG[city.id]?.lightColor ?? "#7B68EE"}55`,
            }}
          >
            <span className="text-2xl">{locked ? "🔒" : city.emoji}</span>
          </div>
          <div
            className="mt-1 px-2 py-0.5 rounded-lg backdrop-blur-sm"
            style={{
              background: "rgba(15, 5, 25, 0.7)",
              border: `1px solid ${locked ? "rgba(255,255,255,0.15)" : (ZONE_CONFIG[city.id]?.lightColor ?? "#7B68EE")}44`,
            }}
          >
            <p className="text-white text-[11px] font-semibold whitespace-nowrap">
              {city.name[lang] ?? city.name.en}
            </p>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Main Scene ──────────────────────────────────────────────────
function MetaScene({
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
  return (
    <>
      {/* Lighting */}
      <GlitchFlash isMobile={isMobile} />
      <directionalLight position={[10, 20, 10]} intensity={0.3} color="#ccbbff" />

      {/* Ground — invisible dark plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0d0515" transparent opacity={0.5} />
      </mesh>

      {/* Zone-specific lights */}
      {META_CITIES.map((city) => {
        const pos = getCityPos(city);
        const config = ZONE_CONFIG[city.id];
        if (!config) return null;
        return (
          <pointLight
            key={city.id}
            position={[pos[0], pos[1] + 6, pos[2]]}
            color={config.lightColor}
            intensity={config.lightIntensity}
            distance={18}
          />
        );
      })}

      {/* Routes */}
      <GradientRoutes isMobile={isMobile} />

      {/* Abstract floating shapes — KEY meta feel */}
      <FloatingShapes isMobile={isMobile} />

      {/* Glitch particles (desktop only) */}
      <GlitchParticles isMobile={isMobile} />

      {/* Camera drift */}
      {!isMobile && <CameraDrift />}

      {/* ─── Zone Props ──────────────────────────────────── */}
      <UIWorldZone pos={getCityPos({ id: "ui-world" } as City)} />
      <GameWorldZone pos={getCityPos({ id: "game-world" } as City)} />
      <CodeWorldZone pos={getCityPos({ id: "code-world" } as City)} isMobile={isMobile} />
      <InternetHubZone pos={getCityPos({ id: "internet-hub" } as City)} />
      <SocialMediaZone pos={getCityPos({ id: "social-media" } as City)} />
      <AIHubZone pos={getCityPos({ id: "ai-hub" } as City)} />
      <MusicStudioZone pos={getCityPos({ id: "music-studio" } as City)} isMobile={isMobile} />
      <MovieSetZone pos={getCityPos({ id: "movie-set" } as City)} />

      {/* ─── City Labels ─────────────────────────────────── */}
      {META_CITIES.map((city) => {
        const pos = getCityPos(city);
        const locked = totalPoints < city.requiredXP;
        return (
          <CityLabel
            key={city.id}
            city={city}
            pos={[pos[0], pos[1] + 7, pos[2]]}
            locked={locked}
            onSelect={onSelectCity}
            lang={lang}
          />
        );
      })}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────

// Mobile camera adjuster — fixes zoom on phones (runs after mount)
function MobileCameraAdjust({ pos, fov }: { pos: [number, number, number]; fov: number }) {
  const { camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const isMob = window.innerWidth < 800 || "ontouchstart" in window;
    if (isMob) {
      camera.position.set(...pos);
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
      done.current = true;
    }
  }, [camera, fov, pos]);
  return null;
}

export function MetaMap({
  onSelectCity,
}: {
  onSelectCity: (city: City) => void;
}) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div
      className="w-full h-full"
      style={{
        background:
          "linear-gradient(180deg, #0a1a20 0%, #10082a 50%, #1a0520 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: IS_MOBILE ? [0, 44, 72] : [0, 30, 50], fov: IS_MOBILE ? 58 : 50 }}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <MetaScene
          onSelectCity={onSelectCity}
          lang={lang}
          totalPoints={totalPoints}
          isMobile={IS_MOBILE}
        />
        <OrbitControls
          enablePan
          enableZoom
          minDistance={15}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
