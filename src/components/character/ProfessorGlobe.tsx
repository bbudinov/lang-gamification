"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────
interface ProfessorGlobeProps {
  size?: number;
  speaking?: boolean;
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

interface EnergyRibbon {
  phase: number;
  speed: number;
  amplitude: number;
  width: number;
  tilt: number;
  offset: number;
}

// ─── Color configs ──────────────────────────────────────────────
const GLOW_CONFIGS = {
  blue: {
    core: "#0a1e3d",
    mid: "#1e4a8a",
    bright: "#38bdf8",
    accent: "#7dd3fc",
    particle: "#60a5fa",
    ribbon: "#2563eb",
    bg: "rgba(37,99,235,0.15)",
  },
  gold: {
    core: "#1a0e02",
    mid: "#5e3a0c",
    bright: "#fbbf24",
    accent: "#fde68a",
    particle: "#f59e0b",
    ribbon: "#d97706",
    bg: "rgba(245,158,11,0.10)",
  },
};

const EMOTION_SPEED: Record<string, number> = {
  idle: 1,
  happy: 1.8,
  thinking: 0.5,
  surprised: 2.5,
};

// ─── Generators ─────────────────────────────────────────────────
function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.25 + Math.random() * 0.7,
    speed: 0.2 + Math.random() * 0.8,
    size: 0.4 + Math.random() * 1.2,
    opacity: 0.2 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    orbitTilt: -0.5 + Math.random() * 1.0,
  }));
}

function createRibbons(count: number): EnergyRibbon[] {
  return Array.from({ length: count }, (_, i) => ({
    phase: (i / count) * Math.PI * 2,
    speed: 0.15 + Math.random() * 0.3,
    amplitude: 0.3 + Math.random() * 0.4,
    width: 1 + Math.random() * 1.5,
    tilt: -1.2 + (i / count) * 2.4,
    offset: Math.random() * Math.PI * 2,
  }));
}

// ─── Canvas renderer ────────────────────────────────────────────
function drawEnergySphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  emotionSpeed: number,
  speakingAmp: number,
  colors: typeof GLOW_CONFIGS.blue,
  particles: Particle[],
  ribbons: EnergyRibbon[]
) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.38;
  const pulse = 1 + Math.sin(time * 1.5) * 0.03 + speakingAmp * 0.05;
  const r = baseR * pulse;
  const t = time * emotionSpeed;

  ctx.clearRect(0, 0, w, h);

  // ── Outer atmospheric glow ──
  ctx.save();
  const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.0);
  outerGlow.addColorStop(0, colors.bright + "30");
  outerGlow.addColorStop(0.3, colors.ribbon + "1a");
  outerGlow.addColorStop(0.6, colors.mid + "0d");
  outerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, w, h);

  // Speaking pulse rings
  if (speakingAmp > 0.05) {
    for (let i = 0; i < 2; i++) {
      const ringR = r * (1.15 + i * 0.15 + speakingAmp * 0.3);
      const alpha = Math.floor((0.15 - i * 0.05) * speakingAmp * 255);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = colors.bright + Math.max(0, alpha).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5 - i * 0.5;
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── Blue core sphere ──
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  coreGrad.addColorStop(0, colors.core);
  coreGrad.addColorStop(0.35, colors.core);
  coreGrad.addColorStop(0.65, colors.mid);
  coreGrad.addColorStop(0.85, colors.mid + "ee");
  coreGrad.addColorStop(1, colors.bright + "50");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // ── Specular highlight ──
  const hlGrad = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.35, 0,
    cx - r * 0.2, cy - r * 0.25, r * 0.5
  );
  hlGrad.addColorStop(0, colors.accent + "20");
  hlGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  // Clip to sphere for ribbons and inner particles
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.97, 0, Math.PI * 2);
  ctx.clip();

  // ── Energy ribbons (thick swirling bezier curves) ──
  ctx.globalCompositeOperation = "lighter";
  for (const rib of ribbons) {
    const baseAngle = rib.phase + t * rib.speed;
    const segments = 40;

    // Draw ribbon as a thick path with varying control points
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const a = baseAngle + frac * Math.PI * 2.5;

      // 3D-ish swirling path — full sphere coverage
      const orbR = r * (0.55 + rib.amplitude * Math.sin(a * 0.7 + rib.offset));
      const xTilt = Math.cos(rib.tilt) * 0.9;
      const yTilt = 0.3 + 0.7 * Math.abs(Math.sin(rib.tilt));

      const px = cx + Math.cos(a) * orbR * xTilt;
      const py = cy + Math.sin(a) * orbR * yTilt + Math.sin(a * 1.5 + t) * r * 0.2;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    // Gradient along the ribbon — subtle
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.15, colors.ribbon + "25");
    grad.addColorStop(0.3, colors.bright + "45");
    grad.addColorStop(0.5, colors.accent + "55");
    grad.addColorStop(0.7, colors.bright + "45");
    grad.addColorStop(0.85, colors.ribbon + "25");
    grad.addColorStop(1, "transparent");

    ctx.strokeStyle = grad;
    ctx.lineWidth = rib.width * (1 + speakingAmp * 0.3);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  // ── Star-like particles ──
  for (const p of particles) {
    const a = p.angle + t * p.speed;
    const orbR = r * p.radius * (1 + Math.sin(t * 0.5 + p.phase) * 0.12);
    const tilt = p.orbitTilt;

    const px = cx + Math.cos(a) * orbR;
    const py = cy + Math.sin(a) * orbR * (0.5 + tilt * 0.5);

    const depth = Math.sin(a + tilt);
    if (depth < -0.2) continue;

    const alpha = p.opacity * (0.3 + depth * 0.5) * (0.5 + speakingAmp * 0.3);
    const sz = p.size * (0.5 + depth * 0.3);

    // Subtle dot with soft glow
    const pGrad = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.5);
    pGrad.addColorStop(0, colors.accent + Math.floor(alpha * 180).toString(16).padStart(2, "0"));
    pGrad.addColorStop(0.4, colors.bright + Math.floor(alpha * 80).toString(16).padStart(2, "0"));
    pGrad.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(px, py, sz * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = pGrad;
    ctx.fill();
  }

  ctx.restore(); // un-clip

  // ── Edge rim light ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.08);
  rimGrad.addColorStop(0, "transparent");
  rimGrad.addColorStop(0.5, colors.bright + "25");
  rimGrad.addColorStop(0.8, colors.ribbon + "35");
  rimGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
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
  const ribbonsRef = useRef<EnergyRibbon[]>([]);
  const mouthOpenRef = useRef(0);
  const speakingRef = useRef(speaking);

  const scale = size / 80;
  const colors = GLOW_CONFIGS[glowColor];
  const headSize = size * 0.85; // bigger sphere relative to container
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);

  // ── Initialize ──
  useEffect(() => {
    const pCount = Math.max(15, Math.floor(size * 0.5));
    particlesRef.current = createParticles(pCount);
    ribbonsRef.current = createRibbons(7);
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

    const startTime = performance.now();
    const draw = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const speed = EMOTION_SPEED[emotion] ?? 1;
      const amp = speakingRef.current ? mouthOpenRef.current : 0;
      drawEnergySphere(ctx, w, h, elapsed, speed, amp, colors, particlesRef.current, ribbonsRef.current);
      canvasFrameRef.current = requestAnimationFrame(draw);
    };

    canvasFrameRef.current = requestAnimationFrame(draw);
    return () => { if (canvasFrameRef.current) cancelAnimationFrame(canvasFrameRef.current); };
  }, [headSize, dpr, emotion, colors]);

  // ── Blink ──
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
    const ccx = rect.left + rect.width / 2;
    const ccy = rect.top + rect.height / 2;

    let px: number, py: number;
    if ("touches" in e) { px = e.touches[0].clientX; py = e.touches[0].clientY; }
    else { px = e.clientX; py = e.clientY; }

    const dx = (px - ccx) / window.innerWidth;
    const dy = (py - ccy) / window.innerHeight;
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

  // ── Mouth sync ──
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
        mouthFrameRef.current = requestAnimationFrame(() => { setTimeout(simulate, 80 + Math.random() * 120); });
      };
      simulate();
      return () => { if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current); };
    }
    try {
      const actx = new AudioContext();
      const source = actx.createMediaElementSource(audioEl);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(actx.destination);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        setMouthOpen(Math.min(1, avg / 128));
        mouthFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
      return () => { if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current); actx.close(); };
    } catch {
      const simulate = () => {
        setMouthOpen(0.3 + Math.random() * 0.7);
        mouthFrameRef.current = requestAnimationFrame(() => { setTimeout(simulate, 80 + Math.random() * 120); });
      };
      simulate();
      return () => { if (mouthFrameRef.current) cancelAnimationFrame(mouthFrameRef.current); };
    }
  }, [speaking]);

  const eyeH = (() => {
    if (blinkState) return 1;
    if (emotion === "happy") return 6;
    if (emotion === "surprised") return 12;
    return 9;
  })();
  const eyeRadius = emotion === "happy" ? "50%" : "40%";

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Energy sphere canvas */}
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          width: headSize,
          height: headSize,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Face overlay */}
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
        {/* Left eye */}
        <div className="absolute transition-all duration-100" style={{
          width: 9 * scale, height: eyeH * scale,
          left: `calc(28% + ${eyeOffset.x}px)`, top: `calc(34% + ${eyeOffset.y}px)`,
          borderRadius: eyeRadius, background: "white",
          boxShadow: `0 0 ${6 * scale}px rgba(255,255,255,0.9), 0 0 ${12 * scale}px ${colors.bright}50`,
        }}>
          <div className="absolute bg-[#050d1a] rounded-full" style={{
            width: 4.5 * scale, height: 4.5 * scale,
            left: `calc(50% + ${eyeOffset.x * 0.5}px)`, top: "50%",
            transform: "translate(-50%, -50%)",
          }} />
        </div>

        {/* Right eye */}
        <div className="absolute transition-all duration-100" style={{
          width: 9 * scale, height: eyeH * scale,
          right: `calc(28% - ${eyeOffset.x}px)`, top: `calc(34% + ${eyeOffset.y}px)`,
          borderRadius: eyeRadius, background: "white",
          boxShadow: `0 0 ${6 * scale}px rgba(255,255,255,0.9), 0 0 ${12 * scale}px ${colors.bright}50`,
        }}>
          <div className="absolute bg-[#050d1a] rounded-full" style={{
            width: 4.5 * scale, height: 4.5 * scale,
            left: `calc(50% + ${eyeOffset.x * 0.5}px)`, top: "50%",
            transform: "translate(-50%, -50%)",
          }} />
        </div>

        {/* Mouth */}
        <div className="absolute transition-all duration-75" style={{
          width: (10 + mouthOpen * 5) * scale,
          height: (speaking ? 3 + mouthOpen * 9 : emotion === "happy" ? 5 : 3) * scale,
          bottom: `${20 * scale}px`, left: "50%", transform: "translateX(-50%)",
          background: speaking
            ? `radial-gradient(ellipse, #ffffff, ${colors.accent})`
            : emotion === "happy" ? "#e0f2fe" : "#bae6fd",
          borderRadius: emotion === "happy" && !speaking ? "0 0 50% 50%" : "50%",
          boxShadow: speaking
            ? `0 0 ${10 * scale}px ${colors.bright}, 0 0 ${20 * scale}px ${colors.bright}60`
            : `0 0 ${5 * scale}px ${colors.bright}80`,
        }} />
      </div>

    </div>
  );
}
