"use client";

import React, { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
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

const WORLD_ID = "professions";
const BG_COLOR = "#0a1a2e";

const professionsWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const PROFESSIONS_CITIES = CITIES.filter((c) =>
  professionsWorld.topicIds.includes(c.topicId)
);

// ─── City positions (circle layout) ─────────────────────────────
function getCityPositions(): Record<string, [number, number, number]> {
  const positions: Record<string, [number, number, number]> = {};
  const radius = 20;
  PROFESSIONS_CITIES.forEach((city, i) => {
    const angle = (i / PROFESSIONS_CITIES.length) * Math.PI * 2 - Math.PI / 2;
    positions[city.id] = [
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ];
  });
  return positions;
}

const CITY_POSITIONS = getCityPositions();

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ─── Ground ─────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#081828" roughness={1} />
    </mesh>
  );
}

// ─── City Platform ──────────────────────────────────────────────
function CityPlatform({
  city,
  position,
  lang,
  unlocked,
  completedLevels,
  onClick,
}: {
  city: City;
  position: [number, number, number];
  lang: Language;
  unlocked: boolean;
  completedLevels: number;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(clock.getElapsedTime() * 0.8 + position[0]) * 0.3;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <cylinderGeometry args={[3, 3.5, 1.5, 16]} />
        <meshStandardMaterial
          color={unlocked ? "#0ea5e9" : "#333"}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      <Html
        position={[position[0], position[1] + 3, position[2]]}
        center
        distanceFactor={40}
        style={{ pointerEvents: "auto" }}
      >
        <button
          onClick={onClick}
          className="flex flex-col items-center gap-0.5 select-none"
          style={{ cursor: unlocked ? "pointer" : "default" }}
        >
          <span className="text-2xl">{unlocked ? city.emoji : "🔒"}</span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
            style={{
              background: unlocked ? "rgba(14,165,233,0.2)" : "rgba(0,0,0,0.5)",
              color: unlocked ? "#7dd3fc" : "#666",
              border: `1px solid ${unlocked ? "rgba(14,165,233,0.3)" : "rgba(100,100,100,0.3)"}`,
            }}
          >
            {city.building[lang]}
          </span>
          {unlocked && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="text-[8px]"
                  style={{ opacity: i < completedLevels ? 1 : 0.2 }}
                >
                  ⭐
                </span>
              ))}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Scene content ──────────────────────────────────────────────
function SceneContent({
  onSelectCity,
  lang,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
}) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} color="#0ea5e9" intensity={1} distance={50} />
      <Ground />

      {PROFESSIONS_CITIES.map((city) => {
        const unlocked = true; // TODO: restore: totalPoints >= city.requiredXP
        return (
          <CityPlatform
            key={city.id}
            city={city}
            position={getCityPos(city)}
            lang={lang}
            unlocked={unlocked}
            completedLevels={getTopicCompletedLevels(city.topicId)}
            onClick={() => unlocked && onSelectCity(city)}
          />
        );
      })}
    </>
  );
}

// ─── Main export ────────────────────────────────────────────────
interface ProfessionsMapProps {
  onSelectCity: (city: City) => void;
}

export function ProfessionsMap({ onSelectCity }: ProfessionsMapProps) {
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState<[number, number]>(IS_MOBILE ? [0.8, 1] : [1, 1.5]);

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 35, 45], fov: 50 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: BG_COLOR }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={[BG_COLOR, 60, 150]} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minDistance={20}
          maxDistance={80}
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
