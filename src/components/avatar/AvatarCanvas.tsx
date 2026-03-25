"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TalkingAvatar } from "./TalkingAvatar";

// Animated camera that zooms in when speaking
function AnimatedCamera({ isSpeaking }: { isSpeaking: boolean }) {
  const { camera } = useThree();
  const targetZ = useRef(3.0);

  useEffect(() => {
    targetZ.current = isSpeaking ? 2.2 : 3.0;
  }, [isSpeaking]);

  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ.current, 0.03);
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      isSpeaking ? -0.1 : -0.3,
      0.03
    );
  });

  return null;
}

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
        camera={{ position: [0, -0.3, 3.0], fov: 30 }}
        style={{ background: "transparent", pointerEvents: "none" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={() => {
          setTimeout(() => setReady(true), 800);
        }}
      >
        <ambientLight intensity={0.7} color="#e8e0d8" />
        <directionalLight position={[2, 4, 2]} intensity={1.4} color="#fff0e0" />
        <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#6090c0" />
        <hemisphereLight intensity={0.3} color="#87ceeb" groundColor="#c0a880" />

        <AnimatedCamera isSpeaking={isSpeaking} />

        <Suspense fallback={null}>
          <TalkingAvatar
            isSpeaking={isSpeaking}
            smoothing={0.5}
            headFollow={true}
            scale={1}
            position={[0, -1.5, 0]}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
