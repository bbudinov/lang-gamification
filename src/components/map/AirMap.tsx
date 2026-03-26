"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";

// ─── Mobile detection ────────────────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0 || window.innerWidth < 800);

// ─── Air world cities ────────────────────────────────────────────
const airWorld = WORLDS.find((w) => w.id === "air")!;
const AIR_CITIES = CITIES.filter((c) => airWorld.topicIds.includes(c.topicId));

// ─── Island positions & sizes ────────────────────────────────────
const ISLAND_CONFIG: Record<string, { pos: [number, number, number]; radius: number; isHub: boolean }> = {
  "cloud-station":  { pos: [-20, 8, -15],  radius: 4.5, isHub: true },
  "birds-nest":     { pos: [20, 12, -20],  radius: 3,   isHub: false },
  "sky-garden":     { pos: [-30, 5, 0],    radius: 3.5, isHub: false },
  "airport-hub":    { pos: [10, 3, -5],    radius: 5,   isHub: true },
  "storm-clouds":   { pos: [30, 10, 5],    radius: 0,   isHub: false },
  "mountain-peak":  { pos: [-15, 0, 15],   radius: 3,   isHub: false },
  "balloon-valley": { pos: [20, 6, 18],    radius: 2.5, isHub: false },
  "wind-lab":       { pos: [5, 15, 25],    radius: 3,   isHub: false },
};

function getCityPos(city: City): [number, number, number] {
  return ISLAND_CONFIG[city.id]?.pos ?? [0, 5, 0];
}

// ─── Floating Sky Island ─────────────────────────────────────────
function FloatingIsland({
  position,
  radius,
  hasWaterfall,
  bobOffset,
}: {
  position: [number, number, number];
  radius: number;
  hasWaterfall: boolean;
  bobOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() + bobOffset) * 0.3;
    }
  });

  const rockHeight = radius * 1.2;
  const grassHeight = radius * 0.2;

  return (
    <group ref={groupRef} position={position}>
      {/* Rocky underside — inverted cone feel */}
      <mesh position={[0, -rockHeight / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 0.4, rockHeight, 8]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>

      {/* Grass surface on top */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius, grassHeight, 8]} />
        <meshStandardMaterial color="#5cb85c" roughness={0.7} />
      </mesh>

      {/* Waterfall */}
      {hasWaterfall && (
        <mesh position={[radius * 0.7, -rockHeight * 0.4, 0]} rotation={[0, 0, 0.1]}>
          <planeGeometry args={[0.4, rockHeight * 0.8]} />
          <meshStandardMaterial color="#4fc3f7" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Mountain Peak island (tall rocky spire) ─────────────────────
function MountainIsland({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() + bobOffset) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Tall rock */}
      <mesh position={[0, 2, 0]}>
        <coneGeometry args={[3, 8, 6]} />
        <meshStandardMaterial color="#6b5b4f" roughness={0.95} />
      </mesh>
      {/* Snow cap */}
      <mesh position={[0, 5.5, 0]}>
        <coneGeometry args={[1.5, 2, 6]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
      </mesh>
      {/* Base island */}
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[3, 1.5, 3, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Cloud Puff Cluster ──────────────────────────────────────────
function CloudCluster({
  position,
  opacity = 0.8,
  scale = 1,
  dark = false,
  driftSpeed = 0.15,
}: {
  position: [number, number, number];
  opacity?: number;
  scale?: number;
  dark?: boolean;
  driftSpeed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const startX = useRef(position[0]);
  const offsets: [number, number, number][] = useMemo(
    () => [
      [0, 0, 0],
      [1.1 * scale, 0.2, 0.3],
      [-0.9 * scale, -0.1, -0.4],
      [0.4 * scale, 0.3, -0.6],
      [-0.5 * scale, 0.15, 0.5],
    ],
    [scale],
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.x = startX.current + Math.sin(t * driftSpeed) * 3;
      groupRef.current.position.y = position[1] + Math.sin(t * driftSpeed * 0.7 + 1) * 0.4;
    }
  });

  const color = dark ? "#555566" : "#ffffff";

  return (
    <group ref={groupRef} position={position}>
      {offsets.map((off, i) => (
        <mesh key={i} position={off} scale={[1.6 * scale, 0.7 * scale, 1.2 * scale]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Storm Zone ──────────────────────────────────────────────────
function StormZone({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime();
      // Lightning flash every 3-5 seconds
      const cycle = t % 4;
      lightRef.current.intensity = cycle < 0.1 ? 15 : 0;
    }
  });

  return (
    <group position={position}>
      {/* Dark cloud cluster */}
      <CloudCluster position={[0, 0, 0]} dark opacity={0.85} scale={1.5} driftSpeed={0.05} />
      <CloudCluster position={[3, -1, 2]} dark opacity={0.7} scale={1.0} driftSpeed={0.07} />
      <CloudCluster position={[-2, 1, -1]} dark opacity={0.75} scale={1.2} driftSpeed={0.04} />
      {/* Lightning flash */}
      <pointLight ref={lightRef} position={[0, -2, 0]} color="#c8c8ff" intensity={0} distance={25} />
    </group>
  );
}

// ─── Bird ────────────────────────────────────────────────────────
function Bird({ center, radiusX, radiusZ, height, speed, offset }: {
  center: [number, number, number];
  radiusX: number;
  radiusZ: number;
  height: number;
  speed: number;
  offset: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftWingRef = useRef<THREE.Mesh>(null!);
  const rightWingRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (groupRef.current) {
      groupRef.current.position.set(
        center[0] + Math.cos(t) * radiusX,
        height + Math.sin(t * 2) * 0.5,
        center[2] + Math.sin(t) * radiusZ,
      );
      groupRef.current.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(t * 6) * 0.5;
    if (leftWingRef.current) leftWingRef.current.rotation.z = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh scale={[0.15, 0.08, 0.4]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      {/* Left wing */}
      <mesh ref={leftWingRef} position={[-0.2, 0, 0]} scale={[0.5, 0.02, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Right wing */}
      <mesh ref={rightWingRef} position={[0.2, 0, 0]} scale={[0.5, 0.02, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}

// ─── Airplane ────────────────────────────────────────────────────
function Airplane() {
  const groupRef = useRef<THREE.Group>(null!);
  // Flies between Cloud Station [-20,8,-15] and Airport Hub [10,3,-5]
  const cx = -5, cz = -10, rx = 25, rz = 15;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.15;
    if (groupRef.current) {
      const x = cx + Math.cos(t) * rx;
      const z = cz + Math.sin(t) * rz;
      const y = 18 + Math.sin(t * 0.5) * 3;
      groupRef.current.position.set(x, y, z);
      groupRef.current.rotation.y = -t + Math.PI / 2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.3, 1.2, 0.3]}>
        <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Wings */}
      <mesh scale={[3, 0.08, 0.8]}>
        <boxGeometry />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.3, -1]} scale={[1, 0.6, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    </group>
  );
}

// ─── Hot Air Balloon ─────────────────────────────────────────────
function HotAirBalloon({
  position,
  color,
  bobOffset,
}: {
  position: [number, number, number];
  color: string;
  bobOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.3 + bobOffset) * 1.5;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Balloon */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[1.2, 12, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Ropes */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.5, 4]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
      {/* Basket */}
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
    </group>
  );
}

// ─── Rainbow ─────────────────────────────────────────────────────
function Rainbow({ position }: { position: [number, number, number] }) {
  const colors = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8f00ff"];

  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {colors.map((c, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[8 + i * 0.35, 0.15, 6, 32, Math.PI]} />
          <meshStandardMaterial color={c} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Wind Particles ──────────────────────────────────────────────
function WindParticles({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 120,
        y: Math.random() * 30,
        z: (Math.random() - 0.5) * 120,
        speed: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      // Horizontal drift left to right
      const x = ((p.x + t * p.speed) % 120) - 60;
      const fade = Math.sin(t * 0.5 + p.phase);
      dummy.position.set(x, p.y, p.z);
      dummy.scale.setScalar(0.08 + fade * 0.03);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
    </instancedMesh>
  );
}

// ─── City Marker (Html overlay) ──────────────────────────────────
function CityMarker({
  city,
  position,
  lang,
  unlocked,
  onSelect,
}: {
  city: City;
  position: [number, number, number];
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
}) {
  const isStorm = city.id === "storm-clouds";
  const markerY = isStorm ? position[1] + 4 : position[1] + 3.5;

  return (
    <group position={[position[0], markerY, position[2]]}>
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
              background: unlocked
                ? "rgba(50, 130, 220, 0.85)"
                : "rgba(60, 60, 80, 0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: unlocked ? "#fff" : "#999" }}>
              {city.name[lang]}
            </p>
          </div>
          {!unlocked && city.requiredXP > 0 && (
            <span className="text-[9px] font-medium" style={{ color: "#f0c040" }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Birds Nest Tree ─────────────────────────────────────────────
function NestTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 2.4, 6]} />
        <meshStandardMaterial color="#6b4226" />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color="#2d8a4e" />
      </mesh>
    </group>
  );
}

// ─── Wind Lab platform (metallic) ────────────────────────────────
function MetallicPlatform({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() + bobOffset) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[3, 3, 0.3, 8]} />
        <meshStandardMaterial color="#8899aa" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Support struts */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[1.5, 0.5, 3, 6]} />
        <meshStandardMaterial color="#667788" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 4]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Airport runway markings ─────────────────────────────────────
function RunwayIsland({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() + bobOffset) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Rocky underside */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[5, 2, 6, 8]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      {/* Flat surface */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[5, 5, 0.3, 8]} />
        <meshStandardMaterial color="#777777" roughness={0.8} />
      </mesh>
      {/* Runway strip */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 8]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Center line dashes */}
      {[-2.5, -1, 0.5, 2].map((z, i) => (
        <mesh key={i} position={[0, 0.17, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────
function AirScene({
  onSelectCity,
  lang,
  totalPoints,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
}) {
  const cloudCount = IS_MOBILE ? 10 : 20;
  const birdCount = IS_MOBILE ? 2 : 6;
  const balloonCount = IS_MOBILE ? 2 : 3;
  const windCount = IS_MOBILE ? 20 : 40;
  const showAirplane = !IS_MOBILE;

  // Generate cloud positions
  const clouds = useMemo(
    () =>
      Array.from({ length: cloudCount }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 100,
          Math.random() * 25 - 2,
          (Math.random() - 0.5) * 100,
        ] as [number, number, number],
        opacity: 0.3 + Math.random() * 0.5,
        scale: 0.5 + Math.random() * 1,
        speed: 0.08 + Math.random() * 0.15,
      })),
    [cloudCount],
  );

  // Bird params
  const birds = useMemo(
    () =>
      Array.from({ length: birdCount }, (_, i) => ({
        center: [20, 0, -20] as [number, number, number],
        radiusX: 6 + Math.random() * 8,
        radiusZ: 5 + Math.random() * 7,
        height: 13 + Math.random() * 6,
        speed: 0.4 + Math.random() * 0.3,
        offset: (i / birdCount) * Math.PI * 2,
      })),
    [birdCount],
  );

  // Balloons near Balloon Valley [20, 6, 18]
  const balloons = useMemo(() => {
    const configs = [
      { pos: [18, 12, 16] as [number, number, number], color: "#e53935", offset: 0 },
      { pos: [23, 14, 20] as [number, number, number], color: "#fdd835", offset: 2 },
      { pos: [16, 16, 22] as [number, number, number], color: "#1e88e5", offset: 4 },
    ];
    return configs.slice(0, balloonCount);
  }, [balloonCount]);

  return (
    <>
      {/* Lighting — warm sunlight, no shadows */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 30, 10]} intensity={1.3} color="#fff5e0" />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <CloudCluster key={`cloud-${i}`} position={c.pos} opacity={c.opacity} scale={c.scale} driftSpeed={c.speed} />
      ))}

      {/* Islands + Markers per city */}
      {AIR_CITIES.map((city) => {
        const config = ISLAND_CONFIG[city.id];
        if (!config) return null;
        const { pos, radius } = config;
        const unlocked = totalPoints >= city.requiredXP;
        const bobOffset = pos[0] + pos[2]; // deterministic offset

        return (
          <React.Fragment key={city.id}>
            {/* Special cases */}
            {city.id === "storm-clouds" && <StormZone position={pos} />}
            {city.id === "mountain-peak" && <MountainIsland position={pos} bobOffset={bobOffset} />}
            {city.id === "wind-lab" && <MetallicPlatform position={pos} bobOffset={bobOffset} />}
            {city.id === "airport-hub" && <RunwayIsland position={pos} bobOffset={bobOffset} />}

            {/* Normal floating islands */}
            {!["storm-clouds", "mountain-peak", "wind-lab", "airport-hub"].includes(city.id) && radius > 0 && (
              <FloatingIsland
                position={pos}
                radius={radius}
                hasWaterfall={city.id === "cloud-station" || city.id === "sky-garden"}
                bobOffset={bobOffset}
              />
            )}

            {/* Birds Nest tree */}
            {city.id === "birds-nest" && (
              <NestTree position={[pos[0] + 1, pos[1] + 0.3, pos[2] - 0.5]} />
            )}

            {/* City label */}
            <CityMarker city={city} position={pos} lang={lang} unlocked={unlocked} onSelect={onSelectCity} />
          </React.Fragment>
        );
      })}

      {/* Rainbow near Sky Garden [-30, 5, 0] */}
      <Rainbow position={[-32, 6, -4]} />

      {/* Birds */}
      {birds.map((b, i) => (
        <Bird key={`bird-${i}`} {...b} />
      ))}

      {/* Airplane */}
      {showAirplane && <Airplane />}

      {/* Hot Air Balloons */}
      {balloons.map((b, i) => (
        <HotAirBalloon key={`balloon-${i}`} position={b.pos} color={b.color} bobOffset={b.offset} />
      ))}

      {/* Wind Particles */}
      <WindParticles count={windCount} />

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={15}
        maxDistance={120}
        mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
      />
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────
export function AirMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 35, 60], fov: 50 }}
        dpr={dpr}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
        style={{
          background: "linear-gradient(180deg, #1e6fb5 0%, #5baee0 30%, #87CEEB 60%, #c5e8f7 100%)",
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <AirScene onSelectCity={onSelectCity} lang={lang} totalPoints={totalPoints} />
      </Canvas>
    </div>
  );
}
