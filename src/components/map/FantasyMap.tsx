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

// ─── Fantasy world cities ────────────────────────────────────────
const fantasyWorld = WORLDS.find((w) => w.id === "fantasy")!;
const FANTASY_CITIES = CITIES.filter((c) => fantasyWorld.topicIds.includes(c.topicId));

// ─── Island positions & config ───────────────────────────────────
const ISLAND_CONFIG: Record<string, { pos: [number, number, number]; radius: number }> = {
  "magic-forest":   { pos: [0, 2, -20],    radius: 5 },
  "dragon-cave":    { pos: [22, -2, -12],   radius: 4 },
  "wizard-tower":   { pos: [-22, 8, -8],    radius: 3.5 },
  "royal-castle":   { pos: [0, 4, 0],       radius: 6 },
  "village-tavern": { pos: [-18, 0, 10],    radius: 4 },
  "quest-board":    { pos: [18, 1, 8],      radius: 3.5 },
  "potion-lab":     { pos: [-12, 3, 22],    radius: 4 },
  "dark-dungeon":   { pos: [14, -4, 22],    radius: 4 },
};

// ─── Route connections ───────────────────────────────────────────
const ROUTES: [string, string][] = [
  ["magic-forest", "royal-castle"],
  ["dragon-cave", "royal-castle"],
  ["wizard-tower", "royal-castle"],
  ["royal-castle", "village-tavern"],
  ["royal-castle", "quest-board"],
  ["village-tavern", "potion-lab"],
  ["quest-board", "dark-dungeon"],
  ["potion-lab", "dark-dungeon"],
];

function getCityPos(city: City): [number, number, number] {
  return ISLAND_CONFIG[city.id]?.pos ?? [0, 5, 0];
}

// ─── Stalactites (rocky underside) ───────────────────────────────
function Stalactites({ radius }: { radius: number }) {
  const stalactites = useMemo(() => {
    const count = IS_MOBILE ? 2 : 4;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + 0.7;
      const dist = radius * 0.5;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: 0.5 + Math.random() * 0.8,
        topR: 0.1 + Math.random() * 0.08,
      };
    });
  }, [radius]);

  return (
    <>
      {stalactites.map((s, i) => (
        <mesh key={i} position={[s.x, -radius * 1.2 - s.height * 0.3, s.z]}>
          <coneGeometry args={[s.topR, s.height, 5]} />
          <meshStandardMaterial color="#3a2a40" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

// ─── Floating Island ─────────────────────────────────────────────
function FloatingIsland({
  position,
  radius,
  topColor,
  bobOffset,
}: {
  position: [number, number, number];
  radius: number;
  topColor: string;
  bobOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + bobOffset) * 0.4;
    }
  });

  const rockHeight = radius * 1.1;

  return (
    <group ref={groupRef} position={position}>
      {/* Rocky underside */}
      <mesh position={[0, -rockHeight / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 0.35, rockHeight, 8]} />
        <meshStandardMaterial color="#4a3050" roughness={0.9} />
      </mesh>
      <Stalactites radius={radius} />
      {/* Grass/terrain surface */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius, radius * 0.2, 8]} />
        <meshStandardMaterial color={topColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Tree ────────────────────────────────────────────────────────
function Tree({ position, glowing }: { position: [number, number, number]; glowing: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.6, 6]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshStandardMaterial
          color={glowing ? "#44ff66" : "#2d8a4e"}
          emissive={glowing ? "#22cc44" : "#000000"}
          emissiveIntensity={glowing ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}

// ─── Mushroom ────────────────────────────────────────────────────
function Mushroom({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.3, 5]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Fireflies (Magic Forest) ────────────────────────────────────
function Fireflies({ center, count }: { center: [number, number, number]; count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 8,
        y: 0.5 + Math.random() * 3,
        z: (Math.random() - 0.5) * 8,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        center[0] + p.x + Math.sin(t * p.speed + p.phase) * 0.8,
        center[1] + p.y + Math.sin(t * 0.7 + p.phase) * 0.4,
        center[2] + p.z + Math.cos(t * p.speed + p.phase) * 0.8,
      );
      dummy.scale.setScalar(0.06);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial color="#ffee44" emissive="#ffdd00" emissiveIntensity={1.5} />
    </instancedMesh>
  );
}

// ─── Magic Forest Zone ───────────────────────────────────────────
function MagicForestZone({ position }: { position: [number, number, number] }) {
  const treeCount = IS_MOBILE ? 4 : 7;
  const trees = useMemo(
    () =>
      Array.from({ length: treeCount }, (_, i) => {
        const angle = (i / treeCount) * Math.PI * 2 + 0.3;
        const dist = 1.5 + Math.random() * 2.5;
        return {
          x: Math.cos(angle) * dist,
          z: Math.sin(angle) * dist,
          glowing: i < (IS_MOBILE ? 2 : 3),
        };
      }),
    [treeCount],
  );

  const mushrooms = useMemo(
    () =>
      Array.from({ length: IS_MOBILE ? 3 : 5 }, () => ({
        x: (Math.random() - 0.5) * 6,
        z: (Math.random() - 0.5) * 6,
        color: Math.random() > 0.5 ? "#cc3333" : "#ff6644",
      })),
    [],
  );

  return (
    <group position={position}>
      {trees.map((t, i) => (
        <Tree key={i} position={[t.x, 0.1, t.z]} glowing={t.glowing} />
      ))}
      {mushrooms.map((m, i) => (
        <Mushroom key={`m${i}`} position={[m.x, 0.1, m.z]} color={m.color} />
      ))}
      <Fireflies center={[0, 0, 0]} count={IS_MOBILE ? 8 : 20} />
      <pointLight position={[0, 3, 0]} color="#44ff66" intensity={0.6} distance={15} />
    </group>
  );
}

// ─── Torch (flickering) ──────────────────────────────────────────
function Torch({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(clock.getElapsedTime() * 8 + position[0]) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1, 5]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#ff8800" emissive="#ff6600" emissiveIntensity={1.5} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1.2, 0]} color="#ff9944" intensity={0.8} distance={8} />
    </group>
  );
}

// ─── Royal Castle Zone ───────────────────────────────────────────
function RoyalCastleZone({ position }: { position: [number, number, number] }) {
  const towerCount = IS_MOBILE ? 2 : 4;
  const towerPositions: [number, number, number][] = IS_MOBILE
    ? [[-2, 0, -2], [2, 0, 2]]
    : [[-2, 0, -2], [2, 0, -2], [-2, 0, 2], [2, 0, 2]];

  return (
    <group position={position}>
      {/* Main keep */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[4, 8, 4]} />
        <meshStandardMaterial color="#8a8a7a" roughness={0.8} />
      </mesh>
      {/* Gate opening */}
      <mesh position={[0, 1.2, 2.01]}>
        <boxGeometry args={[1.2, 2.4, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Corner towers */}
      {towerPositions.slice(0, towerCount).map((tp, i) => (
        <group key={i} position={tp}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[1, 1, 10, 8]} />
            <meshStandardMaterial color="#7a7a6a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 10.5, 0]}>
            <coneGeometry args={[1.3, 2, 8]} />
            <meshStandardMaterial color="#8b2020" />
          </mesh>
        </group>
      ))}
      {/* Banners */}
      {!IS_MOBILE && (
        <>
          <mesh position={[-2, 8, -2.1]} rotation={[0, 0, 0.1]}>
            <planeGeometry args={[0.6, 2]} />
            <meshStandardMaterial color="#cc2222" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[2, 8, -2.1]} rotation={[0, 0, -0.1]}>
            <planeGeometry args={[0.6, 2]} />
            <meshStandardMaterial color="#cc2222" side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {/* Castle wall */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[7, 1, 7]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.9} />
      </mesh>
      {/* Torches */}
      <Torch position={[-1, 0.5, 2.3]} />
      <Torch position={[1, 0.5, 2.3]} />
      {!IS_MOBILE && (
        <>
          <Torch position={[-3, 0.5, 0]} />
          <Torch position={[3, 0.5, 0]} />
        </>
      )}
      <pointLight position={[0, 6, 0]} color="#ffcc66" intensity={0.8} distance={20} />
    </group>
  );
}

// ─── Orbiting Orbs (Wizard Tower) ────────────────────────────────
function OrbitingOrbs({ center }: { center: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    }
  });

  const orbs = [
    { color: "#4488ff", emissive: "#2266dd", dist: 2.5, y: 8 },
    { color: "#aa44ff", emissive: "#8822dd", dist: 2.5, y: 10 },
    { color: "#ffcc44", emissive: "#ddaa22", dist: 2.5, y: 12 },
  ];

  return (
    <group ref={groupRef} position={center}>
      {orbs.map((o, i) => {
        const angle = (i / orbs.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * o.dist, o.y, Math.sin(angle) * o.dist]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshStandardMaterial color={o.color} emissive={o.emissive} emissiveIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Magic Circle (Wizard Tower) ─────────────────────────────────
function MagicCircle({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.5, 3, 32]} />
      <meshStandardMaterial color="#9944ff" emissive="#7722cc" emissiveIntensity={0.5} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Wizard Tower Zone ───────────────────────────────────────────
function WizardTowerZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main tower — slightly tilted */}
      <group rotation={[0, 0, 0.05]}>
        <mesh position={[0, 7, 0]}>
          <cylinderGeometry args={[1.2, 1.5, 14, 8]} />
          <meshStandardMaterial color="#5a4a6a" roughness={0.7} />
        </mesh>
        {/* Cone hat roof */}
        <mesh position={[0, 14.5, 0]}>
          <coneGeometry args={[1.8, 3, 8]} />
          <meshStandardMaterial color="#7722cc" emissive="#5511aa" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Orbiting orbs */}
      <OrbitingOrbs center={[0, 0, 0]} />
      {/* Magic circle on ground */}
      <MagicCircle position={[0, 0.15, 0]} />
      <pointLight position={[0, 10, 0]} color="#9944ff" intensity={0.7} distance={18} />
    </group>
  );
}

// ─── Smoke Wisps (rising particles) ──────────────────────────────
function SmokeWisps({ center, count, color, speed }: { center: [number, number, number]; count: number; color: string; speed: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
        riseSpeed: speed + Math.random() * 0.3,
      })),
    [count, speed],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const y = ((t * p.riseSpeed + p.phase) % 5);
      dummy.position.set(
        center[0] + p.x + Math.sin(t + p.phase) * 0.3,
        center[1] + y,
        center[2] + p.z + Math.cos(t + p.phase) * 0.3,
      );
      const scale = 0.15 + y * 0.06;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial color={color} transparent opacity={0.35} />
    </instancedMesh>
  );
}

// ─── Dragon Cave Zone ────────────────────────────────────────────
function DragonCaveZone({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.6 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Cave arch — two angled pillars */}
      <mesh position={[-1.2, 2, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.5, 0.7, 5, 6]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
      </mesh>
      <mesh position={[1.2, 2, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.5, 0.7, 5, 6]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
      </mesh>
      {/* Lintel */}
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[3.5, 0.8, 1.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
      {/* Fire glow inside */}
      <mesh position={[0, 1.5, -0.5]}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff3300" emissiveIntensity={0.6} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Bones */}
      {[[-1.5, 0.1, 1.5], [1.2, 0.1, 1.8], [0.5, 0.1, 2.2]].map((bp, i) => (
        <mesh key={i} position={bp as [number, number, number]} rotation={[0, i * 1.2, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
          <meshStandardMaterial color="#e8e0d0" />
        </mesh>
      ))}
      {/* Smoke wisps */}
      <SmokeWisps center={[0, 4, 0]} count={IS_MOBILE ? 3 : 6} color="#333333" speed={0.4} />
      {/* Dragon wing hint */}
      {!IS_MOBILE && (
        <mesh position={[-2.5, 3, -1.5]} rotation={[0.2, 0.5, -0.3]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, -2, 3, 0, -1, 0.5, -1]), 3]}
              count={3}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial color="#1a1a1a" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
      <pointLight ref={lightRef} position={[0, 2, 0]} color="#ff5500" intensity={0.6} distance={15} />
    </group>
  );
}

// ─── Village Tavern Zone ─────────────────────────────────────────
function VillageTavernZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* House body */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#8b6b3a" roughness={0.8} />
      </mesh>
      {/* Pitched roof — two planes forming A-frame */}
      <mesh position={[-0.05, 3.6, 0]} rotation={[0, 0, 0.55]}>
        <planeGeometry args={[2, 3.2]} />
        <meshStandardMaterial color="#6b3a1e" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.05, 3.6, 0]} rotation={[0, 0, -0.55]}>
        <planeGeometry args={[2, 3.2]} />
        <meshStandardMaterial color="#6b3a1e" side={THREE.DoubleSide} />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.8, 4.2, 0.5]}>
        <cylinderGeometry args={[0.2, 0.25, 1.2, 6]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      {/* Chimney smoke */}
      <SmokeWisps center={[0.8, 5, 0.5]} count={3} color="#888888" speed={0.3} />
      {/* Window glow */}
      <mesh position={[0, 1.8, 1.51]}>
        <boxGeometry args={[0.8, 0.6, 0.02]} />
        <meshStandardMaterial color="#ffcc44" emissive="#ffaa22" emissiveIntensity={0.8} />
      </mesh>
      {/* Outdoor tables */}
      {[[-2, 0.4, 1.5], [2, 0.4, 1.5]].map((tp, i) => (
        <group key={i} position={tp as [number, number, number]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.06, 8]} />
            <meshStandardMaterial color="#6b4a2e" />
          </mesh>
          {/* Mug */}
          <mesh position={[0.15, 0.12, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.15, 6]} />
            <meshStandardMaterial color="#8b7355" />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 3, 2]} color="#ffaa44" intensity={0.6} distance={12} />
    </group>
  );
}

// ─── Quest Board Zone ────────────────────────────────────────────
function QuestBoardZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Board */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="#6b4a2e" roughness={0.9} />
      </mesh>
      {/* Poles */}
      <mesh position={[-0.8, 1, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 5]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0.8, 1, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 5]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      {/* Papers/scrolls on board */}
      {[[-0.3, 2.5, 0.11], [0.2, 2, 0.11], [-0.1, 1.6, 0.11]].map((pp, i) => (
        <mesh key={i} position={pp as [number, number, number]}>
          <planeGeometry args={[0.5, 0.4]} />
          <meshStandardMaterial color="#f0e8d0" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Compass on ground */}
      <group position={[1.5, 0.12, 1]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#c0a060" />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0.7]}>
          <boxGeometry args={[0.04, 0.4, 0.02]} />
          <meshStandardMaterial color="#cc2222" />
        </mesh>
      </group>
      {/* Campfire */}
      <group position={[-1.5, 0, 1.5]}>
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.3, 0.5, 6]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={1} />
        </mesh>
        <pointLight position={[0, 0.5, 0]} color="#ff6600" intensity={0.4} distance={5} />
      </group>
      {/* Sword */}
      <mesh position={[1.8, 0.5, -0.5]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.06, 1.2, 0.02]} />
        <meshStandardMaterial color="#aaaacc" metalness={0.6} />
      </mesh>
      {/* Shield */}
      <mesh position={[2.1, 0.4, -0.5]} rotation={[0, -0.3, 0]}>
        <circleGeometry args={[0.3, 8]} />
        <meshStandardMaterial color="#8b4513" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Bubbling Particles (Potion Lab) ─────────────────────────────
function BubblingParticles({ center, count }: { center: [number, number, number]; count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = new THREE.Color(Math.random() > 0.5 ? "#44ff44" : "#aa44ff");
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const y = ((t * p.speed + p.phase) % 3);
      dummy.position.set(
        center[0] + p.x + Math.sin(t + p.phase) * 0.2,
        center[1] + y,
        center[2] + p.z,
      );
      dummy.scale.setScalar(0.06 - y * 0.015);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial color="#44ff44" emissive="#22cc22" emissiveIntensity={0.6} />
    </instancedMesh>
  );
}

// ─── Potion Lab Zone ─────────────────────────────────────────────
function PotionLabZone({ position }: { position: [number, number, number] }) {
  const bottleCount = IS_MOBILE ? 2 : 4;
  const bottleConfigs = [
    { x: -0.6, color: "#44ff44", emissive: "#22cc22" },
    { x: -0.2, color: "#aa44ff", emissive: "#8822cc" },
    { x: 0.2, color: "#ff4444", emissive: "#cc2222" },
    { x: 0.6, color: "#4488ff", emissive: "#2266cc" },
  ];

  return (
    <group position={position}>
      {/* Table */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[3, 0.15, 1.2]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.9} />
      </mesh>
      {/* Table legs */}
      {[[-1.3, 0.4, -0.4], [1.3, 0.4, -0.4], [-1.3, 0.4, 0.4], [1.3, 0.4, 0.4]].map((lp, i) => (
        <mesh key={i} position={lp as [number, number, number]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 4]} />
          <meshStandardMaterial color="#3a2a1e" />
        </mesh>
      ))}
      {/* Bottles */}
      {bottleConfigs.slice(0, bottleCount).map((b, i) => (
        <group key={i} position={[b.x, 1.1, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.3, 6]} />
            <meshStandardMaterial color={b.color} emissive={b.emissive} emissiveIntensity={0.5} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.05, 6, 4]} />
            <meshStandardMaterial color={b.color} emissive={b.emissive} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      {/* Cauldron */}
      <group position={[0, 0, 2]}>
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
        </mesh>
        {/* Green liquid surface */}
        <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.65, 12]} />
          <meshStandardMaterial color="#44ff44" emissive="#22cc22" emissiveIntensity={0.6} />
        </mesh>
        <BubblingParticles center={[0, 0.6, 0]} count={IS_MOBILE ? 5 : 10} />
      </group>
      {/* Smoke wisps */}
      <SmokeWisps center={[0, 1.5, 2]} count={IS_MOBILE ? 2 : 4} color="#666666" speed={0.25} />
      <pointLight position={[0, 2, 1]} color="#44cc44" intensity={0.5} distance={12} />
      <pointLight position={[0, 1, 2]} color="#9944ff" intensity={0.3} distance={8} />
    </group>
  );
}

// ─── Dark Dungeon Zone ───────────────────────────────────────────
function DarkDungeonZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stone columns */}
      <mesh position={[-1.2, 2, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 4, 6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      <mesh position={[1.2, 2, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 4, 6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      {/* Arch */}
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[3.5, 0.6, 0.8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
      </mesh>
      {/* Stairs going down */}
      {[0, 1, 2, 3].map((s) => (
        <mesh key={s} position={[0, -s * 0.4, 1 + s * 0.8]}>
          <boxGeometry args={[2.2 - s * 0.2, 0.3, 0.7]} />
          <meshStandardMaterial color="#555555" roughness={0.9} />
        </mesh>
      ))}
      {/* Iron gate */}
      <mesh position={[0, 2, 0.1]}>
        <planeGeometry args={[2, 3.5]} />
        <meshStandardMaterial color="#1a1a2a" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Skull */}
      <group position={[-2, 0.3, 1]}>
        <mesh>
          <sphereGeometry args={[0.2, 8, 6]} />
          <meshStandardMaterial color="#e8e0d0" />
        </mesh>
        <mesh position={[-0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh position={[0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      </group>
      {/* Wall torch */}
      <Torch position={[1.5, 2, 0.5]} />
      {/* Fog */}
      <SmokeWisps center={[0, 0.3, 1.5]} count={IS_MOBILE ? 2 : 4} color="#222244" speed={0.15} />
      <pointLight position={[0, 2, 1]} color="#3344aa" intensity={0.3} distance={10} />
    </group>
  );
}

// ─── Magical Route Path ──────────────────────────────────────────
function MagicRoute({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 2;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [from, to]);

  const steppingStones = useMemo(() => {
    const count = IS_MOBILE ? 2 : 4;
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / (count + 1);
      const p = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(...from),
        new THREE.Vector3(...to),
        t,
      );
      p.y += 1.5 + Math.sin(t * Math.PI) * 1;
      return [p.x, p.y, p.z] as [number, number, number];
    });
  }, [from, to]);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(points), 20, 0.08, 6, false]} />
        <meshStandardMaterial color="#aa66ff" emissive="#8844cc" emissiveIntensity={0.4} transparent opacity={0.6} />
      </mesh>
      {steppingStones.map((sp, i) => (
        <mesh key={i} position={sp}>
          <boxGeometry args={[0.4, 0.15, 0.4]} />
          <meshStandardMaterial color="#3a2a40" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Bats (Dragon Cave & Dark Dungeon) ───────────────────────────
function Bat({ center, radius, speed, offset }: { center: [number, number, number]; radius: number; speed: number; offset: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftRef = useRef<THREE.Mesh>(null!);
  const rightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (groupRef.current) {
      groupRef.current.position.set(
        center[0] + Math.cos(t) * radius,
        center[1] + Math.sin(t * 1.5) * 0.8,
        center[2] + Math.sin(t) * radius,
      );
      groupRef.current.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(t * 10) * 0.6;
    if (leftRef.current) leftRef.current.rotation.z = flap;
    if (rightRef.current) rightRef.current.rotation.z = -flap;
  });

  return (
    <group ref={groupRef}>
      <mesh scale={[0.1, 0.05, 0.15]}>
        <sphereGeometry args={[1, 4, 3]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh ref={leftRef} position={[-0.18, 0, 0]}>
        <planeGeometry args={[0.25, 0.1]} />
        <meshStandardMaterial color="#222222" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightRef} position={[0.18, 0, 0]}>
        <planeGeometry args={[0.25, 0.1]} />
        <meshStandardMaterial color="#222222" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Butterflies (Magic Forest) ──────────────────────────────────
function Butterfly({ center, speed, offset, color }: { center: [number, number, number]; speed: number; offset: number; color: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftRef = useRef<THREE.Mesh>(null!);
  const rightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (groupRef.current) {
      groupRef.current.position.set(
        center[0] + Math.sin(t * 0.7) * 3,
        center[1] + 1.5 + Math.sin(t * 1.3) * 0.5,
        center[2] + Math.cos(t * 0.5) * 3,
      );
    }
    const flap = Math.sin(t * 8) * 0.7;
    if (leftRef.current) leftRef.current.rotation.y = flap;
    if (rightRef.current) rightRef.current.rotation.y = -flap;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={leftRef} position={[-0.06, 0, 0]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightRef} position={[0.06, 0, 0]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Global Magic Sparkles ───────────────────────────────────────
function MagicSparkles({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 80,
        y: Math.random() * 25 - 5,
        z: (Math.random() - 0.5) * 80,
        speed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * 4),
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 1,
        p.y + Math.sin(t * 0.3 + p.phase) * 0.5,
        p.z + Math.cos(t * p.speed + p.phase) * 1,
      );
      const twinkle = 0.03 + Math.sin(t * 2 + p.phase) * 0.015;
      dummy.scale.setScalar(twinkle);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial color="#ffcc44" emissive="#ddaa22" emissiveIntensity={1} />
    </instancedMesh>
  );
}

// ─── Crescent Moon ───────────────────────────────────────────────
function CrescentMoon() {
  return (
    <mesh position={[30, 35, -40]} rotation={[0.3, 0, 0.2]}>
      <torusGeometry args={[3, 0.4, 8, 24, Math.PI * 0.8]} />
      <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.3} />
    </mesh>
  );
}

// ─── Distant Floating Rocks ──────────────────────────────────────
function DistantRocks() {
  const rocks = useMemo(
    () => [
      { pos: [-50, 8, -40] as [number, number, number], scale: 1.5 },
      { pos: [55, 12, -35] as [number, number, number], scale: 1.2 },
      { pos: [-45, 5, 45] as [number, number, number], scale: 1.8 },
      { pos: [50, 15, 40] as [number, number, number], scale: 1 },
      { pos: [0, 20, -50] as [number, number, number], scale: 1.3 },
    ],
    [],
  );

  return (
    <>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos}>
          <sphereGeometry args={[r.scale, 6, 5]} />
          <meshStandardMaterial color="#2a1a30" roughness={0.95} transparent opacity={0.3} />
        </mesh>
      ))}
    </>
  );
}

// ─── City Marker (HTML overlay) ──────────────────────────────────
function CityMarker({
  city,
  position,
  lang,
  unlocked,
  onSelect,
  markerY,
}: {
  city: City;
  position: [number, number, number];
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
  markerY: number;
}) {
  return (
    <group position={[position[0], markerY, position[2]]}>
      <Html center distanceFactor={30} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center gap-0.5"
          style={{ cursor: unlocked ? "pointer" : "default" }}
        >
          <span style={{ fontSize: 28 }}>{unlocked ? city.emoji : "\uD83D\uDD12"}</span>
          <div
            className="px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: unlocked
                ? "rgba(100, 50, 160, 0.85)"
                : "rgba(40, 20, 60, 0.6)",
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

// ─── Marker Y offsets per zone ───────────────────────────────────
const MARKER_Y_OFFSET: Record<string, number> = {
  "magic-forest": 5,
  "dragon-cave": 7,
  "wizard-tower": 18,
  "royal-castle": 14,
  "village-tavern": 7,
  "quest-board": 5,
  "potion-lab": 5,
  "dark-dungeon": 7,
};

// ─── Scene ───────────────────────────────────────────────────────
function FantasyScene({
  onSelectCity,
  lang,
  totalPoints,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
}) {
  const sparkleCount = IS_MOBILE ? 30 : 80;

  return (
    <>
      {/* Lighting — dim magical ambient */}
      <ambientLight intensity={0.3} color="#1a0a2a" />

      {/* Fog */}
      <fog attach="fog" args={["#1a0a2e", 30, 100]} />

      {/* Crescent Moon */}
      <CrescentMoon />

      {/* Distant floating rocks */}
      <DistantRocks />

      {/* Routes between zones */}
      {ROUTES.map(([fromId, toId], i) => {
        const fromCfg = ISLAND_CONFIG[fromId];
        const toCfg = ISLAND_CONFIG[toId];
        if (!fromCfg || !toCfg) return null;
        return <MagicRoute key={i} from={fromCfg.pos} to={toCfg.pos} />;
      })}

      {/* Islands + zone details + city markers */}
      {FANTASY_CITIES.map((city) => {
        const config = ISLAND_CONFIG[city.id];
        if (!config) return null;
        const { pos, radius } = config;
        const unlocked = true;
        const bobOffset = pos[0] + pos[2];

        const islandColors: Record<string, string> = {
          "magic-forest": "#3a8a3a",
          "dragon-cave": "#4a3a3a",
          "wizard-tower": "#5a4a6a",
          "royal-castle": "#5a7a5a",
          "village-tavern": "#6a8a4a",
          "quest-board": "#7a6a4a",
          "potion-lab": "#4a5a4a",
          "dark-dungeon": "#3a3a4a",
        };

        return (
          <React.Fragment key={city.id}>
            {/* Floating island */}
            <FloatingIsland
              position={pos}
              radius={radius}
              topColor={islandColors[city.id] ?? "#5a5a5a"}
              bobOffset={bobOffset}
            />

            {/* Zone-specific buildings */}
            {city.id === "magic-forest" && <MagicForestZone position={pos} />}
            {city.id === "royal-castle" && <RoyalCastleZone position={pos} />}
            {city.id === "wizard-tower" && <WizardTowerZone position={pos} />}
            {city.id === "dragon-cave" && <DragonCaveZone position={pos} />}
            {city.id === "village-tavern" && <VillageTavernZone position={pos} />}
            {city.id === "quest-board" && <QuestBoardZone position={pos} />}
            {city.id === "potion-lab" && <PotionLabZone position={pos} />}
            {city.id === "dark-dungeon" && <DarkDungeonZone position={pos} />}

            {/* City label */}
            <CityMarker
              city={city}
              position={pos}
              lang={lang}
              unlocked={unlocked}
              onSelect={onSelectCity}
              markerY={pos[1] + (MARKER_Y_OFFSET[city.id] ?? 5)}
            />
          </React.Fragment>
        );
      })}

      {/* Bats near Dragon Cave and Dark Dungeon (desktop only) */}
      {!IS_MOBILE && (
        <>
          <Bat center={[22, 4, -12]} radius={5} speed={0.6} offset={0} />
          <Bat center={[22, 6, -12]} radius={4} speed={0.5} offset={2} />
          <Bat center={[14, 2, 22]} radius={4} speed={0.55} offset={1} />
          <Bat center={[14, 4, 22]} radius={3} speed={0.65} offset={3} />
          <Bat center={[18, 3, 5]} radius={6} speed={0.4} offset={4} />
        </>
      )}

      {/* Butterflies near Magic Forest (desktop only) */}
      {!IS_MOBILE && (
        <>
          <Butterfly center={[0, 3, -20]} speed={0.5} offset={0} color="#ff66aa" />
          <Butterfly center={[2, 4, -18]} speed={0.4} offset={2} color="#66ccff" />
          <Butterfly center={[-2, 3, -22]} speed={0.6} offset={4} color="#ffcc44" />
        </>
      )}

      {/* Global magic sparkles */}
      <MagicSparkles count={sparkleCount} />

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
export function FantasyMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 35, 55], fov: 50 }}
        dpr={dpr}
        gl={IS_MOBILE ? { antialias: false, powerPreference: "high-performance" } : undefined}
        style={{
          background: "linear-gradient(180deg, #0a0418 0%, #1a0a2e 40%, #2a1040 100%)",
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <FantasyScene onSelectCity={onSelectCity} lang={lang} totalPoints={totalPoints} />
      </Canvas>
    </div>
  );
}
