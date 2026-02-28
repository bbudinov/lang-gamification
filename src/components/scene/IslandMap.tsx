"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, ContactShadows } from "@react-three/drei";
import { Island } from "./Island";
import { Ocean } from "./Ocean";
import { Clouds } from "./Clouds";
import { topics } from "@/data/words";
import { TOUCH } from "three";
import type { Topic } from "@/types";

interface DayNightConfig {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  fogColor: string;
  bgColor: string;
}

function useDayNightCycle(): DayNightConfig {
  return useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) {
      // Morning: warm, gentle
      return {
        ambientColor: "#fff5e6",
        ambientIntensity: 0.5,
        directionalColor: "#ffb347",
        directionalIntensity: 0.7,
        fogColor: "#1a1a3e",
        bgColor: "#1a1a3e",
      };
    } else if (hour >= 12 && hour < 17) {
      // Afternoon: bright
      return {
        ambientColor: "#ffffff",
        ambientIntensity: 0.7,
        directionalColor: "#fff9c4",
        directionalIntensity: 0.9,
        fogColor: "#0d1b3e",
        bgColor: "#0d1b3e",
      };
    } else if (hour >= 17 && hour < 21) {
      // Evening: sunset
      return {
        ambientColor: "#ffccbc",
        ambientIntensity: 0.45,
        directionalColor: "#ff7043",
        directionalIntensity: 0.6,
        fogColor: "#1a0e2e",
        bgColor: "#1a0e2e",
      };
    } else {
      // Night (21-6): cool blue, dim
      return {
        ambientColor: "#b3d4fc",
        ambientIntensity: 0.3,
        directionalColor: "#6b8cce",
        directionalIntensity: 0.4,
        fogColor: "#060d1f",
        bgColor: "#060d1f",
      };
    }
  }, []);
}

interface IslandMapProps {
  onSelectTopic: (topic: Topic) => void;
}

export function IslandMap({ onSelectTopic }: IslandMapProps) {
  const [dpr, setDpr] = useState(1.5);
  const dn = useDayNightCycle();

  const handleSelect = useCallback(
    (topic: Topic) => {
      onSelectTopic(topic);
    },
    [onSelectTopic]
  );

  return (
    <div className="w-full h-full relative z-0" style={{ touchAction: "none" }}>
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 12, 12], fov: 50 }}
        style={{ touchAction: "none" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
        />
        <color attach="background" args={[dn.bgColor]} />
        <fog attach="fog" args={[dn.fogColor, 25, 55]} />
        <ambientLight color={dn.ambientColor} intensity={dn.ambientIntensity} />
        <directionalLight
          position={[5, 10, 5]}
          color={dn.directionalColor}
          intensity={dn.directionalIntensity}
        />

        <Suspense fallback={null}>
          <Ocean />
          {topics.map((topic) => (
            <Island key={topic.id} topic={topic} onSelect={handleSelect} />
          ))}
          <Clouds />
          <ContactShadows
            position={[0, -0.4, 0]}
            opacity={0.4}
            scale={40}
            blur={2}
            far={4}
            resolution={64}
            color="#000033"
            frames={1}
          />
        </Suspense>

        <OrbitControls
          enableRotate={true}
          enablePan={true}
          enableZoom={true}
          minDistance={5}
          maxDistance={45}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
      </Canvas>
    </div>
  );
}
