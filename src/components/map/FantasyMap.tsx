"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { CITIES, type City } from "@/data/cities";
import { WORLDS } from "@/data/worlds";

const WORLD_ID = "fantasy";
const BG_COLOR = "#1a0a2e";

function getCities() {
  const world = WORLDS.find((w) => w.id === WORLD_ID);
  if (!world) return [];
  return CITIES.filter((c) => world.topicIds.includes(c.topicId));
}

function CityNode({ city, index, total, onSelect }: { city: City; index: number; total: number; onSelect: (c: City) => void }) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = 20;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return (
    <group position={[x, 0, z]}>
      <mesh>
        <cylinderGeometry args={[2.5, 2.5, 0.5, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <Html center distanceFactor={40} style={{ pointerEvents: "auto" }}>
        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => onSelect(city)}
        >
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
            <span className="text-2xl">{city.emoji}</span>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <p className="text-white text-[11px] font-semibold whitespace-nowrap">{city.name.en}</p>
          </div>
        </div>
      </Html>
    </group>
  );
}

interface MapProps {
  onSelectCity: (city: City) => void;
}

export function FantasyMap({ onSelectCity }: MapProps) {
  const cities = useMemo(getCities, []);

  return (
    <div className="absolute inset-0" style={{ background: BG_COLOR }}>
      <Canvas camera={{ position: [0, 30, 35], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={BG_COLOR} />
        </mesh>

        {cities.map((city, i) => (
          <CityNode key={city.id} city={city} index={i} total={cities.length} onSelect={onSelectCity} />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          minDistance={15}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.5}
        />
      </Canvas>
    </div>
  );
}
