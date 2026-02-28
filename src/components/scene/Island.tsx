"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { Topic, Language } from "@/types";
import { useProgressStore } from "@/stores/progressStore";
import { playPopSound, playDingSound } from "@/lib/speech";

// ─── Visual config per topic ────────────────────────────────────

interface IslandVisual {
  scale: number;
  height: number; // cone height multiplier
  groundColor: string;
  beachColor: string;
  decoration: "trees" | "palms" | "rocks" | "crystals" | "house" | "flowers";
  satellites: number; // 0-3 small satellite islands
}

const ISLAND_VISUALS: Record<string, IslandVisual> = {
  animals:  { scale: 1.5,  height: 1.2, groundColor: "#16a34a", beachColor: "#fbbf24", decoration: "trees",    satellites: 3 },
  colors:   { scale: 1.1,  height: 0.8, groundColor: "#a855f7", beachColor: "#fde68a", decoration: "crystals", satellites: 1 },
  food:     { scale: 1.35, height: 1.0, groundColor: "#65a30d", beachColor: "#fbbf24", decoration: "flowers",  satellites: 2 },
  numbers:  { scale: 1.05, height: 1.1, groundColor: "#64748b", beachColor: "#d4a76a", decoration: "rocks",    satellites: 1 },
  family:   { scale: 1.3,  height: 1.0, groundColor: "#ea580c", beachColor: "#fde68a", decoration: "house",    satellites: 2 },
  body:     { scale: 0.85, height: 0.7, groundColor: "#0891b2", beachColor: "#a8d8ea", decoration: "rocks",    satellites: 0 },
  weather:  { scale: 1.4,  height: 1.3, groundColor: "#0284c7", beachColor: "#bae6fd", decoration: "palms",    satellites: 2 },
  travel:   { scale: 1.15, height: 0.9, groundColor: "#d97706", beachColor: "#fef3c7", decoration: "palms",    satellites: 1 },
  school:   { scale: 1.0,  height: 1.0, groundColor: "#dc2626", beachColor: "#fecaca", decoration: "house",    satellites: 1 },
  work:     { scale: 0.9,  height: 0.8, groundColor: "#475569", beachColor: "#cbd5e1", decoration: "rocks",    satellites: 0 },
  sports:   { scale: 1.1,  height: 0.9, groundColor: "#16a34a", beachColor: "#bbf7d0", decoration: "flowers",  satellites: 1 },
  music:    { scale: 0.8,  height: 0.7, groundColor: "#7c3aed", beachColor: "#ddd6fe", decoration: "crystals", satellites: 0 },
};

const DEFAULT_VISUAL: IslandVisual = {
  scale: 1.0, height: 1.0, groundColor: "#6b7280", beachColor: "#fbbf24", decoration: "trees", satellites: 0,
};

// ─── Satellite mini-islands ─────────────────────────────────────

function SatelliteIslands({ count, color, beachColor }: { count: number; color: string; beachColor: string }) {
  if (count === 0) return null;

  const positions: [number, number, number][] = [
    [2.4, -0.15, 0.8],
    [-2.2, -0.15, -0.5],
    [1.0, -0.15, -2.3],
  ];

  return (
    <>
      {positions.slice(0, count).map((pos, i) => {
        const s = 0.3 + i * 0.05;
        return (
          <group key={i} position={pos} scale={s}>
            <mesh>
              <coneGeometry args={[1.2, 0.6, 6]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[1.3, 1.0, 0.1, 6]} />
              <meshStandardMaterial color={beachColor} flatShading />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ─── Decoration components ──────────────────────────────────────

function Trees({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0.2, 0.7, 0.1]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.2, 0.4, 0.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
      <mesh position={[-0.3, 0.8, -0.2]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.3, 0.45, -0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
      {/* Extra bush */}
      <mesh position={[0.4, 0.45, -0.3]}>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </>
  );
}

function Palms({ color }: { color: string }) {
  return (
    <>
      {/* Palm 1 — bent trunk */}
      <mesh position={[0.15, 0.55, 0.1]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.04, 0.06, 0.7, 5]} />
        <meshStandardMaterial color="#b8860b" flatShading />
      </mesh>
      <mesh position={[0.25, 0.85, 0.1]}>
        <sphereGeometry args={[0.22, 6, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* Coconuts */}
      <mesh position={[0.2, 0.75, 0.15]}>
        <sphereGeometry args={[0.06, 4, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>

      {/* Palm 2 */}
      <mesh position={[-0.25, 0.5, -0.15]} rotation={[0.1, 0, -0.2]}>
        <cylinderGeometry args={[0.03, 0.05, 0.6, 5]} />
        <meshStandardMaterial color="#b8860b" flatShading />
      </mesh>
      <mesh position={[-0.35, 0.78, -0.15]}>
        <sphereGeometry args={[0.2, 6, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </>
  );
}

function Rocks({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0.2, 0.5, 0.15]} rotation={[0.2, 0.5, 0]}>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.25, 0.48, -0.1]} rotation={[0.1, 1.2, 0.3]}>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.0, 0.55, -0.25]} rotation={[0.3, 0.8, 0]}>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.7).getStyle()} flatShading />
      </mesh>
    </>
  );
}

function Crystals({ color }: { color: string }) {
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
  return (
    <>
      {colors.slice(0, 4).map((c, i) => {
        const angle = (i / 4) * Math.PI * 2 + 0.3;
        const r = 0.25;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, 0.5 + i * 0.05, Math.sin(angle) * r]}
            rotation={[0.1 * i, 0, 0.15 * (i - 1)]}
          >
            <coneGeometry args={[0.08, 0.25 + i * 0.04, 4]} />
            <meshStandardMaterial
              color={color !== "#4b5563" ? c : "#6b7280"}
              emissive={color !== "#4b5563" ? c : "#000000"}
              emissiveIntensity={color !== "#4b5563" ? 0.3 : 0}
              flatShading
            />
          </mesh>
        );
      })}
    </>
  );
}

function House({ color }: { color: string }) {
  return (
    <>
      {/* Walls */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.35, 0.3, 0.3]} />
        <meshStandardMaterial color={color !== "#4b5563" ? "#f5e6d3" : "#6b7280"} flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.78, 0]} rotation={[0, Math.PI / 6, 0]}>
        <coneGeometry args={[0.3, 0.22, 4]} />
        <meshStandardMaterial color={color !== "#4b5563" ? "#b91c1c" : "#555555"} flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.45, 0.16]}>
        <boxGeometry args={[0.08, 0.15, 0.02]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.12, 0.88, -0.05]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#78716c" flatShading />
      </mesh>
    </>
  );
}

function Flowers({ color }: { color: string }) {
  const flowerColors = ["#f43f5e", "#f59e0b", "#ec4899", "#8b5cf6"];
  return (
    <>
      {/* Small tree */}
      <mesh position={[-0.2, 0.65, -0.1]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.4, -0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.25, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
      {/* Flowers */}
      {flowerColors.map((fc, i) => {
        const angle = (i / 4) * Math.PI * 2 + 0.5;
        const r = 0.35;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.42, Math.sin(angle) * r]}>
            <sphereGeometry args={[0.07, 6, 4]} />
            <meshStandardMaterial
              color={color !== "#4b5563" ? fc : "#6b7280"}
              emissive={color !== "#4b5563" ? fc : "#000000"}
              emissiveIntensity={color !== "#4b5563" ? 0.2 : 0}
              flatShading
            />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Decoration renderer ────────────────────────────────────────

function Decorations({ type, color }: { type: IslandVisual["decoration"]; color: string }) {
  switch (type) {
    case "trees": return <Trees color={color} />;
    case "palms": return <Palms color={color} />;
    case "rocks": return <Rocks color={color} />;
    case "crystals": return <Crystals color={color} />;
    case "house": return <House color={color} />;
    case "flowers": return <Flowers color={color} />;
  }
}

// ─── Island component ───────────────────────────────────────────

interface IslandProps {
  topic: Topic;
  onSelect: (topic: Topic) => void;
}

export function Island({ topic, onSelect }: IslandProps) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [unlockEffect, setUnlockEffect] = useState(false);
  const unlockProgress = useRef(0);
  const { isTopicUnlocked, totalPoints, unlockTopic, targetLanguage } =
    useProgressStore();

  const unlocked = isTopicUnlocked(topic.id);
  const canAfford = totalPoints >= topic.unlockCost;
  const lang: Language = targetLanguage;
  const visual = ISLAND_VISUALS[topic.id] ?? DEFAULT_VISUAL;

  useFrame(({ clock }, delta) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      const offset = topic.position[0] + topic.position[2];
      ref.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.15;
      ref.current.rotation.x = Math.sin(t * 0.4 + offset * 1.3) * 0.06;
      ref.current.rotation.z = Math.cos(t * 0.3 + offset * 0.7) * 0.04;

      // Unlock animation
      if (unlockEffect) {
        unlockProgress.current += delta / 1.5;
        if (unlockProgress.current >= 1) {
          setUnlockEffect(false);
          unlockProgress.current = 0;
          ref.current.scale.set(visual.scale, visual.scale, visual.scale);
        } else {
          const p = unlockProgress.current;
          const s = visual.scale * (1 + 0.3 * Math.sin(p * Math.PI));
          ref.current.scale.setScalar(s);
        }
      }
    }
  });

  const hasContent = topic.words.length > 0;

  const handleClick = () => {
    if (unlocked && hasContent) {
      playPopSound();
      onSelect(topic);
    } else if (!unlocked && canAfford && hasContent) {
      playDingSound();
      unlockTopic(topic.id);
      setUnlockEffect(true);
      unlockProgress.current = 0;
    }
  };

  const groundColor = unlocked ? visual.groundColor : "#6b7280";
  const decoColor = unlocked ? visual.groundColor : "#4b5563";

  const coneH = 1 * visual.height;

  return (
    <group ref={ref} position={topic.position} scale={visual.scale}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
        <group
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Island base — height varies */}
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[1.4, coneH, 6]} />
            <meshStandardMaterial
              color={groundColor}
              flatShading
              emissive={unlockEffect ? topic.color : hovered && unlocked ? topic.color : "#000000"}
              emissiveIntensity={unlockEffect ? 1.5 : hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Beach ring */}
          <mesh position={[0, -coneH * 0.3, 0]}>
            <cylinderGeometry args={[1.5, 1.2, 0.15, 6]} />
            <meshStandardMaterial color={unlocked ? visual.beachColor : "#9ca3af"} flatShading />
          </mesh>

          {/* Category-specific decorations */}
          <Decorations type={visual.decoration} color={decoColor} />
        </group>

        {/* Satellite mini-islands */}
        <SatelliteIslands
          count={visual.satellites}
          color={groundColor}
          beachColor={unlocked ? visual.beachColor : "#9ca3af"}
        />

        {/* Unlock sparkles */}
        {unlockEffect && (
          <Sparkles
            count={30}
            scale={4}
            size={6}
            speed={2}
            opacity={0.8}
            color={topic.color}
          />
        )}
      </Float>

      {/* Label */}
      <Html center position={[0, 2.5, 0]} distanceFactor={8} zIndexRange={[1, 5]}>
        <div className="text-center pointer-events-none select-none">
          <div className="text-3xl">{topic.emoji}</div>
          <p className="text-white text-sm font-bold whitespace-nowrap drop-shadow-lg">
            {topic.name[lang]}
          </p>
          {!unlocked && (
            <p className="text-xs mt-0.5">
              {!hasContent ? (
                <span className="text-slate-500">🔒 Coming soon</span>
              ) : canAfford ? (
                <span className="text-green-400 font-semibold">Tap to unlock!</span>
              ) : (
                <span className="text-amber-400">🔒 {topic.unlockCost} pts</span>
              )}
            </p>
          )}
        </div>
      </Html>
    </group>
  );
}
