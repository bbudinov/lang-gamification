"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float } from "@react-three/drei";
import type { Group } from "three";
import type { Topic, Language } from "@/types";
import { useProgressStore } from "@/stores/progressStore";

interface IslandProps {
  topic: Topic;
  onSelect: (topic: Topic) => void;
}

export function Island({ topic, onSelect }: IslandProps) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { isTopicUnlocked, totalPoints, unlockTopic, targetLanguage } =
    useProgressStore();

  const unlocked = isTopicUnlocked(topic.id);
  const canAfford = totalPoints >= topic.unlockCost;
  const lang: Language = targetLanguage;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 + topic.position[0]) * 0.1;
    }
  });

  const hasContent = topic.words.length > 0;

  const handleClick = () => {
    if (unlocked && hasContent) {
      onSelect(topic);
    } else if (!unlocked && canAfford && hasContent) {
      unlockTopic(topic.id);
    }
  };

  const islandColor = unlocked ? topic.color : "#6b7280";
  const treeColor = unlocked ? "#16a34a" : "#4b5563";

  return (
    <group ref={ref} position={topic.position}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.3}>
        <group
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Island base */}
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[1.4, 1, 6]} />
            <meshStandardMaterial
              color={islandColor}
              flatShading
              emissive={hovered && unlocked ? topic.color : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Beach ring */}
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[1.5, 1.2, 0.15, 6]} />
            <meshStandardMaterial color="#fbbf24" flatShading />
          </mesh>

          {/* Tree 1 */}
          <mesh position={[0.2, 0.7, 0.1]}>
            <coneGeometry args={[0.25, 0.5, 4]} />
            <meshStandardMaterial color={treeColor} flatShading />
          </mesh>
          <mesh position={[0.2, 0.4, 0.1]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 4]} />
            <meshStandardMaterial color="#92400e" flatShading />
          </mesh>

          {/* Tree 2 */}
          <mesh position={[-0.3, 0.8, -0.2]}>
            <coneGeometry args={[0.3, 0.6, 4]} />
            <meshStandardMaterial color={treeColor} flatShading />
          </mesh>
          <mesh position={[-0.3, 0.45, -0.2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.35, 4]} />
            <meshStandardMaterial color="#92400e" flatShading />
          </mesh>
        </group>
      </Float>

      {/* Label */}
      <Html center position={[0, 2, 0]} distanceFactor={8}>
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
