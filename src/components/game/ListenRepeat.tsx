"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useSpeechRecognition, similarityScore } from "@/hooks/useSpeechRecognition";
import { getTopicPhrases } from "@/data/phrases";
import { getUnlockedDifficulty } from "@/lib/adaptive";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { StarDisplay } from "@/components/game/StarDisplay";
import { playPopSound, playDingSound, playPhraseAudioAndWait } from "@/lib/speech";
import type { Topic, PhraseEntry } from "@/types";

const COMPLETION_BONUS = 50;

type FeedbackState = null | "listening" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getStars(score: number): number {
  if (score >= 0.8) return 3;
  if (score >= 0.6) return 2;
  if (score > 0) return 1;
  return 0;
}

interface ListenRepeatProps {
  topic: Topic;
}

export function ListenRepeat({ topic }: ListenRepeatProps) {
  const router = useRouter();
  const { targetLanguage, addPoints, addGameResult, wordMastery } = useProgressStore();

  const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition(targetLanguage);

  const [phrases, setPhrases] = useState<PhraseEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [roundStars, setRoundStars] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [showSentence, setShowSentence] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [globeSpeaking, setGlobeSpeaking] = useState(false);

  // Initialize phrases — filtered by unlocked difficulty
  useEffect(() => {
    const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
    const topicPhrases = getTopicPhrases(topic.id, maxDiff);
    if (topicPhrases.length === 0) return;
    setPhrases(shuffle(topicPhrases));
  }, [topic.id, topic.words]); // eslint-disable-line react-hooks/exhaustive-deps

  const phrase = phrases[currentIndex];

  // Globe speaks the phrase audio when round starts
  useEffect(() => {
    if (phrase && feedback === null) {
      setGlobeSpeaking(true);
      setShowSentence(true);
      playPhraseAudioAndWait(`sentence-${phrase.id}-${targetLanguage}`, 15000)
        .then(() => setGlobeSpeaking(false))
        .catch(() => setGlobeSpeaking(false));
    }
  }, [currentIndex, phrase, roundKey, feedback, targetLanguage]);

  // Process speech result
  useEffect(() => {
    if (!transcript || feedback !== "listening") return;
    if (!phrase) return;

    // Build full sentence (replace ___ with answer) for comparison
    const fullSentence = phrase.sentence[targetLanguage].replace("___", phrase.answer[targetLanguage]);
    const score = similarityScore(transcript, fullSentence);
    const stars = getStars(score);

    setMatchScore(score);
    setRoundStars(stars);
    setTotalStars((s) => s + stars);
    setFeedback("done");

    if (stars >= 2) {
      playDingSound();
    } else {
      playPopSound();
    }
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (currentIndex + 1 >= phrases.length) {
      const pointsEarned = totalStars * 5 + COMPLETION_BONUS;
      addGameResult({
        topicId: topic.id,
        gameType: "listen-repeat",
        score: pointsEarned,
        maxScore: phrases.length * 15 + COMPLETION_BONUS,
        mistakes: 0,
        completedAt: new Date().toISOString(),
      });
      addPoints(pointsEarned);
      setGameCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFeedback(null);
      setRoundStars(0);
      setMatchScore(0);
      setShowSentence(false);
      setRoundKey((k) => k + 1);
    }
  }, [currentIndex, phrases.length, totalStars, topic.id, addGameResult, addPoints]);

  const handleMicPress = () => {
    if (feedback === "done") return;
    if (isListening) {
      stop();
    } else {
      setFeedback("listening");
      start();
    }
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

  if (phrases.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <ProfessorGlobe size={80} emotion="thinking" />
        <p className="text-white text-lg text-center">No phrases available for this topic yet!</p>
        <button
          onClick={() => router.push("/map")}
          className="text-blue-400 text-sm mt-4"
        >
          ← Back to Map
        </button>
      </div>
    );
  }

  if (!phrase) return null;

  // Completed screen
  if (gameCompleted) {
    const maxStars = phrases.length * 3;
    const pointsEarned = totalStars * 5 + COMPLETION_BONUS;
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-6 px-6">
        <StarDisplay score={pointsEarned} maxScore={phrases.length * 15 + COMPLETION_BONUS} size="lg" />
        <ProfessorGlobe size={96} emotion="happy" speaking />
        <h2 className="text-3xl font-bold text-white">Great Speaking!</h2>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs space-y-3">
          <div className="flex justify-between text-slate-300">
            <span>Stars</span>
            <span className="text-amber-400 font-bold">
              {"⭐".repeat(Math.min(totalStars, 10))} {totalStars}/{maxStars}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Points</span>
            <span className="text-amber-400 font-bold">+{pointsEarned}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Coins</span>
            <span className="text-yellow-300 font-bold">🪙 +{Math.round(5 + (phrases.length > 0 ? pointsEarned / (phrases.length * 15 + COMPLETION_BONUS) : 0) * 10)}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setGameCompleted(false);
              setCurrentIndex(0);
              setTotalStars(0);
              setRoundStars(0);
              setFeedback(null);
              setMatchScore(0);
              setShowSentence(false);
              const maxDiff = getUnlockedDifficulty(topic.words, wordMastery);
              setPhrases(shuffle(getTopicPhrases(topic.id, maxDiff)));
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

  const fullSentence = phrase.sentence[targetLanguage].replace("___", phrase.answer[targetLanguage]);
  const progress = ((currentIndex + 1) / phrases.length) * 100;

  const feedbackMessage = (() => {
    if (feedback === "listening") return { text: "I'm listening...", color: "text-blue-400", emoji: "👂" };
    if (feedback === "done") {
      if (roundStars === 3) return { text: "Perfect!", color: "text-green-400", emoji: "🌟" };
      if (roundStars === 2) return { text: "Great job!", color: "text-amber-400", emoji: "⭐" };
      if (roundStars === 1) return { text: "Good try!", color: "text-orange-400", emoji: "💫" };
      return { text: "Keep practicing!", color: "text-slate-400", emoji: "💪" };
    }
    return null;
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
            <span className="text-white text-sm font-medium">Listen & Repeat</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-sm font-semibold">{totalStars}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs text-right mt-1">
          {currentIndex + 1} / {phrases.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5" key={roundKey}>
        {/* Scene context */}
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-sm font-medium">{phrase.context[targetLanguage]}</span>
        </div>

        {/* Professor Globe */}
        <ProfessorGlobe
          size={72}
          speaking={globeSpeaking}
          emotion={
            feedback === "done" && roundStars >= 2 ? "happy" :
            feedback === "listening" ? "surprised" :
            "idle"
          }
        />

        {/* Sentence to repeat */}
        {showSentence && (
          <div className="bg-white/5 rounded-2xl p-5 w-full max-w-sm border border-white/10">
            <p className="text-white text-lg text-center leading-relaxed">
              {fullSentence}
            </p>
            <button
              onClick={() => {
                setGlobeSpeaking(true);
                playPhraseAudioAndWait(`sentence-${phrase.id}-${targetLanguage}`, 15000)
                  .then(() => setGlobeSpeaking(false))
                  .catch(() => setGlobeSpeaking(false));
              }}
              className="mt-3 mx-auto flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
            >
              <span className="text-lg">🔊</span>
              <span className="text-slate-300 text-xs">Listen again</span>
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedbackMessage && (
          <div className="text-center">
            <span className="text-3xl block mb-1">{feedbackMessage.emoji}</span>
            <p className={`text-lg font-semibold ${feedbackMessage.color}`}>
              {feedbackMessage.text}
            </p>
            {feedback === "done" && (
              <div className="flex justify-center gap-1 mt-2">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`text-2xl ${s <= roundStars ? "" : "opacity-20"}`}>
                    ⭐
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {transcript && feedback === "done" && (
          <p className="text-slate-500 text-sm text-center">
            You said: &quot;{transcript}&quot;
          </p>
        )}

        {/* Mic button */}
        {feedback !== "done" ? (
          <button
            onClick={handleMicPress}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isListening
                ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
                : "bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30"
            }`}
          >
            <span className="text-3xl">{isListening ? "⏹️" : "🎤"}</span>
          </button>
        ) : (
          <button
            onClick={advance}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-medium active:scale-95 transition-transform"
          >
            {currentIndex + 1 >= phrases.length ? "Finish!" : "Next →"}
          </button>
        )}

        {feedback === null && !isListening && (
          <p className="text-slate-500 text-xs text-center">
            Listen to the phrase, then tap the mic and repeat it!
          </p>
        )}

        {/* Skip */}
        {feedback !== "done" && (
          <button
            onClick={advance}
            className="text-slate-500 text-xs active:text-slate-300 transition-colors"
          >
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}
