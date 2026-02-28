"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import { useProgressStore } from "@/stores/progressStore";
import { MemoryCard } from "./MemoryCard";
import { GameHUD } from "./GameHUD";
import { speak } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import { GAME_CONFIG } from "@/lib/constants";
import type { Topic, MemoryCard as MemoryCardType } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCards(topic: Topic, nativeLang: string, targetLang: string): MemoryCardType[] {
  const cfg = GAME_CONFIG.MEMORY_MATCH;
  const selected = shuffle(topic.words).slice(0, cfg.PAIRS_COUNT);

  const cards: MemoryCardType[] = [];
  for (const word of selected) {
    const nativeText = word[nativeLang as keyof typeof word] as string;
    const targetText = word[targetLang as keyof typeof word] as string;

    cards.push({
      id: `${word.id}-native`,
      text: `${word.emoji} ${nativeText}`,
      language: nativeLang as MemoryCardType["language"],
      pairId: word.id,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      id: `${word.id}-target`,
      text: `${word.emoji} ${targetText}`,
      language: targetLang as MemoryCardType["language"],
      pairId: word.id,
      isFlipped: false,
      isMatched: false,
    });
  }

  return shuffle(cards);
}

interface MemoryMatchProps {
  topic: Topic;
}

export function MemoryMatch({ topic }: MemoryMatchProps) {
  const router = useRouter();
  const cfg = GAME_CONFIG.MEMORY_MATCH;
  const { nativeLanguage, targetLanguage, addPoints, addGameResult } =
    useProgressStore();
  const {
    cards,
    flippedCards,
    isLocked,
    score,
    moves,
    matchedPairs,
    totalPairs,
    gameCompleted,
    initMemoryGame,
    flipCard,
    checkMatch,
    markMatched,
    resetFlipped,
    setLocked,
    addScore,
    completeGame,
  } = useGameStore();

  // Keep screen awake during gameplay
  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  // Initialize game
  useEffect(() => {
    const generated = generateCards(topic, nativeLanguage, targetLanguage);
    initMemoryGame(generated, cfg.PAIRS_COUNT);
  }, [topic, nativeLanguage, targetLanguage, initMemoryGame, cfg.PAIRS_COUNT]);

  // Check for match when 2 cards are flipped
  useEffect(() => {
    if (flippedCards.length !== 2) return;

    setLocked(true);

    const result = checkMatch();
    if (!result) {
      setLocked(false);
      return;
    }

    if (result.isMatch) {
      // Find the matched word to speak it
      const matchedWord = topic.words.find((w) => w.id === result.pairId);
      if (matchedWord) {
        speak(
          matchedWord[targetLanguage] as string,
          targetLanguage
        );
      }

      addScore(cfg.MATCH_POINTS);
      setTimeout(() => {
        markMatched(result.pairId);
        setLocked(false);
      }, 400);
    } else {
      addScore(-cfg.MISMATCH_PENALTY);
      setTimeout(() => {
        resetFlipped();
        setLocked(false);
      }, cfg.FLIP_DELAY_MS);
    }
  }, [flippedCards.length]);

  // Check for game completion
  useEffect(() => {
    if (totalPairs > 0 && matchedPairs === totalPairs && !gameCompleted) {
      const finalScore = score + cfg.COMPLETION_BONUS;
      addScore(cfg.COMPLETION_BONUS);
      addPoints(finalScore);
      addGameResult({
        topicId: topic.id,
        gameType: "memory-match",
        score: finalScore,
        maxScore: cfg.PAIRS_COUNT * cfg.MATCH_POINTS + cfg.COMPLETION_BONUS,
        mistakes: moves - matchedPairs,
        completedAt: new Date().toISOString(),
      });
      completeGame();
    }
  }, [matchedPairs, totalPairs, gameCompleted]);

  const handleReplay = () => {
    const generated = generateCards(topic, nativeLanguage, targetLanguage);
    initMemoryGame(generated, cfg.PAIRS_COUNT);
  };

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎮</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      <GameHUD
        topicEmoji={topic.emoji}
        topicName={topic.name[targetLanguage]}
      />

      <div className="pt-16 pb-8 px-4 flex flex-col items-center justify-center min-h-screen">
        {gameCompleted ? (
          <div className="text-center space-y-4 animate-in fade-in">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-white">Well done!</h2>
            <div className="space-y-1">
              <p className="text-amber-400 text-lg font-semibold">
                ⭐ {score} points
              </p>
              <p className="text-slate-400 text-sm">
                {moves} moves · {moves - totalPairs} mistakes
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={handleReplay}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium active:bg-blue-700 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push("/map")}
                className="bg-white/10 text-white px-6 py-2.5 rounded-full font-medium active:bg-white/20 transition-colors"
              >
                Back to Map
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm">
            {cards.map((card) => (
              <MemoryCard
                key={card.id}
                card={card}
                onFlip={flipCard}
                disabled={isLocked}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
