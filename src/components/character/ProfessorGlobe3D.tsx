"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AvatarModel } from "./AvatarModel";

interface ProfessorGlobe3DProps {
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
}

export function ProfessorGlobe3D({
  speaking = false,
  emotion = "idle",
}: ProfessorGlobe3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 2.5], fov: 30 }}
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 2]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[-1, 1, -1]} intensity={0.8} color="#7dd3fc" />
        <directionalLight position={[0, -1, 2]} intensity={0.3} />
        <AvatarModel speaking={speaking} emotion={emotion} />
      </Suspense>
    </Canvas>
  );
}
