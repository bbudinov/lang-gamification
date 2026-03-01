"use client";

import { useState, useEffect } from "react";
import type { MemoryCard as MemoryCardType } from "@/types";

interface MemoryCardProps {
  card: MemoryCardType;
  onFlip: (cardId: string) => void;
  disabled: boolean;
  shaking?: boolean;
}

export function MemoryCard({ card, onFlip, disabled, shaking }: MemoryCardProps) {
  const isRevealed = card.isFlipped || card.isMatched;
  const [justMatched, setJustMatched] = useState(false);

  // Detect when card transitions to matched
  useEffect(() => {
    if (card.isMatched) {
      setJustMatched(true);
      const timer = setTimeout(() => setJustMatched(false), 800);
      return () => clearTimeout(timer);
    }
  }, [card.isMatched]);

  return (
    <button
      onClick={() => !disabled && !isRevealed && onFlip(card.id)}
      disabled={disabled || isRevealed}
      className="aspect-[3/4] w-full [perspective:600px] relative"
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
          isRevealed ? (shaking ? "card-shake" : "[transform:rotateY(180deg)]") : ""
        } ${justMatched ? "scale-110" : ""}`}
        style={{ transition: justMatched ? "transform 0.3s ease-out" : undefined }}
      >
        {/* Back face (question mark side) */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-blue-400/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform overflow-hidden">
          <span className="text-3xl opacity-50">?</span>
          <div className="absolute inset-0 card-shimmer" />
        </div>

        {/* Front face (word side) */}
        <div
          className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl flex flex-col items-center justify-center gap-1 p-2 shadow-lg border-2 transition-all ${
            card.isMatched
              ? "bg-green-900/80 border-green-400 match-glow"
              : "bg-slate-800 border-slate-600"
          }`}
        >
          {card.isMatched && (
            <span className="text-2xl mb-1 animate-in zoom-in duration-300">{card.emoji}</span>
          )}
          <span className={`text-sm font-semibold text-white text-center leading-tight break-words ${justMatched ? "animate-bounce" : ""}`}>
            {card.text}
          </span>
          <span className="text-[10px] text-slate-400 uppercase">
            {card.language}
          </span>
        </div>
      </div>

      {/* Match sparkles */}
      {justMatched && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 40 + Math.random() * 20;
            return (
              <span
                key={i}
                className="absolute text-lg"
                style={{
                  left: "50%",
                  top: "50%",
                  animation: `sparkle-fly 0.6s ease-out forwards`,
                  transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
                }}
              >
                {["✨", "⭐", "🌟"][i % 3]}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}
