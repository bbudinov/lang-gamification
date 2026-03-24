"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { TalkingAvatar } from "./TalkingAvatar";

interface AvatarCanvasProps {
  isSpeaking?: boolean;
}

export default function AvatarCanvas({ isSpeaking = false }: AvatarCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, -0.4, 3.8], fov: 30 }}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.7} color="#e8e0d8" />
      <directionalLight position={[2, 3, 2]} intensity={1.2} color="#fff0e0" />
      <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#6090c0" />

      <Suspense fallback={null}>
        <TalkingAvatar
          isSpeaking={isSpeaking}
          smoothing={0.5}
          headFollow={true}
          scale={1}
          position={[0, -1.65, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
