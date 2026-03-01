"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useProgressStore } from "@/stores/progressStore";
import { playDingSound } from "@/lib/speech";

export function TreasureChest() {
  const groupRef = useRef<THREE.Group>(null);
  const [collected, setCollected] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const { addPoints, addEnergy } = useProgressStore();

  // Fixed position — floating between islands
  const position: [number, number, number] = [3, 0.3, 12];

  useFrame(({ clock }) => {
    if (!groupRef.current || collected) return;
    const t = clock.elapsedTime;

    // Gentle bobbing + rotation
    groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.15;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;

    // Golden glow pulse
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (child.userData.isGlow) {
          child.material.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.2;
        }
      }
    });
  });

  const handleClick = useCallback(() => {
    if (collected) return;
    playDingSound();
    addPoints(15);
    addEnergy(10);
    setShowSparkles(true);
    setTimeout(() => setCollected(true), 1500);
  }, [collected, addPoints, addEnergy]);

  if (collected) return null;

  return (
    <group ref={groupRef} position={position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <group onClick={handleClick}>
          {/* Chest body */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.35]} />
            <meshStandardMaterial color="#8B4513" flatShading />
          </mesh>

          {/* Chest lid */}
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.52, 0.08, 0.37]} />
            <meshStandardMaterial color="#A0522D" flatShading />
          </mesh>

          {/* Gold lock */}
          <mesh position={[0, 0.05, 0.18]} userData={{ isGlow: true }}>
            <boxGeometry args={[0.08, 0.1, 0.04]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.5}
              flatShading
            />
          </mesh>

          {/* Metal bands */}
          <mesh position={[0, 0, 0.178]}>
            <boxGeometry args={[0.5, 0.04, 0.01]} />
            <meshStandardMaterial color="#b8860b" flatShading />
          </mesh>
          <mesh position={[0, 0.12, 0.178]}>
            <boxGeometry args={[0.5, 0.04, 0.01]} />
            <meshStandardMaterial color="#b8860b" flatShading />
          </mesh>

          {/* Golden glow ring */}
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ isGlow: true }}>
            <torusGeometry args={[0.4, 0.03, 4, 12]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.5}
              transparent
              opacity={0.3}
              flatShading
            />
          </mesh>
        </group>
      </Float>

      {/* Label */}
      <Html center position={[0, 0.5, 0]} distanceFactor={8} zIndexRange={[1, 5]}>
        <div className="text-center pointer-events-none select-none animate-pulse">
          <span className="text-xs text-amber-300 font-bold drop-shadow-lg">+15⭐ +10⚡</span>
        </div>
      </Html>

      {/* Collection sparkles */}
      {showSparkles && (
        <Sparkles count={20} scale={2} size={4} speed={3} opacity={0.8} color="#fbbf24" />
      )}
    </group>
  );
}
