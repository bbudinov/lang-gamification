"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { AvatarModel } from "./AvatarModel";

interface ProfessorGlobe3DProps {
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
}

// Small headshot version for circle avatar
export function ProfessorGlobeHeadshot({ size = 80 }: { size?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.77, 0.3], fov: 22 }}
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
        <ambientLight intensity={1.2} />
        <directionalLight position={[0, 0, 3]} intensity={1.5} />
        <directionalLight position={[1, 1, 2]} intensity={1.0} color="#38bdf8" />
        <Environment preset="studio" />
        <AvatarModel speaking={false} emotion="idle" />
      </Suspense>
    </Canvas>
  );
}

export function ProfessorGlobe3D({
  speaking = false,
  emotion = "idle",
}: ProfessorGlobe3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 2.8], fov: 35 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
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
        <ambientLight intensity={1.0} />
        <directionalLight position={[0, 0, 3]} intensity={1.2} />
        <directionalLight position={[1, 2, 2]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[-1, 1, -1]} intensity={0.8} color="#7dd3fc" />
        <directionalLight position={[0, -1, 2]} intensity={0.3} />
        <Environment preset="studio" />
        <AvatarModel speaking={speaking} emotion={emotion} />
      </Suspense>
    </Canvas>
  );
}
