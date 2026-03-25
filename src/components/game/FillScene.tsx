"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { getTopicPhrases, phrases as allPhrases } from "@/data/phrases";
import { getUnlockedDifficulty } from "@/lib/adaptive";
import { MatchPopup } from "@/components/game/MatchPopup";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { StarDisplay, GameRewardSummary } from "@/components/game/StarDisplay";
import { TreasureChest } from "@/components/game/TreasureChest";
import { useTreasureChest } from "@/hooks/useTreasureChest";
import { HeartDisplay } from "@/components/game/HeartDisplay";
import { GameOverScreen, NPC_RESCUE_REACTIONS } from "@/components/game/GameOverScreen";
import { npcs } from "@/data/npcs";
import { playPopSound, playDingSound, playBuzzSound, playWordAudio, playPhraseAudio } from "@/lib/speech";
import type { Topic, PhraseEntry, Language } from "@/types";

const CORRECT_POINTS = 15;
const WRONG_PENALTY = 5;
const COMPLETION_BONUS = 60;
const OPTIONS_COUNT = 4;
const MAX_LIVES = 3;

interface Round {
  phrase: PhraseEntry;
  options: string[];
  correctIndex: number;
}

interface FillSceneProps {
  topic: Topic;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRounds(phrases: PhraseEntry[], lang: Language): Round[] {
  const shuffled = shuffle(phrases);
  const topicId = phrases[0]?.topicId;
  // Wrong answers from OTHER topics — avoids ambiguous options (e.g. "dog" for "sleeping on sofa")
  const otherAnswers = allPhrases
    .filter((p) => p.topicId !== topicId)
    .map((p) => p.answer[lang]);

  return shuffled.map((phrase) => {
    const correct = phrase.answer[lang];
    const wrongs = shuffle(otherAnswers.filter((a) => a !== correct)).slice(
      0,
      OPTIONS_COUNT - 1
    );
    const options = shuffle([correct, ...wrongs]);
    return {
      phrase,
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}

export function FillScene({ topic }: FillSceneProps) {
  const router = useRouter();
  const {
    targetLanguage,
    addPoints,
    addGameResult,
    updateWordMastery,
    wordMastery,
  } = useProgressStore();

  const { chestReward, checkForChest, collectReward } = useTreasureChest();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [popup, setPopup] = useState<{ emoji: string; word: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);

  // Initialize rounds ONCE — filter phrases by unlocked difficulty at mount time
  // wordMastery intentionally excluded: rebuilding mid-game reshuffles questions
  useEffect(() => {
    const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
    const phrases = getTopicPhrases(topic.id, maxDiff);
    if (phrases.length === 0) return;
    setRounds(buildRounds(phrases, targetLanguage));
  }, [topic.id, targetLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  const round = rounds[currentRound];

  // Play sentence audio when round starts
  useEffect(() => {
    if (round && selected === null) {
      const timer = setTimeout(() => {
        playPhraseAudio(`sentence-${round.phrase.id}-${targetLanguage}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentRound, roundKey, targetLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (currentRound + 1 >= rounds.length) {
      // Game complete
      const finalScore = score + COMPLETION_BONUS;
      setScore(finalScore);
      addGameResult({
        topicId: topic.id,
        gameType: "fill-scene",
        score: finalScore,
        maxScore: rounds.length * CORRECT_POINTS + COMPLETION_BONUS,
        mistakes,
        completedAt: new Date().toISOString(),
      });
      addPoints(finalScore);
      setGameCompleted(true);
      setTimeout(checkForChest, 500);
    } else {
      setCurrentRound((r) => r + 1);
      setSelected(null);
      setRoundKey((k) => k + 1);
    }
  }, [currentRound, rounds.length, score, mistakes, topic.id, addGameResult, addPoints]);

  const handleSelect = (index: number) => {
    if (selected !== null || !round || gameOver) return;
    setSelected(index);
    playPopSound();

    const correct = index === round.correctIndex;
    updateWordMastery(round.phrase.id, correct);

    if (correct) {
      playDingSound();
      setScore((s) => s + CORRECT_POINTS);
      // Play the correct word audio
      const answerText = round.phrase.answer[targetLanguage];
      const matchedWord = topic.words.find((w) => w[targetLanguage] === answerText);
      if (matchedWord) {
        setTimeout(() => playWordAudio(matchedWord.id, targetLanguage), 400);
      }
      setPopup({ emoji: round.phrase.emoji, word: answerText });
    } else {
      playBuzzSound();
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      setMistakes((m) => m + 1);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setTimeout(() => {
          const partialScore = Math.max(0, score - WRONG_PENALTY);
          if (partialScore > 0) {
            addPoints(partialScore);
            addGameResult({
              topicId: topic.id,
              gameType: "fill-scene",
              score: partialScore,
              maxScore: rounds.length * CORRECT_POINTS + COMPLETION_BONUS,
              mistakes: mistakes + 1,
              completedAt: new Date().toISOString(),
            });
          }
          setGameOver(true);
        }, 800);
        return;
      }

      // Auto-advance after wrong answer delay
      setTimeout(advance, 1500);
    }
  };

  const handlePopupDone = () => {
    setPopup(null);
    advance();
  };

  // No phrases for this topic
  if (rounds.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <ProfessorGlobe size={80} emotion="thinking" />
        <p className="text-white text-lg text-center">No scenes available for this topic yet!</p>
        <button
          onClick={() => router.back()}
          className="text-blue-400 text-sm mt-4"
        >
          ← Back to Map
        </button>
      </div>
    );
  }

  if (!round) return null;

  // Game completed screen
  if (gameCompleted) {
    const accuracy = rounds.length > 0 ? Math.round(((rounds.length - mistakes) / rounds.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-6 px-6">
        <StarDisplay score={score} maxScore={rounds.length * CORRECT_POINTS + COMPLETION_BONUS} size="lg" />
        <ProfessorGlobe size={96} emotion="happy" />
        <h2 className="text-3xl font-bold text-white">Scene Complete!</h2>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs space-y-3">
          <div className="flex justify-between text-slate-300">
            <span>Score</span>
            <span className="text-amber-400 font-bold">⭐ {score}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Coins</span>
            <span className="text-yellow-300 font-bold">🪙 +{Math.round(5 + (rounds.length > 0 ? score / (rounds.length * CORRECT_POINTS + COMPLETION_BONUS) : 0) * 10)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Accuracy</span>
            <span className="text-white font-bold">{accuracy}%</span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setGameCompleted(false);
              setCurrentRound(0);
              setScore(0);
              setMistakes(0);
              setSelected(null);
              const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
              setRounds(buildRounds(getTopicPhrases(topic.id, maxDiff), targetLanguage));
              setRoundKey(0);
            }}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium active:bg-white/20 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push(`/map?topic=${topic.id}`)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium active:bg-blue-700 transition-colors"
          >
            More Games
          </button>
        </div>
      </div>
    );
  }

  const npc = npcs.find((n) => n.topicId === topic.id);
  const isRescueMode = lives === 1 && !gameCompleted && !gameOver;
  const handleRetry = () => {
    setGameCompleted(false);
    setGameOver(false);
    setCurrentRound(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setLives(MAX_LIVES);
    const maxDiff2 = getUnlockedDifficulty(topic.words, wordMastery);
    setRounds(buildRounds(getTopicPhrases(topic.id, maxDiff2), targetLanguage));
    setRoundKey(0);
  };

  const sentence = round.phrase.sentence[targetLanguage];
  const context = round.phrase.context[targetLanguage];
  const progress = ((currentRound + 1) / rounds.length) * 100;

  return (
    <div className={`min-h-screen bg-[#0a1628] flex flex-col ${isRescueMode ? "rescue-mode" : ""}`}>
      {gameOver && (
        <GameOverScreen topicId={topic.id} score={score} onRetry={handleRetry} />
      )}

      {chestReward && (
        <TreasureChest reward={chestReward} onCollect={collectReward} />
      )}

      {isRescueMode && (
        <div className="fixed bottom-4 left-4 right-4 z-20 rescue-message">
          <div className="bg-red-900/60 border border-red-500/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{npc?.emoji || "🎮"}</span>
            <p className="text-red-200 text-sm font-medium">
              {NPC_RESCUE_REACTIONS[topic.id] || "Last chance! You can do it! 💪"}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">← Back</span>
          </button>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span>{topic.emoji}</span>
            <span className="text-white text-sm font-medium">
              {topic.name[targetLanguage] || topic.name.en}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HeartDisplay lives={lives} maxLives={MAX_LIVES} />
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-amber-400 text-xs">⭐</span>
              <span className="text-white text-sm font-semibold">{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs text-right mt-1">
          {currentRound + 1} / {rounds.length}
        </p>
      </div>

      {/* Scene context */}
      <div className="px-6 mb-4" key={roundKey}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400 text-sm font-medium">{context}</span>
        </div>

        {/* Sentence with blank */}
        <div
          className={`bg-white/5 rounded-2xl p-5 border border-white/10 ${shaking ? "animate-shake" : ""}`}
        >
          <p className="text-white text-lg leading-relaxed text-center">
            {sentence.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded-lg text-center font-bold ${
                    selected === null
                      ? "bg-blue-500/30 border-2 border-dashed border-blue-400 text-blue-300"
                      : selected === round.correctIndex
                        ? "bg-green-500/30 border-2 border-green-400 text-green-300"
                        : "bg-red-500/30 border-2 border-red-400 text-red-300"
                  }`}>
                    {selected !== null ? round.options[round.correctIndex] : "???"}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Globe hint */}
      <div className="flex justify-center mb-4">
        <ProfessorGlobe
          size={48}
          emotion={selected === null ? "idle" : selected === round.correctIndex ? "happy" : "surprised"}
        />
      </div>

      {/* Options */}
      <div className="px-6 space-y-3 pb-8">
        {round.options.map((option, i) => {
          let btnClass = "bg-white/5 border-white/10 active:bg-white/15";
          if (selected !== null) {
            if (i === round.correctIndex) {
              btnClass = "bg-green-500/20 border-green-500/50";
            } else if (i === selected) {
              btnClass = "bg-red-500/20 border-red-500/50";
            } else {
              btnClass = "bg-white/5 border-white/5 opacity-40";
            }
          }

          return (
            <button
              key={`${roundKey}-${i}`}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full py-4 px-5 rounded-xl border text-white text-base font-medium transition-all ${btnClass} ${
                selected !== null ? "cursor-default" : ""
              }`}
              style={{
                animation: `slide-up 0.3s ease-out ${i * 60}ms both`,
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {popup && (
        <MatchPopup emoji={popup.emoji} word={popup.word} onDone={handlePopupDone} />
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
