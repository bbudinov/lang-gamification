"use client";

import * as THREE from "three";
import React, { useEffect, useRef, useState, useMemo } from "react";
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

// Visemes to cycle through for realtime audio-based lip sync
const REALTIME_VISEMES = ["viseme_AA", "viseme_O", "viseme_I", "viseme_U", "viseme_FF"];

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
  /** Pre-generated lipsync JSON data (if null, uses realtime audio analysis) */
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
  const blinkingRef = useRef(false);

  // Realtime audio analysis refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Load GLB model
  const { scene } = useGLTF("/models/professor-avatar.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as any;

  // Idle animation — slowed down to reduce distracting arm gestures
  const { animations: idleAnimation } = useFBX("/animations/Idle.fbx");
  idleAnimation[0].name = "Idle";
  const { actions } = useAnimations([idleAnimation[0]], groupRef);

  useEffect(() => {
    if (actions["Idle"]) {
      const action = actions["Idle"];
      action.reset().fadeIn(0.5).play();
      action.timeScale = 0.3; // Very slow — subtle breathing, minimal arm movement
    }
    return () => { actions["Idle"]?.fadeOut(0.5); };
  }, [actions]);

  // Setup WebAudio analyser for realtime lip sync
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const setupAnalyser = () => {
      if (analyserRef.current) return; // already set up

      try {
        const ctx = audioCtxRef.current || new AudioContext();
        audioCtxRef.current = ctx;

        // Only create source once per audio element
        if (!sourceRef.current) {
          const source = ctx.createMediaElementSource(audio);
          sourceRef.current = source;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
      } catch {
        // Audio element might already be connected — ignore
      }
    };

    audio.addEventListener("play", setupAnalyser);
    return () => audio.removeEventListener("play", setupAnalyser);
  }, [audioRef]);

  // References to morph target meshes
  const headRef = useRef<THREE.SkinnedMesh | null>(null);
  const teethRef = useRef<THREE.SkinnedMesh | null>(null);
  const eyeLeftRef = useRef<THREE.SkinnedMesh | null>(null);
  const eyeRightRef = useRef<THREE.SkinnedMesh | null>(null);

  useEffect(() => {
    headRef.current = nodes.Wolf3D_Head;
    teethRef.current = nodes.Wolf3D_Teeth;
    eyeLeftRef.current = nodes.EyeLeft;
    eyeRightRef.current = nodes.EyeRight;
  }, [nodes]);

  useFrame((state, delta) => {
    const head = headRef.current;
    const teeth = teethRef.current;
    const eyeL = eyeLeftRef.current;
    const eyeR = eyeRightRef.current;

    if (!head || !teeth) return;

    // --- BLINK ---
    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      blinkingRef.current = true;
      setTimeout(() => { blinkingRef.current = false; }, 150);
      blinkTimerRef.current = 2 + Math.random() * 4;
    }

    const blinkVal = blinkingRef.current ? 1 : 0;
    if (eyeL?.morphTargetDictionary && eyeL.morphTargetInfluences) {
      const idx = eyeL.morphTargetDictionary["eyeBlinkLeft"];
      if (idx !== undefined) {
        eyeL.morphTargetInfluences[idx] = THREE.MathUtils.lerp(eyeL.morphTargetInfluences[idx], blinkVal, 0.5);
      }
    }
    if (eyeR?.morphTargetDictionary && eyeR.morphTargetInfluences) {
      const idx = eyeR.morphTargetDictionary["eyeBlinkRight"];
      if (idx !== undefined) {
        eyeR.morphTargetInfluences[idx] = THREE.MathUtils.lerp(eyeR.morphTargetInfluences[idx], blinkVal, 0.5);
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
    const hasPregenData = lipsyncData?.mouthCues && lipsyncData.mouthCues.length > 0;

    // Reset all visemes toward 0
    const allVisemes = new Set([...Object.values(VISEME_MAP), ...REALTIME_VISEMES]);
    allVisemes.forEach((visemeName) => {
      const headIdx = head.morphTargetDictionary?.[visemeName];
      const teethIdx = teeth.morphTargetDictionary?.[visemeName];
      if (headIdx !== undefined && head.morphTargetInfluences) {
        head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(head.morphTargetInfluences[headIdx], 0, smoothing);
      }
      if (teethIdx !== undefined && teeth.morphTargetInfluences) {
        teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(teeth.morphTargetInfluences[teethIdx], 0, smoothing);
      }
    });

    // MODE A: Pre-generated Rhubarb data
    if (currentTime >= 0 && hasPregenData) {
      for (const cue of lipsyncData!.mouthCues) {
        if (currentTime >= cue.start && currentTime <= cue.end) {
          const visemeName = VISEME_MAP[cue.value];
          if (!visemeName) break;
          const headIdx = head.morphTargetDictionary?.[visemeName];
          const teethIdx = teeth.morphTargetDictionary?.[visemeName];
          if (headIdx !== undefined && head.morphTargetInfluences) {
            head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(head.morphTargetInfluences[headIdx], 1, smoothing);
          }
          if (teethIdx !== undefined && teeth.morphTargetInfluences) {
            teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(teeth.morphTargetInfluences[teethIdx], 1, smoothing);
          }
          break;
        }
      }
    }
    // MODE B: Realtime audio analysis (for AI TTS responses)
    else if (currentTime >= 0 && analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const data = dataArrayRef.current;

      // Get average amplitude from lower frequencies (voice range)
      const voiceBins = data.slice(2, 20);
      const avg = voiceBins.reduce((a, b) => a + b, 0) / voiceBins.length / 255;

      if (avg > 0.05) {
        // Map amplitude to visemes — cycle through them based on time for variety
        const t = state.clock.elapsedTime;
        const visemeIdx = Math.floor(t * 8) % REALTIME_VISEMES.length;
        const visemeName = REALTIME_VISEMES[visemeIdx];
        const intensity = Math.min(1, avg * 2.5);

        const headIdx = head.morphTargetDictionary?.[visemeName];
        const teethIdx = teeth.morphTargetDictionary?.[visemeName];
        if (headIdx !== undefined && head.morphTargetInfluences) {
          head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(head.morphTargetInfluences[headIdx], intensity, smoothing);
        }
        if (teethIdx !== undefined && teeth.morphTargetInfluences) {
          teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(teeth.morphTargetInfluences[teethIdx], intensity, smoothing);
        }

        // Also add a subtle jaw open (viseme_AA) proportional to volume
        const jawIdx = head.morphTargetDictionary?.["viseme_AA"];
        if (jawIdx !== undefined && head.morphTargetInfluences) {
          head.morphTargetInfluences[jawIdx] = THREE.MathUtils.lerp(head.morphTargetInfluences[jawIdx], avg * 1.5, smoothing);
        }
      }
    }
    // MODE C: isSpeaking flag but no audio element (fallback simple animation)
    else if (isSpeaking) {
      const t = state.clock.elapsedTime;
      const visemeIdx = Math.floor(t * 6) % REALTIME_VISEMES.length;
      const visemeName = REALTIME_VISEMES[visemeIdx];
      const intensity = 0.4 + Math.sin(t * 10) * 0.3;

      const headIdx = head.morphTargetDictionary?.[visemeName];
      const teethIdx = teeth.morphTargetDictionary?.[visemeName];
      if (headIdx !== undefined && head.morphTargetInfluences) {
        head.morphTargetInfluences[headIdx] = THREE.MathUtils.lerp(head.morphTargetInfluences[headIdx], intensity, smoothing);
      }
      if (teethIdx !== undefined && teeth.morphTargetInfluences) {
        teeth.morphTargetInfluences[teethIdx] = THREE.MathUtils.lerp(teeth.morphTargetInfluences[teethIdx], intensity, smoothing);
      }
    }
  });

  return (
    <group ref={groupRef} dispose={null} scale={scale} position={position}>
      <primitive object={nodes.Hips} />
      <skinnedMesh geometry={nodes.Wolf3D_Body.geometry} material={materials.Wolf3D_Body} skeleton={nodes.Wolf3D_Body.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Bottom.geometry} material={materials.Wolf3D_Outfit_Bottom} skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Footwear.geometry} material={materials.Wolf3D_Outfit_Footwear} skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Top.geometry} material={materials.Wolf3D_Outfit_Top} skeleton={nodes.Wolf3D_Outfit_Top.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Hair.geometry} material={materials.Wolf3D_Hair} skeleton={nodes.Wolf3D_Hair.skeleton} />
      <skinnedMesh name="EyeLeft" geometry={nodes.EyeLeft.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeLeft.skeleton} morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary} morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences} />
      <skinnedMesh name="EyeRight" geometry={nodes.EyeRight.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeRight.skeleton} morphTargetDictionary={nodes.EyeRight.morphTargetDictionary} morphTargetInfluences={nodes.EyeRight.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Head" geometry={nodes.Wolf3D_Head.geometry} material={materials.Wolf3D_Skin} skeleton={nodes.Wolf3D_Head.skeleton} morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Teeth" geometry={nodes.Wolf3D_Teeth.geometry} material={materials.Wolf3D_Teeth} skeleton={nodes.Wolf3D_Teeth.skeleton} morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences} />
    </group>
  );
}

useGLTF.preload("/models/professor-avatar.glb");
