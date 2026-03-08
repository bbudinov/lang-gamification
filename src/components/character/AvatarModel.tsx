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

  // Cache bone references
  const bonesRef = useRef<{
    rightArm?: THREE.Bone;
    rightForeArm?: THREE.Bone;
    leftArm?: THREE.Bone;
    leftForeArm?: THREE.Bone;
    head?: THREE.Bone;
  }>({});

  // Find bones once on mount
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        if (bone.name === "RightArm") bonesRef.current.rightArm = bone;
        if (bone.name === "RightForeArm") bonesRef.current.rightForeArm = bone;
        if (bone.name === "LeftArm") bonesRef.current.leftArm = bone;
        if (bone.name === "LeftForeArm") bonesRef.current.leftForeArm = bone;
        if (bone.name === "Head") bonesRef.current.head = bone;
      }
    });
  }, [scene]);

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

    // Emotion expressions
    const smileValue = emotion === "happy" ? 0.7 : 0;
    const surpriseValue = emotion === "surprised" ? 0.6 : 0;
    lerpMorphTarget("mouthSmile", smileValue, 0.1);
    lerpMorphTarget("mouthSmileLeft", smileValue, 0.1);
    lerpMorphTarget("mouthSmileRight", smileValue, 0.1);
    lerpMorphTarget("browInnerUp", surpriseValue, 0.1);
    lerpMorphTarget("eyeWideLeft", surpriseValue * 0.5, 0.1);
    lerpMorphTarget("eyeWideRight", surpriseValue * 0.5, 0.1);

    // Speaking gesture — subtle arm/hand movement
    const bones = bonesRef.current;
    if (speaking && bones.rightArm) {
      // Right arm gestures while talking
      const gesture = Math.sin(t * 2.5) * 0.15;
      const gesture2 = Math.sin(t * 1.8 + 1) * 0.1;
      bones.rightArm.rotation.x = THREE.MathUtils.lerp(bones.rightArm.rotation.x, -0.4 + gesture, 0.05);
      bones.rightArm.rotation.z = THREE.MathUtils.lerp(bones.rightArm.rotation.z, -0.3 + gesture2, 0.05);
      if (bones.rightForeArm) {
        bones.rightForeArm.rotation.x = THREE.MathUtils.lerp(bones.rightForeArm.rotation.x, -0.5 + gesture * 0.5, 0.05);
      }
      // Left arm — smaller complementary movement
      if (bones.leftArm) {
        bones.leftArm.rotation.x = THREE.MathUtils.lerp(bones.leftArm.rotation.x, -0.2 + gesture2 * 0.5, 0.05);
      }
    } else if (bones.rightArm) {
      // Return to rest pose smoothly
      bones.rightArm.rotation.x = THREE.MathUtils.lerp(bones.rightArm.rotation.x, 0, 0.03);
      bones.rightArm.rotation.z = THREE.MathUtils.lerp(bones.rightArm.rotation.z, 0, 0.03);
      if (bones.rightForeArm) {
        bones.rightForeArm.rotation.x = THREE.MathUtils.lerp(bones.rightForeArm.rotation.x, 0, 0.03);
      }
      if (bones.leftArm) {
        bones.leftArm.rotation.x = THREE.MathUtils.lerp(bones.leftArm.rotation.x, 0, 0.03);
      }
    }

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
