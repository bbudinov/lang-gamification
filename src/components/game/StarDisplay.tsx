"use client";

import { getStarRating, calculateCoins } from "@/lib/constants";

interface StarDisplayProps {
  score: number;
  maxScore: number;
  size?: "sm" | "md" | "lg";
}

export function StarDisplay({ score, maxScore, size = "md" }: StarDisplayProps) {
  const stars = getStarRating(score, maxScore);

  const sizes = {
    sm: "text-sm gap-0.5",
    md: "text-2xl gap-1",
    lg: "text-4xl gap-1.5",
  };

  return (
    <div className={`flex items-center justify-center ${sizes[size]}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={i <= stars ? "" : "opacity-25 grayscale"}
          style={
            i <= stars
              ? {
                  animation: `star-pop 0.4s ease-out ${i * 0.2}s both`,
                  filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))",
                }
              : { animation: `star-pop 0.4s ease-out ${i * 0.2}s both` }
          }
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

interface StarsBadgeProps {
  score: number;
  maxScore: number;
}

interface GameRewardProps {
  score: number;
  maxScore: number;
}

export function GameRewardSummary({ score, maxScore }: GameRewardProps) {
  const coins = calculateCoins(score, maxScore);
  return (
    <div className="flex items-center justify-center gap-4 text-sm" style={{ animation: "star-pop 0.4s ease-out 0.8s both" }}>
      <span className="text-amber-400 font-semibold">⭐ {score} XP</span>
      <span className="text-yellow-300 font-semibold">🪙 +{coins}</span>
    </div>
  );
}

export function StarsBadge({ score, maxScore }: StarsBadgeProps) {
  const stars = getStarRating(score, maxScore);
  if (stars === 0) return null;

  return (
    <span className="text-xs flex items-center gap-px">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= stars ? "" : "opacity-20 grayscale"} style={{ fontSize: "10px" }}>
          ⭐
        </span>
      ))}
    </span>
  );
}
