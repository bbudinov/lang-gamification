"use client";

import { useEffect, useRef, useState } from "react";

interface ProfessorGlobeProps {
  size?: number;
  speaking?: boolean;
  emotion?: "idle" | "happy" | "thinking" | "surprised" | "talking";
  glowColor?: "blue" | "gold";
  /** When true, full-body Professor appears as overlay when speaking */
  expandOnSpeak?: boolean;
}

const EMOTION_IMAGES: Record<string, string> = {
  idle: "/images/globe/idle.png",
  happy: "/images/globe/happy.png",
  thinking: "/images/globe/thinking.png",
  surprised: "/images/globe/surprised.png",
  talking: "/images/globe/talking.png",
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

export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
  expandOnSpeak = false,
}: ProfessorGlobeProps) {
  useEffect(preloadImages, []);

  const imageSrc = EMOTION_IMAGES[emotion] || EMOTION_IMAGES.idle;

  const circleRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });

  useEffect(() => {
    if (!expandOnSpeak) return;
    if (speaking) {
      // Calculate circle position for transform-origin
      if (circleRef.current) {
        const rect = circleRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        setOrigin({ x: `${cx}px`, y: `${cy}px` });
      }
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

        {/* Circle image — cropped to face */}
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

      {/* Full-body overlay — splash from circle */}
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
              background: "radial-gradient(ellipse at center, rgba(10,22,40,0.9) 0%, rgba(10,22,40,0.5) 60%, transparent 100%)",
            }}
          />

          {/* Professor figure */}
          <div className="relative flex flex-col items-center" style={{ maxHeight: "85vh" }}>
            {/* Glow behind */}
            <div
              className="absolute inset-0 -inset-x-16"
              style={{
                background: `radial-gradient(ellipse at center 40%, ${glow}25 0%, ${glow}10 40%, transparent 70%)`,
                animation: "prof-glow-pulse 2s ease-in-out infinite",
              }}
            />

            {/* The image — full figure, fade at bottom */}
            <div className="relative" style={{ maxHeight: "80vh" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Professor Globe speaking"
                className="h-full w-auto object-contain max-h-[75vh]"
                style={{
                  filter: `drop-shadow(0 0 24px ${glow}50) drop-shadow(0 0 80px ${glow}20)`,
                  maskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
                }}
                draggable={false}
              />

              {/* Sound waves */}
              {speaking && !animatingOut && (
                <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 flex gap-1.5 items-end">
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
      `}</style>
    </>
  );
}
