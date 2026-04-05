"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";

interface GameHUDProps {
  topicEmoji: string;
  topicName: string;
  topicId?: string;
}

export function GameHUD({ topicEmoji, topicName, topicId }: GameHUDProps) {
  const router = useRouter();
  const { score, moves, matchedPairs, totalPairs } = useGameStore();

  return (
    <div className="absolute top-0 left-0 right-0 z-10 safe-area">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.push(topicId ? `/map?topic=${topicId}` : "/map")}
          className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
        >
          <span className="text-white text-sm">← Back</span>
        </button>

        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span>{topicEmoji}</span>
          <span className="text-white text-sm font-medium">{topicName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-sm font-semibold">{score}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-white text-xs">
              {matchedPairs}/{totalPairs}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
