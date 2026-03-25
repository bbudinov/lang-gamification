"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { TOUCH, MOUSE } from "three";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

// ─── Mobile detection (static) ──────────────────────────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0 || window.innerWidth < 800);

// ─── Ocean world topic ids ──────────────────────────────────────
const OCEAN_TOPIC_IDS = new Set(
  WORLDS.find((w) => w.id === "ocean")?.topicIds ?? []
);

// ─── Filter ocean cities ────────────────────────────────────────
const OCEAN_CITIES = CITIES.filter((c) => OCEAN_TOPIC_IDS.has(c.topicId));

// ─── Convert percentage-based pos to 3D coords ─────────────────
function cityTo3D(city: City): [number, number, number] {
  const x = (city.pos.x - 50) * 1.5;
  const z = (city.pos.y - 50) * 1.5;
  return [x, 0.3, z];
}

// ─── Animated water plane ───────────────────────────────────────
function WaterPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry>(null);

  useFrame(({ clock }) => {
    if (!geoRef.current) return;
    const t = clock.getElapsedTime();
    const pos = geoRef.current.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave = Math.sin(x * 0.08 + t * 0.6) * 0.3 + Math.sin(y * 0.06 + t * 0.4) * 0.2;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry ref={geoRef} args={[200, 200, IS_MOBILE ? 32 : 64, IS_MOBILE ? 32 : 64]} />
      <meshStandardMaterial
        color="#1a7ab5"
        transparent
        opacity={0.85}
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Deep water background ──────────────────────────────────────
function DeepWater() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#0a4a6e" roughness={1} />
    </mesh>
  );
}

// ─── Island platform for each city ──────────────────────────────
function IslandPlatform({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Sand island base */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[3.5, 4, 0.4, IS_MOBILE ? 12 : 24]} />
        <meshStandardMaterial color="#d4b87a" roughness={0.9} />
      </mesh>
      {/* Beach ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[2.8, 3.6, IS_MOBILE ? 12 : 24]} />
        <meshStandardMaterial color="#e8d5a8" roughness={1} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── Water routes between cities ────────────────────────────────
function WaterRoutes({ unlockedIds }: { unlockedIds: Set<string> }) {
  const routes = useMemo(() => {
    const result: THREE.Mesh[] = [];
    for (const city of OCEAN_CITIES) {
      for (const targetId of city.connectsTo) {
        const target = OCEAN_CITIES.find((c) => c.id === targetId);
        if (!target) continue;
        const unlocked = unlockedIds.has(city.id) && unlockedIds.has(target.id);
        const [x1, , z1] = cityTo3D(city);
        const [x2, , z2] = cityTo3D(target);
        const mx = (x1 + x2) / 2 + (z2 - z1) * 0.05;
        const mz = (z1 + z2) / 2 - (x2 - x1) * 0.05;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(x1, 0.15, z1),
          new THREE.Vector3(mx, 0.15, mz),
          new THREE.Vector3(x2, 0.15, z2)
        );
        const geo = new THREE.TubeGeometry(curve, 16, unlocked ? 0.4 : 0.25, 6, false);
        const mat = new THREE.MeshStandardMaterial({
          color: unlocked ? "#5ac8f0" : "#2a6a8a",
          transparent: true,
          opacity: unlocked ? 0.7 : 0.3,
          roughness: 0.5,
        });
        result.push(new THREE.Mesh(geo, mat));
      }
    }
    return result;
  }, [unlockedIds]);

  return (
    <group>
      {routes.map((m, i) => (
        <primitive key={`wr${i}`} object={m} />
      ))}
    </group>
  );
}

// ─── City marker (clickable node) ───────────────────────────────
function OceanCityMarker({
  city,
  lang,
  unlocked,
  completedLevels,
  isNext,
  onSelect,
}: {
  city: City;
  lang: Language;
  unlocked: boolean;
  completedLevels: number;
  isNext: boolean;
  onSelect: (city: City) => void;
}) {
  const [x, , z] = cityTo3D(city);
  const size = isNext ? 110 : unlocked ? 96 : 76;

  return (
    <group position={[x, 0.5, z]}>
      {/* Glow ring for unlocked cities */}
      {unlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <ringGeometry args={[3.5, 5, 32]} />
          <meshBasicMaterial
            color={isNext ? "#00d4ff" : "#0ea5e9"}
            transparent
            opacity={isNext ? 0.45 : 0.2}
          />
        </mesh>
      )}

      <Html center distanceFactor={50} style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => unlocked && onSelect(city)}
          className="flex flex-col items-center transition-all duration-200 active:scale-90"
          style={{ transform: "translateY(-22px)" }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: unlocked
                ? "radial-gradient(circle at 35% 35%, #e0f4ff, #a0d8f0)"
                : "radial-gradient(circle at 35% 35%, #4a5a68, #2a3a48)",
              border: `${unlocked ? 5 : 3}px solid ${unlocked ? "#0ea5e9" : "#445566"}`,
              boxShadow: unlocked
                ? `0 4px 16px rgba(0,0,0,0.5), 0 0 ${isNext ? 20 : 8}px #0ea5e9${isNext ? "80" : "35"}`
                : "0 3px 8px rgba(0,0,0,0.4)",
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: isNext ? 44 : 36 }}>{city.emoji}</span>
            ) : (
              <span style={{ fontSize: 28, opacity: 0.4 }}>🔒</span>
            )}
          </div>
          {unlocked && (
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ fontSize: 12, opacity: i < completedLevels ? 1 : 0.2 }}
                >
                  ⭐
                </span>
              ))}
            </div>
          )}
          <div
            className="mt-1 px-4 py-1.5 rounded-xl"
            style={{
              background: unlocked ? "rgba(5,30,50,0.92)" : "rgba(20,30,40,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: unlocked ? "#fff" : "#667788",
                whiteSpace: "nowrap",
                letterSpacing: 0.5,
              }}
            >
              {city.building[lang]}
            </p>
          </div>
          <p
            style={{
              fontSize: 11,
              color: unlocked ? "#60c0e0" : "#556",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {city.name[lang]}
          </p>
          {!unlocked && city.requiredXP > 0 && (
            <span style={{ fontSize: 10, color: "#8899aa", fontWeight: 700 }}>
              ⭐ {city.requiredXP}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

// ─── Camera controls ────────────────────────────────────────────
function OceanCameraControls() {
  const controlsRef = useRef<any>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useFrame(() => {
    if (!controlsRef.current) return;
    const t = controlsRef.current.target;
    const dist = controlsRef.current.object.position.distanceTo(t);
    const f = THREE.MathUtils.clamp(dist / 110, 0, 1);
    const maxX = THREE.MathUtils.lerp(60, 5, f);
    const maxZ = THREE.MathUtils.lerp(50, 5, f);
    t.x = THREE.MathUtils.clamp(t.x, -maxX, maxX);
    t.z = THREE.MathUtils.clamp(t.z, -maxZ, maxZ);
    t.y = 0;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enablePan={true}
      enableZoom={true}
      zoomToCursor={!isTouchDevice}
      screenSpacePanning={true}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={20}
      maxDistance={110}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 3.2}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_ROTATE,
      }}
    />
  );
}

// ─── Scene ready detector ───────────────────────────────────────
function SceneReady({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    }
  });
  return null;
}

// ─── Main component ─────────────────────────────────────────────

interface OceanMapProps {
  onSelectCity: (city: City) => void;
}

export function OceanMap({ onSelectCity }: OceanMapProps) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;
  const [dpr, setDpr] = useState(IS_MOBILE ? 1 : 1.5);
  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);

  const unlockedIds = useMemo(
    () => new Set(OCEAN_CITIES.filter((c) => totalPoints >= c.requiredXP).map((c) => c.id)),
    [totalPoints]
  );

  const nextCityId = useMemo(() => {
    const lastUnlocked = [...OCEAN_CITIES]
      .reverse()
      .find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = OCEAN_CITIES.find((c) => !unlockedIds.has(c.id));
    return lastUnlocked?.id || firstLocked?.id;
  }, [unlockedIds, getTopicCompletedLevels]);

  useEffect(() => {
    if (sceneReady) {
      const t1 = setTimeout(() => setOverlayVisible(false), 100);
      const t2 = setTimeout(() => setOverlayHidden(true), 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [sceneReady]);

  return (
    <div className="w-full h-full relative z-0" style={{ touchAction: "none" }}>
      <Canvas
        dpr={dpr}
        shadows={false}
        camera={{ position: [0, 60, 45], fov: 45 }}
        style={{ touchAction: "none" }}
        gl={
          IS_MOBILE
            ? { antialias: false, powerPreference: "high-performance" }
            : undefined
        }
      >
        <PerformanceMonitor
          onDecline={() => setDpr(IS_MOBILE ? 0.75 : 1)}
          onIncline={() => setDpr(IS_MOBILE ? 1 : 1.5)}
        />

        {/* Ocean sky — simple background color */}
        <color attach="background" args={["#1a4a7a"]} />
        {!IS_MOBILE && <fog attach="fog" args={["#1a4a7a", 120, 220]} />}

        {/* Lighting — warm tropical sun */}
        <ambientLight intensity={IS_MOBILE ? 0.6 : 0.5} color="#d0e8ff" />
        <directionalLight
          position={[40, 60, 25]}
          intensity={1.4}
          color="#fff8e0"
        />
        {!IS_MOBILE && (
          <directionalLight
            position={[-30, 20, -40]}
            intensity={0.2}
            color="#4080c0"
          />
        )}
        <hemisphereLight intensity={0.35} color="#87ceeb" groundColor="#1a5a8a" />

        <Suspense fallback={null}>
          <DeepWater />
          <WaterPlane />
          <WaterRoutes unlockedIds={unlockedIds} />

          {/* Island platforms */}
          {OCEAN_CITIES.map((city) => (
            <IslandPlatform key={`island-${city.id}`} position={cityTo3D(city)} />
          ))}

          {/* City markers */}
          {OCEAN_CITIES.map((city) => (
            <OceanCityMarker
              key={city.id}
              city={city}
              lang={lang}
              unlocked={unlockedIds.has(city.id)}
              completedLevels={getTopicCompletedLevels(city.topicId)}
              isNext={city.id === nextCityId}
              onSelect={onSelectCity}
            />
          ))}

          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        <OceanCameraControls />
      </Canvas>

      {/* Loading overlay */}
      {!overlayHidden && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0a2a4a] via-[#1a4a7a] to-[#0a2a4a] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-700"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-[spin_8s_linear_infinite]">
                🌊
              </div>
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wider">
              Setting sail...
            </p>
            <div className="flex gap-1.5 justify-center mt-3">
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
