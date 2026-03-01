"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { MatchPopup } from "./MatchPopup";
import { playWordAudio, playPopSound, playDingSound, playBuzzSound } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import { selectAdaptiveWords } from "@/lib/adaptive";
import type { Topic, WordEntry } from "@/types";

const ROUNDS = 8;
const CORRECT_POINTS = 15;
const WRONG_PENALTY = 5;
const COMPLETION_BONUS = 60;
const OPTIONS_COUNT = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Round {
  word: WordEntry;
  options: string[];
  correctIndex: number;
}

function generateRounds(topic: Topic, targetLang: string, nativeLang: string, mastery: Record<string, import("@/types").WordMastery>): Round[] {
  const words = selectAdaptiveWords(topic.words, mastery, ROUNDS);
  return words.map((word) => {
    const correctAnswer = word[nativeLang as keyof WordEntry] as string;
    const wrongWords = shuffle(
      topic.words.filter((w) => w.id !== word.id)
    ).slice(0, OPTIONS_COUNT - 1);
    const wrongAnswers = wrongWords.map(
      (w) => w[nativeLang as keyof WordEntry] as string
    );

    const options = shuffle([correctAnswer, ...wrongAnswers]);
    return {
      word,
      options,
      correctIndex: options.indexOf(correctAnswer),
    };
  });
}

interface WordQuizProps {
  topic: Topic;
}

export function WordQuiz({ topic }: WordQuizProps) {
  const router = useRouter();
  const { nativeLanguage, targetLanguage, addPoints, addGameResult, updateWordMastery, wordMastery } =
    useProgressStore();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [popup, setPopup] = useState<{ emoji: string; word: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [roundKey, setRoundKey] = useState(0);

  // Wake lock
  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  // Generate rounds
  useEffect(() => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage, wordMastery);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setIsCorrect(null);
    setGameCompleted(false);
    setPopup(null);
    setRoundKey(0);
  }, [topic, targetLanguage, nativeLanguage]);

  // Speak the word when round changes
  useEffect(() => {
    if (rounds.length > 0 && currentRound < rounds.length && selected === null) {
      const word = rounds[currentRound].word;
      setTimeout(() => playWordAudio(word.id, targetLanguage), 300);
    }
  }, [currentRound, rounds, targetLanguage, selected]);

  const handleSelect = useCallback(
    (index: number) => {
      if (selected !== null || gameCompleted) return;

      playPopSound();
      const round = rounds[currentRound];
      const correct = index === round.correctIndex;

      setSelected(index);
      setIsCorrect(correct);

      updateWordMastery(round.word.id, correct);

      if (correct) {
        playDingSound();
        setScore((s) => s + CORRECT_POINTS);

        // Show popup
        const targetText = round.word[targetLanguage as keyof WordEntry] as string;
        setPopup({ emoji: round.word.emoji, word: targetText });
        setTimeout(() => playWordAudio(round.word.id, targetLanguage), 300);
      } else {
        playBuzzSound();
        setScore((s) => Math.max(0, s - WRONG_PENALTY));
        setMistakes((m) => m + 1);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }

      // Move to next round after delay
      setTimeout(() => {
        if (currentRound + 1 >= rounds.length) {
          const finalScore = (correct ? score + CORRECT_POINTS : Math.max(0, score - WRONG_PENALTY)) + COMPLETION_BONUS;
          addPoints(finalScore);
          addGameResult({
            topicId: topic.id,
            gameType: "listen-choose",
            score: finalScore,
            maxScore: ROUNDS * CORRECT_POINTS + COMPLETION_BONUS,
            mistakes: mistakes + (correct ? 0 : 1),
            completedAt: new Date().toISOString(),
          });
          setScore((s) => s + COMPLETION_BONUS);
          setGameCompleted(true);
        } else {
          setCurrentRound((r) => r + 1);
          setRoundKey((k) => k + 1);
          setSelected(null);
          setIsCorrect(null);
        }
      }, 1500);
    },
    [selected, gameCompleted, rounds, currentRound, score, mistakes, targetLanguage, topic, addPoints, addGameResult, updateWordMastery]
  );

  const handleReplay = () => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage, wordMastery);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setIsCorrect(null);
    setGameCompleted(false);
    setPopup(null);
    setRoundKey(0);
  };

  const handleSpeak = () => {
    if (rounds.length > 0 && currentRound < rounds.length) {
      const word = rounds[currentRound].word;
      playWordAudio(word.id, targetLanguage);
    }
  };

  if (rounds.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎮</div>
      </div>
    );
  }

  const round = rounds[currentRound];
  const progressPct = ((currentRound + (selected !== null ? 1 : 0)) / rounds.length) * 100;

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      <GameHUD
        topicEmoji={topic.emoji}
        topicName={topic.name[targetLanguage]}
      />

      {popup && (
        <MatchPopup
          emoji={popup.emoji}
          word={popup.word}
          onDone={() => setPopup(null)}
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
                {ROUNDS} questions · {mistakes} mistakes
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
          <div className="w-full max-w-sm space-y-8">
            {/* Progress bar with walking emoji */}
            <div className="flex items-center gap-2 relative">
              <div className="flex-1 bg-white/10 rounded-full h-3 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span
                className="absolute text-lg transition-all duration-700 ease-out -top-5"
                style={{
                  left: `calc(${Math.min(progressPct, 95)}% - 8px)`,
                  animation: "quiz-walk 0.4s ease-in-out infinite",
                }}
              >
                {topic.emoji}
              </span>
              <span className="text-slate-400 text-xs min-w-[32px] text-right">
                {currentRound + 1}/{rounds.length}
              </span>
            </div>

            {/* Score display */}
            <div className="text-center">
              <span className="text-amber-400 font-bold text-sm">⭐ {score}</span>
            </div>

            {/* Floating word display */}
            <div className={`text-center space-y-3 ${shaking ? "quiz-shake" : ""}`}>
              <p className="text-slate-400 text-sm">What does this mean?</p>
              <div className="quiz-float flex items-center justify-center gap-3 py-4">
                {isCorrect && (
                  <span className="text-5xl drop-shadow-lg animate-in zoom-in duration-300">{round.word.emoji}</span>
                )}
                <span className="text-3xl font-bold text-white drop-shadow-md">
                  {round.word[targetLanguage as keyof WordEntry] as string}
                </span>
              </div>
              <button
                onClick={handleSpeak}
                className="text-blue-400 text-sm active:text-blue-300 transition-colors bg-blue-400/10 px-4 py-1.5 rounded-full"
              >
                🔊 Listen again
              </button>
            </div>

            {/* Options with staggered slide-in */}
            <div className="grid grid-cols-1 gap-3" key={roundKey}>
              {round.options.map((option, index) => {
                let styles = "bg-white/8 border-white/10 active:bg-white/15 active:scale-[0.98]";
                let icon = "";

                if (selected !== null) {
                  if (index === round.correctIndex) {
                    styles = "bg-green-600/30 border-green-400/60 scale-[1.02]";
                    icon = "✅ ";
                  } else if (index === selected && !isCorrect) {
                    styles = "bg-red-600/30 border-red-400/60 quiz-shake";
                    icon = "❌ ";
                  } else {
                    styles = "bg-white/3 border-white/5 opacity-50";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    disabled={selected !== null}
                    className={`${styles} text-white text-lg font-medium py-4 px-6 rounded-2xl transition-all duration-300 disabled:cursor-default border-2`}
                    style={{
                      animation: `quiz-option-in 0.3s ease-out ${index * 60}ms both`,
                    }}
                  >
                    {icon}{option}
                  </button>
                );
              })}
            </div>

            {/* Feedback text */}
            {selected !== null && (
              <div className="text-center animate-in fade-in duration-300">
                {isCorrect ? (
                  <p className="text-green-400 font-semibold text-lg">
                    Correct! +{CORRECT_POINTS} pts 🎉
                  </p>
                ) : (
                  <p className="text-red-400 font-semibold">
                    The answer is: <span className="text-white">{round.options[round.correctIndex]}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
