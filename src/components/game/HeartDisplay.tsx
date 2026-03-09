"use client";

import { useEffect, useState } from "react";

interface HeartDisplayProps {
  lives: number;
  maxLives: number;
}

export function HeartDisplay({ lives, maxLives }: HeartDisplayProps) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  // Animate heart break when lives decrease
  useEffect(() => {
    if (lives < maxLives) {
      setAnimatingIndex(lives); // The heart that just broke
      const timer = setTimeout(() => setAnimatingIndex(null), 600);
      return () => clearTimeout(timer);
    }
  }, [lives, maxLives]);

  const isRescueMode = lives === 1;

  return (
    <div
      className={`flex items-center gap-0.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 transition-all duration-300 ${
        isRescueMode ? "bg-red-900/40 border border-red-500/50 animate-pulse" : ""
      }`}
    >
      {Array.from({ length: maxLives }).map((_, i) => {
        const isAlive = i < lives;
        const isBreaking = i === animatingIndex;

        return (
          <span
            key={i}
            className={`text-sm transition-all duration-300 ${
              isBreaking ? "heart-break" : ""
            }`}
            style={{
              filter: isAlive ? "none" : "grayscale(1) opacity(0.3)",
              transform: isBreaking ? "scale(1.5)" : isAlive ? "scale(1)" : "scale(0.8)",
            }}
          >
            {isAlive ? "❤️" : "🖤"}
          </span>
        );
      })}
    </div>
  );
}
