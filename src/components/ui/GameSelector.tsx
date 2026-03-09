"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { playPhraseAudioAndWait, playPopSound } from "@/lib/speech";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { StarsBadge } from "@/components/game/StarDisplay";
import { useProgressStore } from "@/stores/progressStore";
import { getTopicPhrases } from "@/data/phrases";
import { getNPC } from "@/data/npcs";
import { LEVELS } from "@/lib/levels";
import type { TopicId, GameType, LevelNumber } from "@/types";

const PHRASE_IDS = [
  "motiv1", "motiv2", "motiv3", "motiv4",
  "motiv5", "motiv6", "motiv7", "motiv8",
];

let phraseIndex = 0;

interface GameSelectorProps {
  topicId: TopicId;
  topicName: string;
  topicEmoji: string;
  onClose: () => void;
}

const GAME_META: Record<string, { name: string; emoji: string; description: string; requiresPhrases?: boolean; requiresNPC?: boolean }> = {
  "memory-match":  { name: "Memory Match",    emoji: "🃏", description: "Flip cards and find matching pairs" },
  "word-quiz":     { name: "Word Quiz",        emoji: "🎯", description: "Listen and pick the right translation" },
  "true-false":    { name: "True or False",    emoji: "✅", description: "Is this translation correct?" },
  "word-scramble": { name: "Word Scramble",    emoji: "🔤", description: "Unscramble letters to spell the word" },
  "fill-scene":    { name: "Fill the Scene",   emoji: "🎬", description: "Complete sentences in real situations", requiresPhrases: true },
  "say-it":        { name: "Say It!",          emoji: "🎤", description: "Practice saying words out loud" },
  "listen-repeat": { name: "Listen & Repeat",  emoji: "🗣️", description: "Repeat phrases after Professor Globe", requiresPhrases: true },
  "npc-talk":      { name: "NPC Talk",         emoji: "💬", description: "Chat with a character using AI", requiresNPC: true },
};

export function GameSelector({ topicId, topicName, topicEmoji, onClose }: GameSelectorProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [globeSpeaking, setGlobeSpeaking] = useState(false);
  const { getTopicLevelProgress } = useProgressStore();
  const hasPhrases = getTopicPhrases(topicId).length > 0;
  const hasNPC = !!getNPC(topicId);

  const handleGameSelect = async (gameType: string) => {
    if (navigating) return;
    setNavigating(true);
    playPopSound();

    const phraseId = PHRASE_IDS[phraseIndex % PHRASE_IDS.length];
    phraseIndex++;

    setGlobeSpeaking(true);
    await playPhraseAudioAndWait(phraseId, 3000);
    setGlobeSpeaking(false);
    router.push(`/game/${topicId}/${gameType}`);
  };

  const isGameAvailable = (gameType: string): boolean => {
    const meta = GAME_META[gameType];
    if (!meta) return false;
    if (meta.requiresPhrases && !hasPhrases) return false;
    if (meta.requiresNPC && !hasNPC) return false;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#1a2744]/95 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="flex flex-col items-center mb-1">
            <ProfessorGlobe size={72} expandOnSpeak speaking={globeSpeaking} emotion={navigating ? "happy" : "idle"} />
            <span className="text-3xl mt-1">{topicEmoji}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{topicName}</h2>
          <p className="text-slate-400 text-xs mt-1">
            Complete 2 games per level to unlock the next one!
          </p>
        </div>

        <div className="space-y-4">
          {LEVELS.map((level) => {
            const progress = getTopicLevelProgress(topicId, level.number);
            const isLocked = !progress.unlocked;
            const availableGamesCount = level.games.filter((g) => isGameAvailable(g)).length;

            // Progress hint text
            let hintText = "";
            if (!isLocked && !progress.completed) {
              const gamesNeeded = Math.max(0, 2 - progress.gamesCompleted);
              if (gamesNeeded > 0) {
                hintText = `Play ${gamesNeeded} more game${gamesNeeded > 1 ? "s" : ""}`;
              } else if (progress.avgScorePercent < 50) {
                hintText = "Improve your score!";
              }
            }

            return (
              <div key={level.number}>
                {/* Level header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{
                      backgroundColor: isLocked ? "#4b5563" : progress.completed ? level.color : level.color,
                      opacity: isLocked ? 0.4 : 1,
                    }}
                  />
                  <span className="text-base">{level.emoji}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: isLocked ? "#6b7280" : "#fff" }}
                  >
                    {level.name}
                  </span>
                  <span className="text-slate-500 text-xs">{level.description}</span>
                  <div className="flex-1" />
                  {isLocked && <span className="text-xs text-slate-600">🔒</span>}
                  {progress.completed && <span className="text-xs text-green-400">✓</span>}
                </div>

                {/* Lock message */}
                {isLocked && (
                  <p className="text-slate-600 text-xs ml-7 mb-2">
                    Complete Level {level.number - 1} to unlock
                  </p>
                )}

                {/* Progress hint */}
                {!isLocked && !progress.completed && hintText && (
                  <p className="text-xs ml-7 mb-1.5" style={{ color: level.color }}>
                    {hintText}
                  </p>
                )}

                {/* Games */}
                <div className="space-y-1.5 ml-3">
                  {level.games.map((gameType) => {
                    const meta = GAME_META[gameType];
                    if (!meta) return null;

                    const available = isGameAvailable(gameType);
                    const disabled = navigating || isLocked || !available;

                    // Find best result for this game
                    const bestResult = !isLocked
                      ? useProgressStore.getState().gameResults
                          .filter((r) => r.topicId === topicId && r.gameType === gameType)
                          .reduce<{ score: number; maxScore: number } | null>((best, r) => {
                            const pct = r.maxScore > 0 ? r.score / r.maxScore : 0;
                            const bestPct = best ? best.score / best.maxScore : 0;
                            return !best || pct > bestPct ? r : best;
                          }, null)
                      : null;

                    return (
                      <button
                        key={gameType}
                        onClick={() => !disabled && handleGameSelect(gameType)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all text-left ${
                          disabled
                            ? "opacity-30 cursor-default"
                            : "bg-white/5 hover:bg-white/10 active:bg-white/15"
                        }`}
                      >
                        <span className={`text-2xl ${isLocked ? "grayscale" : ""}`}>{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isLocked ? "text-slate-600" : "text-white"}`}>
                            {meta.name}
                          </p>
                          <p className="text-slate-500 text-xs truncate">{meta.description}</p>
                        </div>
                        {bestResult && !isLocked && (
                          <StarsBadge score={bestResult.score} maxScore={bestResult.maxScore} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-slate-400 text-sm py-2 active:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
