"use client";

import * as THREE from "three";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFrame, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations, useFBX } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

// Rhubarb phoneme → Oculus viseme mapping
const VISEME_MAP: Record<string, string> = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

interface MouthCue {
  start: number;
  end: number;
  value: string;
}

interface LipsyncData {
  metadata: { soundFile: string; duration: number };
  mouthCues: MouthCue[];
}

interface TalkingAvatarProps {
  /** Audio element to sync lips with */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  /** Pre-generated lipsync JSON data */
  lipsyncData?: LipsyncData | null;
  /** Whether the avatar is currently speaking */
  isSpeaking?: boolean;
  /** Smoothing factor for morph targets (0-1, higher = smoother) */
  smoothing?: number;
  /** Whether head follows camera */
  headFollow?: boolean;
  /** Scale */
  scale?: number;
  /** Position */
  position?: [number, number, number];
}

export function TalkingAvatar({
  audioRef,
  lipsyncData,
  isSpeaking = false,
  smoothing = 0.5,
  headFollow = true,
  scale = 1,
  position = [0, -1.65, 0],
}: TalkingAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const blinkTimerRef = useRef(0);
  const [blinking, setBlinking] = useState(false);

  // Load GLB model
  const { scene } = useGLTF("/models/professor-avatar.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as any;

  // References to morph target meshes
  const headRef = useRef<THREE.SkinnedMesh | null>(null);
  const teethRef = useRef<THREE.SkinnedMesh | null>(null);
  const eyeLeftRef = useRef<THREE.SkinnedMesh | null>(null);
  const eyeRightRef = useRef<THREE.SkinnedMesh | null>(null);

  // Set refs after mount
  useEffect(() => {
    headRef.current = nodes.Wolf3D_Head;
    teethRef.current = nodes.Wolf3D_Teeth;
    eyeLeftRef.current = nodes.EyeLeft;
    eyeRightRef.current = nodes.EyeRight;
  }, [nodes]);

  // Lip sync + blink + head follow in useFrame
  useFrame((state, delta) => {
    const head = headRef.current;
    const teeth = teethRef.current;
    const eyeL = eyeLeftRef.current;
    const eyeR = eyeRightRef.current;

    if (!head || !teeth) return;

    // --- BLINK ---
    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
      blinkTimerRef.current = 2 + Math.random() * 4; // blink every 2-6 seconds
    }

    if (eyeL && eyeL.morphTargetDictionary && eyeL.morphTargetInfluences) {
      const blinkIdx = eyeL.morphTargetDictionary["eyeBlinkLeft"];
      if (blinkIdx !== undefined) {
        eyeL.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(
          eyeL.morphTargetInfluences[blinkIdx],
          blinking ? 1 : 0,
          0.5
        );
      }
    }
    if (eyeR && eyeR.morphTargetDictionary && eyeR.morphTargetInfluences) {
      const blinkIdx = eyeR.morphTargetDictionary["eyeBlinkRight"];
      if (blinkIdx !== undefined) {
        eyeR.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(
          eyeR.morphTargetInfluences[blinkIdx],
          blinking ? 1 : 0,
          0.5
        );
      }
    }

    // --- HEAD FOLLOW (subtle) ---
    if (headFollow && groupRef.current) {
      const headBone = groupRef.current.getObjectByName("Head");
      if (headBone) {
        headBone.lookAt(state.camera.position);
      }
    }

    // --- LIP SYNC ---
    const audio = audioRef?.current;
    const currentTime = audio && !audio.paused ? audio.currentTime : -1;

    // Reset all visemes toward 0
    Object.values(VISEME_MAP).forEach((visemeName) => {
      const headIdx = head.morphTargetDictionary?.[visemeName];
      const teethIdx = teeth.morphTargetDictionary?.[visemeName];

      if (headIdx !== undefined && head.morphTargetInfluences) {
        head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(
          head.morphTargetInfluences[headIdx],
          0,
          smoothing
        );
      }
      if (teethIdx !== undefined && teeth.morphTargetInfluences) {
        teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(
          teeth.morphTargetInfluences[teethIdx],
          0,
          smoothing
        );
      }
    });

    // Apply active viseme from lipsync data
    if (currentTime >= 0 && lipsyncData?.mouthCues) {
      for (const cue of lipsyncData.mouthCues) {
        if (currentTime >= cue.start && currentTime <= cue.end) {
          const visemeName = VISEME_MAP[cue.value];
          if (!visemeName) break;

          const headIdx = head.morphTargetDictionary?.[visemeName];
          const teethIdx = teeth.morphTargetDictionary?.[visemeName];

          if (headIdx !== undefined && head.morphTargetInfluences) {
            head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(
              head.morphTargetInfluences[headIdx],
              1,
              smoothing
            );
          }
          if (teethIdx !== undefined && teeth.morphTargetInfluences) {
            teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(
              teeth.morphTargetInfluences[teethIdx],
              1,
              smoothing
            );
          }
          break;
        }
      }
    }

    // --- IDLE BREATHING (subtle body movement) ---
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.005;
    }
  });

  return (
    <group ref={groupRef} dispose={null} scale={scale} position={position}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/professor-avatar.glb");
