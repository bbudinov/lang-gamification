"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ProfessorGlobe3D = dynamic(
  () => import("./ProfessorGlobe3D").then((m) => ({ default: m.ProfessorGlobe3D })),
  { ssr: false }
);

interface ProfessorGlobeProps {
  size?: number;
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
  glowColor?: "blue" | "gold";
  expandOnSpeak?: boolean;
}

const EMOTION_IMAGES: Record<string, string> = {
  idle: "/images/globe/idle-nobg.png",
  happy: "/images/globe/happy-nobg.png",
  thinking: "/images/globe/thinking-nobg.png",
  surprised: "/images/globe/surprised-nobg.png",
  talking: "/images/globe/talking-nobg.png",
};

let preloaded = false;
function preloadImages() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  Object.values(EMOTION_IMAGES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function HologramParticles({ count = 20 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 1 + Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.5,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: "-5%",
            width: p.size,
            height: p.size,
            backgroundColor: "#38bdf8",
            opacity: p.opacity,
            animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
  expandOnSpeak = false,
}: ProfessorGlobeProps) {
  useEffect(preloadImages, []);

  const circleRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });

  const imageSrc = EMOTION_IMAGES[emotion] || EMOTION_IMAGES.idle;

  // Keep origin always fresh so splash starts/ends at circle position
  useEffect(() => {
    if (!circleRef.current) return;
    const update = () => {
      const rect = circleRef.current!.getBoundingClientRect();
      setOrigin({ x: `${rect.left + rect.width / 2}px`, y: `${rect.top + rect.height / 2}px` });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!expandOnSpeak) return;
    if (speaking) {
      setAnimatingOut(false);
      setShowOverlay(true);
    } else if (showOverlay) {
      setAnimatingOut(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setAnimatingOut(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [speaking, expandOnSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  const glow = glowColor === "gold" ? "#fbbf24" : "#38bdf8";
  const glowSize = size * 0.15;
  const glowSizeLg = size * 0.3;

  return (
    <>
      {/* Small circle avatar */}
      <div
        ref={circleRef}
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${glow}30 0%, ${glow}10 50%, transparent 70%)`,
            transform: "scale(1.3)",
            animation: speaking ? "globe-pulse 1.5s ease-in-out infinite" : "globe-breathe 4s ease-in-out infinite",
          }}
        />

        {/* Circle image — stable, no swapping */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 ${glowSize}px ${glow}50, 0 0 ${glowSizeLg}px ${glow}25`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Professor Globe"
            className="w-full h-auto object-cover"
            style={{ objectPosition: "top center", transform: "scale(1.1)" }}
            draggable={false}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "inset 0 0 12px 6px #0a1628" }}
          />
        </div>
      </div>

      {/* Full-body overlay */}
      {expandOnSpeak && showOverlay && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
          style={{
            transformOrigin: `${origin.x} ${origin.y}`,
            animation: animatingOut
              ? "prof-splash-out 0.4s ease-in forwards"
              : "prof-splash-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          {/* Dark backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.6) 50%, rgba(10,22,40,0.3) 100%)",
            }}
          />

          {/* 3D Professor figure */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Glow behind */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at center 40%, ${glow}20 0%, ${glow}08 40%, transparent 70%)`,
                animation: "prof-glow-pulse 2s ease-in-out infinite",
              }}
            />

            <HologramParticles count={25} />

            <ProfessorGlobe3D
              speaking={speaking}
              emotion={emotion}
              className="w-full h-full"
              style={{ maxHeight: "85vh" }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes globe-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        @keyframes globe-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.45); }
        }
        @keyframes prof-splash-in {
          0% { opacity: 0; transform: scale(0.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes prof-splash-out {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.1); }
        }
        @keyframes prof-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes prof-sound-wave {
          from { transform: scaleY(0.4); opacity: 0.3; }
          to { transform: scaleY(1.3); opacity: 0.9; }
        }
        @keyframes prof-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
        @keyframes prof-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scan-line {
          0% { top: -5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 105%; opacity: 0; }
        }
        @keyframes particle-float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.4; }
          85% { opacity: 0.4; }
          100% { transform: translateY(-400px) translateX(20px); opacity: 0; }
        }
      `}</style>
    </>
  );
}
