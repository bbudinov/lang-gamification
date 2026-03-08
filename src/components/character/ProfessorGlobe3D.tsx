"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AvatarModel } from "./AvatarModel";

interface ProfessorGlobe3DProps {
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
  className?: string;
  style?: React.CSSProperties;
}

export function ProfessorGlobe3D({
  speaking = false,
  emotion = "idle",
  className,
  style,
}: ProfessorGlobe3DProps) {
  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [0, 1.65, 0.8], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 2, 2]} intensity={1.5} color="#38bdf8" />
          <directionalLight position={[-1, 1, -1]} intensity={0.8} color="#7dd3fc" />
          <directionalLight position={[0, -1, 2]} intensity={0.3} />
          <AvatarModel speaking={speaking} emotion={emotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
