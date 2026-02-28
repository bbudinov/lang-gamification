"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { TopicId } from "@/types";

// Find position of a topic by ID
function getTopicPosition(topicId: TopicId): [number, number, number] {
  const topic = topics.find((t) => t.id === topicId);
  return topic?.position ?? [-3, 0.5, -2];
}

// Get the last unlocked topic in order
function getLastUnlockedTopic(unlockedTopics: TopicId[]): TopicId {
  // topics array is ordered by progression, find the last one that's unlocked
  let last: TopicId = "animals";
  for (const topic of topics) {
    if (unlockedTopics.includes(topic.id)) {
      last = topic.id;
    }
  }
  return last;
}

// Offset the boat position slightly to the side of the island
function boatPos(islandPos: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(islandPos[0] + 2.2, 0.05, islandPos[2] + 0.5);
}

export function Boat() {
  const groupRef = useRef<THREE.Group>(null);
  const { unlockedTopics } = useProgressStore();

  const lastTopic = useMemo(() => getLastUnlockedTopic(unlockedTopics), [unlockedTopics]);
  const targetPosition = useMemo(() => boatPos(getTopicPosition(lastTopic)), [lastTopic]);

  // Track previous position for travel animation
  const currentPos = useRef<THREE.Vector3>(targetPosition.clone());
  const [traveling, setTraveling] = useState(false);
  const prevTopicRef = useRef<TopicId>(lastTopic);

  // Detect new unlock → start travel
  useEffect(() => {
    if (lastTopic !== prevTopicRef.current) {
      setTraveling(true);
      prevTopicRef.current = lastTopic;
    }
  }, [lastTopic]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.elapsedTime;

    if (traveling) {
      // Travel toward target
      currentPos.current.lerp(targetPosition, 0.02);
      if (currentPos.current.distanceTo(targetPosition) < 0.1) {
        currentPos.current.copy(targetPosition);
        setTraveling(false);
      }
    }

    // Position
    groupRef.current.position.copy(currentPos.current);

    // Bobbing on water
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.06 + 0.05;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.08;
    groupRef.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.04;

    // Face direction of travel
    if (traveling) {
      const dir = new THREE.Vector3().subVectors(targetPosition, currentPos.current);
      if (dir.length() > 0.2) {
        const angle = Math.atan2(dir.x, dir.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          angle,
          0.05
        );
      }
    }
  });

  return (
    <group ref={groupRef} position={[currentPos.current.x, 0.05, currentPos.current.z]}>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.15}>
        {/* Hull — dark wood */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.2, 0.9]} />
          <meshStandardMaterial color="#5c3a1e" flatShading />
        </mesh>

        {/* Hull bottom — tapered */}
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.28, 0.08, 0.7]} />
          <meshStandardMaterial color="#4a2e15" flatShading />
        </mesh>

        {/* Bow (front taper) */}
        <mesh position={[0, 0.02, 0.5]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.25, 0.12, 0.2]} />
          <meshStandardMaterial color="#5c3a1e" flatShading />
        </mesh>

        {/* Cabin */}
        <mesh position={[0, 0.2, -0.1]}>
          <boxGeometry args={[0.3, 0.18, 0.3]} />
          <meshStandardMaterial color="#f5e6d3" flatShading />
        </mesh>

        {/* Cabin roof */}
        <mesh position={[0, 0.32, -0.1]}>
          <boxGeometry args={[0.34, 0.04, 0.34]} />
          <meshStandardMaterial color="#8b4513" flatShading />
        </mesh>

        {/* Mast */}
        <mesh position={[0, 0.55, 0.1]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
          <meshStandardMaterial color="#d4a76a" flatShading />
        </mesh>

        {/* Sail */}
        <mesh position={[0.12, 0.5, 0.1]} rotation={[0, 0.3, 0]}>
          <planeGeometry args={[0.25, 0.4]} />
          <meshStandardMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Flag on top */}
        <mesh position={[0.06, 0.82, 0.1]} rotation={[0, 0, 0.2]}>
          <planeGeometry args={[0.12, 0.08]} />
          <meshStandardMaterial
            color="#ef4444"
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>

      {/* Wake trail when traveling */}
      {traveling && (
        <>
          <mesh position={[0, -0.05, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 0.5]} />
            <meshStandardMaterial
              color="#a5d8f3"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.05, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 0.3]} />
            <meshStandardMaterial
              color="#a5d8f3"
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
