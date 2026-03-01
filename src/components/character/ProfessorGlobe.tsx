"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ProfessorGlobeProps {
  size?: number; // px, default 80
  speaking?: boolean; // external control: is audio playing?
  emotion?: "idle" | "happy" | "thinking" | "surprised";
  glowColor?: "blue" | "gold"; // blue = analytical/male, gold = empathetic/female
}

export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
}: ProfessorGlobeProps) {
  const [blinkState, setBlinkState] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0); // 0-1
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const scale = size / 80;
  const glow = glowColor === "gold"
    ? { base: "#f59e0b", ring: "#fbbf24", bg: "rgba(245,158,11,0.15)" }
    : { base: "#3b82f6", ring: "#60a5fa", bg: "rgba(59,130,246,0.15)" };

  // Blink every 3-6 seconds
  useEffect(() => {
    const blink = () => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // Eye tracking — follow touch/mouse position
  const handlePointerMove = useCallback((e: PointerEvent | TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let px: number, py: number;
    if ("touches" in e) {
      px = e.touches[0].clientX;
      py = e.touches[0].clientY;
    } else {
      px = e.clientX;
      py = e.clientY;
    }

    const dx = (px - cx) / window.innerWidth;
    const dy = (py - cy) / window.innerHeight;
    const maxOffset = 3 * scale;
    setEyeOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, dx * maxOffset * 4)),
      y: Math.max(-maxOffset, Math.min(maxOffset, dy * maxOffset * 4)),
    });
  }, [scale]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove as EventListener);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove as EventListener);
    };
  }, [handlePointerMove]);

  // Mouth sync via AudioContext analyser (connect to global audio element)
  useEffect(() => {
    if (!speaking) {
      setMouthOpen(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Find the global audio element used by speech.ts
    const audioEl = document.querySelector("audio[data-langworld]") as HTMLAudioElement | null;
    if (!audioEl) {
      // Fallback: simulate mouth movement
      const simulate = () => {
        setMouthOpen(0.3 + Math.random() * 0.7);
        animFrameRef.current = requestAnimationFrame(() => {
          setTimeout(simulate, 80 + Math.random() * 120);
        });
      };
      simulate();
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        setMouthOpen(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        ctx.close();
      };
    } catch {
      // Fallback simulation
      const simulate = () => {
        setMouthOpen(0.3 + Math.random() * 0.7);
        animFrameRef.current = requestAnimationFrame(() => {
          setTimeout(simulate, 80 + Math.random() * 120);
        });
      };
      simulate();
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [speaking]);

  // Emotion-based eye shape
  const eyeHeight = (() => {
    if (blinkState) return 1;
    if (emotion === "happy") return 6; // squinted
    if (emotion === "surprised") return 12;
    return 9; // normal
  })();

  const eyeRadius = emotion === "happy" ? "50%" : "40%";

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glow.bg} 0%, transparent 70%)`,
          animation: "globe-pulse 3s ease-in-out infinite",
        }}
      />

      {/* Head — energy sphere */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          background: `radial-gradient(circle at 35% 35%, ${glow.ring}, ${glow.base} 60%, #1e3a5f 100%)`,
          boxShadow: `0 0 ${12 * scale}px ${glow.base}80, inset 0 -${4 * scale}px ${8 * scale}px rgba(0,0,0,0.3)`,
          animation: "globe-bob 4s ease-in-out infinite",
        }}
      >
        {/* Antenna */}
        <div
          className="absolute"
          style={{
            width: 3 * scale,
            height: 12 * scale,
            background: `linear-gradient(to top, ${glow.ring}, ${glow.base})`,
            top: -10 * scale,
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: 2,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 6 * scale,
            height: 6 * scale,
            background: glow.ring,
            top: -15 * scale,
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow: `0 0 ${6 * scale}px ${glow.ring}`,
            animation: "globe-antenna-blink 2s ease-in-out infinite",
          }}
        />

        {/* Left eye */}
        <div
          className="absolute bg-white rounded-full transition-all duration-100"
          style={{
            width: 8 * scale,
            height: eyeHeight * scale,
            left: `calc(30% + ${eyeOffset.x}px)`,
            top: `calc(35% + ${eyeOffset.y}px)`,
            borderRadius: eyeRadius,
          }}
        >
          {/* Pupil */}
          <div
            className="absolute bg-[#0a1628] rounded-full"
            style={{
              width: 4 * scale,
              height: 4 * scale,
              left: `calc(50% + ${eyeOffset.x * 0.5}px)`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Right eye */}
        <div
          className="absolute bg-white rounded-full transition-all duration-100"
          style={{
            width: 8 * scale,
            height: eyeHeight * scale,
            right: `calc(30% - ${eyeOffset.x}px)`,
            top: `calc(35% + ${eyeOffset.y}px)`,
            borderRadius: eyeRadius,
          }}
        >
          <div
            className="absolute bg-[#0a1628] rounded-full"
            style={{
              width: 4 * scale,
              height: 4 * scale,
              left: `calc(50% + ${eyeOffset.x * 0.5}px)`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Mouth */}
        <div
          className="absolute transition-all duration-75"
          style={{
            width: (10 + mouthOpen * 4) * scale,
            height: (speaking ? 3 + mouthOpen * 8 : emotion === "happy" ? 5 : 3) * scale,
            bottom: `${22 * scale}px`,
            left: "50%",
            transform: "translateX(-50%)",
            background: speaking
              ? `radial-gradient(ellipse, #60a5fa, ${glow.base})`
              : emotion === "happy"
                ? "#60a5fa"
                : "#93c5fd",
            borderRadius: emotion === "happy" && !speaking ? "0 0 50% 50%" : "50%",
            boxShadow: speaking ? `0 0 ${4 * scale}px ${glow.ring}80` : "none",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes globe-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes globe-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-${3 * scale}px); }
        }
        @keyframes globe-antenna-blink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
