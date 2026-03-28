"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor, Line } from "@react-three/drei";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 800 || "ontouchstart" in window);

const WORLD_ID = "history-bg";
const SKY_TOP = "#1a3a6f";
const SKY_BOTTOM = "#a8cce8";
const FOG_COLOR = "#7fb0d8";
const SEA_COLOR = "#0d3a5c";
const SEA_DEEP = "#071e33";

const historyWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const HISTORY_CITIES = CITIES.filter((c) =>
  historyWorld.topicIds.includes(c.topicId)
);

// ─── City positions on relief terrain ────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-capital": [-8.2, 1.6, 0.2],     // Pliska
  "medieval-fortress": [-1.2, 2.8, -0.4],  // Tarnovo
  "rila-monastery": [2.2, 2.2, 2.2],       // Rila
  "revival-town": [5.9, 1.6, 2.6],         // Revival
  "modern-sofia": [10.5, 1.4, 0.6],        // Modern Bulgaria
};

const CITY_YEARS: Record<string, string> = {
  "ancient-capital": "681",
  "medieval-fortress": "1185",
  "rila-monastery": "10th c.",
  "revival-town": "1800s",
  "modern-sofia": "Today",
};

const TIMELINE_ORDER = [
  "ancient-capital",
  "medieval-fortress",
  "rila-monastery",
  "revival-town",
  "modern-sofia",
];

// All POI positions chronologically (interactive + decorative)
const ALL_POI_POSITIONS: [number, number, number][] = [
  [-10.5, 1.2, 1.8],    // 681 Asparukh
  [-9.3, 1.3, 0.8],     // 705 Tervel
  [-8.2, 1.6, 0.2],     // Pliska
  [-6.9, 1.4, 0.7],     // 864 Baptism
  [-5.8, 1.7, -0.8],    // Preslav
  [-4.2, 1.6, -1.4],    // 917 Aheloy
  [-2.8, 1.5, 0.6],     // 1018 Fall
  [-1.2, 2.8, -0.4],    // Tarnovo
  [0.8, 2.0, -0.8],     // 1205 Adrianople
  [2.2, 2.2, 2.2],      // Rila
  [3.9, 1.7, 0.9],      // 1396 Fall
  [4.8, 1.5, 2.0],      // 1762 Paisii
  [5.9, 1.6, 2.6],      // Revival
  [7.0, 1.6, 1.1],      // 1876 Uprising
  [8.1, 2.6, -0.2],     // Shipka
  [9.0, 1.8, 0.7],      // 1878 Liberation
  [9.7, 1.6, 0.15],     // 1885 Unification
  [10.5, 1.4, 0.6],     // Modern Bulgaria
  [11.2, 1.3, 0.2],     // 1908 Independence
  [11.9, 1.2, 0.95],    // 1989 Transition
];

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ═══════════════════════════════════════════════════════════════════
// SKY + OCEAN + TERRAIN
// ═══════════════════════════════════════════════════════════════════

// ─── Background gradient sky ────────────────────────────────────
function SkyGradient() {
  return (
    <mesh position={[0, 0, -90]} renderOrder={-1}>
      <planeGeometry args={[250, 150]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          colorTop: { value: new THREE.Color(SKY_TOP) },
          colorBottom: { value: new THREE.Color(SKY_BOTTOM) },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 colorTop;
          uniform vec3 colorBottom;
          varying vec2 vUv;
          void main() {
            float t = smoothstep(0.0, 1.0, vUv.y);
            gl_FragColor = vec4(mix(colorBottom, colorTop, t), 1.0);
          }
        `}
      />
    </mesh>
  );
}

// ─── Distant clouds ─────────────────────────────────────────────
function DistantClouds() {
  const clouds: { pos: [number, number, number]; sx: number; sy: number }[] = [
    { pos: [-25, 18, -40], sx: 12, sy: 2.5 },
    { pos: [10, 20, -45], sx: 15, sy: 3 },
    { pos: [35, 16, -38], sx: 10, sy: 2 },
    { pos: [-8, 22, -50], sx: 18, sy: 3.5 },
    { pos: [28, 19, -42], sx: 8, sy: 1.8 },
  ];
  return (
    <group>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <planeGeometry args={[c.sx, c.sy]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Huge animated ocean (like Ocean world) ─────────────────────
function OceanSurface() {
  const ref = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.time.value = clock.getElapsedTime();
  });

  return (
    <group>
      {/* Deep water base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={SEA_DEEP} roughness={1} />
      </mesh>
      {/* Animated surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200, 80, 80]} />
        <shaderMaterial
          ref={ref}
          transparent
          uniforms={{
            time: { value: 0 },
            seaColor: { value: new THREE.Color(SEA_COLOR) },
            seaLight: { value: new THREE.Color("#1a5a8a") },
          }}
          vertexShader={`
            uniform float time;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              vUv = uv;
              vec3 pos = position;
              float wave1 = sin(pos.x * 0.3 + time * 0.8) * 0.15;
              float wave2 = sin(pos.y * 0.4 + time * 0.6) * 0.12;
              float wave3 = sin(pos.x * 0.15 + pos.y * 0.2 + time * 0.4) * 0.2;
              pos.z += wave1 + wave2 + wave3;
              vWave = wave1 + wave2;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 seaColor;
            uniform vec3 seaLight;
            uniform float time;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              float foam = smoothstep(0.12, 0.18, vWave) * 0.15;
              vec3 col = mix(seaColor, seaLight, vWave * 1.5 + 0.3);
              col += vec3(foam);
              float shimmer = sin(vUv.x * 40.0 + time * 2.0) * sin(vUv.y * 35.0 + time * 1.5) * 0.03;
              col += vec3(shimmer);
              gl_FragColor = vec4(col, 0.92);
            }
          `}
        />
      </mesh>
    </group>
  );
}

// ─── Sea name labels ────────────────────────────────────────────
function SeaLabels() {
  const labels: { pos: [number, number, number]; text: string }[] = [
    { pos: [16, 0.5, -1], text: "Black Sea" },
    { pos: [6, 0.5, 9], text: "Aegean Sea" },
    { pos: [-13, 0.5, 7], text: "Adriatic Sea" },
  ];
  return (
    <group>
      {labels.map((l, i) => (
        <Html key={i} position={l.pos} center distanceFactor={55} style={{ pointerEvents: "none" }}>
          <span style={{
            color: "#6aaddb",
            fontSize: "11px",
            fontWeight: 400,
            fontStyle: "italic",
            textShadow: "0 0 8px rgba(10,40,80,0.8)",
            whiteSpace: "nowrap",
            letterSpacing: "2px",
            opacity: 0.7,
          }}>
            {l.text}
          </span>
        </Html>
      ))}
    </group>
  );
}

// ─── Relief terrain (raised landmass with diorama cliffs) ───────
function ReliefTerrain() {
  const { topGeo, topMat, cliffGeo } = useMemo(() => {
    // Top surface
    const geo = new THREE.PlaneGeometry(28, 18, 100, 70);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;

    // Mountain systems — [cx, cz, spreadX, spreadZ, height]
    const ridges: [number, number, number, number, number][] = [
      // Stara Planina — long ridge across north-center
      [-4, -2.5, 45, 8, 2.8],
      [0, -2.0, 35, 6, 3.2],
      [4, -1.5, 30, 7, 2.5],
      [7, -0.8, 20, 8, 2.0],
      // Rila peaks
      [2.2, 2.5, 8, 6, 3.8],
      [1.5, 3.0, 6, 5, 3.2],
      // Pirin
      [0, 4, 5, 4, 3.0],
      // Rhodope — broad soft mass
      [5, 3.5, 20, 15, 2.0],
      [4, 4, 25, 18, 1.6],
      // Eastern hills
      [9, 1, 10, 8, 1.2],
      // Shipka area peak
      [8, -0.5, 5, 4, 2.8],
    ];

    // Gentle rolling base
    const hills: [number, number, number, number][] = [
      [-8, 0, 80, 0.8],
      [0, 2, 60, 0.6],
      [8, -1, 50, 0.5],
      [-3, 5, 70, 0.4],
      [10, 0, 40, 0.3],
    ];

    // River valley cuts — [cx, cz, spreadX, spreadZ, depth]
    const cuts: [number, number, number, number, number][] = [
      // Danube valley — northern edge
      [0, -7.5, 200, 3, 0.5],
      // Maritsa
      [5, 3, 15, 3, 0.4],
      // Iskar
      [1, 0, 4, 8, 0.3],
    ];

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      let y = 0.6; // Base terrain height above sea

      // Mountain ridges (anisotropic gaussian bumps)
      for (const [cx, cz, sx, sz, height] of ridges) {
        y += Math.exp(-((x - cx) ** 2 / sx + (z - cz) ** 2 / sz)) * height;
      }

      // Rolling hills
      for (const [cx, cz, spread, height] of hills) {
        y += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / spread) * height;
      }

      // River valley depressions
      for (const [cx, cz, sx, sz, depth] of cuts) {
        const cut = Math.exp(-((x - cx) ** 2 / sx + (z - cz) ** 2 / sz));
        y -= cut * depth;
      }

      // Edge falloff — terrain drops near edges to meet sea
      const ex = Math.abs(x) / 14; // half-width
      const ez = Math.abs(z) / 9;  // half-depth
      const edgeDist = Math.max(ex, ez);
      if (edgeDist > 0.75) {
        const falloff = (edgeDist - 0.75) / 0.25;
        y = THREE.MathUtils.lerp(y, -0.3, Math.min(falloff * falloff, 1));
      }

      posAttr.setY(i, y);
    }

    geo.computeVertexNormals();

    // Shader: zone-based coloring
    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          float h = vWorldPos.y;
          float slope = 1.0 - abs(vNormal.y);

          // Base green terrain
          vec3 lowland = vec3(0.38, 0.52, 0.28);
          vec3 midland = vec3(0.32, 0.45, 0.25);
          vec3 highland = vec3(0.48, 0.42, 0.32);
          vec3 peak = vec3(0.78, 0.75, 0.68);
          vec3 snow = vec3(0.92, 0.90, 0.86);

          vec3 col;
          if (h < 0.8) {
            col = lowland;
          } else if (h < 1.5) {
            col = mix(lowland, midland, (h - 0.8) / 0.7);
          } else if (h < 2.5) {
            col = mix(midland, highland, (h - 1.5) / 1.0);
          } else if (h < 3.5) {
            col = mix(highland, peak, (h - 2.5) / 1.0);
          } else {
            col = mix(peak, snow, clamp((h - 3.5) / 1.5, 0.0, 1.0));
          }

          // Rocky slopes
          if (slope > 0.4) {
            vec3 rock = vec3(0.45, 0.42, 0.38);
            col = mix(col, rock, smoothstep(0.4, 0.7, slope));
          }

          // Coastline sand near sea level
          if (h < 0.3) {
            vec3 sand = vec3(0.72, 0.65, 0.48);
            col = mix(col, sand, smoothstep(0.3, 0.0, h));
          }

          // Subtle flag gradient overlay (white→green→red by X)
          float t = clamp((vWorldPos.x + 14.0) / 28.0, 0.0, 1.0);
          vec3 flagWhite = vec3(0.95, 0.93, 0.88);
          vec3 flagGreen = vec3(0.2, 0.5, 0.2);
          vec3 flagRed = vec3(0.55, 0.18, 0.15);
          vec3 flagCol;
          if (t < 0.5) {
            flagCol = mix(flagWhite, flagGreen, t * 2.0);
          } else {
            flagCol = mix(flagGreen, flagRed, (t - 0.5) * 2.0);
          }
          col = mix(col, flagCol, 0.12); // subtle tint

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    // Cliff sides — thick ring around terrain edge
    const cliffShape = new THREE.Shape();
    const hw = 14, hd = 9, r = 1.5;
    cliffShape.moveTo(-hw + r, -hd);
    cliffShape.lineTo(hw - r, -hd);
    cliffShape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    cliffShape.lineTo(hw, hd - r);
    cliffShape.quadraticCurveTo(hw, hd, hw - r, hd);
    cliffShape.lineTo(-hw + r, hd);
    cliffShape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    cliffShape.lineTo(-hw, -hd + r);
    cliffShape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

    const inner = new THREE.Shape();
    const inset = 0.6;
    inner.moveTo(-hw + r + inset, -hd + inset);
    inner.lineTo(hw - r - inset, -hd + inset);
    inner.quadraticCurveTo(hw - inset, -hd + inset, hw - inset, -hd + r + inset);
    inner.lineTo(hw - inset, hd - r - inset);
    inner.quadraticCurveTo(hw - inset, hd - inset, hw - r - inset, hd - inset);
    inner.lineTo(-hw + r + inset, hd - inset);
    inner.quadraticCurveTo(-hw + inset, hd - inset, -hw + inset, hd - r - inset);
    inner.lineTo(-hw + inset, -hd + r + inset);
    inner.quadraticCurveTo(-hw + inset, -hd + inset, -hw + r + inset, -hd + inset);

    cliffShape.holes.push(inner);

    const extrudeSettings = { depth: 1.5, bevelEnabled: false };
    const cliffGeoResult = new THREE.ExtrudeGeometry(cliffShape, extrudeSettings);
    cliffGeoResult.rotateX(-Math.PI / 2);
    cliffGeoResult.translate(0, -1, 0);

    return { topGeo: geo, topMat: mat, cliffGeo: cliffGeoResult };
  }, []);

  return (
    <group>
      {/* Top terrain surface */}
      <mesh geometry={topGeo} material={topMat} />
      {/* Cliff sides (diorama) */}
      <mesh geometry={cliffGeo}>
        <meshStandardMaterial color="#5a4a38" roughness={0.9} />
      </mesh>
      {/* Earth layer visible from below cliff */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[27, 17]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── Rivers ─────────────────────────────────────────────────────
function Rivers() {
  const danubePoints: [number, number, number][] = [
    [-14, 0.65, -7.5],
    [-10, 0.7, -7.2],
    [-6, 0.75, -7.0],
    [-2, 0.8, -6.8],
    [2, 0.75, -6.5],
    [6, 0.7, -6.2],
    [10, 0.65, -5.8],
    [13.5, 0.5, -5.5],
  ];
  const maritsaPoints: [number, number, number][] = [
    [2.5, 1.8, 3.0],
    [4.0, 1.4, 3.5],
    [6.0, 1.1, 4.2],
    [8.0, 0.8, 5.0],
    [10.5, 0.5, 6.0],
  ];
  const iskarPoints: [number, number, number][] = [
    [0.5, 2.2, 1.0],
    [1.0, 1.8, -0.5],
    [1.5, 1.4, -2.0],
    [2.0, 1.0, -4.0],
    [2.5, 0.7, -6.0],
  ];
  const strumaPoints: [number, number, number][] = [
    [0.5, 2.0, 3.5],
    [0.0, 1.5, 5.0],
    [-0.5, 1.0, 6.5],
    [-1.0, 0.5, 8.0],
  ];

  const makeSmooth = (pts: [number, number, number][]) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(...p)),
      false, "catmullrom", 0.5
    );
    return curve.getPoints(50).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  };

  return (
    <group>
      <Line points={makeSmooth(danubePoints)} color="#4b8ec8" lineWidth={3.5} />
      <Line points={makeSmooth(maritsaPoints)} color="#4b8ec8" lineWidth={2.5} />
      <Line points={makeSmooth(iskarPoints)} color="#4b8ec8" lineWidth={2} />
      <Line points={makeSmooth(strumaPoints)} color="#4b8ec8" lineWidth={1.5} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REUSABLE PROPS
// ═══════════════════════════════════════════════════════════════════

// ─── Bulgarian flag ─────────────────────────────────────────────
function BulgarianFlag({ position, scale = 1, offset = 0 }: { position: [number, number, number]; scale?: number; offset?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 2 + offset) * 0.08;
  });
  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 5]} />
        <meshStandardMaterial color="#777" metalness={0.5} />
      </mesh>
      <mesh position={[0.22, 1.12, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.015]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.22, 1.22, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.015]} />
        <meshStandardMaterial color="#009b3a" />
      </mesh>
      <mesh position={[0.22, 1.02, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.015]} />
        <meshStandardMaterial color="#d62612" />
      </mesh>
    </group>
  );
}

// ─── Torch ──────────────────────────────────────────────────────
function Torch({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.7 + Math.sin(t * 8 + position[0] * 3) * 0.3;
    if (lightRef.current) lightRef.current.intensity = flicker * 1.5;
    if (sphereRef.current) sphereRef.current.scale.setScalar(0.8 + flicker * 0.3);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.6, 5]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      <mesh ref={sphereRef} position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial emissive="#ff6a00" emissiveIntensity={2} color="#ff8a20" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.8, 0]} color="#ff8a20" intensity={1.5} distance={5} />
    </group>
  );
}

// ─── Horse rider ────────────────────────────────────────────────
function HorseRider({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Horse body */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.7, 0.35, 0.3]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
      {/* Horse head */}
      <mesh position={[0.4, 0.55, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.2, 0.3, 0.15]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[[-0.2, 0, 0.1], [-0.2, 0, -0.1], [0.2, 0, 0.1], [0.2, 0, -0.1]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.08, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.35, 4]} />
          <meshStandardMaterial color="#4a2a0a" />
        </mesh>
      ))}
      {/* Rider torso */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 5]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
      {/* Rider head */}
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      {/* Spear */}
      <mesh position={[0.1, 0.9, 0.12]} rotation={[0.1, 0, 0.15]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 4]} />
        <meshStandardMaterial color="#888" metalness={0.4} />
      </mesh>
    </group>
  );
}

// ─── Soldier group ──────────────────────────────────────────────
function SoldierGroup({ position, count = 4 }: { position: [number, number, number]; count?: number }) {
  const soldiers = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      dx: (i - count / 2) * 0.3 + (Math.random() - 0.5) * 0.15,
      dz: (Math.random() - 0.5) * 0.4,
      h: 0.35 + Math.random() * 0.1,
    })), [count]);

  return (
    <group position={position}>
      {soldiers.map((s, i) => (
        <group key={i} position={[s.dx, 0, s.dz]}>
          {/* Body */}
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.06, s.h, 5]} />
            <meshStandardMaterial color="#4a4a5a" />
          </mesh>
          {/* Head */}
          <mesh position={[0, s.h + 0.06, 0]}>
            <sphereGeometry args={[0.05, 5, 5]} />
            <meshStandardMaterial color="#d4a574" />
          </mesh>
          {/* Shield (every other) */}
          {i % 2 === 0 && (
            <mesh position={[0.08, s.h * 0.4, 0.05]}>
              <circleGeometry args={[0.06, 6]} />
              <meshStandardMaterial color="#8a7a4a" metalness={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ─── Cannon ─────────────────────────────────────────────────────
function Cannon({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Barrel */}
      <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {[-0.08, 0.08].map((z, i) => (
        <mesh key={i} position={[-0.1, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.03, 8]} />
          <meshStandardMaterial color="#5a3a1a" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Smoke particles ────────────────────────────────────────────
function SmokeEmitter({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const data = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      offset: i * 0.8,
      speed: 0.25 + Math.random() * 0.15,
      idx: i,
    })), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d) => {
      const m = refs.current[d.idx];
      if (m) {
        const cycle = ((t * d.speed + d.offset) % 3.5) / 3.5;
        m.position.y = position[1] + cycle * 2;
        m.position.x = position[0] + Math.sin(t + d.idx) * 0.12;
        m.position.z = position[2] + Math.cos(t * 0.7 + d.idx) * 0.1;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.1 * (1 - cycle);
      }
    });
  });

  return (
    <group>
      {data.map((d) => (
        <mesh key={d.idx} ref={(el) => { refs.current[d.idx] = el; }} position={[position[0], position[1], position[2]]}>
          <sphereGeometry args={[0.12, 5, 5]} />
          <meshBasicMaterial color="#888" transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Ember particles ────────────────────────────────────────────
function EmberParticles({ center }: { center: [number, number, number] }) {
  const count = 4;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      rx: (Math.random() - 0.5) * 1.5,
      rz: (Math.random() - 0.5) * 1.5,
      speed: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
    })), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const cycle = ((t * d.speed + d.phase) % 3) / 3;
      dummy.position.set(
        center[0] + d.rx + Math.sin(t + d.phase) * 0.3,
        center[1] + 0.5 + cycle * 2,
        center[2] + d.rz
      );
      dummy.scale.setScalar(0.03 * (1 - cycle));
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ff6a20" transparent opacity={0.8} />
    </instancedMesh>
  );
}

// ─── Memorial stone ─────────────────────────────────────────────
function MemorialStone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.25, 0.4, 0.12]} />
        <meshStandardMaterial color="#6a6a6a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Book prop ──────────────────────────────────────────────────
function BookProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} rotation={[0.1, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.15]} />
        <meshStandardMaterial color="#8a6a30" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0.1, 0.3, 0]}>
        <boxGeometry args={[0.18, 0.01, 0.14]} />
        <meshStandardMaterial color="#f0e8c8" />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAJOR INTERACTIVE LANDMARKS (5 clickable cities)
// ═══════════════════════════════════════════════════════════════════

// ─── Pliska / Ancient Capital ──────────────────────────────────
function PliskaLandmark() {
  const pos = CITY_POSITIONS["ancient-capital"];
  return (
    <group position={pos}>
      {/* Square fortress walls */}
      {[
        [0, 0.3, -1.2], [0, 0.3, 1.2], [-1.2, 0.3, 0], [1.2, 0.3, 0],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i < 2 ? 0 : Math.PI / 2, 0]}>
          <boxGeometry args={[2.4, 0.6, 0.2]} />
          <meshStandardMaterial color="#aaa8a0" roughness={0.8} />
        </mesh>
      ))}
      {/* Corner towers */}
      {[[-1.2, 0, -1.2], [1.2, 0, -1.2], [-1.2, 0, 1.2], [1.2, 0, 1.2]].map(([x, y, z], i) => (
        <mesh key={`t${i}`} position={[x, 0.6, z]}>
          <cylinderGeometry args={[0.15, 0.18, 0.8, 6]} />
          <meshStandardMaterial color="#9a9890" roughness={0.7} />
        </mesh>
      ))}
      {/* Central tower */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 1.2, 6]} />
        <meshStandardMaterial color="#aaa8a0" roughness={0.7} />
      </mesh>
      <Torch position={[-1, 0, -1]} />
      <Torch position={[1, 0, 1]} />
      <BulgarianFlag position={[0, 1.4, 0.5]} offset={0} />
      <BulgarianFlag position={[-1.3, 0.6, 0]} offset={2} />
      <pointLight position={[0, 1.5, 0]} color="#ffc040" intensity={2} distance={8} />
    </group>
  );
}

// ─── Tsarevets / Tarnovo ───────────────────────────────────────
function TsarevetsLandmark() {
  const pos = CITY_POSITIONS["medieval-fortress"];
  return (
    <group position={pos}>
      {/* Hill base */}
      <mesh position={[0, -0.6, 0]}>
        <coneGeometry args={[3.5, 2.5, 8]} />
        <meshStandardMaterial color="#2a4a20" roughness={0.9} />
      </mesh>
      {/* Castle body */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.8, 1.5, 1.5]} />
        <meshStandardMaterial color="#8a8078" roughness={0.7} />
      </mesh>
      {/* Towers with red roofs */}
      {[[-0.9, 0], [0.9, 0], [0, -0.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 1.4, 6]} />
            <meshStandardMaterial color="#8a8078" roughness={0.7} />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <coneGeometry args={[0.3, 0.45, 6]} />
            <meshStandardMaterial color="#8b2020" />
          </mesh>
        </group>
      ))}
      <BulgarianFlag position={[0, 2.2, 0.8]} offset={1} scale={1.2} />
      <Torch position={[-1.3, 0.7, 1]} />
      <Torch position={[1.3, 0.7, -1]} />
      <pointLight position={[0, 3, 0]} color="#ff9040" intensity={2.5} distance={10} />
    </group>
  );
}

// ─── Rila Monastery ─────────────────────────────────────────────
function RilaMonasteryLandmark() {
  const pos = CITY_POSITIONS["rila-monastery"];
  return (
    <group position={pos}>
      {/* White building */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[2.2, 1.2, 1.6]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.6} />
      </mesh>
      {/* Striped arches */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0.82]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 6, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
      ))}
      {/* Dome */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.55, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a2a1a" roughness={0.7} />
      </mesh>
      {/* Golden cross */}
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[0.04, 0.35, 0.04]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.04]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      {/* Light rays (desktop) */}
      {!IS_MOBILE && [
        { r: [0.3, 0.2, 0.1] as [number, number, number], p: [0.6, 2.5, -0.3] as [number, number, number] },
        { r: [-0.2, -0.1, 0.15] as [number, number, number], p: [-0.5, 2.8, 0.2] as [number, number, number] },
      ].map((ray, i) => (
        <mesh key={i} position={ray.p} rotation={ray.r}>
          <planeGeometry args={[1, 3.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <pointLight position={[0, 2.5, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

// ─── Revival Town ───────────────────────────────────────────────
function RevivalTownLandmark() {
  const pos = CITY_POSITIONS["revival-town"];
  const houses = [
    { offset: [-1, 0, -0.5] as [number, number, number], color: "#c8a050", roof: "#8b4513", w: 0.8, h: 0.8 },
    { offset: [0.8, 0, 0.4] as [number, number, number], color: "#b06030", roof: "#6a2a10", w: 0.7, h: 0.7 },
    { offset: [-0.2, 0, 1] as [number, number, number], color: "#5a7a9a", roof: "#3a4a5a", w: 0.75, h: 0.75 },
  ];
  return (
    <group position={pos}>
      {houses.map((h, i) => (
        <group key={i} position={h.offset}>
          <mesh position={[0, h.h / 2, 0]}>
            <boxGeometry args={[h.w, h.h, h.w * 0.7]} />
            <meshStandardMaterial color={h.color} roughness={0.7} />
          </mesh>
          <mesh position={[0, h.h + 0.15, 0]}>
            <coneGeometry args={[h.w * 0.6, 0.35, 4]} />
            <meshStandardMaterial color={h.roof} />
          </mesh>
          {/* Glowing window */}
          <mesh position={[0, h.h * 0.4, h.w * 0.36]}>
            <boxGeometry args={[0.12, 0.12, 0.01]} />
            <meshStandardMaterial emissive="#ffc040" emissiveIntensity={2} color="#ffc040" />
          </mesh>
        </group>
      ))}
      {/* School */}
      <mesh position={[0.3, 0.5, -0.8]}>
        <boxGeometry args={[1.3, 1.0, 0.8]} />
        <meshStandardMaterial color="#d8c8a0" roughness={0.6} />
      </mesh>
      <BookProp position={[0.3, 1.05, -0.8]} />
      {!IS_MOBILE && <SmokeEmitter position={[pos[0] - 1, pos[1] + 1.2, pos[2] - 0.5]} />}
      <pointLight position={[0, 1.5, 0]} color="#ffe0a0" intensity={1.5} distance={7} />
    </group>
  );
}

// ─── Modern Sofia ───────────────────────────────────────────────
function ModernSofiaLandmark() {
  const pos = CITY_POSITIONS["modern-sofia"];
  return (
    <group position={pos}>
      {/* Cathedral */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.5]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.7, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8a832" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cross */}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.04, 0.3, 0.04]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[0.18, 0.04, 0.04]} />
        <meshStandardMaterial color="#c8a832" metalness={0.6} />
      </mesh>
      {/* Modern buildings */}
      {[
        { p: [-1.8, 1, -0.3] as [number, number, number], h: 2, c: "#6a7a8a" },
        { p: [2, 1.2, 0.2] as [number, number, number], h: 2.4, c: "#5a6a7a" },
        { p: [-1, 0.7, 1.3] as [number, number, number], h: 1.4, c: "#7a8a9a" },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={[0.7, b.h, 0.5]} />
          <meshStandardMaterial color={b.c} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      {/* City lights */}
      {[[-1.8, 2.2, -0.3], [2, 2.6, 0.2], [0, 2, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.05, 5, 5]} />
          <meshStandardMaterial emissive="#ffe080" emissiveIntensity={3} color="#ffe080" />
        </mesh>
      ))}
      <BulgarianFlag position={[1, 0.5, 1]} offset={8} />
      <pointLight position={[0, 2.5, 0]} color="#ffe0a0" intensity={1.5} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECORATIVE MAJOR LANDMARKS (visual only)
// ═══════════════════════════════════════════════════════════════════

// ─── 681 Asparukh Foundation Camp ───────────────────────────────
function AsparuhCamp() {
  return (
    <group position={[-10.5, 1.2, 1.8]}>
      {/* Tents */}
      {[[-0.4, 0, 0], [0.4, 0, 0.3], [0, 0, -0.5]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.3 + y, z]}>
          <coneGeometry args={[0.35, 0.6, 5]} />
          <meshStandardMaterial color={i === 0 ? "#8a7a5a" : "#7a6a4a"} roughness={0.8} />
        </mesh>
      ))}
      {/* Fire pit */}
      <mesh position={[0, 0.05, 0.1]}>
        <sphereGeometry args={[0.12, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial emissive="#ff5500" emissiveIntensity={2} color="#ff7730" />
      </mesh>
      <BulgarianFlag position={[0.6, 0, -0.3]} offset={0} />
      <pointLight position={[0, 0.8, 0]} color="#ffc040" intensity={1} distance={4} />
    </group>
  );
}

// ─── Preslav / Golden Age ───────────────────────────────────────
function PreslavLandmark() {
  return (
    <group position={[-5.8, 1.7, -0.8]}>
      {/* Stone building */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.8, 0.7]} />
        <meshStandardMaterial color="#bab0a0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.6, 0.3, 4]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      {/* Book monument */}
      <mesh position={[0.5, 0.5, 0]}>
        <boxGeometry args={[0.25, 0.04, 0.18]} />
        <meshStandardMaterial color="#c8a832" metalness={0.5} />
      </mesh>
      <BookProp position={[-0.5, 0.82, 0]} />
      {/* Golden sparkle light */}
      <pointLight position={[0, 1.2, 0]} color="#ffe8a0" intensity={1.5} distance={5} />
    </group>
  );
}

// ─── Shipka Monument ────────────────────────────────────────────
function ShipkaLandmark() {
  return (
    <group position={[8.1, 2.6, -0.2]}>
      {/* Mountain peak extra */}
      <mesh position={[0, -0.8, 0]}>
        <coneGeometry args={[2, 1.8, 6]} />
        <meshStandardMaterial color="#2a4a20" roughness={0.9} />
      </mesh>
      {/* White obelisk */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.2, 1.5, 0.2]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <coneGeometry args={[0.15, 0.25, 4]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.4} />
      </mesh>
      {/* Hero beam */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.06, 0.2, 2.5, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>
      <BulgarianFlag position={[0.4, 0.8, 0.2]} offset={3} scale={1.1} />
      <Cannon position={[-0.6, 0.1, 0.5]} rotationY={0.3} />
      <Cannon position={[0.7, 0.1, -0.4]} rotationY={-0.5} />
      {!IS_MOBILE && <EmberParticles center={[8.1, 3.2, -0.2]} />}
      <pointLight position={[0, 2.5, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECONDARY DATE MARKERS
// ═══════════════════════════════════════════════════════════════════

function SecondaryMarker({ position, label, color, type }: {
  position: [number, number, number];
  label: string;
  color: string;
  type: "rider" | "faith" | "battle" | "fall" | "book" | "uprising" | "freedom" | "union" | "state" | "modern";
}) {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2 + position[0]) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 6]} />
        <meshStandardMaterial color="#6a6a6a" roughness={0.8} />
      </mesh>
      {/* Icon on top */}
      {type === "faith" && (
        <group>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.03, 0.3, 0.03]} />
            <meshStandardMaterial color="#c8a832" metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[0.15, 0.03, 0.03]} />
            <meshStandardMaterial color="#c8a832" metalness={0.5} />
          </mesh>
        </group>
      )}
      {type === "battle" && (
        <mesh position={[0, 0.42, 0]}>
          <coneGeometry args={[0.1, 0.25, 4]} />
          <meshStandardMaterial color="#aa3030" roughness={0.6} />
        </mesh>
      )}
      {type === "fall" && (
        <mesh position={[0, 0.38, 0]} rotation={[0.15, 0, 0.1]}>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 5]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
        </mesh>
      )}
      {type === "rider" && (
        <mesh position={[0, 0.42, 0]}>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color="#c8a832" metalness={0.4} />
        </mesh>
      )}
      {type === "book" && <BookProp position={[0, 0.32, 0]} />}
      {type === "uprising" && (
        <mesh position={[0, 0.42, 0]}>
          <coneGeometry args={[0.08, 0.25, 6]} />
          <meshStandardMaterial emissive="#ff4a00" emissiveIntensity={1.5} color="#ff6a20" transparent opacity={0.9} />
        </mesh>
      )}
      {(type === "freedom" || type === "state") && (
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial ref={glowRef} color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      )}
      {type === "union" && (
        <group>
          <mesh position={[-0.08, 0.35, 0]}>
            <boxGeometry args={[0.1, 0.15, 0.08]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
          <mesh position={[0.08, 0.35, 0]}>
            <boxGeometry args={[0.1, 0.15, 0.08]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </group>
      )}
      {type === "modern" && (
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.1, 0.18, 0.1]} />
          <meshStandardMaterial color="#8a8a8a" roughness={0.5} />
        </mesh>
      )}
      {/* Floating year label */}
      <Html position={[0, 0.8, 0]} center distanceFactor={45} style={{ pointerEvents: "none" }}>
        <span style={{
          color: color,
          fontSize: "11px",
          fontWeight: 700,
          textShadow: `0 0 6px ${color}40`,
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </Html>
    </group>
  );
}

function AllSecondaryMarkers() {
  const markers: { pos: [number, number, number]; label: string; color: string; type: "rider" | "faith" | "battle" | "fall" | "book" | "uprising" | "freedom" | "union" | "state" | "modern" }[] = [
    { pos: [-9.3, 1.3, 0.8], label: "705 Tervel", color: "#e9d7ae", type: "rider" },
    { pos: [-6.9, 1.4, 0.7], label: "864", color: "#f0ead7", type: "faith" },
    { pos: [-4.2, 1.6, -1.4], label: "917 Aheloy", color: "#cc4444", type: "battle" },
    { pos: [-2.8, 1.5, 0.6], label: "1018", color: "#6d5959", type: "fall" },
    { pos: [0.8, 2.0, -0.8], label: "1205", color: "#cc4444", type: "battle" },
    { pos: [3.9, 1.7, 0.9], label: "1396", color: "#615050", type: "fall" },
    { pos: [4.8, 1.5, 2.0], label: "1762 Paisii", color: "#e2c46f", type: "book" },
    { pos: [7.0, 1.6, 1.1], label: "1876", color: "#cc3333", type: "uprising" },
    { pos: [9.0, 1.8, 0.7], label: "1878", color: "#fff4d8", type: "freedom" },
    { pos: [9.7, 1.6, 0.15], label: "1885", color: "#f0cf79", type: "union" },
    { pos: [11.2, 1.3, 0.2], label: "1908", color: "#f5deb5", type: "state" },
    { pos: [11.9, 1.2, 0.95], label: "1989", color: "#c6c6c6", type: "modern" },
  ];

  return (
    <group>
      {markers.map((m, i) => (
        <SecondaryMarker key={i} position={m.pos} label={m.label} color={m.color} type={m.type} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECORATIVE PROPS
// ═══════════════════════════════════════════════════════════════════

function DecorativeProps() {
  return (
    <group>
      {/* ── FLAGS ── */}
      <BulgarianFlag position={[-10.2, 1.5, 1.7]} offset={0} />
      <BulgarianFlag position={[-5.5, 1.9, -0.5]} offset={1} />
      <BulgarianFlag position={[0.5, 2.2, -0.6]} offset={2} />
      <BulgarianFlag position={[5, 1.6, 2.8]} offset={3} />
      <BulgarianFlag position={[7.5, 2.5, 0]} offset={4} />
      <BulgarianFlag position={[9.2, 1.9, 0.8]} offset={5} />
      <BulgarianFlag position={[11.5, 1.4, 0.4]} offset={6} />

      {/* ── HORSE RIDERS ── */}
      <HorseRider position={[-10.9, 1.1, 1.4]} rotationY={0.4} />
      <HorseRider position={[-9.6, 1.2, 0.5]} rotationY={0.1} />
      <HorseRider position={[-4.5, 1.5, -1.0]} rotationY={-0.4} />
      <HorseRider position={[0.4, 1.9, -0.5]} rotationY={0.8} />
      <HorseRider position={[7.5, 2.3, -0.6]} rotationY={-0.2} />

      {/* ── SOLDIER GROUPS ── */}
      <SoldierGroup position={[-4.0, 1.5, -1.55]} count={5} />
      <SoldierGroup position={[1.0, 1.9, -1.0]} count={5} />
      <SoldierGroup position={[6.8, 1.5, 1.25]} count={4} />
      <SoldierGroup position={[7.8, 2.4, -0.35]} count={6} />

      {/* ── CANNONS ── */}
      <Cannon position={[7.4, 2.3, -0.55]} rotationY={0.3} />
      <Cannon position={[8.5, 2.4, 0.15]} rotationY={-0.2} />
      <Cannon position={[9.2, 1.7, 0.5]} rotationY={0.5} />

      {/* ── TORCHES ── */}
      <Torch position={[-8.45, 1.5, 0.05]} />
      <Torch position={[-7.85, 1.5, 0.05]} />
      <Torch position={[-1.45, 2.6, -0.2]} />
      <Torch position={[-0.95, 2.6, -0.2]} />
      <Torch position={[3.5, 1.6, 0.5]} />
      <Torch position={[9.5, 1.7, 0.3]} />

      {/* ── BOOKS / SCROLLS ── */}
      <BookProp position={[-5.65, 1.9, -0.7]} />
      <BookProp position={[4.9, 1.6, 2.05]} />

      {/* ── MEMORIAL STONES ── */}
      <MemorialStone position={[-2.8, 1.5, 0.65]} />
      <MemorialStone position={[3.95, 1.7, 0.95]} />
      <MemorialStone position={[9.05, 1.8, 0.72]} />
      <MemorialStone position={[11.5, 1.2, 0.6]} />

      {/* ── SMOKE (desktop only) ── */}
      {!IS_MOBILE && (
        <>
          <SmokeEmitter position={[-4.1, 1.8, -1.5]} />
          <SmokeEmitter position={[6.9, 1.8, 1.05]} />
          <SmokeEmitter position={[7.9, 2.8, -0.3]} />
        </>
      )}

      {/* ── EMBERS near battle zones (desktop only) ── */}
      {!IS_MOBILE && (
        <>
          <EmberParticles center={[-4.0, 1.8, -1.4]} />
          <EmberParticles center={[7.0, 1.8, 1.1]} />
        </>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIMELINE PATH + PARTICLES + LABELS
// ═══════════════════════════════════════════════════════════════════

function TimelinePath() {
  const { curve, geo } = useMemo(() => {
    const points = ALL_POI_POSITIONS.map(
      (p) => new THREE.Vector3(p[0], p[1] + 0.5, p[2])
    );
    const c = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    const g = new THREE.TubeGeometry(c, 80, 0.06, 5, false);
    return { curve: c, geo: g };
  }, []);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotCount = IS_MOBILE ? 5 : 10;
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    }
    for (let i = 0; i < dotCount; i++) {
      const dot = dotRefs.current[i];
      if (dot) {
        const progress = ((t * 0.08 + i / dotCount) % 1);
        const p = curve.getPoint(progress);
        dot.position.set(p.x, p.y, p.z);
      }
    }
  });

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial
          ref={matRef}
          color="#d4a832"
          emissive="#d4a832"
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {Array.from({ length: dotCount }, (_, i) => (
        <mesh key={i} ref={(el) => { dotRefs.current[i] = el; }}>
          <sphereGeometry args={[0.08, 5, 5]} />
          <meshStandardMaterial emissive="#ffd700" emissiveIntensity={2} color="#ffd700" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Floating labels for interactive cities ─────────────────────
function FloatingLabel({ position, text }: { position: [number, number, number]; text: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5) * 0.04;
  });
  return (
    <group ref={ref} position={position}>
      <Html center distanceFactor={45} style={{ pointerEvents: "none" }}>
        <span style={{
          color: "#c8a832",
          fontSize: "12px",
          fontWeight: 700,
          textShadow: "0 0 8px rgba(200,168,50,0.6)",
          whiteSpace: "nowrap",
        }}>
          {text}
        </span>
      </Html>
    </group>
  );
}

function MajorNodeLabels() {
  const decoLabels: { pos: [number, number, number]; text: string }[] = [
    { pos: [-10.5, 2.8, 1.8], text: "681 Аспарух" },
    { pos: [-5.8, 3.2, -0.8], text: "Preslav" },
    { pos: [8.1, 4.8, -0.2], text: "Shipka 1877" },
  ];
  const cityLabels = TIMELINE_ORDER.map((id) => {
    const pos = CITY_POSITIONS[id];
    const year = CITY_YEARS[id];
    if (!pos || !year) return null;
    const yOff = id === "medieval-fortress" ? 5 : 3;
    return <FloatingLabel key={id} position={[pos[0], pos[1] + yOff, pos[2]]} text={year} />;
  });

  return (
    <group>
      {cityLabels}
      {decoLabels.map((l, i) => (
        <FloatingLabel key={`d-${i}`} position={l.pos} text={l.text} />
      ))}
    </group>
  );
}

// ─── Golden dust particles ──────────────────────────────────────
function GoldenDust() {
  const count = IS_MOBILE ? 12 : 25;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: Math.random() * 8 + 2,
      z: (Math.random() - 0.5) * 20,
      speed: 0.05 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
    })), [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      dummy.position.set(
        d.x + Math.sin(t * d.speed + d.phase) * 1.5,
        d.y + Math.sin(t * d.speed * 0.7 + d.phase) * 1,
        d.z + Math.cos(t * d.speed * 0.5 + d.phase) * 1
      );
      dummy.scale.setScalar(0.04);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ffd700" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// ─── City label + button (interactive cities) ───────────────────
function CityLabel({
  city, lang, unlocked, completedLevels, onClick,
}: {
  city: City; lang: Language; unlocked: boolean; completedLevels: number; onClick: () => void;
}) {
  const pos = getCityPos(city);
  const yOffset = city.id === "medieval-fortress" ? 6 : 4;
  return (
    <Html position={[pos[0], pos[1] + yOffset, pos[2]]} center distanceFactor={35} style={{ pointerEvents: "auto" }}>
      <button onClick={onClick} className="flex flex-col items-center gap-0.5 select-none" style={{ cursor: unlocked ? "pointer" : "default" }}>
        <span className="text-2xl">{unlocked ? city.emoji : "🔒"}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap" style={{
          background: unlocked ? "rgba(200,168,50,0.2)" : "rgba(0,0,0,0.5)",
          color: unlocked ? "#fbbf24" : "#666",
          border: `1px solid ${unlocked ? "rgba(200,168,50,0.3)" : "rgba(100,100,100,0.3)"}`,
        }}>
          {city.building[lang]}
        </span>
        {unlocked && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="text-[8px]" style={{ opacity: i < completedLevels ? 1 : 0.2 }}>⭐</span>
            ))}
          </span>
        )}
      </button>
    </Html>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCENE + MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════

function SceneContent({ onSelectCity, lang }: { onSelectCity: (city: City) => void; lang: Language }) {
  const { getTopicCompletedLevels } = useProgressStore();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.65} color="#e0d8c8" />
      <directionalLight position={[-12, 25, 8]} intensity={0.85} color="#ffc860" />
      <hemisphereLight color="#87ceeb" groundColor="#5a7a40" intensity={0.35} />

      {/* Sky + ocean */}
      <SkyGradient />
      <DistantClouds />
      <OceanSurface />
      <SeaLabels />

      {/* Relief terrain + rivers */}
      <ReliefTerrain />
      <Rivers />

      {/* ── 5 Interactive landmarks ── */}
      <PliskaLandmark />
      <TsarevetsLandmark />
      <RilaMonasteryLandmark />
      <RevivalTownLandmark />
      <ModernSofiaLandmark />

      {/* ── Decorative major landmarks ── */}
      <AsparuhCamp />
      <PreslavLandmark />
      <ShipkaLandmark />

      {/* ── 12 Secondary date markers ── */}
      <AllSecondaryMarkers />

      {/* ── All decorative props ── */}
      <DecorativeProps />

      {/* Timeline golden path */}
      <TimelinePath />

      {/* Labels */}
      <MajorNodeLabels />

      {/* Particles */}
      <GoldenDust />

      {/* City labels / buttons (5 interactive) */}
      {HISTORY_CITIES.map((city) => (
        <CityLabel
          key={city.id}
          city={city}
          lang={lang}
          unlocked={true}
          completedLevels={getTopicCompletedLevels(city.topicId)}
          onClick={() => onSelectCity(city)}
        />
      ))}
    </>
  );
}

export function HistoryBGMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState<[number, number]>(IS_MOBILE ? [0.8, 1] : [1, 1.5]);

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 18, 28], fov: 48 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: "#0a2a4a" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={[FOG_COLOR, 30, 90]} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={8}
          maxDistance={40}
          enableDamping
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
