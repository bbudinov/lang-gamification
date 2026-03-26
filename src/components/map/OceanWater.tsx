"use client";

import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";

const OceanWaterMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorDeep: new THREE.Color("#0b4f7a"),
    uColorShallow: new THREE.Color("#3aa7d6"),
    uColorFoam: new THREE.Color("#dff6ff"),
    uWaveAmp1: 0.18,
    uWaveFreq1: 0.08,
    uWaveSpeed1: 0.6,
    uWaveAmp2: 0.08,
    uWaveFreq2: 0.22,
    uWaveSpeed2: 1.2,
    uFoamStrength: 0.12,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;

    uniform float uTime;
    uniform float uWaveAmp1;
    uniform float uWaveFreq1;
    uniform float uWaveSpeed1;
    uniform float uWaveAmp2;
    uniform float uWaveFreq2;
    uniform float uWaveSpeed2;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float wave1 = sin((pos.x * uWaveFreq1) + uTime * uWaveSpeed1) *
                    cos((pos.z * uWaveFreq1) + uTime * uWaveSpeed1) *
                    uWaveAmp1;

      float wave2 = sin((pos.x * uWaveFreq2) - uTime * uWaveSpeed2) *
                    cos((pos.z * uWaveFreq2 * 0.8) + uTime * uWaveSpeed2) *
                    uWaveAmp2;

      pos.y += wave1 + wave2;
      vElevation = pos.y;
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;

    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform vec3 uColorFoam;
    uniform float uTime;
    uniform float uFoamStrength;

    void main() {
      float heightMix = smoothstep(-0.22, 0.22, vElevation);
      vec3 waterColor = mix(uColorDeep, uColorShallow, heightMix);

      float foamNoise =
        sin(vUv.x * 40.0 + uTime * 1.8) *
        cos(vUv.y * 28.0 - uTime * 1.4) * 0.5 + 0.5;

      float foamMask = smoothstep(0.78, 1.0, foamNoise + vElevation * 2.2);
      vec3 finalColor = mix(waterColor, uColorFoam, foamMask * uFoamStrength);

      gl_FragColor = vec4(finalColor, 0.96);
    }
  `
);

extend({ OceanWaterMaterial });

// Declare for TypeScript
declare module "@react-three/fiber" {
  interface ThreeElements {
    oceanWaterMaterial: any;
  }
}

interface OceanWaterProps {
  size?: number;
  position?: [number, number, number];
  segments?: number;
}

export function OceanWater({
  size = 500,
  position = [0, -0.15, 0],
  segments = 128,
}: OceanWaterProps) {
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size, segments]);

  return (
    <mesh geometry={geometry} position={position}>
      <oceanWaterMaterial
        ref={materialRef}
        transparent
        uColorDeep={new THREE.Color("#0a4870")}
        uColorShallow={new THREE.Color("#2ea6d7")}
        uColorFoam={new THREE.Color("#e9fbff")}
        uWaveAmp1={0.22}
        uWaveFreq1={0.09}
        uWaveSpeed1={0.55}
        uWaveAmp2={0.09}
        uWaveFreq2={0.24}
        uWaveSpeed2={1.15}
        uFoamStrength={0.18}
      />
    </mesh>
  );
}

/** Foam ring around islands — shoreline effect */
export function IslandFoamRing({
  position = [0, 0.04, 0] as [number, number, number],
  radius = 4,
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current && ref.current.material instanceof THREE.MeshBasicMaterial) {
      ref.current.material.opacity = 0.22 + Math.sin(t * 2.0) * 0.04;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <ringGeometry args={[radius * 0.9, radius * 1.15, 64]} />
      <meshBasicMaterial color="#e8fbff" transparent opacity={0.24} />
    </mesh>
  );
}
