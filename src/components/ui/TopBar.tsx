"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { InstallPWA } from "./InstallPWA";
import type { Language } from "@/types";

const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  bg: "BG",
  es: "ES",
};

const LANGUAGES: Language[] = ["en", "bg", "es"];

function UserButton() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  if (!user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
        title="Log in"
      >
        <span className="text-sm">👤</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push("/profile")}
      className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
      title="Profile"
    >
      <span className="text-sm">{profile?.avatar_emoji ?? "👤"}</span>
    </button>
  );
}

export function TopBar() {
  const router = useRouter();
  const {
    totalPoints,
    coins,
    nativeLanguage,
    targetLanguage,
    setLanguages,
    energy,
    maxEnergy,
    dailyStreak,
    todayGamesPlayed,
    dailyGoalTarget,
    checkAndUpdateStreak,
  } = useProgressStore();

  // Check streak on mount
  useEffect(() => {
    checkAndUpdateStreak();
  }, [checkAndUpdateStreak]);

  const cycleTarget = () => {
    const available = LANGUAGES.filter((l) => l !== nativeLanguage);
    const idx = available.indexOf(targetLanguage);
    const next = available[(idx + 1) % available.length];
    setLanguages(nativeLanguage, next);
  };

  const energyPercent = (energy / maxEnergy) * 100;
  const energyColor = energyPercent > 60 ? "#22c55e" : energyPercent > 30 ? "#f59e0b" : "#ef4444";
  const goalComplete = todayGamesPlayed >= dailyGoalTarget;

  return (
    <div className="absolute top-0 left-0 right-0 safe-area" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Points + Energy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-amber-400 text-sm">⭐</span>
            <span className="text-white text-sm font-semibold">{totalPoints}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className="text-yellow-300 text-sm">🪙</span>
            <span className="text-white text-xs font-semibold">{coins}</span>
          </div>

          {/* Energy bar */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className="text-xs">⚡</span>
            <div className="w-12 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${energyPercent}%`,
                  backgroundColor: energyColor,
                  boxShadow: energyPercent < 30 ? `0 0 6px ${energyColor}` : "none",
                  animation: energyPercent < 30 ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Streak + Language */}
        <div className="flex items-center gap-2">
          {/* Streak */}
          {dailyStreak > 0 && (
            <div className={`flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 ${
              goalComplete ? "ring-1 ring-amber-400/50" : ""
            }`}>
              <span className="text-sm" style={{ animation: "flame-flicker 1s ease-in-out infinite" }}>🔥</span>
              <span className="text-white text-xs font-bold">{dailyStreak}</span>
            </div>
          )}

          {/* Daily goal progress */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className="text-xs">{goalComplete ? "✅" : "🎯"}</span>
            <span className="text-white text-xs">
              {todayGamesPlayed}/{dailyGoalTarget}
            </span>
          </div>

          <button
            onClick={() => router.push("/leaderboard")}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
            title="Leaderboard"
          >
            <span className="text-sm">🏅</span>
          </button>
          <button
            onClick={() => router.push("/collection")}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
            title="Word Book"
          >
            <span className="text-sm">📖</span>
          </button>
          <button
            onClick={() => router.push("/achievements")}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
            title="Achievements"
          >
            <span className="text-sm">🏆</span>
          </button>
          <InstallPWA />
          <UserButton />
          <button
            onClick={cycleTarget}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-xs text-slate-400">
              {LANG_LABELS[nativeLanguage]}
            </span>
            <span className="text-white text-xs">→</span>
            <span className="text-sm text-white font-semibold">
              {LANG_LABELS[targetLanguage]}
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes flame-flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
