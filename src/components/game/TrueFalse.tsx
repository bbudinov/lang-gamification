"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { speak } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import type { Topic, WordEntry } from "@/types";

const ROUNDS = 10;
const CORRECT_POINTS = 10;
const WRONG_PENALTY = 5;
const COMPLETION_BONUS = 40;

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
  shownTranslation: string;
  isCorrect: boolean;
}

function generateRounds(topic: Topic, targetLang: string, nativeLang: string): Round[] {
  const words = shuffle(topic.words).slice(0, ROUNDS);
  return words.map((word) => {
    const correct = Math.random() > 0.4; // ~60% correct to keep it fun
    const realTranslation = word[nativeLang as keyof WordEntry] as string;

    if (correct) {
      return { word, shownTranslation: realTranslation, isCorrect: true };
    }

    // Pick a wrong translation from another word
    const others = topic.words.filter((w) => w.id !== word.id);
    const wrongWord = others[Math.floor(Math.random() * others.length)];
    const wrongTranslation = wrongWord[nativeLang as keyof WordEntry] as string;
    return { word, shownTranslation: wrongTranslation, isCorrect: false };
  });
}

interface TrueFalseProps {
  topic: Topic;
}

export function TrueFalse({ topic }: TrueFalseProps) {
  const router = useRouter();
  const { nativeLanguage, targetLanguage, addPoints, addGameResult } =
    useProgressStore();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  useEffect(() => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setFeedback(null);
    setGameCompleted(false);
  }, [topic, targetLanguage, nativeLanguage]);

  // Speak the word when round changes
  useEffect(() => {
    if (rounds.length > 0 && currentRound < rounds.length && feedback === null) {
      const word = rounds[currentRound].word;
      const text = word[targetLanguage as keyof WordEntry] as string;
      setTimeout(() => speak(text, targetLanguage), 300);
    }
  }, [currentRound, rounds, targetLanguage, feedback]);

  const handleAnswer = useCallback(
    (userSaysTrue: boolean) => {
      if (feedback !== null || gameCompleted) return;

      const round = rounds[currentRound];
      const isRight = userSaysTrue === round.isCorrect;

      setFeedback(isRight ? "correct" : "wrong");

      if (isRight) {
        setScore((s) => s + CORRECT_POINTS);
      } else {
        setScore((s) => Math.max(0, s - WRONG_PENALTY));
        setMistakes((m) => m + 1);
      }

      setTimeout(() => {
        if (currentRound + 1 >= rounds.length) {
          const finalScore =
            (isRight ? score + CORRECT_POINTS : Math.max(0, score - WRONG_PENALTY)) +
            COMPLETION_BONUS;
          addPoints(finalScore);
          addGameResult({
            topicId: topic.id,
            gameType: "true-false",
            score: finalScore,
            maxScore: ROUNDS * CORRECT_POINTS + COMPLETION_BONUS,
            mistakes: mistakes + (isRight ? 0 : 1),
            completedAt: new Date().toISOString(),
          });
          setScore((s) => s + COMPLETION_BONUS);
          setGameCompleted(true);
        } else {
          setCurrentRound((r) => r + 1);
          setFeedback(null);
        }
      }, 1000);
    },
    [feedback, gameCompleted, rounds, currentRound, score, mistakes, topic, addPoints, addGameResult]
  );

  const handleReplay = () => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setFeedback(null);
    setGameCompleted(false);
  };

  if (rounds.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎮</div>
      </div>
    );
  }

  const round = rounds[currentRound];

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      <GameHUD topicEmoji={topic.emoji} topicName={topic.name[targetLanguage]} />

      <div className="pt-16 pb-8 px-4 flex flex-col items-center justify-center min-h-screen">
        {gameCompleted ? (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-white">Well done!</h2>
            <div className="space-y-1">
              <p className="text-amber-400 text-lg font-semibold">⭐ {score} points</p>
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
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentRound + 1) / rounds.length) * 100}%` }}
                />
              </div>
              <span className="text-slate-400 text-xs">
                {currentRound + 1}/{rounds.length}
              </span>
            </div>

            {/* Word pair display */}
            <div className="text-center space-y-4">
              <p className="text-slate-400 text-sm">Is this translation correct?</p>
              <div className="bg-white/5 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">{round.word.emoji}</span>
                  <span className="text-2xl font-bold text-white">
                    {round.word[targetLanguage as keyof WordEntry] as string}
                  </span>
                </div>
                <div className="text-slate-400 text-lg">=</div>
                <div className="text-xl font-semibold text-blue-300">
                  {round.shownTranslation}
                </div>
              </div>
            </div>

            {/* True / False buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswer(true)}
                disabled={feedback !== null}
                className={`py-5 rounded-xl text-lg font-bold transition-all ${
                  feedback !== null
                    ? feedback === "correct" && rounds[currentRound].isCorrect
                      ? "bg-green-600"
                      : feedback === "wrong" && !rounds[currentRound].isCorrect
                        ? "bg-green-600/30"
                        : "bg-white/5"
                    : "bg-green-600/80 active:scale-95"
                } text-white disabled:cursor-default`}
              >
                ✅ True
              </button>
              <button
                onClick={() => handleAnswer(false)}
                disabled={feedback !== null}
                className={`py-5 rounded-xl text-lg font-bold transition-all ${
                  feedback !== null
                    ? feedback === "correct" && !rounds[currentRound].isCorrect
                      ? "bg-red-600"
                      : feedback === "wrong" && rounds[currentRound].isCorrect
                        ? "bg-red-600/30"
                        : "bg-white/5"
                    : "bg-red-600/80 active:scale-95"
                } text-white disabled:cursor-default`}
              >
                ❌ False
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <p className={`text-center font-semibold ${feedback === "correct" ? "text-green-400" : "text-red-400"}`}>
                {feedback === "correct" ? `Correct! +${CORRECT_POINTS} pts` : `Wrong! -${WRONG_PENALTY} pts`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
