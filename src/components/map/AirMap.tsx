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

// ─── Stalactite protrusions (rocky underside detail) ─────────────
function Stalactites({ radius }: { radius: number }) {
  const stalactites = useMemo(() => {
    const count = IS_MOBILE ? 2 : 3;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + 0.5;
      const dist = radius * 0.5;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: 0.4 + Math.random() * 0.6,
        topR: 0.08 + Math.random() * 0.06,
      };
    });
  }, [radius]);

  return (
    <>
      {stalactites.map((s, i) => (
        <mesh key={i} position={[s.x, -radius * 1.2 - s.height * 0.3, s.z]}>
          <coneGeometry args={[s.topR, s.height, 5]} />
          <meshStandardMaterial color="#4a3f35" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

// ─── Vegetation bumps (grass surface detail) ─────────────────────
function VegetationBumps({ radius }: { radius: number }) {
  const bumps = useMemo(() => {
    const count = IS_MOBILE ? 3 : 5;
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.7;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        scale: 0.08 + Math.random() * 0.08,
      };
    });
  }, [radius]);

  return (
    <>
      {bumps.map((b, i) => (
        <mesh key={i} position={[b.x, b.scale * 0.5 + 0.1, b.z]}>
          <sphereGeometry args={[b.scale, 6, 4]} />
          <meshStandardMaterial color="#4a9a4a" roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

// ─── Waterfall (hanging plane with sway) ─────────────────────────
function Waterfall({ radius, rockHeight }: { radius: number; rockHeight: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.04;
    }
  });

  return (
    <mesh ref={ref} position={[radius * 0.75, -rockHeight * 0.4, 0]} rotation={[0, 0, 0.1]}>
      <planeGeometry args={[0.5, rockHeight * 0.9]} />
      <meshStandardMaterial color="#4fc3f7" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
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
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t + bobOffset) * 0.3;
      groupRef.current.rotation.z = Math.sin(t * 0.4 + bobOffset) * 0.005;
    }
  });

  const rockHeight = radius * 1.2;
  const grassHeight = radius * 0.2;

  return (
    <group ref={groupRef} position={position}>
      {/* Rocky underside */}
      <mesh position={[0, -rockHeight / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 0.4, rockHeight, 8]} />
        <meshStandardMaterial color="#7a6555" roughness={0.9} />
      </mesh>

      {/* Stalactite protrusions */}
      <Stalactites radius={radius} />

      {/* Grass surface on top */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius, grassHeight, 8]} />
        <meshStandardMaterial color="#5daa5d" roughness={0.7} />
      </mesh>

      {/* Vegetation bumps */}
      <VegetationBumps radius={radius} />

      {/* Waterfall */}
      {hasWaterfall && !IS_MOBILE && <Waterfall radius={radius} rockHeight={rockHeight} />}
    </group>
  );
}

// ─── Cloud Station control tower ─────────────────────────────────
function ControlTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tower pole */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 2.4, 6]} />
        <meshStandardMaterial color="#8899aa" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Dome top */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#55cc55" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Glass ring */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 8]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Bird's Nest elements ────────────────────────────────────────
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

function NestTorus({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Large nest (torus) */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.25, 6, 12]} />
        <meshStandardMaterial color="#8b6c42" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Sky Garden flower patches ───────────────────────────────────
function FlowerPatches({ radius }: { radius: number }) {
  const flowers = useMemo(() => {
    const colors = ["#ff6b8a", "#ffaa33", "#ff55cc", "#ff4444", "#ffdd44"];
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const dist = radius * 0.3 + Math.random() * radius * 0.4;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        color: colors[i % colors.length],
        scale: 0.06 + Math.random() * 0.05,
      };
    });
  }, [radius]);

  return (
    <>
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, 0.15, f.z]}>
          <sphereGeometry args={[f.scale, 5, 4]} />
          <meshStandardMaterial color={f.color} />
        </mesh>
      ))}
    </>
  );
}

// ─── Mountain Peak island (tall rocky spire) ─────────────────────
function MountainIsland({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t + bobOffset) * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.4 + bobOffset) * 0.005;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Tall rock — taller than before */}
      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[3, 10, 6]} />
        <meshStandardMaterial color="#7a6555" roughness={0.95} />
      </mesh>
      {/* Snow cap — white top half */}
      <mesh position={[0, 7, 0]}>
        <coneGeometry args={[1.8, 3, 6]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
      </mesh>
      {/* Extra snow ring */}
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[2.2, 2.5, 0.5, 6]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.6} />
      </mesh>
      {/* Base island */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[3, 1.5, 4, 6]} />
        <meshStandardMaterial color="#7a6555" roughness={0.9} />
      </mesh>
      {/* Stalactites */}
      <Stalactites radius={3} />
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
  wispy = false,
}: {
  position: [number, number, number];
  opacity?: number;
  scale?: number;
  dark?: boolean;
  driftSpeed?: number;
  wispy?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const startX = useRef(position[0]);

  const sphereCount = IS_MOBILE ? 3 : wispy ? 3 : 3 + Math.floor(Math.random() * 5);

  const offsets = useMemo(() => {
    const base: { pos: [number, number, number]; sc: [number, number, number] }[] = [];
    for (let i = 0; i < sphereCount; i++) {
      const xOff = (Math.random() - 0.5) * 2.5 * scale;
      const yOff = (Math.random() - 0.5) * 0.6;
      const zOff = (Math.random() - 0.5) * 1.5;
      if (wispy) {
        base.push({ pos: [xOff, yOff, zOff], sc: [2.2 * scale, 0.4 * scale, 0.8 * scale] });
      } else {
        const puff = 0.8 + Math.random() * 0.6;
        base.push({
          pos: [xOff, yOff, zOff],
          sc: [1.6 * scale * puff, 0.7 * scale * puff, 1.2 * scale * puff],
        });
      }
    }
    return base;
  }, [scale, sphereCount, wispy]);

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
        <mesh key={i} position={off.pos} scale={off.sc}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Storm Zone ──────────────────────────────────────────────────
function StormRain({ position }: { position: [number, number, number] }) {
  const count = IS_MOBILE ? 0 : 15;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 8,
        speed: 6 + Math.random() * 6,
        phase: Math.random() * 10,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current || count === 0) return;
    const t = clock.getElapsedTime();
    drops.forEach((d, i) => {
      const y = ((d.phase + t * d.speed) % 12) - 6;
      dummy.position.set(d.x, -y, d.z);
      dummy.scale.set(0.03, 0.6, 0.03);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={position}>
      <boxGeometry />
      <meshStandardMaterial color="#8899bb" transparent opacity={0.35} />
    </instancedMesh>
  );
}

function StormZone({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime();
      // Lightning flash every 3-5 seconds — sharp burst
      const cycle = t % 4;
      lightRef.current.intensity = cycle < 0.05 ? 5 : cycle < 0.1 ? 0 : cycle < 0.12 ? 3 : 0;
    }
  });

  return (
    <group position={position}>
      {/* Larger dark cloud cluster */}
      <CloudCluster position={[0, 0, 0]} dark opacity={0.9} scale={2.0} driftSpeed={0.03} />
      <CloudCluster position={[4, -1, 3]} dark opacity={0.8} scale={1.4} driftSpeed={0.05} />
      <CloudCluster position={[-3, 1, -2]} dark opacity={0.85} scale={1.6} driftSpeed={0.04} />
      <CloudCluster position={[1, 2, -3]} dark opacity={0.75} scale={1.2} driftSpeed={0.06} />
      {/* Lightning flash — brighter */}
      <pointLight ref={lightRef} position={[0, -2, 0]} color="#d0d0ff" intensity={0} distance={35} />
      {/* Rain particles below */}
      <StormRain position={[0, -6, 0]} />
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
      {/* Left wing — plane geometry for visible shape */}
      <mesh ref={leftWingRef} position={[-0.25, 0.02, 0]} rotation={[0, 0, 0.15]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshStandardMaterial color="#3a3a3a" side={THREE.DoubleSide} />
      </mesh>
      {/* Right wing */}
      <mesh ref={rightWingRef} position={[0.25, 0.02, 0]} rotation={[0, 0, -0.15]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshStandardMaterial color="#3a3a3a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Airplane ────────────────────────────────────────────────────
function Airplane() {
  const groupRef = useRef<THREE.Group>(null!);
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

// ─── Tethered balloons (Balloon Valley) ──────────────────────────
function TetheredBalloons({ position }: { position: [number, number, number] }) {
  const balloons = useMemo(
    () => [
      { x: -0.8, z: 0.5, height: 3, color: "#ff6b6b" },
      { x: 0.6, z: -0.7, height: 4.5, color: "#66bb6a" },
      { x: 0.2, z: 0.9, height: 2.5, color: "#42a5f5" },
    ],
    [],
  );

  return (
    <group position={position}>
      {balloons.map((b, i) => (
        <group key={i}>
          {/* Tether line */}
          <mesh position={[b.x, b.height / 2, b.z]}>
            <cylinderGeometry args={[0.01, 0.01, b.height, 3]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
          {/* Small balloon */}
          <mesh position={[b.x, b.height + 0.3, b.z]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Wind Turbine (Wind Lab) ─────────────────────────────────────
function WindTurbine({ position }: { position: [number, number, number] }) {
  const bladesRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (bladesRef.current && !IS_MOBILE) {
      bladesRef.current.rotation.z = clock.getElapsedTime() * 2;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
        <meshStandardMaterial color="#ccccdd" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Blades group */}
      <group ref={bladesRef} position={[0, 3.1, 0.1]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <planeGeometry args={[0.12, 1.4]} />
            <meshStandardMaterial color="#e0e0ee" side={THREE.DoubleSide} metalness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Hub */}
      <mesh position={[0, 3.1, 0.1]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color="#aaaacc" metalness={0.5} />
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

// ─── Wind Particles (elongated streaks) ──────────────────────────
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
      const x = ((p.x + t * p.speed) % 120) - 60;
      const fade = Math.sin(t * 0.5 + p.phase);
      dummy.position.set(x, p.y, p.z);
      // Elongated streak shape
      dummy.scale.set(0.3 + fade * 0.1, 0.04, 0.04);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}

// ─── Distant sky clouds (depth) ──────────────────────────────────
function DistantClouds() {
  const clouds = useMemo(
    () => [
      { pos: [-70, 5, -60] as [number, number, number], scale: 4 },
      { pos: [65, 10, -55] as [number, number, number], scale: 3.5 },
      { pos: [50, 2, 60] as [number, number, number], scale: 5 },
      { pos: [-60, 15, 50] as [number, number, number], scale: 3 },
    ],
    [],
  );

  return (
    <>
      {clouds.map((c, i) => (
        <CloudCluster
          key={`distant-${i}`}
          position={c.pos}
          opacity={0.15}
          scale={c.scale}
          driftSpeed={0.02}
          wispy={i % 2 === 0}
        />
      ))}
    </>
  );
}

// ─── Sun disc ────────────────────────────────────────────────────
function SunDisc() {
  return (
    <mesh position={[50, 40, -50]} rotation={[0, -0.8, 0]}>
      <circleGeometry args={[6, 24]} />
      <meshBasicMaterial color="#fff5aa" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Airport runway markings ─────────────────────────────────────
function RunwayIsland({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t + bobOffset) * 0.3;
      groupRef.current.rotation.z = Math.sin(t * 0.4 + bobOffset) * 0.005;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Rocky underside */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[5, 2, 6, 8]} />
        <meshStandardMaterial color="#7a6555" roughness={0.9} />
      </mesh>
      {/* Stalactites */}
      <Stalactites radius={5} />
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
      {/* Runway edge markings */}
      {[-3.5, 3.5].map((z, i) => (
        <mesh key={`edge-${i}`} position={[0, 0.16, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Wind Lab platform (metallic) ────────────────────────────────
function MetallicPlatform({ position, bobOffset }: { position: [number, number, number]; bobOffset: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t + bobOffset) * 0.3;
      groupRef.current.rotation.z = Math.sin(t * 0.4 + bobOffset) * 0.005;
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
      {/* Stalactites */}
      <Stalactites radius={3} />
      {/* Antenna */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 4]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wind turbine */}
      <WindTurbine position={[1.5, 0.15, 1]} />
    </group>
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

  // Generate cloud positions — varied shapes
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
        wispy: Math.random() > 0.6,
      })),
    [cloudCount],
  );

  // Bird params — varied radius and speed, some fly between islands
  const birds = useMemo(
    () =>
      Array.from({ length: birdCount }, (_, i) => {
        // Some birds circle Bird's Nest, some fly between islands
        const centers: [number, number, number][] = [
          [20, 0, -20],  // bird's nest area
          [0, 0, 0],     // center
          [-10, 0, -5],  // between cloud station and airport
        ];
        const center = centers[i % centers.length];
        return {
          center,
          radiusX: 5 + Math.random() * 12,
          radiusZ: 4 + Math.random() * 10,
          height: 12 + Math.random() * 8,
          speed: 0.3 + Math.random() * 0.4,
          offset: (i / birdCount) * Math.PI * 2,
        };
      }),
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
      {/* Lighting — warm sunlight */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 30, 10]} intensity={1.3} color="#fff5e0" />

      {/* Sun disc */}
      <SunDisc />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <CloudCluster
          key={`cloud-${i}`}
          position={c.pos}
          opacity={c.opacity}
          scale={c.scale}
          driftSpeed={c.speed}
          wispy={c.wispy}
        />
      ))}

      {/* Distant depth clouds */}
      <DistantClouds />

      {/* Islands + Markers per city */}
      {AIR_CITIES.map((city) => {
        const config = ISLAND_CONFIG[city.id];
        if (!config) return null;
        const { pos, radius } = config;
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP
        const bobOffset = pos[0] + pos[2];

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

            {/* Cloud Station — control tower */}
            {city.id === "cloud-station" && (
              <ControlTower position={[pos[0] - 1.5, pos[1] + 0.1, pos[2] + 1]} />
            )}

            {/* Birds Nest — tree + nest torus */}
            {city.id === "birds-nest" && (
              <>
                <NestTree position={[pos[0] + 1, pos[1] + 0.3, pos[2] - 0.5]} />
                <NestTorus position={[pos[0] - 0.8, pos[1] + 0.1, pos[2] + 0.5]} />
              </>
            )}

            {/* Sky Garden — flower patches */}
            {city.id === "sky-garden" && (
              <group position={[pos[0], pos[1] + 0.1, pos[2]]}>
                <FlowerPatches radius={radius} />
              </group>
            )}

            {/* Balloon Valley — tethered balloons */}
            {city.id === "balloon-valley" && (
              <TetheredBalloons position={[pos[0], pos[1] + 0.1, pos[2]]} />
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

      {/* Wind Particles — elongated streaks */}
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
        camera={{ position: IS_MOBILE ? [0, 50, 85] : [0, 35, 60], fov: IS_MOBILE ? 58 : 50 }}
        dpr={dpr}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
        style={{
          background: "linear-gradient(180deg, #5b8cc9 0%, #7ab4de 30%, #a8d8f0 60%, #d4edfc 100%)",
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
