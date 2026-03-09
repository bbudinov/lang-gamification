"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { WordEntry, WordMastery } from "@/types";

function getMasteryLevel(m: WordMastery | undefined): "unknown" | "seen" | "learning" | "mastered" {
  if (!m || (m.correct === 0 && m.wrong === 0)) return "unknown";
  const total = m.correct + m.wrong;
  const accuracy = m.correct / total;
  if (m.correct >= 5 && accuracy >= 0.8 && m.streak >= 3) return "mastered";
  if (m.correct >= 2) return "learning";
  return "seen";
}

const LEVEL_STYLES = {
  unknown: { bg: "bg-white/5", border: "border-white/10", text: "text-slate-600", emoji: "opacity-20 grayscale blur-[2px]" },
  seen: { bg: "bg-white/8", border: "border-white/15", text: "text-slate-400", emoji: "opacity-60 grayscale-[50%]" },
  learning: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", emoji: "" },
  mastered: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-300", emoji: "" },
};

export default function CollectionPage() {
  const router = useRouter();
  const { wordMastery, targetLanguage, nativeLanguage, unlockedTopics } = useProgressStore();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordEntry | null>(null);

  // Count stats
  const allWords = topics.flatMap((t) => t.words);
  const totalWords = allWords.length;
  const discoveredWords = allWords.filter((w) => {
    const m = wordMastery[w.id];
    return m && (m.correct > 0 || m.wrong > 0);
  }).length;
  const masteredWords = allWords.filter((w) => getMasteryLevel(wordMastery[w.id]) === "mastered").length;

  const filteredTopics = selectedTopic
    ? topics.filter((t) => t.id === selectedTopic)
    : topics;

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
          <h1 className="text-white font-bold text-lg">Word Book</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 pb-4">
        <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{discoveredWords}</p>
            <p className="text-slate-500 text-xs">Discovered</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{masteredWords}</p>
            <p className="text-slate-500 text-xs">Mastered</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">{totalWords}</p>
            <p className="text-slate-500 text-xs">Total</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${totalWords > 0 ? (discoveredWords / totalWords) * 100 : 0}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs text-right mt-1">
            {Math.round((discoveredWords / totalWords) * 100)}% discovered
          </p>
        </div>
      </div>

      {/* Topic filter */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedTopic(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedTopic ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400"
          }`}
        >
          All
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTopic(selectedTopic === t.id ? null : t.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedTopic === t.id ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400"
            }`}
          >
            {t.emoji} {t.name[targetLanguage] || t.name.en}
          </button>
        ))}
      </div>

      {/* Word grid */}
      <div className="px-4 pb-8 space-y-6">
        {filteredTopics.map((topic) => {
          const isUnlocked = unlockedTopics.includes(topic.id);
          return (
            <div key={topic.id}>
              <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                <span>{topic.emoji}</span>
                <span>{topic.name[targetLanguage] || topic.name.en}</span>
                {!isUnlocked && <span className="text-slate-600 text-xs">🔒</span>}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {topic.words.map((word) => {
                  const mastery = wordMastery[word.id];
                  const level = isUnlocked ? getMasteryLevel(mastery) : "unknown";
                  const styles = LEVEL_STYLES[level];

                  return (
                    <button
                      key={word.id}
                      onClick={() => level !== "unknown" && setSelectedWord(word)}
                      disabled={level === "unknown"}
                      className={`${styles.bg} border ${styles.border} rounded-xl p-3 text-center transition-all ${
                        level !== "unknown" ? "active:scale-95" : "cursor-default"
                      } ${level === "mastered" ? "ring-1 ring-amber-500/30" : ""}`}
                    >
                      <span className={`text-2xl block mb-1 ${styles.emoji}`}>
                        {word.emoji}
                      </span>
                      <p className={`text-xs font-medium truncate ${styles.text}`}>
                        {level === "unknown" ? "???" : (word[targetLanguage as keyof WordEntry] as string)}
                      </p>
                      {level === "mastered" && (
                        <span className="text-[10px] text-amber-400">mastered</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Word detail modal */}
      {selectedWord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-in fade-in duration-200"
          onClick={() => setSelectedWord(null)}
        >
          <div
            className="bg-[#1a2744] rounded-2xl p-6 w-full max-w-xs border border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <span className="text-5xl block">{selectedWord.emoji}</span>
              <div>
                <p className="text-white text-xl font-bold">
                  {selectedWord[targetLanguage as keyof WordEntry] as string}
                </p>
                <p className="text-slate-400 text-sm">
                  {selectedWord[nativeLanguage as keyof WordEntry] as string}
                </p>
              </div>

              {/* Mastery stats */}
              {(() => {
                const m = wordMastery[selectedWord.id];
                const level = getMasteryLevel(m);
                if (!m) return null;
                const total = m.correct + m.wrong;
                const accuracy = total > 0 ? Math.round((m.correct / total) * 100) : 0;
                return (
                  <div className="bg-white/5 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Level</span>
                      <span className={
                        level === "mastered" ? "text-amber-400 font-bold" :
                        level === "learning" ? "text-blue-400" : "text-slate-400"
                      }>
                        {level === "mastered" ? "Mastered! 👑" :
                         level === "learning" ? "Learning" : "Seen"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Accuracy</span>
                      <span className="text-white">{accuracy}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Streak</span>
                      <span className="text-white">{m.streak} 🔥</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Correct / Wrong</span>
                      <span className="text-white">{m.correct} / {m.wrong}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => setSelectedWord(null)}
              className="w-full mt-4 text-slate-400 text-sm py-2 active:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
