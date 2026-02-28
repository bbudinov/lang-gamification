"use client";

import { Suspense, useState, useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
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
      return {
        ambientColor: "#fff5e6",
        ambientIntensity: 0.5,
        directionalColor: "#ffb347",
        directionalIntensity: 0.7,
        fogColor: "#1a1a3e",
        bgColor: "#1a1a3e",
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        ambientColor: "#ffffff",
        ambientIntensity: 0.7,
        directionalColor: "#fff9c4",
        directionalIntensity: 0.9,
        fogColor: "#0d1b3e",
        bgColor: "#0d1b3e",
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        ambientColor: "#ffccbc",
        ambientIntensity: 0.45,
        directionalColor: "#ff7043",
        directionalIntensity: 0.6,
        fogColor: "#1a0e2e",
        bgColor: "#1a0e2e",
      };
    } else {
      return {
        ambientColor: "#b3d4fc",
        ambientIntensity: 0.5,
        directionalColor: "#8baae0",
        directionalIntensity: 0.6,
        fogColor: "#0a1628",
        bgColor: "#0a1628",
      };
    }
  }, []);
}

// Camera animator — only lerps when a target island is selected
function CameraAnimator({
  targetPos,
}: {
  targetPos: [number, number, number] | null;
}) {
  const controlsRef = useRef<any>(null);
  const prevTarget = useRef<[number, number, number] | null>(null);
  const returningRef = useRef(false);
  const returnedRef = useRef(false);
  const savedCamPos = useRef<THREE.Vector3 | null>(null);
  const savedTarget = useRef<THREE.Vector3 | null>(null);

  useFrame(({ camera }) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (targetPos) {
      // Save user's camera position when first focusing
      if (!prevTarget.current) {
        savedCamPos.current = camera.position.clone();
        savedTarget.current = controls.target.clone();
      }
      prevTarget.current = targetPos;
      returnedRef.current = false;

      // Zoom toward island
      const islandVec = new THREE.Vector3(targetPos[0], targetPos[1] + 1, targetPos[2]);
      const camTarget = new THREE.Vector3(
        targetPos[0] * 0.3,
        8,
        targetPos[2] + 8
      );
      controls.target.lerp(islandVec, 0.04);
      camera.position.lerp(camTarget, 0.04);
      controls.update();
    } else if (prevTarget.current && !returnedRef.current) {
      // Just deselected — smoothly return to saved position
      returningRef.current = true;
      prevTarget.current = null;

      const restoreCam = savedCamPos.current ?? new THREE.Vector3(0, 12, 12);
      const restoreTarget = savedTarget.current ?? new THREE.Vector3(0, 0, 2);

      controls.target.lerp(restoreTarget, 0.06);
      camera.position.lerp(restoreCam, 0.06);
      controls.update();

      // Check if close enough to stop
      if (camera.position.distanceTo(restoreCam) < 0.3) {
        returnedRef.current = true;
        returningRef.current = false;
        savedCamPos.current = null;
        savedTarget.current = null;
      }
    } else if (returningRef.current) {
      // Still returning to saved position
      const restoreCam = savedCamPos.current ?? new THREE.Vector3(0, 12, 12);
      const restoreTarget = savedTarget.current ?? new THREE.Vector3(0, 0, 2);

      controls.target.lerp(restoreTarget, 0.06);
      camera.position.lerp(restoreCam, 0.06);
      controls.update();

      if (camera.position.distanceTo(restoreCam) < 0.3) {
        returnedRef.current = true;
        returningRef.current = false;
        savedCamPos.current = null;
        savedTarget.current = null;
      }
    }
    // When no target and not returning — do nothing, let user freely control camera
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enablePan={true}
      enableZoom={true}
      minDistance={5}
      maxDistance={45}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
    />
  );
}

interface IslandMapProps {
  onSelectTopic: (topic: Topic) => void;
  focusPosition?: [number, number, number] | null;
}

export function IslandMap({ onSelectTopic, focusPosition = null }: IslandMapProps) {
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

        <CameraAnimator targetPos={focusPosition} />
      </Canvas>
    </div>
  );
}
