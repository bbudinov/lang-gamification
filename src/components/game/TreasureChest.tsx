"use client";

import { useState, useEffect } from "react";

export interface ChestReward {
  type: "coins" | "bonus_xp";
  amount: number;
  label: string;
  emoji: string;
}

const POSSIBLE_REWARDS: (() => ChestReward)[] = [
  () => ({ type: "coins", amount: 10, label: "+10 Coins", emoji: "🪙" }),
  () => ({ type: "coins", amount: 15, label: "+15 Coins", emoji: "🪙" }),
  () => ({ type: "coins", amount: 25, label: "+25 Coins!", emoji: "💰" }),
  () => ({ type: "bonus_xp", amount: 20, label: "+20 Bonus XP", emoji: "✨" }),
  () => ({ type: "bonus_xp", amount: 30, label: "+30 Bonus XP!", emoji: "🌟" }),
  () => ({ type: "coins", amount: 50, label: "+50 Coins!!", emoji: "👑" }),
];

export function rollChestReward(): ChestReward {
  // Weighted: common rewards more likely
  const weights = [30, 25, 15, 15, 10, 5]; // must sum to 100
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return POSSIBLE_REWARDS[i]();
  }
  return POSSIBLE_REWARDS[0]();
}

// Show chest every 3 games
export function shouldShowChest(gamesPlayedToday: number): boolean {
  return gamesPlayedToday > 0 && gamesPlayedToday % 3 === 0;
}

interface TreasureChestProps {
  reward: ChestReward;
  onCollect: (reward: ChestReward) => void;
}

export function TreasureChest({ reward, onCollect }: TreasureChestProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "revealed">("closed");

  useEffect(() => {
    // Auto-open after a moment
    const t = setTimeout(() => setPhase("opening"), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === "opening") {
      const t = setTimeout(() => setPhase("revealed"), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="text-center space-y-4 px-6 max-w-xs">
        {/* Chest */}
        <div
          className="text-7xl"
          style={{
            animation:
              phase === "closed"
                ? "chest-bounce 0.6s ease-in-out infinite"
                : phase === "opening"
                  ? "chest-open 0.8s ease-out forwards"
                  : undefined,
          }}
        >
          {phase === "revealed" ? reward.emoji : "🎁"}
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold text-white"
          style={phase === "revealed" ? { animation: "star-pop 0.4s ease-out both" } : undefined}
        >
          {phase === "revealed" ? "Treasure Found!" : "Treasure Chest!"}
        </h2>

        {/* Reward */}
        {phase === "revealed" && (
          <div className="space-y-3" style={{ animation: "star-pop 0.4s ease-out 0.2s both" }}>
            <p className="text-yellow-300 text-xl font-bold">{reward.label}</p>
            <button
              onClick={() => onCollect(reward)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-full font-bold text-lg active:scale-95 transition-all shadow-lg shadow-amber-500/30"
            >
              Collect!
            </button>
          </div>
        )}

        {/* Tap to open hint */}
        {phase === "closed" && (
          <p className="text-slate-400 text-sm animate-pulse">Opening...</p>
        )}
      </div>
    </div>
  );
}
