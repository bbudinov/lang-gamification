"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { HeartDisplay } from "./HeartDisplay";
import { GameOverScreen, NPC_RESCUE_REACTIONS } from "./GameOverScreen";
import { MatchPopup } from "./MatchPopup";
import { npcs } from "@/data/npcs";
import { playWordAudio, playPopSound, playDingSound, playBuzzSound } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import { selectAdaptiveWords } from "@/lib/adaptive";
import type { Topic, WordEntry } from "@/types";

const ROUNDS = 6;
const CORRECT_POINTS = 20;
const WRONG_TAP_PENALTY = 3;
const COMPLETION_BONUS = 50;
const MAX_LIVES = 3;

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
  const { nativeLanguage, targetLanguage, addPoints, addGameResult, updateWordMastery, wordMastery } =
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
  const [popup, setPopup] = useState<{ emoji: string; word: string } | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [lastFilledIndex, setLastFilledIndex] = useState(-1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);

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
      setLastFilledIndex(-1);

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
    const selected = selectAdaptiveWords(topic.words, wordMastery, ROUNDS);
    setWords(selected);
    setCurrentWord(0);
    setScore(0);
    setMistakes(0);
    setGameCompleted(false);
    setGameOver(false);
    setLives(MAX_LIVES);
    setPopup(null);
    setRoundKey(0);
    if (selected.length > 0) initRound(selected[0]);
  }, [topic, targetLanguage, nativeLanguage, initRound]);

  // Speak the hint word
  useEffect(() => {
    if (words.length > 0 && currentWord < words.length && !wordComplete) {
      const word = words[currentWord];
      setTimeout(() => playWordAudio(word.id, nativeLanguage), 300);
    }
  }, [currentWord, words, nativeLanguage, wordComplete]);

  const handleLetterTap = (index: number) => {
    if (wordComplete || gameCompleted || gameOver) return;

    const letter = scrambled[index];
    if (letter.used) return;

    const expectedChar = target[built.length];

    if (letter.char === expectedChar) {
      playPopSound();
      const newBuilt = [...built, letter.char];
      setBuilt(newBuilt);
      setLastFilledIndex(newBuilt.length - 1);
      setScrambled((prev) =>
        prev.map((l, i) => (i === index ? { ...l, used: true } : l))
      );
      setWrongTap(false);

      if (newBuilt.length === target.length) {
        playDingSound();
        setWordComplete(true);
        setScore((s) => s + CORRECT_POINTS);
        updateWordMastery(words[currentWord].id, true);

        const word = words[currentWord];
        const targetText = word[targetLanguage as keyof WordEntry] as string;
        setPopup({ emoji: word.emoji, word: targetText });
        playWordAudio(word.id, targetLanguage);

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
            setRoundKey((k) => k + 1);
            initRound(words[next]);
          }
        }, 1500);
      }
    } else {
      playBuzzSound();
      setWrongTap(true);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setScore((s) => Math.max(0, s - WRONG_TAP_PENALTY));
      setTimeout(() => setWrongTap(false), 500);

      // Lose a life every 3 wrong taps
      if (newMistakes % 3 === 0) {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => {
            const partialScore = Math.max(0, score - WRONG_TAP_PENALTY);
            if (partialScore > 0) {
              addPoints(partialScore);
              addGameResult({
                topicId: topic.id,
                gameType: "word-scramble",
                score: partialScore,
                maxScore: ROUNDS * CORRECT_POINTS + COMPLETION_BONUS,
                mistakes: newMistakes,
                completedAt: new Date().toISOString(),
              });
            }
            setGameOver(true);
          }, 800);
          return;
        }
      }
    }
  };

  const handleReplay = () => {
    const selected = selectAdaptiveWords(topic.words, wordMastery, ROUNDS);
    setWords(selected);
    setCurrentWord(0);
    setScore(0);
    setMistakes(0);
    setGameCompleted(false);
    setGameOver(false);
    setLives(MAX_LIVES);
    setPopup(null);
    setRoundKey(0);
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
  const progressPct = ((currentWord + (wordComplete ? 1 : 0)) / words.length) * 100;

  const npc = npcs.find((n) => n.topicId === topic.id);
  const isRescueMode = lives === 1 && !gameCompleted && !gameOver;

  return (
    <div className={`min-h-screen bg-[#0a1628] relative ${isRescueMode ? "rescue-mode" : ""}`}>
      <GameHUD topicEmoji={topic.emoji} topicName={topic.name[targetLanguage]} />

      <div className="absolute top-1 right-2 z-20 safe-area">
        <div className="mt-[52px]">
          <HeartDisplay lives={lives} maxLives={MAX_LIVES} />
        </div>
      </div>

      {gameOver && (
        <GameOverScreen topicId={topic.id} score={score} onRetry={handleReplay} />
      )}

      {isRescueMode && (
        <div className="absolute bottom-4 left-4 right-4 z-20 rescue-message">
          <div className="bg-red-900/60 border border-red-500/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{npc?.emoji || "🎮"}</span>
            <p className="text-red-200 text-sm font-medium">
              {NPC_RESCUE_REACTIONS[topic.id] || "Last chance! You can do it! 💪"}
            </p>
          </div>
        </div>
      )}

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
                {currentWord + 1}/{words.length}
              </span>
            </div>

            {/* Score */}
            <div className="text-center">
              <span className="text-amber-400 font-bold text-sm">⭐ {score}</span>
            </div>

            {/* Hint: native word + emoji */}
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-sm">Spell the translation:</p>
              <div className="quiz-float flex items-center justify-center gap-3 py-2">
                {wordComplete && (
                  <span className="text-5xl drop-shadow-lg animate-in zoom-in duration-300">{word.emoji}</span>
                )}
                <span className="text-2xl font-bold text-white drop-shadow-md">
                  {word[nativeLanguage as keyof WordEntry] as string}
                </span>
              </div>
              <button
                onClick={() => playWordAudio(word.id, nativeLanguage)}
                className="text-blue-400 text-sm active:text-blue-300 transition-colors bg-blue-400/10 px-4 py-1.5 rounded-full"
              >
                🔊 Listen again
              </button>
            </div>

            {/* Built word display — glowing slots */}
            <div
              className={`flex justify-center gap-2 min-h-[56px] ${wrongTap ? "" : ""}`}
              style={wrongTap ? { animation: "ws-wrong-shake 0.4s ease-in-out" } : undefined}
            >
              {target.split("").map((char, i) => {
                const isFilled = i < built.length;
                const justFilled = i === lastFilledIndex;
                const isComplete = wordComplete;

                return (
                  <div
                    key={`${roundKey}-${i}`}
                    className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-300 ${
                      isFilled
                        ? isComplete
                          ? "bg-green-600 text-white border-2 border-green-400"
                          : "bg-blue-600 text-white border-2 border-blue-400"
                        : "bg-white/5 text-white/15 border-2 border-dashed border-white/20"
                    }`}
                    style={
                      justFilled && !isComplete
                        ? { animation: "ws-slot-fill 0.35s ease-out" }
                        : isComplete
                          ? { animation: "ws-complete-glow 1.5s ease-in-out infinite", animationDelay: `${i * 50}ms` }
                          : undefined
                    }
                  >
                    {isFilled ? (
                      <span className={isComplete ? "drop-shadow-lg" : ""}>
                        {built[i]}
                      </span>
                    ) : (
                      <span className="text-white/10">_</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feedback */}
            {wrongTap && (
              <p className="text-red-400 text-center text-sm font-semibold">
                Wrong letter! -{WRONG_TAP_PENALTY} pts
              </p>
            )}
            {wordComplete && (
              <p className="text-green-400 text-center font-semibold text-lg">
                Correct! +{CORRECT_POINTS} pts 🎉
              </p>
            )}

            {/* Scrambled letter blocks */}
            <div className="flex flex-wrap justify-center gap-2.5" key={roundKey}>
              {scrambled.map((letter, i) => (
                <button
                  key={i}
                  onClick={() => handleLetterTap(i)}
                  disabled={letter.used || wordComplete}
                  className={`w-12 h-12 rounded-xl text-xl font-bold transition-all duration-300 disabled:cursor-default ${
                    letter.used
                      ? "bg-white/3 text-white/10 scale-75 border border-white/5"
                      : "text-white border-2 border-white/20 active:scale-90 active:border-blue-400 bg-gradient-to-b from-white/15 to-white/5 shadow-lg"
                  }`}
                  style={
                    letter.used
                      ? { animation: "ws-letter-used 0.3s ease-out forwards" }
                      : { animation: `ws-letter-in 0.4s ease-out ${i * 50}ms both` }
                  }
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
