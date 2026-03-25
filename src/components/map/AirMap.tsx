"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Get air world cities ────────────────────────────────────────
const airWorld = WORLDS.find((w) => w.id === "air")!;
const AIR_CITIES = CITIES.filter((c) => airWorld.topicIds.includes(c.topicId));

// ─── Convert 2D percentage pos to 3D coords ─────────────────────
function toWorld(pos: { x: number; y: number }): [number, number, number] {
  return [(pos.x - 50) * 1.5, 0, (pos.y - 50) * 1.5];
}

// ─── Cloud platform (group of flattened spheres) ─────────────────
function CloudPlatform({ position }: { position: [number, number, number] }) {
  const offsets: [number, number, number][] = [
    [0, 0, 0],
    [1.2, -0.1, 0.3],
    [-1.0, -0.1, -0.4],
    [0.5, 0.15, -0.7],
  ];

  return (
    <group position={position}>
      {offsets.map((off, i) => (
        <mesh key={i} position={off} scale={[1.8, 0.6, 1.4]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
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
    <group position={[x, 2, z]}>
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
              background: unlocked ? "rgba(100,80,200,0.8)" : "rgba(60,60,80,0.6)",
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: unlocked ? "#fff" : "#888" }}>
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

// ─── Floating cloud wisps ────────────────────────────────────────
const WISP_COUNT = 20;

function CloudWisps() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(
    () =>
      Array.from({ length: WISP_COUNT }, () => ({
        x: (Math.random() - 0.5) * 120,
        y: Math.random() * 8 - 2,
        z: (Math.random() - 0.5) * 120,
        speed: 0.3 + Math.random() * 0.5,
        scale: 0.3 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    offsets.forEach((o, i) => {
      dummy.position.set(
        o.x + Math.sin(t * o.speed * 0.3) * 3,
        o.y + Math.sin(t * o.speed) * 0.5,
        o.z,
      );
      dummy.scale.setScalar(o.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, WISP_COUNT]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}

// ─── Scene contents ──────────────────────────────────────────────
function AirScene({
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
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 5]} intensity={1.2} />

      {/* Cloud platforms + markers */}
      {AIR_CITIES.map((city) => {
        const pos = toWorld(city.pos);
        const unlocked = totalPoints >= city.requiredXP;
        return (
          <React.Fragment key={city.id}>
            <CloudPlatform position={pos} />
            <CityMarker city={city} lang={lang} unlocked={unlocked} onSelect={onSelectCity} />
          </React.Fragment>
        );
      })}

      {/* Floating wisps */}
      <CloudWisps />

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={15}
        maxDistance={120}
      />
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────
interface MapProps {
  onSelectCity: (city: City) => void;
}

export function AirMap({ onSelectCity }: MapProps) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 50, 60], fov: 50 }}
        style={{ background: "linear-gradient(180deg, #87CEEB 0%, #E0F0FF 60%, #ffffff 100%)" }}
      >
        <AirScene onSelectCity={onSelectCity} lang={lang} totalPoints={totalPoints} />
      </Canvas>
    </div>
  );
}
