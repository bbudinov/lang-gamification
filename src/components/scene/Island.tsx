"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { Topic, Language, LevelNumber } from "@/types";
import { useProgressStore } from "@/stores/progressStore";
import { playPopSound, playDingSound } from "@/lib/speech";

// ─── Visual config per topic ────────────────────────────────────

interface IslandVisual {
  scale: number;
  height: number;
  groundColor: string;
  cliffColor: string;
  beachColor: string;
  decoration: "trees" | "palms" | "rocks" | "crystals" | "house" | "flowers";
  satellites: number;
}

const ISLAND_VISUALS: Record<string, IslandVisual> = {
  animals:  { scale: 1.5,  height: 1.2, groundColor: "#16a34a", cliffColor: "#7c5e3c", beachColor: "#fbbf24", decoration: "trees",    satellites: 3 },
  colors:   { scale: 1.1,  height: 0.8, groundColor: "#a855f7", cliffColor: "#6b4c8a", beachColor: "#fde68a", decoration: "crystals", satellites: 1 },
  food:     { scale: 1.35, height: 1.0, groundColor: "#65a30d", cliffColor: "#8b6f3a", beachColor: "#fbbf24", decoration: "flowers",  satellites: 2 },
  numbers:  { scale: 1.05, height: 1.1, groundColor: "#64748b", cliffColor: "#4a5568", beachColor: "#d4a76a", decoration: "rocks",    satellites: 1 },
  family:   { scale: 1.3,  height: 1.0, groundColor: "#ea580c", cliffColor: "#92400e", beachColor: "#fde68a", decoration: "house",    satellites: 2 },
  body:     { scale: 0.85, height: 0.7, groundColor: "#0891b2", cliffColor: "#155e75", beachColor: "#a8d8ea", decoration: "rocks",    satellites: 0 },
  weather:  { scale: 1.4,  height: 1.3, groundColor: "#0284c7", cliffColor: "#1e3a5f", beachColor: "#bae6fd", decoration: "palms",    satellites: 2 },
  travel:   { scale: 1.15, height: 0.9, groundColor: "#d97706", cliffColor: "#92400e", beachColor: "#fef3c7", decoration: "palms",    satellites: 1 },
  school:   { scale: 1.0,  height: 1.0, groundColor: "#dc2626", cliffColor: "#7f1d1d", beachColor: "#fecaca", decoration: "house",    satellites: 1 },
  work:     { scale: 0.9,  height: 0.8, groundColor: "#475569", cliffColor: "#334155", beachColor: "#cbd5e1", decoration: "rocks",    satellites: 0 },
  sports:   { scale: 1.1,  height: 0.9, groundColor: "#16a34a", cliffColor: "#5c4a2a", beachColor: "#bbf7d0", decoration: "flowers",  satellites: 1 },
  music:    { scale: 0.8,  height: 0.7, groundColor: "#7c3aed", cliffColor: "#4c1d95", beachColor: "#ddd6fe", decoration: "crystals", satellites: 0 },
};

const DEFAULT_VISUAL: IslandVisual = {
  scale: 1.0, height: 1.0, groundColor: "#6b7280", cliffColor: "#4b5563", beachColor: "#fbbf24", decoration: "trees", satellites: 0,
};

// ─── Organic island body ────────────────────────────────────────

function IslandBody({ visual, unlocked, hovered, unlockEffect, topicColor }: {
  visual: IslandVisual; unlocked: boolean; hovered: boolean; unlockEffect: boolean; topicColor: string;
}) {
  const gColor = unlocked ? visual.groundColor : "#6b7280";
  const cColor = unlocked ? visual.cliffColor : "#4b5563";
  const bColor = unlocked ? visual.beachColor : "#9ca3af";
  const h = visual.height;

  const emissive = unlockEffect ? topicColor : hovered && unlocked ? topicColor : "#000000";
  const emissiveI = unlockEffect ? 1.5 : hovered ? 0.3 : 0;

  return (
    <>
      {/* Main rocky mass — squashed icosahedron for organic shape */}
      <mesh position={[0, 0.05, 0]} scale={[1.3, 0.5 * h, 1.3]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={gColor}
          flatShading
          emissive={emissive}
          emissiveIntensity={emissiveI}
        />
      </mesh>

      {/* Secondary peak — offset for mountain-like silhouette */}
      <mesh position={[0.15, 0.25 * h, -0.1]} scale={[0.6, 0.4 * h, 0.55]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={new THREE.Color(gColor).multiplyScalar(0.85).getStyle()}
          flatShading
          emissive={emissive}
          emissiveIntensity={emissiveI * 0.5}
        />
      </mesh>

      {/* Cliff face — low rock mass on one side */}
      <mesh position={[-0.5, -0.1, 0.3]} scale={[0.5, 0.3 * h, 0.45]} rotation={[0, 0.8, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={cColor} flatShading />
      </mesh>

      {/* Beach shelf — organic shape, wider and flatter */}
      <mesh position={[0, -0.2 * h, 0]} scale={[1, 1, 1]}>
        <cylinderGeometry args={[1.6, 1.25, 0.12, 8]} />
        <meshStandardMaterial color={bColor} flatShading />
      </mesh>

      {/* Underwater rock base — tapered, darker */}
      <mesh position={[0, -0.35 * h, 0]} scale={[0.9, 0.4, 0.9]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={new THREE.Color(cColor).multiplyScalar(0.6).getStyle()}
          flatShading
        />
      </mesh>

      {/* Shoreline foam ring — semi-transparent */}
      <mesh position={[0, -0.15 * h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.12, 4, 16]} />
        <meshStandardMaterial
          color="#e0f2fe"
          transparent
          opacity={0.3}
          flatShading
        />
      </mesh>

      {/* Scattered shore rocks */}
      <mesh position={[1.1, -0.15, 0.5]} rotation={[0.3, 0.7, 0.1]}>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={cColor} flatShading />
      </mesh>
      <mesh position={[-0.9, -0.12, -0.7]} rotation={[0.5, 1.2, 0.2]}>
        <dodecahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={cColor} flatShading />
      </mesh>
      <mesh position={[0.6, -0.18, -1.0]} rotation={[0.1, 2.1, 0.3]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={cColor} flatShading />
      </mesh>
    </>
  );
}

// ─── Organic satellite mini-islands ─────────────────────────────

function SatelliteIslands({ count, color, cliffColor, beachColor }: {
  count: number; color: string; cliffColor: string; beachColor: string;
}) {
  if (count === 0) return null;

  const configs = useMemo(() => [
    { pos: [2.6, -0.1, 1.0] as [number, number, number], s: 0.32, rot: 0.3, peakOff: 0.15 },
    { pos: [-2.4, -0.1, -0.7] as [number, number, number], s: 0.28, rot: 1.5, peakOff: -0.1 },
    { pos: [1.2, -0.1, -2.5] as [number, number, number], s: 0.35, rot: 2.8, peakOff: 0.2 },
  ], []);

  return (
    <>
      {configs.slice(0, count).map((cfg, i) => (
        <group key={i} position={cfg.pos} scale={cfg.s}>
          {/* Main body */}
          <mesh scale={[1.2, 0.45, 1.2]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Small peak */}
          <mesh position={[cfg.peakOff, 0.2, 0]} scale={[0.5, 0.35, 0.5]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Beach ring */}
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[1.4, 1.1, 0.08, 6]} />
            <meshStandardMaterial color={beachColor} flatShading />
          </mesh>
          {/* Tiny rock */}
          <mesh position={[0.7, -0.05, 0.4]} rotation={[0, cfg.rot, 0.2]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={cliffColor} flatShading />
          </mesh>
        </group>
      ))}
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
      <mesh position={[0.15, 0.55, 0.1]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.04, 0.06, 0.7, 5]} />
        <meshStandardMaterial color="#b8860b" flatShading />
      </mesh>
      <mesh position={[0.25, 0.85, 0.1]}>
        <sphereGeometry args={[0.22, 6, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.2, 0.75, 0.15]}>
        <sphereGeometry args={[0.06, 4, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
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
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.35, 0.3, 0.3]} />
        <meshStandardMaterial color={color !== "#4b5563" ? "#f5e6d3" : "#6b7280"} flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]} rotation={[0, Math.PI / 6, 0]}>
        <coneGeometry args={[0.3, 0.22, 4]} />
        <meshStandardMaterial color={color !== "#4b5563" ? "#b91c1c" : "#555555"} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0.16]}>
        <boxGeometry args={[0.08, 0.15, 0.02]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
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
      <mesh position={[-0.2, 0.65, -0.1]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.4, -0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.25, 4]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
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

// ─── Ambient effects for unlocked islands ───────────────────────

function OrbitingParticles({ count, color, speed, yBase, radius, size }: {
  count: number; color: string; speed: number; yBase: number; radius: number; size: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime * speed;
    groupRef.current.children.forEach((child, i) => {
      const offset = (i / count) * Math.PI * 2;
      child.position.x = Math.cos(t + offset) * radius;
      child.position.z = Math.sin(t + offset) * radius;
      child.position.y = yBase + Math.sin(t * 1.5 + offset) * 0.15;
      child.rotation.y = t + offset;
    });
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[size, size * 0.3, size * 1.5]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function RisingParticles({ count, color, speed, spread, maxY, size }: {
  count: number; color: string; speed: number; spread: number; maxY: number; size: number;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const offsets = useRef(Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * spread,
    z: (Math.random() - 0.5) * spread,
    phase: Math.random() * Math.PI * 2,
    speed: 0.7 + Math.random() * 0.6,
  })));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const o = offsets.current[i];
      const yProgress = ((t * speed * o.speed + o.phase) % maxY);
      mesh.position.set(
        o.x + Math.sin(t * 0.5 + o.phase) * 0.1,
        0.5 + yProgress,
        o.z + Math.cos(t * 0.5 + o.phase) * 0.1
      );
      (mesh.material as THREE.MeshStandardMaterial).opacity = 1 - yProgress / maxY;
    });
  });

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[size, 4, 4]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
            flatShading
          />
        </mesh>
      ))}
    </>
  );
}

function IslandAmbience({ topicId }: { topicId: string }) {
  switch (topicId) {
    case "animals":
      return <OrbitingParticles count={3} color="#fbbf24" speed={0.6} yBase={1.2} radius={1.0} size={0.08} />;
    case "colors":
      return <OrbitingParticles count={4} color="#ef4444" speed={0.4} yBase={1.0} radius={0.8} size={0.06} />;
    case "food":
      return <RisingParticles count={3} color="#e2e8f0" speed={0.3} spread={0.5} maxY={1.5} size={0.06} />;
    case "weather":
      return <RisingParticles count={4} color="#bae6fd" speed={0.4} spread={1.0} maxY={2.0} size={0.04} />;
    case "music":
      return <RisingParticles count={3} color="#c084fc" speed={0.25} spread={0.6} maxY={1.8} size={0.05} />;
    case "family":
      return <RisingParticles count={2} color="#f472b6" speed={0.2} spread={0.4} maxY={1.5} size={0.05} />;
    default:
      return null;
  }
}

// ─── Level dots (HTML overlay on island label) ──────────────────

const LEVEL_COLORS = ["#22c55e", "#3b82f6", "#a855f7"];

function LevelDots({ topicId }: { topicId: string }) {
  const completedLevels = useProgressStore((s) => s.getTopicCompletedLevels(topicId as import("@/types").TopicId));

  return (
    <div className="flex items-center justify-center gap-1.5 mt-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: i < completedLevels ? LEVEL_COLORS[i] : "#4b5563",
            boxShadow: i < completedLevels ? `0 0 6px ${LEVEL_COLORS[i]}` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Bubbles for unlock rise effect ─────────────────────────────

function UnlockBubbles({ active, color }: { active: boolean; color: string }) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const offsets = useRef(Array.from({ length: 8 }, () => ({
    x: (Math.random() - 0.5) * 2.5,
    z: (Math.random() - 0.5) * 2.5,
    speed: 1.5 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    size: 0.04 + Math.random() * 0.08,
  })));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const o = offsets.current[i];
      const y = ((t * o.speed + o.phase) % 3.0) - 1.5;
      mesh.position.set(
        o.x + Math.sin(t + o.phase) * 0.2,
        y,
        o.z + Math.cos(t * 0.8 + o.phase) * 0.2
      );
      mesh.scale.setScalar(o.size * (1 - Math.max(0, y) / 2));
    });
  });

  if (!active) return null;

  return (
    <>
      {offsets.current.map((o, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </>
  );
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
  const [showBubbles, setShowBubbles] = useState(false);
  const unlockProgress = useRef(0);
  const riseY = useRef(0);
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

      if (unlockEffect) {
        unlockProgress.current += delta / 2.0;
        if (unlockProgress.current >= 1) {
          setUnlockEffect(false);
          setShowBubbles(false);
          unlockProgress.current = 0;
          riseY.current = 0;
          ref.current.scale.set(visual.scale, visual.scale, visual.scale);
        } else {
          const p = unlockProgress.current;
          const riseEase = 1 - Math.pow(1 - Math.min(p * 1.3, 1), 3);
          riseY.current = -2.5 * (1 - riseEase);
          const scalePop = p > 0.5 ? 1 + 0.25 * Math.sin((p - 0.5) * 2 * Math.PI) : riseEase * 0.8 + 0.2;
          ref.current.scale.setScalar(visual.scale * scalePop);
        }
        ref.current.position.y = topic.position[1] + riseY.current;
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
      setShowBubbles(true);
      unlockProgress.current = 0;
      riseY.current = -2.5;
    }
  };

  const decoColor = unlocked ? visual.groundColor : "#4b5563";

  return (
    <group ref={ref} position={topic.position} scale={visual.scale}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
        <group
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Organic island body */}
          <IslandBody
            visual={visual}
            unlocked={unlocked}
            hovered={hovered}
            unlockEffect={unlockEffect}
            topicColor={topic.color}
          />

          {/* Category-specific decorations */}
          <Decorations type={visual.decoration} color={decoColor} />
        </group>

        {/* Organic satellite mini-islands */}
        <SatelliteIslands
          count={visual.satellites}
          color={unlocked ? visual.groundColor : "#6b7280"}
          cliffColor={unlocked ? visual.cliffColor : "#4b5563"}
          beachColor={unlocked ? visual.beachColor : "#9ca3af"}
        />

        {/* Ambient effects for unlocked islands */}
        {unlocked && !unlockEffect && (
          <IslandAmbience topicId={topic.id} />
        )}

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

      {/* Bubbles during rise-from-water */}
      <UnlockBubbles active={showBubbles} color={topic.color} />

      {/* Label */}
      <Html center position={[0, 2.5, 0]} distanceFactor={8} zIndexRange={[1, 5]}>
        <div className="text-center pointer-events-none select-none">
          <div className="text-3xl">{topic.emoji}</div>
          <p className="text-white text-sm font-bold whitespace-nowrap drop-shadow-lg">
            {topic.name[lang]}
          </p>
          {unlocked && <LevelDots topicId={topic.id} />}
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
