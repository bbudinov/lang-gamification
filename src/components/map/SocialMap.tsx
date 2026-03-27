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

// ─── Social world topic ids ────────────────────────────────────
const SOCIAL_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "social")?.topicIds ?? []
);

const SOCIAL_CITIES = CITIES.filter((c) => SOCIAL_TOPIC_IDS.has(c.topicId));

// ─── Fixed 3D city positions ───────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "cozy-cafe":     [-20, 0, -20],
  "busy-office":   [20, 0, -20],
  "fun-party":     [-20, 0, 0],
  "grand-hotel":   [20, 0, 0],
  "airport-desk":  [0, 0, -30],
  "fine-dining":   [-25, 0, 15],
  "shopping-mall": [25, 0, 15],
  "fitness-gym":      [0, 0, 25],
  "orthodox-church":  [0, 0, 0],   // center of the city
};

function cityTo3D(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Ground Plane ──────────────────────────────────────────────
function GroundPlane() {
  return (
    <group>
      {/* Asphalt ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Road System ───────────────────────────────────────────────
function Roads() {
  // Main roads: 2 horizontal + 2 vertical
  const roadColor = "#333333";
  const lineColor = "#ffffff";

  return (
    <group>
      {/* ── Horizontal roads ── */}
      {/* H1: z = -10 (connects cafe row to office row) */}
      <mesh position={[0, -0.45, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 3]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>
      {/* H2: z = 10 (connects party/hotel to restaurant/mall) */}
      <mesh position={[0, -0.45, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 3]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>

      {/* ── Vertical roads ── */}
      {/* V1: x = -10 */}
      <mesh position={[-10, -0.45, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[70, 3]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>
      {/* V2: x = 10 */}
      <mesh position={[10, -0.45, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[70, 3]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>

      {/* ── Dashed center lines ── */}
      {/* H1 dashes */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={`h1d${i}`} position={[-30 + i * 4, -0.44, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}
      {/* H2 dashes */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={`h2d${i}`} position={[-30 + i * 4, -0.44, 10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}
      {/* V1 dashes */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={`v1d${i}`} position={[-10, -0.44, -30 + i * 4]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}
      {/* V2 dashes */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={`v2d${i}`} position={[10, -0.44, -30 + i * 4]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}

      {/* ── Crosswalks at intersections ── */}
      {[
        [-10, -10], [-10, 10], [10, -10], [10, 10],
      ].map(([x, z], ci) =>
        Array.from({ length: 5 }, (_, i) => (
          <mesh key={`cw${ci}-${i}`} position={[x - 1.2 + i * 0.6, -0.44, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, 2.5]} />
            <meshBasicMaterial color={lineColor} />
          </mesh>
        ))
      )}

      {/* ── Sidewalk strips along roads ── */}
      {/* H1 sidewalks */}
      <mesh position={[0, -0.47, -11.8]}>
        <boxGeometry args={[70, 0.08, 0.6]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.47, -8.2]}>
        <boxGeometry args={[70, 0.08, 0.6]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      {/* H2 sidewalks */}
      <mesh position={[0, -0.47, 11.8]}>
        <boxGeometry args={[70, 0.08, 0.6]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.47, 8.2]}>
        <boxGeometry args={[70, 0.08, 0.6]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      {/* V1 sidewalks */}
      <mesh position={[-11.8, -0.47, 0]}>
        <boxGeometry args={[0.6, 0.08, 70]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      <mesh position={[-8.2, -0.47, 0]}>
        <boxGeometry args={[0.6, 0.08, 70]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      {/* V2 sidewalks */}
      <mesh position={[11.8, -0.47, 0]}>
        <boxGeometry args={[0.6, 0.08, 70]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
      <mesh position={[8.2, -0.47, 0]}>
        <boxGeometry args={[0.6, 0.08, 70]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Café Zone ─────────────────────────────────────────────────
function CafeZone() {
  return (
    <group position={[-20, 0, -20]}>
      {/* Main café building */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 4]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.6, 2.01]}>
        <boxGeometry args={[0.8, 1.2, 0.05]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      {/* Window */}
      <mesh position={[0.9, 1.8, 2.01]}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 2.8, 2.8]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[3.5, 0.08, 1.5]} />
        <meshStandardMaterial color="#cc4444" roughness={0.7} />
      </mesh>
      {/* Awning stripes */}
      {[-1.0, 0, 1.0].map((x, i) => (
        <mesh key={`aws${i}`} position={[x, 2.82, 2.8]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.5, 0.09, 1.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
      ))}

      {/* Outdoor tables */}
      {[
        [2.5, 0, 2.5],
        [2.5, 0, 0.5],
        [-2.5, 0, 2.0],
      ].map(([x, y, z], i) => (
        <group key={`table${i}`} position={[x, y, z]}>
          {/* Table top */}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 8]} />
            <meshStandardMaterial color="#8B7355" roughness={0.8} />
          </mesh>
          {/* Table leg */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 4]} />
            <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
          </mesh>
          {/* Coffee cup */}
          <mesh position={[0.1, 0.78, 0.05]}>
            <cylinderGeometry args={[0.06, 0.05, 0.1, 6]} />
            <meshStandardMaterial color="#f5f5f0" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Smaller adjacent building */}
      <mesh position={[-3, 1, -1]}>
        <boxGeometry args={[2, 2, 2.5]} />
        <meshStandardMaterial color="#9a7a4a" roughness={0.85} />
      </mesh>
      {/* Second small building */}
      <mesh position={[2, 0.8, -2]}>
        <boxGeometry args={[1.5, 1.6, 2]} />
        <meshStandardMaterial color="#7a5a30" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Office Zone ───────────────────────────────────────────────
function OfficeZone() {
  return (
    <group position={[20, 0, -20]}>
      {/* Main glass tower */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[4, 10, 4]} />
        <meshStandardMaterial color="#4a6a8a" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Window lines (horizontal bands) */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`owh${i}`} position={[0, 1.2 + i * 1.2, 2.01]}>
          <boxGeometry args={[3.6, 0.08, 0.05]} />
          <meshStandardMaterial color="#2a4a6a" roughness={0.3} />
        </mesh>
      ))}
      {/* Lit window glows on office tower */}
      {[
        [-1.2, 2.4], [0.8, 4.8], [-0.5, 7.2], [1.0, 3.6], [-1.0, 6.0], [0.3, 8.4],
      ].map(([wx, wy], wi) => (
        <mesh key={`owg${wi}`} position={[wx, wy, 2.02]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial color="#ffdd88" emissive="#ffdd88" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Antenna on top */}
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2, 4]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 12.1, 0]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.5} />
      </mesh>

      {/* Smaller office box 1 */}
      <mesh position={[-3.5, 2.5, 1]}>
        <boxGeometry args={[2.5, 5, 3]} />
        <meshStandardMaterial color="#5a7a9a" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Smaller office box 2 */}
      <mesh position={[3, 1.5, -1.5]}>
        <boxGeometry args={[2, 3, 2.5]} />
        <meshStandardMaterial color="#3a5a7a" roughness={0.4} metalness={0.4} />
      </mesh>
      {!IS_MOBILE && (
        <mesh position={[2, 1, 2.5]}>
          <boxGeometry args={[1.5, 2, 1.5]} />
          <meshStandardMaterial color="#4a6a8a" roughness={0.4} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

// ─── Party Zone ────────────────────────────────────────────────
function PartyZone() {
  return (
    <group position={[-20, 0, 0]}>
      {/* Main colorful building */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 4, 4]} />
        <meshStandardMaterial color="#9b59b6" roughness={0.6} />
      </mesh>
      {/* Neon strip accents */}
      <mesh position={[0, 3.8, 2.01]}>
        <boxGeometry args={[3.8, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 2.5, 2.01]}>
        <boxGeometry args={[3.8, 0.1, 0.05]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[2.01, 3, 0]}>
        <boxGeometry args={[0.05, 3.5, 0.12]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={0.5} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.7, 2.01]}>
        <boxGeometry args={[1, 1.4, 0.05]} />
        <meshStandardMaterial color="#2a1a3a" roughness={0.8} />
      </mesh>

      {/* Disco ball on top */}
      <mesh position={[0, 4.6, 0]}>
        <sphereGeometry args={[0.4, 12, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Disco ball pole */}
      <mesh position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 4]} />
        <meshStandardMaterial color="#888888" roughness={0.5} />
      </mesh>

      {/* Balloons */}
      {[
        [-1.5, 4.5, 1.5, "#ff4444"],
        [1.2, 5, -0.8, "#44ff44"],
        [-0.5, 4.8, -1.5, "#4488ff"],
      ].map(([x, y, z, color], i) => (
        <group key={`balloon${i}`}>
          <mesh position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color={color as string} roughness={0.5} />
          </mesh>
          <mesh position={[x as number, (y as number) - 0.35, z as number]}>
            <cylinderGeometry args={[0.01, 0.01, 0.4, 3]} />
            <meshStandardMaterial color="#888888" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Side building */}
      <mesh position={[3, 1.2, -1]}>
        <boxGeometry args={[2, 2.4, 2.5]} />
        <meshStandardMaterial color="#8e44ad" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ─── Hotel Zone ────────────────────────────────────────────────
function HotelZone() {
  return (
    <group position={[20, 0, 0]}>
      {/* Grand hotel building */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[5, 8, 6]} />
        <meshStandardMaterial color="#d4b896" roughness={0.7} />
      </mesh>
      {/* Window grid */}
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => (
          <mesh key={`hw${row}-${col}`} position={[-1.2 + col * 1.2, 1.5 + row * 1.1, 3.01]}>
            <boxGeometry args={[0.6, 0.7, 0.05]} />
            <meshStandardMaterial color="#5a7a9a" roughness={0.3} metalness={0.3} />
          </mesh>
        ))
      )}
      {/* Canopy entrance */}
      <mesh position={[0, 1.2, 3.5]}>
        <boxGeometry args={[2.5, 0.1, 1.5]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.7} />
      </mesh>
      {/* Canopy supports */}
      {[-1, 1].map((x, i) => (
        <mesh key={`hs${i}`} position={[x, 0.6, 4]}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 4]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
        </mesh>
      ))}
      {/* Revolving door hint */}
      <mesh position={[0, 0.5, 3.01]}>
        <cylinderGeometry args={[0.4, 0.4, 1, 8]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.5} transparent opacity={0.6} />
      </mesh>
      {/* Lit window glows on hotel */}
      {[
        [-1.2, 5.9], [0, 5.9], [1.2, 5.9],
        [-1.2, 3.5], [1.2, 3.5], [0, 2.3],
      ].map(([wx, wy], wi) => (
        <mesh key={`hwg${wi}`} position={[wx, wy, 3.02]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial color="#ffdd88" emissive="#ffdd88" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Hotel sign on top */}
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[3, 0.5, 0.3]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Airport Zone ──────────────────────────────────────────────
function AirportZone() {
  return (
    <group position={[0, 0, -30]}>
      {/* Wide terminal building */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[8, 3, 4]} />
        <meshStandardMaterial color="#b0b8c0" roughness={0.6} />
      </mesh>
      {/* Glass front */}
      <mesh position={[0, 1.8, 2.01]}>
        <boxGeometry args={[7, 2, 0.05]} />
        <meshStandardMaterial color="#6a8aaa" roughness={0.2} metalness={0.5} transparent opacity={0.7} />
      </mesh>
      {/* Control tower */}
      <mesh position={[5, 3, -1]}>
        <cylinderGeometry args={[0.4, 0.5, 6, 8]} />
        <meshStandardMaterial color="#909898" roughness={0.5} />
      </mesh>
      {/* Control tower top */}
      <mesh position={[5, 6.3, -1]}>
        <cylinderGeometry args={[1, 0.5, 0.6, 8]} />
        <meshStandardMaterial color="#2a4a5a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Tower windows */}
      <mesh position={[5, 6.5, -1]}>
        <cylinderGeometry args={[0.9, 0.9, 0.3, 8]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.5} transparent opacity={0.6} />
      </mesh>

      {/* Runway stripe */}
      <mesh position={[0, -0.44, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 10]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      {/* Runway center dashes */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`rwd${i}`} position={[0, -0.43, -2 - i * 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 0.8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Restaurant Zone ───────────────────────────────────────────
function RestaurantZone() {
  return (
    <group position={[-25, 0, 15]}>
      {/* Mediterranean main building */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[4, 3.6, 3.5]} />
        <meshStandardMaterial color="#cc8855" roughness={0.8} />
      </mesh>
      {/* Terracotta roof */}
      <mesh position={[0, 3.8, 0]}>
        <boxGeometry args={[4.4, 0.4, 3.9]} />
        <meshStandardMaterial color="#b85533" roughness={0.85} />
      </mesh>
      {/* Arched windows */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={`rw${i}`} position={[x, 2, 1.76]}>
          <boxGeometry args={[0.6, 0.8, 0.05]} />
          <meshStandardMaterial color="#ffeedd" roughness={0.5} />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.7, 1.76]}>
        <boxGeometry args={[0.7, 1.4, 0.05]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.9} />
      </mesh>

      {/* Outdoor seating area */}
      {[
        [2.5, 0, 2],
        [2.5, 0, 0],
        [-2.5, 0, 1.5],
      ].map(([x, y, z], i) => (
        <group key={`rt${i}`} position={[x, y, z]}>
          {/* Table */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.8, 0.05, 0.5]} />
            <meshStandardMaterial color="#8B7355" roughness={0.8} />
          </mesh>
          {/* Legs */}
          {[[-0.3, 0.28, -0.18], [0.3, 0.28, 0.18]].map(([lx, ly, lz], li) => (
            <mesh key={`rl${li}`} position={[lx, ly, lz]}>
              <boxGeometry args={[0.05, 0.55, 0.05]} />
              <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
            </mesh>
          ))}
          {/* Chair */}
          <mesh position={[0.5, 0.3, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.3]} />
            <meshStandardMaterial color="#6a5a3a" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Side building */}
      <mesh position={[-3, 1.2, -1]}>
        <boxGeometry args={[2, 2.4, 2.5]} />
        <meshStandardMaterial color="#bb7744" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Shopping Mall Zone ────────────────────────────────────────
function ShoppingMallZone() {
  return (
    <group position={[25, 0, 15]}>
      {/* Wide modern building */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[8, 5, 6]} />
        <meshStandardMaterial color="#5a8aaa" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Glass front panels */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={`mgp${i}`} position={[x, 2.5, 3.01]}>
          <boxGeometry args={[2, 4, 0.05]} />
          <meshStandardMaterial color="#88bbdd" roughness={0.1} metalness={0.5} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Entrance */}
      <mesh position={[0, 0.8, 3.01]}>
        <boxGeometry args={[1.5, 1.6, 0.05]} />
        <meshStandardMaterial color="#3a6a8a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Shopping bag signs (colorful small boxes on roof) */}
      {[
        [-1.5, 5.3, 0, "#ff6688"],
        [0, 5.5, 0.5, "#66bbff"],
        [1.5, 5.2, -0.5, "#88dd66"],
      ].map(([x, y, z, color], i) => (
        <mesh key={`bag${i}`} position={[x as number, y as number, z as number]}>
          <boxGeometry args={[0.5, 0.6, 0.3]} />
          <meshStandardMaterial color={color as string} roughness={0.6} />
        </mesh>
      ))}
      {/* Side annex */}
      {!IS_MOBILE && (
        <mesh position={[-5, 1.5, 1]}>
          <boxGeometry args={[2, 3, 3]} />
          <meshStandardMaterial color="#4a7a9a" roughness={0.3} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

// ─── Fitness Gym Zone ──────────────────────────────────────────
function GymZone() {
  return (
    <group position={[0, 0, 25]}>
      {/* Main building — modern gray */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[5, 4, 4]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.5} />
      </mesh>
      {/* Glass front */}
      <mesh position={[0, 2, 2.01]}>
        <boxGeometry args={[4.5, 3.5, 0.05]} />
        <meshStandardMaterial color="#4a8aaa" roughness={0.2} metalness={0.4} transparent opacity={0.7} />
      </mesh>
      {/* Sign — "GYM" glow */}
      <mesh position={[0, 3.8, 2.02]}>
        <boxGeometry args={[2, 0.5, 0.05]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.6} />
      </mesh>
      {/* Dumbbells outside */}
      {[[-2.5, 0.3, 2.5], [2.5, 0.3, 2.5]].map(([x, y, z], i) => (
        <group key={`dumb${i}`} position={[x, y, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 1, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[-0.5, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 5, 2]} color="#ff8844" intensity={0.8} distance={12} />
    </group>
  );
}

// ─── Orthodox Church Zone (center) ────────────────────────────
function ChurchZone() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main building — white/cream */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[4, 5, 5]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.7} />
      </mesh>
      {/* Main dome — gold */}
      <mesh position={[0, 5.8, 0]}>
        <sphereGeometry args={[1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8a832" emissive="#8a7020" emissiveIntensity={0.3} metalness={0.4} />
      </mesh>
      {/* Cross on top */}
      <group position={[0, 7.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 4]} />
          <meshStandardMaterial color="#c8a832" emissive="#8a7020" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 4]} />
          <meshStandardMaterial color="#c8a832" emissive="#8a7020" emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* Side domes (smaller) */}
      {[[-1.5, 4.5, -1.5], [1.5, 4.5, -1.5]].map(([x, y, z], i) => (
        <group key={`dome${i}`} position={[x, y, z]}>
          <mesh>
            <sphereGeometry args={[0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#c8a832" emissive="#8a7020" emissiveIntensity={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
            <meshStandardMaterial color="#c8a832" />
          </mesh>
        </group>
      ))}
      {/* Arched entrance */}
      <mesh position={[0, 1.2, 2.51]}>
        <boxGeometry args={[1.2, 2.4, 0.05]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      {/* Windows — arched (emissive warm) */}
      {[[-1.3, 3, 2.51], [1.3, 3, 2.51]].map(([x, y, z], i) => (
        <mesh key={`chw${i}`} position={[x, y, z]}>
          <boxGeometry args={[0.5, 0.8, 0.05]} />
          <meshStandardMaterial color="#ffcc66" emissive="#ffaa44" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Steps */}
      <mesh position={[0, 0.1, 3]}>
        <boxGeometry args={[2, 0.2, 1]} />
        <meshStandardMaterial color="#aaa8a0" />
      </mesh>
      <pointLight position={[0, 6, 0]} color="#ffdd88" intensity={1.2} distance={15} />
    </group>
  );
}

// ─── Street Lamps ──────────────────────────────────────────────
const LAMP_POSITIONS: [number, number, number][] = [
  [-10, 0, -25], [-10, 0, -15], [-10, 0, -5], [-10, 0, 5], [-10, 0, 15], [-10, 0, 25],
  [10, 0, -25], [10, 0, -15], [10, 0, 5], [10, 0, 15], [10, 0, 25],
  [-25, 0, -10], [-15, 0, -10], [15, 0, -10], [25, 0, -10],
  [-25, 0, 10], [-15, 0, 10], [15, 0, 10], [25, 0, 10],
];

function StreetLamps() {
  const lamps = IS_MOBILE ? LAMP_POSITIONS.filter((_, i) => i % 2 === 0) : LAMP_POSITIONS;
  return (
    <group>
      {lamps.map(([x, , z], i) => (
        <group key={`lamp${i}`} position={[x, 0, z]}>
          {/* Pole */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 3, 4]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.7} />
          </mesh>
          {/* Lamp head */}
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshStandardMaterial
              color="#ffeeaa"
              emissive="#ffcc44"
              emissiveIntensity={0.6}
              roughness={0.3}
            />
          </mesh>
          {/* Warm glow sphere */}
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshStandardMaterial
              color="#ffaa66"
              emissive="#ffaa66"
              emissiveIntensity={0.8}
              transparent
              opacity={0.2}
              roughness={0.3}
            />
          </mesh>
          {/* Point light */}
          <pointLight position={[x, 3.2, z]} color="#ffcc66" intensity={1.2} distance={8} />
        </group>
      ))}
    </group>
  );
}

// ─── Benches ───────────────────────────────────────────────────
const BENCH_POSITIONS: [number, number, number][] = [
  [-16, 0, -16], [-24, 0, -18], [-12, 0, 2], [-22, 0, 12],
  [16, 0, 2], [22, 0, -16], [5, 0, 22], [-5, 0, -26],
  [14, 0, 12], [0, 0, 10],
];

function Benches() {
  const benches = IS_MOBILE ? BENCH_POSITIONS.slice(0, 5) : BENCH_POSITIONS;
  return (
    <group>
      {benches.map(([x, , z], i) => (
        <group key={`bench${i}`} position={[x, 0, z]}>
          {/* Seat */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1, 0.06, 0.35]} />
            <meshStandardMaterial color="#8B6914" roughness={0.85} />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.35, 0.17, 0]}>
            <boxGeometry args={[0.06, 0.34, 0.3]} />
            <meshStandardMaterial color="#5a4a30" roughness={0.9} />
          </mesh>
          <mesh position={[0.35, 0.17, 0]}>
            <boxGeometry args={[0.06, 0.34, 0.3]} />
            <meshStandardMaterial color="#5a4a30" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Sidewalk Trees ────────────────────────────────────────────
const TREE_POSITIONS: [number, number, number][] = [
  [-12, 0, -22], [-8, 0, -18], [8, 0, -22], [14, 0, -18],
  [-14, 0, -5], [-8, 0, 5], [8, 0, -5], [14, 0, 5],
  [-18, 0, 12], [-12, 0, 18], [12, 0, 18], [18, 0, 12],
  [0, 0, -18], [0, 0, 18], [-28, 0, 0],
];

function SidewalkTrees() {
  const trees = IS_MOBILE ? TREE_POSITIONS.filter((_, i) => i % 2 === 0) : TREE_POSITIONS;
  return (
    <group>
      {trees.map(([x, , z], i) => (
        <group key={`tree${i}`} position={[x, 0, z]}>
          {/* Trunk */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 5]} />
            <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshStandardMaterial color="#3a8a3a" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Traffic Lights ────────────────────────────────────────────
function TrafficLights() {
  return (
    <group>
      {[
        [-10, 0, -10],
        [10, 0, -10],
        [-10, 0, 10],
        [10, 0, 10],
      ].map(([x, , z], i) => (
        <group key={`tl${i}`} position={[x, 0, z]}>
          {/* Pole */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 3, 4]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
          </mesh>
          {/* Light housing */}
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.15]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
          </mesh>
          {/* Red */}
          <mesh position={[0, 3.3, 0.08]}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color="#ff3333" emissive={i % 2 === 0 ? "#ff2222" : "#330000"} emissiveIntensity={i % 2 === 0 ? 0.8 : 0.1} />
          </mesh>
          {/* Yellow */}
          <mesh position={[0, 3.1, 0.08]}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color="#ffaa00" emissive="#332200" emissiveIntensity={0.1} />
          </mesh>
          {/* Green */}
          <mesh position={[0, 2.9, 0.08]}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color="#33ff33" emissive={i % 2 !== 0 ? "#22ff22" : "#003300"} emissiveIntensity={i % 2 !== 0 ? 0.8 : 0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Street Signs ──────────────────────────────────────────────
function StreetSigns() {
  return (
    <group>
      {[
        [-15, 0, -10, 0],
        [15, 0, 10, Math.PI],
        [-10, 0, 20, Math.PI / 2],
        [10, 0, -20, -Math.PI / 2],
        [0, 0, -15, 0.3],
        [20, 0, 10, -0.5],
      ].map(([x, , z, ry], i) => (
        <group key={`sign${i}`} position={[x, 0, z]} rotation={[0, ry, 0]}>
          {/* Pole */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 2.4, 4]} />
            <meshStandardMaterial color="#6a6a6a" roughness={0.6} />
          </mesh>
          {/* Sign plate */}
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[0.8, 0.4, 0.04]} />
            <meshStandardMaterial color="#2255aa" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Moving Vehicle ────────────────────────────────────────────
function MovingVehicle({
  color,
  size,
  path,
  speed,
}: {
  color: string;
  size: [number, number, number];
  path: [number, number, number][];
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const segment = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current || path.length < 2) return;
    progress.current += delta * speed;

    const from = path[segment.current];
    const to = path[(segment.current + 1) % path.length];
    const t = Math.min(progress.current, 1);

    const x = from[0] + (to[0] - from[0]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    ref.current.position.set(x, -0.1, z);

    // Face direction of travel
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      ref.current.rotation.y = Math.atan2(dx, dz);
    }

    if (progress.current >= 1) {
      progress.current = 0;
      segment.current = (segment.current + 1) % path.length;
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, size[1] / 2 + 0.1, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Wheels (simple dark bumps) */}
      {[
        [-size[0] / 2, 0.1, -size[2] / 3],
        [size[0] / 2, 0.1, -size[2] / 3],
        [-size[0] / 2, 0.1, size[2] / 3],
        [size[0] / 2, 0.1, size[2] / 3],
      ].map(([wx, wy, wz], i) => (
        <mesh key={`vw${i}`} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 6]} />
          <meshStandardMaterial color="#222222" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Vehicles ──────────────────────────────────────────────────
function Vehicles() {
  // Car route 1: along H1 road (z = -10)
  const carPath1: [number, number, number][] = [
    [-30, 0, -10], [30, 0, -10], [30, 0, -10], [-30, 0, -10],
  ];
  // Car route 2: along V2 road (x = 10)
  const carPath2: [number, number, number][] = [
    [10, 0, -30], [10, 0, 30], [10, 0, 30], [10, 0, -30],
  ];
  // Taxi route: along H2 road (z = 10)
  const taxiPath: [number, number, number][] = [
    [30, 0, 10], [-30, 0, 10], [-30, 0, 10], [30, 0, 10],
  ];
  // Bus route: along V1 road (x = -10)
  const busPath: [number, number, number][] = [
    [-10, 0, 30], [-10, 0, -30], [-10, 0, -30], [-10, 0, 30],
  ];

  return (
    <group>
      <MovingVehicle color="#cc3333" size={[1.5, 0.8, 3]} path={carPath1} speed={0.08} />
      {!IS_MOBILE && (
        <>
          <MovingVehicle color="#3366cc" size={[1.5, 0.8, 3]} path={carPath2} speed={0.06} />
          <MovingVehicle color="#ffcc00" size={[1.5, 0.8, 3]} path={taxiPath} speed={0.05} />
          <MovingVehicle color="#2255aa" size={[2, 1.5, 5]} path={busPath} speed={0.03} />
        </>
      )}
    </group>
  );
}

// ─── Floating Chat Bubbles ─────────────────────────────────────
function ChatBubble({ position, delay }: { position: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    ref.current.position.y = position[1] + Math.sin(t * 1.2) * 0.3;
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.8, 0.4, 0.15]} />
      <meshStandardMaterial color="#ffffff" roughness={0.5} transparent opacity={0.8} />
    </mesh>
  );
}

function ChatBubbles() {
  const bubblePositions: { pos: [number, number, number]; delay: number }[] = [
    { pos: [-18, 5, -18], delay: 0 },
    { pos: [22, 6, -18], delay: 1.5 },
    { pos: [-18, 5.5, 2], delay: 0.8 },
    { pos: [22, 5, 2], delay: 2.2 },
    { pos: [0, 6, -28], delay: 1.0 },
  ];
  const extras: { pos: [number, number, number]; delay: number }[] = [
    { pos: [-23, 5, 17], delay: 3.0 },
    { pos: [27, 5.5, 17], delay: 1.8 },
    { pos: [2, 5, 27], delay: 2.5 },
  ];

  const all = IS_MOBILE ? bubblePositions : [...bubblePositions, ...extras];

  return (
    <group>
      {all.map((b, i) => (
        <ChatBubble key={`cb${i}`} position={b.pos} delay={b.delay} />
      ))}
    </group>
  );
}

// ─── Background Skyline (desktop only) ────────────────────────
const SKYLINE_BUILDINGS: { pos: [number, number, number]; size: [number, number, number]; windows?: [number, number][] }[] = [
  { pos: [-50, 0, -45], size: [3, 14, 3], windows: [[0.3, 4], [0.3, 7], [0.3, 10]] },
  { pos: [-45, 0, -50], size: [2.5, 10, 2.5], windows: [[0.2, 3], [0.2, 6]] },
  { pos: [-40, 0, -48], size: [4, 18, 3], windows: [[0.5, 5], [0.5, 9], [0.5, 13], [-0.5, 7], [-0.5, 11]] },
  { pos: [42, 0, -50], size: [3, 12, 3], windows: [[0.3, 4], [0.3, 8]] },
  { pos: [48, 0, -44], size: [2, 16, 2], windows: [[0.2, 5], [0.2, 9], [0.2, 13]] },
  { pos: [55, 0, -40], size: [3.5, 9, 3], windows: [[0.4, 3], [0.4, 6]] },
  { pos: [-48, 0, 42], size: [3, 11, 3], windows: [[0.3, 4], [0.3, 7]] },
  { pos: [50, 0, 45], size: [2.5, 15, 2.5], windows: [[0.3, 5], [0.3, 9], [0.3, 12]] },
  { pos: [-55, 0, 0], size: [3, 20, 3], windows: [[0.4, 6], [0.4, 10], [0.4, 14], [-0.4, 8], [-0.4, 12]] },
  { pos: [55, 0, 5], size: [2, 8, 2] },
  { pos: [45, 0, 48], size: [3, 13, 3], windows: [[0.3, 4], [0.3, 8], [0.3, 11]] },
  { pos: [-42, 0, 48], size: [4, 10, 3], windows: [[0.5, 3], [0.5, 7]] },
];

function BackgroundSkyline() {
  if (IS_MOBILE) return null;
  return (
    <group>
      {SKYLINE_BUILDINGS.map((b, i) => (
        <group key={`sky${i}`} position={[b.pos[0], b.size[1] / 2, b.pos[2]]}>
          <mesh>
            <boxGeometry args={b.size} />
            <meshBasicMaterial color="#1a1a2a" />
          </mesh>
          {/* Lit windows */}
          {b.windows?.map(([wx, wy], wi) => (
            <mesh key={`sw${i}-${wi}`} position={[wx, wy - b.size[1] / 2, b.size[2] / 2 + 0.01]}>
              <planeGeometry args={[0.25, 0.2]} />
              <meshBasicMaterial color="#ffdd66" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─── Walking Pedestrians ──────────────────────────────────────
const PEDESTRIAN_CONFIGS: { color: string; start: [number, number, number]; end: [number, number, number]; speed: number }[] = [
  { color: "#3366aa", start: [-30, 0, -8.2], end: [30, 0, -8.2], speed: 2.5 },
  { color: "#cc3333", start: [8.2, 0, 30], end: [8.2, 0, -30], speed: 2.0 },
  { color: "#666666", start: [30, 0, 11.8], end: [-30, 0, 11.8], speed: 2.2 },
  { color: "#338833", start: [-11.8, 0, -30], end: [-11.8, 0, 30], speed: 1.8 },
];

function Pedestrian({ color, start, end, speed }: typeof PEDESTRIAN_CONFIGS[number]) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(Math.random());

  useFrame((_, delta) => {
    if (!ref.current) return;
    const totalDist = Math.sqrt((end[0] - start[0]) ** 2 + (end[2] - start[2]) ** 2);
    progress.current += (delta * speed) / totalDist;
    if (progress.current > 1) progress.current = 0;
    const t = progress.current;
    ref.current.position.set(
      start[0] + (end[0] - start[0]) * t,
      0,
      start[2] + (end[2] - start[2]) * t
    );
  });

  // Face direction
  const ry = Math.atan2(end[0] - start[0], end[2] - start[2]);

  return (
    <group ref={ref} rotation={[0, ry, 0]}>
      {/* Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#f0d0b0" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Pedestrians() {
  const configs = IS_MOBILE ? PEDESTRIAN_CONFIGS.slice(0, 1) : PEDESTRIAN_CONFIGS;
  return (
    <group>
      {configs.map((cfg, i) => (
        <Pedestrian key={`ped${i}`} {...cfg} />
      ))}
    </group>
  );
}

// ─── Street Props (newspaper stands, flower pots, fire hydrants) ──
function StreetProps() {
  return (
    <group>
      {/* Newspaper stands */}
      {[
        [-14, 0, -8.5],
        [16, 0, 11.5],
      ].map(([x, , z], i) => (
        <group key={`news${i}`} position={[x, 0, z]}>
          {/* Box */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.35]} />
            <meshStandardMaterial color="#2255aa" roughness={0.7} />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.18, 0.15, 0]}>
            <boxGeometry args={[0.04, 0.3, 0.04]} />
            <meshStandardMaterial color="#333333" roughness={0.8} />
          </mesh>
          <mesh position={[0.18, 0.15, 0]}>
            <boxGeometry args={[0.04, 0.3, 0.04]} />
            <meshStandardMaterial color="#333333" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Flower pots */}
      {[
        [-22, 0, -8.5],
        [14, 0, -11.5],
        [-8.5, 0, 14],
      ].map(([x, , z], i) => (
        <group key={`flower${i}`} position={[x, 0, z]}>
          {/* Pot */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
            <meshStandardMaterial color="#aa5533" roughness={0.8} />
          </mesh>
          {/* Plant */}
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color="#44aa44" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Fire hydrant */}
      <group position={[12, 0, -8.5]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.5, 8]} />
          <meshStandardMaterial color="#cc2222" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.14, 6, 4]} />
          <meshStandardMaterial color="#cc2222" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ─── City Marker ───────────────────────────────────────────────
function SocialCityMarker({
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
  const [x, , z] = cityTo3D(city);
  const size = isNext ? 110 : unlocked ? 96 : 72;

  return (
    <group position={[x, 5, z]}>
      {/* Glow ring (warm orange theme) */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
          <ringGeometry args={[3.5, 5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#ff8c00" : "#f97316"}
            transparent
            opacity={isNext ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {isNext && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.52, 0]}>
          <ringGeometry args={[5, 6, 32]} />
          <meshBasicMaterial color="#ff8c00" transparent opacity={0.12} />
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
                ? "radial-gradient(circle at 35% 35%, #fff5e6, #f0c080)"
                : "radial-gradient(circle at 35% 35%, #4a4a48, #2a2a28)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#f97316" : "#555555"}`,
              boxShadow: unlocked
                ? `0 4px 20px rgba(0,0,0,0.5), 0 0 ${isNext ? 24 : 10}px #f97316${isNext ? "90" : "40"}`
                : "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 44 : 36 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 28, opacity: 0.4 }}>🔒</span>
            )}
          </div>

          {/* Building name */}
          <div
            className="mt-1.5 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(30,20,10,0.92)" : "rgba(30,30,30,0.75)",
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

          {/* City name */}
          <p style={{ fontSize: 11, color: unlocked ? "#f0c080" : "#555", marginTop: 2, fontWeight: 600 }}>
            {city.name[lang]}
          </p>

          {/* Stars */}
          {unlocked && (
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2].map((s) => (
                <span key={s} style={{ fontSize: 12, opacity: s < completedLevels ? 1 : 0.2 }}>⭐</span>
              ))}
            </div>
          )}

          {/* XP requirement */}
          {!unlocked && city.requiredXP > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#f0a050", marginTop: 2 }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Camera Controls ───────────────────────────────────────────
function SocialCameraControls() {
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
      enableRotate={true}
      enablePan={true}
      enableZoom={true}
      zoomToCursor={!isTouchDevice}
      screenSpacePanning={true}
      enableDamping={true}
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

// ─── Scene ready detector ──────────────────────────────────────
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

// ─── Main component ────────────────────────────────────────────
export function SocialMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(SOCIAL_CITIES.map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...SOCIAL_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = SOCIAL_CITIES.find((c) => !unlockedIds.has(c.id));
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
        background: "linear-gradient(180deg, #1a1a2e 0%, #2a1a1a 50%, #4a2a1a 100%)",
      }}
    >
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 50, 50], fov: 45 }}
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

        {/* Sky — warm sunset */}
        <color attach="background" args={["#1a1a2e"]} />
        <fog attach="fog" args={["#2a1a1a", 70, 200]} />

        {/* Lighting — warm golden hour */}
        <hemisphereLight intensity={0.5} color="#FFE4B5" groundColor="#3a2a1a" />
        <directionalLight position={[-20, 30, -10]} intensity={1.1} color="#FFE4B5" />
        <ambientLight intensity={0.25} color="#3a2a1a" />

        <Suspense fallback={null}>
          <GroundPlane />
          <Roads />

          {/* Zone buildings */}
          <CafeZone />
          <OfficeZone />
          <PartyZone />
          <HotelZone />
          <AirportZone />
          <RestaurantZone />
          <ShoppingMallZone />
          <GymZone />
          <ChurchZone />

          {/* Street props */}
          <StreetLamps />
          <Benches />
          <SidewalkTrees />
          <TrafficLights />
          <StreetSigns />

          {/* Vehicles */}
          <Vehicles />

          {/* Background skyline */}
          <BackgroundSkyline />

          {/* Walking pedestrians */}
          <Pedestrians />

          {/* Street props */}
          <StreetProps />

          {/* Ambient social bubbles */}
          <ChatBubbles />

          {/* City markers */}
          {SOCIAL_CITIES.map((city) => (
            <SocialCityMarker
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

        <SocialCameraControls />
      </Canvas>

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: overlayVisible ? 1 : 0,
            background: "linear-gradient(180deg, #1a1a2e 0%, #2a1a1a 50%, #4a2a1a 100%)",
          }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🏪
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Building the city...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
