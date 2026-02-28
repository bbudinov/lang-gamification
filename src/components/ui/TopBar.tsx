"use client";

import { useProgressStore } from "@/stores/progressStore";
import type { Language } from "@/types";

const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  bg: "BG",
  es: "ES",
};

const LANGUAGES: Language[] = ["en", "bg", "es"];

export function TopBar() {
  const { totalPoints, nativeLanguage, targetLanguage, setLanguages } =
    useProgressStore();

  const cycleTarget = () => {
    const available = LANGUAGES.filter((l) => l !== nativeLanguage);
    const idx = available.indexOf(targetLanguage);
    const next = available[(idx + 1) % available.length];
    setLanguages(nativeLanguage, next);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 safe-area">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="text-amber-400 text-sm">⭐</span>
          <span className="text-white text-sm font-semibold">{totalPoints}</span>
        </div>

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
  );
}
