"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const MODEL_PATH = "/models/professor-new.glb";

interface AvatarModelNewProps {
  speaking?: boolean;
  emotion?: string;
}

export function AvatarModelNew({ speaking = false, emotion = "idle" }: AvatarModelNewProps) {
  let scene: THREE.Group;
  try {
    const gltf = useGLTF(MODEL_PATH);
    scene = gltf.scene;
  } catch {
    // Model still loading or failed — render nothing
    return null;
  }

  if (!scene) return null;

  return <AvatarInner scene={scene} speaking={speaking} emotion={emotion} />;
}

function AvatarInner({ scene, speaking, emotion }: { scene: THREE.Group; speaking: boolean; emotion: string }) {
  const group = useRef<THREE.Group>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();

    // Gentle idle breathing (Y scale pulse)
    const breathe = 1 + Math.sin(t * 1.5) * 0.005;
    group.current.scale.set(0.12, 0.12 * breathe, 0.12);

    // Subtle idle sway
    group.current.rotation.y = Math.sin(t * 0.5) * 0.03;
    group.current.rotation.z = Math.sin(t * 0.7) * 0.01;

    // Speaking animation
    if (speakingRef.current) {
      group.current.rotation.x = Math.sin(t * 2.5) * 0.02;
      group.current.position.z = 0.02 + Math.sin(t * 3) * 0.005;
      const emphasis = 1 + Math.sin(t * 4) * 0.003;
      group.current.scale.y = 0.12 * breathe * emphasis;
    } else {
      group.current.rotation.x = 0;
      group.current.position.z = 0;
    }

    // Emotion reactions
    if (emotion === "happy") {
      group.current.rotation.x = -0.03;
      group.current.scale.setScalar(0.122);
    } else if (emotion === "surprised") {
      const pop = 0.12 + Math.sin(t * 6) * 0.004;
      group.current.scale.setScalar(pop);
    } else if (emotion === "thinking") {
      group.current.rotation.z = 0.05 + Math.sin(t * 0.8) * 0.02;
    }
  });

  return (
    <group ref={group} position={[0, -1.0, 0]} scale={0.12}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
