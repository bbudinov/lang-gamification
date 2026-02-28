"use client";

import type { MemoryCard as MemoryCardType } from "@/types";

interface MemoryCardProps {
  card: MemoryCardType;
  onFlip: (cardId: string) => void;
  disabled: boolean;
}

export function MemoryCard({ card, onFlip, disabled }: MemoryCardProps) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <button
      onClick={() => !disabled && !isRevealed && onFlip(card.id)}
      disabled={disabled || isRevealed}
      className="aspect-[3/4] w-full [perspective:600px]"
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
          isRevealed ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Back face (default visible) */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-blue-400/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <span className="text-3xl opacity-50">?</span>
        </div>

        {/* Front face (shown when flipped) */}
        <div
          className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl flex flex-col items-center justify-center gap-1 p-2 shadow-lg border-2 transition-colors ${
            card.isMatched
              ? "bg-green-900/80 border-green-400"
              : "bg-slate-800 border-slate-600"
          }`}
        >
          <span className="text-sm font-semibold text-white text-center leading-tight break-words">
            {card.text}
          </span>
          <span className="text-[10px] text-slate-400 uppercase">
            {card.language}
          </span>
        </div>
      </div>
    </button>
  );
}
