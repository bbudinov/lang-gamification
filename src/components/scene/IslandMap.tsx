"use client";

import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Island } from "./Island";
import { Ocean } from "./Ocean";
import { Clouds } from "./Clouds";
import { Boat } from "./Boat";
import { Bridges } from "./Bridges";
import { TreasureChest } from "./TreasureChest";
import { topics } from "@/data/words";
import { useProgressStore } from "@/stores/progressStore";
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

// Home position — centered on all islands (spread layout: x:-16..15, z:-9..36)
const HOME_CAM = new THREE.Vector3(0, 28, 30);
const HOME_TARGET = new THREE.Vector3(0, 0, 13);

// Camera animator — intro zoom + island focus
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
  const introRef = useRef(true);
  const introStartTime = useRef(0);
  const userInteracted = useRef(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useFrame(({ camera, clock }) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Track intro start time
    if (introRef.current && introStartTime.current === 0) {
      introStartTime.current = clock.elapsedTime;
    }

    // Intro zoom-in on first load — cancel on user touch or after 3s
    if (introRef.current) {
      const elapsed = clock.elapsedTime - introStartTime.current;
      if (userInteracted.current || elapsed > 3) {
        introRef.current = false;
        return;
      }

      controls.target.lerp(HOME_TARGET, 0.05);
      camera.position.lerp(HOME_CAM, 0.05);
      controls.update();

      if (camera.position.distanceTo(HOME_CAM) < 0.5) {
        introRef.current = false;
      }
      return;
    }

    if (targetPos) {
      if (!prevTarget.current) {
        savedCamPos.current = camera.position.clone();
        savedTarget.current = controls.target.clone();
      }
      prevTarget.current = targetPos;
      returnedRef.current = false;

      const islandVec = new THREE.Vector3(targetPos[0], targetPos[1] + 1, targetPos[2]);
      const camTarget = new THREE.Vector3(
        targetPos[0] * 0.3,
        10,
        targetPos[2] + 10
      );
      controls.target.lerp(islandVec, 0.04);
      camera.position.lerp(camTarget, 0.04);
      controls.update();
    } else if (prevTarget.current && !returnedRef.current) {
      returningRef.current = true;
      prevTarget.current = null;
    }

    if (returningRef.current) {
      const restoreCam = savedCamPos.current ?? HOME_CAM;
      const restoreTarget = savedTarget.current ?? HOME_TARGET;

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
  });

  // Cancel intro on any user interaction
  const handleInteractionStart = useCallback(() => {
    userInteracted.current = true;
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enablePan={true}
      enableZoom={true}
      zoomToCursor={!isTouchDevice}
      screenSpacePanning={true}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={120}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 3}
      touches={isTouchDevice
        ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }
        : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
      }
      onStart={handleInteractionStart}
    />
  );
}

// Streak aura — orange glow when daily streak is active
function StreakAura() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { dailyStreak } = useProgressStore();

  useFrame(({ clock }) => {
    if (!lightRef.current || dailyStreak < 1) return;
    const t = clock.elapsedTime;
    // Gentle pulse
    lightRef.current.intensity = 0.3 + Math.sin(t * 1.5) * 0.1 + dailyStreak * 0.05;
  });

  if (dailyStreak < 1) return null;

  return (
    <pointLight
      ref={lightRef}
      position={[0, 6, 13]}
      color="#ff8c00"
      intensity={0.3}
      distance={60}
      decay={1.5}
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
        camera={{ position: [0, 38, 40], fov: 50 }}
        style={{ touchAction: "none" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
        />
        <color attach="background" args={[dn.bgColor]} />
        <fog attach="fog" args={[dn.fogColor, 40, 90]} />
        <ambientLight color={dn.ambientColor} intensity={dn.ambientIntensity} />
        <directionalLight
          position={[5, 10, 5]}
          color={dn.directionalColor}
          intensity={dn.directionalIntensity}
        />
        {/* Rim/fill light for depth — subtle blue from below-behind */}
        <directionalLight
          position={[-8, 2, -10]}
          color="#4a8bc2"
          intensity={0.15}
        />
        {/* Warm accent from opposite side */}
        <pointLight
          position={[15, 4, 20]}
          color="#ffd275"
          intensity={0.2}
          distance={40}
          decay={2}
        />

        <Suspense fallback={null}>
          <Ocean />
          <Bridges />
          <TreasureChest />
          {topics.map((topic) => (
            <Island key={topic.id} topic={topic} onSelect={handleSelect} />
          ))}
          <Boat />
          <Clouds />
          <StreakAura />
          <ContactShadows
            position={[0, -0.4, 0]}
            opacity={0.4}
            scale={70}
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
