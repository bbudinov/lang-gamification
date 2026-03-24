"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";
import { TalkingAvatar } from "@/components/avatar/TalkingAvatar";

interface ProfessorGlobe3DProps {
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
}

// Animated camera — zooms in slightly when speaking
function AnimatedCamera({ speaking }: { speaking: boolean }) {
  const { camera } = useThree();
  const targetZ = useRef(2.8);

  useEffect(() => {
    targetZ.current = speaking ? 2.2 : 2.8;
  }, [speaking]);

  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ.current, 0.03);
  });

  return null;
}

// Small headshot version for circle avatar
export function ProfessorGlobeHeadshot({ size = 80 }: { size?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 0.5], fov: 22 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{
        width: size,
        height: size,
        background: "transparent",
        borderRadius: "50%",
        pointerEvents: "none",
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.8} color="#e8e0d8" />
        <directionalLight position={[2, 3, 2]} intensity={1.2} color="#fff0e0" />
        <TalkingAvatar
          isSpeaking={false}
          smoothing={0.5}
          headFollow={false}
          scale={1}
          position={[0, -0.15, 0]}
        />
      </Suspense>
    </Canvas>
  );
}

// Full-body overlay version — used when Professor speaks
export function ProfessorGlobe3D({
  speaking = false,
  emotion = "idle",
}: ProfessorGlobe3DProps) {
  return (
    <Canvas
      camera={{ position: [0, -0.3, 2.8], fov: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} color="#e8e0d8" />
        <directionalLight position={[2, 4, 2]} intensity={1.4} color="#fff0e0" />
        <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#6090c0" />
        <hemisphereLight intensity={0.3} color="#87ceeb" groundColor="#c0a880" />

        <AnimatedCamera speaking={speaking} />

        <TalkingAvatar
          isSpeaking={speaking}
          smoothing={0.5}
          headFollow={true}
          scale={1}
          position={[0, -1.5, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
