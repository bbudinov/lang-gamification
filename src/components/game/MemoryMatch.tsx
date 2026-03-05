"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import { useProgressStore } from "@/stores/progressStore";
import { MemoryCard } from "./MemoryCard";
import { MatchPopup } from "./MatchPopup";
import { GameHUD } from "./GameHUD";
import { playWordAudio, playPopSound, playDingSound } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import { GAME_CONFIG } from "@/lib/constants";
import { selectAdaptiveWords } from "@/lib/adaptive";
import type { Topic, MemoryCard as MemoryCardType, WordMastery } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCards(topic: Topic, nativeLang: string, targetLang: string, mastery: Record<string, WordMastery>, pairsCount: number): MemoryCardType[] {
  const selected = selectAdaptiveWords(topic.words, mastery, pairsCount);

  const cards: MemoryCardType[] = [];
  for (const word of selected) {
    const nativeText = word[nativeLang as keyof typeof word] as string;
    const targetText = word[targetLang as keyof typeof word] as string;

    cards.push({
      id: `${word.id}-native`,
      text: nativeText,
      emoji: word.emoji,
      language: nativeLang as MemoryCardType["language"],
      pairId: word.id,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      id: `${word.id}-target`,
      text: targetText,
      emoji: word.emoji,
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
  isMix?: boolean;
}

// Determine pairs count for Memory Mix based on play count
function getMixPairsCount(): { pairs: number; cols: number } {
  const results = useProgressStore.getState().gameResults;
  const mixPlays = results.filter((r) => r.gameType === "memory-mix").length;

  if (mixPlays >= 4) return { pairs: 8, cols: 4 }; // 16 cards, 4×4
  if (mixPlays >= 2) return { pairs: 7, cols: 4 }; // 14 cards, ~4×4
  return { pairs: 6, cols: 3 };                      // 12 cards, 3×4
}

// Determine pairs count based on how many times Memory was played for this topic
function getPairsCount(topicId: string): { pairs: number; cols: number } {
  const results = useProgressStore.getState().gameResults;
  const memoryPlays = results.filter(
    (r) => r.topicId === topicId && r.gameType === "memory-match"
  ).length;

  if (memoryPlays >= 4) return { pairs: 8, cols: 4 }; // 16 cards, 4×4
  if (memoryPlays >= 2) return { pairs: 6, cols: 3 }; // 12 cards, 3×4
  return { pairs: 4, cols: 4 };                        //  8 cards, 4×2
}

export function MemoryMatch({ topic, isMix = false }: MemoryMatchProps) {
  const router = useRouter();
  const cfg = GAME_CONFIG.MEMORY_MATCH;
  const { nativeLanguage, targetLanguage, addPoints, addGameResult, updateWordMastery, wordMastery } =
    useProgressStore();
  const [difficulty, setDifficulty] = useState(() =>
    isMix ? getMixPairsCount() : getPairsCount(topic.id)
  );
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

  const [shakingPair, setShakingPair] = useState<string | null>(null);
  const [matchPopup, setMatchPopup] = useState<{ emoji: string; word: string } | null>(null);

  // Keep screen awake during gameplay
  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  // Initialize game
  useEffect(() => {
    const generated = generateCards(topic, nativeLanguage, targetLanguage, wordMastery, difficulty.pairs);
    initMemoryGame(generated, difficulty.pairs);
  }, [topic, nativeLanguage, targetLanguage, initMemoryGame, difficulty.pairs]);

  // Handle card flip sound
  const handleFlip = (cardId: string) => {
    playPopSound();
    flipCard(cardId);
  };

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
      // Match found!
      playDingSound();
      updateWordMastery(result.pairId, true);
      const matchedWord = topic.words.find((w) => w.id === result.pairId);
      if (matchedWord) {
        const targetText = matchedWord[targetLanguage as keyof typeof matchedWord] as string;
        setMatchPopup({ emoji: matchedWord.emoji, word: targetText });
        setTimeout(() => playWordAudio(matchedWord.id, targetLanguage), 300);
      }

      addScore(cfg.MATCH_POINTS);
      setTimeout(() => {
        markMatched(result.pairId);
        setLocked(false);
      }, 600);
    } else {
      // Mismatch — shake the cards
      addScore(-cfg.MISMATCH_PENALTY);

      // Find which pair ID the flipped cards belong to (for shake)
      const flippedCardObjs = cards.filter((c) => flippedCards.includes(c.id));
      if (flippedCardObjs.length === 2) {
        // Use a unique key to trigger shake
        setShakingPair(flippedCardObjs.map((c) => c.id).join(","));
      }

      setTimeout(() => {
        resetFlipped();
        setShakingPair(null);
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
        topicId: isMix ? "memory-mix" : topic.id,
        gameType: isMix ? "memory-mix" : "memory-match",
        score: finalScore,
        maxScore: difficulty.pairs * cfg.MATCH_POINTS + cfg.COMPLETION_BONUS,
        mistakes: moves - matchedPairs,
        completedAt: new Date().toISOString(),
      });
      completeGame();
    }
  }, [matchedPairs, totalPairs, gameCompleted]);

  const handleReplay = () => {
    // Recalculate difficulty (play count increased after last game)
    const newDifficulty = isMix ? getMixPairsCount() : getPairsCount(topic.id);
    setDifficulty(newDifficulty);
    const generated = generateCards(topic, nativeLanguage, targetLanguage, wordMastery, newDifficulty.pairs);
    initMemoryGame(generated, newDifficulty.pairs);
    setShakingPair(null);
    setMatchPopup(null);
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

      {matchPopup && (
        <MatchPopup
          emoji={matchPopup.emoji}
          word={matchPopup.word}
          onDone={() => setMatchPopup(null)}
        />
      )}

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
          <div
            className="grid gap-2.5 w-full max-w-sm"
            style={{ gridTemplateColumns: `repeat(${difficulty.cols}, minmax(0, 1fr))` }}
          >
            {cards.map((card) => (
              <MemoryCard
                key={card.id}
                card={card}
                onFlip={handleFlip}
                disabled={isLocked}
                shaking={shakingPair?.includes(card.id) ?? false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
