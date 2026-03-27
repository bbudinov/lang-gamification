"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WORLDS, type World } from "@/data/worlds";
import { topics } from "@/data/words";
import { useProgressStore } from "@/stores/progressStore";
import type { WorldId, Language, WordEntry } from "@/types";

/** Toggle world unlock gating — set to true when ready for production */
export const WORLD_UNLOCK_ENABLED = false;

interface QuizWord {
  word: WordEntry;
  topicEmoji: string;
}

interface QuizQuestion {
  quizWord: QuizWord;
  correctAnswer: string;
  options: string[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateQuestions(
  worldTopicIds: string[],
  nativeLang: Language,
  targetLang: Language,
  allWordsPool: WordEntry[]
): QuizQuestion[] {
  // Get all words from topics in this world
  const worldWords: QuizWord[] = [];
  for (const t of topics) {
    if (!worldTopicIds.includes(t.id)) continue;
    for (const w of t.words) {
      worldWords.push({ word: w, topicEmoji: t.emoji });
    }
  }

  if (worldWords.length === 0) return [];

  const shuffledWords = shuffleArray(worldWords);

  return shuffledWords.map((qw) => {
    const correctAnswer = qw.word[nativeLang];
    const targetWord = qw.word[targetLang];

    // Pick 3 wrong answers from the full word pool (different from correct)
    const wrongPool = allWordsPool
      .filter((w) => w[nativeLang] !== correctAnswer && w[targetLang] !== targetWord)
      .map((w) => w[nativeLang]);

    const uniqueWrong = [...new Set(wrongPool)];
    const shuffledWrong = shuffleArray(uniqueWrong).slice(0, 3);

    // If not enough wrong answers, pad with placeholder
    while (shuffledWrong.length < 3) {
      shuffledWrong.push("---");
    }

    const options = shuffleArray([correctAnswer, ...shuffledWrong]);

    return { quizWord: qw, correctAnswer, options };
  });
}

function WorldExamContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const worldId = searchParams.get("world") as WorldId | null;

  const {
    nativeLanguage,
    targetLanguage,
    addPoints,
    addCoins,
    gameResults,
    unlockedWorlds,
    unlockWorld,
  } = useProgressStore();

  const world = WORLDS.find((w) => w.id === worldId);

  // Collect ALL words from all topics for wrong-answer pool
  const allWords = useMemo(() => topics.flatMap((t) => t.words), []);

  // Generate questions once
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [rewardGiven, setRewardGiven] = useState(false);
  const [showWorldPicker, setShowWorldPicker] = useState(false);

  // Initialize questions
  useEffect(() => {
    if (world) {
      const qs = generateQuestions(
        world.topicIds,
        nativeLanguage,
        targetLanguage,
        allWords
      );
      setQuestions(qs);
      setCurrentIndex(0);
      setCorrectCount(0);
      setSelectedOption(null);
      setShowResult(false);
      setExamFinished(false);
      setRewardGiven(false);
      setShowWorldPicker(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world?.id]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] ?? null;
  const passed = totalQuestions > 0 && (correctCount / totalQuestions) >= 0.85;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleOptionSelect = useCallback(
    (option: string) => {
      if (selectedOption !== null || !currentQuestion) return;

      setSelectedOption(option);
      const isCorrect = option === currentQuestion.correctAnswer;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      }

      // Auto-advance after delay
      setTimeout(() => {
        if (currentIndex + 1 >= totalQuestions) {
          setExamFinished(true);
        } else {
          setCurrentIndex((i) => i + 1);
          setSelectedOption(null);
        }
      }, 800);
    },
    [selectedOption, currentQuestion, currentIndex, totalQuestions]
  );

  const handleClaimReward = useCallback(() => {
    if (!rewardGiven && passed) {
      addPoints(200);
      addCoins(100);
      setRewardGiven(true);
      if (WORLD_UNLOCK_ENABLED) {
        setShowWorldPicker(true);
      }
    }
  }, [rewardGiven, passed, addPoints, addCoins]);

  const handleUnlockWorld = useCallback(
    (wId: WorldId) => {
      unlockWorld(wId);
      setShowWorldPicker(false);
      router.push("/map");
    },
    [unlockWorld, router]
  );

  const handleRetry = useCallback(() => {
    if (world) {
      const qs = generateQuestions(
        world.topicIds,
        nativeLanguage,
        targetLanguage,
        allWords
      );
      setQuestions(qs);
      setCurrentIndex(0);
      setCorrectCount(0);
      setSelectedOption(null);
      setShowResult(false);
      setExamFinished(false);
      setRewardGiven(false);
      setShowWorldPicker(false);
    }
  }, [world, nativeLanguage, targetLanguage, allWords]);

  // Error state
  if (!worldId || !world) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl mb-4">World not found</p>
          <button
            onClick={() => router.push("/map")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl mb-2">No words found for this world</p>
          <p className="text-slate-400 text-sm mb-4">This world needs word data to generate an exam.</p>
          <button
            onClick={() => router.push("/map")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // --- WORLD PICKER MODAL ---
  if (showWorldPicker) {
    const currentlyUnlocked = unlockedWorlds;
    const lockedWorlds = WORLDS.filter((w) => !currentlyUnlocked.includes(w.id));

    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#1a2744]/95 rounded-2xl p-6 w-full max-w-sm border border-white/10 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Choose a World to Unlock!
          </h2>
          <p className="text-slate-400 text-sm text-center mb-4">
            Pick one world to unlock next
          </p>

          {lockedWorlds.length === 0 ? (
            <div className="text-center">
              <p className="text-green-400 text-lg mb-4">All worlds are unlocked!</p>
              <button
                onClick={() => router.push("/map")}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold w-full"
              >
                Back to Map
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lockedWorlds.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleUnlockWorld(w.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/15 transition-all"
                >
                  <span className="text-3xl">{w.emoji}</span>
                  <span className="text-white text-sm font-semibold">
                    {w.name[nativeLanguage] || w.name.en}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RESULTS SCREEN ---
  if (examFinished) {
    const stars = scorePercent >= 95 ? 3 : scorePercent >= 85 ? 2 : scorePercent >= 70 ? 1 : 0;

    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#1a2744]/95 rounded-2xl p-6 w-full max-w-sm border border-white/10 text-center">
          <div className="text-4xl mb-2">
            {passed ? "🎉" : "📚"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {passed ? "Congratulations!" : "Keep Practicing!"}
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            {world.emoji} {world.name[nativeLanguage] || world.name.en} World Exam
          </p>

          {/* Score */}
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <div className="text-4xl font-bold mb-1" style={{ color: passed ? "#22c55e" : "#f59e0b" }}>
              {scorePercent}%
            </div>
            <p className="text-slate-400 text-sm">
              {correctCount} / {totalQuestions} correct
            </p>
            {/* Stars */}
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`text-2xl transition-all ${s <= stars ? "opacity-100" : "opacity-20"}`}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>

          {passed ? (
            <>
              {!rewardGiven ? (
                <button
                  onClick={handleClaimReward}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white py-3 rounded-xl font-bold text-lg active:opacity-80 transition-opacity mb-3"
                >
                  Claim Reward! (+200 XP, +100 Coins)
                </button>
              ) : !WORLD_UNLOCK_ENABLED ? (
                <div>
                  <p className="text-green-400 text-sm mb-3">Rewards claimed!</p>
                  <button
                    onClick={() => router.push("/map")}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
                  >
                    Back to Map
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-amber-400 text-sm mb-4">
                You need 85% to pass. Keep practicing the words!
              </p>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-2"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/map")}
                className="w-full text-slate-400 text-sm py-2"
              >
                Back to Map
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- QUIZ SCREEN ---
  const progressPercent = ((currentIndex) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Top bar */}
      <div className="safe-area px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.push("/map")}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20"
          >
            ✕
          </button>
          <div className="flex-1">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${world.themeColor}, ${world.themeColor}cc)`,
                }}
              />
            </div>
          </div>
          <span className="text-white/60 text-xs font-mono min-w-[3rem] text-right">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-xs">
            {world.emoji} {world.name[nativeLanguage] || world.name.en} — World Exam
          </p>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {currentQuestion && (
          <>
            {/* Word card */}
            <div className="bg-[#1a2744]/80 rounded-2xl p-6 w-full max-w-sm border border-white/10 mb-6 text-center">
              <span className="text-5xl mb-3 block">
                {currentQuestion.quizWord.word.emoji}
              </span>
              <p className="text-2xl font-bold text-white">
                {currentQuestion.quizWord.word[targetLanguage]}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                What does this mean?
              </p>
            </div>

            {/* Answer options */}
            <div className="w-full max-w-sm space-y-2.5">
              {currentQuestion.options.map((option, i) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                const showFeedback = selectedOption !== null;

                let bgClass = "bg-white/5 border-white/10 active:bg-white/15";
                if (showFeedback) {
                  if (isCorrect) {
                    bgClass = "bg-green-500/20 border-green-500/50";
                  } else if (isSelected && !isCorrect) {
                    bgClass = "bg-red-500/20 border-red-500/50";
                  } else {
                    bgClass = "bg-white/5 border-white/5 opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(option)}
                    disabled={selectedOption !== null}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${bgClass}`}
                  >
                    <span className={`font-semibold ${showFeedback && isCorrect ? "text-green-400" : showFeedback && isSelected && !isCorrect ? "text-red-400" : "text-white"}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WorldExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><p className="text-white">Loading exam...</p></div>}>
      <WorldExamContent />
    </Suspense>
  );
}
