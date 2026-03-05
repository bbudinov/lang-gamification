"use client";

import { useEffect, useState } from "react";

interface ProfessorGlobeProps {
  size?: number;
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised";
  glowColor?: "blue" | "gold";
  /** When true, full-body Professor appears as overlay when speaking */
  expandOnSpeak?: boolean;
}

const IMAGE_SRC = "/images/globe/idle.png";

let preloaded = false;
function preloadImage() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  const img = new Image();
  img.src = IMAGE_SRC;
}

export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
  expandOnSpeak = false,
}: ProfessorGlobeProps) {
  useEffect(preloadImage, []);

  // Track the overlay visibility with delay for exit animation
  const [showOverlay, setShowOverlay] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    if (!expandOnSpeak) return;
    if (speaking) {
      setAnimatingOut(false);
      setShowOverlay(true);
    } else if (showOverlay) {
      // Animate out then hide
      setAnimatingOut(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setAnimatingOut(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [speaking, expandOnSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  const glow = glowColor === "gold" ? "#fbbf24" : "#38bdf8";
  const glowSize = size * 0.15;
  const glowSizeLg = size * 0.3;

  return (
    <>
      {/* Small circle avatar — always visible */}
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

        {/* Circle image — cropped to show face */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 ${glowSize}px ${glow}50, 0 0 ${glowSizeLg}px ${glow}25`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGE_SRC}
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

      {/* Full-body overlay — appears when speaking */}
      {expandOnSpeak && showOverlay && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none flex items-end justify-center"
          style={{
            animation: animatingOut
              ? "prof-overlay-out 0.5s ease-in forwards"
              : "prof-overlay-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          {/* Dark vignette behind professor */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center bottom, rgba(10,22,40,0.85) 0%, rgba(10,22,40,0.4) 50%, transparent 80%)",
            }}
          />

          {/* Full body professor figure */}
          <div className="relative flex flex-col items-center mb-0" style={{ maxHeight: "85vh" }}>
            {/* Glow behind figure */}
            <div
              className="absolute inset-0 -inset-x-12"
              style={{
                background: `radial-gradient(ellipse at center 40%, ${glow}25 0%, ${glow}10 40%, transparent 70%)`,
                animation: "prof-glow-pulse 2s ease-in-out infinite",
              }}
            />

            {/* The image — no circle, full figure with transparent fade at bottom */}
            <div className="relative" style={{ maxHeight: "80vh", width: "auto" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMAGE_SRC}
                alt="Professor Globe speaking"
                className="h-full w-auto object-contain max-h-[80vh]"
                style={{
                  filter: `drop-shadow(0 0 20px ${glow}40) drop-shadow(0 0 60px ${glow}20)`,
                  maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                }}
                draggable={false}
              />

              {/* Sound waves at bottom */}
              {speaking && !animatingOut && (
                <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex gap-1.5 items-end">
                  {[10, 18, 24, 18, 10].map((h, i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 4,
                        height: h,
                        backgroundColor: glow,
                        animation: `prof-sound-wave 0.4s ease-in-out ${i * 0.08}s infinite alternate`,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
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
        @keyframes prof-overlay-in {
          from { opacity: 0; transform: translateY(40%) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes prof-overlay-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(20%) scale(0.9); }
        }
        @keyframes prof-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes prof-sound-wave {
          from { transform: scaleY(0.4); opacity: 0.3; }
          to { transform: scaleY(1.3); opacity: 0.9; }
        }
      `}</style>
    </>
  );
}
