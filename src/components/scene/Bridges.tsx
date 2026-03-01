"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { TopicId } from "@/types";

// Topic order for bridge connections (sequential)
const TOPIC_ORDER: TopicId[] = topics.map((t) => t.id);

function BridgeLine({ from, to, color }: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { midpoint, length, angle } = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(dx, dz);
    return {
      midpoint: [(from[0] + to[0]) / 2, 0.1, (from[2] + to[2]) / 2] as [number, number, number],
      length: len,
      angle: ang,
    };
  }, [from, to]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Pulse glow
      const t = clock.elapsedTime;
      materialRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={midpoint}
      rotation={[0, angle, 0]}
    >
      <boxGeometry args={[0.15, 0.06, length]} />
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.6}
        flatShading
      />
    </mesh>
  );
}

export function Bridges() {
  const { unlockedTopics, getTopicCompletedLevels } = useProgressStore();

  // Build connections between consecutive islands where both have Level 3 complete
  const bridges = useMemo(() => {
    const result: { from: [number, number, number]; to: [number, number, number]; color: string }[] = [];

    for (let i = 0; i < TOPIC_ORDER.length - 1; i++) {
      const currentId = TOPIC_ORDER[i];
      const nextId = TOPIC_ORDER[i + 1];

      // Both must be unlocked
      if (!unlockedTopics.includes(currentId) || !unlockedTopics.includes(nextId)) continue;

      const currentTopic = topics.find((t) => t.id === currentId);
      const nextTopic = topics.find((t) => t.id === nextId);
      if (!currentTopic || !nextTopic) continue;

      const levels = getTopicCompletedLevels(currentId);
      // Color based on completion: white (0), green (1), blue (2), gold (3)
      const color = levels >= 3 ? "#fbbf24" : levels >= 2 ? "#3b82f6" : levels >= 1 ? "#22c55e" : "#94a3b8";

      result.push({
        from: currentTopic.position,
        to: nextTopic.position,
        color,
      });
    }

    return result;
  }, [unlockedTopics, getTopicCompletedLevels]);

  if (bridges.length === 0) return null;

  return (
    <>
      {bridges.map((bridge, i) => (
        <BridgeLine key={i} from={bridge.from} to={bridge.to} color={bridge.color} />
      ))}
    </>
  );
}
