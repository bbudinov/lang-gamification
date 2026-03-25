"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Get underwater world cities ─────────────────────────────────
const underwaterWorld = WORLDS.find((w) => w.id === "underwater")!;
const UNDERWATER_CITIES = CITIES.filter((c) => underwaterWorld.topicIds.includes(c.topicId));

// ─── Convert 2D percentage pos to 3D coords ─────────────────────
function toWorld(pos: { x: number; y: number }): [number, number, number] {
  return [(pos.x - 50) * 1.5, 0, (pos.y - 50) * 1.5];
}

// ─── Coral/rock platform ────────────────────────────────────────
const CORAL_COLORS = ["#FF6B6B", "#FF8E53", "#FFC93C", "#6BCB77", "#4D96FF", "#9B59B6"];

function CoralPlatform({ position, index }: { position: [number, number, number]; index: number }) {
  const color = CORAL_COLORS[index % CORAL_COLORS.length];

  // Deterministic coral arrangement based on index
  const corals = useMemo(() => {
    const seed = index * 137;
    return Array.from({ length: 4 }, (_, i) => {
      const angle = ((seed + i * 90) % 360) * (Math.PI / 180);
      const dist = 0.8 + (((seed + i * 7) % 10) / 10) * 0.8;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: 0.6 + (((seed + i * 13) % 10) / 10) * 1.2,
        radius: 0.15 + (((seed + i * 3) % 10) / 10) * 0.2,
      };
    });
  }, [index]);

  return (
    <group position={position}>
      {/* Base rock */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[2.5, 3, 1.2, 8]} />
        <meshStandardMaterial color="#4a5568" roughness={0.9} />
      </mesh>
      {/* Coral branches */}
      {corals.map((c, i) => (
        <mesh key={i} position={[c.x, c.height / 2 + 0.2, c.z]}>
          <cylinderGeometry args={[c.radius * 0.6, c.radius, c.height, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// ─── City marker (Html overlay) ──────────────────────────────────
function CityMarker({
  city,
  lang,
  unlocked,
  onSelect,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
}) {
  const [x, , z] = toWorld(city.pos);

  return (
    <group position={[x, 3, z]}>
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
              background: unlocked ? "rgba(6,182,212,0.8)" : "rgba(40,60,80,0.6)",
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: unlocked ? "#fff" : "#667" }}>
              {city.name[lang]}
            </p>
          </div>
          {!unlocked && city.requiredXP > 0 && (
            <span className="text-[9px] font-medium" style={{ color: "#c8a050" }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Rising bubbles ──────────────────────────────────────────────
const BUBBLE_COUNT = 30;

function Bubbles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bubbles = useMemo(
    () =>
      Array.from({ length: BUBBLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 120,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * 100,
        scale: 0.1 + Math.random() * 0.25,
        wobble: 0.5 + Math.random() * 1.5,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    bubbles.forEach((b, i) => {
      // Rise from -20 to 30, then loop
      const y = ((t * b.speed + b.offset) % 50) - 20;
      dummy.position.set(
        b.x + Math.sin(t * b.wobble + b.offset) * 1.5,
        y,
        b.z + Math.cos(t * b.wobble * 0.7 + b.offset) * 1.5,
      );
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BUBBLE_COUNT]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
    </instancedMesh>
  );
}

// ─── Scene contents ──────────────────────────────────────────────
function UnderwaterScene({
  onSelectCity,
  lang,
  totalPoints,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
}) {
  return (
    <>
      {/* Fog for depth */}
      <fog attach="fog" args={["#0a2a4a", 20, 100]} />

      {/* Lighting — subtle light rays from above */}
      <ambientLight intensity={0.3} color="#4a90b8" />
      <directionalLight position={[5, 30, -5]} intensity={0.8} color="#7ec8e3" />
      <directionalLight position={[-10, 20, 10]} intensity={0.3} color="#2a6090" />

      {/* Sea floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d3b5e" roughness={1} />
      </mesh>

      {/* Coral platforms + markers */}
      {UNDERWATER_CITIES.map((city, i) => {
        const pos = toWorld(city.pos);
        const unlocked = totalPoints >= city.requiredXP;
        return (
          <React.Fragment key={city.id}>
            <CoralPlatform position={pos} index={i} />
            <CityMarker city={city} lang={lang} unlocked={unlocked} onSelect={onSelectCity} />
          </React.Fragment>
        );
      })}

      {/* Rising bubbles */}
      <Bubbles />

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        minDistance={15}
        maxDistance={100}
      />
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────
interface MapProps {
  onSelectCity: (city: City) => void;
}

export function UnderwaterMap({ onSelectCity }: MapProps) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 40, 55], fov: 50 }}
        style={{ background: "linear-gradient(180deg, #1a5276 0%, #0e3d5c 40%, #0a2a4a 100%)" }}
      >
        <UnderwaterScene onSelectCity={onSelectCity} lang={lang} totalPoints={totalPoints} />
      </Canvas>
    </div>
  );
}
