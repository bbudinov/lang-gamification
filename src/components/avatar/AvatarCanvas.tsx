"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { TalkingAvatar } from "./TalkingAvatar";

interface AvatarCanvasProps {
  isSpeaking?: boolean;
}

export default function AvatarCanvas({ isSpeaking = false }: AvatarCanvasProps) {
  const [ready, setReady] = useState(false);

  return (
    <>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a1628]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, -0.6, 4.2], fov: 30 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={() => {
          setTimeout(() => setReady(true), 800);
        }}
      >
        <ambientLight intensity={0.7} color="#e8e0d8" />
        <directionalLight position={[2, 4, 2]} intensity={1.4} color="#fff0e0" />
        <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#6090c0" />
        <hemisphereLight intensity={0.3} color="#87ceeb" groundColor="#c0a880" />

        <Suspense fallback={null}>
          <TalkingAvatar
            isSpeaking={isSpeaking}
            smoothing={0.5}
            headFollow={true}
            scale={1.1}
            position={[0, -1.65, 0]}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
