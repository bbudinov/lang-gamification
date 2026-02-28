"use client";

import { useEffect, useState } from "react";

interface MatchPopupProps {
  emoji: string;
  word: string;
  onDone: () => void;
}

const CONFETTI = ["🌟", "⭐", "✨", "💫", "🎉", "🎊", "💥", "🔥"];

export function MatchPopup({ emoji, word, onDone }: MatchPopupProps) {
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase("exit"), 1200);
    const doneTimer = setTimeout(onDone, 1700);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  // Generate confetti particles with random directions
  const confetti = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20;
    const rot = (Math.random() - 0.5) * 720;
    return { dx, dy, rot, emoji: CONFETTI[i % CONFETTI.length], delay: Math.random() * 100 };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Dim backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        style={{
          animation: phase === "enter"
            ? "popup-bounce 0.1s ease-out forwards"
            : "popup-exit 0.4s ease-in forwards",
          opacity: phase === "exit" ? 0 : 0.2,
          transition: "opacity 0.3s",
        }}
      />

      {/* Confetti particles */}
      {confetti.map((c, i) => (
        <span
          key={i}
          className="absolute text-xl"
          style={{
            "--dx": `${c.dx}px`,
            "--dy": `${c.dy}px`,
            "--rot": `${c.rot}deg`,
            animation: `confetti-fall 0.8s ease-out ${c.delay}ms forwards`,
            opacity: phase === "exit" ? 0 : 1,
          } as React.CSSProperties}
        >
          {c.emoji}
        </span>
      ))}

      {/* Main emoji */}
      <div
        className="flex flex-col items-center gap-2"
        style={{
          animation: phase === "enter"
            ? "popup-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "popup-exit 0.4s ease-in forwards",
        }}
      >
        <span className="text-8xl drop-shadow-2xl">{emoji}</span>
        <span
          className="text-white text-xl font-bold bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm"
          style={{
            animation: "popup-word-in 0.3s ease-out 0.3s both",
          }}
        >
          {word}
        </span>
      </div>
    </div>
  );
}
