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
  it: "IT",
  de: "DE",
  fr: "FR",
};

const LANG_FLAGS: Record<Language, string> = {
  en: "🇬🇧",
  bg: "🇧🇬",
  es: "🇪🇸",
  it: "🇮🇹",
  de: "🇩🇪",
  fr: "🇫🇷",
};

const LANGUAGES: Language[] = ["en", "bg", "es", "it", "de", "fr"];

export function TopBar() {
  const router = useRouter();
  const {
    totalPoints,
    coins,
    nativeLanguage,
    targetLanguage,
    setLanguages,
    dailyStreak,
    checkAndUpdateStreak,
  } = useProgressStore();
  const { user, profile } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [langMode, setLangMode] = useState<"target" | "native">("target");

  useEffect(() => {
    checkAndUpdateStreak();
  }, [checkAndUpdateStreak]);

  const selectTarget = (lang: Language) => {
    setLanguages(nativeLanguage, lang);
    setLangOpen(false);
  };

  const selectNative = (lang: Language) => {
    // If native becomes same as target, swap them
    if (lang === targetLanguage) {
      setLanguages(lang, nativeLanguage);
    } else {
      setLanguages(lang, targetLanguage);
    }
    setLangOpen(false);
  };

  const navigate = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  return (
    <div className="absolute top-0 left-0 right-0 safe-area" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Left: XP + Coins */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-xs font-semibold">{totalPoints}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5">
            <span className="text-yellow-300 text-xs">🪙</span>
            <span className="text-white text-xs font-semibold">{coins}</span>
          </div>
        </div>

        {/* Right: Streak + Language + Menu */}
        <div className="flex items-center gap-1.5">
          {dailyStreak > 0 && (
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5">
              <span className="text-xs" style={{ animation: "flame-flicker 1s ease-in-out infinite" }}>🔥</span>
              <span className="text-white text-[10px] font-bold">{dailyStreak}</span>
            </div>
          )}

          <button
            onClick={() => { setLangMode("target"); setLangOpen(!langOpen); }}
            className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-xs">{LANG_FLAGS[nativeLanguage]}</span>
            <span className="text-[8px] text-slate-400">→</span>
            <span className="text-xs">{LANG_FLAGS[targetLanguage]}</span>
            <span className="text-[8px] text-slate-400">▼</span>
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-sm">{user ? (profile?.avatar_emoji ?? "👤") : "☰"}</span>
          </button>
        </div>
      </div>

      {langOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setLangOpen(false)} />
          <div className="absolute right-14 top-14 bg-[#0f1d32] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[9999] min-w-[180px]">
            {/* Tab switcher */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setLangMode("native")}
                className={`flex-1 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold transition-colors ${langMode === "native" ? "text-blue-400 bg-blue-500/10" : "text-slate-500"}`}
              >
                I speak
              </button>
              <button
                onClick={() => setLangMode("target")}
                className={`flex-1 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold transition-colors ${langMode === "target" ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500"}`}
              >
                I learn
              </button>
            </div>
            {langMode === "target" ? (
              LANGUAGES.filter((l) => l !== nativeLanguage).map((lang) => (
                <button
                  key={lang}
                  onClick={() => selectTarget(lang)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-white/10 transition-colors ${lang === targetLanguage ? "bg-white/10" : ""}`}
                >
                  <span className="text-lg">{LANG_FLAGS[lang]}</span>
                  <span className="text-white text-sm font-medium">{LANG_LABELS[lang]}</span>
                  {lang === targetLanguage && <span className="text-green-400 text-xs ml-auto">✓</span>}
                </button>
              ))
            ) : (
              LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => selectNative(lang)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-white/10 transition-colors ${lang === nativeLanguage ? "bg-white/10" : ""}`}
                >
                  <span className="text-lg">{LANG_FLAGS[lang]}</span>
                  <span className="text-white text-sm font-medium">{LANG_LABELS[lang]}</span>
                  {lang === nativeLanguage && <span className="text-blue-400 text-xs ml-auto">✓</span>}
                </button>
              ))
            )}
          </div>
        </>
      )}

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
