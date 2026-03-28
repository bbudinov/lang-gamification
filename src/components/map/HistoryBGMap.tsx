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
const FOG_COLOR = "#6a9ac0";

const historyWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const HISTORY_CITIES = CITIES.filter((c) =>
  historyWorld.topicIds.includes(c.topicId)
);

// ─── City positions on big relief terrain ────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-capital": [-12, 1.2, 1],       // Pliska
  "medieval-fortress": [-1.8, 2.4, -1],   // Tarnovo
  "rila-monastery": [3.5, 2.0, 3.5],      // Rila
  "revival-town": [8.8, 1.3, 3.5],        // Revival
  "modern-sofia": [15, 1.0, 1],           // Modern Bulgaria
};

const CITY_YEARS: Record<string, string> = {
  "ancient-capital": "681",
  "medieval-fortress": "1185",
  "rila-monastery": "10th c.",
  "revival-town": "1800s",
  "modern-sofia": "Today",
};

const TIMELINE_ORDER = [
  "ancient-capital", "medieval-fortress", "rila-monastery", "revival-town", "modern-sofia",
];

// All POI positions chronologically
const ALL_POI_POSITIONS: [number, number, number][] = [
  [-15.2, 0.9, 2.8],    // 681 Asparukh
  [-13.8, 1.0, 2.0],    // 705 Tervel
  [-12, 1.2, 1],         // Pliska
  [-10.2, 1.1, 2.6],    // 864
  [-8.2, 1.3, 0.1],     // Preslav
  [-6.2, 1.2, -1.5],    // 917
  [-3.9, 1.2, 1.2],     // 1018
  [-1.8, 2.4, -1],      // Tarnovo
  [0.8, 1.8, -1.7],     // 1205
  [3.5, 2.0, 3.5],      // Rila
  [4.8, 1.5, 0.4],      // 1396
  [7.1, 1.3, 2.2],      // 1762
  [8.8, 1.3, 3.5],      // Revival
  [9.5, 1.3, 1.2],      // 1876
  [10.2, 2.0, -1.5],    // Shipka
  [12, 1.4, 0.2],       // 1878
  [13.4, 1.2, -0.4],    // 1885
  [15, 1.0, 1],         // Modern
  [16.2, 0.9, 0.2],     // 1908
  [17.2, 0.85, 1.3],    // 1989
];

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ═══════════════════════════════════════════════════════════════════
// SKY + OCEAN
// ═══════════════════════════════════════════════════════════════════

function SkyGradient() {
  return (
    <mesh position={[0, 0, -100]} renderOrder={-1}>
      <planeGeometry args={[300, 180]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          colorTop: { value: new THREE.Color("#142850") },
          colorBottom: { value: new THREE.Color("#8bb8d8") },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={`
          uniform vec3 colorTop, colorBottom;
          varying vec2 vUv;
          void main() { gl_FragColor = vec4(mix(colorBottom, colorTop, smoothstep(0.0, 1.0, vUv.y)), 1.0); }
        `}
      />
    </mesh>
  );
}

function OceanSurface() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.time.value = clock.getElapsedTime();
  });

  return (
    <group>
      {/* Deep base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#04121f" roughness={1} />
      </mesh>
      {/* Animated surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[300, 300, 60, 60]} />
        <shaderMaterial
          ref={ref}
          transparent
          uniforms={{
            time: { value: 0 },
            deepColor: { value: new THREE.Color("#0a2e4a") },
            lightColor: { value: new THREE.Color("#1a5a82") },
          }}
          vertexShader={`
            uniform float time;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              vUv = uv;
              vec3 pos = position;
              float w1 = sin(pos.x * 0.04 + time * 0.6) * 0.3;
              float w2 = sin(pos.y * 0.05 + time * 0.4) * 0.25;
              float w3 = sin((pos.x + pos.y) * 0.03 + time * 0.3) * 0.35;
              pos.z += w1 + w2 + w3;
              vWave = (w1 + w2) * 0.5;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 deepColor, lightColor;
            uniform float time;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              vec3 col = mix(deepColor, lightColor, vWave + 0.5);
              float specular = pow(max(sin(vUv.x * 80.0 + time) * sin(vUv.y * 60.0 + time * 0.7), 0.0), 8.0) * 0.08;
              col += vec3(specular);
              gl_FragColor = vec4(col, 0.94);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function SeaLabels() {
  const labels: { pos: [number, number, number]; text: string }[] = [
    { pos: [22, 0, -2], text: "Black Sea" },
    { pos: [4, 0, 15], text: "Aegean Sea" },
    { pos: [-18, 0, 10], text: "Adriatic Sea" },
  ];
  return (
    <group>
      {labels.map((l, i) => (
        <Html key={i} position={l.pos} center distanceFactor={60} style={{ pointerEvents: "none" }}>
          <span style={{
            color: "#7ab8e0",
            fontSize: "14px",
            fontWeight: 300,
            fontStyle: "italic",
            textShadow: "0 0 12px rgba(10,40,80,0.9)",
            whiteSpace: "nowrap",
            letterSpacing: "3px",
            opacity: 0.65,
          }}>
            {l.text}
          </span>
        </Html>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BIG RELIEF TERRAIN (42x26)
// ═══════════════════════════════════════════════════════════════════

function ReliefTerrain() {
  const { topGeo, topMat, cliffGeo } = useMemo(() => {
    const W = 42, D = 26;
    const geo = new THREE.PlaneGeometry(W, D, IS_MOBILE ? 80 : 120, IS_MOBILE ? 50 : 80);
    geo.rotateX(-Math.PI / 2);
    const posAttr = geo.attributes.position;

    // Separated mountain systems: [cx, cz, spreadX, spreadZ, height]
    const ridges: [number, number, number, number, number][] = [
      // Stara Planina — long ridge, north-center, NOT too tall
      [-5, -4.5, 60, 5, 2.0],
      [-1, -3.8, 40, 5, 2.5],
      [3, -3.2, 35, 5, 2.3],
      [6, -2.5, 25, 5, 2.0],
      [9, -2.0, 20, 5, 1.8],
      // Rila — isolated high mass, south
      [3.5, 3.5, 6, 5, 3.5],
      [4.2, 3.0, 5, 4, 3.0],
      // Pirin — smaller, sharper, next to Rila
      [5.5, 5.0, 4, 3, 2.8],
      // Rhodope — broad, soft, south-east
      [8, 5.5, 18, 10, 1.8],
      [10, 5.0, 15, 8, 1.5],
      // Eastern hills — gentle
      [13, 1.5, 8, 5, 0.9],
      [14.5, 0.5, 6, 4, 0.7],
      // Shipka peak area
      [10.2, -1.5, 4, 3, 2.5],
    ];

    // Rolling base
    const hills: [number, number, number, number][] = [
      [-10, 1, 120, 0.6],
      [0, 2, 80, 0.5],
      [10, -1, 60, 0.4],
      [-5, 5, 100, 0.3],
      [14, 0, 50, 0.3],
    ];

    // River cuts
    const cuts: [number, number, number, number, number][] = [
      [0, -9, 400, 2, 0.4],   // Danube northern edge
      [6, 4, 20, 3, 0.35],    // Maritsa
      [1, 0, 5, 12, 0.25],    // Iskar
    ];

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      let y = 0.5;

      for (const [cx, cz, sx, sz, height] of ridges) {
        y += Math.exp(-((x - cx) ** 2 / sx + (z - cz) ** 2 / sz)) * height;
      }
      for (const [cx, cz, spread, height] of hills) {
        y += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / spread) * height;
      }
      for (const [cx, cz, sx, sz, depth] of cuts) {
        y -= Math.exp(-((x - cx) ** 2 / sx + (z - cz) ** 2 / sz)) * depth;
      }

      // Edge falloff
      const ex = Math.abs(x) / (W / 2);
      const ez = Math.abs(z) / (D / 2);
      const edge = Math.max(ex, ez);
      if (edge > 0.8) {
        const f = (edge - 0.8) / 0.2;
        y = THREE.MathUtils.lerp(y, -0.5, Math.min(f * f, 1));
      }

      posAttr.setY(i, y);
    }
    geo.computeVertexNormals();

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

          vec3 lowland = vec3(0.40, 0.54, 0.28);
          vec3 midland = vec3(0.35, 0.48, 0.26);
          vec3 highland = vec3(0.50, 0.44, 0.34);
          vec3 peak = vec3(0.75, 0.72, 0.65);
          vec3 snow = vec3(0.90, 0.88, 0.84);

          vec3 col;
          if (h < 0.8) col = lowland;
          else if (h < 1.5) col = mix(lowland, midland, (h - 0.8) / 0.7);
          else if (h < 2.5) col = mix(midland, highland, (h - 1.5) / 1.0);
          else if (h < 3.5) col = mix(highland, peak, (h - 2.5) / 1.0);
          else col = mix(peak, snow, clamp((h - 3.5) / 1.5, 0.0, 1.0));

          if (slope > 0.35) {
            vec3 rock = vec3(0.46, 0.43, 0.38);
            col = mix(col, rock, smoothstep(0.35, 0.65, slope));
          }
          if (h < 0.2) {
            vec3 sand = vec3(0.70, 0.63, 0.46);
            col = mix(col, sand, smoothstep(0.2, -0.1, h));
          }

          // Subtle flag gradient overlay
          float t = clamp((vWorldPos.x + 21.0) / 42.0, 0.0, 1.0);
          vec3 fW = vec3(0.95, 0.93, 0.88);
          vec3 fG = vec3(0.22, 0.52, 0.22);
          vec3 fR = vec3(0.55, 0.18, 0.15);
          vec3 fCol = t < 0.5 ? mix(fW, fG, t * 2.0) : mix(fG, fR, (t - 0.5) * 2.0);
          col = mix(col, fCol, 0.1);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    // Diorama cliff edges
    const cliffShape = new THREE.Shape();
    const hw = W / 2, hd = D / 2, r = 2;
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
    const ins = 0.8;
    inner.moveTo(-hw + r + ins, -hd + ins);
    inner.lineTo(hw - r - ins, -hd + ins);
    inner.quadraticCurveTo(hw - ins, -hd + ins, hw - ins, -hd + r + ins);
    inner.lineTo(hw - ins, hd - r - ins);
    inner.quadraticCurveTo(hw - ins, hd - ins, hw - r - ins, hd - ins);
    inner.lineTo(-hw + r + ins, hd - ins);
    inner.quadraticCurveTo(-hw + ins, hd - ins, -hw + ins, hd - r - ins);
    inner.lineTo(-hw + ins, -hd + r + ins);
    inner.quadraticCurveTo(-hw + ins, -hd + ins, -hw + r + ins, -hd + ins);
    cliffShape.holes.push(inner);

    const cGeo = new THREE.ExtrudeGeometry(cliffShape, { depth: 1.8, bevelEnabled: false });
    cGeo.rotateX(-Math.PI / 2);
    cGeo.translate(0, -1.2, 0);

    return { topGeo: geo, topMat: mat, cliffGeo: cGeo };
  }, []);

  return (
    <group>
      <mesh geometry={topGeo} material={topMat} />
      <mesh geometry={cliffGeo}>
        <meshStandardMaterial color="#5a4a38" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[40, 24]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── Rivers ─────────────────────────────────────────────────────
function Rivers() {
  const makeSmooth = (pts: [number, number, number][]) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.5);
    return curve.getPoints(50).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  };
  return (
    <group>
      {/* Danube */}
      <Line points={makeSmooth([[-20, 0.55, -9], [-14, 0.6, -8.5], [-8, 0.65, -8], [-2, 0.7, -7.5], [4, 0.65, -7], [10, 0.6, -6.5], [16, 0.55, -6], [20, 0.45, -5.5]])} color="#4a8cc4" lineWidth={3.5} />
      {/* Maritsa */}
      <Line points={makeSmooth([[3.5, 1.6, 3.5], [5.5, 1.2, 4.5], [8, 0.9, 5.5], [11, 0.6, 7], [14, 0.4, 8.5]])} color="#4a8cc4" lineWidth={2.5} />
      {/* Iskar */}
      <Line points={makeSmooth([[0.5, 1.8, 1], [1, 1.5, -1], [1.5, 1.2, -3], [2, 0.9, -5], [2.5, 0.6, -7]])} color="#4a8cc4" lineWidth={2} />
      {/* Struma */}
      <Line points={makeSmooth([[2, 1.8, 4], [1.5, 1.3, 6], [1, 0.8, 8], [0.5, 0.5, 10]])} color="#4a8cc4" lineWidth={1.5} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REUSABLE PROPS
// ═══════════════════════════════════════════════════════════════════

function BulgarianFlag({ position, scale = 1, offset = 0 }: { position: [number, number, number]; scale?: number; offset?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 2 + offset) * 0.08; });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.03, 1.2, 5]} /><meshStandardMaterial color="#777" metalness={0.5} /></mesh>
      <mesh position={[0.22, 1.12, 0]}><boxGeometry args={[0.4, 0.1, 0.015]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.22, 1.22, 0]}><boxGeometry args={[0.4, 0.1, 0.015]} /><meshStandardMaterial color="#009b3a" /></mesh>
      <mesh position={[0.22, 1.02, 0]}><boxGeometry args={[0.4, 0.1, 0.015]} /><meshStandardMaterial color="#d62612" /></mesh>
    </group>
  );
}

function Torch({ position }: { position: [number, number, number] }) {
  const lRef = useRef<THREE.PointLight>(null);
  const sRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const f = 0.7 + Math.sin(clock.getElapsedTime() * 8 + position[0] * 3) * 0.3;
    if (lRef.current) lRef.current.intensity = f * 1.5;
    if (sRef.current) sRef.current.scale.setScalar(0.8 + f * 0.3);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.05, 0.07, 0.6, 5]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
      <mesh ref={sRef} position={[0, 0.7, 0]}><sphereGeometry args={[0.12, 6, 6]} /><meshStandardMaterial emissive="#ff6a00" emissiveIntensity={2} color="#ff8a20" /></mesh>
      <pointLight ref={lRef} position={[0, 0.8, 0]} color="#ff8a20" intensity={1.5} distance={5} />
    </group>
  );
}

function HorseRider({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.7, 0.35, 0.3]} /><meshStandardMaterial color="#5a3a1a" roughness={0.8} /></mesh>
      <mesh position={[0.4, 0.55, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.2, 0.3, 0.15]} /><meshStandardMaterial color="#5a3a1a" roughness={0.8} /></mesh>
      {[[-0.2, 0.08, 0.1], [-0.2, 0.08, -0.1], [0.2, 0.08, 0.1], [0.2, 0.08, -0.1]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.03, 0.03, 0.35, 4]} /><meshStandardMaterial color="#4a2a0a" /></mesh>
      ))}
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.08, 0.1, 0.3, 5]} /><meshStandardMaterial color="#3a5a3a" /></mesh>
      <mesh position={[0, 0.92, 0]}><sphereGeometry args={[0.08, 6, 6]} /><meshStandardMaterial color="#d4a574" /></mesh>
      <mesh position={[0.1, 0.9, 0.12]} rotation={[0.1, 0, 0.15]}><cylinderGeometry args={[0.015, 0.015, 0.8, 4]} /><meshStandardMaterial color="#888" metalness={0.4} /></mesh>
    </group>
  );
}

function SoldierGroup({ position, count = 4 }: { position: [number, number, number]; count?: number }) {
  const soldiers = useMemo(() => Array.from({ length: count }, (_, i) => ({
    dx: (i - count / 2) * 0.3 + (Math.random() - 0.5) * 0.15,
    dz: (Math.random() - 0.5) * 0.4,
    h: 0.35 + Math.random() * 0.1,
  })), [count]);
  return (
    <group position={position}>
      {soldiers.map((s, i) => (
        <group key={i} position={[s.dx, 0, s.dz]}>
          <mesh position={[0, s.h / 2, 0]}><cylinderGeometry args={[0.05, 0.06, s.h, 5]} /><meshStandardMaterial color="#4a4a5a" /></mesh>
          <mesh position={[0, s.h + 0.06, 0]}><sphereGeometry args={[0.05, 5, 5]} /><meshStandardMaterial color="#d4a574" /></mesh>
          {i % 2 === 0 && <mesh position={[0.08, s.h * 0.4, 0.05]}><circleGeometry args={[0.06, 6]} /><meshStandardMaterial color="#8a7a4a" metalness={0.3} /></mesh>}
        </group>
      ))}
    </group>
  );
}

function Cannon({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.08, 0.5, 6]} /><meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} /></mesh>
      {[-0.08, 0.08].map((z, i) => (
        <mesh key={i} position={[-0.1, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.03, 8]} /><meshStandardMaterial color="#5a3a1a" /></mesh>
      ))}
    </group>
  );
}

function SmokeEmitter({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const data = useMemo(() => Array.from({ length: 4 }, (_, i) => ({ offset: i * 0.8, speed: 0.25 + Math.random() * 0.15, idx: i })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d) => {
      const m = refs.current[d.idx];
      if (m) {
        const cycle = ((t * d.speed + d.offset) % 3.5) / 3.5;
        m.position.set(position[0] + Math.sin(t + d.idx) * 0.12, position[1] + cycle * 2, position[2] + Math.cos(t * 0.7 + d.idx) * 0.1);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.1 * (1 - cycle);
      }
    });
  });
  return (
    <group>{data.map((d) => (
      <mesh key={d.idx} ref={(el) => { refs.current[d.idx] = el; }} position={[position[0], position[1], position[2]]}>
        <sphereGeometry args={[0.12, 5, 5]} /><meshBasicMaterial color="#888" transparent opacity={0.1} />
      </mesh>
    ))}</group>
  );
}

function EmberParticles({ center }: { center: [number, number, number] }) {
  const count = 5;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => Array.from({ length: count }, () => ({
    rx: (Math.random() - 0.5) * 1.5, rz: (Math.random() - 0.5) * 1.5,
    speed: 0.3 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2,
  })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const cycle = ((t * d.speed + d.phase) % 3) / 3;
      dummy.position.set(center[0] + d.rx + Math.sin(t + d.phase) * 0.3, center[1] + 0.5 + cycle * 2, center[2] + d.rz);
      dummy.scale.setScalar(0.03 * (1 - cycle));
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} /><meshBasicMaterial color="#ff6a20" transparent opacity={0.8} />
    </instancedMesh>
  );
}

function MemorialStone({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh position={[0, 0.2, 0]}><boxGeometry args={[0.25, 0.4, 0.12]} /><meshStandardMaterial color="#6a6a6a" roughness={0.9} /></mesh></group>;
}

function BookProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} rotation={[0.1, 0.3, 0]}><boxGeometry args={[0.2, 0.05, 0.15]} /><meshStandardMaterial color="#8a6a30" roughness={0.7} /></mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0.1, 0.3, 0]}><boxGeometry args={[0.18, 0.01, 0.14]} /><meshStandardMaterial color="#f0e8c8" /></mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAJOR INTERACTIVE LANDMARKS (5 clickable)
// ═══════════════════════════════════════════════════════════════════

function PliskaLandmark() {
  const pos = CITY_POSITIONS["ancient-capital"];
  return (
    <group position={pos}>
      {[[0, 0.3, -1.2], [0, 0.3, 1.2], [-1.2, 0.3, 0], [1.2, 0.3, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i < 2 ? 0 : Math.PI / 2, 0]}>
          <boxGeometry args={[2.4, 0.6, 0.2]} /><meshStandardMaterial color="#aaa8a0" roughness={0.8} />
        </mesh>
      ))}
      {[[-1.2, 0.6, -1.2], [1.2, 0.6, -1.2], [-1.2, 0.6, 1.2], [1.2, 0.6, 1.2]].map(([x, y, z], i) => (
        <mesh key={`t${i}`} position={[x, y, z]}><cylinderGeometry args={[0.15, 0.18, 0.8, 6]} /><meshStandardMaterial color="#9a9890" roughness={0.7} /></mesh>
      ))}
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.3, 0.35, 1.2, 6]} /><meshStandardMaterial color="#aaa8a0" roughness={0.7} /></mesh>
      <Torch position={[-1, 0, -1]} /><Torch position={[1, 0, 1]} />
      <BulgarianFlag position={[0, 1.4, 0.5]} /><BulgarianFlag position={[-1.3, 0.6, 0]} offset={2} />
      <pointLight position={[0, 1.5, 0]} color="#ffc040" intensity={2} distance={8} />
    </group>
  );
}

function TsarevetsLandmark() {
  const pos = CITY_POSITIONS["medieval-fortress"];
  return (
    <group position={pos}>
      <mesh position={[0, -0.6, 0]}><coneGeometry args={[3.5, 2.5, 8]} /><meshStandardMaterial color="#2a4a20" roughness={0.9} /></mesh>
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[1.8, 1.5, 1.5]} /><meshStandardMaterial color="#8a8078" roughness={0.7} /></mesh>
      {[[-0.9, 0], [0.9, 0], [0, -0.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.2, 0.25, 1.4, 6]} /><meshStandardMaterial color="#8a8078" roughness={0.7} /></mesh>
          <mesh position={[0, 3, 0]}><coneGeometry args={[0.3, 0.45, 6]} /><meshStandardMaterial color="#8b2020" /></mesh>
        </group>
      ))}
      <BulgarianFlag position={[0, 2.2, 0.8]} offset={1} scale={1.2} />
      <Torch position={[-1.3, 0.7, 1]} /><Torch position={[1.3, 0.7, -1]} />
      <pointLight position={[0, 3, 0]} color="#ff9040" intensity={2.5} distance={10} />
    </group>
  );
}

function RilaMonasteryLandmark() {
  const pos = CITY_POSITIONS["rila-monastery"];
  return (
    <group position={pos}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[2.2, 1.2, 1.6]} /><meshStandardMaterial color="#e8e0d0" roughness={0.6} /></mesh>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0.82]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.08, 6, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
      ))}
      <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.55, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#5a2a1a" roughness={0.7} /></mesh>
      <mesh position={[0, 2.15, 0]}><boxGeometry args={[0.04, 0.35, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      <mesh position={[0, 2.25, 0]}><boxGeometry args={[0.2, 0.04, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      {!IS_MOBILE && [
        { r: [0.3, 0.2, 0.1] as [number, number, number], p: [0.6, 2.5, -0.3] as [number, number, number] },
        { r: [-0.2, -0.1, 0.15] as [number, number, number], p: [-0.5, 2.8, 0.2] as [number, number, number] },
      ].map((ray, i) => (
        <mesh key={i} position={ray.p} rotation={ray.r}><planeGeometry args={[1, 3.5]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} /></mesh>
      ))}
      <pointLight position={[0, 2.5, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

function RevivalTownLandmark() {
  const pos = CITY_POSITIONS["revival-town"];
  const houses = [
    { off: [-1, 0, -0.5] as [number, number, number], color: "#c8a050", roof: "#8b4513", w: 0.8 },
    { off: [0.8, 0, 0.4] as [number, number, number], color: "#b06030", roof: "#6a2a10", w: 0.7 },
    { off: [-0.2, 0, 1] as [number, number, number], color: "#5a7a9a", roof: "#3a4a5a", w: 0.75 },
  ];
  return (
    <group position={pos}>
      {houses.map((h, i) => (
        <group key={i} position={h.off}>
          <mesh position={[0, h.w / 2, 0]}><boxGeometry args={[h.w, h.w, h.w * 0.7]} /><meshStandardMaterial color={h.color} roughness={0.7} /></mesh>
          <mesh position={[0, h.w + 0.15, 0]}><coneGeometry args={[h.w * 0.6, 0.35, 4]} /><meshStandardMaterial color={h.roof} /></mesh>
          <mesh position={[0, h.w * 0.4, h.w * 0.36]}><boxGeometry args={[0.12, 0.12, 0.01]} /><meshStandardMaterial emissive="#ffc040" emissiveIntensity={2} color="#ffc040" /></mesh>
        </group>
      ))}
      <mesh position={[0.3, 0.5, -0.8]}><boxGeometry args={[1.3, 1.0, 0.8]} /><meshStandardMaterial color="#d8c8a0" roughness={0.6} /></mesh>
      <BookProp position={[0.3, 1.05, -0.8]} />
      {!IS_MOBILE && <SmokeEmitter position={[pos[0] - 1, pos[1] + 1.2, pos[2] - 0.5]} />}
      <pointLight position={[0, 1.5, 0]} color="#ffe0a0" intensity={1.5} distance={7} />
    </group>
  );
}

function ModernSofiaLandmark() {
  const pos = CITY_POSITIONS["modern-sofia"];
  return (
    <group position={pos}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.8, 1.2, 1.5]} /><meshStandardMaterial color="#d8d0c0" roughness={0.6} /></mesh>
      <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.7, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c8a832" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 2.3, 0]}><boxGeometry args={[0.04, 0.3, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      <mesh position={[0, 2.4, 0]}><boxGeometry args={[0.18, 0.04, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      {[
        { p: [-1.8, 1, -0.3] as [number, number, number], h: 2, c: "#6a7a8a" },
        { p: [2, 1.2, 0.2] as [number, number, number], h: 2.4, c: "#5a6a7a" },
        { p: [-1, 0.7, 1.3] as [number, number, number], h: 1.4, c: "#7a8a9a" },
      ].map((b, i) => (
        <mesh key={i} position={b.p}><boxGeometry args={[0.7, b.h, 0.5]} /><meshStandardMaterial color={b.c} roughness={0.5} metalness={0.2} /></mesh>
      ))}
      {[[-1.8, 2.2, -0.3], [2, 2.6, 0.2], [0, 2, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.05, 5, 5]} /><meshStandardMaterial emissive="#ffe080" emissiveIntensity={3} color="#ffe080" /></mesh>
      ))}
      <BulgarianFlag position={[1, 0.5, 1]} offset={8} />
      <pointLight position={[0, 2.5, 0]} color="#ffe0a0" intensity={1.5} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECORATIVE MAJOR LANDMARKS
// ═══════════════════════════════════════════════════════════════════

function AsparuhCamp() {
  return (
    <group position={[-15.2, 0.9, 2.8]}>
      {[[-0.4, 0, 0], [0.4, 0, 0.3], [0, 0, -0.5]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.3 + y, z]}><coneGeometry args={[0.35, 0.6, 5]} /><meshStandardMaterial color={i === 0 ? "#8a7a5a" : "#7a6a4a"} roughness={0.8} /></mesh>
      ))}
      <mesh position={[0, 0.05, 0.1]}><sphereGeometry args={[0.12, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial emissive="#ff5500" emissiveIntensity={2} color="#ff7730" /></mesh>
      <BulgarianFlag position={[0.6, 0, -0.3]} />
      <pointLight position={[0, 0.8, 0]} color="#ffc040" intensity={1} distance={4} />
    </group>
  );
}

function PreslavLandmark() {
  return (
    <group position={[-8.2, 1.3, 0.1]}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[1, 0.8, 0.7]} /><meshStandardMaterial color="#bab0a0" roughness={0.7} /></mesh>
      <mesh position={[0, 0.9, 0]}><coneGeometry args={[0.6, 0.3, 4]} /><meshStandardMaterial color="#6a5a4a" /></mesh>
      <mesh position={[0.5, 0.5, 0]}><boxGeometry args={[0.25, 0.04, 0.18]} /><meshStandardMaterial color="#c8a832" metalness={0.5} /></mesh>
      <BookProp position={[-0.5, 0.82, 0]} />
      <pointLight position={[0, 1.2, 0]} color="#ffe8a0" intensity={1.5} distance={5} />
    </group>
  );
}

function ShipkaLandmark() {
  return (
    <group position={[10.2, 2.0, -1.5]}>
      <mesh position={[0, -0.6, 0]}><coneGeometry args={[2.5, 2, 6]} /><meshStandardMaterial color="#2a4a20" roughness={0.9} /></mesh>
      <mesh position={[0, 1, 0]}><boxGeometry args={[0.2, 1.5, 0.2]} /><meshStandardMaterial color="#e8e8e8" roughness={0.4} /></mesh>
      <mesh position={[0, 1.85, 0]}><coneGeometry args={[0.15, 0.25, 4]} /><meshStandardMaterial color="#e8e8e8" roughness={0.4} /></mesh>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.06, 0.2, 2.5, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.06} /></mesh>
      <BulgarianFlag position={[0.4, 0.8, 0.2]} offset={3} scale={1.1} />
      <Cannon position={[-0.8, 0.1, 0.6]} rotationY={0.3} />
      <Cannon position={[0.9, 0.1, -0.5]} rotationY={-0.5} />
      <Cannon position={[-0.3, 0.1, -0.8]} rotationY={0.8} />
      {!IS_MOBILE && <EmberParticles center={[10.2, 2.8, -1.5]} />}
      <pointLight position={[0, 2.5, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECONDARY DATE MARKERS
// ═══════════════════════════════════════════════════════════════════

function SecondaryMarker({ position, label, color, type, labelSide = "right" }: {
  position: [number, number, number]; label: string; color: string; labelSide?: "left" | "right";
  type: "rider" | "faith" | "battle" | "fall" | "book" | "uprising" | "freedom" | "union" | "state" | "modern";
}) {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) glowRef.current.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2 + position[0]) * 0.2;
  });
  const lx = labelSide === "left" ? -0.7 : 0.7;

  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.18, 0.22, 0.3, 6]} /><meshStandardMaterial color="#6a6a6a" roughness={0.8} /></mesh>
      {type === "faith" && (<group><mesh position={[0, 0.45, 0]}><boxGeometry args={[0.03, 0.3, 0.03]} /><meshStandardMaterial color="#c8a832" metalness={0.5} /></mesh><mesh position={[0, 0.52, 0]}><boxGeometry args={[0.15, 0.03, 0.03]} /><meshStandardMaterial color="#c8a832" metalness={0.5} /></mesh></group>)}
      {type === "battle" && <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.1, 0.25, 4]} /><meshStandardMaterial color="#aa3030" roughness={0.6} /></mesh>}
      {type === "fall" && <mesh position={[0, 0.38, 0]} rotation={[0.15, 0, 0.1]}><cylinderGeometry args={[0.06, 0.08, 0.3, 5]} /><meshStandardMaterial color="#4a4a4a" roughness={0.9} /></mesh>}
      {type === "rider" && <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.08, 0.2, 4]} /><meshStandardMaterial color="#c8a832" metalness={0.4} /></mesh>}
      {type === "book" && <BookProp position={[0, 0.32, 0]} />}
      {type === "uprising" && <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.08, 0.25, 6]} /><meshStandardMaterial emissive="#ff4a00" emissiveIntensity={1.5} color="#ff6a20" transparent opacity={0.9} /></mesh>}
      {(type === "freedom" || type === "state") && <mesh position={[0, 0.42, 0]}><sphereGeometry args={[0.08, 6, 6]} /><meshStandardMaterial ref={glowRef} color={color} emissive={color} emissiveIntensity={0.4} /></mesh>}
      {type === "union" && (<group><mesh position={[-0.08, 0.35, 0]}><boxGeometry args={[0.1, 0.15, 0.08]} /><meshStandardMaterial color="#e0e0e0" /></mesh><mesh position={[0.08, 0.35, 0]}><boxGeometry args={[0.1, 0.15, 0.08]} /><meshStandardMaterial color="#e0e0e0" /></mesh></group>)}
      {type === "modern" && <mesh position={[0, 0.38, 0]}><boxGeometry args={[0.1, 0.18, 0.1]} /><meshStandardMaterial color="#8a8a8a" roughness={0.5} /></mesh>}
      {/* Label offset to side to avoid crowding */}
      <Html position={[lx, 0.6, 0]} center distanceFactor={50} style={{ pointerEvents: "none" }}>
        <span style={{ color, fontSize: "10px", fontWeight: 700, textShadow: `0 0 5px ${color}40`, whiteSpace: "nowrap" }}>{label}</span>
      </Html>
    </group>
  );
}

function AllSecondaryMarkers() {
  const m: { pos: [number, number, number]; label: string; color: string; type: "rider" | "faith" | "battle" | "fall" | "book" | "uprising" | "freedom" | "union" | "state" | "modern"; side: "left" | "right" }[] = [
    { pos: [-13.8, 1.0, 2.0], label: "705 Tervel", color: "#e9d7ae", type: "rider", side: "right" },
    { pos: [-10.2, 1.1, 2.6], label: "864", color: "#f0ead7", type: "faith", side: "left" },
    { pos: [-6.2, 1.2, -1.5], label: "917 Aheloy", color: "#cc4444", type: "battle", side: "right" },
    { pos: [-3.9, 1.2, 1.2], label: "1018", color: "#6d5959", type: "fall", side: "left" },
    { pos: [0.8, 1.8, -1.7], label: "1205", color: "#cc4444", type: "battle", side: "right" },
    { pos: [4.8, 1.5, 0.4], label: "1396", color: "#615050", type: "fall", side: "left" },
    { pos: [7.1, 1.3, 2.2], label: "1762 Paisii", color: "#e2c46f", type: "book", side: "right" },
    { pos: [9.5, 1.3, 1.2], label: "1876", color: "#cc3333", type: "uprising", side: "left" },
    { pos: [12, 1.4, 0.2], label: "1878", color: "#fff4d8", type: "freedom", side: "right" },
    { pos: [13.4, 1.2, -0.4], label: "1885", color: "#f0cf79", type: "union", side: "left" },
    { pos: [16.2, 0.9, 0.2], label: "1908", color: "#f5deb5", type: "state", side: "right" },
    { pos: [17.2, 0.85, 1.3], label: "1989", color: "#c6c6c6", type: "modern", side: "left" },
  ];
  return <group>{m.map((x, i) => <SecondaryMarker key={i} position={x.pos} label={x.label} color={x.color} type={x.type} labelSide={x.side} />)}</group>;
}

// ═══════════════════════════════════════════════════════════════════
// ALL DECORATIVE PROPS — MANY MORE
// ═══════════════════════════════════════════════════════════════════

function DecorativeProps() {
  return (
    <group>
      {/* ── FLAGS (12) ── */}
      {[
        [-15, 1.15, 2.9], [-12.1, 1.5, 1], [-10, 1.3, 2.8], [-8.3, 1.6, 0],
        [-1.8, 3.0, -0.8], [3.4, 2.6, 3.5], [5, 1.5, 0.8], [8.7, 1.5, 3.5],
        [10.1, 2.6, -1.5], [12, 1.7, 0.2], [15, 1.6, 1], [16.5, 1.1, 0.5],
      ].map(([x, y, z], i) => (
        <BulgarianFlag key={`f${i}`} position={[x, y, z]} offset={i} />
      ))}

      {/* ── HORSE RIDERS (8) ── */}
      {[
        { p: [-16, 0.8, 2.2], r: 0.4 }, { p: [-14.5, 0.9, 2.8], r: 0.1 },
        { p: [-13.3, 0.95, 1.5], r: -0.3 }, { p: [-6.8, 1.1, -1], r: -0.4 },
        { p: [-0.3, 2.0, -0.7], r: 0.8 }, { p: [0.9, 1.9, -1], r: -0.2 },
        { p: [7.5, 1.3, 2.8], r: 0.5 }, { p: [11, 1.3, 0.5], r: -0.3 },
      ].map((h, i) => (
        <HorseRider key={`hr${i}`} position={h.p as [number, number, number]} rotationY={h.r} />
      ))}

      {/* ── SOLDIER GROUPS (10) ── */}
      {[
        { p: [-6.4, 1.1, -1.8], c: 5 }, { p: [-5.7, 1.1, -1.4], c: 4 },
        { p: [0.5, 1.8, -1.8], c: 5 }, { p: [1.2, 1.8, -1.3], c: 4 },
        { p: [9.2, 1.3, 1.4], c: 4 }, { p: [9.8, 1.3, 1.0], c: 5 },
        { p: [9.8, 1.9, -1.7], c: 6 }, { p: [10.6, 1.9, -1.3], c: 5 },
        { p: [11, 1.85, -1.9], c: 5 }, { p: [12.5, 1.35, 0.5], c: 4 },
      ].map((s, i) => (
        <SoldierGroup key={`sg${i}`} position={s.p as [number, number, number]} count={s.c} />
      ))}

      {/* ── CANNONS (8) ── */}
      {[
        { p: [9.7, 1.8, -1.9], r: 0.3 }, { p: [10.4, 1.85, -1.6], r: -0.2 },
        { p: [10.9, 1.8, -1.2], r: 0.5 }, { p: [11.3, 1.75, -1.5], r: -0.4 },
        { p: [9.3, 1.3, 0.8], r: 0.7 }, { p: [12.2, 1.4, -0.3], r: 0.1 },
        { p: [-6, 1.15, -2], r: -0.6 }, { p: [0.6, 1.85, -2], r: 0.4 },
      ].map((c, i) => (
        <Cannon key={`cn${i}`} position={c.p as [number, number, number]} rotationY={c.r} />
      ))}

      {/* ── TORCHES (8) ── */}
      {[
        [-12.5, 1.2, 0.5], [-11.5, 1.2, 1.5],
        [-2.2, 2.3, -0.8], [-1.4, 2.3, -1.2],
        [3, 1.9, 3], [4, 2.0, 4],
        [9.5, 1.6, 0.5], [14.5, 1.0, 0.8],
      ].map(([x, y, z], i) => (
        <Torch key={`tc${i}`} position={[x, y, z]} />
      ))}

      {/* ── BOOKS ── */}
      <BookProp position={[-8, 1.5, 0.3]} />
      <BookProp position={[7.2, 1.4, 2.4]} />
      <BookProp position={[-10, 1.2, 2.8]} />

      {/* ── MEMORIAL STONES ── */}
      {[[-3.9, 1.2, 1.2], [4.8, 1.5, 0.4], [12, 1.4, 0.2], [13.4, 1.2, -0.4], [16, 0.9, 0.4]].map(([x, y, z], i) => (
        <MemorialStone key={`ms${i}`} position={[x, y, z]} />
      ))}

      {/* ── SMOKE (desktop) ── */}
      {!IS_MOBILE && (
        <>
          <SmokeEmitter position={[-6, 1.4, -1.5]} />
          <SmokeEmitter position={[9.5, 1.5, 1.1]} />
          <SmokeEmitter position={[10.5, 2.3, -1.5]} />
          <SmokeEmitter position={[8.8, 1.5, 3.7]} />
        </>
      )}

      {/* ── EMBERS near battles (desktop) ── */}
      {!IS_MOBILE && (
        <>
          <EmberParticles center={[-6.2, 1.4, -1.5]} />
          <EmberParticles center={[0.8, 2, -1.7]} />
          <EmberParticles center={[9.5, 1.5, 1.2]} />
        </>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIMELINE + LABELS + PARTICLES
// ═══════════════════════════════════════════════════════════════════

function TimelinePath() {
  const { curve, geo } = useMemo(() => {
    const pts = ALL_POI_POSITIONS.map((p) => new THREE.Vector3(p[0], p[1] + 0.4, p[2]));
    const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    const g = new THREE.TubeGeometry(c, 100, 0.05, 5, false);
    return { curve: c, geo: g };
  }, []);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotCount = IS_MOBILE ? 6 : 12;
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) matRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    for (let i = 0; i < dotCount; i++) {
      const dot = dotRefs.current[i];
      if (dot) {
        const p = curve.getPoint((t * 0.06 + i / dotCount) % 1);
        dot.position.set(p.x, p.y, p.z);
      }
    }
  });

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial ref={matRef} color="#d4a832" emissive="#d4a832" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      {Array.from({ length: dotCount }, (_, i) => (
        <mesh key={i} ref={(el) => { dotRefs.current[i] = el; }}>
          <sphereGeometry args={[0.07, 5, 5]} /><meshStandardMaterial emissive="#ffd700" emissiveIntensity={2} color="#ffd700" />
        </mesh>
      ))}
    </group>
  );
}

function FloatingLabel({ position, text }: { position: [number, number, number]; text: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5) * 0.04; });
  return (
    <group ref={ref} position={position}>
      <Html center distanceFactor={50} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#c8a832", fontSize: "11px", fontWeight: 700, textShadow: "0 0 8px rgba(200,168,50,0.6)", whiteSpace: "nowrap" }}>{text}</span>
      </Html>
    </group>
  );
}

function MajorNodeLabels() {
  const deco: { pos: [number, number, number]; text: string }[] = [
    { pos: [-15.2, 2.4, 2.8], text: "681 Аспарух" },
    { pos: [-8.2, 2.6, 0.1], text: "Preslav" },
    { pos: [10.2, 4.2, -1.5], text: "Shipka 1877" },
  ];
  const cityLabels = TIMELINE_ORDER.map((id) => {
    const pos = CITY_POSITIONS[id];
    const year = CITY_YEARS[id];
    if (!pos || !year) return null;
    const yOff = id === "medieval-fortress" ? 4.5 : 2.8;
    return <FloatingLabel key={id} position={[pos[0], pos[1] + yOff, pos[2]]} text={year} />;
  });
  return <group>{cityLabels}{deco.map((l, i) => <FloatingLabel key={`d${i}`} position={l.pos} text={l.text} />)}</group>;
}

function GoldenDust() {
  const count = IS_MOBILE ? 15 : 30;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 45, y: Math.random() * 8 + 2, z: (Math.random() - 0.5) * 28,
    speed: 0.04 + Math.random() * 0.06, phase: Math.random() * Math.PI * 2,
  })), [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      dummy.position.set(d.x + Math.sin(t * d.speed + d.phase) * 1.5, d.y + Math.sin(t * d.speed * 0.7 + d.phase) * 1, d.z + Math.cos(t * d.speed * 0.5 + d.phase) * 1);
      dummy.scale.setScalar(0.04);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} /><meshBasicMaterial color="#ffd700" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// ─── City label + button ────────────────────────────────────────
function CityLabel({ city, lang, unlocked, completedLevels, onClick }: {
  city: City; lang: Language; unlocked: boolean; completedLevels: number; onClick: () => void;
}) {
  const pos = getCityPos(city);
  const yOff = city.id === "medieval-fortress" ? 5.5 : 3.8;
  return (
    <Html position={[pos[0], pos[1] + yOff, pos[2]]} center distanceFactor={40} style={{ pointerEvents: "auto" }}>
      <button onClick={onClick} className="flex flex-col items-center gap-0.5 select-none" style={{ cursor: unlocked ? "pointer" : "default" }}>
        <span className="text-2xl">{unlocked ? city.emoji : "🔒"}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap" style={{
          background: unlocked ? "rgba(200,168,50,0.2)" : "rgba(0,0,0,0.5)",
          color: unlocked ? "#fbbf24" : "#666",
          border: `1px solid ${unlocked ? "rgba(200,168,50,0.3)" : "rgba(100,100,100,0.3)"}`,
        }}>{city.building[lang]}</span>
        {unlocked && <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="text-[8px]" style={{ opacity: i < completedLevels ? 1 : 0.2 }}>⭐</span>)}</span>}
      </button>
    </Html>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCENE + EXPORT
// ═══════════════════════════════════════════════════════════════════

function SceneContent({ onSelectCity, lang }: { onSelectCity: (city: City) => void; lang: Language }) {
  const { getTopicCompletedLevels } = useProgressStore();
  return (
    <>
      <ambientLight intensity={0.6} color="#e0d8c8" />
      <directionalLight position={[-15, 28, 10]} intensity={0.85} color="#ffc860" />
      <hemisphereLight color="#87ceeb" groundColor="#5a7a40" intensity={0.35} />

      <SkyGradient />
      <OceanSurface />
      <SeaLabels />
      <ReliefTerrain />
      <Rivers />

      <PliskaLandmark />
      <TsarevetsLandmark />
      <RilaMonasteryLandmark />
      <RevivalTownLandmark />
      <ModernSofiaLandmark />

      <AsparuhCamp />
      <PreslavLandmark />
      <ShipkaLandmark />

      <AllSecondaryMarkers />
      <DecorativeProps />
      <TimelinePath />
      <MajorNodeLabels />
      <GoldenDust />

      {HISTORY_CITIES.map((city) => (
        <CityLabel key={city.id} city={city} lang={lang} unlocked={true}
          completedLevels={getTopicCompletedLevels(city.topicId)}
          onClick={() => onSelectCity(city)} />
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
        camera={{ position: [0, 22, 35], fov: 45 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: "#06192e" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={[FOG_COLOR, 40, 120]} />
        <OrbitControls
          enablePan enableZoom enableRotate
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 1.6}
          minDistance={10}
          maxDistance={55}
          enableDamping
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
