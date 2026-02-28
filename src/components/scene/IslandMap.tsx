"use client";

import { Suspense, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Island } from "./Island";
import { Ocean } from "./Ocean";
import { topics } from "@/data/words";
import { TOUCH } from "three";
import type { Topic } from "@/types";

interface IslandMapProps {
  onSelectTopic: (topic: Topic) => void;
}

export function IslandMap({ onSelectTopic }: IslandMapProps) {
  const [dpr, setDpr] = useState(1.5);

  const handleSelect = useCallback(
    (topic: Topic) => {
      onSelectTopic(topic);
    },
    [onSelectTopic]
  );

  return (
    <div className="w-full h-full" style={{ touchAction: "none" }}>
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 8, 8], fov: 50 }}
        style={{ touchAction: "none" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
        />
        <color attach="background" args={["#0a1628"]} />
        <fog attach="fog" args={["#0a1628", 15, 30]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <Suspense fallback={null}>
          <Ocean />
          {topics.map((topic) => (
            <Island key={topic.id} topic={topic} onSelect={handleSelect} />
          ))}
        </Suspense>

        <OrbitControls
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minDistance={4}
          maxDistance={15}
          maxPolarAngle={Math.PI / 3}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        />
      </Canvas>
    </div>
  );
}
