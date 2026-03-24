"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useSpeechRecognition, similarityScore } from "@/hooks/useSpeechRecognition";
import { selectAdaptiveWords, getUnlockedDifficulty } from "@/lib/adaptive";
import { getSyllables, scoreSyllables, type SyllableInfo } from "@/lib/syllables";
import { MatchPopup } from "@/components/game/MatchPopup";
import { StarDisplay, GameRewardSummary } from "@/components/game/StarDisplay";
import { playWordAudio, playDingSound, playPopSound } from "@/lib/speech";
import type { Topic, WordEntry } from "@/types";

const WORDS_PER_ROUND = 8;
const ATTEMPT_POINTS = 5;
const GOOD_POINTS = 10;
const COMPLETION_BONUS = 40;

type FeedbackState = null | "listening" | "great" | "almost" | "tryAgain";

interface AttemptResult {
  scores: number[];
  overall: number;
  spoken: string;
}

interface SayItProps {
  topic: Topic;
}

// --- Circular progress ring ---
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ color, fontSize: size * 0.28 }}
      >
        {score}%
      </span>
    </div>
  );
}

// --- Syllable breakdown display (top area, like Fluently) ---
function SyllableDisplay({ syllables, scores }: { syllables: SyllableInfo[]; scores: number[] | null }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Syllables as big text */}
      <div className="flex items-baseline gap-1 flex-wrap justify-center">
        {syllables.map((syl, i) => {
          const score = scores?.[i];
          const color = score == null
            ? "text-white"
            : score >= 80
              ? "text-green-400"
              : score >= 50
                ? "text-amber-400"
                : "text-red-400";
          return (
            <span
              key={i}
              className={`text-3xl font-bold transition-colors duration-300 ${color} ${syl.stressed ? "text-4xl" : ""}`}
            >
              {syl.text}
            </span>
          );
        })}
      </div>
      {/* Phonetic hints below */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {syllables.map((syl, i) => (
          <span key={i} className="text-slate-500 text-xs">
            {syl.phonetic}
            {i < syllables.length - 1 && <span className="ml-2 text-slate-700">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Per-syllable feedback list (like Fluently's scrollable list) ---
function SyllableFeedback({ syllables, result }: { syllables: SyllableInfo[]; result: AttemptResult }) {
  return (
    <div className="w-full max-w-sm space-y-1.5 animate-in slide-in-from-bottom-4 duration-300">
      {syllables.map((syl, i) => {
        const score = result.scores[i];
        const isGood = score >= 70;
        const isMedium = score >= 40 && score < 70;

        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {/* Syllable */}
            <span className="text-white font-semibold text-sm w-16">{syl.text}</span>

            {/* Score badge */}
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[42px] text-center"
              style={{
                backgroundColor: isGood ? "rgba(34,197,94,0.2)" : isMedium ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
                color: isGood ? "#22c55e" : isMedium ? "#f59e0b" : "#ef4444",
              }}
            >
              {score}%
            </div>

            {/* Feedback text */}
            <span
              className="text-xs flex-1"
              style={{ color: isGood ? "#22c55e" : isMedium ? "#f59e0b" : "#ef4444" }}
            >
              {isGood ? "Great!" : isMedium ? "Almost!" : "Try again"}
            </span>

            {/* Play icon for this syllable */}
            <button
              onClick={() => {
                // Use Web Speech API to say just this syllable
                if ("speechSynthesis" in window) {
                  const u = new SpeechSynthesisUtterance(syl.text);
                  u.lang = "en-US";
                  u.rate = 0.7;
                  window.speechSynthesis.speak(u);
                }
              }}
              className="text-slate-500 active:text-white transition-colors"
            >
              🔊
            </button>
          </div>
        );
      })}

      {/* Overall tip if score < 70 */}
      {result.overall < 70 && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs">
            <span className="font-bold">Tip:</span> Listen to the word again and focus on the{" "}
            <span className="font-bold text-red-300">
              {syllables.find((_, i) => result.scores[i] < 50)?.text || "highlighted"}
            </span>{" "}
            sound
          </p>
        </div>
      )}
    </div>
  );
}

export function SayIt({ topic }: SayItProps) {
  const router = useRouter();
  const {
    targetLanguage,
    addPoints,
    addGameResult,
    updateWordMastery,
    wordMastery,
  } = useProgressStore();

  const { isListening, transcript, confidence, isSupported, start, stop } = useSpeechRecognition(targetLanguage);

  const [words, setWords] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [popup, setPopup] = useState<{ emoji: string; word: string } | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [confetti, setConfetti] = useState(false);

  // Initialize words
  useEffect(() => {
    if (topic.words.length === 0) return;
    const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
    const selected = selectAdaptiveWords(topic.words, wordMastery, Math.min(WORDS_PER_ROUND, topic.words.length), 2, maxDiff);
    setWords(selected);
  }, [topic.words, topic.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const word = words[currentIndex];
  const syllables = word ? getSyllables(word[targetLanguage], targetLanguage) : [];

  // Auto-play audio when word changes
  useEffect(() => {
    if (word && feedback === null) {
      setTimeout(() => playWordAudio(word.id, targetLanguage), 400);
    }
  }, [currentIndex, word, targetLanguage, feedback, roundKey]);

  // When recognition ends without a result, reset
  useEffect(() => {
    if (!isListening && feedback === "listening") {
      const t = setTimeout(() => setFeedback(null), 600);
      return () => clearTimeout(t);
    }
  }, [isListening, feedback]);

  // Process speech result with syllable scoring
  useEffect(() => {
    if (!transcript || !word) return;
    if (feedback === "great" || feedback === "almost") return;

    const expected = word[targetLanguage];
    const sim = similarityScore(transcript, expected);
    const sylResult = scoreSyllables(transcript, syllables);

    const result: AttemptResult = {
      scores: sylResult.scores,
      overall: Math.round(sim * 100),
      spoken: transcript,
    };
    setAttemptResult(result);
    setShowBreakdown(true);

    if (sim >= 0.7) {
      setFeedback("great");
      playDingSound();
      setScore((s) => s + GOOD_POINTS);
      updateWordMastery(word.id, true);
      if (sim >= 0.9) {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2000);
      }
      // Auto-advance after showing breakdown
      setTimeout(() => {
        setPopup({ emoji: word.emoji, word: expected });
      }, 1800);
    } else if (sim >= 0.45) {
      setFeedback("almost");
      playPopSound();
      setScore((s) => s + ATTEMPT_POINTS);
      updateWordMastery(word.id, true);
      setTimeout(() => advance(), 3500);
    } else {
      setFeedback("tryAgain");
      setScore((s) => s + ATTEMPT_POINTS);
      // Play correct pronunciation after showing breakdown
      setTimeout(() => playWordAudio(word.id, targetLanguage), 1200);
      // Reset after 4s for retry
      setTimeout(() => {
        setFeedback(null);
        setShowBreakdown(false);
        setAttemptResult(null);
      }, 4000);
    }
    setAttempts((a) => a + 1);
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      const finalScore = score + COMPLETION_BONUS;
      setScore(finalScore);
      addGameResult({
        topicId: topic.id,
        gameType: "say-it",
        score: finalScore,
        maxScore: words.length * GOOD_POINTS + COMPLETION_BONUS,
        mistakes: 0,
        completedAt: new Date().toISOString(),
      });
      addPoints(finalScore);
      setGameCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFeedback(null);
      setHintVisible(false);
      setShowBreakdown(false);
      setAttemptResult(null);
      setRoundKey((k) => k + 1);
    }
  }, [currentIndex, words.length, score, topic.id, addGameResult, addPoints]);

  const handleMicPress = () => {
    if (feedback === "great" || feedback === "almost") return;
    if (isListening) {
      stop();
    } else {
      setFeedback("listening");
      setShowBreakdown(false);
      setAttemptResult(null);
      start();
    }
  };

  const handlePopupDone = () => {
    setPopup(null);
    advance();
  };

  const handlePlayAudio = () => {
    if (word) playWordAudio(word.id, targetLanguage);
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white text-lg text-center">
          Speech recognition is not available on this browser.
        </p>
        <p className="text-slate-400 text-sm text-center">
          Try using Chrome on Android for the best experience!
        </p>
        <button onClick={() => router.push("/map")} className="text-blue-400 text-sm mt-4">
          ← Back to Map
        </button>
      </div>
    );
  }

  if (words.length === 0 || !word) return null;

  // Completed screen
  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-6 px-6">
        <StarDisplay score={score} maxScore={words.length * GOOD_POINTS + COMPLETION_BONUS} size="lg" />
        <h2 className="text-3xl font-bold text-white">Amazing Job!</h2>
        <p className="text-slate-300 text-center">You practiced saying {words.length} words!</p>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs space-y-3">
          <div className="flex justify-between text-slate-300">
            <span>Score</span>
            <span className="text-amber-400 font-bold">⭐ {score}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Coins</span>
            <span className="text-yellow-300 font-bold">🪙 +{Math.round(5 + (words.length > 0 ? score / (words.length * GOOD_POINTS + COMPLETION_BONUS) : 0) * 10)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Attempts</span>
            <span className="text-white font-bold">{attempts}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setGameCompleted(false);
              setCurrentIndex(0);
              setScore(0);
              setAttempts(0);
              setFeedback(null);
              setHintVisible(false);
              setShowBreakdown(false);
              setAttemptResult(null);
              const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
              const selected = selectAdaptiveWords(topic.words, wordMastery, Math.min(WORDS_PER_ROUND, topic.words.length), 2, maxDiff);
              setWords(selected);
              setRoundKey(0);
            }}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium active:bg-white/20 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push("/map")}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium active:bg-blue-700 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Confetti overlay */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: ["#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#ec4899"][i % 6],
                animation: `confetti-fall ${1.5 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">← Back</span>
          </button>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span>{topic.emoji}</span>
            <span className="text-white text-sm font-medium">Say It!</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-sm font-semibold">{score}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs text-right mt-1">
          {currentIndex + 1} / {words.length}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 gap-4 overflow-y-auto pb-6" key={roundKey}>
        {/* Score ring (shown after attempt) */}
        {attemptResult && (
          <div className="animate-in zoom-in-75 duration-300">
            <ScoreRing score={attemptResult.overall} />
          </div>
        )}

        {/* Emoji */}
        <span className="text-5xl">{word.emoji}</span>

        {/* Syllable display with coloring */}
        <SyllableDisplay syllables={syllables} scores={attemptResult?.scores || null} />

        {/* Hint */}
        {hintVisible && (
          <p className="text-slate-400 text-sm">
            {word[useProgressStore.getState().nativeLanguage]}
          </p>
        )}

        {/* Audio button */}
        <button
          onClick={handlePlayAudio}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-all"
        >
          <span className="text-xl">🔊</span>
        </button>

        {/* Feedback message */}
        {feedback === "listening" && (
          <p className="text-blue-400 text-sm font-semibold animate-pulse">Listening...</p>
        )}
        {feedback === "great" && (
          <p className="text-green-400 text-lg font-bold">Excellent! 🎉</p>
        )}
        {feedback === "almost" && (
          <p className="text-amber-400 text-lg font-semibold">Almost! Good try! 👏</p>
        )}
        {feedback === "tryAgain" && (
          <p className="text-slate-300 text-sm font-semibold">Listen and try again!</p>
        )}

        {/* What you said */}
        {attemptResult && feedback !== "listening" && (
          <p className="text-slate-500 text-xs">
            You said: &quot;{attemptResult.spoken}&quot;
          </p>
        )}

        {/* Syllable-by-syllable feedback (like Fluently) */}
        {showBreakdown && attemptResult && (
          <SyllableFeedback syllables={syllables} result={attemptResult} />
        )}

        {/* Microphone button */}
        <button
          onClick={handleMicPress}
          disabled={feedback === "great" || feedback === "almost"}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0 ${
            isListening
              ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
              : feedback === "great" || feedback === "almost"
                ? "bg-white/10 opacity-40"
                : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
          }`}
        >
          <span className="text-2xl">{isListening ? "⏹️" : "🎤"}</span>
        </button>

        {feedback === null && !isListening && (
          <p className="text-slate-500 text-xs">Tap the mic and say the word!</p>
        )}

        {/* Hint + Skip */}
        <div className="flex gap-4">
          {!hintVisible && (
            <button
              onClick={() => setHintVisible(true)}
              className="text-slate-500 text-xs active:text-slate-300 transition-colors"
            >
              Show hint
            </button>
          )}
          <button
            onClick={advance}
            className="text-slate-500 text-xs active:text-slate-300 transition-colors"
          >
            Skip →
          </button>
        </div>
      </div>

      {popup && (
        <MatchPopup emoji={popup.emoji} word={popup.word} onDone={handlePopupDone} />
      )}

      {/* Confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
