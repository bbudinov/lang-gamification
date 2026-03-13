"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useSpeechRecognition, similarityScore } from "@/hooks/useSpeechRecognition";
import { selectAdaptiveWords, getUnlockedDifficulty } from "@/lib/adaptive";
import { MatchPopup } from "@/components/game/MatchPopup";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { StarDisplay, GameRewardSummary } from "@/components/game/StarDisplay";
import { playWordAudio, playDingSound, playPopSound } from "@/lib/speech";
import type { Topic, WordEntry } from "@/types";

const WORDS_PER_ROUND = 8;
const ATTEMPT_POINTS = 5;
const GOOD_POINTS = 10;
const COMPLETION_BONUS = 40;

type FeedbackState = null | "listening" | "great" | "almost" | "tryAgain";

interface SayItProps {
  topic: Topic;
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

  // Initialize words
  useEffect(() => {
    if (topic.words.length === 0) return;
    const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
    const selected = selectAdaptiveWords(topic.words, wordMastery, Math.min(WORDS_PER_ROUND, topic.words.length), 2, maxDiff);
    setWords(selected);
  }, [topic.words, topic.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const word = words[currentIndex];

  // Auto-play audio when word changes
  useEffect(() => {
    if (word && feedback === null) {
      setTimeout(() => playWordAudio(word.id, targetLanguage), 400);
    }
  }, [currentIndex, word, targetLanguage, feedback, roundKey]);

  // Process speech result
  useEffect(() => {
    if (!transcript || !word) return;
    // Already got a final result — don't re-process
    if (feedback === "great" || feedback === "almost") return;

    const expected = word[targetLanguage];
    const sim = similarityScore(transcript, expected);

    if (sim >= 0.8) {
      // Great pronunciation!
      setFeedback("great");
      playDingSound();
      setScore((s) => s + GOOD_POINTS);
      updateWordMastery(word.id, true);
      setPopup({ emoji: word.emoji, word: expected });
    } else if (sim >= 0.6) {
      // Almost there!
      setFeedback("almost");
      playPopSound();
      setScore((s) => s + ATTEMPT_POINTS);
      updateWordMastery(word.id, true);
      // Auto-advance after 2.5s
      setTimeout(() => advance(), 2500);
    } else {
      // Try again — replay audio
      setFeedback("tryAgain");
      setScore((s) => s + ATTEMPT_POINTS);
      setTimeout(() => {
        playWordAudio(word.id, targetLanguage);
      }, 800);
      // Reset after 3s so they can try again
      setTimeout(() => {
        setFeedback(null);
      }, 3000);
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
        mistakes: 0, // No mistakes in Say It — only positive!
        completedAt: new Date().toISOString(),
      });
      addPoints(finalScore);
      setGameCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFeedback(null);
      setHintVisible(false);
      setRoundKey((k) => k + 1);
    }
  }, [currentIndex, words.length, score, topic.id, addGameResult, addPoints]);

  const handleMicPress = () => {
    if (feedback === "great" || feedback === "almost") return;
    if (isListening) {
      stop();
    } else {
      setFeedback("listening");
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
        <ProfessorGlobe size={80} emotion="thinking" />
        <p className="text-white text-lg text-center">
          Speech recognition is not available on this browser.
        </p>
        <p className="text-slate-400 text-sm text-center">
          Try using Chrome on Android for the best experience!
        </p>
        <button
          onClick={() => router.push("/map")}
          className="text-blue-400 text-sm mt-4"
        >
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
        <ProfessorGlobe size={96} emotion="happy" speaking />
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
  const feedbackMsg = (() => {
    switch (feedback) {
      case "listening": return { text: "I'm listening...", color: "text-blue-400" };
      case "great": return { text: "Excellent! Perfect!", color: "text-green-400" };
      case "almost": return { text: "Almost! Good try!", color: "text-amber-400" };
      case "tryAgain": return { text: "Let's hear it again!", color: "text-slate-300" };
      default: return null;
    }
  })();

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
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
      <div className="px-4 mb-6">
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

      {/* Word display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6" key={roundKey}>
        {/* Emoji + Word */}
        <div className="text-center">
          <span className="text-7xl block mb-4">{word.emoji}</span>
          <p className="text-white text-3xl font-bold">{word[targetLanguage]}</p>
          {hintVisible && (
            <p className="text-slate-400 text-sm mt-2">
              {word[useProgressStore.getState().nativeLanguage]}
            </p>
          )}
        </div>

        {/* Audio button */}
        <button
          onClick={handlePlayAudio}
          className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-all"
        >
          <span className="text-2xl">🔊</span>
        </button>

        {/* Professor Globe */}
        <ProfessorGlobe
          size={56}
          emotion={
            feedback === "great" ? "happy" :
            feedback === "almost" ? "happy" :
            feedback === "tryAgain" ? "thinking" :
            feedback === "listening" ? "surprised" :
            "idle"
          }
          speaking={feedback === "listening"}
        />

        {/* Feedback message */}
        {feedbackMsg && (
          <p className={`text-lg font-semibold ${feedbackMsg.color} animate-pulse`}>
            {feedbackMsg.text}
          </p>
        )}

        {transcript && feedback !== null && feedback !== "listening" && (
          <p className="text-slate-500 text-sm">
            You said: &quot;{transcript}&quot;
          </p>
        )}

        {/* Microphone button */}
        <button
          onClick={handleMicPress}
          disabled={feedback === "great" || feedback === "almost"}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
            isListening
              ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
              : feedback === "great" || feedback === "almost"
                ? "bg-white/10 opacity-40"
                : "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
          }`}
        >
          <span className="text-3xl">{isListening ? "⏹️" : "🎤"}</span>
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
    </div>
  );
}
