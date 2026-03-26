"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import type { Language } from "@/types";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────
const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

const underwaterWorld = WORLDS.find((w) => w.id === "underwater")!;
const UNDERWATER_CITIES = CITIES.filter((c) => underwaterWorld.topicIds.includes(c.topicId));

// ─── City positions with depth ───────────────────────────────────
const CITY_POSITIONS: Record<string, [number, number, number]> = {
  "coral-city":         [-20, -1,  -15],
  "deep-sea-dome":      [ 15, -5,  -10],
  "shipwreck-cove":     [ 30, -2,  -20],
  "kelp-forest":        [-30, -1,    0],
  "submarine-base":     [  5, -8,    5],
  "abyss-zone":         [ 25, -14,  15],
  "bubble-town":        [-15, -6,   15],
  "treasure-vault":     [ 10, -10,  20],
  "underwater-volcano":  [  0, -12,  30],
};

function getCityPos(city: City): [number, number, number] {
  return CITY_POSITIONS[city.id] ?? [(city.pos.x - 50) * 1.2, -3, (city.pos.y - 50) * 1.2];
}

function getDepthZone(y: number): "shallow" | "mid" | "abyss" {
  if (y > -3) return "shallow";
  if (y > -8) return "mid";
  return "abyss";
}

const DEPTH_LABELS: Record<string, string> = { shallow: "Shallow", mid: "Deep", abyss: "Abyss" };

// ─── Coral palette ───────────────────────────────────────────────
const CORAL_SHALLOW = ["#FF6B9D", "#FF8E53", "#C084FC", "#2DD4BF", "#FACC15"];
const CORAL_DEEP    = ["#1E3A5F", "#0E4D6E", "#3B1F6E", "#0D9488", "#155E75"];

function getCoralColors(y: number): string[] {
  return y > -3 ? CORAL_SHALLOW : y > -8
    ? CORAL_SHALLOW.map((c, i) => i % 2 === 0 ? c : CORAL_DEEP[i])
    : CORAL_DEEP;
}

// ─── Coral Reef Platform ─────────────────────────────────────────
function CoralPlatform({
  position,
  index,
  isMobile,
}: {
  position: [number, number, number];
  index: number;
  isMobile: boolean;
}) {
  const zone = getDepthZone(position[1]);
  const palette = getCoralColors(position[1]);
  const isGlowing = zone === "abyss";
  const coralCount = isMobile ? 3 : 5;

  const corals = useMemo(() => {
    const seed = index * 137;
    return Array.from({ length: coralCount }, (_, i) => {
      const angle = ((seed + i * 72) % 360) * (Math.PI / 180);
      const dist = 0.6 + (((seed + i * 7) % 10) / 10) * 0.9;
      const tiltX = ((seed + i * 11) % 60 - 30) * (Math.PI / 180);
      const tiltZ = ((seed + i * 17) % 60 - 30) * (Math.PI / 180);
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: 0.5 + (((seed + i * 13) % 10) / 10) * 1.4,
        radius: 0.12 + (((seed + i * 3) % 10) / 10) * 0.18,
        tiltX,
        tiltZ,
        color: palette[(seed + i) % palette.length],
      };
    });
  }, [index, coralCount, palette]);

  return (
    <group position={position}>
      {/* Base rock — irregular cylinder */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[2.2, 3, 1.4, 7]} />
        <meshStandardMaterial color="#2D3748" roughness={0.95} />
      </mesh>
      {/* Secondary rock bump */}
      <mesh position={[1.2, -0.2, 0.5]} rotation={[0.1, 0.4, 0]}>
        <cylinderGeometry args={[1, 1.5, 0.8, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>

      {/* Coral branches */}
      {corals.map((c, i) => (
        <group key={i} position={[c.x, 0.2, c.z]} rotation={[c.tiltX, 0, c.tiltZ]}>
          {/* Main branch */}
          <mesh position={[0, c.height / 2, 0]}>
            <cylinderGeometry args={[c.radius * 0.5, c.radius, c.height, 6]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={isGlowing ? 0.6 : 0.12}
            />
          </mesh>
          {/* Tip cone */}
          <mesh position={[0, c.height + 0.1, 0]}>
            <coneGeometry args={[c.radius * 0.7, 0.3, 5]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={isGlowing ? 0.8 : 0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── City Marker (Html overlay) ──────────────────────────────────
function CityMarker({
  city,
  lang,
  unlocked,
  onSelect,
  position,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  onSelect: (city: City) => void;
  position: [number, number, number];
}) {
  const zone = getDepthZone(position[1]);

  return (
    <group position={[position[0], position[1] + 4, position[2]]}>
      {/* Glowing ring for unlocked cities */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
          <ringGeometry args={[2.5, 3, 32]} />
          <meshStandardMaterial
            color={zone === "abyss" ? "#06B6D4" : "#2DD4BF"}
            emissive={zone === "abyss" ? "#06B6D4" : "#2DD4BF"}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <Html center distanceFactor={30} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center gap-0.5"
          style={{ cursor: unlocked ? "pointer" : "default" }}
        >
          <span style={{ fontSize: 28 }}>{unlocked ? city.emoji : "🔒"}</span>
          <div
            className="px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: unlocked ? "rgba(6,182,212,0.85)" : "rgba(20,40,60,0.7)",
              border: unlocked ? "1px solid rgba(45,212,191,0.5)" : "1px solid rgba(60,80,100,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: unlocked ? "#fff" : "#667" }}>
              {city.name[lang]}
            </p>
          </div>
          {/* Depth label */}
          <span
            className="text-[8px] font-medium tracking-wider uppercase"
            style={{ color: zone === "abyss" ? "#06B6D4" : zone === "mid" ? "#5EADB0" : "#7EDCD0" }}
          >
            {DEPTH_LABELS[zone]}
          </span>
          {!unlocked && city.requiredXP > 0 && (
            <span className="text-[9px] font-medium" style={{ color: "#c8a050" }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Bubbles (instanced) ─────────────────────────────────────────
function Bubbles({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 120,
        speed: 0.4 + Math.random() * 1.2,
        offset: Math.random() * 100,
        scale: 0.08 + Math.random() * 0.2,
        wobble: 0.3 + Math.random() * 1.2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    bubbles.forEach((b, i) => {
      const y = ((t * b.speed + b.offset) % 40) - 18;
      dummy.position.set(
        b.x + Math.sin(t * b.wobble + b.offset) * 2,
        y,
        b.z + Math.cos(t * b.wobble * 0.7 + b.offset) * 2,
      );
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}

// ─── Fish School (instanced) ─────────────────────────────────────
function FishSchool({
  anchor,
  color,
  fishCount,
}: {
  anchor: [number, number, number];
  color: string;
  fishCount: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fishData = useMemo(
    () =>
      Array.from({ length: fishCount }, (_, i) => ({
        offset: (i / fishCount) * Math.PI * 2,
        radius: 3 + Math.random() * 4,
        yOff: (Math.random() - 0.5) * 3,
        speed: 0.3 + Math.random() * 0.2,
        scale: 0.15 + Math.random() * 0.15,
      })),
    [fishCount],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Rotate the whole group slowly
    groupRef.current.rotation.y = t * 0.08;

    fishData.forEach((f, i) => {
      const angle = t * f.speed + f.offset;
      dummy.position.set(
        Math.cos(angle) * f.radius,
        f.yOff + Math.sin(t * 0.5 + f.offset) * 0.8,
        Math.sin(angle) * f.radius,
      );
      // Orient fish in swim direction
      dummy.rotation.y = -angle + Math.PI / 2;
      dummy.scale.set(f.scale * 2, f.scale, f.scale); // elongated
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={anchor}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, fishCount]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

// ─── Jellyfish ───────────────────────────────────────────────────
function Jellyfish({ startPos, color }: { startPos: [number, number, number]; color: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const offset = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Slow drift up, reset
    const y = ((t * 0.15 + offset) % 25) - 16;
    groupRef.current.position.set(
      startPos[0] + Math.sin(t * 0.2 + offset) * 3,
      y,
      startPos[2] + Math.cos(t * 0.15 + offset) * 3,
    );
    // Pulse emissive
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.5 + Math.sin(t * 1.5 + offset) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Bell / dome */}
      <mesh>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Tentacles */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.4, -1, Math.sin(angle) * 0.4]}
          >
            <cylinderGeometry args={[0.03, 0.02, 2, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.4}
              transparent
              opacity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Light Rays (shallow zone) ───────────────────────────────────
function LightRays() {
  return (
    <>
      {[
        { pos: [-10, 8, -12] as [number, number, number], rotZ: 0.15 },
        { pos: [8, 10, -8] as [number, number, number], rotZ: -0.1 },
        { pos: [20, 7, -18] as [number, number, number], rotZ: 0.08 },
      ].map((ray, i) => (
        <mesh key={i} position={ray.pos} rotation={[0, 0, ray.rotZ]}>
          <coneGeometry args={[4, 20, 8, 1, true]} />
          <meshStandardMaterial
            color="#A7D8F0"
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Sea Floor ───────────────────────────────────────────────────
function SeaFloor() {
  return (
    <group>
      {/* Main floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -17, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#091520" roughness={1} />
      </mesh>
      {/* Rocky bumps on the floor */}
      {[
        [-25, -16.5, 10],
        [20, -16, -5],
        [35, -16.5, 25],
        [-10, -16.2, 30],
        [0, -16, -20],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[3 + i * 0.5, 6, 5]} />
          <meshStandardMaterial color="#0D1B2A" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Underwater Cliffs (between depth zones) ─────────────────────
function UnderwaterCliffs() {
  return (
    <>
      {/* Shallow → Mid cliff wall */}
      <mesh position={[-5, -5, -5]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[35, 6, 2]} />
        <meshStandardMaterial color="#1A2D42" roughness={0.9} />
      </mesh>
      <mesh position={[20, -5.5, 2]} rotation={[0, -0.5, 0.05]}>
        <boxGeometry args={[20, 5, 2.5]} />
        <meshStandardMaterial color="#15263B" roughness={0.95} />
      </mesh>

      {/* Mid → Abyss cliff wall */}
      <mesh position={[10, -11, 12]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[40, 5, 2]} />
        <meshStandardMaterial color="#0E1C2E" roughness={0.95} />
      </mesh>
      <mesh position={[-15, -11.5, 18]} rotation={[0, -0.4, 0.03]}>
        <boxGeometry args={[25, 6, 2.5]} />
        <meshStandardMaterial color="#0B1624" roughness={1} />
      </mesh>
    </>
  );
}

// ─── Landmarks ───────────────────────────────────────────────────
function Shipwreck({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Hull — tilted box */}
      <mesh position={[4, 0.5, 0]} rotation={[0, 0.3, 0.25]}>
        <boxGeometry args={[6, 2.5, 2.5]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.9} />
      </mesh>
      {/* Mast */}
      <mesh position={[4, 3.5, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.12, 0.15, 5, 6]} />
        <meshStandardMaterial color="#4A3012" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SubmarineLandmark({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Sub body */}
      <mesh position={[4, 0.8, 2]} rotation={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 5, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Dome */}
      <mesh position={[4, 1.8, 2]}>
        <sphereGeometry args={[0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AbyssCrack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[3, -0.5, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[12, 0.4, 1.2]} />
        <meshStandardMaterial color="#020408" roughness={1} />
      </mesh>
      <mesh position={[5, -0.3, 1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[6, 0.3, 0.8]} />
        <meshStandardMaterial color="#030610" roughness={1} />
      </mesh>
    </group>
  );
}

function TreasureChest({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[3, 0.5, 2]}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial
          color="#B8860B"
          emissive="#DAA520"
          emissiveIntensity={0.6}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Lid */}
      <mesh position={[3, 1.1, 2]}>
        <boxGeometry args={[1.3, 0.3, 0.9]} />
        <meshStandardMaterial
          color="#996515"
          emissive="#DAA520"
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────
function UnderwaterScene({
  onSelectCity,
  lang,
  totalPoints,
  isMobile,
}: {
  onSelectCity: (city: City) => void;
  lang: Language;
  totalPoints: number;
  isMobile: boolean;
}) {
  const bubbleCount = isMobile ? 30 : 60;
  const fishSchools = isMobile ? 1 : 3;
  const showJellyfish = !isMobile;

  return (
    <>
      {/* Depth fog */}
      <fog attach="fog" args={["#061a2e", 15, 80]} />

      {/* Lighting */}
      <ambientLight intensity={0.25} color="#4A90B8" />
      <directionalLight position={[5, 35, -10]} intensity={0.7} color="#7EC8E3" />
      <directionalLight position={[-15, 20, 10]} intensity={0.25} color="#2A6090" />
      {/* Faint bottom light for abyss glow */}
      <pointLight position={[0, -14, 15]} intensity={0.3} color="#06B6D4" distance={30} decay={2} />

      {/* Sea floor */}
      <SeaFloor />

      {/* Underwater cliffs */}
      <UnderwaterCliffs />

      {/* Light rays from above (shallow zone only) */}
      <LightRays />

      {/* Coral platforms + markers + landmarks */}
      {UNDERWATER_CITIES.map((city, i) => {
        const pos = getCityPos(city);
        const unlocked = totalPoints >= city.requiredXP;
        return (
          <React.Fragment key={city.id}>
            <CoralPlatform position={pos} index={i} isMobile={isMobile} />
            <CityMarker
              city={city}
              lang={lang}
              unlocked={unlocked}
              onSelect={onSelectCity}
              position={pos}
            />
            {/* Per-city landmarks */}
            {city.id === "shipwreck-cove" && <Shipwreck position={pos} />}
            {city.id === "submarine-base" && <SubmarineLandmark position={pos} />}
            {city.id === "abyss-zone" && <AbyssCrack position={pos} />}
            {city.id === "treasure-vault" && <TreasureChest position={pos} />}
          </React.Fragment>
        );
      })}

      {/* Bubbles */}
      <Bubbles count={bubbleCount} />

      {/* Fish schools */}
      {fishSchools >= 1 && (
        <FishSchool anchor={[-12, -3, -8]} color="#C0C0C0" fishCount={10} />
      )}
      {fishSchools >= 2 && (
        <FishSchool anchor={[18, -7, 8]} color="#3B82F6" fishCount={8} />
      )}
      {fishSchools >= 3 && (
        <FishSchool anchor={[-5, -10, 22]} color="#F97316" fishCount={12} />
      )}

      {/* Jellyfish (desktop only) */}
      {showJellyfish && (
        <>
          <Jellyfish startPos={[-18, -10, 5]} color="#E879F9" />
          <Jellyfish startPos={[12, -6, -12]} color="#67E8F9" />
          <Jellyfish startPos={[5, -12, 25]} color="#A78BFA" />
        </>
      )}

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
        minDistance={15}
        maxDistance={100}
      />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────
export function UnderwaterMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);

  return (
    <div className="w-full h-full">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 20, 55], fov: 50 }}
        style={{
          background: "linear-gradient(180deg, #1A5276 0%, #0E3D5C 30%, #0A2A4A 60%, #061220 100%)",
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />
        <UnderwaterScene
          onSelectCity={onSelectCity}
          lang={lang}
          totalPoints={totalPoints}
          isMobile={IS_MOBILE}
        />
      </Canvas>
    </div>
  );
}
