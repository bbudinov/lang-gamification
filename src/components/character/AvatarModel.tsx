"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
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

// Create 3D eye with iris + pupil
function createEye() {
  const eyeGroup = new THREE.Group();

  // White eyeball
  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.0 })
  );
  eyeGroup.add(sclera);

  // Iris (brown/hazel)
  const iris = new THREE.Mesh(
    new THREE.CircleGeometry(0.008, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.5, metalness: 0.0 })
  );
  iris.position.z = 0.013;
  eyeGroup.add(iris);

  // Pupil (black)
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.004, 16),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.0 })
  );
  pupil.position.z = 0.0135;
  eyeGroup.add(pupil);

  // Specular highlight (small white dot)
  const highlight = new THREE.Mesh(
    new THREE.CircleGeometry(0.002, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  highlight.position.set(0.002, 0.003, 0.014);
  eyeGroup.add(highlight);

  return eyeGroup;
}

export function AvatarModel({ speaking = false, emotion = "idle" }: AvatarModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const { animations } = useGLTF(ANIM_PATH);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const [blink, setBlink] = useState(false);
  const eyesRef = useRef<{ left: THREE.Group; right: THREE.Group } | null>(null);

  // Create and attach 3D eyes to eye bones
  const eyes = useMemo(() => ({ left: createEye(), right: createEye() }), []);

  useEffect(() => {
    let leftBone: THREE.Bone | null = null;
    let rightBone: THREE.Bone | null = null;

    scene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        if (child.name === "LeftEye") leftBone = child as THREE.Bone;
        if (child.name === "RightEye") rightBone = child as THREE.Bone;
      }
    });

    if (leftBone && rightBone) {
      console.log("[Avatar] Found eye bones, attaching 3D eyes");
      (leftBone as THREE.Bone).add(eyes.left);
      (rightBone as THREE.Bone).add(eyes.right);
      // Position slightly forward from bone center
      eyes.left.position.set(0, 0, 0.02);
      eyes.right.position.set(0, 0, 0.02);
      eyesRef.current = eyes;
    } else {
      console.warn("[Avatar] Eye bones not found! Available bones:");
      scene.traverse((child) => {
        if ((child as THREE.Bone).isBone) console.log("  Bone:", child.name);
      });
    }

    return () => {
      if (leftBone) (leftBone as THREE.Bone).remove(eyes.left);
      if (rightBone) (rightBone as THREE.Bone).remove(eyes.right);
    };
  }, [scene, eyes]);

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

    // 3D eye movement — rotate eye spheres for natural look
    if (eyesRef.current) {
      const eyeX = Math.sin(t * 0.7) * 0.15;
      const eyeY = Math.sin(t * 0.5 + 1) * 0.1;
      eyesRef.current.left.rotation.set(-eyeY, eyeX, 0);
      eyesRef.current.right.rotation.set(-eyeY, eyeX, 0);

      // Scale eyes to 0 when blinking
      const eyeScale = blink ? 0.01 : 1;
      eyesRef.current.left.scale.setScalar(eyeScale);
      eyesRef.current.right.scale.setScalar(eyeScale);
    }

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
    <group ref={group} position={[0, -0.88, 0]} scale={0.85}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
useGLTF.preload(ANIM_PATH);
