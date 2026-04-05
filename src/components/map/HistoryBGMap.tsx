"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

const IS_MOBILE = typeof window !== "undefined" && (window.innerWidth < 800 || "ontouchstart" in window);
const WORLD_ID = "history-bg";
const historyWorld = WORLDS.find((w) => w.id === WORLD_ID)!;
const HISTORY_CITIES = CITIES.filter((c) => historyWorld.topicIds.includes(c.topicId));

// ─── TERRAIN HEIGHT FUNCTION (shared) ────────────────────────────
// Simple layered noise without external deps
function terrainHeight(x: number, z: number): number {
  let h = 0.5;
  // Base rolling
  h += Math.sin(x * 0.12) * 0.4 + Math.cos(z * 0.14) * 0.3 + Math.sin((x + z) * 0.08) * 0.25;

  // Stara Planina ridge — long, north, spread out
  h += Math.exp(-((x + 2) ** 2 / 80 + (z + 4) ** 2 / 4)) * 2.2;
  h += Math.exp(-((x - 5) ** 2 / 50 + (z + 3.5) ** 2 / 4)) * 2.0;
  h += Math.exp(-((x - 10) ** 2 / 30 + (z + 2.5) ** 2 / 4)) * 1.8;

  // Rila — south, isolated
  h += Math.exp(-((x - 3) ** 2 / 5 + (z - 5) ** 2 / 4)) * 3.2;

  // Pirin
  h += Math.exp(-((x - 6) ** 2 / 4 + (z - 6.5) ** 2 / 3)) * 2.6;

  // Rhodope — broad soft
  h += Math.exp(-((x - 9) ** 2 / 20 + (z - 5) ** 2 / 12)) * 1.6;

  // Shipka peak
  h += Math.exp(-((x - 11) ** 2 / 3 + (z + 1) ** 2 / 3)) * 2.4;

  // Eastern gentle hills
  h += Math.exp(-((x - 15) ** 2 / 10 + (z - 1) ** 2 / 6)) * 0.8;

  // River cuts
  h -= Math.exp(-((z + 10) ** 2 / 2)) * 0.4; // Danube depression
  h -= Math.exp(-((x - 6) ** 2 / 15 + (z - 4) ** 2 / 2)) * 0.3; // Maritsa

  // Edge falloff (bigger terrain: 56x34)
  const ex = Math.abs(x) / 28, ez = Math.abs(z) / 17;
  const edge = Math.max(ex, ez);
  if (edge > 0.82) {
    const f = (edge - 0.82) / 0.18;
    h = THREE.MathUtils.lerp(h, -0.6, Math.min(f * f, 1));
  }

  return h;
}

// ─── CITY POSITIONS (spread around, some on back side) ───────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "ancient-capital": [-16, 0, 2],
  "medieval-fortress": [-3, 0, -3],
  "rila-monastery": [4, 0, 7],
  "revival-town": [12, 0, 5],
  "modern-sofia": [20, 0, 2],
};
// Set Y from terrain
Object.entries(CITY_POSITIONS).forEach(([, pos]) => { pos[1] = terrainHeight(pos[0], pos[2]) + 0.1; });

const CITY_YEARS: Record<string, string> = {
  "ancient-capital": "681", "medieval-fortress": "1185", "rila-monastery": "10th c.",
  "revival-town": "1800s", "modern-sofia": "Today",
};
const TIMELINE_ORDER = ["ancient-capital", "medieval-fortress", "rila-monastery", "revival-town", "modern-sofia"];

// ─── ALL POIs — spread around terrain, FRONT and BACK ────────────
const ALL_POIS: { pos: [number, number, number]; label: string; type: string; major?: boolean }[] = [
  // FRONT side — spread wide
  { pos: [-22, 0, 4], label: "681 Аспарух", type: "camp", major: true },
  { pos: [-19, 0, 3], label: "705 Тервел", type: "rider" },
  { pos: [-16, 0, 2], label: "Pliska", type: "fortress", major: true },
  { pos: [-13, 0, 5], label: "864", type: "faith" },
  // BACK side dates
  { pos: [-11, 0, -5], label: "Preslav", type: "culture", major: true },
  { pos: [-8, 0, -7], label: "917 Ахелой", type: "battle" },
  { pos: [-5, 0, 4], label: "1018", type: "fall" },
  // Center
  { pos: [-3, 0, -3], label: "Tarnovo", type: "castle", major: true },
  { pos: [0, 0, -8], label: "1205 Одрин", type: "battle" },
  { pos: [4, 0, 7], label: "Rila", type: "monastery", major: true },
  { pos: [7, 0, -5], label: "1396", type: "fall" },
  // Right side — spread wide
  { pos: [10, 0, 5], label: "1762 Паисий", type: "book" },
  { pos: [12, 0, 5], label: "Възраждане", type: "revival", major: true },
  { pos: [12, 0, -6], label: "1876", type: "uprising" },
  { pos: [15, 0, -3], label: "Shipka 1877", type: "monument", major: true },
  { pos: [16, 0, 5], label: "1878", type: "freedom" },
  { pos: [18, 0, -5], label: "1885", type: "union" },
  { pos: [20, 0, 2], label: "София", type: "modern", major: true },
  { pos: [22, 0, -3], label: "1908", type: "state" },
  { pos: [23, 0, 3], label: "1989", type: "modern" },
  // Back-side dates
  { pos: [-20, 0, -5], label: "Мадара", type: "rider" },
  { pos: [-9, 0, 6], label: "893 Симеон", type: "culture" },
  { pos: [3, 0, -9], label: "1230 Иван Асен II", type: "battle" },
  { pos: [8, 0, -9], label: "1444 Варна", type: "battle" },
  { pos: [19, 0, -8], label: "1912", type: "battle" },
];
// Set Y from terrain height
ALL_POIS.forEach((p) => { p.pos[1] = terrainHeight(p.pos[0], p.pos[2]) + 0.1; });

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [0, 0, 0];
}

// ═══════════════════════════════════════════════════════════════════
// SKY + OCEAN
// ═══════════════════════════════════════════════════════════════════

function SkyGradient() {
  return (
    <mesh position={[0, 0, -120]} renderOrder={-1}>
      <planeGeometry args={[400, 250]} />
      <shaderMaterial depthWrite={false}
        uniforms={{ cT: { value: new THREE.Color("#0f2040") }, cB: { value: new THREE.Color("#7aafd0") } }}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`uniform vec3 cT,cB;varying vec2 vUv;void main(){gl_FragColor=vec4(mix(cB,cT,smoothstep(0.0,1.0,vUv.y)),1.0);}`}
      />
    </mesh>
  );
}

function OceanSurface() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.uniforms.time.value = clock.getElapsedTime(); });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
        <planeGeometry args={[400, 400]} /><meshStandardMaterial color="#030f1a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[400, 400, 50, 50]} />
        <shaderMaterial ref={ref} transparent
          uniforms={{ time: { value: 0 }, dc: { value: new THREE.Color("#0a2a48") }, sc: { value: new THREE.Color("#1a5a80") } }}
          vertexShader={`uniform float time;varying vec2 vUv;varying float vW;void main(){vUv=uv;vec3 p=position;float w=sin(p.x*0.04+time*0.5)*0.3+sin(p.y*0.05+time*0.35)*0.25+sin((p.x+p.y)*0.025+time*0.25)*0.35;p.z+=w;vW=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`}
          fragmentShader={`uniform vec3 dc,sc;uniform float time;varying vec2 vUv;varying float vW;void main(){vec3 c=mix(dc,sc,vW+0.5);float sp=pow(max(sin(vUv.x*60.0+time)*sin(vUv.y*50.0+time*0.6),0.0),6.0)*0.06;c+=vec3(sp);gl_FragColor=vec4(c,0.95);}`}
        />
      </mesh>
    </group>
  );
}

function SeaLabels() {
  return (
    <group>
      {[
        { p: [35, -0.2, -2] as [number, number, number], t: "Black Sea" },
        { p: [3, -0.2, 22] as [number, number, number], t: "Aegean Sea" },
        { p: [-35, -0.2, 5] as [number, number, number], t: "Adriatic Sea" },
      ].map((l, i) => (
        <Html key={i} position={l.p} center distanceFactor={65} style={{ pointerEvents: "none" }}>
          <span style={{ color: "#6aaddb", fontSize: "14px", fontWeight: 300, fontStyle: "italic", textShadow: "0 0 12px rgba(10,40,80,0.9)", whiteSpace: "nowrap", letterSpacing: "3px", opacity: 0.6 }}>{l.t}</span>
        </Html>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TERRAIN (42x26, noise-based)
// ═══════════════════════════════════════════════════════════════════

function ReliefTerrain() {
  const { topGeo, topMat, cliffGeo } = useMemo(() => {
    const W = 56, D = 34, segX = IS_MOBILE ? 80 : 140, segZ = IS_MOBILE ? 50 : 90;
    const geo = new THREE.PlaneGeometry(W, D, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vWP;varying vec3 vN;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader: `
        varying vec3 vWP;varying vec3 vN;
        void main(){
          float h=vWP.y;float sl=1.0-abs(vN.y);
          vec3 low=vec3(0.40,0.54,0.28);vec3 mid=vec3(0.35,0.48,0.26);
          vec3 hi=vec3(0.50,0.44,0.34);vec3 pk=vec3(0.75,0.72,0.65);vec3 sn=vec3(0.90,0.88,0.84);
          vec3 c;
          if(h<0.8)c=low;else if(h<1.5)c=mix(low,mid,(h-0.8)/0.7);
          else if(h<2.5)c=mix(mid,hi,(h-1.5));else if(h<3.5)c=mix(hi,pk,(h-2.5));
          else c=mix(pk,sn,clamp((h-3.5)/1.5,0.0,1.0));
          if(sl>0.35){vec3 rock=vec3(0.46,0.43,0.38);c=mix(c,rock,smoothstep(0.35,0.65,sl));}
          if(h<0.1){vec3 sand=vec3(0.70,0.63,0.46);c=mix(c,sand,smoothstep(0.1,-0.2,h));}
          float t=clamp((vWP.x+21.0)/42.0,0.0,1.0);
          vec3 fw=vec3(0.95,0.93,0.88);vec3 fg=vec3(0.22,0.52,0.22);vec3 fr=vec3(0.55,0.18,0.15);
          vec3 fc=t<0.5?mix(fw,fg,t*2.0):mix(fg,fr,(t-0.5)*2.0);
          c=mix(c,fc,0.08);
          gl_FragColor=vec4(c,1.0);
        }`,
    });

    // Cliff edges
    const hw = W / 2, hd = D / 2, r = 2.5;
    const shape = new THREE.Shape();
    shape.moveTo(-hw + r, -hd); shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r); shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd); shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r); shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    const hole = new THREE.Shape();
    const ins = 1;
    hole.moveTo(-hw + r + ins, -hd + ins); hole.lineTo(hw - r - ins, -hd + ins);
    hole.quadraticCurveTo(hw - ins, -hd + ins, hw - ins, -hd + r + ins); hole.lineTo(hw - ins, hd - r - ins);
    hole.quadraticCurveTo(hw - ins, hd - ins, hw - r - ins, hd - ins); hole.lineTo(-hw + r + ins, hd - ins);
    hole.quadraticCurveTo(-hw + ins, hd - ins, -hw + ins, hd - r - ins); hole.lineTo(-hw + ins, -hd + r + ins);
    hole.quadraticCurveTo(-hw + ins, -hd + ins, -hw + r + ins, -hd + ins);
    shape.holes.push(hole);
    const cGeo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    cGeo.rotateX(-Math.PI / 2); cGeo.translate(0, -1.5, 0);

    return { topGeo: geo, topMat: mat, cliffGeo: cGeo };
  }, []);

  return (
    <group>
      <mesh geometry={topGeo} material={topMat} />
      <mesh geometry={cliffGeo}><meshStandardMaterial color="#5a4a38" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}><planeGeometry args={[54, 32]} /><meshStandardMaterial color="#3a2a1a" roughness={1} /></mesh>
    </group>
  );
}

// ─── RIVERS (thick TubeGeometry, above terrain) ─────────────────
function Rivers() {
  const rivers = useMemo(() => {
    const makeRiver = (pts: [number, number, number][], radius: number) => {
      const adjusted = pts.map(([x, , z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.15, z));
      const curve = new THREE.CatmullRomCurve3(adjusted, false, "catmullrom", 0.5);
      return new THREE.TubeGeometry(curve, 60, radius, 6, false);
    };
    return {
      danube: makeRiver([[-26, 0, -11], [-20, 0, -10.5], [-14, 0, -10], [-8, 0, -9.5], [-2, 0, -9], [4, 0, -8.5], [10, 0, -8], [16, 0, -7.5], [22, 0, -7], [26, 0, -6.5]], 0.2),
      maritsa: makeRiver([[4, 0, 6], [7, 0, 7], [10, 0, 8], [14, 0, 9.5], [18, 0, 11]], 0.15),
      iskar: makeRiver([[0, 0, 1], [0.5, 0, -2], [1, 0, -5], [1.5, 0, -7.5], [2, 0, -9]], 0.12),
      struma: makeRiver([[3, 0, 6], [2.5, 0, 8.5], [2, 0, 10.5], [1.5, 0, 12.5]], 0.10),
    };
  }, []);

  const riverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a90c8", emissive: "#1a50a0", emissiveIntensity: 0.3, roughness: 0.4 }), []);

  return (
    <group>
      {Object.values(rivers).map((geo, i) => <mesh key={i} geometry={geo} material={riverMat} />)}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INSTANCED SCATTER: TREES, ROCKS, SOLDIERS, RIDERS, FLAGS
// ═══════════════════════════════════════════════════════════════════

function ScatteredTrees() {
  const count = IS_MOBILE ? 80 : 160;
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
    };
    const r = rng(42);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 50;
      const z = (r() - 0.5) * 30;
      const h = terrainHeight(x, z);
      if (h < 0.3 || h > 2.5) continue;
      const scale = 0.6 + r() * 0.8;
      // Trunk
      dummy.position.set(x, h + 0.2 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, r() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);
      // Leaves
      dummy.position.set(x, h + 0.55 * scale, z);
      dummy.updateMatrix();
      leavesRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (leavesRef.current) leavesRef.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.04, 0.06, 0.4, 5]} /><meshStandardMaterial color="#5c3d2e" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leavesRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.2, 6, 5]} /><meshStandardMaterial color="#3a7d44" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function ScatteredRocks() {
  const count = IS_MOBILE ? 50 : 100;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    const rng = (seed: number) => { let s = seed; return () => { s = (s * 48271 + 0) % 2147483647; return (s - 1) / 2147483646; }; };
    const r = rng(123);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 50;
      const z = (r() - 0.5) * 30;
      const h = terrainHeight(x, z);
      if (h < 0.1) continue;
      const scale = 0.15 + r() * 0.35;
      dummy.position.set(x, h + scale * 0.3, z);
      dummy.scale.set(scale * (0.8 + r() * 0.4), scale, scale * (0.8 + r() * 0.4));
      dummy.rotation.set(r() * 0.3, r() * Math.PI * 2, r() * 0.3);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#6a6860" roughness={0.95} />
    </instancedMesh>
  );
}

// ─── Animated soldiers (instanced, with idle sway) ──────────────
function ScatteredSoldiers() {
  const count = IS_MOBILE ? 40 : 80;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }; };
    const r = rng(777);
    // Cluster near battle zones + spread some everywhere
    const clusters: [number, number, number, number][] = [
      [-8, -7, 3, 8],  // Aheloy
      [-3, -3, 2, 6],  // Tarnovo
      [0, -8, 2, 5],   // Adrianople
      [12, -6, 3, 6],  // Uprising
      [15, -3, 2, 8],  // Shipka
      [16, 5, 2, 5],   // Liberation
      [-22, 4, 3, 4],  // Foundation
      [-16, 2, 2, 4],  // Pliska
      [7, -5, 2, 4],   // 1396
      [8, -9, 2, 3],   // 1444
      [19, -8, 2, 4],  // 1912
      [-20, -5, 2, 3], // Madara
      [3, -9, 2, 3],   // Ivan Asen
      [20, 2, 2, 3],   // Sofia
    ];
    const pts: { x: number; z: number; h: number }[] = [];
    for (let i = 0; i < count; i++) {
      const cl = clusters[i % clusters.length];
      const x = cl[0] + (r() - 0.5) * cl[2] * 2;
      const z = cl[1] + (r() - 0.5) * cl[3] * 0.5;
      const h = terrainHeight(x, z);
      if (h < 0) continue;
      pts.push({ x, z, h });
    }
    return pts;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    positions.forEach((p, i) => {
      const sway = Math.sin(t * 1.5 + i * 0.7) * 0.015;
      // Body
      dummy.position.set(p.x + sway, p.h + 0.25, p.z);
      dummy.scale.set(1.5, 1.5, 1.5);
      dummy.rotation.set(0, i * 1.3, sway * 2);
      dummy.updateMatrix();
      bodyRef.current?.setMatrixAt(i, dummy.matrix);
      // Head
      dummy.position.set(p.x + sway, p.h + 0.55, p.z);
      dummy.scale.set(1.5, 1.5, 1.5);
      dummy.updateMatrix();
      headRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.06, 0.08, 0.4, 5]} /><meshStandardMaterial color="#4a4a5a" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.06, 5, 5]} /><meshStandardMaterial color="#d4a574" />
      </instancedMesh>
    </group>
  );
}

// ─── Animated horse riders (instanced) ──────────────────────────
function ScatteredRiders() {
  const count = IS_MOBILE ? 16 : 36;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const riderRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const rng = (seed: number) => { let s = seed; return () => { s = (s * 48271 + 0) % 2147483647; return (s - 1) / 2147483646; }; };
    const r = rng(555);
    const clusters: [number, number, number][] = [
      [-22, 4, 3], [-19, 3, 2], [-16, -3, 3], [-11, -5, 2],
      [-8, -7, 2], [0, -8, 2], [4, 6, 2], [10, 5, 2],
      [12, -6, 2], [15, -3, 3], [18, 4, 2], [20, -5, 2], [22, 2, 2],
    ];
    return Array.from({ length: count }, (_, i) => {
      const cl = clusters[i % clusters.length];
      const x = cl[0] + (r() - 0.5) * cl[2];
      const z = cl[1] + (r() - 0.5) * 2;
      const h = terrainHeight(x, z);
      return { x, z, h, rot: r() * Math.PI * 2 };
    }).filter(p => p.h > 0);
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    positions.forEach((p, i) => {
      const bob = Math.abs(Math.sin(t * 2 + i)) * 0.03;
      const sway = Math.sin(t * 0.5 + i) * 0.02;
      // Horse body
      dummy.position.set(p.x + sway, p.h + 0.3 + bob, p.z);
      dummy.scale.set(1.8, 1.8, 1.8);
      dummy.rotation.set(0, p.rot, 0);
      dummy.updateMatrix();
      bodyRef.current?.setMatrixAt(i, dummy.matrix);
      // Rider
      dummy.position.set(p.x + sway, p.h + 0.65 + bob, p.z);
      dummy.updateMatrix();
      riderRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (riderRef.current) riderRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.5, 0.25, 0.2]} /><meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={riderRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.06, 0.08, 0.25, 5]} /><meshStandardMaterial color="#3a5a3a" />
      </instancedMesh>
    </group>
  );
}

// ─── Scattered flags (instanced, animated sway) ─────────────────
function ScatteredFlags() {
  const count = IS_MOBILE ? 20 : 40;
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const flagRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }; };
    const r = rng(333);
    return Array.from({ length: count }, () => {
      const x = (r() - 0.5) * 50;
      const z = (r() - 0.5) * 30;
      const h = terrainHeight(x, z);
      return { x, z, h };
    }).filter(p => p.h > 0.2);
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    positions.forEach((p, i) => {
      const sway = Math.sin(t * 2 + i * 1.1) * 0.06;
      // Pole
      dummy.position.set(p.x, p.h + 0.6, p.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, sway);
      dummy.updateMatrix();
      poleRef.current?.setMatrixAt(i, dummy.matrix);
      // Flag cloth
      dummy.position.set(p.x + 0.18, p.h + 1.05, p.z);
      dummy.rotation.set(0, 0, sway);
      dummy.updateMatrix();
      flagRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (poleRef.current) poleRef.current.instanceMatrix.needsUpdate = true;
    if (flagRef.current) flagRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={poleRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} /><meshStandardMaterial color="#777" metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={flagRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.3, 0.18, 0.01]} /><meshStandardMaterial color="#009b3a" />
      </instancedMesh>
    </group>
  );
}

// ─── Cannons (instanced) ────────────────────────────────────────
function ScatteredCannons() {
  const count = IS_MOBILE ? 12 : 24;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    const spots: [number, number][] = [
      [14, -3], [15, -2], [15.5, -1], [16, 0], [14.5, -2.5], [13.5, -2],
      [0.5, -8], [-7.5, -7], [17, -4], [18, -6], [12, -6], [8, -9],
      [-8, -6], [-6, -5], [3, -8.5], [19, -7], [11, -5], [20, -4],
      [13, -7], [7, -8], [-3, -4], [-19, -4], [-15, -3], [22, -3],
    ];
    spots.slice(0, count).forEach(([x, z], i) => {
      const h = terrainHeight(x, z);
      dummy.position.set(x, h + 0.1, z);
      dummy.scale.set(2, 2, 2);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, Math.PI / 2);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[0.04, 0.06, 0.4, 6]} /><meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
    </instancedMesh>
  );
}

// ─── Carts (new prop!) ──────────────────────────────────────────
function Cart({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Cart bed */}
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.8, 0.15, 0.4]} /><meshStandardMaterial color="#7a5a2a" roughness={0.8} /></mesh>
      {/* Side walls */}
      <mesh position={[0, 0.35, 0.18]}><boxGeometry args={[0.8, 0.15, 0.03]} /><meshStandardMaterial color="#6a4a1a" /></mesh>
      <mesh position={[0, 0.35, -0.18]}><boxGeometry args={[0.8, 0.15, 0.03]} /><meshStandardMaterial color="#6a4a1a" /></mesh>
      {/* Wheels */}
      {[[-0.25, 0.1, 0.22], [-0.25, 0.1, -0.22], [0.25, 0.1, 0.22], [0.25, 0.1, -0.22]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.03, 8]} /><meshStandardMaterial color="#4a3a1a" /></mesh>
      ))}
      {/* Cargo sacks */}
      <mesh position={[-0.15, 0.35, 0]}><sphereGeometry args={[0.1, 5, 5]} /><meshStandardMaterial color="#8a7a5a" roughness={0.9} /></mesh>
      <mesh position={[0.1, 0.33, 0.05]}><sphereGeometry args={[0.08, 5, 5]} /><meshStandardMaterial color="#9a8a6a" roughness={0.9} /></mesh>
    </group>
  );
}

function AllCarts() {
  const carts = useMemo(() => {
    const spots: [number, number, number][] = [
      [-20, 0, 2], [-17, 0, -3], [-14, 0, 4], [-10, 0, -4], [-7, 0, 5],
      [-4, 0, -2], [-1, 0, 3], [2, 0, -5], [5, 0, 4], [8, 0, -3],
      [10, 0, 5], [13, 0, -2], [15, 0, 4], [18, 0, -4], [20, 0, 3],
      [22, 0, -1], [-12, 0, -6], [7, 0, 7], [16, 0, -7], [-5, 0, 7],
    ];
    return spots.map(([x, , z]) => ({ x, z, h: terrainHeight(x, z), rot: Math.random() * Math.PI * 2 })).filter(c => c.h > 0.1);
  }, []);

  return (
    <group>
      {carts.map((c, i) => <Cart key={i} position={[c.x, c.h + 0.05, c.z]} rotationY={c.rot} />)}
    </group>
  );
}

// ─── Military camps (tents + fire) ──────────────────────────────
function MilitaryCamp({ position }: { position: [number, number, number] }) {
  const fireRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (fireRef.current) {
      const s = 0.8 + Math.sin(clock.getElapsedTime() * 6 + position[0]) * 0.2;
      fireRef.current.scale.setScalar(s);
    }
  });
  return (
    <group position={position}>
      {/* Tents */}
      {[[-0.5, 0, -0.3], [0.5, 0, 0.2], [0, 0, 0.6]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.25 + y, z]}><coneGeometry args={[0.3, 0.5, 5]} /><meshStandardMaterial color={i === 0 ? "#8a7a5a" : "#7a6a4a"} roughness={0.8} /></mesh>
      ))}
      {/* Campfire */}
      <mesh ref={fireRef} position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.1, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial emissive="#ff5500" emissiveIntensity={2} color="#ff7730" />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#ff8030" intensity={1} distance={4} />
    </group>
  );
}

function AllCamps() {
  const spots = useMemo(() => {
    const s: [number, number][] = [
      [-22, 3], [-18, -4], [-13, -6], [-8, 5], [-5, -6], [0, -7], [4, 6],
      [8, -6], [10, 5], [14, -6], [18, 4], [20, -5], [22, 2], [-15, 5],
    ];
    return s.map(([x, z]) => ({ x, z, h: terrainHeight(x, z) })).filter(c => c.h > 0.1);
  }, []);
  return <group>{spots.map((c, i) => <MilitaryCamp key={i} position={[c.x, c.h, c.z]} />)}</group>;
}

// ─── Smoke emitters ─────────────────────────────────────────────
function SmokeEmitter({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const data = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ offset: i * 0.7, speed: 0.2 + Math.random() * 0.15, idx: i })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d) => {
      const m = refs.current[d.idx];
      if (m) {
        const cy = ((t * d.speed + d.offset) % 4) / 4;
        m.position.set(position[0] + Math.sin(t + d.idx) * 0.15, position[1] + cy * 2.5, position[2] + Math.cos(t * 0.7 + d.idx) * 0.12);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - cy);
      }
    });
  });
  return <group>{data.map((d) => (
    <mesh key={d.idx} ref={(el) => { refs.current[d.idx] = el; }} position={[position[0], position[1], position[2]]}>
      <sphereGeometry args={[0.15, 5, 5]} /><meshBasicMaterial color="#777" transparent opacity={0.12} />
    </mesh>
  ))}</group>;
}

// ═══════════════════════════════════════════════════════════════════
// MAJOR LANDMARKS (5 interactive)
// ═══════════════════════════════════════════════════════════════════

function Torch({ position }: { position: [number, number, number] }) {
  const lRef = useRef<THREE.PointLight>(null);
  const sRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const f = 0.7 + Math.sin(clock.getElapsedTime() * 8 + position[0] * 3) * 0.3;
    if (lRef.current) lRef.current.intensity = f * 1.5;
    if (sRef.current) sRef.current.scale.setScalar(0.8 + f * 0.3);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.05, 0.07, 0.6, 5]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
      <mesh ref={sRef} position={[0, 0.7, 0]}><sphereGeometry args={[0.12, 6, 6]} /><meshStandardMaterial emissive="#ff6a00" emissiveIntensity={2} color="#ff8a20" /></mesh>
      <pointLight ref={lRef} position={[0, 0.8, 0]} color="#ff8a20" intensity={1.5} distance={5} />
    </group>
  );
}

function PliskaLandmark() {
  const pos = CITY_POSITIONS["ancient-capital"];
  return (
    <group position={pos}>
      {[[0, 0.3, -1.2], [0, 0.3, 1.2], [-1.2, 0.3, 0], [1.2, 0.3, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i < 2 ? 0 : Math.PI / 2, 0]}><boxGeometry args={[2.4, 0.6, 0.2]} /><meshStandardMaterial color="#aaa8a0" roughness={0.8} /></mesh>
      ))}
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.3, 0.35, 1.2, 6]} /><meshStandardMaterial color="#aaa8a0" roughness={0.7} /></mesh>
      <Torch position={[-1, 0, -1]} /><Torch position={[1, 0, 1]} />
      <pointLight position={[0, 1.5, 0]} color="#ffc040" intensity={2} distance={8} />
    </group>
  );
}

function TsarevetsLandmark() {
  const pos = CITY_POSITIONS["medieval-fortress"];
  return (
    <group position={pos}>
      <mesh position={[0, -0.5, 0]}><coneGeometry args={[3, 2, 8]} /><meshStandardMaterial color="#2a4a20" roughness={0.9} /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.5, 1.3, 1.3]} /><meshStandardMaterial color="#8a8078" roughness={0.7} /></mesh>
      {[[-0.8, 0], [0.8, 0], [0, -0.7]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.18, 0.22, 1.2, 6]} /><meshStandardMaterial color="#8a8078" roughness={0.7} /></mesh>
          <mesh position={[0, 2.7, 0]}><coneGeometry args={[0.28, 0.4, 6]} /><meshStandardMaterial color="#8b2020" /></mesh>
        </group>
      ))}
      <Torch position={[-1.2, 0.5, 0.8]} /><Torch position={[1.2, 0.5, -0.8]} />
      <pointLight position={[0, 3, 0]} color="#ff9040" intensity={2.5} distance={10} />
    </group>
  );
}

function RilaLandmark() {
  const pos = CITY_POSITIONS["rila-monastery"];
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2, 1, 1.4]} /><meshStandardMaterial color="#e8e0d0" roughness={0.6} /></mesh>
      <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.5, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#5a2a1a" roughness={0.7} /></mesh>
      <mesh position={[0, 1.9, 0]}><boxGeometry args={[0.04, 0.3, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[0.18, 0.04, 0.04]} /><meshStandardMaterial color="#c8a832" metalness={0.6} /></mesh>
      {!IS_MOBILE && (
        <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[0.05, 0.15, 2, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.05} /></mesh>
      )}
      <pointLight position={[0, 2, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

function RevivalLandmark() {
  const pos = CITY_POSITIONS["revival-town"];
  return (
    <group position={pos}>
      {[[-0.8, "#c8a050", 0.7], [0.6, "#b06030", 0.6], [-0.1, "#5a7a9a", 0.65]].map(([x, c, w], i) => (
        <group key={i} position={[x as number, 0, (i - 1) * 0.6]}>
          <mesh position={[0, (w as number) / 2, 0]}><boxGeometry args={[w as number, w as number, (w as number) * 0.7]} /><meshStandardMaterial color={c as string} roughness={0.7} /></mesh>
          <mesh position={[0, (w as number) + 0.12, 0]}><coneGeometry args={[(w as number) * 0.55, 0.3, 4]} /><meshStandardMaterial color="#8b4513" /></mesh>
        </group>
      ))}
      <mesh position={[0.2, 0.45, -0.9]}><boxGeometry args={[1.1, 0.9, 0.7]} /><meshStandardMaterial color="#d8c8a0" roughness={0.6} /></mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffe0a0" intensity={1.5} distance={7} />
    </group>
  );
}

function ModernSofia() {
  const pos = CITY_POSITIONS["modern-sofia"];
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.6, 1, 1.3]} /><meshStandardMaterial color="#d8d0c0" roughness={0.6} /></mesh>
      <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.6, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c8a832" metalness={0.7} roughness={0.3} /></mesh>
      {[[-1.5, 1.8, "#6a7a8a"], [1.8, 2.2, "#5a6a7a"], [-0.8, 1.2, "#7a8a9a"]].map(([x, h, c], i) => (
        <mesh key={i} position={[x as number, (h as number) / 2, (i - 1) * 0.5]}><boxGeometry args={[0.6, h as number, 0.4]} /><meshStandardMaterial color={c as string} roughness={0.5} metalness={0.2} /></mesh>
      ))}
      <pointLight position={[0, 2, 0]} color="#ffe0a0" intensity={1.5} distance={8} />
    </group>
  );
}

// ─── Shipka monument (decorative major) ─────────────────────────
function ShipkaLandmark() {
  const x = 15, z = -3;
  const h = terrainHeight(x, z);
  return (
    <group position={[x, h, z]}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.2, 1.3, 0.2]} /><meshStandardMaterial color="#e8e8e8" roughness={0.4} /></mesh>
      <mesh position={[0, 1.55, 0]}><coneGeometry args={[0.15, 0.25, 4]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
      {!IS_MOBILE && <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[0.05, 0.18, 2.2, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.05} /></mesh>}
      <pointLight position={[0, 2, 0]} color="#ffe8c0" intensity={2} distance={8} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CURVED TIMELINE PATH (spirals around terrain)
// ═══════════════════════════════════════════════════════════════════

function TimelinePath() {
  const { curve, geo } = useMemo(() => {
    const pts = ALL_POIS.map((p) => new THREE.Vector3(p.pos[0], p.pos[1] + 0.35, p.pos[2]));
    const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    const g = new THREE.TubeGeometry(c, 120, 0.05, 5, false);
    return { curve: c, geo: g };
  }, []);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotCount = IS_MOBILE ? 6 : 14;
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) matRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    for (let i = 0; i < dotCount; i++) {
      const dot = dotRefs.current[i];
      if (dot) { const p = curve.getPoint((t * 0.05 + i / dotCount) % 1); dot.position.set(p.x, p.y, p.z); }
    }
  });

  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial ref={matRef} color="#d4a832" emissive="#d4a832" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} /></mesh>
      {Array.from({ length: dotCount }, (_, i) => (
        <mesh key={i} ref={(el) => { dotRefs.current[i] = el; }}><sphereGeometry args={[0.07, 5, 5]} /><meshStandardMaterial emissive="#ffd700" emissiveIntensity={2} color="#ffd700" /></mesh>
      ))}
    </group>
  );
}

// ─── POI Labels (smart alternating) ─────────────────────────────
function POILabels() {
  return (
    <group>
      {ALL_POIS.map((poi, i) => {
        const isMajor = poi.major;
        const side = i % 2 === 0 ? 0.8 : -0.8;
        const yOff = isMajor ? 3 : 1.5;
        const xOff = isMajor ? 0 : side;
        return (
          <Html key={i} position={[poi.pos[0] + xOff, poi.pos[1] + yOff, poi.pos[2]]} center distanceFactor={isMajor ? 55 : 70} style={{ pointerEvents: "none" }}>
            <span style={{
              color: isMajor ? "#c8a832" : "#b0a878",
              fontSize: isMajor ? "11px" : "8px",
              fontWeight: isMajor ? 700 : 600,
              textShadow: `0 0 6px rgba(200,168,50,${isMajor ? 0.6 : 0.3})`,
              whiteSpace: "nowrap",
            }}>{poi.label}</span>
          </Html>
        );
      })}
    </group>
  );
}

// ─── Golden dust ────────────────────────────────────────────────
function GoldenDust() {
  const count = IS_MOBILE ? 15 : 35;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 55, y: Math.random() * 10 + 2, z: (Math.random() - 0.5) * 35,
    speed: 0.03 + Math.random() * 0.05, phase: Math.random() * Math.PI * 2,
  })), [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      dummy.position.set(d.x + Math.sin(t * d.speed + d.phase) * 2, d.y + Math.sin(t * d.speed * 0.7 + d.phase) * 1.5, d.z + Math.cos(t * d.speed * 0.5 + d.phase) * 1.5);
      dummy.scale.setScalar(0.04);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} /><meshBasicMaterial color="#ffd700" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// ─── City label button ──────────────────────────────────────────
function CityLabel({ city, lang, unlocked, completedLevels, onClick }: {
  city: City; lang: Language; unlocked: boolean; completedLevels: number; onClick: () => void;
}) {
  const pos = getCityPos(city);
  const yOff = city.id === "medieval-fortress" ? 5.5 : 4;
  return (
    <Html position={[pos[0], pos[1] + yOff, pos[2]]} center distanceFactor={48} style={{ pointerEvents: "auto" }}>
      <button onClick={onClick} className="flex flex-col items-center gap-0.5 select-none" style={{ cursor: unlocked ? "pointer" : "default" }}>
        <span className="text-2xl">{unlocked ? city.emoji : "🔒"}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap" style={{
          background: unlocked ? "rgba(200,168,50,0.2)" : "rgba(0,0,0,0.5)",
          color: unlocked ? "#fbbf24" : "#666",
          border: `1px solid ${unlocked ? "rgba(200,168,50,0.3)" : "rgba(100,100,100,0.3)"}`,
        }}>{city.building[lang]}</span>
        {unlocked && <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="text-[8px]" style={{ opacity: i < completedLevels ? 1 : 0.2 }}>⭐</span>)}</span>}
      </button>
    </Html>
  );
}

// ─── Smoke spots ────────────────────────────────────────────────
function BattleSmoke() {
  if (IS_MOBILE) return null;
  const spots = useMemo(() => {
    return [[-8, -7], [0, -8], [12, -6], [15, -3], [19, -7], [-5, -6], [-18, -4], [8, -9], [3, -8], [22, -3], [7, -8], [-13, -5]].map(([x, z]) => {
      const h = terrainHeight(x, z);
      return [x, h + 0.5, z] as [number, number, number];
    });
  }, []);
  return <group>{spots.map((p, i) => <SmokeEmitter key={i} position={p} />)}</group>;
}

// ═══════════════════════════════════════════════════════════════════
// VILLAGES, BOATS, RUINS, BATTLE SCENES
// ═══════════════════════════════════════════════════════════════════

function SmallVillage({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 3 houses */}
      {[[-0.6, 0, -0.3], [0.5, 0, 0.2], [-0.1, 0, 0.7]].map(([x, y, z], i) => {
        const w = 0.4 + i * 0.05;
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, w / 2, 0]}><boxGeometry args={[w, w, w * 0.7]} /><meshStandardMaterial color={["#c8a050", "#b06030", "#a08848"][i]} roughness={0.7} /></mesh>
            <mesh position={[0, w + 0.1, 0]}><coneGeometry args={[w * 0.55, 0.25, 4]} /><meshStandardMaterial color="#7a4520" /></mesh>
            <mesh position={[0, w * 0.35, w * 0.36]}><boxGeometry args={[0.08, 0.08, 0.01]} /><meshStandardMaterial emissive="#ffc040" emissiveIntensity={2} color="#ffc040" /></mesh>
          </group>
        );
      })}
      {/* Well */}
      <mesh position={[0.5, 0.15, 0.8]}><cylinderGeometry args={[0.12, 0.12, 0.3, 6]} /><meshStandardMaterial color="#8a8a8a" roughness={0.9} /></mesh>
      {/* Fence */}
      {[0, 0.3, 0.6, 0.9].map((x, i) => (
        <mesh key={`f${i}`} position={[-0.9 + x, 0.1, -0.6]}><boxGeometry args={[0.02, 0.2, 0.02]} /><meshStandardMaterial color="#6a5020" /></mesh>
      ))}
    </group>
  );
}

function AllVillages() {
  const spots = useMemo(() => [
    [-18, 6], [-10, 8], [6, 8], [14, 7], [20, 6],
    [-5, 9], [18, -9], [-22, -6], [8, 10], [-14, -8],
  ].map(([x, z]) => ({ x, z, h: terrainHeight(x, z) })).filter(v => v.h > 0.2), []);
  return <group>{spots.map((v, i) => <SmallVillage key={i} position={[v.x, v.h, v.z]} />)}</group>;
}

function BattleScene({ position }: { position: [number, number, number] }) {
  const fireRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (fireRef.current) fireRef.current.scale.setScalar(0.8 + Math.sin(clock.getElapsedTime() * 6 + position[0]) * 0.2);
  });
  return (
    <group position={position}>
      {/* Soldiers in circle */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.8 + Math.random() * 0.3;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.06, 0.07, 0.4, 5]} /><meshStandardMaterial color="#4a4a5a" /></mesh>
            <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.06, 5, 5]} /><meshStandardMaterial color="#d4a574" /></mesh>
          </group>
        );
      })}
      {/* Central fire */}
      <mesh ref={fireRef} position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.15, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial emissive="#ff5500" emissiveIntensity={2} color="#ff7730" />
      </mesh>
      {/* Flag */}
      <mesh position={[0.5, 0.5, 0]}><cylinderGeometry args={[0.02, 0.02, 1, 4]} /><meshStandardMaterial color="#777" /></mesh>
      <mesh position={[0.7, 0.9, 0]}><boxGeometry args={[0.3, 0.15, 0.01]} /><meshStandardMaterial color="#d62612" /></mesh>
      {/* Crossed spears */}
      <mesh position={[-0.5, 0.3, -0.3]} rotation={[0.2, 0, 0.8]}><cylinderGeometry args={[0.01, 0.01, 0.7, 4]} /><meshStandardMaterial color="#8a7a5a" /></mesh>
      <mesh position={[-0.5, 0.3, -0.3]} rotation={[0.2, 0, -0.8]}><cylinderGeometry args={[0.01, 0.01, 0.7, 4]} /><meshStandardMaterial color="#8a7a5a" /></mesh>
      <pointLight position={[0, 0.6, 0]} color="#ff8030" intensity={1.5} distance={5} />
    </group>
  );
}

function AllBattleScenes() {
  const spots = useMemo(() => [
    [-20, -3], [-8, -8], [0, -6], [7, -7], [12, -8], [18, -6], [-14, 5], [3, -10],
  ].map(([x, z]) => ({ x, z, h: terrainHeight(x, z) })).filter(b => b.h > 0.1), []);
  return <group>{spots.map((b, i) => <BattleScene key={i} position={[b.x, b.h, b.z]} />)}</group>;
}

function Boat({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.8 + position[0]) * 0.08;
      ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.6 + position[0]) * 0.03;
    }
  });
  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      {/* Hull */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.8, 0.15, 0.3]} /><meshStandardMaterial color="#6a4a20" roughness={0.8} /></mesh>
      {/* Bow */}
      <mesh position={[0.45, 0.05, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.2, 0.1, 0.2]} /><meshStandardMaterial color="#7a5a30" /></mesh>
      {/* Mast */}
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.015, 0.015, 0.6, 4]} /><meshStandardMaterial color="#8a7a5a" /></mesh>
      {/* Sail */}
      <mesh position={[0.08, 0.4, 0]}><boxGeometry args={[0.25, 0.3, 0.01]} /><meshStandardMaterial color="#e8e0d0" transparent opacity={0.9} /></mesh>
    </group>
  );
}

function AllBoats() {
  const boats = useMemo(() => [
    { p: [26, -0.5, -4] as [number, number, number], r: 0.3 },
    { p: [28, -0.5, 2] as [number, number, number], r: -0.5 },
    { p: [24, -0.5, -8] as [number, number, number], r: 0.8 },
    { p: [-28, -0.5, 3] as [number, number, number], r: 1.2 },
    { p: [-26, -0.5, 8] as [number, number, number], r: -0.3 },
    { p: [8, -0.5, 16] as [number, number, number], r: 0.6 },
    { p: [3, -0.5, 18] as [number, number, number], r: -0.7 },
    { p: [-5, -0.5, 17] as [number, number, number], r: 0.2 },
    { p: [30, -0.5, 5] as [number, number, number], r: -1 },
    { p: [20, -0.5, 14] as [number, number, number], r: 0.4 },
  ], []);
  return <group>{boats.map((b, i) => <Boat key={i} position={b.p} rotationY={b.r} />)}</group>;
}

// Thracian ruins (backside content)
function ThracianRuins({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Broken columns */}
      {[[-0.4, 0], [0.4, 0], [0, -0.5], [-0.3, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2 + Math.random() * 0.15, z]} rotation={[(Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.15]}>
          <cylinderGeometry args={[0.08, 0.1, 0.4 + Math.random() * 0.2, 6]} />
          <meshStandardMaterial color="#b8b0a0" roughness={0.8} />
        </mesh>
      ))}
      {/* Fallen stone blocks */}
      <mesh position={[0.2, 0.08, 0.3]} rotation={[0.1, 0.3, 0]}><boxGeometry args={[0.25, 0.12, 0.18]} /><meshStandardMaterial color="#a8a098" roughness={0.9} /></mesh>
      <mesh position={[-0.3, 0.06, -0.2]} rotation={[0, 0.6, 0.05]}><boxGeometry args={[0.2, 0.1, 0.15]} /><meshStandardMaterial color="#9a9288" roughness={0.9} /></mesh>
      {/* Mysterious glow */}
      <pointLight position={[0, 0.5, 0]} color="#a0c0ff" intensity={0.5} distance={3} />
    </group>
  );
}

function AllRuins() {
  const spots = useMemo(() => [
    [-18, -8], [-5, -10], [5, -11], [15, -10], [-12, -10], [22, -8],
  ].map(([x, z]) => ({ x, z, h: terrainHeight(x, z) })).filter(r => r.h > 0), []);
  return <group>{spots.map((r, i) => <ThracianRuins key={i} position={[r.x, r.h, r.z]} />)}</group>;
}

// ═══════════════════════════════════════════════════════════════════
// GAME OBJECTS (visual landmarks for future mini-games)
// ═══════════════════════════════════════════════════════════════════

function ArcheryRange({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Target stands */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[i * 0.8 - 0.8, 0, 0]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6, 4]} /><meshStandardMaterial color="#6a4a20" /></mesh>
          {/* Target circles */}
          <mesh position={[0, 0.55, 0.02]}><circleGeometry args={[0.15, 12]} /><meshStandardMaterial color="#cc2222" /></mesh>
          <mesh position={[0, 0.55, 0.025]}><circleGeometry args={[0.1, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 0.55, 0.03]}><circleGeometry args={[0.05, 12]} /><meshStandardMaterial color="#cc2222" /></mesh>
        </group>
      ))}
      {/* Bow rack */}
      <mesh position={[-1.5, 0.25, 0]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#5a3a1a" /></mesh>
      {/* Arrow quiver */}
      <mesh position={[-1.3, 0.2, 0]}><cylinderGeometry args={[0.05, 0.04, 0.35, 5]} /><meshStandardMaterial color="#7a5a2a" /></mesh>
      {/* Label */}
      <Html position={[0, 1.2, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#ff6644", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #ff440040" }}>🏹 Archery</span>
      </Html>
    </group>
  );
}

function WordForge({ position }: { position: [number, number, number] }) {
  const fireRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (fireRef.current) fireRef.current.scale.y = 0.8 + Math.sin(clock.getElapsedTime() * 5 + position[0]) * 0.2;
  });
  return (
    <group position={position}>
      {/* Anvil */}
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.15, 0.2]} /><meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.35, 0.05, 0.25]} /><meshStandardMaterial color="#5a5a5a" metalness={0.7} roughness={0.3} /></mesh>
      {/* Forge fire */}
      <mesh position={[0.5, 0.2, 0]}><boxGeometry args={[0.4, 0.25, 0.3]} /><meshStandardMaterial color="#4a2a1a" roughness={0.9} /></mesh>
      <mesh ref={fireRef} position={[0.5, 0.4, 0]}>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshStandardMaterial emissive="#ff4400" emissiveIntensity={2} color="#ff6620" />
      </mesh>
      {/* Hammer */}
      <mesh position={[-0.3, 0.2, 0.1]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 4]} /><meshStandardMaterial color="#6a5a3a" />
      </mesh>
      <pointLight position={[0.5, 0.6, 0]} color="#ff6620" intensity={1.5} distance={4} />
      <Html position={[0, 1.2, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#ff8844", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #ff660040" }}>🔥 Word Forge</span>
      </Html>
    </group>
  );
}

function ScrollStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Podium */}
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.2, 0.25, 0.4, 6]} /><meshStandardMaterial color="#8a7a5a" roughness={0.7} /></mesh>
      {/* Scroll */}
      <mesh position={[0, 0.45, 0]} rotation={[0.1, 0.3, 0]}><cylinderGeometry args={[0.06, 0.06, 0.3, 6]} /><meshStandardMaterial color="#e8d8a0" /></mesh>
      {/* Unrolled parchment */}
      <mesh position={[0.12, 0.42, 0]} rotation={[0.1, 0.3, 0]}><boxGeometry args={[0.2, 0.01, 0.15]} /><meshStandardMaterial color="#f0e8c0" /></mesh>
      {/* Ink pot */}
      <mesh position={[-0.15, 0.42, 0.08]}><cylinderGeometry args={[0.03, 0.03, 0.05, 5]} /><meshStandardMaterial color="#2a2a3a" /></mesh>
      <Html position={[0, 1, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#c8a832", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #c8a83240" }}>📜 Scroll Puzzle</span>
      </Html>
    </group>
  );
}

function CampfireStory({ position }: { position: [number, number, number] }) {
  const fireRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (fireRef.current) {
      const s = 0.8 + Math.sin(clock.getElapsedTime() * 4 + position[0]) * 0.15;
      fireRef.current.scale.set(s, s * 1.2, s);
    }
  });
  return (
    <group position={position}>
      {/* Log seats in circle */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6]} rotation={[0, a + Math.PI / 2, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.25, 5]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Central fire */}
      <mesh ref={fireRef} position={[0, 0.15, 0]}>
        <coneGeometry args={[0.1, 0.25, 6]} />
        <meshStandardMaterial emissive="#ff5500" emissiveIntensity={2} color="#ff7730" />
      </mesh>
      {/* Storyteller NPC */}
      <group position={[0.6, 0, 0.1]}>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.06, 0.07, 0.35, 5]} /><meshStandardMaterial color="#6a3a5a" /></mesh>
        <mesh position={[0, 0.42, 0]}><sphereGeometry args={[0.06, 5, 5]} /><meshStandardMaterial color="#d4a574" /></mesh>
      </group>
      <pointLight position={[0, 0.5, 0]} color="#ff7730" intensity={1.2} distance={4} />
      <Html position={[0, 1, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#ff9955", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #ff663340" }}>🔥 Story</span>
      </Html>
    </group>
  );
}

function WizardTower({ position }: { position: [number, number, number] }) {
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) glowRef.current.intensity = 1 + Math.sin(clock.getElapsedTime() * 2 + position[0]) * 0.5;
  });
  return (
    <group position={position}>
      {/* Tower base */}
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.3, 0.8, 6]} /><meshStandardMaterial color="#5a4a6a" roughness={0.7} /></mesh>
      {/* Tower top */}
      <mesh position={[0, 0.9, 0]}><coneGeometry args={[0.3, 0.4, 6]} /><meshStandardMaterial color="#3a2a5a" /></mesh>
      {/* Magic orb */}
      <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial emissive="#6a6aff" emissiveIntensity={2} color="#8a8aff" transparent opacity={0.8} /></mesh>
      <pointLight ref={glowRef} position={[0, 1.3, 0]} color="#6a6aff" intensity={1} distance={5} />
      <Html position={[0, 1.8, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#8a8aff", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #6a6aff40" }}>🧙 Quiz</span>
      </Html>
    </group>
  );
}

function BoatDock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Dock planks */}
      <mesh position={[0, 0.05, 0]}><boxGeometry args={[1.2, 0.06, 0.4]} /><meshStandardMaterial color="#7a5a2a" roughness={0.8} /></mesh>
      {/* Posts */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0.18]}><cylinderGeometry args={[0.04, 0.04, 0.4, 5]} /><meshStandardMaterial color="#5a3a1a" /></mesh>
      ))}
      {/* Rope */}
      <mesh position={[0.5, 0.15, 0.25]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 0.3, 4]} /><meshStandardMaterial color="#a89060" /></mesh>
      {/* Crates */}
      <mesh position={[-0.3, 0.12, -0.1]}><boxGeometry args={[0.15, 0.12, 0.12]} /><meshStandardMaterial color="#8a6a30" /></mesh>
      <mesh position={[-0.1, 0.12, -0.1]}><boxGeometry args={[0.12, 0.1, 0.1]} /><meshStandardMaterial color="#9a7a40" /></mesh>
      <Html position={[0, 0.8, 0]} center distanceFactor={55} style={{ pointerEvents: "none" }}>
        <span style={{ color: "#6ab0d0", fontSize: "9px", fontWeight: 700, textShadow: "0 0 4px #4a90b040" }}>⚓ Port</span>
      </Html>
    </group>
  );
}

function AllGameObjects() {
  const objects = useMemo(() => {
    const th = (x: number, z: number) => terrainHeight(x, z);
    return {
      archery: [
        [(-17), th(-17, -6), -6] as [number, number, number],
        [10, th(10, -7), -7] as [number, number, number],
        [22, th(22, 5), 5] as [number, number, number],
      ],
      forges: [
        [-13, th(-13, 3), 3] as [number, number, number],
        [6, th(6, -4), -4] as [number, number, number],
        [18, th(18, 3), 3] as [number, number, number],
      ],
      scrolls: [
        [-9, th(-9, -5), -5] as [number, number, number],
        [2, th(2, 6), 6] as [number, number, number],
        [16, th(16, -8), -8] as [number, number, number],
      ],
      campfires: [
        [-20, th(-20, -7), -7] as [number, number, number],
        [-3, th(-3, 7), 7] as [number, number, number],
        [8, th(8, -10), -10] as [number, number, number],
        [21, th(21, -6), -6] as [number, number, number],
      ],
      wizards: [
        [-15, th(-15, -9), -9] as [number, number, number],
        [5, th(5, 9), 9] as [number, number, number],
        [17, th(17, -10), -10] as [number, number, number],
      ],
      docks: [
        [24, th(24, 0) - 0.3, 0] as [number, number, number],
        [-24, th(-24, 2) - 0.3, 2] as [number, number, number],
        [12, th(12, 12) - 0.3, 12] as [number, number, number],
      ],
    };
  }, []);

  return (
    <group>
      {objects.archery.map((p, i) => <ArcheryRange key={`ar${i}`} position={p} />)}
      {objects.forges.map((p, i) => <WordForge key={`wf${i}`} position={p} />)}
      {objects.scrolls.map((p, i) => <ScrollStation key={`ss${i}`} position={p} />)}
      {objects.campfires.map((p, i) => <CampfireStory key={`cf${i}`} position={p} />)}
      {objects.wizards.map((p, i) => <WizardTower key={`wt${i}`} position={p} />)}
      {objects.docks.map((p, i) => <BoatDock key={`bd${i}`} position={p} />)}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCENE + EXPORT
// ═══════════════════════════════════════════════════════════════════

function SceneContent({ onSelectCity, lang }: { onSelectCity: (city: City) => void; lang: Language }) {
  const { getTopicCompletedLevels } = useProgressStore();
  return (
    <>
      <ambientLight intensity={0.6} color="#e0d8c8" />
      <directionalLight position={[-15, 28, 10]} intensity={0.85} color="#ffc860" />
      <hemisphereLight color="#87ceeb" groundColor="#5a7a40" intensity={0.35} />

      <SkyGradient />
      <OceanSurface />
      <SeaLabels />
      <ReliefTerrain />
      <Rivers />

      {/* Interactive landmarks */}
      <PliskaLandmark />
      <TsarevetsLandmark />
      <RilaLandmark />
      <RevivalLandmark />
      <ModernSofia />
      <ShipkaLandmark />

      {/* Scattered world population */}
      <ScatteredTrees />
      <ScatteredRocks />
      <ScatteredSoldiers />
      <ScatteredRiders />
      <ScatteredFlags />
      <ScatteredCannons />
      <AllCarts />
      <AllCamps />
      <BattleSmoke />

      {/* Villages, battles, boats, ruins */}
      <AllVillages />
      <AllBattleScenes />
      <AllBoats />
      <AllRuins />

      {/* Game objects */}
      <AllGameObjects />

      {/* Timeline + labels */}
      <TimelinePath />
      <POILabels />
      <GoldenDust />

      {/* City buttons */}
      {HISTORY_CITIES.map((city) => (
        <CityLabel key={city.id} city={city} lang={lang} unlocked={true}
          completedLevels={getTopicCompletedLevels(city.topicId)}
          onClick={() => onSelectCity(city)} />
      ))}
    </>
  );
}


// Mobile camera adjuster — fixes zoom on phones (runs after mount)
function MobileCameraAdjust({ pos, fov }: { pos: [number, number, number]; fov: number }) {
  const { camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const isMob = window.innerWidth < 800 || "ontouchstart" in window;
    if (isMob) {
      camera.position.set(...pos);
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
      done.current = true;
    }
  }, [camera, fov, pos]);
  return null;
}

export function HistoryBGMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState<[number, number]>(IS_MOBILE ? [0.8, 1] : [1, 1.5]);

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ position: IS_MOBILE ? [0, 44, 68] : [0, 30, 48], fov: IS_MOBILE ? 55 : 45 }}
        gl={{ antialias: !IS_MOBILE, powerPreference: "high-performance" }}
        style={{ background: "#06192e" }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr([0.6, 0.8])}
          onIncline={() => setDpr(IS_MOBILE ? [0.8, 1] : [1, 1.5])}
        />
        <fog attach="fog" args={["#5a8ab0", 55, 160]} />
        <OrbitControls
          enablePan enableZoom enableRotate
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI - 0.2}
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
          minDistance={10}
          maxDistance={80}
          enableDamping
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
        <SceneContent onSelectCity={onSelectCity} lang={lang} />
      </Canvas>
    </div>
  );
}
