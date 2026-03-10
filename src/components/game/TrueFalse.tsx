"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { GameHUD } from "./GameHUD";
import { HeartDisplay } from "./HeartDisplay";
import { GameOverScreen, NPC_RESCUE_REACTIONS } from "./GameOverScreen";
import { MatchPopup } from "./MatchPopup";
import { StarDisplay, GameRewardSummary } from "./StarDisplay";
import { GhostScores } from "./GhostScores";
import { TreasureChest } from "./TreasureChest";
import { useTreasureChest } from "@/hooks/useTreasureChest";
import { npcs } from "@/data/npcs";
import { playWordAudio, playPopSound, playDingSound, playBuzzSound } from "@/lib/speech";
import { requestWakeLock, releaseWakeLock } from "@/lib/wakeLock";
import { selectAdaptiveWords } from "@/lib/adaptive";
import type { Topic, WordEntry } from "@/types";

const ROUNDS = 10;
const CORRECT_POINTS = 10;
const WRONG_PENALTY = 5;
const COMPLETION_BONUS = 40;
const MAX_LIVES = 3;

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

function generateRounds(topic: Topic, targetLang: string, nativeLang: string, mastery: Record<string, import("@/types").WordMastery>): Round[] {
  const words = selectAdaptiveWords(topic.words, mastery, ROUNDS);
  return words.map((word) => {
    const correct = Math.random() > 0.4;
    const realTranslation = word[nativeLang as keyof WordEntry] as string;

    if (correct) {
      return { word, shownTranslation: realTranslation, isCorrect: true };
    }

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
  const { nativeLanguage, targetLanguage, addPoints, addGameResult, updateWordMastery, wordMastery } =
    useProgressStore();

  const { chestReward, checkForChest, collectReward } = useTreasureChest();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [popup, setPopup] = useState<{ emoji: string; word: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [pressedBtn, setPressedBtn] = useState<"true" | "false" | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  useEffect(() => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage, wordMastery);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setFeedback(null);
    setGameCompleted(false);
    setGameOver(false);
    setLives(MAX_LIVES);
    setPopup(null);
    setCardKey(0);
    setExiting(false);
  }, [topic, targetLanguage, nativeLanguage]);

  // Speak the word when round changes
  useEffect(() => {
    if (rounds.length > 0 && currentRound < rounds.length && feedback === null) {
      const word = rounds[currentRound].word;
      setTimeout(() => playWordAudio(word.id, targetLanguage), 300);
    }
  }, [currentRound, rounds, targetLanguage, feedback]);

  const handleAnswer = useCallback(
    (userSaysTrue: boolean) => {
      if (feedback !== null || gameCompleted || gameOver) return;

      playPopSound();
      setPressedBtn(userSaysTrue ? "true" : "false");
      const round = rounds[currentRound];
      const isRight = userSaysTrue === round.isCorrect;

      setFeedback(isRight ? "correct" : "wrong");
      updateWordMastery(round.word.id, isRight);

      if (isRight) {
        playDingSound();
        setScore((s) => s + CORRECT_POINTS);
        const targetText = round.word[targetLanguage as keyof WordEntry] as string;
        setPopup({ emoji: round.word.emoji, word: targetText });
        setTimeout(() => playWordAudio(round.word.id, targetLanguage), 300);
      } else {
        playBuzzSound();
        setScore((s) => Math.max(0, s - WRONG_PENALTY));
        setMistakes((m) => m + 1);
        setShaking(true);
        setTimeout(() => setShaking(false), 400);

        const newLives = lives - 1;
        setLives(newLives);

        if (newLives <= 0) {
          setTimeout(() => {
            const partialScore = Math.max(0, score - WRONG_PENALTY);
            if (partialScore > 0) {
              addPoints(partialScore);
              addGameResult({
                topicId: topic.id,
                gameType: "true-false",
                score: partialScore,
                maxScore: ROUNDS * CORRECT_POINTS + COMPLETION_BONUS,
                mistakes: mistakes + 1,
                completedAt: new Date().toISOString(),
              });
            }
            setGameOver(true);
          }, 800);
          return;
        }
      }

      // Card exit animation, then move to next
      // Correct: longer delay so popup + audio finish before next round
      const exitDelay = isRight ? 1800 : 800;
      const nextDelay = isRight ? 2300 : 1200;

      setTimeout(() => {
        setExiting(true);
      }, exitDelay);

      setTimeout(() => {
        setPressedBtn(null);
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
          setTimeout(checkForChest, 500);
        } else {
          setExiting(false);
          setCurrentRound((r) => r + 1);
          setCardKey((k) => k + 1);
          setFeedback(null);
        }
      }, nextDelay);
    },
    [feedback, gameCompleted, gameOver, rounds, currentRound, score, mistakes, lives, targetLanguage, topic, addPoints, addGameResult, updateWordMastery]
  );

  const handleReplay = () => {
    const generated = generateRounds(topic, targetLanguage, nativeLanguage, wordMastery);
    setRounds(generated);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setFeedback(null);
    setGameCompleted(false);
    setGameOver(false);
    setLives(MAX_LIVES);
    setPopup(null);
    setCardKey(0);
    setExiting(false);
  };

  if (rounds.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎮</div>
      </div>
    );
  }

  const round = rounds[currentRound];
  const progressPct = ((currentRound + (feedback !== null ? 1 : 0)) / rounds.length) * 100;

  const npc = npcs.find((n) => n.topicId === topic.id);
  const isRescueMode = lives === 1 && !gameCompleted && !gameOver;

  return (
    <div className={`min-h-screen bg-[#0a1628] relative ${shaking ? "tf-screen-shake" : ""} ${isRescueMode ? "rescue-mode" : ""}`}>
      <GameHUD topicEmoji={topic.emoji} topicName={topic.name[targetLanguage]} />

      <div className="absolute top-1 right-2 z-20 safe-area">
        <div className="mt-[52px]">
          <HeartDisplay lives={lives} maxLives={MAX_LIVES} />
        </div>
      </div>

      {gameOver && (
        <GameOverScreen topicId={topic.id} score={score} onRetry={handleReplay} />
      )}

      {chestReward && (
        <TreasureChest reward={chestReward} onCollect={collectReward} />
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
            <StarDisplay score={score} maxScore={ROUNDS * CORRECT_POINTS + COMPLETION_BONUS} size="lg" />
            <h2 className="text-2xl font-bold text-white">Well done!</h2>
            <div className="space-y-2">
              <GameRewardSummary score={score} maxScore={ROUNDS * CORRECT_POINTS + COMPLETION_BONUS} />
              <p className="text-slate-400 text-sm">
                {ROUNDS} questions · {mistakes} mistakes
              </p>
            </div>
            <GhostScores topicId={topic.id} gameType="true-false" myScore={score} maxScore={ROUNDS * CORRECT_POINTS + COMPLETION_BONUS} />
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

            {/* Score */}
            <div className="text-center">
              <span className="text-amber-400 font-bold text-sm">⭐ {score}</span>
            </div>

            {/* Flashcard */}
            <div
              key={cardKey}
              className="[perspective:800px]"
              style={{
                animation: exiting
                  ? "tf-card-exit 0.35s ease-in forwards"
                  : "tf-card-enter 0.4s ease-out both",
              }}
            >
              <div className="tf-float bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/15 rounded-3xl p-8 space-y-4 shadow-2xl">
                <p className="text-slate-400 text-sm text-center">Is this translation correct?</p>

                {/* Original word — emoji hidden until answered */}
                <div className="flex items-center justify-center gap-3">
                  {feedback && (
                    <span className="text-5xl drop-shadow-lg animate-in zoom-in duration-300">{round.word.emoji}</span>
                  )}
                  <span className="text-3xl font-bold text-white drop-shadow-md">
                    {round.word[targetLanguage as keyof WordEntry] as string}
                  </span>
                </div>

                {/* Equals sign */}
                <div className="flex justify-center">
                  <span className="text-2xl text-slate-500 font-light">=</span>
                </div>

                {/* Shown translation */}
                <div className="text-center">
                  <span className={`text-2xl font-bold transition-colors duration-300 ${
                    feedback === "correct" ? "text-green-400" :
                    feedback === "wrong" ? "text-red-400" :
                    "text-blue-300"
                  }`}>
                    {round.shownTranslation}
                  </span>
                </div>

                {/* Feedback badge on card */}
                {feedback && (
                  <div className="flex justify-center pt-1">
                    <span className={`text-sm font-semibold px-4 py-1 rounded-full ${
                      feedback === "correct"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {feedback === "correct" ? `+${CORRECT_POINTS} pts` : `-${WRONG_PENALTY} pts`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Listen button */}
            <div className="text-center">
              <button
                onClick={() => {
                  if (rounds.length > 0 && currentRound < rounds.length) {
                    playWordAudio(rounds[currentRound].word.id, targetLanguage);
                  }
                }}
                className="text-blue-400 text-sm active:text-blue-300 transition-colors bg-blue-400/10 px-4 py-1.5 rounded-full"
              >
                🔊 Listen again
              </button>
            </div>

            {/* True / False buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswer(true)}
                disabled={feedback !== null}
                className={`py-6 rounded-2xl text-xl font-bold transition-all duration-300 border-2 text-white disabled:cursor-default ${
                  feedback !== null
                    ? feedback === "correct" && rounds[currentRound].isCorrect
                      ? "bg-green-600/40 border-green-400 scale-105"
                      : feedback === "wrong" && !rounds[currentRound].isCorrect
                        ? "bg-green-600/15 border-green-400/30"
                        : "bg-white/3 border-white/5 opacity-40"
                    : "bg-green-600/30 border-green-500/40 active:scale-95 active:bg-green-600/50"
                }`}
                style={
                  pressedBtn === "true" && feedback === "correct"
                    ? { animation: "tf-correct-glow 0.6s ease-out" }
                    : pressedBtn === "true"
                      ? { animation: "tf-press 0.2s ease-out" }
                      : undefined
                }
              >
                <span className="text-2xl block mb-1">👍</span>
                True
              </button>
              <button
                onClick={() => handleAnswer(false)}
                disabled={feedback !== null}
                className={`py-6 rounded-2xl text-xl font-bold transition-all duration-300 border-2 text-white disabled:cursor-default ${
                  feedback !== null
                    ? feedback === "correct" && !rounds[currentRound].isCorrect
                      ? "bg-red-600/40 border-red-400 scale-105"
                      : feedback === "wrong" && rounds[currentRound].isCorrect
                        ? "bg-red-600/15 border-red-400/30"
                        : "bg-white/3 border-white/5 opacity-40"
                    : "bg-red-600/30 border-red-500/40 active:scale-95 active:bg-red-600/50"
                }`}
                style={
                  pressedBtn === "false" && feedback === "correct"
                    ? { animation: "tf-correct-glow 0.6s ease-out" }
                    : pressedBtn === "false"
                      ? { animation: "tf-press 0.2s ease-out" }
                      : undefined
                }
              >
                <span className="text-2xl block mb-1">👎</span>
                False
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
