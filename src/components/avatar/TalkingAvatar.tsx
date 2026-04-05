"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/professor-new.glb";

interface TalkingAvatarProps {
  isSpeaking?: boolean;
  scale?: number;
  position?: [number, number, number];
  smoothing?: number;
  headFollow?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  lipsyncData?: unknown;
}

export function TalkingAvatar({
  isSpeaking = false,
  scale = 1,
  position = [0, -1.5, 0],
}: TalkingAvatarProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();

    const s = scale;
    const breathe = 1 + Math.sin(t * 1.5) * 0.004;
    group.current.scale.set(s, s * breathe, s);

    group.current.rotation.y = Math.sin(t * 0.4) * 0.02;
    group.current.rotation.z = Math.sin(t * 0.6) * 0.006;

    if (speakingRef.current) {
      group.current.rotation.x = Math.sin(t * 2.5) * 0.02;
      group.current.position.z = position[2] + Math.sin(t * 3) * 0.01;
      group.current.scale.y = scale * breathe * (1 + Math.sin(t * 4) * 0.003);
      group.current.rotation.y = Math.sin(t * 1.2) * 0.04;
    } else {
      group.current.rotation.x = 0;
      group.current.position.z = position[2];
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
