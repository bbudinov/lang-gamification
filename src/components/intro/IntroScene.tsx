"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getIntroScene, type IntroFrame } from "@/data/introScenes";
import { speakAndWait, speakAndWaitGendered } from "@/lib/speech";
import { useProgressStore } from "@/stores/progressStore";
import type { TopicId, Language } from "@/types";

// ─── Ken Burns animation configs ─────────────────────────────
const KEN_BURNS: Record<string, { from: string; to: string }> = {
  "zoom-in": {
    from: "scale(1) translate(0, 0)",
    to: "scale(1.15) translate(-2%, -2%)",
  },
  "zoom-out": {
    from: "scale(1.15) translate(-2%, -2%)",
    to: "scale(1) translate(0, 0)",
  },
  "pan-left": {
    from: "scale(1.08) translate(3%, 0)",
    to: "scale(1.08) translate(-3%, 0)",
  },
  "pan-right": {
    from: "scale(1.08) translate(-3%, 0)",
    to: "scale(1.08) translate(3%, 0)",
  },
  still: {
    from: "scale(1.02) translate(0, 0)",
    to: "scale(1.05) translate(0, -1%)",
  },
};

// ─── Typewriter hook ─────────────────────────────────────────
function useTypewriter(text: string, speed = 35) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  const complete = useCallback(() => {
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, complete };
}

// ─── Single Frame ────────────────────────────────────────────
function Frame({
  frame,
  language,
  active,
  onDone,
}: {
  frame: IntroFrame;
  language: Language;
  active: boolean;
  onDone: () => void;
}) {
  const isProfessor = frame.speaker === "professor";
  // Professor Globe always speaks EN; NPCs speak target language
  const speechLang = isProfessor ? "en" as const : language;
  const text = frame.text[language] || frame.text.en;
  const speechText = isProfessor ? frame.text.en : text;
  const duration = frame.duration || 4500;
  const anim = KEN_BURNS[frame.animation || "still"];
  const { displayed, done: typeDone, complete: skipType } = useTypewriter(
    active ? text : "",
    30
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const spokRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(!frame.video); // images are ready instantly

  // Speak text via TTS when frame becomes active AND video is ready
  useEffect(() => {
    if (!active || !videoReady) {
      if (!active) spokRef.current = false;
      return;
    }
    if (spokRef.current) return;
    spokRef.current = true;
    const gender = isProfessor ? "male" : (frame.voiceGender || "male");
    speakAndWaitGendered(speechText, speechLang, gender, duration + 2000).catch(() => {});
  }, [active, videoReady, speechText, speechLang, duration, isProfessor, frame.voiceGender]);

  // Auto-advance after duration (wait for video to be ready)
  useEffect(() => {
    if (!active || !videoReady) return;
    timerRef.current = setTimeout(onDone, duration);
    return () => clearTimeout(timerRef.current);
  }, [active, videoReady, duration, onDone]);

  return (
    <div className="absolute inset-0">
      {/* Background video or image with Ken Burns */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.8s ease-in-out",
        }}
      >
        {frame.video ? (
          <video
            ref={videoRef}
            src={frame.video}
            autoPlay
            muted
            loop
            playsInline
            poster={frame.image}
            onCanPlay={() => setVideoReady(true)}
            className="w-full h-full object-cover sm:object-contain"
          />
        ) : (
          <img
            src={frame.image}
            alt=""
            className="w-full h-full object-cover sm:object-contain"
            style={{
              transform: active ? anim.to : anim.from,
              transition: `transform ${duration}ms ease-out`,
              willChange: "transform",
            }}
          />
        )}
        {/* Cinematic letterbox bars */}
        <div className="absolute top-0 left-0 right-0 h-[8%] bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>

      {/* Speech bubble */}
      {active && displayed && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2"
          style={{
            animation: "intro-bubble-in 0.4s ease-out",
          }}
        >
          {/* Speaker label */}
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                isProfessor
                  ? "bg-blue-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {isProfessor ? "P" : frame.speaker[0]}
            </div>
            <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">
              {isProfessor ? "Professor Globe" : frame.speaker}
            </span>
          </div>

          {/* Text */}
          <div
            className="relative rounded-2xl px-4 py-3 backdrop-blur-sm"
            style={{
              background: isProfessor
                ? "rgba(30, 64, 120, 0.85)"
                : "rgba(120, 60, 20, 0.85)",
              border: isProfessor
                ? "1px solid rgba(96, 165, 250, 0.3)"
                : "1px solid rgba(251, 191, 36, 0.3)",
            }}
          >
            <p className="text-white text-base leading-relaxed font-medium">
              {displayed}
              {!typeDone && (
                <span className="inline-block w-0.5 h-4 bg-white/80 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main IntroScene ─────────────────────────────────────────
interface IntroSceneProps {
  topicId: TopicId;
  onComplete: () => void;
}

export function IntroScene({ topicId, onComplete }: IntroSceneProps) {
  const scene = getIntroScene(topicId);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [started, setStarted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const { targetLanguage, markIntroSeen } = useProgressStore();
  const completedRef = useRef(false);

  // Preload images
  useEffect(() => {
    if (!scene) return;
    scene.frames.forEach((f) => {
      const img = new Image();
      img.src = f.image;
    });
  }, [scene]);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleFrameDone = useCallback(() => {
    if (!scene) return;
    if (currentFrame < scene.frames.length - 1) {
      setCurrentFrame((f) => f + 1);
    } else {
      // Last frame done
      finish();
    }
  }, [scene, currentFrame]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markIntroSeen(topicId);
    setFadeOut(true);
    setTimeout(onComplete, 600);
  }, [topicId, onComplete, markIntroSeen]);

  if (!scene) {
    onComplete();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[300] bg-black"
      style={{
        opacity: fadeOut ? 0 : started ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Frames */}
      {scene.frames.map((frame, idx) => (
        <Frame
          key={idx}
          frame={frame}
          language={targetLanguage}
          active={currentFrame === idx}
          onDone={handleFrameDone}
        />
      ))}

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {scene.frames.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentFrame
                ? "w-8 bg-white"
                : idx < currentFrame
                  ? "w-4 bg-white/60"
                  : "w-4 bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* NPC name top-left */}
      <div className="absolute top-10 left-4 z-20 flex items-center gap-1.5 sm:top-5">
        <span className="text-xl">{scene.npcEmoji}</span>
        <span className="text-white/80 text-xs font-medium">
          {scene.npcName}
        </span>
      </div>

      {/* Skip button — bottom-right on desktop, top-right on mobile */}
      <button
        onClick={finish}
        className="absolute z-20 px-5 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/30 text-white text-sm font-semibold hover:bg-black/70 transition-all active:scale-95 top-10 right-4 sm:top-auto sm:bottom-28 sm:right-6"
      >
        Skip ▸
      </button>

      <style jsx>{`
        @keyframes intro-bubble-in {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
