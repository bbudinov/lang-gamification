"use client";

import React, { useRef, useState, useCallback } from "react";
import { useGesture } from "@use-gesture/react";
import { useProgressStore } from "@/stores/progressStore";
import { CITIES, type City } from "@/data/cities";
import type { Language } from "@/types";

// ─── Node colors by terrain ─────────────────────────────────────

const RING: Record<City["terrain"], string> = {
  grass: "#22c55e",
  sand: "#f59e0b",
  coast: "#06b6d4",
  mountain: "#94a3b8",
  urban: "#818cf8",
};

// SVG viewBox dimensions (abstract coords — the SVG scales to fill world)
const SVG_W = 200;
const SVG_H = 300;

// ─── All map decoration in one SVG ──────────────────────────────

function MapSVG({ unlockedIds }: { unlockedIds: Set<string> }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ zIndex: 1 }}
    >
      <defs>
        <filter id="waterBlur">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {/* ── Forest blobs ── */}
      <g opacity="0.35">
        <path d="M 5 60 Q 12 45 25 50 Q 35 42 40 55 Q 38 68 25 72 Q 10 70 5 60Z" fill="#2f6b3d" />
        <path d="M 0 140 Q 8 125 20 130 Q 28 120 32 135 Q 30 150 18 155 Q 5 152 0 140Z" fill="#2a6035" />
        <path d="M 8 230 Q 18 215 35 222 Q 42 214 48 228 Q 45 245 30 248 Q 12 244 8 230Z" fill="#2f6b3d" />
        <path d="M 165 120 Q 178 108 190 115 Q 198 110 200 125 Q 195 138 182 140 Q 168 135 165 120Z" fill="#2a6035" />
        <path d="M 155 240 Q 165 228 178 235 Q 185 228 188 242 Q 183 255 170 257 Q 158 252 155 240Z" fill="#2f6b3d" />
        <path d="M 80 40 Q 92 30 105 35 Q 112 27 118 40 Q 115 53 100 55 Q 85 52 80 40Z" fill="#276032" />
      </g>

      {/* ── River ── */}
      <g filter="url(#waterBlur)">
        <path
          d="M 195 10 Q 182 45 188 80 Q 195 115 184 150 Q 172 185 180 220 Q 190 255 178 290"
          fill="none" stroke="#6bb5d6" strokeWidth="5" strokeLinecap="round" opacity="0.5"
        />
        <path
          d="M 195 10 Q 182 45 188 80 Q 195 115 184 150 Q 172 185 180 220 Q 190 255 178 290"
          fill="none" stroke="#a0ddf0" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"
        />
      </g>

      {/* ── Roads ── */}
      <g>
        {CITIES.map((city) =>
          city.connectsTo.map((targetId) => {
            const target = CITIES.find((c) => c.id === targetId);
            if (!target) return null;
            const unlocked = unlockedIds.has(city.id) && unlockedIds.has(target.id);
            const x1 = city.pos.x * 2;
            const y1 = city.pos.y * 3;
            const x2 = target.pos.x * 2;
            const y2 = target.pos.y * 3;
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.08;
            const my = (y1 + y2) / 2 - (x2 - x1) * 0.08;
            const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
            return (
              <g key={`${city.id}-${targetId}`}>
                <path d={d} fill="none" stroke={unlocked ? "#7a6840" : "#4a4535"} strokeWidth={unlocked ? "3.5" : "2.5"} strokeLinecap="round" opacity={unlocked ? 0.5 : 0.2} />
                <path d={d} fill="none" stroke={unlocked ? "#b8965e" : "#6b6350"} strokeWidth={unlocked ? "2" : "1.2"} strokeDasharray={unlocked ? "none" : "5 4"} strokeLinecap="round" opacity={unlocked ? 0.7 : 0.3} />
              </g>
            );
          })
        )}
        {/* Small road branches */}
        <path d="M 90 215 L 75 225" fill="none" stroke="#b8965e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
        <path d="M 140 150 L 155 160" fill="none" stroke="#b8965e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
        <path d="M 60 125 L 48 118" fill="none" stroke="#b8965e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
        <path d="M 120 65 L 135 58" fill="none" stroke="#b8965e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
      </g>

      {/* ── Mountains ── */}
      <g opacity="0.5">
        <polygon points="85,18 95,2 105,18" fill="#5a6b55" />
        <polygon points="93,5 95,2 97,5" fill="#c8d0c0" opacity="0.5" />
        <polygon points="105,22 118,2 131,22" fill="#4f6048" />
        <polygon points="116,5 118,2 120,5" fill="#c8d0c0" opacity="0.5" />
        <polygon points="125,20 135,5 145,20" fill="#556b50" />
        <polygon points="134,7 135,5 137,7" fill="#c8d0c0" opacity="0.4" />
        <polygon points="145,22 155,7 165,22" fill="#4a6045" />
      </g>

      {/* ── Landmarks ── */}
      <g opacity="0.45">
        {/* Houses */}
        <g transform="translate(15, 180)">
          <rect x="0" y="4" width="8" height="7" fill="#8B7355" />
          <polygon points="-1,4 4,0 9,4" fill="#A0522D" />
          <rect x="3" y="7" width="2" height="4" fill="#5C4033" />
        </g>
        <g transform="translate(160, 200)">
          <rect x="0" y="4" width="8" height="7" fill="#8B7355" />
          <polygon points="-1,4 4,0 9,4" fill="#A0522D" />
          <rect x="3" y="7" width="2" height="4" fill="#5C4033" />
        </g>
        {/* Windmill */}
        <g transform="translate(45, 100)">
          <rect x="3" y="4" width="4" height="10" fill="#9B8B75" />
          <line x1="5" y1="5" x2="0" y2="0" stroke="#7B6B55" strokeWidth="1" />
          <line x1="5" y1="5" x2="10" y2="0" stroke="#7B6B55" strokeWidth="1" />
          <line x1="5" y1="5" x2="10" y2="10" stroke="#7B6B55" strokeWidth="1" />
          <line x1="5" y1="5" x2="0" y2="10" stroke="#7B6B55" strokeWidth="1" />
        </g>
        {/* Farm */}
        <g transform="translate(120, 230)">
          <rect x="0" y="3" width="12" height="6" fill="#8B7355" />
          <polygon points="-1,3 6,0 13,3" fill="#A0522D" />
          <line x1="-4" y1="9" x2="16" y2="9" stroke="#7B6B55" strokeWidth="0.6" />
          <line x1="-2" y1="7" x2="-2" y2="9" stroke="#7B6B55" strokeWidth="0.6" />
          <line x1="14" y1="7" x2="14" y2="9" stroke="#7B6B55" strokeWidth="0.6" />
        </g>
        {/* Tower */}
        <g transform="translate(150, 65)">
          <rect x="2" y="3" width="4" height="12" fill="#7B7B8B" />
          <polygon points="1,3 4,0 7,3" fill="#6B6B7B" />
          <rect x="3" y="10" width="2" height="2" fill="#5B5B6B" />
        </g>
        {/* SVG trees */}
        {[
          [28, 195], [38, 110], [72, 60], [155, 105], [10, 260], [185, 170],
          [95, 250], [140, 48], [22, 105], [175, 270],
        ].map(([x, y], i) => (
          <g key={`t${i}`} transform={`translate(${x}, ${y})`}>
            <polygon points="0,8 4,0 8,8" fill="#3a7a40" />
            <polygon points="1,11 4,3 7,11" fill="#2f6b35" />
            <rect x="3" y="11" width="2" height="3" fill="#6b5030" />
          </g>
        ))}
        {/* Wheat fields */}
        {[[55, 205], [110, 180]].map(([x, y], i) => (
          <g key={`w${i}`} transform={`translate(${x}, ${y})`} opacity="0.6">
            {[0, 3, 6, 9, 12].map((dx, j) => (
              <line key={j} x1={dx} y1="6" x2={dx} y2="0" stroke="#c8a848" strokeWidth="0.8" />
            ))}
            {[0, 3, 6, 9, 12].map((dx, j) => (
              <circle key={`h${j}`} cx={dx} cy="0" r="0.8" fill="#d4b850" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── City node ──────────────────────────────────────────────────

function CityNode({
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
  const [pressed, setPressed] = useState(false);
  const ringColor = RING[city.terrain];
  const size = isNext ? 66 : unlocked ? 58 : 50;

  return (
    <button
      onClick={() => unlocked && onSelect(city)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="absolute flex flex-col items-center transition-all duration-200"
      style={{
        left: `${city.pos.x}%`,
        top: `${city.pos.y}%`,
        transform: `translate(-50%, -50%) ${pressed && unlocked ? "scale(0.9)" : ""}`,
        zIndex: 4,
      }}
    >
      {isNext && (
        <div
          className="absolute rounded-full animate-ping"
          style={{
            width: size + 16, height: size + 16,
            top: "50%", left: "50%",
            transform: "translate(-50%, -55%)",
            border: `2px solid ${ringColor}`,
            opacity: 0.3, zIndex: -1,
          }}
        />
      )}

      {unlocked && (
        <div
          className="absolute rounded-full"
          style={{
            width: size + 24, height: size + 24,
            top: "50%", left: "50%",
            transform: "translate(-50%, -55%)",
            background: "radial-gradient(circle, rgba(74,120,60,0.5) 0%, rgba(50,90,40,0.2) 50%, transparent 70%)",
            zIndex: -1,
          }}
        />
      )}

      <div
        className="relative flex items-center justify-center"
        style={{
          width: size, height: size, borderRadius: "50%",
          background: unlocked
            ? "radial-gradient(circle at 35% 35%, #f5f0e8, #d4c8a8)"
            : "radial-gradient(circle at 35% 35%, #6a6a60, #4a4a42)",
          border: `3px solid ${unlocked ? ringColor : "#555"}`,
          boxShadow: unlocked
            ? `0 3px 10px rgba(0,0,0,0.4), 0 0 ${isNext ? 16 : 8}px ${ringColor}${isNext ? "50" : "25"}`
            : "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {unlocked ? (
          <span style={{ fontSize: isNext ? 28 : 22 }}>{city.emoji}</span>
        ) : (
          <span style={{ fontSize: 18, opacity: 0.4 }}>🔒</span>
        )}
        {unlocked && completedLevels > 0 && (
          <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={size / 2} cy={size / 2} r={size / 2 - 3}
              fill="none" stroke={ringColor} strokeWidth="3"
              strokeDasharray={`${(completedLevels / 3) * Math.PI * (size - 6)} ${Math.PI * (size - 6)}`}
              opacity="0.7"
            />
          </svg>
        )}
      </div>

      {unlocked && (
        <div className="flex gap-0.5 -mt-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="text-[10px]" style={{ opacity: i < completedLevels ? 1 : 0.2 }}>⭐</span>
          ))}
        </div>
      )}

      <div className="mt-0.5 px-2 py-0.5 rounded-md" style={{ background: unlocked ? "rgba(40,30,15,0.8)" : "rgba(40,40,40,0.5)" }}>
        <p className="text-[11px] font-bold whitespace-nowrap" style={{ color: unlocked ? "#fff" : "#666" }}>
          {city.building[lang]}
        </p>
      </div>
      <p className="text-[9px]" style={{ color: unlocked ? "#a8c090" : "#555" }}>{city.name[lang]}</p>

      {!unlocked && city.requiredXP > 0 && (
        <span className="text-[9px] font-medium" style={{ color: "#c8a050" }}>⭐ {city.requiredXP}</span>
      )}
    </button>
  );
}

// ─── Main map component ─────────────────────────────────────────

interface CityMapProps {
  onSelectCity: (city: City) => void;
}

export function CityMap({ onSelectCity }: CityMapProps) {
  const { totalPoints, getTopicCompletedLevels } = useProgressStore();
  const lang = useProgressStore((s) => s.targetLanguage) as Language;

  const unlockedIds = new Set(
    CITIES.filter((c) => totalPoints >= c.requiredXP).map((c) => c.id)
  );

  const nextCityId = (() => {
    const lastUnlocked = [...CITIES].reverse().find((c) => unlockedIds.has(c.id) && getTopicCompletedLevels(c.topicId) < 3);
    const firstLocked = CITIES.find((c) => !unlockedIds.has(c.id));
    return lastUnlocked?.id || firstLocked?.id;
  })();

  // ── Gesture state ──
  const [cam, setCam] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const viewportRef = useRef<HTMLDivElement>(null);

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, cancel }) => {
        if (pinching) return cancel();
        setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      },
      onPinch: ({ offset: [s, r] }) => {
        setCam((c) => ({ ...c, scale: s, rotate: r }));
      },
    },
    {
      drag: { from: () => [camRef.current.x, camRef.current.y] },
      pinch: {
        scaleBounds: { min: 0.5, max: 3 },
        rubberband: true,
      },
    }
  );

  // Wheel zoom (needs non-passive listener)
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setCam((c) => ({
        ...c,
        scale: Math.min(3, Math.max(0.5, c.scale - e.deltaY * 0.002)),
      }));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const resetCam = useCallback(() => {
    setCam({ x: 0, y: 0, scale: 1, rotate: 0 });
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Viewport — captures all gestures */}
      <div
        ref={viewportRef}
        className="w-full h-full"
        style={{ touchAction: "none", cursor: "grab" }}
        {...bind()}
      >
        {/* World — single transform container */}
        <div
          style={{
            width: "100%",
            height: "150vh",
            position: "relative",
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale}) rotate(${cam.rotate}deg)`,
            transformOrigin: "50% 35%",
            willChange: "transform",
          }}
        >
          {/* ── Terrain base ── */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, #2d5a1e 0%, #3a6b2a 15%, #336025 35%, #2b5520 55%, #2a5828 70%, #285020 85%, #234a1c 100%)",
              zIndex: 0,
            }}
          />
          {/* Noise texture */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity: 0.08 }}>
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
          {/* Terrain zones */}
          <div className="absolute pointer-events-none" style={{ right: 0, top: "10%", width: "18%", height: "25%", background: "radial-gradient(ellipse at right, rgba(20,90,120,0.2) 0%, transparent 70%)", zIndex: 0 }} />
          <div className="absolute pointer-events-none" style={{ left: "45%", top: "55%", width: "35%", height: "18%", background: "radial-gradient(ellipse, rgba(120,100,50,0.12) 0%, transparent 60%)", zIndex: 0 }} />

          {/* ── SVG decorations ── */}
          <MapSVG unlockedIds={unlockedIds} />

          {/* ── City nodes ── */}
          {CITIES.map((city) => (
            <CityNode
              key={city.id}
              city={city}
              lang={lang}
              unlocked={unlockedIds.has(city.id)}
              completedLevels={getTopicCompletedLevels(city.topicId)}
              isNext={city.id === nextCityId}
              onSelect={onSelectCity}
            />
          ))}

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse, transparent 55%, rgba(10,20,10,0.35) 100%)", zIndex: 5 }} />
        </div>
      </div>

      {/* Reset button */}
      {(cam.scale !== 1 || cam.rotate !== 0 || cam.x !== 0 || cam.y !== 0) && (
        <button
          onClick={resetCam}
          className="absolute top-20 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:bg-black/70 transition-colors"
          style={{ zIndex: 9999 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
      )}
    </div>
  );
}
