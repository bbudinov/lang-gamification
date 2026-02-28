"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { speak } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import type { Topic, WordEntry } from "@/types";

const ROUNDS = 6;
const CORRECT_POINTS = 20;
const WRONG_TAP_PENALTY = 3;
const COMPLETION_BONUS = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ScrambleLetter {
  char: string;
  originalIndex: number;
  used: boolean;
}

interface WordScrambleProps {
  topic: Topic;
}

export function WordScramble({ topic }: WordScrambleProps) {
  const router = useRouter();
  const { nativeLanguage, targetLanguage, addPoints, addGameResult } =
    useProgressStore();

  const [words, setWords] = useState<WordEntry[]>([]);
  const [currentWord, setCurrentWord] = useState(0);
  const [scrambled, setScrambled] = useState<ScrambleLetter[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongTap, setWrongTap] = useState(false);
  const [wordComplete, setWordComplete] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  const initRound = useCallback(
    (word: WordEntry) => {
      const targetText = (word[targetLanguage as keyof WordEntry] as string).toLowerCase();
      setTarget(targetText);
      setBuilt([]);
      setWordComplete(false);
      setWrongTap(false);

      const letters: ScrambleLetter[] = targetText.split("").map((char, i) => ({
        char,
        originalIndex: i,
        used: false,
      }));
      setScrambled(shuffle(letters));
    },
    [targetLanguage]
  );

  useEffect(() => {
    const selected = shuffle(topic.words).slice(0, ROUNDS);
    setWords(selected);
    setCurrentWord(0);
    setScore(0);
    setMistakes(0);
    setGameCompleted(false);
    if (selected.length > 0) initRound(selected[0]);
  }, [topic, targetLanguage, nativeLanguage, initRound]);

  // Speak the hint word
  useEffect(() => {
    if (words.length > 0 && currentWord < words.length && !wordComplete) {
      const word = words[currentWord];
      const nativeText = word[nativeLanguage as keyof WordEntry] as string;
      setTimeout(() => speak(nativeText, nativeLanguage), 300);
    }
  }, [currentWord, words, nativeLanguage, wordComplete]);

  const handleLetterTap = (index: number) => {
    if (wordComplete || gameCompleted) return;

    const letter = scrambled[index];
    if (letter.used) return;

    const expectedChar = target[built.length];

    if (letter.char === expectedChar) {
      const newBuilt = [...built, letter.char];
      setBuilt(newBuilt);
      setScrambled((prev) =>
        prev.map((l, i) => (i === index ? { ...l, used: true } : l))
      );
      setWrongTap(false);

      if (newBuilt.length === target.length) {
        setWordComplete(true);
        setScore((s) => s + CORRECT_POINTS);
        speak(target, targetLanguage);

        setTimeout(() => {
          if (currentWord + 1 >= words.length) {
            const finalScore = score + CORRECT_POINTS + COMPLETION_BONUS;
            addPoints(finalScore);
            addGameResult({
              topicId: topic.id,
              gameType: "word-scramble",
              score: finalScore,
              maxScore: ROUNDS * CORRECT_POINTS + COMPLETION_BONUS,
              mistakes,
              completedAt: new Date().toISOString(),
            });
            setScore((s) => s + COMPLETION_BONUS);
            setGameCompleted(true);
          } else {
            const next = currentWord + 1;
            setCurrentWord(next);
            initRound(words[next]);
          }
        }, 1200);
      }
    } else {
      setWrongTap(true);
      setMistakes((m) => m + 1);
      setScore((s) => Math.max(0, s - WRONG_TAP_PENALTY));
      setTimeout(() => setWrongTap(false), 500);
    }
  };

  const handleReplay = () => {
    const selected = shuffle(topic.words).slice(0, ROUNDS);
    setWords(selected);
    setCurrentWord(0);
    setScore(0);
    setMistakes(0);
    setGameCompleted(false);
    if (selected.length > 0) initRound(selected[0]);
  };

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎮</div>
      </div>
    );
  }

  const word = words[currentWord];

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
                {ROUNDS} words · {mistakes} wrong taps
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
          <div className="w-full max-w-sm space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentWord + 1) / words.length) * 100}%` }}
                />
              </div>
              <span className="text-slate-400 text-xs">
                {currentWord + 1}/{words.length}
              </span>
            </div>

            {/* Hint: native word + emoji */}
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-sm">Spell the translation:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl">{word.emoji}</span>
                <span className="text-xl font-bold text-white">
                  {word[nativeLanguage as keyof WordEntry] as string}
                </span>
              </div>
            </div>

            {/* Built word display */}
            <div className="flex justify-center gap-1.5 min-h-[52px]">
              {target.split("").map((char, i) => (
                <div
                  key={i}
                  className={`w-9 h-11 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                    i < built.length
                      ? "bg-blue-600 text-white scale-100"
                      : "bg-white/10 text-white/20 border border-dashed border-white/20"
                  }`}
                >
                  {i < built.length ? built[i] : char}
                </div>
              ))}
            </div>

            {/* Wrong tap feedback */}
            {wrongTap && (
              <p className="text-red-400 text-center text-sm font-semibold animate-pulse">
                Wrong letter! -{WRONG_TAP_PENALTY} pts
              </p>
            )}

            {/* Word complete feedback */}
            {wordComplete && (
              <p className="text-green-400 text-center font-semibold">
                Correct! +{CORRECT_POINTS} pts
              </p>
            )}

            {/* Scrambled letters */}
            <div className="flex flex-wrap justify-center gap-2">
              {scrambled.map((letter, i) => (
                <button
                  key={i}
                  onClick={() => handleLetterTap(i)}
                  disabled={letter.used || wordComplete}
                  className={`w-11 h-11 rounded-xl text-lg font-bold transition-all ${
                    letter.used
                      ? "bg-white/5 text-white/10 scale-90"
                      : "bg-white/10 text-white active:scale-90 active:bg-blue-600"
                  } disabled:cursor-default`}
                >
                  {letter.char}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
