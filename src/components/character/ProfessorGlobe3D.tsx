"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

const MODEL_PATH = "/models/professor-new.glb";

interface Props {
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
}

// Simple avatar — no skeleton, no morph targets, just transforms
function SimpleAvatar({ speaking = false, emotion = "idle" }: Props) {
  const { scene } = useGLTF(MODEL_PATH);
  // Clone so multiple instances don't fight over the same Three.js object
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();

    // Base breathing
    const breathe = 1 + Math.sin(t * 1.5) * 0.004;
    group.current.scale.set(1.0, 1.0 * breathe, 1.0);

    // Idle sway
    group.current.rotation.y = Math.sin(t * 0.5) * 0.03;
    group.current.rotation.z = Math.sin(t * 0.7) * 0.008;

    if (speaking) {
      // Nod + lean when speaking
      group.current.rotation.x = Math.sin(t * 2.5) * 0.015;
      group.current.position.z = Math.sin(t * 3) * 0.01;
      // Subtle emphasis pulse
      const pulse = 1.0 * (1 + Math.sin(t * 4) * 0.003);
      group.current.scale.y = pulse * breathe;
    } else {
      group.current.rotation.x = 0;
      group.current.position.z = 0;
    }

    // Emotions
    if (emotion === "happy") {
      group.current.rotation.x = -0.02;
    } else if (emotion === "surprised") {
      group.current.scale.setScalar(1.0 + Math.sin(t * 6) * 0.003);
    } else if (emotion === "thinking") {
      group.current.rotation.z = 0.04 + Math.sin(t * 0.8) * 0.015;
    }
  });

  return (
    <group ref={group} position={[0, -0.9, 0]} scale={1.0}>
      <primitive object={cloned} />
    </group>
  );
}

export function ProfessorGlobeHeadshot({ size = 80 }: { size?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 1.2], fov: 22 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ width: size, height: size, background: "transparent", borderRadius: "50%", pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[0, 0, 3]} intensity={1.5} />
        <directionalLight position={[1, 1, 2]} intensity={1.0} color="#38bdf8" />
        <Environment preset="studio" />
        <SimpleAvatar speaking={false} emotion="idle" />
      </Suspense>
    </Canvas>
  );
}

export function ProfessorGlobe3D({ speaking = false, emotion = "idle" }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 2.5], fov: 35 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.0} />
        <directionalLight position={[0, 0, 3]} intensity={1.2} />
        <directionalLight position={[1, 2, 2]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[-1, 1, -1]} intensity={0.8} color="#7dd3fc" />
        <directionalLight position={[0, -1, 2]} intensity={0.3} />
        <Environment preset="studio" />
        <SimpleAvatar speaking={speaking} emotion={emotion} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_PATH);
