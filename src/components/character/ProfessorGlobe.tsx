"use client";

import { useState, useEffect } from "react";

interface ProfessorGlobeProps {
  size?: number;
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised";
  glowColor?: "blue" | "gold";
}

const IMAGES = {
  idle: "/images/globe/idle.jpg",
  happy: "/images/globe/happy.jpg",
  thinking: "/images/globe/thinking.jpg",
  surprised: "/images/globe/surprised.jpg",
  talking: "/images/globe/talking.jpg",
};

// Preload all images on first render
let preloaded = false;
function preloadImages() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  Object.values(IMAGES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
}: ProfessorGlobeProps) {
  const [mouthFrame, setMouthFrame] = useState(false);

  useEffect(preloadImages, []);

  // Alternate between talking and current emotion image for mouth-sync effect
  useEffect(() => {
    if (!speaking) {
      setMouthFrame(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthFrame((f) => !f);
    }, 150 + Math.random() * 100);
    return () => clearInterval(interval);
  }, [speaking]);

  const currentImage = speaking
    ? mouthFrame
      ? IMAGES[emotion]
      : IMAGES.talking
    : IMAGES[emotion];

  const glow = glowColor === "gold" ? "#fbbf24" : "#38bdf8";
  const glowSize = size * 0.2;
  const glowSizeLg = size * 0.4;

  return (
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

      {/* Image container */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{
          boxShadow: `0 0 ${glowSize}px ${glow}50, 0 0 ${glowSizeLg}px ${glow}25`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="Professor Globe"
          width={size}
          height={size}
          className="w-full h-full object-cover transition-opacity duration-200"
          draggable={false}
        />

        {/* Edge fade to blend dark image bg with app bg */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: "inset 0 0 12px 6px #0a1628",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes globe-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        @keyframes globe-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.45); }
        }
      `}</style>
    </div>
  );
}
