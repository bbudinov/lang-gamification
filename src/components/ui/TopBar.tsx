"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import type { Language } from "@/types";

const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  bg: "BG",
  es: "ES",
};

const LANGUAGES: Language[] = ["en", "bg", "es"];

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
    checkAndUpdateStreak,
  } = useProgressStore();
  const { user, profile } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navigate = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  return (
    <div className="absolute top-0 left-0 right-0 safe-area" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Left: Points + Coins + Energy */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-xs font-semibold">{totalPoints}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5">
            <span className="text-yellow-300 text-xs">🪙</span>
            <span className="text-white text-xs font-semibold">{coins}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5">
            <span className="text-[10px]">⚡</span>
            <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${energyPercent}%`,
                  backgroundColor: energyColor,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Streak + Goal + Menu */}
        <div className="flex items-center gap-1.5">
          {dailyStreak > 0 && (
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5">
              <span className="text-xs" style={{ animation: "flame-flicker 1s ease-in-out infinite" }}>🔥</span>
              <span className="text-white text-[10px] font-bold">{dailyStreak}</span>
            </div>
          )}

          <button
            onClick={cycleTarget}
            className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-[10px] text-slate-400">{LANG_LABELS[nativeLanguage]}</span>
            <span className="text-white text-[10px]">→</span>
            <span className="text-xs text-white font-semibold">{LANG_LABELS[targetLanguage]}</span>
          </button>

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-sm">{user ? (profile?.avatar_emoji ?? "👤") : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-3 top-14 bg-[#0f1d32] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[9999] min-w-[180px]">
            <MenuItem emoji="🏅" label="Leaderboard" onClick={() => navigate("/leaderboard")} />
            <MenuItem emoji="🛍" label="Shop" onClick={() => navigate("/shop")} />
            <MenuItem emoji="📖" label="Word Book" onClick={() => navigate("/collection")} />
            <MenuItem emoji="🏆" label="Achievements" onClick={() => navigate("/achievements")} />
            <div className="border-t border-white/5" />
            {user ? (
              <MenuItem emoji={profile?.avatar_emoji ?? "👤"} label="Profile" onClick={() => navigate("/profile")} />
            ) : (
              <MenuItem emoji="👤" label="Log In" onClick={() => navigate("/login")} />
            )}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes flame-flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}

function MenuItem({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/10 transition-colors"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-white text-sm font-medium">{label}</span>
    </button>
  );
}
