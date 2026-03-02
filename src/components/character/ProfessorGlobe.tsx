"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────
interface ProfessorGlobeProps {
  size?: number; // px, default 80
  speaking?: boolean; // external control: is audio playing?
  emotion?: "idle" | "happy" | "thinking" | "surprised";
  glowColor?: "blue" | "gold";
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  phase: number;
  orbitTilt: number;
}

interface EnergyArc {
  startAngle: number;
  speed: number;
  length: number;
  width: number;
  phase: number;
}

// ─── Color configs ──────────────────────────────────────────────
const GLOW_CONFIGS = {
  blue: {
    core: "#0e2a4d",
    mid: "#1e5a9e",
    bright: "#60a5fa",
    accent: "#93c5fd",
    particle: "#38bdf8",
    bg: "rgba(59,130,246,0.12)",
  },
  gold: {
    core: "#3d2608",
    mid: "#a16207",
    bright: "#fbbf24",
    accent: "#fde68a",
    particle: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
};

// ─── Emotion speed multipliers ──────────────────────────────────
const EMOTION_SPEED: Record<string, number> = {
  idle: 1,
  happy: 1.8,
  thinking: 0.5,
  surprised: 2.5,
};

// ─── Canvas Energy Sphere renderer ─────────────────────────────
function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.3 + Math.random() * 0.35,
    speed: 0.3 + Math.random() * 0.7,
    size: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    orbitTilt: -0.4 + Math.random() * 0.8,
  }));
}

function createArcs(count: number): EnergyArc[] {
  return Array.from({ length: count }, (_, i) => ({
    startAngle: (i / count) * Math.PI * 2,
    speed: 0.2 + Math.random() * 0.4,
    length: 1.2 + Math.random() * 1.5,
    width: 1 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawEnergySphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  emotionSpeed: number,
  speakingAmp: number,
  colors: typeof GLOW_CONFIGS.blue,
  particles: Particle[],
  arcs: EnergyArc[]
) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.32;
  const pulse = 1 + Math.sin(time * 1.5) * 0.04 + speakingAmp * 0.06;
  const r = baseR * pulse;
  const t = time * emotionSpeed;

  ctx.clearRect(0, 0, w, h);

  // ── Outer glow ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
  outerGlow.addColorStop(0, colors.bg);
  outerGlow.addColorStop(0.5, colors.bg);
  outerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, w, h);

  // Speaking pulse ring
  if (speakingAmp > 0.1) {
    const ringR = r * (1.3 + speakingAmp * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = colors.bright + Math.floor(speakingAmp * 40).toString(16).padStart(2, "0");
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // ── Core sphere gradient ──
  const coreGrad = ctx.createRadialGradient(
    cx - r * 0.2, cy - r * 0.2, r * 0.05,
    cx, cy, r
  );
  coreGrad.addColorStop(0, colors.accent + "40");
  coreGrad.addColorStop(0.3, colors.mid + "80");
  coreGrad.addColorStop(0.7, colors.core + "cc");
  coreGrad.addColorStop(1, colors.core + "00");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // ── Inner highlight ──
  const hlGrad = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.3, 0,
    cx - r * 0.15, cy - r * 0.2, r * 0.6
  );
  hlGrad.addColorStop(0, colors.accent + "30");
  hlGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  // ── Energy arcs ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const arc of arcs) {
    const a = arc.startAngle + t * arc.speed + arc.phase;
    const arcR = r * 0.85;

    ctx.beginPath();
    ctx.arc(cx, cy, arcR, a, a + arc.length);
    const gradient = ctx.createLinearGradient(
      cx + Math.cos(a) * arcR,
      cy + Math.sin(a) * arcR,
      cx + Math.cos(a + arc.length) * arcR,
      cy + Math.sin(a + arc.length) * arcR
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.3, colors.bright + "90");
    gradient.addColorStop(0.5, colors.accent + "cc");
    gradient.addColorStop(0.7, colors.bright + "90");
    gradient.addColorStop(1, "transparent");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = arc.width * (1 + speakingAmp * 0.5);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.restore();

  // ── Orbiting particles ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    const a = p.angle + t * p.speed;
    const orbR = r * p.radius * (1 + Math.sin(t * 0.5 + p.phase) * 0.15);
    const tilt = p.orbitTilt;

    // 3D-ish orbit: use tilt to compress y
    const px = cx + Math.cos(a) * orbR;
    const py = cy + Math.sin(a) * orbR * (0.6 + tilt * 0.4);

    // Skip if behind sphere (simulate depth)
    const depth = Math.sin(a + tilt);
    if (depth < -0.3) continue;

    const alpha = p.opacity * (0.5 + depth * 0.5) * (0.7 + speakingAmp * 0.3);
    const sz = p.size * (0.7 + depth * 0.3);

    const pGrad = ctx.createRadialGradient(px, py, 0, px, py, sz * 2);
    pGrad.addColorStop(0, colors.particle + Math.floor(alpha * 255).toString(16).padStart(2, "0"));
    pGrad.addColorStop(0.5, colors.bright + Math.floor(alpha * 128).toString(16).padStart(2, "0"));
    pGrad.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(px, py, sz * 2, 0, Math.PI * 2);
    ctx.fillStyle = pGrad;
    ctx.fill();
  }
  ctx.restore();

  // ── Edge glow ring ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.1);
  edgeGrad.addColorStop(0, "transparent");
  edgeGrad.addColorStop(0.5, colors.bright + "18");
  edgeGrad.addColorStop(0.8, colors.bright + "08");
  edgeGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
  ctx.fillStyle = edgeGrad;
  ctx.fill();
  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────
export function ProfessorGlobe({
  size = 80,
  speaking = false,
  emotion = "idle",
  glowColor = "blue",
}: ProfessorGlobeProps) {
  const [blinkState, setBlinkState] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouthFrameRef = useRef<number>(0);
  const canvasFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const arcsRef = useRef<EnergyArc[]>([]);
  const mouthOpenRef = useRef(0);
  const speakingRef = useRef(speaking);

  const scale = size / 80;
  const colors = GLOW_CONFIGS[glowColor];
  const headSize = size * 0.75;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  // Keep refs in sync
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);

  // ── Initialize particles ──
  useEffect(() => {
    const count = Math.max(20, Math.floor(size * 0.6));
    particlesRef.current = createParticles(count);
    arcsRef.current = createArcs(4);
  }, [size]);

  // ── Canvas animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = headSize * dpr;
    const h = headSize * dpr;
    canvas.width = w;
    canvas.height = h;

    let startTime = performance.now();

    const draw = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const speed = EMOTION_SPEED[emotion] ?? 1;
      const amp = speakingRef.current ? mouthOpenRef.current : 0;

      drawEnergySphere(ctx, w, h, elapsed, speed, amp, colors, particlesRef.current, arcsRef.current);
      canvasFrameRef.current = requestAnimationFrame(draw);
    };

    canvasFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (canvasFrameRef.current) cancelAnimationFrame(canvasFrameRef.current);
    };
  }, [headSize, dpr, emotion, colors]);

  // ── Blink every 3-6 seconds ──
  useEffect(() => {
    const blink = () => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Eye tracking ──
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
    const maxOff = 3 * scale;
    setEyeOffset({
      x: Math.max(-maxOff, Math.min(maxOff, dx * maxOff * 4)),
      y: Math.max(-maxOff, Math.min(maxOff, dy * maxOff * 4)),
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

  // ── Mouth sync via AudioContext ──
  useEffect(() => {
    if (!speaking) {
      setMouthOpen(0);
      if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current);
      return;
    }

    const audioEl = document.querySelector("audio[data-langworld]") as HTMLAudioElement | null;
    if (!audioEl) {
      const simulate = () => {
        setMouthOpen(0.3 + Math.random() * 0.7);
        mouthFrameRef.current = requestAnimationFrame(() => {
          setTimeout(simulate, 80 + Math.random() * 120);
        });
      };
      simulate();
      return () => { if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current); };
    }

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        setMouthOpen(Math.min(1, avg / 128));
        mouthFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current);
        ctx.close();
      };
    } catch {
      const simulate = () => {
        setMouthOpen(0.3 + Math.random() * 0.7);
        mouthFrameRef.current = requestAnimationFrame(() => {
          setTimeout(simulate, 80 + Math.random() * 120);
        });
      };
      simulate();
      return () => { if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current); };
    }
  }, [speaking]);

  // ── Emotion-based eye shape ──
  const eyeH = (() => {
    if (blinkState) return 1;
    if (emotion === "happy") return 6;
    if (emotion === "surprised") return 12;
    return 9;
  })();
  const eyeRadius = emotion === "happy" ? "50%" : "40%";

  const glowBright = colors.bright;
  const glowAccent = colors.accent;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Energy sphere canvas */}
      <canvas
        ref={canvasRef}
        className="absolute rounded-full"
        style={{
          width: headSize,
          height: headSize,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Face overlay — positioned over the canvas sphere */}
      <div
        className="absolute"
        style={{
          width: headSize,
          height: headSize,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Antenna */}
        <div
          className="absolute"
          style={{
            width: 3 * scale,
            height: 12 * scale,
            background: `linear-gradient(to top, ${glowAccent}, ${glowBright})`,
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
            background: glowAccent,
            top: -15 * scale,
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow: `0 0 ${6 * scale}px ${glowAccent}`,
            animation: "globe-antenna-blink 2s ease-in-out infinite",
          }}
        />

        {/* Left eye */}
        <div
          className="absolute bg-white transition-all duration-100"
          style={{
            width: 8 * scale,
            height: eyeH * scale,
            left: `calc(30% + ${eyeOffset.x}px)`,
            top: `calc(35% + ${eyeOffset.y}px)`,
            borderRadius: eyeRadius,
            boxShadow: `0 0 ${4 * scale}px rgba(255,255,255,0.5)`,
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

        {/* Right eye */}
        <div
          className="absolute bg-white transition-all duration-100"
          style={{
            width: 8 * scale,
            height: eyeH * scale,
            right: `calc(30% - ${eyeOffset.x}px)`,
            top: `calc(35% + ${eyeOffset.y}px)`,
            borderRadius: eyeRadius,
            boxShadow: `0 0 ${4 * scale}px rgba(255,255,255,0.5)`,
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
              ? `radial-gradient(ellipse, ${glowAccent}, ${glowBright})`
              : emotion === "happy"
                ? glowAccent
                : glowAccent + "cc",
            borderRadius: emotion === "happy" && !speaking ? "0 0 50% 50%" : "50%",
            boxShadow: speaking ? `0 0 ${6 * scale}px ${glowBright}80` : `0 0 ${2 * scale}px ${glowBright}40`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes globe-antenna-blink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
