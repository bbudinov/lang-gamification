"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { playWordAudio } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
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

function generateRounds(topic: Topic, targetLang: string, nativeLang: string): Round[] {
  const words = shuffle(topic.words).slice(0, ROUNDS);
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
  const { nativeLanguage, targetLanguage, addPoints, addGameResult } =
    useProgressStore();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Wake lock
  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  // Generate rounds
  useEffect(() => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setIsCorrect(null);
    setGameCompleted(false);
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

      const round = rounds[currentRound];
      const correct = index === round.correctIndex;

      setSelected(index);
      setIsCorrect(correct);

      if (correct) {
        setScore((s) => s + CORRECT_POINTS);
        playWordAudio(round.word.id, targetLanguage);
      } else {
        setScore((s) => Math.max(0, s - WRONG_PENALTY));
        setMistakes((m) => m + 1);
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
          setSelected(null);
          setIsCorrect(null);
        }
      }, 1200);
    },
    [selected, gameCompleted, rounds, currentRound, score, mistakes, targetLanguage, topic, addPoints, addGameResult]
  );

  const handleReplay = () => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setIsCorrect(null);
    setGameCompleted(false);
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

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      <GameHUD
        topicEmoji={topic.emoji}
        topicName={topic.name[targetLanguage]}
      />

      <div className="pt-16 pb-8 px-4 flex flex-col items-center justify-center min-h-screen">
        {gameCompleted ? (
          <div className="text-center space-y-4">
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
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentRound + 1) / rounds.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-slate-400 text-xs">
                {currentRound + 1}/{rounds.length}
              </span>
            </div>

            {/* Word display */}
            <div className="text-center space-y-3">
              <p className="text-slate-400 text-sm">What does this mean?</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">{round.word.emoji}</span>
                <span className="text-2xl font-bold text-white">
                  {round.word[targetLanguage as keyof WordEntry] as string}
                </span>
              </div>
              <button
                onClick={handleSpeak}
                className="text-blue-400 text-sm active:text-blue-300 transition-colors"
              >
                🔊 Listen again
              </button>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {round.options.map((option, index) => {
                let bg = "bg-white/10 active:bg-white/20";
                if (selected !== null) {
                  if (index === round.correctIndex) {
                    bg = "bg-green-600/80";
                  } else if (index === selected && !isCorrect) {
                    bg = "bg-red-600/80";
                  } else {
                    bg = "bg-white/5";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    disabled={selected !== null}
                    className={`${bg} text-white text-lg font-medium py-4 px-6 rounded-xl transition-all disabled:cursor-default ${
                      selected === null ? "active:scale-[0.98]" : ""
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {selected !== null && (
              <div className="text-center">
                {isCorrect ? (
                  <p className="text-green-400 font-semibold">Correct! +{CORRECT_POINTS} pts</p>
                ) : (
                  <p className="text-red-400 font-semibold">
                    Wrong! The answer is: {round.options[round.correctIndex]}
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
