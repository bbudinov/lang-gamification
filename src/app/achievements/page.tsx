"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { ACHIEVEMENTS, getUnlockedAchievements } from "@/lib/achievements";
import type { AchievementContext, Rarity } from "@/lib/achievements";

const CATEGORY_FILTERS = [
  { key: "all", label: "All", emoji: "🏆" },
  { key: "skill", label: "Skill", emoji: "🎯" },
  { key: "streak", label: "Streak", emoji: "🔥" },
  { key: "collection", label: "Collection", emoji: "📚" },
  { key: "special", label: "Challenge", emoji: "✨" },
] as const;

const RARITY_STYLES: Record<Rarity, { bg: string; border: string; bar: string; label: string; shadow: string }> = {
  common: {
    bg: "bg-slate-800",
    border: "border-slate-600",
    bar: "bg-slate-400",
    label: "Common",
    shadow: "",
  },
  rare: {
    bg: "bg-blue-900/50",
    border: "border-blue-500/50",
    bar: "bg-blue-400",
    label: "Rare",
    shadow: "",
  },
  epic: {
    bg: "bg-purple-900/50",
    border: "border-purple-500/50",
    bar: "bg-purple-400",
    label: "Epic",
    shadow: "",
  },
  legendary: {
    bg: "bg-amber-900/50",
    border: "border-amber-500/50",
    bar: "bg-gradient-to-r from-amber-400 to-yellow-300",
    label: "Legendary",
    shadow: "shadow-lg shadow-amber-500/20",
  },
};

const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-slate-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

// Milestones for bonus coins
const MILESTONE_REWARDS = [
  { count: 5, reward: 100 },
  { count: 10, reward: 150 },
  { count: 15, reward: 250 },
  { count: 20, reward: 400 },
  { count: 30, reward: 750 },
];

function getNextMilestone(unlockedCount: number) {
  return MILESTONE_REWARDS.find((m) => m.count > unlockedCount) ?? null;
}

export default function AchievementsPage() {
  const router = useRouter();
  const { gameResults, wordMastery, totalPoints, coins, dailyStreak, unlockedTopics, addCoins } =
    useProgressStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [claimedIds, setClaimedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("claimed-achievements") || "[]");
    } catch {
      return [];
    }
  });
  const [justClaimed, setJustClaimed] = useState<string | null>(null);

  const ctx: AchievementContext = {
    gameResults,
    wordMastery,
    totalPoints,
    coins,
    dailyStreak,
    unlockedTopics,
  };

  const unlockedSet = new Set(getUnlockedAchievements(ctx));
  const claimedSet = new Set(claimedIds);
  const unlockedCount = unlockedSet.size;
  const totalCount = ACHIEVEMENTS.length;
  const nextMilestone = getNextMilestone(unlockedCount);

  const filtered =
    activeFilter === "all"
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter((a) => a.category === activeFilter);

  const handleClaim = useCallback(
    (id: string, reward: number) => {
      addCoins(reward);
      const next = [...claimedIds, id];
      setClaimedIds(next);
      setJustClaimed(id);
      localStorage.setItem("claimed-achievements", JSON.stringify(next));
      setTimeout(() => setJustClaimed(null), 1500);
    },
    [addCoins, claimedIds]
  );

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <h1 className="text-white font-bold text-lg">Achievements</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Progress summary */}
      <div className="px-4 pb-3">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-bold text-lg">
              {unlockedCount} / {totalCount} unlocked
            </p>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-700"
              style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {nextMilestone && (
            <p className="text-slate-400 text-xs mt-2">
              Next reward at {nextMilestone.count} achievements → +{nextMilestone.reward} coins
            </p>
          )}
        </div>
      </div>

      {/* Category filter chips */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = activeFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "bg-transparent border border-white/20 text-slate-300 active:bg-white/10"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement cards grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((achievement) => {
            const isUnlocked = unlockedSet.has(achievement.id);
            const isClaimed = claimedSet.has(achievement.id);
            const wasJustClaimed = justClaimed === achievement.id;
            const progress = achievement.getProgress(ctx);
            const rStyle = RARITY_STYLES[achievement.rarity];
            const rText = RARITY_TEXT[achievement.rarity];

            // Card state
            const isLocked = !isUnlocked && progress < achievement.maxProgress;
            const isInProgress = !isUnlocked && progress > 0;

            // Border color by state
            let borderColor = rStyle.border;
            let extraStyles = "";
            if (isUnlocked && !isClaimed) {
              borderColor = "border-amber-400";
              extraStyles = "shadow-lg shadow-amber-500/30";
            } else if (isClaimed) {
              borderColor = "border-green-500/50";
            } else if (isInProgress) {
              borderColor = "border-blue-500/40";
            } else if (isLocked) {
              borderColor = "border-slate-700";
            }

            return (
              <div
                key={achievement.id}
                className={`relative rounded-2xl border p-3 backdrop-blur-sm transition-all duration-300 flex flex-col items-center text-center gap-1.5 ${
                  rStyle.bg
                } ${borderColor} ${rStyle.shadow} ${extraStyles} ${
                  isLocked && !isInProgress ? "opacity-50" : ""
                }`}
                style={isLocked && !isInProgress ? { filter: "blur(0.5px)" } : undefined}
              >
                {/* Lock overlay */}
                {isLocked && !isInProgress && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 z-10">
                    <span className="text-2xl">🔒</span>
                  </div>
                )}

                {/* Icon */}
                <span className={`text-3xl ${isLocked && !isInProgress ? "grayscale" : ""}`}>
                  {achievement.emoji}
                </span>

                {/* Name */}
                <p className="text-white font-bold text-sm leading-tight">{achievement.name}</p>

                {/* Rarity label */}
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${rText}`}>
                  — {rStyle.label} —
                </p>

                {/* Description */}
                <p className="text-slate-400 text-[11px] leading-snug">{achievement.description}</p>

                {/* Progress bar */}
                <div className="w-full mt-1">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isClaimed ? "bg-green-400" : rStyle.bar
                      }`}
                      style={{
                        width: `${achievement.maxProgress > 0 ? (progress / achievement.maxProgress) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {progress}/{achievement.maxProgress}
                  </p>
                </div>

                {/* Reward line */}
                <p className="text-slate-400 text-[11px]">
                  Reward: +{achievement.reward} 🪙
                </p>

                {/* Claim / status button */}
                {isUnlocked && !isClaimed && !wasJustClaimed && (
                  <button
                    onClick={() => handleClaim(achievement.id, achievement.reward)}
                    className="mt-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs rounded-lg py-1.5 active:scale-95 transition-transform"
                  >
                    Claim +{achievement.reward} 🪙
                  </button>
                )}
                {wasJustClaimed && (
                  <div className="mt-1 w-full bg-green-500/20 border border-green-500/40 text-green-400 font-bold text-xs rounded-lg py-1.5 text-center animate-pulse">
                    Claimed! ✅
                  </div>
                )}
                {isClaimed && !wasJustClaimed && (
                  <div className="mt-1 w-full text-green-400 font-semibold text-xs py-1.5 text-center">
                    Completed ✅
                  </div>
                )}
                {!isUnlocked && (
                  <div className="mt-1 w-full text-slate-600 font-medium text-xs py-1.5 text-center">
                    {isInProgress ? "In Progress" : "Locked"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
