"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Eagerly start loading the 3D component + Three.js bundle on page load
const loader3D = () => import("./ProfessorGlobe3D");
if (typeof window !== "undefined") {
  loader3D(); // prefetch immediately
}
const ProfessorGlobe3D = dynamic(
  () => loader3D().then((m) => ({ default: m.ProfessorGlobe3D })),
  { ssr: false }
);

// Preload GLB models on page load
if (typeof window !== "undefined") {
  ["/models/professor-globe.glb", "/models/animations.glb"].forEach((url) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = url;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  });
}

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

  // Mount Canvas immediately when expandOnSpeak is enabled (pre-load)
  const overlayVisible = expandOnSpeak && speaking;

  const imageSrc = EMOTION_IMAGES[emotion] || EMOTION_IMAGES.idle;

  const glow = glowColor === "gold" ? "#fbbf24" : "#38bdf8";
  const glowSize = size * 0.15;
  const glowSizeLg = size * 0.3;

  return (
    <>
      {/* Small circle avatar */}
      <div
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

        {/* Circle avatar — static headshot */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 ${glowSize}px ${glow}50, 0 0 ${glowSizeLg}px ${glow}25`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/globe/professor-head.png"
            alt="Professor Globe"
            className="w-full h-full object-cover"
            style={{ transform: "scale(0.85)", objectPosition: "center 30%" }}
            draggable={false}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "inset 0 0 12px 6px #0a1628" }}
          />
        </div>
      </div>

      {/* Full-body overlay — always mounted once triggered, toggled via CSS */}
      {expandOnSpeak && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none"
          style={{
            opacity: overlayVisible ? 1 : 0,
            transition: overlayVisible
              ? "opacity 0.4s ease, visibility 0s 0s"
              : "opacity 0.4s ease, visibility 0s 0.4s",
            visibility: overlayVisible ? "visible" : "hidden",
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
          <HologramParticles count={25} />
          <ProfessorGlobe3D speaking={speaking} emotion={emotion} />
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
