"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VISEMES } from "wawa-lipsync";
import { getLipsyncManager } from "@/lib/lipsync";
import { getCurrentAudio } from "@/lib/speech";
import { connectAudioToLipsync } from "@/lib/lipsync";

const MODEL_PATH = "/models/professor-globe.glb";
const ANIM_PATH = "/models/animations.glb";

interface AvatarModelProps {
  speaking?: boolean;
  emotion?: string;
}

export function AvatarModel({ speaking = false, emotion = "idle" }: AvatarModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const { animations } = useGLTF(ANIM_PATH);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const [blink, setBlink] = useState(false);

  // Play idle animation
  useEffect(() => {
    const idleAnim = animations.find((a) => a.name === "Idle");
    const animName = idleAnim ? "Idle" : animations[0]?.name;
    if (animName && actions[animName]) {
      actions[animName]?.reset().fadeIn(0.5).play();
      return () => { actions[animName]?.fadeOut(0.5); };
    }
  }, [actions, animations]);

  // Eye blink
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const nextBlink = () => {
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 180);
        nextBlink();
      }, 1500 + Math.random() * 4000);
    };
    nextBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Morph target helper
  const lerpMorphTarget = (target: string, value: number, speed = 0.1) => {
    scene.traverse((child) => {
      if (
        (child as THREE.SkinnedMesh).isSkinnedMesh &&
        (child as THREE.SkinnedMesh).morphTargetDictionary &&
        (child as THREE.SkinnedMesh).morphTargetInfluences
      ) {
        const mesh = child as THREE.SkinnedMesh;
        const index = mesh.morphTargetDictionary![target];
        if (index === undefined || !mesh.morphTargetInfluences) return;
        mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[index],
          value,
          speed
        );
      }
    });
  };

  // Main animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Eye blink
    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);

    // Subtle eye movement
    const eyeX = Math.sin(t * 0.7) * 0.08;
    const eyeY = Math.sin(t * 0.5 + 1) * 0.05;
    lerpMorphTarget("eyeLookOutLeft", Math.max(0, eyeX), 0.1);
    lerpMorphTarget("eyeLookInLeft", Math.max(0, -eyeX), 0.1);
    lerpMorphTarget("eyeLookOutRight", Math.max(0, -eyeX), 0.1);
    lerpMorphTarget("eyeLookInRight", Math.max(0, eyeX), 0.1);
    lerpMorphTarget("eyeLookUpLeft", Math.max(0, eyeY), 0.1);
    lerpMorphTarget("eyeLookUpRight", Math.max(0, eyeY), 0.1);
    lerpMorphTarget("eyeLookDownLeft", Math.max(0, -eyeY), 0.1);
    lerpMorphTarget("eyeLookDownRight", Math.max(0, -eyeY), 0.1);

    // Emotion expressions
    const smileValue = emotion === "happy" ? 0.7 : 0;
    const surpriseValue = emotion === "surprised" ? 0.6 : 0;
    lerpMorphTarget("mouthSmile", smileValue, 0.1);
    lerpMorphTarget("mouthSmileLeft", smileValue, 0.1);
    lerpMorphTarget("mouthSmileRight", smileValue, 0.1);
    lerpMorphTarget("browInnerUp", surpriseValue, 0.1);
    lerpMorphTarget("eyeWideLeft", surpriseValue * 0.5, 0.1);
    lerpMorphTarget("eyeWideRight", surpriseValue * 0.5, 0.1);

    // Lip sync
    if (speaking) {
      const audio = getCurrentAudio();
      if (audio) {
        connectAudioToLipsync(audio);
      }

      const mgr = getLipsyncManager();
      mgr.processAudio();
      const viseme = mgr.viseme;

      const visemeValues = Object.values(VISEMES) as string[];
      visemeValues.forEach((v) => {
        lerpMorphTarget(v, v === viseme ? 1 : 0, v === viseme ? 0.3 : 0.2);
      });
    } else {
      const visemeValues = Object.values(VISEMES) as string[];
      visemeValues.forEach((v) => {
        lerpMorphTarget(v, 0, 0.15);
      });
    }
  });

  return (
    <group ref={group} position={[0, -1, 0]} scale={0.85}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
useGLTF.preload(ANIM_PATH);
